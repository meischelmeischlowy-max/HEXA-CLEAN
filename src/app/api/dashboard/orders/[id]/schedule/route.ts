import {
  AuditAction,
  NotificationChannel,
  NotificationStatus,
  OrderStatus,
  PrismaClient,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";

import {
  emailConfiguration,
  resend,
} from "@/lib/email-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type RouteContext = {
  params: Promise<{ id: string }>;
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

function parseRequiredDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function parseOptionalDate(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  return parseRequiredDate(value);
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

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat(
    "de-CH",
    {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Europe/Zurich",
    },
  ).format(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sameDate(
  left: Date | null,
  right: Date | null,
) {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return left.getTime() === right.getTime();
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const scheduledStart =
      parseRequiredDate(body.scheduledStart);

    const scheduledEnd =
      parseOptionalDate(body.scheduledEnd);

    if (!scheduledStart) {
      return NextResponse.json(
        {
          status: "ERROR",
          message:
            "Ein g?ltiger Starttermin ist erforderlich.",
        },
        { status: 400 },
      );
    }

    if (
      scheduledEnd &&
      scheduledEnd.getTime() <=
        scheduledStart.getTime()
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          message:
            "Der Endtermin muss nach dem Starttermin liegen.",
        },
        { status: 400 },
      );
    }

    const prisma = getPrisma();

    const existingOrder =
      await prisma.order.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
            },
          },
        },
      });

    if (!existingOrder) {
      return NextResponse.json(
        {
          status: "NOT_FOUND",
          message: "Auftrag nicht gefunden.",
        },
        { status: 404 },
      );
    }

    if (
      existingOrder.status !==
        OrderStatus.CONFIRMED &&
      existingOrder.status !==
        OrderStatus.SCHEDULED
    ) {
      return NextResponse.json(
        {
          status: "CONFLICT",
          message:
            "Nur ein best?tigter Auftrag kann geplant werden.",
          currentStatus:
            existingOrder.status,
          requiredStatus:
            OrderStatus.CONFIRMED,
        },
        { status: 409 },
      );
    }

    const unchangedSchedule =
      existingOrder.status ===
        OrderStatus.SCHEDULED &&
      sameDate(
        existingOrder.scheduledStart,
        scheduledStart,
      ) &&
      sameDate(
        existingOrder.scheduledEnd,
        scheduledEnd,
      );

    if (unchangedSchedule) {
      return NextResponse.json({
        status: "OK",
        message:
          "Dieser Termin ist bereits gespeichert.",
        data: {
          order: existingOrder,
          emailDelivery: {
            sent: false,
            alreadyConfirmed: true,
            actionRequired: false,
          },
        },
      });
    }

    const order =
      await prisma.$transaction(
        async (tx) => {
          const updatedOrder =
            await tx.order.update({
              where: { id },
              data: {
                status:
                  OrderStatus.SCHEDULED,
                scheduledStart,
                scheduledEnd,
              },
              select: {
                id: true,
                orderNumber: true,
                customerId: true,
                sessionId: true,
                serviceType: true,
                title: true,
                serviceStreet: true,
                serviceZipCode: true,
                serviceCity: true,
                serviceCountry: true,
                status: true,
                scheduledStart: true,
                scheduledEnd: true,
              },
            });

          await tx.auditLog.create({
            data: {
              action:
                AuditAction.STATUS_CHANGE,
              entityType: "Order",
              entityId: updatedOrder.id,
              customerId:
                updatedOrder.customerId,
              orderId: updatedOrder.id,
              sessionId:
                updatedOrder.sessionId,
              actorType:
                "dashboard_owner",
              before: {
                status:
                  existingOrder.status,
                scheduledStart:
                  existingOrder
                    .scheduledStart
                    ?.toISOString() ??
                  null,
                scheduledEnd:
                  existingOrder
                    .scheduledEnd
                    ?.toISOString() ??
                  null,
              },
              after: {
                status:
                  updatedOrder.status,
                scheduledStart:
                  updatedOrder
                    .scheduledStart
                    ?.toISOString() ??
                  null,
                scheduledEnd:
                  updatedOrder
                    .scheduledEnd
                    ?.toISOString() ??
                  null,
              },
              message:
                `Termin für Auftrag ${updatedOrder.orderNumber} wurde geplant.`,
              metadata: {
                source:
                  "dashboard_order_scheduling",
                automationFirst: true,
                customerConfirmationRequired:
                  true,
              },
            },
          });

          return updatedOrder;
        },
      );

    const recipient = normalizeEmail(
      existingOrder.customer.email,
    );

    const subject =
      `Terminbestätigung für Auftrag ${order.orderNumber}`;

    const formattedStart =
      formatDateTime(scheduledStart);

    const formattedEnd = scheduledEnd
      ? formatDateTime(scheduledEnd)
      : null;

    const serviceLocation = [
      order.serviceStreet,
      order.serviceZipCode,
      order.serviceCity,
      order.serviceCountry,
    ]
      .filter(Boolean)
      .join(", ");

    const text = [
      `Guten Tag ${customerName(existingOrder.customer)}`,
      "",
      `der Ausführungstermin für Ihren Auftrag ${order.orderNumber} wurde best?tigt.`,
      "",
      `Beginn: ${formattedStart}`,
      formattedEnd
        ? `Ende: ${formattedEnd}`
        : null,
      `Leistung: ${order.title || order.serviceType}`,
      serviceLocation
        ? `Leistungsort: ${serviceLocation}`
        : null,
      "",
      "Falls der Termin ge?ndert werden muss, antworten Sie bitte auf diese E-Mail.",
      "",
      "Freundliche Gr?sse",
      "HEXA CLEAN",
    ]
      .filter(
        (line): line is string =>
          line !== null,
      )
      .join("\n");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:680px;margin:0 auto">
        <h1 style="color:#006d75">Termin best?tigt</h1>
        <p>Guten Tag ${escapeHtml(
          customerName(existingOrder.customer),
        )}</p>
        <p>
          Der Ausführungstermin für Ihren Auftrag
          <strong>${escapeHtml(
            order.orderNumber,
          )}</strong>
          wurde best?tigt.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:24px 0">
          <tr>
            <td style="padding:10px;border-bottom:1px solid #d9e2e8">Beginn</td>
            <td style="padding:10px;border-bottom:1px solid #d9e2e8"><strong>${escapeHtml(
              formattedStart,
            )}</strong></td>
          </tr>
          ${
            formattedEnd
              ? `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #d9e2e8">Ende</td>
            <td style="padding:10px;border-bottom:1px solid #d9e2e8"><strong>${escapeHtml(
              formattedEnd,
            )}</strong></td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding:10px;border-bottom:1px solid #d9e2e8">Leistung</td>
            <td style="padding:10px;border-bottom:1px solid #d9e2e8">${escapeHtml(
              order.title ||
                String(order.serviceType),
            )}</td>
          </tr>
          ${
            serviceLocation
              ? `
          <tr>
            <td style="padding:10px;border-bottom:1px solid #d9e2e8">Leistungsort</td>
            <td style="padding:10px;border-bottom:1px solid #d9e2e8">${escapeHtml(
              serviceLocation,
            )}</td>
          </tr>`
              : ""
          }
        </table>
        <p>
          Falls der Termin ge?ndert werden muss,
          antworten Sie bitte auf diese E-Mail.
        </p>
        <p>Freundliche Gr?sse<br><strong>HEXA CLEAN</strong></p>
      </div>
    `;

    if (!recipient) {
      const notification =
        await prisma.notification.create({
          data: {
            customerId:
              order.customerId,
            orderId: order.id,
            sessionId:
              order.sessionId,
            channel:
              NotificationChannel.EMAIL,
            status:
              NotificationStatus.FAILED,
            recipient:
              emailConfiguration.ownerEmail,
            subject,
            message: text,
            errorMessage:
              "INVALID_CUSTOMER_EMAIL",
            metadata: {
              source:
                "automatic_schedule_confirmation",
              type:
                "customer_schedule_confirmation",
              orderId: order.id,
              orderNumber:
                order.orderNumber,
              scheduledStart:
                scheduledStart.toISOString(),
              scheduledEnd:
                scheduledEnd?.toISOString() ??
                null,
              automatic: true,
              actionRequired: true,
              error:
                "INVALID_CUSTOMER_EMAIL",
            },
          },
        });

      await prisma.auditLog.create({
        data: {
          action: AuditAction.SYSTEM,
          entityType: "Order",
          entityId: order.id,
          customerId:
            order.customerId,
          orderId: order.id,
          sessionId:
            order.sessionId,
          actorType:
            "schedule_email_automation",
          message:
            `Terminbestätigung für Auftrag ${order.orderNumber} konnte nicht versendet werden: ungültige Kunden-E-Mail.`,
          metadata: {
            source:
              "automatic_schedule_confirmation",
            notificationId:
              notification.id,
            actionRequired: true,
            error:
              "INVALID_CUSTOMER_EMAIL",
          },
        },
      });

      return NextResponse.json({
        status: "OK",
        message:
          "Der Termin wurde gespeichert, aber die Bestätigung konnte nicht versendet werden.",
        data: {
          order,
          emailDelivery: {
            sent: false,
            alreadyConfirmed: false,
            actionRequired: true,
            notificationId:
              notification.id,
            error:
              "INVALID_CUSTOMER_EMAIL",
          },
        },
      });
    }

    if (!resend) {
      const notification =
        await prisma.notification.create({
          data: {
            customerId:
              order.customerId,
            orderId: order.id,
            sessionId:
              order.sessionId,
            channel:
              NotificationChannel.EMAIL,
            status:
              NotificationStatus.FAILED,
            recipient,
            subject,
            message: text,
            errorMessage:
              "RESEND_API_KEY_MISSING",
            metadata: {
              source:
                "automatic_schedule_confirmation",
              type:
                "customer_schedule_confirmation",
              orderId: order.id,
              orderNumber:
                order.orderNumber,
              scheduledStart:
                scheduledStart.toISOString(),
              scheduledEnd:
                scheduledEnd?.toISOString() ??
                null,
              automatic: true,
              actionRequired: true,
              error:
                "RESEND_API_KEY_MISSING",
            },
          },
        });

      return NextResponse.json({
        status: "OK",
        message:
          "Der Termin wurde gespeichert, aber der E-Mail-Dienst ist nicht konfiguriert.",
        data: {
          order,
          emailDelivery: {
            sent: false,
            alreadyConfirmed: false,
            actionRequired: true,
            notificationId:
              notification.id,
            error:
              "RESEND_API_KEY_MISSING",
          },
        },
      });
    }

    const notification =
      await prisma.notification.create({
        data: {
          customerId:
            order.customerId,
          orderId: order.id,
          sessionId:
            order.sessionId,
          channel:
            NotificationChannel.EMAIL,
          status:
            NotificationStatus.PENDING,
          recipient,
          subject,
          message: text,
          metadata: {
            source:
              "automatic_schedule_confirmation",
            type:
              "customer_schedule_confirmation",
            orderId: order.id,
            orderNumber:
              order.orderNumber,
            scheduledStart:
              scheduledStart.toISOString(),
            scheduledEnd:
              scheduledEnd?.toISOString() ??
              null,
            automatic: true,
            actionRequired: false,
          },
        },
      });

    try {
      const emailResult =
        await resend.emails.send({
          from:
            emailConfiguration.from,
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

        await prisma.$transaction([
          prisma.notification.update({
            where: {
              id: notification.id,
            },
            data: {
              status:
                NotificationStatus.FAILED,
              errorMessage,
              metadata: {
                source:
                  "automatic_schedule_confirmation",
                type:
                  "customer_schedule_confirmation",
                orderId: order.id,
                orderNumber:
                  order.orderNumber,
                scheduledStart:
                  scheduledStart.toISOString(),
                scheduledEnd:
                  scheduledEnd?.toISOString() ??
                  null,
                automatic: true,
                actionRequired: true,
                error: errorMessage,
              },
            },
          }),

          prisma.auditLog.create({
            data: {
              action:
                AuditAction.SYSTEM,
              entityType: "Order",
              entityId: order.id,
              customerId:
                order.customerId,
              orderId: order.id,
              sessionId:
                order.sessionId,
              actorType:
                "schedule_email_automation",
              message:
                `Terminbestätigung für Auftrag ${order.orderNumber} konnte nicht versendet werden.`,
              metadata: {
                source:
                  "automatic_schedule_confirmation",
                notificationId:
                  notification.id,
                recipient,
                actionRequired: true,
                error: errorMessage,
              },
            },
          }),
        ]);

        return NextResponse.json({
          status: "OK",
          message:
            "Der Termin wurde gespeichert, aber die Bestätigung konnte nicht versendet werden.",
          data: {
            order,
            emailDelivery: {
              sent: false,
              alreadyConfirmed: false,
              actionRequired: true,
              notificationId:
                notification.id,
              error: errorMessage,
            },
          },
        });
      }

      const sentAt = new Date();

      await prisma.$transaction([
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
                "automatic_schedule_confirmation",
              type:
                "customer_schedule_confirmation",
              orderId: order.id,
              orderNumber:
                order.orderNumber,
              scheduledStart:
                scheduledStart.toISOString(),
              scheduledEnd:
                scheduledEnd?.toISOString() ??
                null,
              automatic: true,
              actionRequired: false,
              providerMessageId:
                emailResult.data?.id ??
                null,
            },
          },
        }),

        prisma.auditLog.create({
          data: {
            action:
              AuditAction.SYSTEM,
            entityType: "Order",
            entityId: order.id,
            customerId:
              order.customerId,
            orderId: order.id,
            sessionId:
              order.sessionId,
            actorType:
              "schedule_email_automation",
            message:
              `Terminbestätigung für Auftrag ${order.orderNumber} wurde automatisch per E-Mail versendet.`,
            metadata: {
              source:
                "automatic_schedule_confirmation",
              notificationId:
                notification.id,
              recipient,
              automatic: true,
              providerMessageId:
                emailResult.data?.id ??
                null,
            },
          },
        }),
      ]);

      return NextResponse.json({
        status: "OK",
        message:
          "Der Auftrag wurde eingeplant und der Termin per E-Mail best?tigt.",
        data: {
          order,
          emailDelivery: {
            sent: true,
            alreadyConfirmed: false,
            actionRequired: false,
            recipient,
            notificationId:
              notification.id,
          },
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown schedule email error";

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
                "automatic_schedule_confirmation",
              type:
                "customer_schedule_confirmation",
              orderId: order.id,
              orderNumber:
                order.orderNumber,
              scheduledStart:
                scheduledStart.toISOString(),
              scheduledEnd:
                scheduledEnd?.toISOString() ??
                null,
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
            action:
              AuditAction.SYSTEM,
            entityType: "Order",
            entityId: order.id,
            customerId:
              order.customerId,
            orderId: order.id,
            sessionId:
              order.sessionId,
            actorType:
              "schedule_email_automation",
            message:
              `Terminbestätigung für Auftrag ${order.orderNumber} ist unerwartet fehlgeschlagen.`,
            metadata: {
              source:
                "automatic_schedule_confirmation",
              notificationId:
                notification.id,
              recipient,
              actionRequired: true,
              error: errorMessage,
            },
          },
        })
        .catch(() => undefined);

      return NextResponse.json({
        status: "OK",
        message:
          "Der Termin wurde gespeichert, aber die Bestätigung konnte nicht versendet werden.",
        data: {
          order,
          emailDelivery: {
            sent: false,
            alreadyConfirmed: false,
            actionRequired: true,
            notificationId:
              notification.id,
            error: errorMessage,
          },
        },
      });
    }
  } catch (error) {
    console.error(
      "Order scheduling error:",
      error,
    );

    return NextResponse.json(
      {
        status: "ERROR",
        message:
          "Der Auftrag konnte nicht eingeplant werden.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
