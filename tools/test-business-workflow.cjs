const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true });

const base = process.argv[2] || "http://localhost:3100";
const secret = process.env.DASHBOARD_AUTH_TOKEN;
const databaseUrl = process.env.DATABASE_URL;
if (!secret || secret.length < 32 || !databaseUrl) {
  throw new Error("Brak bezpiecznych zmiennych srodowiskowych D4.");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let customerId = null;

async function api(name, path, status, body, auth = true) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      ...(auth ? { authorization: `Bearer ${secret}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(!auth
        ? {
            "x-forwarded-for": "198.51.100.44",
            "user-agent": `Hexa-D4-${suffix}`,
            "accept-language": "de-CH",
          }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  console.log(`${name} -> HTTP ${response.status}`);
  if (response.status !== status) {
    throw new Error(`${name}: oczekiwano ${status}, otrzymano ${response.status}: ${raw.slice(0, 300)}`);
  }
  return data;
}

async function cleanup() {
  if (!customerId) return;
  const ids = (
    await db.invoice.findMany({ where: { customerId }, select: { id: true } })
  ).map((item) => item.id);
  await db.auditLog.deleteMany({ where: { customerId } });
  await db.notification.deleteMany({ where: { customerId } });
  await db.attachment.deleteMany({ where: { customerId } });
  await db.payment.deleteMany({
    where: { OR: [{ invoiceId: { in: ids } }, { order: { customerId } }] },
  });
  await db.invoice.deleteMany({ where: { customerId } });
  await db.publicOfferLink.deleteMany({ where: { customerId } });
  await db.quote.deleteMany({ where: { customerId } });
  await db.estimate.deleteMany({ where: { customerId } });
  await db.conversationMessage.deleteMany({ where: { customerId } });
  await db.order.deleteMany({ where: { customerId } });
  await db.session.deleteMany({ where: { customerId } });
  await db.customer.deleteMany({ where: { id: customerId } });
  const left = await db.customer.count({ where: { id: customerId } });
  console.log(`TEST DATA CLEANUP -> ${left === 0 ? "OK" : "ERROR"}`);
  if (left) throw new Error("Dane D4 nie zostaly usuniete.");
}

async function main() {
  try {
    const customer = await db.customer.create({
      data: {
        type: "PRIVATE",
        firstName: "D4",
        lastName: "Workflow Test",
        email: null,
        notes: `automated-d4-${suffix}`,
      },
    });
    customerId = customer.id;
    const order = await db.order.create({
      data: {
        orderNumber: `D4-${suffix}`,
        customerId,
        serviceType: "REINIGUNG",
        title: "Automatisierter Workflow-Test",
        status: "NEW",
        estimatedPrice: "100.00",
        currency: "CHF",
      },
    });
    console.log("TEST FIXTURE -> CREATED");

    await api("CREATE QUOTE", `/api/dashboard/orders/${order.id}/create-quote`, 201);
    await api("CREATE QUOTE IDEMPOTENT", `/api/dashboard/orders/${order.id}/create-quote`, 201);
    const quotes = await db.quote.findMany({ where: { orderId: order.id } });
    if (quotes.length !== 1) throw new Error(`Quote count: ${quotes.length}`);
    const quote = quotes[0];
    await db.quote.update({
      where: { id: quote.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        validUntil: new Date(Date.now() + 604800000),
      },
    });

    const link = await api(
      "CREATE PUBLIC LINK",
      `/api/dashboard/quotes/${quote.id}/public-link`,
      201,
      { expiresInDays: 7, revokeExisting: true },
    );
    const token = new URL(link.publicUrl).pathname.split("/").filter(Boolean).at(-1);
    if (!token) throw new Error("Brak tokenu oferty.");
    await api(
      "ACCEPT PUBLIC OFFER",
      `/api/public/offers/${encodeURIComponent(token)}/accept`,
      200,
      { confirmAcceptance: true },
      false,
    );
    const accepted = await db.quote.findUnique({ where: { id: quote.id } });
    if (accepted?.status !== "ACCEPTED" || !accepted.acceptedAt) {
      throw new Error("Oferta nie zostala zaakceptowana.");
    }

    const created = await api(
      "CREATE INVOICE",
      `/api/dashboard/quotes/${quote.id}/create-invoice`,
      201,
    );
    const invoiceId = created.invoiceId;
    const repeated = await api(
      "CREATE INVOICE IDEMPOTENT",
      `/api/dashboard/quotes/${quote.id}/create-invoice`,
      200,
    );
    if (repeated.created !== false) throw new Error("Invoice idempotency failed.");

    const partial = await api(
      "PARTIAL PAYMENT",
      `/api/dashboard/invoices/${invoiceId}/payments`,
      201,
      { amount: "40.00", method: "BANK_TRANSFER", externalRef: `D4-P1-${suffix}` },
    );
    if (partial.invoice.status !== "PARTIALLY_PAID") {
      throw new Error("Brak PARTIALLY_PAID.");
    }
    const full = await api(
      "FINAL PAYMENT",
      `/api/dashboard/invoices/${invoiceId}/payments`,
      201,
      { amount: "60.00", method: "BANK_TRANSFER", externalRef: `D4-P2-${suffix}` },
    );
    if (full.invoice.status !== "PAID") throw new Error("Brak PAID.");

    const done = await api(
      "COMPLETE ORDER",
      `/api/dashboard/orders/${order.id}/mark-completed`,
      200,
    );
    if (done.updated !== true) throw new Error("Order completion failed.");
    const doneAgain = await api(
      "COMPLETE ORDER IDEMPOTENT",
      `/api/dashboard/orders/${order.id}/mark-completed`,
      200,
    );
    if (doneAgain.updated !== false) throw new Error("Order idempotency failed.");

    const [q, invoice, finalOrder, payments, publicLink, audits] = await Promise.all([
      db.quote.findUnique({ where: { id: quote.id } }),
      db.invoice.findUnique({ where: { id: invoiceId } }),
      db.order.findUnique({ where: { id: order.id } }),
      db.payment.findMany({ where: { invoiceId } }),
      db.publicOfferLink.findFirst({ where: { quoteId: quote.id } }),
      db.auditLog.count({ where: { customerId } }),
    ]);
    const sum = payments.reduce((total, payment) => total + Number(payment.amount), 0);
    if (
      q?.status !== "ACCEPTED" ||
      invoice?.status !== "PAID" ||
      Number(invoice.paidAmount) !== 100 ||
      finalOrder?.status !== "COMPLETED" ||
      payments.length !== 2 ||
      sum !== 100 ||
      !publicLink?.acceptedAt ||
      audits < 5
    ) {
      throw new Error("Koncowa weryfikacja D4 nie przeszla.");
    }
    console.log(`FINAL DB STATE -> quote=ACCEPTED invoice=PAID order=COMPLETED payments=2 audits=${audits}`);
    console.log("D4 BUSINESS WORKFLOW: SUCCESS");
  } finally {
    await cleanup();
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
