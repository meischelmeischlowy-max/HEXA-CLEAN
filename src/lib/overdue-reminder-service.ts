import {
  AuditAction,
  InvoiceStatus,
  NotificationChannel,
  NotificationStatus,
} from "@prisma/client";

import {
  calculateAutomatedInvoiceState,
  calculatePaidPaymentsTotal,
  decimalToNumber,
  moneyString,
} from "@/lib/dashboard/invoice-status";
import {
  emailConfiguration,
  resend,
} from "@/lib/email-config";
import {
  buildOverdueReminderSubject,
  buildOverdueReminderText,
  isOverdueReminderMetadata,
  type OverdueReminderMetadata,
} from "@/lib/overdue-reminder";
import {
  prisma,
} from "@/lib/prisma";

export type OverdueReminderRunResult = {
  checked: number;
  overdue: number;
  statusUpdated: number;
  sent: number;
  alreadyNotified: number;
  failed: number;
  items: Array<{
    invoiceId: string;
    invoiceNumber: string;
    result:
      | "SENT"
      | "ALREADY_NOTIFIED"
      | "FAILED";
    notificationId: string | null;
    error: string | null;
  }>;
};

function getCustomerName(customer: {
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
    "Unbekannter Kunde"
  );
}

function formatDate(value: Date | null) {
  if (!value) {
    return "nicht angegeben";
  }

  return new Intl.DateTimeFormat(
    "de-CH",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Europe/Zurich",
    },
  ).format(value);
}

export async function runOverdueInvoiceReminder(
  now = new Date(),
): Promise<OverdueReminderRunResult> {
  const invoices =
    await prisma.invoice.findMany({
      where: {
        status: {
          notIn: [
            InvoiceStatus.PAID,
            InvoiceStatus.CANCELLED,
            InvoiceStatus.DRAFT,
          ],
        },
        dueDate: {
          lt: now,
        },
      },
      include: {
        customer: true,
        payments: true,
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 500,
    });

  const result: OverdueReminderRunResult = {
    checked: invoices.length,
    overdue: 0,
    statusUpdated: 0,
    sent: 0,
    alreadyNotified: 0,
    failed: 0,
    items: [],
  };

  for (const invoice of invoices) {
    const paidPaymentsTotal =
      calculatePaidPaymentsTotal(
        invoice.payments,
      );

    const nextState =
      calculateAutomatedInvoiceState({
        currentStatus:
          invoice.status,
        total:
          invoice.total,
        paidPaymentsTotal,
        dueDate:
          invoice.dueDate,
        sentAt:
          invoice.sentAt,
        paidAt:
          invoice.paidAt,
        now,
      });

    if (
      nextState.status !==
      InvoiceStatus.OVERDUE
    ) {
      continue;
    }

    result.overdue += 1;

    if (
      invoice.status !==
        InvoiceStatus.OVERDUE ||
      decimalToNumber(
        invoice.paidAmount,
      ) !== nextState.paidAmount
    ) {
      await prisma.invoice.update({
        where: {
          id: invoice.id,
        },
        data: {
          status:
            InvoiceStatus.OVERDUE,
          paidAmount:
            moneyString(
              nextState.paidAmount,
            ),
          paidAt: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          customerId:
            invoice.customerId,
          orderId:
            invoice.orderId,
          action:
            AuditAction.STATUS_CHANGE,
          entityType:
            "Invoice",
          entityId:
            invoice.id,
          actorType:
            "overdue_invoice_cron",
          message:
            `Invoice ${invoice.invoiceNumber} changed automatically to OVERDUE.`,
          before: {
            status:
              invoice.status,
            paidAmount:
              decimalToNumber(
                invoice.paidAmount,
              ),
          },
          after: {
            status:
              InvoiceStatus.OVERDUE,
            paidAmount:
              nextState.paidAmount,
          },
          metadata: {
            source:
              "automatic_overdue_reminder",
            automatic: true,
            invoiceId:
              invoice.id,
            invoiceNumber:
              invoice.invoiceNumber,
            dueDate:
              invoice.dueDate
                ?.toISOString() ??
              null,
          },
        },
      });

      result.statusUpdated += 1;
    }

    const candidates =
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

    const existing =
      candidates.find(
        (notification) =>
          isOverdueReminderMetadata(
            notification.metadata,
            invoice.id,
          ),
      );

    if (existing) {
      result.alreadyNotified += 1;

      result.items.push({
        invoiceId:
          invoice.id,
        invoiceNumber:
          invoice.invoiceNumber,
        result:
          "ALREADY_NOTIFIED",
        notificationId:
          existing.id,
        error: null,
      });

      continue;
    }

    const metadata:
      OverdueReminderMetadata = {
        source:
          "automatic_overdue_reminder",
        type:
          "owner_overdue_invoice",
        invoiceId:
          invoice.id,
        invoiceNumber:
          invoice.invoiceNumber,
        dueDate:
          invoice.dueDate
            ?.toISOString() ??
          null,
        automatic: true,
        actionRequired: true,
      };

    const subject =
      buildOverdueReminderSubject(
        invoice.invoiceNumber,
      );

    const message =
      buildOverdueReminderText({
        invoiceNumber:
          invoice.invoiceNumber,
        customerName:
          getCustomerName(
            invoice.customer,
          ),
        total:
          decimalToNumber(
            invoice.total,
          ).toFixed(2),
        currency:
          invoice.currency,
        dueDate:
          formatDate(
            invoice.dueDate,
          ),
      });

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
          recipient:
            emailConfiguration.ownerEmail,
          subject,
          message,
          metadata,
        },
      });

    if (!resend) {
      const error =
        "RESEND_API_KEY_MISSING";

      await prisma.notification.update({
        where: {
          id:
            notification.id,
        },
        data: {
          status:
            NotificationStatus.FAILED,
          errorMessage:
            error,
          metadata: {
            ...metadata,
            error,
          },
        },
      });

      result.failed += 1;

      result.items.push({
        invoiceId:
          invoice.id,
        invoiceNumber:
          invoice.invoiceNumber,
        result:
          "FAILED",
        notificationId:
          notification.id,
        error,
      });

      continue;
    }

    try {
      const emailResult =
        await resend.emails.send({
          from:
            emailConfiguration.from,
          replyTo:
            emailConfiguration.replyTo,
          to: [
            emailConfiguration.ownerEmail,
          ],
          subject,
          text: message,
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
              "overdue_invoice_cron",
            message:
              `Owner reminder for overdue invoice ${invoice.invoiceNumber} was sent.`,
            metadata: {
              ...metadata,
              notificationId:
                notification.id,
              recipient:
                emailConfiguration.ownerEmail,
              providerMessageId:
                emailResult.data?.id ??
                null,
            },
          },
        }),
      ]);

      result.sent += 1;

      result.items.push({
        invoiceId:
          invoice.id,
        invoiceNumber:
          invoice.invoiceNumber,
        result:
          "SENT",
        notificationId:
          notification.id,
        error: null,
      });
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
              "overdue_invoice_cron",
            message:
              `Owner reminder for overdue invoice ${invoice.invoiceNumber} failed.`,
            metadata: {
              ...metadata,
              notificationId:
                notification.id,
              error:
                errorMessage,
            },
          },
        })
        .catch(() => undefined);

      result.failed += 1;

      result.items.push({
        invoiceId:
          invoice.id,
        invoiceNumber:
          invoice.invoiceNumber,
        result:
          "FAILED",
        notificationId:
          notification.id,
        error:
          errorMessage,
      });
    }
  }

  return result;
}