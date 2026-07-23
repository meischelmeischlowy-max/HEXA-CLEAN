const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.production.local", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const base = process.argv[2] || "https://www.hexaclean.ch";
const dashboardPassword = process.env.DASHBOARD_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;
const testEmail = String(process.env.HEXA_TEST_CUSTOMER_EMAIL || "")
  .trim()
  .toLowerCase();

const TEST_SLOT_NOTE = "E22 production workflow test";
const TENANT_KEY = "hexa-clean";

if (!dashboardPassword || !databaseUrl || !testEmail) {
  throw new Error(
    "Brak DASHBOARD_PASSWORD, DATABASE_URL lub HEXA_TEST_CUSTOMER_EMAIL.",
  );
}

const db = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: databaseUrl,
  }),
  transactionOptions: {
    maxWait: 10000,
    timeout: 60000,
  },
});

const suffix =
  Date.now().toString() +
  "-" +
  Math.random().toString(16).slice(2);

let dashboardCookie = "";
let customerId = null;
let orderId = null;
let slotId = null;

function ids(rows) {
  return rows.map((row) => row.id).filter(Boolean);
}

function parseResponseBody(raw) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function extractSessionCookie(response) {
  const setCookie =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);

  const cookie = setCookie
    .map((value) => String(value).split(";")[0])
    .find((value) => value.includes("="));

  if (!cookie) {
    throw new Error("Dashboard login nie zwróci session cookie.");
  }

  return cookie;
}

async function loginDashboard() {
  const response = await fetch(base + "/api/dashboard/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "198.51.100.77",
      "user-agent": "Hexa-E22-Workflow-" + suffix,
      "accept-language": "de-CH",
    },
    body: JSON.stringify({
      password: dashboardPassword,
    }),
  });

  const raw = await response.text();

  console.log(
    "DASHBOARD LOGIN -> HTTP " +
      response.status,
  );

  if (response.status !== 200) {
    throw new Error(
      "Dashboard login failed: HTTP " +
        response.status +
        ": " +
        raw.slice(0, 500),
    );
  }

  const data = parseResponseBody(raw);

  if (data?.authenticated !== true) {
    throw new Error(
      "Dashboard login nie potwierdzi authenticated=true.",
    );
  }

  dashboardCookie = extractSessionCookie(response);

  console.log(
    "DASHBOARD SESSION -> COOKIE RECEIVED",
  );
}

