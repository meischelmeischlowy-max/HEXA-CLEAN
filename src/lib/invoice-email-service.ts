import {
  AuditAction,
  InvoiceStatus,
  NotificationChannel,
  NotificationStatus,
} from "@prisma/client";

import {
  emailConfiguration,
  resend,
} from "@/lib/email-config";
import {
  buildInvoiceEmailHtml,
  buildInvoiceEmailSubject,
  buildInvoiceEmailText,
  invoiceNotificationMatches,
  type InvoiceEmailItem,
  type InvoiceEmailPayload,
} from "@/lib/invoice-email";
import { prisma } from "@/lib/prisma";

export type InvoiceEmailWorkflowResult = {
  ok: boolean;
  sent: boolean;
  alreadySent: boolean;
  actionRequired: boolean;
  statusCode: number;
  message: string;
  invoiceId: string;
  invoiceNumber?: string;
  recipient?: string | null;
  notificationId?: string | null;
  error?: string | null;
};

function decimalToNumber(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(value.toString());

    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeEmail(value?: string | null) {
  const email = String(value ?? "")
    .trim()
    .toLowerCase();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

function customerName(customer: {
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}) {
  if (customer.companyName?.trim()) {
    return customer.companyName.trim();
  }

  const fullName = [
    customer.firstName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    customer.email ||
    "Kundin / Kunde"
  );
}

function unitLabel(value: string) {
  const labels: Record<string, string> = {
    FLAT: "Pauschal",
    HOUR: "Std.",
    M2: "m²",
    SQUARE_METER: "m²",
    ROOM: "Zimmer",
    WINDOW: "Fenster",
    PIECE: "Stk.",
    KM: "km",
    METER: "m",
    CUSTOM: "Einheit",
  };

  return labels[value] ?? value;
}

async function findSentInvoiceNotification(
  invoice: {
    id: string;
    customerId: string;
    orderId: string | null;
  },
) {
  const candidates =
    await prisma.notification.findMany({
      where: {
        customerId: invoice.customerId,
        orderId: invoice.orderId,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.SENT,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

  return (
    candidates.find((notification) =>
      invoiceNotificationMatches(
        notification.metadata,
        invoice.id,
      ),
    ) ?? null
  );
}

async function recordInvoiceEmailFailure({
  invoice,
  recipient,
  message,
  error,
  statusCode,
}: {
  invoice: {
    id: string;
    invoiceNumber: string;
    customerId: string;
    orderId: string | null;
  };
  recipient: string | null;
  message: string;
  error: string;
  statusCode: number;
}): Promise<InvoiceEmailWorkflowResult> {
  const notification =
    await prisma.notification.create({
      data: {
        customerId: invoice.customerId,
        orderId: invoice.orderId,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.FAILED,
        recipient:
          recipient ||
          emailConfiguration.ownerEmail,
        subject:
          `Automatischer Rechnungsversand fehlgeschlagen: ${invoice.invoiceNumber}`,
        message,
        errorMessage: error,
        metadata: {
          source: "automatic_invoice_email",
          type: "customer_invoice",
          invoiceId: invoice.id,
          invoiceNumber:
            invoice.invoiceNumber,
          actionRequired: true,
          automatic: true,
          error,
        },
      },
    });

  await prisma.auditLog.create({
    data: {
      customerId: invoice.customerId,
      orderId: invoice.orderId,
      action: AuditAction.SYSTEM,
      entityType: "Invoice",
      entityId: invoice.id,
      actorType:
        "invoice_email_automation",
      message:
        `Automatic email delivery for invoice ${invoice.invoiceNumber} failed.`,
      metadata: {
        source: "automatic_invoice_email",
        invoiceId: invoice.id,
        invoiceNumber:
          invoice.invoiceNumber,
        notificationId:
          notification.id,
        recipient,
        actionRequired: true,
        error,
      },
    },
  });

  return {
    ok: false,
    sent: false,
    alreadySent: false,
    actionRequired: true,
    statusCode,
    message,
    invoiceId: invoice.id,
    invoiceNumber:
      invoice.invoiceNumber,
    recipient,
    notificationId:
      notification.id,
    error,
  };
}

function notificationHasProviderMessageId(
  metadata: unknown,
) {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return false;
  }

  const providerMessageId = (
    metadata as Record<string, unknown>
  ).providerMessageId;

  return (
    typeof providerMessageId === "string" &&
    providerMessageId.trim().length > 0
  );
}

export async function sendInvoiceEmailWorkflow(
  invoiceId: string,
): Promise<InvoiceEmailWorkflowResult> {
  const invoice =
    await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      include: {
        customer: true,
        items: {
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
        },
      },
    });

  if (!invoice) {
    return {
      ok: false,
      sent: false,
      alreadySent: false,
      actionRequired: true,
      statusCode: 404,
      message:
        "Rechnung wurde nicht gefunden.",
      invoiceId,
      error: "INVOICE_NOT_FOUND",
    };
  }

  if (
    invoice.status === InvoiceStatus.CANCELLED
  ) {
    return recordInvoiceEmailFailure({
      invoice,
      recipient:
        normalizeEmail(invoice.customer.email),
      message:
        "Eine stornierte Rechnung kann nicht automatisch versendet werden.",
      error: "INVOICE_CANCELLED",
      statusCode: 409,
    });
  }

  const existingSentNotification =
    await findSentInvoiceNotification(
      invoice,
    );

  if (
    existingSentNotification &&
    notificationHasProviderMessageId(
      existingSentNotification.metadata,
    )
  ) {
    if (
      invoice.status !== InvoiceStatus.SENT ||
      !invoice.sentAt
    ) {
      await prisma.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          status: InvoiceStatus.SENT,
          sentAt:
            existingSentNotification.sentAt ??
            invoice.sentAt ??
            new Date(),
        },
      });
    }

    return {
      ok: true,
      sent: false,
      alreadySent: true,
      actionRequired: false,
      statusCode: 200,
      message:
        "Die Rechnung wurde bereits erfolgreich per E-Mail versendet.",
      invoiceId: invoice.id,
      invoiceNumber:
        invoice.invoiceNumber,
      recipient:
        existingSentNotification.recipient,
      notificationId:
        existingSentNotification.id,
      error: null,
    };
  }

  const recipient = normalizeEmail(
    invoice.customer.email,
  );

  if (!recipient) {
    return recordInvoiceEmailFailure({
      invoice,
      recipient: null,
      message:
        "Beim Kunden ist keine gültige E-Mail-Adresse gespeichert.",
      error: "INVALID_CUSTOMER_EMAIL",
      statusCode: 400,
    });
  }

  if (invoice.items.length === 0) {
    return recordInvoiceEmailFailure({
      invoice,
      recipient,
      message:
        "Die Rechnung enthält keine Positionen und wurde nicht versendet.",
      error: "INVOICE_HAS_NO_ITEMS",
      statusCode: 409,
    });
  }

  if (
    decimalToNumber(invoice.total) <= 0
  ) {
    return recordInvoiceEmailFailure({
      invoice,
      recipient,
      message:
        "Der Rechnungsbetrag muss grösser als CHF 0.00 sein.",
      error: "INVALID_INVOICE_TOTAL",
      statusCode: 409,
    });
  }

  if (!resend) {
    return recordInvoiceEmailFailure({
      invoice,
      recipient,
      message:
        "Der E-Mail-Dienst ist nicht konfiguriert.",
      error: "RESEND_API_KEY_MISSING",
      statusCode: 503,
    });
  }

  const items: InvoiceEmailItem[] =
    invoice.items.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: decimalToNumber(
        item.quantity,
      ),
      unit: unitLabel(String(item.unit)),
      unitPrice: decimalToNumber(
        item.unitPrice,
      ),
      total: decimalToNumber(item.total),
    }));

  const payload: InvoiceEmailPayload = {
    invoiceNumber: invoice.invoiceNumber,
    customerName: customerName(
      invoice.customer,
    ),
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    subtotal: decimalToNumber(
      invoice.subtotal,
    ),
    taxAmount: decimalToNumber(
      invoice.taxAmount,
    ),
    total: decimalToNumber(
      invoice.total,
    ),
    items,
  };

  const subject =
    buildInvoiceEmailSubject(
      invoice.invoiceNumber,
    );

  const text =
    buildInvoiceEmailText(payload);

  const html =
    buildInvoiceEmailHtml(payload);

  const notification =
    await prisma.notification.create({
      data: {
        customerId: invoice.customerId,
        orderId: invoice.orderId,
        channel:
          NotificationChannel.EMAIL,
        status:
          NotificationStatus.PENDING,
        recipient,
        subject,
        message: text,
        metadata: {
          source:
            "automatic_invoice_email",
          type: "customer_invoice",
          invoiceId: invoice.id,
          invoiceNumber:
            invoice.invoiceNumber,
          automatic: true,
          actionRequired: false,
          total: decimalToNumber(
            invoice.total,
          ),
          currency: invoice.currency,
        },
      },
    });

  try {
    const emailResult =
      await resend.emails.send({
        from: emailConfiguration.from,
        replyTo:
          emailConfiguration.replyTo,
        to: [recipient],
        subject,
        html,
        text,
      });

    if (emailResult.error) {
      const errorMessage =
        emailResult.error.message ||
        "Unknown Resend error";

      await prisma.notification.update({
        where: {
          id: notification.id,
        },
        data: {
          status:
            NotificationStatus.FAILED,
          errorMessage,
          metadata: {
            source:
              "automatic_invoice_email",
            type: "customer_invoice",
            invoiceId: invoice.id,
            invoiceNumber:
              invoice.invoiceNumber,
            automatic: true,
            actionRequired: true,
            error: errorMessage,
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          customerId:
            invoice.customerId,
          orderId: invoice.orderId,
          action: AuditAction.SYSTEM,
          entityType: "Invoice",
          entityId: invoice.id,
          actorType:
            "invoice_email_automation",
          message:
            `Automatic email delivery for invoice ${invoice.invoiceNumber} failed.`,
          metadata: {
            source:
              "automatic_invoice_email",
            invoiceId: invoice.id,
            notificationId:
              notification.id,
            recipient,
            actionRequired: true,
            error: errorMessage,
          },
        },
      });

      return {
        ok: false,
        sent: false,
        alreadySent: false,
        actionRequired: true,
        statusCode: 502,
        message:
          `E-Mail konnte nicht versendet werden: ${errorMessage}`,
        invoiceId: invoice.id,
        invoiceNumber:
          invoice.invoiceNumber,
        recipient,
        notificationId:
          notification.id,
        error: errorMessage,
      };
    }

    const providerMessageId =
      emailResult.data?.id?.trim() ?? "";

    if (!providerMessageId) {
      throw new Error(
        "RESEND_MESSAGE_ID_MISSING",
      );
    }

    const sentAt = new Date();

    await prisma.$transaction([
      prisma.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          status: InvoiceStatus.SENT,
          sentAt,
        },
      }),

      prisma.notification.update({
        where: {
          id: notification.id,
        },
        data: {
          status:
            NotificationStatus.SENT,
          sentAt,
          errorMessage: null,
          metadata: {
            source:
              "automatic_invoice_email",
            type: "customer_invoice",
            invoiceId: invoice.id,
            invoiceNumber:
              invoice.invoiceNumber,
            automatic: true,
            actionRequired: false,
            total: decimalToNumber(
              invoice.total,
            ),
            currency: invoice.currency,
            providerMessageId,

          },
        },
      }),

      prisma.auditLog.create({
        data: {
          customerId:
            invoice.customerId,
          orderId: invoice.orderId,
          action: AuditAction.SYSTEM,
          entityType: "Invoice",
          entityId: invoice.id,
          actorType:
            "invoice_email_automation",
          message:
            `Invoice ${invoice.invoiceNumber} was created and sent automatically.`,
          before: {
            status: invoice.status,
            sentAt:
              invoice.sentAt?.toISOString() ??
              null,
          },
          after: {
            status: InvoiceStatus.SENT,
            sentAt:
              sentAt.toISOString(),
          },
          metadata: {
            source:
              "automatic_invoice_email",
            invoiceId: invoice.id,
            notificationId:
              notification.id,
            recipient,
            automatic: true,
            providerMessageId,

          },
        },
      }),
    ]);

    return {
      ok: true,
      sent: true,
      alreadySent: false,
      actionRequired: false,
      statusCode: 200,
      message:
        `Rechnung wurde automatisch an ${recipient} versendet.`,
      invoiceId: invoice.id,
      invoiceNumber:
        invoice.invoiceNumber,
      recipient,
      notificationId:
        notification.id,
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown invoice email error";

    await prisma.notification
      .update({
        where: {
          id: notification.id,
        },
        data: {
          status:
            NotificationStatus.FAILED,
          errorMessage,
          metadata: {
            source:
              "automatic_invoice_email",
            type: "customer_invoice",
            invoiceId: invoice.id,
            invoiceNumber:
              invoice.invoiceNumber,
            automatic: true,
            actionRequired: true,
            error: errorMessage,
          },
        },
      })
      .catch(() => undefined);

    await prisma.auditLog
      .create({
        data: {
          customerId:
            invoice.customerId,
          orderId: invoice.orderId,
          action: AuditAction.SYSTEM,
          entityType: "Invoice",
          entityId: invoice.id,
          actorType:
            "invoice_email_automation",
          message:
            `Automatic email delivery for invoice ${invoice.invoiceNumber} failed unexpectedly.`,
          metadata: {
            source:
              "automatic_invoice_email",
            notificationId:
              notification.id,
            recipient,
            actionRequired: true,
            error: errorMessage,
          },
        },
      })
      .catch(() => undefined);

    return {
      ok: false,
      sent: false,
      alreadySent: false,
      actionRequired: true,
      statusCode: 500,
      message:
        "Die Rechnung wurde erstellt, aber der automatische E-Mail-Versand ist fehlgeschlagen.",
      invoiceId: invoice.id,
      invoiceNumber:
        invoice.invoiceNumber,
      recipient,
      notificationId:
        notification.id,
      error: errorMessage,
    };
  }
}
