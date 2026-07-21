import {
  AuditAction,
  EstimateStatus,
  PrismaClient,
  QuoteStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";

const quoteCreationAllowedStatuses: readonly EstimateStatus[] = [
  EstimateStatus.READY_TO_SEND,
  EstimateStatus.SENT,
  EstimateStatus.ACCEPTED,
];

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type QuoteWriter = {
  quote: PrismaClient["quote"];
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

function responseHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

function money(value: unknown) {
  const number =
    typeof value === "object" && value !== null && "toString" in value
      ? Number(value.toString())
      : Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return "0.00";
  }

  return (Math.round((number + Number.EPSILON) * 100) / 100).toFixed(2);
}

function createQuoteNumberCandidate() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const random = Math.floor(1000 + Math.random() * 9000);

  return `QUO-${date}-${random}`;
}

async function createUniqueQuoteNumber(tx: QuoteWriter) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const quoteNumber = createQuoteNumberCandidate();

    const existingQuote = await tx.quote.findFirst({
      where: {
        quoteNumber,
      },
      select: {
        id: true,
      },
    });

    if (!existingQuote) {
      return quoteNumber;
    }
  }

  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const timestamp = Date.now().toString().slice(-6);

  return `QUO-${date}-${timestamp}`;
}

function serializeDate(value: Date | null) {
  return value ? value.toISOString() : null;
}

function quoteStatusFromEstimateStatus(status: EstimateStatus) {
  if (status === EstimateStatus.SENT) {
    return QuoteStatus.SENT;
  }

  if (status === EstimateStatus.ACCEPTED) {
    return QuoteStatus.ACCEPTED;
  }

  return QuoteStatus.DRAFT;
}