async function api(
  name,
  endpoint,
  expectedStatus,
  body,
  auth = true,
) {
  const response = await fetch(base + endpoint, {
    method: "POST",
    headers: {
      ...(auth && dashboardCookie
        ? {
            cookie: dashboardCookie,
          }
        : {}),
      ...(body === undefined
        ? {}
        : {
            "content-type": "application/json",
          }),
      ...(!auth
        ? {
            "x-forwarded-for": "198.51.100.88",
            "user-agent": "Hexa-E22-Public-" + suffix,
            "accept-language": "de-CH",
          }
        : {}),
    },
    body:
      body === undefined
        ? undefined
        : JSON.stringify(body),
  });

  const raw = await response.text();
  const data = parseResponseBody(raw);

  console.log(
    name +
      " -> HTTP " +
      response.status,
  );

  if (response.status !== expectedStatus) {
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

async function removeOrphanTestSlots() {
  const removed =
    await db.availabilitySlot.deleteMany({
      where: {
        notes: {
          in: [
            TEST_SLOT_NOTE,
            "E17.6B+C production test",
          ],
        },
        orderId: null,
      },
    });

  console.log(
    "ORPHAN TEST SLOTS REMOVED -> " +
      removed.count,
  );
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
    "e22_previous_test_" +
      new Date()
        .toISOString()
        .replace(/[:.]/g, "-") +
      ".json",
  );

  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
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

  await db.$transaction(async (tx) => {
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
        OR: [
          {
            customerId: {
              in: customerIds,
            },
          },
          {
            quoteId: {
              in: quoteIds,
            },
          },
        ],
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
  });

  console.log(
    "PREVIOUS TEST DATA CLEANUP -> OK",
  );

  console.log(
    "BACKUP -> " + backupPath,
  );
}

function buildUniqueSlotStart() {
  const startAt = new Date(
    Date.now() +
      3 * 24 * 60 * 60 * 1000,
  );

  startAt.setUTCHours(
    9,
    new Date().getUTCMinutes(),
    new Date().getUTCSeconds(),
    0,
  );

  return startAt;
}

async function main() {
  await backupAndCleanPreviousTestData();
  await removeOrphanTestSlots();

  const customer =
    await db.customer.create({
      data: {
        type: "PRIVATE",
        firstName: "E22",
        lastName: "Production Test",
        email: testEmail,
        notes:
          "automated-e22-" +
          suffix,
      },
    });

  customerId = customer.id;

  const order =
    await db.order.create({
      data: {
        orderNumber:
          "E22-" + suffix,
        customerId,
        serviceType:
          "REINIGUNG",
        title:
          "E22 Produktionsworkflow",
        status: "NEW",
        estimatedPrice:
          "100.00",
        finalPrice:
          "100.00",
        currency: "CHF",
      },
    });

  orderId = order.id;

  const startAt =
    buildUniqueSlotStart();

  const endAt = new Date(
    startAt.getTime() +
      2 * 60 * 60 * 1000,
  );

  const slot =
    await db.availabilitySlot.create({
      data: {
        tenantKey:
          TENANT_KEY,
        startAt,
        endAt,
        status:
          "AVAILABLE",
        notes:
          TEST_SLOT_NOTE,
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

  await loginDashboard();

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
      subtotal: "100.00",
      taxRate: "0.00",
      taxAmount: "0.00",
      total: "100.00",
      items: [
        {
          name:
            "Grundreinigung Testauftrag",
          description:
            "Automatisierte Produktionsprüfung E22",
          quantity:
            "1.00",
          unitPrice:
            "100.00",
          subtotal:
            "100.00",
          taxRate:
            "0.00",
          taxAmount:
            "0.00",
          discountAmount:
            "0.00",
          total:
            "100.00",
          category:
            "REINIGUNG",
          unit:
            "PAUSCHALE",
          sortOrder:
            0,
        },
      ],
      status: "DRAFT",
      sentAt: null,
      validUntil: new Date(
        Date.now() +
          7 * 24 * 60 * 60 * 1000,
      ),
    },
  });

  console.log(
    "QUOTE TEST ITEM -> CREATED",
  );

  const linkResponse = await api(
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

  const publicOfferLinkId =
    linkResponse?.publicOfferLinkId;

  if (!publicOfferLinkId) {
    throw new Error(
      "Endpoint nie zwróci publicOfferLinkId.",
    );
  }

  const testToken =
    crypto.randomBytes(32)
      .toString("base64url");

  const testTokenHash =
    crypto.createHash("sha256")
      .update(testToken, "utf8")
      .digest("hex");

  const testTokenPrefix =
    testToken.slice(0, 8);

  await db.publicOfferLink.update({
    where: {
      id:
        publicOfferLinkId,
    },
    data: {
      tokenHash:
        testTokenHash,
      tokenPrefix:
        testTokenPrefix,
    },
  });

  console.log(
    "TEST TOKEN BRIDGE -> CREATED",
  );

  await api(
    "ACCEPT OFFER WITH SLOT",
    "/api/public/offers/" +
      encodeURIComponent(testToken) +
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
    acceptedQuote?.status !== "ACCEPTED" ||
    !acceptedQuote.acceptedAt ||
    scheduledOrder?.status !== "SCHEDULED" ||
    !scheduledOrder.scheduledStart ||
    !scheduledOrder.scheduledEnd ||
    bookedSlot?.status !== "BOOKED" ||
    bookedSlot.orderId !== order.id
  ) {
    throw new Error(
      "Akceptacja i rezerwacja terminu nie przeszy.",
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

  if (complete.updated !== true) {
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

  if (completeAgain.updated !== false) {
    throw new Error(
      "Order completion idempotency failed.",
    );
  }

  const invoice =
    await db.invoice.findFirst({
      where: {
        quoteId: quote.id,
      },
    });

  if (!invoice) {
    throw new Error(
      "Automatyczna faktura nie powstaa.",
    );
  }

  console.log(
    "AUTO INVOICE -> OK",
  );

  const invoiceItems =
    await db.invoiceItem.findMany({
      where: {
        invoiceId:
          invoice.id,
      },
    });

  console.log(
    "INVOICE ITEMS -> " +
      invoiceItems.length,
  );

  if (invoiceItems.length !== 1) {
    throw new Error(
      "INVOICE_HAS_NO_ITEMS lub nieprawidowa liczba pozycji faktury: " +
        invoiceItems.length,
    );
  }

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
        "E22-P1-" + suffix,
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
        "E22-P2-" + suffix,
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
    db.publicOfferLink.findUnique({
      where: {
        id:
          publicOfferLinkId,
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
    finalQuote?.status !== "ACCEPTED" ||
    finalOrder?.status !== "COMPLETED" ||
    finalInvoice?.status !== "PAID" ||
    Number(finalInvoice.paidAmount) !== 100 ||
    payments.length !== 2 ||
    paymentTotal !== 100 ||
    !publicLink?.acceptedAt ||
    auditCount < 5
  ) {
    throw new Error(
      "Kocowa weryfikacja E22 nie przesza.",
    );
  }

  console.log(
    JSON.stringify(
      {
        result:
          "E22 PRODUCTION WORKFLOW: SUCCESS",
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
        invoiceItems:
          invoiceItems.length,
        payments:
          payments.length,
        paidAmount:
          finalInvoice.paidAmount,
        auditCount,
        notifications,
        rawTokenStored:
          false,
        fullPublicUrlStored:
          false,
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

