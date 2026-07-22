import {
  AuditAction,
  NotificationChannel,
  NotificationStatus,
  OrderStatus,
  QuoteStatus,
} from "@prisma/client";

import {
  emailConfiguration,
  resend,
} from "@/lib/email-config";
import {
  buildOrderConfirmationHtml,
  buildOrderConfirmationSubject,
  buildOrderConfirmationText,
  createOrderConfirmationPdf,
  extractOrderConfirmationItems,
  type OrderConfirmationPayload,
} from "@/lib/order-confirmation-document";
import {
  prisma,
} from "@/lib/prisma";

export type OrderConfirmationWorkflowResult = {
  status:
    | "COMPLETED"
    | "ALREADY_COMPLETED"
    | "ACTION_REQUIRED";
  orderId: string | null;
  orderNumber: string | null;
  orderStatus: string | null;
  emailSent: boolean;
  emailAlreadySent: boolean;
  pdfAttached: boolean;
  actionRequired: boolean;
  message: string;
  recipient: string | null;
  notificationId: string | null;
  providerMessageId: string | null;
  error: string | null;
};

function normalizeEmail(
  value?: string | null,
) {
  const email = String(
    value ?? "",
  )
    .trim()
    .toLowerCase();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  )
    ? email
    : null;
}

function customerName(customer: {
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}) {
  if (
    customer.companyName?.trim()
  ) {
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

function decimalToNumber(
  value: unknown,
) {
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString ===
      "function"
  ) {
    const parsed = Number(
      value.toString(),
    );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  const parsed = Number(
    value ?? 0,
  );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function errorMessage(
  value: unknown,
) {
  if (value instanceof Error) {
    return value.message;
  }

  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message ===
      "string"
  ) {
    return value.message;
  }

  return String(
    value ||
      "Unbekannter Fehler",
  );
}

function metadataMatches(
  metadata: unknown,
  quoteId: string,
  orderId: string,
) {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return false;
  }

  const record =
    metadata as Record<
      string,
      unknown
    >;

  return (
    record.source ===
      "automatic_order_confirmation" &&
    record.quoteId === quoteId &&
    record.orderId === orderId
  );
}

function statusMustNotBeDowngraded(
  status: OrderStatus,
) {
  return (
    status ===
      OrderStatus.CONFIRMED ||
    status ===
      OrderStatus.SCHEDULED ||
    status ===
      OrderStatus.IN_PROGRESS ||
    status ===
      OrderStatus.COMPLETED
  );
}

function safeFilename(
  value: string,
) {
  return value
    .replace(
      /[^A-Za-z0-9_-]/g,
      "_",
    )
    .replace(
      /_+/g,
      "_",
    );
}

export async function sendOrderConfirmationWorkflow(
  quoteId: string,
): Promise<OrderConfirmationWorkflowResult> {
  const quote =
    await prisma.quote.findUnique({
      where: {
        id: quoteId,
      },
      include: {
        customer: true,
        order: true,
      },
    });

  if (!quote) {
    return {
      status:
        "ACTION_REQUIRED",
      orderId: null,
      orderNumber: null,
      orderStatus: null,
      emailSent: false,
      emailAlreadySent: false,
      pdfAttached: false,
      actionRequired: true,
      message:
        "Die akzeptierte Offerte wurde nicht gefunden.",
      recipient: null,
      notificationId: null,
      providerMessageId: null,
      error:
        "QUOTE_NOT_FOUND",
    };
  }

  const currentQuote = quote;

  if (
    currentQuote.status !==
    QuoteStatus.ACCEPTED
  ) {
    return {
      status:
        "ACTION_REQUIRED",
      orderId:
        currentQuote.orderId,
      orderNumber:
        currentQuote.order?.orderNumber ??
        null,
      orderStatus:
        currentQuote.order?.status ??
        null,
      emailSent: false,
      emailAlreadySent: false,
      pdfAttached: false,
      actionRequired: true,
      message:
        "Nur eine akzeptierte Offerte kann einen Auftrag bestätigen.",
      recipient:
        normalizeEmail(
          currentQuote.customer.email,
        ),
      notificationId: null,
      providerMessageId: null,
      error:
        "QUOTE_NOT_ACCEPTED",
    };
  }

  if (!currentQuote.order) {
    return {
      status:
        "ACTION_REQUIRED",
      orderId: null,
      orderNumber: null,
      orderStatus: null,
      emailSent: false,
      emailAlreadySent: false,
      pdfAttached: false,
      actionRequired: true,
      message:
        "Die Offerte wurde akzeptiert, ist aber keinem Auftrag zugeordnet.",
      recipient:
        normalizeEmail(
          currentQuote.customer.email,
        ),
      notificationId: null,
      providerMessageId: null,
      error:
        "ORDER_NOT_LINKED",
    };
  }

  if (
    currentQuote.order.status ===
    OrderStatus.CANCELLED
  ) {
    return {
      status:
        "ACTION_REQUIRED",
      orderId:
        currentQuote.order.id,
      orderNumber:
        currentQuote.order.orderNumber,
      orderStatus:
        currentQuote.order.status,
      emailSent: false,
      emailAlreadySent: false,
      pdfAttached: false,
      actionRequired: true,
      message:
        "Ein stornierter Auftrag kann nicht automatisch bestätigt werden.",
      recipient:
        normalizeEmail(
          currentQuote.customer.email,
        ),
      notificationId: null,
      providerMessageId: null,
      error:
        "ORDER_CANCELLED",
    };
  }

  const now = new Date();

  const targetStatus =
    currentQuote.order.scheduledStart
      ? OrderStatus.SCHEDULED
      : OrderStatus.CONFIRMED;

  const updatedOrder =
    statusMustNotBeDowngraded(
      currentQuote.order.status,
    )
      ? currentQuote.order
      : await prisma.order.update({
          where: {
            id:
              currentQuote.order.id,
          },
          data: {
            status:
              targetStatus,
            estimatedPrice:
              currentQuote.order
                .estimatedPrice ??
              currentQuote.total,
          },
        });

  const sentCandidates =
    await prisma.notification.findMany({
      where: {
        customerId:
          currentQuote.customerId,
        orderId:
          updatedOrder.id,
        channel:
          NotificationChannel.EMAIL,
        status:
          NotificationStatus.SENT,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

  const existingSent =
    sentCandidates.find(
      (notification) =>
        metadataMatches(
          notification.metadata,
          currentQuote.id,
          updatedOrder.id,
        ),
    ) ?? null;

  const recipient =
    normalizeEmail(
      currentQuote.customer.email,
    );

  if (existingSent) {
    return {
      status:
        "ALREADY_COMPLETED",
      orderId:
        updatedOrder.id,
      orderNumber:
        updatedOrder.orderNumber,
      orderStatus:
        updatedOrder.status,
      emailSent: false,
      emailAlreadySent: true,
      pdfAttached: true,
      actionRequired: false,
      message:
        "Die Auftragsbestätigung wurde bereits per E-Mail versendet.",
      recipient:
        existingSent.recipient,
      notificationId:
        existingSent.id,
      providerMessageId:
        typeof existingSent
          .metadata ===
          "object" &&
        existingSent.metadata &&
        !Array.isArray(
          existingSent.metadata,
        ) &&
        "providerMessageId" in
          existingSent.metadata &&
        typeof existingSent
          .metadata
          .providerMessageId ===
          "string"
          ? existingSent
              .metadata
              .providerMessageId
          : null,
      error: null,
    };
  }

  const subject =
    buildOrderConfirmationSubject(
      updatedOrder.orderNumber,
    );

  const failureRecipient =
    recipient ||
    emailConfiguration.ownerEmail;

  async function recordFailure(
    failure: string,
    message: string,
  ): Promise<OrderConfirmationWorkflowResult> {
    const notification =
      await prisma.notification.create({
        data: {
          customerId:
            currentQuote.customerId,
          orderId:
            updatedOrder.id,
          sessionId:
            currentQuote.sessionId,
          channel:
            NotificationChannel.EMAIL,
          status:
            NotificationStatus.FAILED,
          recipient:
            failureRecipient,
          subject:
            `Auftragsbestätigung fehlgeschlagen: ${updatedOrder.orderNumber}`,
          message,
          errorMessage:
            failure,
          metadata: {
            source:
              "automatic_order_confirmation",
            type:
              "order_confirmation",
            quoteId:
              currentQuote.id,
            quoteNumber:
              currentQuote.quoteNumber,
            orderId:
              updatedOrder.id,
            orderNumber:
              updatedOrder.orderNumber,
            orderStatus:
              updatedOrder.status,
            automatic: true,
            actionRequired: true,
            pdfAttached: false,
            error:
              failure,
          },
        },
      });

    await prisma.auditLog.create({
      data: {
        customerId:
          currentQuote.customerId,
        orderId:
          updatedOrder.id,
        sessionId:
          currentQuote.sessionId,
        action:
          AuditAction.SYSTEM,
        entityType:
          "Order",
        entityId:
          updatedOrder.id,
        actorType:
          "system",
        message,
        after: {
          quoteId:
            currentQuote.id,
          quoteNumber:
            currentQuote.quoteNumber,
          orderId:
            updatedOrder.id,
          orderNumber:
            updatedOrder.orderNumber,
          orderStatus:
            updatedOrder.status,
          confirmationEmailSent:
            false,
          pdfAttached:
            false,
          actionRequired:
            true,
          error:
            failure,
        },
        metadata: {
          source:
            "automatic_order_confirmation",
          automatic: true,
          actionRequired: true,
        },
      },
    });

    return {
      status:
        "ACTION_REQUIRED",
      orderId:
        updatedOrder.id,
      orderNumber:
        updatedOrder.orderNumber,
      orderStatus:
        updatedOrder.status,
      emailSent: false,
      emailAlreadySent: false,
      pdfAttached: false,
      actionRequired: true,
      message,
      recipient,
      notificationId:
        notification.id,
      providerMessageId: null,
      error:
        failure,
    };
  }

  if (!recipient) {
    return recordFailure(
      "CUSTOMER_EMAIL_MISSING_OR_INVALID",
      "Der Auftrag wurde bestätigt, aber die Auftragsbestätigung konnte wegen einer fehlenden Kunden-E-Mail nicht versendet werden.",
    );
  }

  if (!resend) {
    return recordFailure(
      "RESEND_API_KEY_MISSING",
      "Der Auftrag wurde bestätigt, aber der E-Mail-Versand ist nicht konfiguriert.",
    );
  }

  const payload: OrderConfirmationPayload = {
    orderNumber:
      updatedOrder.orderNumber,
    quoteNumber:
      currentQuote.quoteNumber,
    customerName:
      customerName(
        currentQuote.customer,
      ),
    customerAddress: [
      currentQuote.customer.street,
      [
        currentQuote.customer.zipCode,
        currentQuote.customer.city,
      ]
        .filter(Boolean)
        .join(" "),
      currentQuote.customer.country,
    ].filter(
      (value): value is string =>
        Boolean(value?.trim()),
    ),
    serviceAddress: [
      updatedOrder.serviceStreet,
      [
        updatedOrder
          .serviceZipCode,
        updatedOrder.serviceCity,
      ]
        .filter(Boolean)
        .join(" "),
      updatedOrder.serviceCountry,
    ].filter(
      (value): value is string =>
        Boolean(value?.trim()),
    ),
    serviceTitle:
      updatedOrder.title?.trim() ||
      currentQuote.notes?.split("\n")[0]
        ?.trim() ||
      "Dienstleistung gemäss akzeptierter Offerte",
    serviceType:
      updatedOrder.serviceType,
    total:
      decimalToNumber(
        currentQuote.total,
      ),
    currency:
      currentQuote.currency ||
      updatedOrder.currency ||
      "CHF",
    acceptedAt:
      currentQuote.acceptedAt ??
      now,
    scheduledStart:
      updatedOrder.scheduledStart,
    items:
      extractOrderConfirmationItems(
        currentQuote.items,
      ),
  };

  let pdfBytes: Uint8Array;

  try {
    pdfBytes =
      await createOrderConfirmationPdf(
        payload,
      );
  } catch (error) {
    return recordFailure(
      `PDF_GENERATION_FAILED: ${errorMessage(
        error,
      )}`,
      "Der Auftrag wurde bestätigt, aber die PDF-Auftragsbestätigung konnte nicht erstellt werden.",
    );
  }

  const notification =
    await prisma.notification.create({
      data: {
        customerId:
          currentQuote.customerId,
        orderId:
          updatedOrder.id,
        sessionId:
          currentQuote.sessionId,
        channel:
          NotificationChannel.EMAIL,
        status:
          NotificationStatus.PENDING,
        recipient,
        subject,
        message: [
          `Auftrag: ${updatedOrder.orderNumber}`,
          `Offerte: ${currentQuote.quoteNumber}`,
          `Empfänger: ${recipient}`,
          `Status: ${updatedOrder.status}`,
          "Anhang: Auftragsbestätigung PDF",
        ].join("\n"),
        metadata: {
          source:
            "automatic_order_confirmation",
          type:
            "order_confirmation",
          quoteId:
            currentQuote.id,
          quoteNumber:
            currentQuote.quoteNumber,
          orderId:
            updatedOrder.id,
          orderNumber:
            updatedOrder.orderNumber,
          orderStatus:
            updatedOrder.status,
          automatic: true,
          actionRequired: false,
          pdfAttached: true,
          attachmentFilename:
            `Auftragsbestätigung_${safeFilename(
              updatedOrder.orderNumber,
            )}.pdf`,
        },
      },
    });

  let providerMessageId:
    | string
    | null = null;

  let sendError:
    | string
    | null = null;

  try {
    const result =
      await resend.emails.send({
        from:
          emailConfiguration.from,
        replyTo:
          emailConfiguration.replyTo,
        to: [recipient],
        subject,
        text:
          buildOrderConfirmationText(
            payload,
          ),
        html:
          buildOrderConfirmationHtml(
            payload,
          ),
        attachments: [
          {
            filename:
              `Auftragsbestätigung_${safeFilename(
                updatedOrder.orderNumber,
              )}.pdf`,
            content:
              Buffer.from(
                pdfBytes,
              ).toString(
                "base64",
              ),
          },
        ],
      });

    if (result.error) {
      sendError =
        result.error.message ||
        JSON.stringify(
          result.error,
        );
    } else {
      providerMessageId =
        result.data?.id ??
        null;
    }
  } catch (error) {
    sendError =
      errorMessage(error);
  }

  if (sendError) {
    await prisma.$transaction([
      prisma.notification.update({
        where: {
          id:
            notification.id,
        },
        data: {
          status:
            NotificationStatus.FAILED,
          sentAt: null,
          errorMessage:
            sendError,
          metadata: {
            source:
              "automatic_order_confirmation",
            type:
              "order_confirmation",
            quoteId:
              currentQuote.id,
            quoteNumber:
              currentQuote.quoteNumber,
            orderId:
              updatedOrder.id,
            orderNumber:
              updatedOrder.orderNumber,
            orderStatus:
              updatedOrder.status,
            automatic: true,
            actionRequired: true,
            pdfAttached: true,
            error:
              sendError,
          },
        },
      }),

      prisma.auditLog.create({
        data: {
          customerId:
            currentQuote.customerId,
          orderId:
            updatedOrder.id,
          sessionId:
            currentQuote.sessionId,
          action:
            AuditAction.SYSTEM,
          entityType:
            "Order",
          entityId:
            updatedOrder.id,
          actorType:
            "system",
          message:
            `Auftrag ${updatedOrder.orderNumber} wurde bestätigt, aber der Versand der PDF-Auftragsbestätigung ist fehlgeschlagen.`,
          after: {
            quoteId:
              currentQuote.id,
            quoteNumber:
              currentQuote.quoteNumber,
            orderId:
              updatedOrder.id,
            orderNumber:
              updatedOrder.orderNumber,
            orderStatus:
              updatedOrder.status,
            confirmationEmailSent:
              false,
            pdfAttached: true,
            notificationId:
              notification.id,
            actionRequired: true,
            error:
              sendError,
          },
          metadata: {
            source:
              "automatic_order_confirmation",
            automatic: true,
            actionRequired: true,
          },
        },
      }),
    ]);

    return {
      status:
        "ACTION_REQUIRED",
      orderId:
        updatedOrder.id,
      orderNumber:
        updatedOrder.orderNumber,
      orderStatus:
        updatedOrder.status,
      emailSent: false,
      emailAlreadySent: false,
      pdfAttached: true,
      actionRequired: true,
      message:
        "Der Auftrag wurde bestätigt, aber die PDF-Auftragsbestätigung konnte nicht per E-Mail versendet werden.",
      recipient,
      notificationId:
        notification.id,
      providerMessageId: null,
      error:
        sendError,
    };
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
          source:
            "automatic_order_confirmation",
          type:
            "order_confirmation",
          quoteId:
            currentQuote.id,
          quoteNumber:
            currentQuote.quoteNumber,
          orderId:
            updatedOrder.id,
          orderNumber:
            updatedOrder.orderNumber,
          orderStatus:
            updatedOrder.status,
          automatic: true,
          actionRequired: false,
          pdfAttached: true,
          providerMessageId,
          attachmentFilename:
            `Auftragsbestätigung_${safeFilename(
              updatedOrder.orderNumber,
            )}.pdf`,
        },
      },
    }),

    prisma.auditLog.create({
      data: {
        customerId:
          currentQuote.customerId,
        orderId:
          updatedOrder.id,
        sessionId:
          currentQuote.sessionId,
        action:
          AuditAction.SYSTEM,
        entityType:
          "Order",
        entityId:
          updatedOrder.id,
        actorType:
          "system",
        message:
          `Auftrag ${updatedOrder.orderNumber} wurde bestätigt. Die Auftragsbestätigung wurde als PDF an ${recipient} übergeben.`,
        before: {
          orderStatus:
            currentQuote.order.status,
        },
        after: {
          quoteId:
            currentQuote.id,
          quoteNumber:
            currentQuote.quoteNumber,
          orderId:
            updatedOrder.id,
          orderNumber:
            updatedOrder.orderNumber,
          orderStatus:
            updatedOrder.status,
          confirmationEmailSent:
            true,
          pdfAttached: true,
          recipient,
          notificationId:
            notification.id,
          providerMessageId,
          sentAt:
            sentAt.toISOString(),
        },
        metadata: {
          source:
            "automatic_order_confirmation",
          automatic: true,
          actionRequired: false,
        },
      },
    }),
  ]);

  return {
    status: "COMPLETED",
    orderId:
      updatedOrder.id,
    orderNumber:
      updatedOrder.orderNumber,
    orderStatus:
      updatedOrder.status,
    emailSent: true,
    emailAlreadySent: false,
    pdfAttached: true,
    actionRequired: false,
    message:
      `Auftrag ${updatedOrder.orderNumber} wurde bestätigt. Die PDF-Auftragsbestätigung wurde an ${recipient} versendet.`,
    recipient,
    notificationId:
      notification.id,
    providerMessageId,
    error: null,
  };
}
