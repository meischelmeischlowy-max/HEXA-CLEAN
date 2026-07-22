const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.production.local", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const base = process.argv[2] || "https://www.hexaclean.ch";
const secret = process.env.DASHBOARD_AUTH_TOKEN;
const databaseUrl = process.env.DATABASE_URL;
const testEmail = String(process.env.HEXA_TEST_CUSTOMER_EMAIL || "")
  .trim()
  .toLowerCase();

if (!secret || secret.length < 32 || !databaseUrl || !testEmail) {
  throw new Error(
    "Brak DASHBOARD_AUTH_TOKEN, DATABASE_URL lub HEXA_TEST_CUSTOMER_EMAIL.",
  );
}

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
});

const suffix =
  Date.now().toString() +
  "-" +
  Math.random().toString(16).slice(2);

let customerId = null;
let orderId = null;
let slotId = null;

function ids(rows) {
  return rows.map((row) => row.id).filter(Boolean);
}

async function api(
  name,
  endpoint,
  expectedStatus,
  body,
  auth = true,
) {
  const response = await fetch(
    base + endpoint,
    {
      method: "POST",
      headers: {
        ...(auth
          ? {
              authorization:
                "Bearer " + secret,
            }
          : {}),
        ...(body === undefined
          ? {}
          : {
              "content-type":
                "application/json",
            }),
        ...(!auth
          ? {
              "x-forwarded-for":
                "198.51.100.88",
              "user-agent":
                "Hexa-E17-6BC-" +
                suffix,
              "accept-language":
                "de-CH",
            }
          : {}),
      },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body),
    },
  );

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = {
        raw,
      };
    }
  }

  console.log(
    name +
      " -> HTTP " +
      response.status,
  );

  if (
    response.status !== expectedStatus
  ) {
    throw new Error(
      name +
        ": oczekiwano " +
        expectedStatus +
        ", otrzymano " +
        response.status +
        ": " +
        raw.slice(0, 500),
    );
  }

  return data;
}

async function backupAndCleanPreviousTestData() {
  const customers =
    await db.customer.findMany({
      where: {
        email: testEmail,
      },
      include: {
        orders: true,
        estimates: true,
        quotes: true,
        invoices: true,
        sessions: true,
        notifications: true,
        attachments: true,
        auditLogs: true,
        publicOfferLinks: true,
      },
    });

  if (customers.length === 0) {
    console.log(
      "PREVIOUS TEST DATA -> NONE",
    );
    return;
  }

  const customerIds = ids(customers);
  const orders =
    await db.order.findMany({
      where: {
        customerId: {
          in: customerIds,
        },
      },
    });
  const orderIds = ids(orders);

  const sessions =
    await db.session.findMany({
      where: {
        customerId: {
          in: customerIds,
        },
      },
    });
  const sessionIds = ids(sessions);

  const estimates =
    await db.estimate.findMany({
      where: {
        customerId: {
          in: customerIds,
        },
      },
    });
  const estimateIds = ids(estimates);

  const quotes =
    await db.quote.findMany({
      where: {
        customerId: {
          in: customerIds,
        },
      },
    });
  const quoteIds = ids(quotes);

  const invoices =
    await db.invoice.findMany({
      where: {
        customerId: {
          in: customerIds,
        },
      },
    });
  const invoiceIds = ids(invoices);

  const availabilitySlots =
    await db.availabilitySlot.findMany({
      where: {
        orderId: {
          in: orderIds,
        },
      },
    });

  const backupDir = path.join(
    process.cwd(),
    "reports",
    "cleanup-backups",
  );

  fs.mkdirSync(backupDir, {
    recursive: true,
  });

  const backupPath = path.join(
    backupDir,
    "e17_6bc_previous_test_" +
      new Date()
        .toISOString()
        .replace(/[:.]/g, "-") +
      ".json",
  );

  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        createdAt:
          new Date().toISOString(),
        testEmail,
        customers,
        orders,
        sessions,
        estimates,
        quotes,
        invoices,
        availabilitySlots,
      },
      null,
      2,
    ),
    "utf8",
  );

  await db.$transaction(
    async (tx) => {
      await tx.availabilitySlot.deleteMany({
        where: {
          orderId: {
            in: orderIds,
          },
        },
      });

      await tx.payment.deleteMany({
        where: {
          OR: [
            {
              invoiceId: {
                in: invoiceIds,
              },
            },
            {
              orderId: {
                in: orderIds,
              },
            },
          ],
        },
      });

      await tx.publicOfferLink.deleteMany({
        where: {
          customerId: {
            in: customerIds,
          },
        },
      });

      await tx.attachment.deleteMany({
        where: {
          customerId: {
            in: customerIds,
          },
        },
      });

      await tx.notification.deleteMany({
        where: {
          customerId: {
            in: customerIds,
          },
        },
      });

      await tx.auditLog.deleteMany({
        where: {
          customerId: {
            in: customerIds,
          },
        },
      });

      await tx.conversationMessage.deleteMany({
        where: {
          customerId: {
            in: customerIds,
          },
        },
      });

      await tx.invoiceItem.deleteMany({
        where: {
          invoiceId: {
            in: invoiceIds,
          },
        },
      });

      await tx.invoice.deleteMany({
        where: {
          id: {
            in: invoiceIds,
          },
        },
      });

      await tx.quote.deleteMany({
        where: {
          id: {
            in: quoteIds,
          },
        },
      });

      await tx.estimateItem.deleteMany({
        where: {
          estimateId: {
            in: estimateIds,
          },
        },
      });

      await tx.estimate.deleteMany({
        where: {
          id: {
            in: estimateIds,
          },
        },
      });

      await tx.order.deleteMany({
        where: {
          id: {
            in: orderIds,
          },
        },
      });

      await tx.session.deleteMany({
        where: {
          id: {
            in: sessionIds,
          },
        },
      });

      await tx.customer.deleteMany({
        where: {
          id: {
            in: customerIds,
          },
        },
      });
    },
  );

  console.log(
    "PREVIOUS TEST DATA CLEANUP -> OK",
  );
  console.log(
    "BACKUP -> " + backupPath,
  );
}