export async function POST(
  _request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;
    const prisma = getPrisma();

    const estimate = await prisma.estimate.findFirst({
      where: {
        id,
        tenantKey: TENANT_KEY,
      },
      include: {
        customer: true,
        order: true,
        session: true,
        items: {
          include: {
            serviceCatalogItem: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!estimate) {
      return NextResponse.json(
        {
          layer: "estimate-quote-api",
          message: "Estimate not found",
          data: {
            status: "error",
            message: "Die Kalkulation wurde nicht gefunden.",
            quote: null,
          },
        },
        {
          status: 404,
          headers: responseHeaders(),
        },
      );
    }

    if (!quoteCreationAllowedStatuses.includes(estimate.status)) {
      return NextResponse.json(
        {
          layer: "estimate-quote-api",
          message: "Estimate status does not allow quote creation",
          data: {
            status: "error",
            message:
              "Ein Angebot kann erst aus einer freigegebenen, versendeten oder akzeptierten Kalkulation erstellt werden.",
            currentStatus: estimate.status,
            requiredStatuses: quoteCreationAllowedStatuses,
            quote: null,
          },
        },
        {
          status: 409,
          headers: responseHeaders(),
        },
      );
    }

    const estimateReference = `Estimate ID: ${estimate.id}`;

    const existingQuote = await prisma.quote.findFirst({
      where: {
        customerId: estimate.customerId,
        notes: {
          contains: estimateReference,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingQuote) {
      return NextResponse.json(
        {
          layer: "estimate-quote-api",
          message: "Quote already exists for this estimate",
          data: {
            status: "success",
            message: "Für diese Kalkulation existiert bereits ein Angebot.",
            created: false,
            quote: existingQuote,
          },
        },
        {
          headers: responseHeaders(),
        },
      );
    }

    const quoteStatus = quoteStatusFromEstimateStatus(estimate.status);
    const now = new Date();

    const quoteSentAt =
      quoteStatus === QuoteStatus.SENT || quoteStatus === QuoteStatus.ACCEPTED
        ? estimate.sentAt ?? now
        : null;

    const quoteAcceptedAt =
      quoteStatus === QuoteStatus.ACCEPTED ? estimate.acceptedAt ?? now : null;

    const quoteItems = {
      source: "estimate-quote-api",
      estimateId: estimate.id,
      estimateNumber: estimate.estimateNumber,
      title: estimate.title,
      description: estimate.description,
      totals: {
        subtotal: money(estimate.subtotal),
        riskMultiplier: money(estimate.riskMultiplier),
        riskAmount: money(estimate.riskAmount),
        travelFee: money(estimate.travelFee),
        materialFee: money(estimate.materialFee),
        discountAmount: money(estimate.discountAmount),
        total: money(estimate.total),
        currency: estimate.currency ?? "CHF",
      },
      items: estimate.items.map((item) => ({
        estimateItemId: item.id,
        serviceCatalogItemId: item.serviceCatalogItemId,
        serviceName: item.serviceCatalogItem?.name ?? null,
        name: item.name,
        description: item.description,
        category: item.category,
        unit: item.unit,
        quantity: money(item.quantity),
        unitPrice: money(item.unitPrice),
        subtotal: money(item.subtotal),
        riskMultiplier: money(item.riskMultiplier),
        riskAmount: money(item.riskAmount),
        discountAmount: money(item.discountAmount),
        total: money(item.total),
        sortOrder: item.sortOrder,
      })),
    };

    const quote = await prisma.$transaction(async (tx) => {
      const quoteNumber = await createUniqueQuoteNumber(tx);

      const createdQuote = await tx.quote.create({
        data: {
          quoteNumber,
          customerId: estimate.customerId,
          orderId: estimate.orderId,
          sessionId: estimate.sessionId,
          status: quoteStatus,
          subtotal: money(estimate.subtotal),
          taxRate: "0.00",
          taxAmount: "0.00",
          total: money(estimate.total),
          currency: estimate.currency ?? "CHF",
          items: quoteItems,
          notes: [
            `Quote generated from estimate ${estimate.estimateNumber}.`,
            estimateReference,
            estimate.notesCustomer
              ? `Customer notes: ${estimate.notesCustomer}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
          validUntil:
            estimate.validUntil ??
            new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          sentAt: quoteSentAt,
          acceptedAt: quoteAcceptedAt,
        },
      });

      await tx.auditLog.create({
        data: {
          customerId: estimate.customerId,
          orderId: estimate.orderId,
          estimateId: estimate.id,
          sessionId: estimate.sessionId,
          action: AuditAction.CREATE,
          entityType: "Quote",
          entityId: createdQuote.id,
          actorType: "dashboard",
          message: `Angebot ${createdQuote.quoteNumber} wurde aus Kalkulation ${estimate.estimateNumber} erstellt.`,
          after: {
            quoteId: createdQuote.id,
            quoteNumber: createdQuote.quoteNumber,
            quoteStatus: createdQuote.status,
            estimateId: estimate.id,
            estimateNumber: estimate.estimateNumber,
            total: money(estimate.total),
            sentAt: serializeDate(createdQuote.sentAt),
            acceptedAt: serializeDate(createdQuote.acceptedAt),
          },
          metadata: {
            source: "estimate-quote-api",
            estimateId: estimate.id,
            estimateNumber: estimate.estimateNumber,
            quoteId: createdQuote.id,
          },
        },
      });

      return createdQuote;
    });

    return NextResponse.json(
      {
        layer: "estimate-quote-api",
        message: "Quote created from estimate",
        data: {
          status: "success",
          message: "Das Angebot wurde aus der Kalkulation erstellt.",
          created: true,
          quote,
        },
      },
      {
        status: 201,
        headers: responseHeaders(),
      },
    );
  } catch (error) {
    console.error("Create quote from estimate error:", error);

    return NextResponse.json(
      {
        layer: "estimate-quote-api",
        message: "Create quote from estimate error",
        data: {
          status: "error",
          message: "Das Angebot konnte nicht aus der Kalkulation erstellt werden.",
          quote: null,
        },
      },
      {
        status: 500,
        headers: responseHeaders(),
      },
    );
  }
}