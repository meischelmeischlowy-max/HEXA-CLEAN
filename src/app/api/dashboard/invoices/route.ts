import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest, NextResponse } from "next/server";
import {
  calculateAutomatedInvoiceState,
  calculatePaidPaymentsTotal,
  decimalToNumber,
  invoiceAutomationChanged,
  moneyString,
  normalizeInvoiceCurrency,
  roundMoney,
} from "@/lib/dashboard/invoice-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

function getPrisma() {
  if (!globalForPrisma.hexaPrisma) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    globalForPrisma.hexaPrisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: databaseUrl,
      }),
    });
  }

  return globalForPrisma.hexaPrisma;
}

function createInvoiceCandidateNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `INV-${date}-${random}`;
}

async function createInvoiceNumber(prisma: PrismaClient) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const invoiceNumber = createInvoiceCandidateNumber();

    const existing = await prisma.invoice.findUnique({
      where: {
        invoiceNumber,
      },
    });

    if (!existing) {
      return invoiceNumber;
    }
  }

  throw new Error("Could not generate unique invoice number");
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

async function readBody(request: NextRequest) {
  const text = await request.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function createExtraInvoiceItem(params: {
  name: string;
  description: string;
  amount: number;
  sortOrder: number;
  kind: string;
}): Prisma.InvoiceItemCreateWithoutInvoiceInput {
  return {
    name: params.name,
    description: params.description,
    category: "OTHER",
    unit: "FLAT",
    quantity: "1.00",
    unitPrice: moneyString(params.amount),
    subtotal: moneyString(params.amount),
    taxRate: "0.00",
    taxAmount: "0.00",
    discountAmount: "0.00",
    total: moneyString(params.amount),
    sortOrder: params.sortOrder,
    metadata: {
      source: "estimate",
      kind: params.kind,
    },
  };
}

function invoiceItemsTotal(items: Prisma.InvoiceItemCreateWithoutInvoiceInput[]) {
  return roundMoney(
    items.reduce((sum, item) => sum + decimalToNumber(item.total), 0),
  );
}

async function refreshInvoiceAutomation(prisma: PrismaClient, invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    include: {
      customer: true,
      order: true,
      items: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },
      attachments: true,
    },
  });

  if (!invoice) {
    return null;
  }

  const paidPaymentsTotal = calculatePaidPaymentsTotal(invoice.payments);

  const nextState = calculateAutomatedInvoiceState({
    currentStatus: invoice.status,
    total: invoice.total,
    paidPaymentsTotal,
    dueDate: invoice.dueDate,
    sentAt: invoice.sentAt,
    paidAt: invoice.paidAt,
  });

  const shouldUpdateInvoice =
    invoice.status !== "CANCELLED" &&
    invoiceAutomationChanged(invoice, nextState);

  if (!shouldUpdateInvoice) {
    return invoice;
  }

  const updatedInvoice = await prisma.invoice.update({
    where: {
      id: invoice.id,
    },
    data: {
      status: nextState.status,
      paidAmount: moneyString(nextState.paidAmount),
      paidAt: nextState.paidAt,
    },
    include: {
      customer: true,
      order: true,
      items: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },
      attachments: true,
    },
  });

  if (invoice.status !== updatedInvoice.status) {
    await prisma.auditLog.create({
      data: {
        customerId: invoice.customerId,
        orderId: invoice.orderId,
        action: "STATUS_CHANGE",
        entityType: "Invoice",
        entityId: invoice.id,
        actorType: "system",
        message: `Invoice ${invoice.invoiceNumber} status changed automatically from ${invoice.status} to ${updatedInvoice.status}.`,
        before: {
          status: invoice.status,
          paidAmount: decimalToNumber(invoice.paidAmount),
        },
        after: {
          status: updatedInvoice.status,
          paidAmount: nextState.paidAmount,
          paidAt: updatedInvoice.paidAt?.toISOString() ?? null,
        },
        metadata: {
          source: "dashboard-invoices-list-automation",
          total: decimalToNumber(invoice.total),
          paidPaymentsTotal,
        },
      },
    });
  }

  return updatedInvoice;
}