async function main() {
  await backupAndCleanPreviousTestData();

  const customer =
    await db.customer.create({
      data: {
        type: "PRIVATE",
        firstName: "E17",
        lastName: "Production Test",
        email: testEmail,
        notes:
          "automated-e17-6bc-" +
          suffix,
      },
    });

  customerId = customer.id;

  const order =
    await db.order.create({
      data: {
        orderNumber:
          "E17-" + suffix,
        customerId,
        serviceType:
          "REINIGUNG",
        title:
          "E17.6B+C Produktionsworkflow",
        status: "NEW",
        estimatedPrice:
          "100.00",
        finalPrice:
          "100.00",
        currency: "CHF",
      },
    });

  orderId = order.id;

  const startAt = new Date(
    Date.now() +
      3 * 24 * 60 * 60 * 1000,
  );
  startAt.setUTCHours(
    9,
    0,
    0,
    0,
  );

  const endAt = new Date(
    startAt.getTime() +
      2 * 60 * 60 * 1000,
  );

  const slot =
    await db.availabilitySlot.create({
      data: {
        tenantKey:
          "hexa-clean",
        startAt,
        endAt,
        status:
          "AVAILABLE",
        notes:
          "E17.6B+C production test",
      },
    });

  slotId = slot.id;

  console.log(
    "TEST FIXTURE -> CREATED",
  );
  console.log(
    "SLOT -> " +
      slot.startAt.toISOString(),
  );

  await api(
    "CREATE QUOTE",
    "/api/dashboard/orders/" +
      order.id +
      "/create-quote",
    201,
  );

  await api(
    "CREATE QUOTE IDEMPOTENT",
    "/api/dashboard/orders/" +
      order.id +
      "/create-quote",
    201,
  );

  const quotes =
    await db.quote.findMany({
      where: {
        orderId: order.id,
      },
    });

  if (quotes.length !== 1) {
    throw new Error(
      "Quote count: " +
        quotes.length,
    );
  }

  const quote = quotes[0];

  await db.quote.update({
    where: {
      id: quote.id,
    },
    data: {
      status: "SENT",
      sentAt: new Date(),
      validUntil: new Date(
        Date.now() +
          7 * 24 * 60 * 60 * 1000,
      ),
    },
  });

  const link = await api(
    "CREATE PUBLIC LINK",
    "/api/dashboard/quotes/" +
      quote.id +
      "/public-link",
    201,
    {
      expiresInDays: 7,
      revokeExisting: true,
    },
  );

  const token = new URL(
    link.publicUrl,
  )
    .pathname
    .split("/")
    .filter(Boolean)
    .at(-1);

  if (!token) {
    throw new Error(
      "Brak tokenu oferty.",
    );
  }

  await api(
    "ACCEPT OFFER WITH SLOT",
    "/api/public/offers/" +
      encodeURIComponent(token) +
      "/accept-with-slot",
    200,
    {
      confirmAcceptance: true,
      availabilitySlotId:
        slot.id,
    },
    false,
  );

  const [
    acceptedQuote,
    scheduledOrder,
    bookedSlot,
  ] = await Promise.all([
    db.quote.findUnique({
      where: {
        id: quote.id,
      },
    }),
    db.order.findUnique({
      where: {
        id: order.id,
      },
    }),
    db.availabilitySlot.findUnique({
      where: {
        id: slot.id,
      },
    }),
  ]);

  if (
    acceptedQuote?.status !==
      "ACCEPTED" ||
    !acceptedQuote.acceptedAt ||
    scheduledOrder?.status !==
      "SCHEDULED" ||
    !scheduledOrder.scheduledStart ||
    !scheduledOrder.scheduledEnd ||
    bookedSlot?.status !==
      "BOOKED" ||
    bookedSlot.orderId !==
      order.id
  ) {
    throw new Error(
      "Akceptacja i rezerwacja terminu nie przeszly.",
    );
  }

  console.log(
    "ACCEPTANCE + SLOT -> OK",
  );

  const complete = await api(
    "COMPLETE ORDER",
    "/api/dashboard/orders/" +
      order.id +
      "/mark-completed",
    200,
  );

  if (
    complete.updated !== true
  ) {
    throw new Error(
      "Order completion failed.",
    );
  }

  const completeAgain = await api(
    "COMPLETE ORDER IDEMPOTENT",
    "/api/dashboard/orders/" +
      order.id +
      "/mark-completed",
    200,
  );

  if (
    completeAgain.updated !== false
  ) {
    throw new Error(
      "Order completion idempotency failed.",
    );
  }

  let invoice =
    await db.invoice.findFirst({
      where: {
        quoteId: quote.id,
      },
    });

  if (!invoice) {
    throw new Error(
      "Automatyczna faktura po zakonczeniu zlecenia nie powstala.",
    );
  }

  console.log(
    "AUTO INVOICE -> OK",
  );

  await api(
    "PARTIAL PAYMENT",
    "/api/dashboard/invoices/" +
      invoice.id +
      "/payments",
    201,
    {
      amount: "40.00",
      method:
        "BANK_TRANSFER",
      externalRef:
        "E17-P1-" + suffix,
    },
  );

  await api(
    "FINAL PAYMENT",
    "/api/dashboard/invoices/" +
      invoice.id +
      "/payments",
    201,
    {
      amount: "60.00",
      method:
        "BANK_TRANSFER",
      externalRef:
        "E17-P2-" + suffix,
    },
  );

  const [
    finalQuote,
    finalOrder,
    finalInvoice,
    payments,
    publicLink,
    notifications,
    auditCount,
  ] = await Promise.all([
    db.quote.findUnique({
      where: {
        id: quote.id,
      },
    }),
    db.order.findUnique({
      where: {
        id: order.id,
      },
    }),
    db.invoice.findUnique({
      where: {
        id: invoice.id,
      },
    }),
    db.payment.findMany({
      where: {
        invoiceId:
          invoice.id,
      },
    }),
    db.publicOfferLink.findFirst({
      where: {
        quoteId: quote.id,
      },
    }),
    db.notification.findMany({
      where: {
        customerId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        status: true,
        recipient: true,
        subject: true,
        errorMessage: true,
        sentAt: true,
      },
    }),
    db.auditLog.count({
      where: {
        customerId,
      },
    }),
  ]);

  const paymentTotal =
    payments.reduce(
      (sum, payment) =>
        sum +
        Number(payment.amount),
      0,
    );

  if (
    finalQuote?.status !==
      "ACCEPTED" ||
    finalOrder?.status !==
      "COMPLETED" ||
    finalInvoice?.status !==
      "PAID" ||
    Number(
      finalInvoice.paidAmount,
    ) !== 100 ||
    payments.length !== 2 ||
    paymentTotal !== 100 ||
    !publicLink?.acceptedAt ||
    auditCount < 5
  ) {
    throw new Error(
      "Koncowa weryfikacja E17.6B+C nie przeszla.",
    );
  }

  console.log(
    JSON.stringify(
      {
        result:
          "E17.6B+C PRODUCTION WORKFLOW: SUCCESS",
        base,
        testEmail,
        customerId,
        orderId,
        quoteId:
          finalQuote.id,
        slotId:
          bookedSlot.id,
        invoiceId:
          finalInvoice.id,
        quoteStatus:
          finalQuote.status,
        orderStatus:
          finalOrder.status,
        slotStatus:
          bookedSlot.status,
        invoiceStatus:
          finalInvoice.status,
        payments:
          payments.length,
        paidAmount:
          finalInvoice.paidAmount,
        auditCount,
        notifications,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
