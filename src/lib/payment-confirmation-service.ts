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
  buildPaymentConfirmationHtml,
  buildPaymentConfirmationSubject,
  buildPaymentConfirmationText,
  paymentConfirmationMetadataMatches,
  type PaymentConfirmationPayload,
} from "@/lib/payment-confirmation-email";
import {
  prisma,
} from "@/lib/prisma";

export type PaymentConfirmationResult = {
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

function decimalToString(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = Number(value.toString());

    return Number.isFinite(parsed)
      ? parsed.toFixed(2)
      : "0.00";
  }

  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed.toFixed(2)
    : "0.00";
}

function formatPaidAt(value: Date | null) {
  return new Intl.DateTimeFormat(
    "de-CH",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Zurich",
    },
  ).format(value ?? new Date());
}

async function findExistingConfirmation(
  invoice: {
    id: string;
    customerId: string;
    orderId: string | null;
  },
) {
  const notifications =
    await prisma.notification.findMany({
      where: {
        customerId:
          invoice.customerId,
        orderId:
          invoice.orderId,
        channel:
          NotificationChannel.EMAIL,
        status: {
          in: [
            NotificationStatus.PENDING,
            NotificationStatus.SENT,
          ],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

  return (
    notifications.find(
      (notification) =>
        paymentConfirmationMetadataMatches(
          notification.metadata,
          invoice.id,
        ),
    ) ?? null
  );
}

async function recordFailure(input: {
  invoice: {
    id: string;
    invoiceNumber: string;
    customerId: string;
    orderId: string | null;
  };
  recipient: string | null;
  error: string;
  message: string;
  statusCode: number;
}) {
  const notification =
    await prisma.notification.create({
      data: {
        customerId:
          input.invoice.customerId,
        orderId:
          input.invoice.orderId,
        channel:
          NotificationChannel.EMAIL,
        status:
          NotificationStatus.FAILED,
        recipient:
          input.recipient ||
          emailConfiguration.ownerEmail,
        subject:
          `Zahlungsbestätigung fehlgeschlagen: ${input.invoice.invoiceNumber}`,
        message:
          input.message,
        errorMessage:
          input.error,
        metadata: {
          source:
            "automatic_payment_confirmation",
          type:
            "customer_payment_confirmation",
          invoiceId:
            input.invoice.id,
          invoiceNumber:
            input.invoice.invoiceNumber,
          automatic: true,
          actionRequired: true,
          error:
            input.error,
        },
      },
    });

  await prisma.auditLog.create({
    data: {
      customerId:
        input.invoice.customerId,
      orderId:
        input.invoice.orderId,
      action:
        AuditAction.SYSTEM,
      entityType:
        "Invoice",
      entityId:
        input.invoice.id,
      actorType:
        "payment_confirmation_automation",
      message:
        `Automatic payment confirmation for invoice ${input.invoice.invoiceNumber} failed.`,
      metadata: {
        source:
          "automatic_payment_confirmation",
        invoiceId:
          input.invoice.id,
        invoiceNumber:
          input.invoice.invoiceNumber,
        notificationId:
          notification.id,
        recipient:
          input.recipient,
        actionRequired: true,
        error:
          input.error,
      },
    },
  });

  return {
    ok: false,
    sent: false,
    alreadySent: false,
    actionRequired: true,
    statusCode:
      input.statusCode,
    message:
      input.message,
    invoiceId:
      input.invoice.id,
    invoiceNumber:
      input.invoice.invoiceNumber,
    recipient:
      input.recipient,
    notificationId:
      notification.id,
    error:
      input.error,
  } satisfies PaymentConfirmationResult;
}

export async function sendPaymentConfirmationWorkflow(
  invoiceId: string,
): Promise<PaymentConfirmationResult> {
  const invoice =
    await prisma.invoice.findUnique({
      where: {
        id: invoiceId,
      },
      include: {
        customer: true,
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
      error:
        "INVOICE_NOT_FOUND",
    };
  }

  if (
    invoice.status !==
    InvoiceStatus.PAID
  ) {
    return {
      ok: true,
      sent: false,
      alreadySent: false,
      actionRequired: false,
      statusCode: 200,
      message:
        "Die Rechnung ist noch nicht vollständig bezahlt.",
      invoiceId:
        invoice.id,
      invoiceNumber:
        invoice.invoiceNumber,
      recipient:
        normalizeEmail(
          invoice.customer.email,
        ),
      error: null,
    };
  }

  const existing =
    await findExistingConfirmation(
      invoice,
    );

  if (existing) {
    return {
      ok: true,
      sent: false,
      alreadySent: true,
      actionRequired: false,
      statusCode: 200,
      message:
        "Die Zahlungsbestätigung wurde bereits versendet.",
      invoiceId:
        invoice.id,
      invoiceNumber:
        invoice.invoiceNumber,
      recipient:
        existing.recipient,
      notificationId:
        existing.id,
      error: null,
    };
  }

  const recipient =
    normalizeEmail(
      invoice.customer.email,
    );

  if (!recipient) {
    return recordFailure({
      invoice,
      recipient: null,
      error:
        "CUSTOMER_EMAIL_MISSING",
      message:
        "Die Zahlungsbestätigung konnte nicht versendet werden, weil keine gültige Kunden-E-Mail vorhanden ist.",
      statusCode: 409,
    });
  }

  if (!resend) {
    return recordFailure({
      invoice,
      recipient,
      error:
        "RESEND_API_KEY_MISSING",
      message:
        "Die Zahlungsbestätigung konnte nicht versendet werden, weil der E-Mail-Dienst nicht konfiguriert ist.",
      statusCode: 503,
    });
  }

  const payload:
    PaymentConfirmationPayload = {
      invoiceNumber:
        invoice.invoiceNumber,
      customerName:
        customerName(
          invoice.customer,
        ),
      amount:
        decimalToString(
          invoice.total,
        ),
      currency:
        invoice.currency,
      paidAt:
        formatPaidAt(
          invoice.paidAt,
        ),
    };

  const subject =
    buildPaymentConfirmationSubject(
      invoice.invoiceNumber,
    );

  const text =
    buildPaymentConfirmationText(
      payload,
    );

  const html =
    buildPaymentConfirmationHtml(
      payload,
    );

  const metadata = {
    source:
      "automatic_payment_confirmation",
    type:
      "customer_payment_confirmation",
    invoiceId:
      invoice.id,
    invoiceNumber:
      invoice.invoiceNumber,
    automatic: true,
    actionRequired: false,
    paidAt:
      invoice.paidAt
        ?.toISOString() ??
      null,
  } as const;

  const notification =
    await prisma.notification.create({
      data: {
        customerId:
          invoice.customerId,
        orderId:
          invoice.orderId,
        channel:
          NotificationChannel.EMAIL,
        status:
          NotificationStatus.PENDING,
        recipient,
        subject,
        message:
          text,
        metadata,
      },
    });

  try {
    const emailResult =
      await resend.emails.send({
        from:
          emailConfiguration.from,
        replyTo:
          emailConfiguration.replyTo,
        to: [
          recipient,
        ],
        subject,
        text,
        html,
      });

    if (emailResult.error) {
      throw new Error(
        emailResult.error.message ||
          "UNKNOWN_RESEND_ERROR",
      );
    }

    const sentAt =
      new Date();

    await prisma.$transaction([
      prisma.notification.update({
        where: {
          id:
            notification.id,
        },
        data: {
          status:
            NotificationStatus.SENT,
          sentAt,
          errorMessage: null,
          metadata: {
            ...metadata,
            providerMessageId:
              emailResult.data?.id ??
              null,
          },
        },
      }),

      prisma.auditLog.create({
        data: {
          customerId:
            invoice.customerId,
          orderId:
            invoice.orderId,
          action:
            AuditAction.SYSTEM,
          entityType:
            "Invoice",
          entityId:
            invoice.id,
          actorType:
            "payment_confirmation_automation",
          message:
            `Payment confirmation for invoice ${invoice.invoiceNumber} was sent.`,
          metadata: {
            ...metadata,
            notificationId:
              notification.id,
            recipient,
            providerMessageId:
              emailResult.data?.id ??
              null,
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
        "Die Zahlungsbestätigung wurde automatisch versendet.",
      invoiceId:
        invoice.id,
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
        : "UNKNOWN_EMAIL_ERROR";

    await prisma.notification
      .update({
        where: {
          id:
            notification.id,
        },
        data: {
          status:
            NotificationStatus.FAILED,
          errorMessage,
          metadata: {
            ...metadata,
            actionRequired: true,
            error:
              errorMessage,
          },
        },
      })
      .catch(() => undefined);

    await prisma.auditLog
      .create({
        data: {
          customerId:
            invoice.customerId,
          orderId:
            invoice.orderId,
          action:
            AuditAction.SYSTEM,
          entityType:
            "Invoice",
          entityId:
            invoice.id,
          actorType:
            "payment_confirmation_automation",
          message:
            `Payment confirmation for invoice ${invoice.invoiceNumber} failed.`,
          metadata: {
            ...metadata,
            notificationId:
              notification.id,
            recipient,
            actionRequired: true,
            error:
              errorMessage,
          },
        },
      })
      .catch(() => undefined);

    return {
      ok: false,
      sent: false,
      alreadySent: false,
      actionRequired: true,
      statusCode: 502,
      message:
        "Die Rechnung wurde als bezahlt abgeschlossen, aber die Zahlungsbestätigung konnte nicht versendet werden.",
      invoiceId:
        invoice.id,
      invoiceNumber:
        invoice.invoiceNumber,
      recipient,
      notificationId:
        notification.id,
      error:
        errorMessage,
    };
  }
}