export async function GET() {
  try {
    const prisma = getPrisma();

    const invoices = await prisma.invoice.findMany({
      include: {
        customer: true,
        order: true,
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
        attachments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    const refreshedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        const paidPaymentsTotal = calculatePaidPaymentsTotal(invoice.payments);

        const nextState = calculateAutomatedInvoiceState({
          currentStatus: invoice.status,
          total: invoice.total,
          paidPaymentsTotal,
          dueDate: invoice.dueDate,
          sentAt: invoice.sentAt,
          paidAt: invoice.paidAt,
        });

        const shouldUpdateInvoice =
          invoice.status !== "CANCELLED" &&
          invoiceAutomationChanged(invoice, nextState);

        if (!shouldUpdateInvoice) {
          return invoice;
        }

        const updatedInvoice = await prisma.invoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            status: nextState.status,
            paidAmount: moneyString(nextState.paidAmount),
            paidAt: nextState.paidAt,
          },
          include: {
            customer: true,
            order: true,
            items: {
              orderBy: {
                sortOrder: "asc",
              },
            },
            payments: {
              orderBy: {
                createdAt: "desc",
              },
            },
            attachments: true,
          },
        });

        if (invoice.status !== updatedInvoice.status) {
          await prisma.auditLog.create({
            data: {
              customerId: invoice.customerId,
              orderId: invoice.orderId,
              action: "STATUS_CHANGE",
              entityType: "Invoice",
              entityId: invoice.id,
              actorType: "system",
              message: `Invoice ${invoice.invoiceNumber} status changed automatically from ${invoice.status} to ${updatedInvoice.status}.`,
              before: {
                status: invoice.status,
                paidAmount: decimalToNumber(invoice.paidAmount),
              },
              after: {
                status: updatedInvoice.status,
                paidAmount: nextState.paidAmount,
                paidAt: updatedInvoice.paidAt?.toISOString() ?? null,
              },
              metadata: {
                source: "dashboard-invoices-list-automation",
                total: decimalToNumber(invoice.total),
                paidPaymentsTotal,
              },
            },
          });
        }

        return updatedInvoice;
      }),
    );

    return NextResponse.json({
      layer: "dashboard-invoices-api",
      message: "Dashboard invoices works",
      data: {
        status: "success",
        message: "Invoices loaded",
        invoices: refreshedInvoices,
      },
    });
  } catch (error) {
    console.error("Dashboard invoices GET failed:", error);

    return NextResponse.json(
      {
        layer: "dashboard-invoices-api",
        message: "Dashboard invoices failed",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown invoices GET error",
          invoices: [],
        },
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    const body = await readBody(request);

    const estimateId =
      typeof body.estimateId === "string" ? body.estimateId.trim() : "";

    if (!estimateId) {
      return NextResponse.json(
        {
          layer: "dashboard-invoices-api",
          message: "Missing estimateId",
          data: {
            status: "error",
            message:
              "estimateId fehlt. Die Rechnung kann nicht aus der Kalkulation erstellt werden.",
            invoice: null,
          },
        },
        {
          status: 400,
        },
      );
    }

    const estimate = await prisma.estimate.findUnique({
      where: {
        id: estimateId,
      },
      include: {
        customer: true,
        order: true,
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!estimate) {
      return NextResponse.json(
        {
          layer: "dashboard-invoices-api",
          message: "Estimate not found",
          data: {
            status: "error",
            message: "Kalkulation wurde nicht gefunden.",
            invoice: null,
          },
        },
        {
          status: 404,
        },
      );
    }

    const estimateReference = estimate.estimateNumber ?? estimate.id;

    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        customerId: estimate.customerId,
        notes: {
          contains: estimateReference,
        },
      },
      include: {
        customer: true,
        order: true,
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        payments: true,
        attachments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingInvoice) {
      const refreshedExistingInvoice = await refreshInvoiceAutomation(
        prisma,
        existingInvoice.id,
      );

      return NextResponse.json({
        layer: "dashboard-invoices-api",
        message: "Invoice already exists for estimate",
        data: {
          status: "success",
          message: "Für diese Kalkulation existiert bereits eine Rechnung.",
          invoice: refreshedExistingInvoice ?? existingInvoice,
        },
      });
    }

    const now = new Date();
    const total = roundMoney(decimalToNumber(estimate.total));
    const invoiceNumber = await createInvoiceNumber(prisma);
    const currency = normalizeInvoiceCurrency(estimate.currency);

    const invoiceItemCreates: Prisma.InvoiceItemCreateWithoutInvoiceInput[] =
      estimate.items.map((item) => ({
        name: item.name,
        description: item.description ?? "Leistung gemäss vereinbartem Angebot.",
        category: item.category,
        unit: item.unit,
        quantity: moneyString(item.quantity),
        unitPrice: moneyString(item.unitPrice),
        subtotal: moneyString(item.subtotal),
        taxRate: "0.00",
        taxAmount: "0.00",
        discountAmount: moneyString(item.discountAmount),
        total: moneyString(item.total),
        sortOrder: item.sortOrder,
        metadata: {
          source: "estimate_item",
          estimateItemId: item.id,
        },
        ...(item.serviceCatalogItemId
          ? {
              serviceCatalogItem: {
                connect: {
                  id: item.serviceCatalogItemId,
                },
              },
            }
          : {}),
      }));

    let nextSortOrder =
      estimate.items.reduce(
        (max, item) => Math.max(max, item.sortOrder ?? 0),
        0,
      ) + 10;

    const travelFee = roundMoney(decimalToNumber(estimate.travelFee));
    const materialFee = roundMoney(decimalToNumber(estimate.materialFee));
    const riskAmount = roundMoney(decimalToNumber(estimate.riskAmount));
    const discountAmount = roundMoney(decimalToNumber(estimate.discountAmount));

    if (travelFee > 0) {
      invoiceItemCreates.push(
        createExtraInvoiceItem({
          name: "Anfahrt / Wegpauschale",
          description: "Anfahrt gemäss vereinbartem Angebot.",
          amount: travelFee,
          sortOrder: nextSortOrder,
          kind: "travel_fee",
        }),
      );
      nextSortOrder += 10;
    }

    if (materialFee > 0) {
      invoiceItemCreates.push(
        createExtraInvoiceItem({
          name: "Material und Verbrauchsmittel",
          description: "Material gemäss vereinbartem Angebot.",
          amount: materialFee,
          sortOrder: nextSortOrder,
          kind: "material_fee",
        }),
      );
      nextSortOrder += 10;
    }

    if (riskAmount > 0) {
      invoiceItemCreates.push(
        createExtraInvoiceItem({
          name: "Zuschlag gemäss Aufwandseinschätzung",
          description: "Zusätzlicher Aufwand gemäss vereinbartem Angebot.",
          amount: riskAmount,
          sortOrder: nextSortOrder,
          kind: "risk_amount",
        }),
      );
      nextSortOrder += 10;
    }

    if (discountAmount > 0) {
      invoiceItemCreates.push(
        createExtraInvoiceItem({
          name: "Rabatt gemäss Angebot",
          description: "Rabatt gemäss vereinbartem Angebot.",
          amount: -discountAmount,
          sortOrder: nextSortOrder,
          kind: "discount_amount",
        }),
      );
      nextSortOrder += 10;
    }

    const currentItemsTotal = invoiceItemsTotal(invoiceItemCreates);
    const diff = roundMoney(total - currentItemsTotal);

    if (Math.abs(diff) >= 0.01) {
      invoiceItemCreates.push(
        createExtraInvoiceItem({
          name:
            diff > 0
              ? "Zusätzlicher Aufwand gemäss Angebot"
              : "Rabatt gemäss Angebot",
          description:
            diff > 0
              ? "Zusätzlicher Aufwand gemäss vereinbartem Angebot."
              : "Rabatt gemäss vereinbartem Angebot.",
          amount: diff,
          sortOrder: nextSortOrder,
          kind: "balancing_line",
        }),
      );
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: estimate.customerId,
        orderId: estimate.orderId ?? null,
        status: "DRAFT",
        issueDate: now,
        dueDate: addDays(now, 14),
        subtotal: moneyString(total),
        taxRate: "0.00",
        taxAmount: "0.00",
        total: moneyString(total),
        paidAmount: "0.00",
        currency,
        notes:
          `Erstellt aus Angebot ${estimateReference}. ` +
          "Leistungsumfang gemäss vereinbartem Angebot. Diese Rechnung wurde mit HEXA OS CRM erstellt.",
        items: {
          create: invoiceItemCreates,
        },
      },
      include: {
        customer: true,
        order: true,
        items: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        payments: true,
        attachments: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        customerId: invoice.customerId,
        orderId: invoice.orderId,
        estimateId: estimate.id,
        action: "CREATE",
        entityType: "Invoice",
        entityId: invoice.id,
        actorType: "admin",
        message: `Invoice ${invoice.invoiceNumber} created from estimate ${estimateReference}.`,
        after: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          estimateId: estimate.id,
          estimateNumber: estimate.estimateNumber,
          total: decimalToNumber(invoice.total),
          currency: invoice.currency,
        },
        metadata: {
          source: "dashboard-invoices-api",
          estimateReference,
        },
      },
    });

    return NextResponse.json({
      layer: "dashboard-invoices-api",
      message: "Invoice created from estimate",
      data: {
        status: "success",
        message: "Rechnung wurde aus der Kalkulation erstellt.",
        invoice,
      },
    });
  } catch (error) {
    console.error("Dashboard invoices POST failed:", error);

    return NextResponse.json(
      {
        layer: "dashboard-invoices-api",
        message: "Dashboard invoices POST failed",
        data: {
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown invoice create error",
          invoice: null,
        },
      },
      {
        status: 500,
      },
    );
  }
}