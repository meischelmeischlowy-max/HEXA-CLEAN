import {
  AuditAction,
  EstimateStatus,
  NotificationChannel,
  NotificationStatus,
  PrismaClient,
  ServiceCatalogUnit,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TENANT_KEY = "hexa-clean";

const PHOTO_REQUEST_SUBJECT =
  "Fotos für Ihre Anfrage bei HEXA CLEAN";

const EMAIL_FROM =
  process.env.EMAIL_FROM ??
  "HEXA CLEAN <info@hexaclean.ch>";

const EMAIL_REPLY_TO =
  process.env.EMAIL_REPLY_TO ??
  "info@hexaclean.ch";

const resend =
  process.env.RESEND_API_KEY
    ? new Resend(
        process.env.RESEND_API_KEY,
      )
    : null;

type PhotoEmailResult = {
  sent: boolean;
  error: string | null;
};

async function sendPhotoRequestEmail({
  to,
  subject,
  message,
}: {
  to: string;
  subject: string;
  message: string;
}): Promise<PhotoEmailResult> {
  if (!resend) {
    return {
      sent: false,
      error:
        "RESEND_API_KEY is missing",
    };
  }

  const escapedMessage =
    message
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll(
        "\n",
        "<br />",
      );

  const { error } =
    await resend.emails.send({
      from: EMAIL_FROM,
      replyTo: EMAIL_REPLY_TO,
      to: [to],
      subject,
      text: message,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <p>${escapedMessage}</p>
        </div>
      `,
    });

  if (error) {
    return {
      sent: false,
      error:
        JSON.stringify(error),
    };
  }

  return {
    sent: true,
    error: null,
  };
}

const globalForPrisma =
  globalThis as unknown as {
    hexaReviewPrisma?: PrismaClient;
  };

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type ReviewItemInput = {
  name?: unknown;
  description?: unknown;
  unit?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
};

type ReviewBody = {
  action?: unknown;
  customer?: {
    firstName?: unknown;
    lastName?: unknown;
    companyName?: unknown;
    email?: unknown;
    phone?: unknown;
    street?: unknown;
    zipCode?: unknown;
    city?: unknown;
    country?: unknown;
  };
  estimate?: {
    title?: unknown;
    description?: unknown;
    serviceStreet?: unknown;
    serviceZipCode?: unknown;
    serviceCity?: unknown;
    serviceCountry?: unknown;
    preferredDate?: unknown;
    travelFee?: unknown;
    materialFee?: unknown;
    discountAmount?: unknown;
    notesCustomer?: unknown;
    notesInternal?: unknown;
  };
  items?: ReviewItemInput[];
  photoRequest?: {
    subject?: unknown;
    message?: unknown;
  };
};

function getPrisma() {
  if (!globalForPrisma.hexaReviewPrisma) {
    const databaseUrl =
      process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is missing",
      );
    }

    globalForPrisma.hexaReviewPrisma =
      new PrismaClient({
        adapter: new PrismaPg({
          connectionString:
            databaseUrl,
        }),
      });
  }

  return globalForPrisma
    .hexaReviewPrisma;
}

function cleanText(
  value: unknown,
  maximum = 4000,
) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned =
    value.trim().slice(0, maximum);

  return cleaned || null;
}

function cleanMoney(value: unknown) {
  const number =
    Number(
      String(value ?? "0")
        .trim()
        .replace(",", "."),
    );

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return 0;
  }

  return Math.round(
    (number + Number.EPSILON) *
      100,
  ) / 100;
}

function cleanQuantity(value: unknown) {
  const number =
    cleanMoney(value);

  return number > 0
    ? number
    : 1;
}

function cleanUnit(
  value: unknown,
): ServiceCatalogUnit {
  const normalized =
    String(value ?? "FLAT")
      .trim()
      .toUpperCase();

  return Object.values(
    ServiceCatalogUnit,
  ).includes(
    normalized as ServiceCatalogUnit,
  )
    ? normalized as ServiceCatalogUnit
    : ServiceCatalogUnit.FLAT;
}

function parseDate(value: unknown) {
  const text = cleanText(value, 40);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

function responseHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } =
      await context.params;

    const body =
      (await request.json()) as
        ReviewBody;

    const action =
      String(
        body.action ?? "SAVE",
      )
        .trim()
        .toUpperCase();

    if (
      action !== "SAVE" &&
      action !== "REQUEST_PHOTOS"
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          message:
            "Ungültige Aktion.",
        },
        {
          status: 400,
          headers: responseHeaders(),
        },
      );
    }

    const prisma = getPrisma();

    const current =
      await prisma.estimate.findFirst({
        where: {
          id,
          tenantKey: TENANT_KEY,
        },
        include: {
          customer: true,
          items: true,
        },
      });

    if (!current) {
      return NextResponse.json(
        {
          status: "NOT_FOUND",
          message:
            "Die Kalkulation wurde nicht gefunden.",
        },
        {
          status: 404,
          headers: responseHeaders(),
        },
      );
    }

    const rawItems =
      Array.isArray(body.items)
        ? body.items.slice(0, 50)
        : [];

    const items =
      rawItems
        .map((item, index) => {
          const name =
            cleanText(
              item.name,
              300,
            );

          if (!name) {
            return null;
          }

          const quantity =
            cleanQuantity(
              item.quantity,
            );

          const unitPrice =
            cleanMoney(
              item.unitPrice,
            );

          const subtotal =
            Math.round(
              (
                quantity *
                unitPrice +
                Number.EPSILON
              ) *
                100,
            ) / 100;

          return {
            name,
            description:
              cleanText(
                item.description,
                1500,
              ),
            unit:
              cleanUnit(item.unit),
            quantity,
            unitPrice,
            subtotal,
            total: subtotal,
            sortOrder: index,
          };
        })
        .filter(
          (
            item,
          ): item is NonNullable<
            typeof item
          > => Boolean(item),
        );

    if (items.length === 0) {
      return NextResponse.json(
        {
          status: "ERROR",
          message:
            "Mindestens eine Kalkulationsposition ist erforderlich.",
        },
        {
          status: 400,
          headers: responseHeaders(),
        },
      );
    }

    const subtotal =
      Math.round(
        (
          items.reduce(
            (sum, item) =>
              sum + item.total,
            0,
          ) +
          Number.EPSILON
        ) *
          100,
      ) / 100;

    const travelFee =
      cleanMoney(
        body.estimate?.travelFee,
      );

    const materialFee =
      cleanMoney(
        body.estimate?.materialFee,
      );

    const discountAmount =
      cleanMoney(
        body.estimate
          ?.discountAmount,
      );

    const total =
      Math.max(
        0,
        Math.round(
          (
            subtotal +
            travelFee +
            materialFee -
            discountAmount +
            Number.EPSILON
          ) *
            100,
        ) / 100,
      );

    const recipient =
      cleanText(
        body.customer?.email,
        320,
      ) ??
      current.customer.email;

    if (
      action ===
        "REQUEST_PHOTOS" &&
      !recipient
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          message:
            "Für die Foto-Anfrage wird eine Kunden-E-Mail benötigt.",
        },
        {
          status: 400,
          headers: responseHeaders(),
        },
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const customer =
            await tx.customer.update({
              where: {
                id:
                  current.customerId,
              },
              data: {
                firstName:
                  cleanText(
                    body.customer
                      ?.firstName,
                    160,
                  ),
                lastName:
                  cleanText(
                    body.customer
                      ?.lastName,
                    160,
                  ),
                companyName:
                  cleanText(
                    body.customer
                      ?.companyName,
                    240,
                  ),
                email:
                  cleanText(
                    body.customer
                      ?.email,
                    320,
                  ),
                phone:
                  cleanText(
                    body.customer
                      ?.phone,
                    100,
                  ),
                street:
                  cleanText(
                    body.customer
                      ?.street,
                    240,
                  ),
                zipCode:
                  cleanText(
                    body.customer
                      ?.zipCode,
                    40,
                  ),
                city:
                  cleanText(
                    body.customer
                      ?.city,
                    160,
                  ),
                country:
                  cleanText(
                    body.customer
                      ?.country,
                    10,
                  ) ?? "CH",
              },
            });

          await tx.estimateItem.deleteMany({
            where: {
              estimateId:
                current.id,
            },
          });

          const estimate =
            await tx.estimate.update({
              where: {
                id: current.id,
              },
              data: {
                title:
                  cleanText(
                    body.estimate
                      ?.title,
                    300,
                  ),
                description:
                  cleanText(
                    body.estimate
                      ?.description,
                    4000,
                  ),
                serviceStreet:
                  cleanText(
                    body.estimate
                      ?.serviceStreet,
                    240,
                  ),
                serviceZipCode:
                  cleanText(
                    body.estimate
                      ?.serviceZipCode,
                    40,
                  ),
                serviceCity:
                  cleanText(
                    body.estimate
                      ?.serviceCity,
                    160,
                  ),
                serviceCountry:
                  cleanText(
                    body.estimate
                      ?.serviceCountry,
                    10,
                  ) ?? "CH",
                preferredDate:
                  parseDate(
                    body.estimate
                      ?.preferredDate,
                  ),
                subtotal:
                  subtotal.toFixed(2),
                riskMultiplier:
                  "1.00",
                riskAmount:
                  "0.00",
                travelFee:
                  travelFee.toFixed(2),
                materialFee:
                  materialFee.toFixed(2),
                discountAmount:
                  discountAmount.toFixed(
                    2,
                  ),
                total:
                  total.toFixed(2),
                notesCustomer:
                  cleanText(
                    body.estimate
                      ?.notesCustomer,
                    4000,
                  ),
                notesInternal:
                  cleanText(
                    body.estimate
                      ?.notesInternal,
                    4000,
                  ),
                status:
                  action ===
                  "REQUEST_PHOTOS"
                    ? EstimateStatus
                        .NEEDS_PHOTOS
                    : EstimateStatus
                        .NEEDS_HUMAN_REVIEW,
                items: {
                  create:
                    items.map(
                      (item) => ({
                        ...item,
                        quantity:
                          item.quantity
                            .toFixed(2),
                        unitPrice:
                          item.unitPrice
                            .toFixed(2),
                        subtotal:
                          item.subtotal
                            .toFixed(2),
                        riskMultiplier:
                          "1.00",
                        riskAmount:
                          "0.00",
                        discountAmount:
                          "0.00",
                        total:
                          item.total
                            .toFixed(2),
                        metadata: {
                          source:
                            "owner-review-modal",
                          editedManually:
                            true,
                        },
                      }),
                    ),
                },
              },
              include: {
                items: {
                  orderBy: {
                    sortOrder: "asc",
                  },
                },
              },
            });

          let notification = null;

          if (
            action ===
            "REQUEST_PHOTOS"
          ) {
            const subject =
              cleanText(
                body.photoRequest
                  ?.subject,
                300,
              ) ??
              "Fotos für Ihre Anfrage bei HEXA CLEAN";

            const message =
              cleanText(
                body.photoRequest
                  ?.message,
                6000,
              ) ??
              [
                "Guten Tag,",
                "",
                "damit wir Ihre Anfrage zuverlässig prüfen und eine passende Offerte erstellen können, benötigen wir noch einige Fotos vom Objekt und von den zu reinigenden Bereichen.",
                "",
                "Bitte antworten Sie auf diese E-Mail und senden Sie die Fotos als Anhang.",
                "",
                "Vielen Dank.",
                "HEXA CLEAN",
              ].join("\n");

            const existingPhotoRequest =
              await tx.notification.findFirst({
                where: {
                  estimateId:
                    current.id,
                  channel:
                    NotificationChannel.EMAIL,
                  subject:
                    PHOTO_REQUEST_SUBJECT,
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
              });

            if (existingPhotoRequest) {
              notification =
                await tx.notification.update({
                  where: {
                    id:
                      existingPhotoRequest.id,
                  },
                  data: {
                    recipient:
                      recipient as string,
                    subject,
                    message,
                    metadata: {
                      source:
                        "owner-review-modal",
                      workflow:
                        "request_photos",
                      estimateId:
                        current.id,
                      estimateNumber:
                        current
                          .estimateNumber,
                      replyWithAttachments:
                        true,
                      reusedExisting:
                        true,
                    },
                  },
                });
            } else {
              notification =
                await tx.notification.create({
                  data: {
                    customerId:
                      current.customerId,
                    orderId:
                      current.orderId,
                    estimateId:
                      current.id,
                    sessionId:
                      current.sessionId,
                    channel:
                      NotificationChannel.EMAIL,
                    status:
                      NotificationStatus.PENDING,
                    recipient:
                      recipient as string,
                    subject,
                    message,
                    metadata: {
                      source:
                        "owner-review-modal",
                      workflow:
                        "request_photos",
                      estimateId:
                        current.id,
                      estimateNumber:
                        current
                          .estimateNumber,
                      replyWithAttachments:
                        true,
                      reusedExisting:
                        false,
                    },
                  },
                });
            }
          }

          await tx.auditLog.create({
            data: {
              customerId:
                current.customerId,
              orderId:
                current.orderId,
              estimateId:
                current.id,
              sessionId:
                current.sessionId,
              action:
                AuditAction.UPDATE,
              entityType:
                "Estimate",
              entityId:
                current.id,
              actorType:
                "dashboard",
              before: {
                total:
                  current.total.toString(),
                status:
                  current.status,
                items:
                  current.items.length,
              },
              after: {
                total:
                  total.toFixed(2),
                status:
                  estimate.status,
                items:
                  estimate.items.length,
                photoRequest:
                  action ===
                  "REQUEST_PHOTOS",
              },
              message:
                action ===
                "REQUEST_PHOTOS"
                  ? `Kalkulation ${current.estimateNumber} bearbeitet und Foto-Anfrage vorbereitet.`
                  : `Kalkulation ${current.estimateNumber} manuell bearbeitet.`,
              metadata: {
                source:
                  "owner-review-modal",
                action,
              },
            },
          });

          return {
            customer,
            estimate,
            notification,
          };
        },
      );

    let photoEmail:
      | PhotoEmailResult
      | null = null;

    if (
      action === "REQUEST_PHOTOS" &&
      result.notification
    ) {
      if (
        result.notification.status ===
        NotificationStatus.SENT
      ) {
        photoEmail = {
          sent: true,
          error: null,
        };
      } else {
        photoEmail =
          await sendPhotoRequestEmail({
            to:
              result.notification.recipient,
            subject:
              result.notification.subject ??
              PHOTO_REQUEST_SUBJECT,
            message:
              result.notification.message,
          });

        await prisma.notification.update({
          where: {
            id:
              result.notification.id,
          },
          data: {
            status:
              photoEmail.sent
                ? NotificationStatus.SENT
                : NotificationStatus.FAILED,
            sentAt:
              photoEmail.sent
                ? new Date()
                : null,
            errorMessage:
              photoEmail.error,
          },
        });
      }
    }

    return NextResponse.json(
      {
        status:
          photoEmail &&
          !photoEmail.sent
            ? "ERROR"
            : "OK",
        message:
          action === "REQUEST_PHOTOS"
            ? photoEmail?.sent
              ? "Änderungen gespeichert. Die Foto-Anfrage wurde an den Kunden gesendet."
              : "Änderungen gespeichert, aber die Foto-Anfrage konnte nicht versendet werden."
            : "Die Kalkulation wurde gespeichert.",
        data: {
          ...result,
          photoEmail,
        },
      },
      {
        status:
          photoEmail &&
          !photoEmail.sent
            ? 502
            : 200,
        headers: responseHeaders(),
      },
    );
  } catch (error) {
    console.error(
      "Estimate owner review error:",
      error,
    );

    return NextResponse.json(
      {
        status: "ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Die Kalkulation konnte nicht gespeichert werden.",
      },
      {
        status: 500,
        headers: responseHeaders(),
      },
    );
  }
}
