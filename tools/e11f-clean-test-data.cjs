const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function ids(rows) {
  return rows.map((row) => row.id);
}

function serialize(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, currentValue) => {
      if (typeof currentValue === "bigint") {
        return currentValue.toString();
      }

      return currentValue;
    }),
  );
}

function printSection(title, value) {
  console.log("");
  console.log("=".repeat(70));
  console.log(title);
  console.log("=".repeat(70));
  console.log(JSON.stringify(serialize(value), null, 2));
}

loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"));

async function main() {
  const targetEmail = String(process.argv[2] || "")
    .trim()
    .toLowerCase();

  if (!targetEmail) {
    throw new Error("Brak adresu e-mail do wyczyszczenia.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL missing in .env or .env.local",
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
    transactionOptions: {
      maxWait: 10000,
      timeout: 60000,
    },
  });

  try {
    console.log("=".repeat(70));
    console.log("HEXA CLEAN — E11F CLEAN TEST DATA");
    console.log(`E-mail: ${targetEmail}`);
    console.log("=".repeat(70));

    const customers = await prisma.customer.findMany({
      where: {
        email: {
          equals: targetEmail,
          mode: "insensitive",
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const customerIds = unique(ids(customers));

    if (customerIds.length === 0) {
      console.log("");
      console.log(
        "BRAK DANYCH: nie znaleziono klienta z tym adresem e-mail.",
      );
      console.log("Nic nie zostao usunite.");
      return;
    }

    const sessions = await prisma.session.findMany({
      where: {
        customerId: {
          in: customerIds,
        },
      },
    });

    const orders = await prisma.order.findMany({
      where: {
        customerId: {
          in: customerIds,
        },
      },
    });

    const sessionIds = unique(ids(sessions));
    const orderIds = unique(ids(orders));

    const estimates = await prisma.estimate.findMany({
      where: {
        OR: [
          {
            customerId: {
              in: customerIds,
            },
          },
          {
            orderId: {
              in: orderIds,
            },
          },
          {
            sessionId: {
              in: sessionIds,
            },
          },
        ],
      },
    });

    const estimateIds = unique(ids(estimates));

    const quotes = await prisma.quote.findMany({
      where: {
        OR: [
          {
            customerId: {
              in: customerIds,
            },
          },
          {
            orderId: {
              in: orderIds,
            },
          },
          {
            sessionId: {
              in: sessionIds,
            },
          },
        ],
      },
    });

    const quoteIds = unique(ids(quotes));

    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          {
            customerId: {
              in: customerIds,
            },
          },
          {
            orderId: {
              in: orderIds,
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

    const invoiceIds = unique(ids(invoices));

    const [
      conversationMessages,
      estimateItems,
      publicOfferLinks,
      invoiceItems,
      payments,
      notifications,
      attachments,
      auditLogs,
    ] = await Promise.all([
      prisma.conversationMessage.findMany({
        where: {
          OR: [
            {
              customerId: {
                in: customerIds,
              },
            },
            {
              sessionId: {
                in: sessionIds,
              },
            },
          ],
        },
      }),

      prisma.estimateItem.findMany({
        where: {
          estimateId: {
            in: estimateIds,
          },
        },
      }),

      prisma.publicOfferLink.findMany({
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
      }),

      prisma.invoiceItem.findMany({
        where: {
          invoiceId: {
            in: invoiceIds,
          },
        },
      }),

      prisma.payment.findMany({
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
      }),

      prisma.notification.findMany({
        where: {
          OR: [
            {
              customerId: {
                in: customerIds,
              },
            },
            {
              orderId: {
                in: orderIds,
              },
            },
            {
              estimateId: {
                in: estimateIds,
              },
            },
            {
              sessionId: {
                in: sessionIds,
              },
            },
          ],
        },
      }),

      prisma.attachment.findMany({
        where: {
          OR: [
            {
              customerId: {
                in: customerIds,
              },
            },
            {
              orderId: {
                in: orderIds,
              },
            },
            {
              estimateId: {
                in: estimateIds,
              },
            },
            {
              sessionId: {
                in: sessionIds,
              },
            },
            {
              quoteId: {
                in: quoteIds,
              },
            },
            {
              invoiceId: {
                in: invoiceIds,
              },
            },
          ],
        },
      }),

      prisma.auditLog.findMany({
        where: {
          OR: [
            {
              customerId: {
                in: customerIds,
              },
            },
            {
              orderId: {
                in: orderIds,
              },
            },
            {
              estimateId: {
                in: estimateIds,
              },
            },
            {
              sessionId: {
                in: sessionIds,
              },
            },
          ],
        },
      }),
    ]);

    const targeted = {
      customers,
      sessions,
      conversationMessages,
      orders,
      estimates,
      estimateItems,
      quotes,
      publicOfferLinks,
      invoices,
      invoiceItems,
      payments,
      notifications,
      attachments,
      auditLogs,
    };

    const targetedCounts = Object.fromEntries(
      Object.entries(targeted).map(([name, records]) => [
        name,
        records.length,
      ]),
    );

    printSection("REKORDY PRZEZNACZONE DO USUNICIA", {
      targetEmail,
      targetedCounts,
      customers: customers.map((customer) => ({
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        companyName: customer.companyName,
        email: customer.email,
        createdAt: customer.createdAt,
      })),
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      })),
      estimates: estimates.map((estimate) => ({
        id: estimate.id,
        estimateNumber: estimate.estimateNumber,
        status: estimate.status,
      })),
      quotes: quotes.map((quote) => ({
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        status: quote.status,
      })),
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
      })),
    });

    const backupDirectory = path.join(
      process.cwd(),
      "reports",
      "cleanup-backups",
    );

    fs.mkdirSync(backupDirectory, {
      recursive: true,
    });

    const backupPath = path.join(
      backupDirectory,
      `e11f_${targetEmail.replace(
        /[^a-z0-9]+/gi,
        "_",
      )}_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`,
    );

    fs.writeFileSync(
      backupPath,
      JSON.stringify(
        serialize({
          createdAt: new Date().toISOString(),
          reason: "E11F controlled cleanup before fresh E2E",
          targetEmail,
          targetedCounts,
          targeted,
        }),
        null,
        2,
      ),
      "utf8",
    );

    console.log("");
    console.log(`BACKUP JSON: ${backupPath}`);

    const deleted = await prisma.$transaction(
      async (tx) => {
        const result = {};

        result.payments = (
          await tx.payment.deleteMany({
            where: {
              id: {
                in: ids(payments),
              },
            },
          })
        ).count;

        result.invoiceItems = (
          await tx.invoiceItem.deleteMany({
            where: {
              id: {
                in: ids(invoiceItems),
              },
            },
          })
        ).count;

        result.publicOfferLinks = (
          await tx.publicOfferLink.deleteMany({
            where: {
              id: {
                in: ids(publicOfferLinks),
              },
            },
          })
        ).count;

        result.attachments = (
          await tx.attachment.deleteMany({
            where: {
              id: {
                in: ids(attachments),
              },
            },
          })
        ).count;

        result.notifications = (
          await tx.notification.deleteMany({
            where: {
              id: {
                in: ids(notifications),
              },
            },
          })
        ).count;

        result.auditLogs = (
          await tx.auditLog.deleteMany({
            where: {
              id: {
                in: ids(auditLogs),
              },
            },
          })
        ).count;

        result.conversationMessages = (
          await tx.conversationMessage.deleteMany({
            where: {
              id: {
                in: ids(conversationMessages),
              },
            },
          })
        ).count;

        result.invoices = (
          await tx.invoice.deleteMany({
            where: {
              id: {
                in: invoiceIds,
              },
            },
          })
        ).count;

        result.quotes = (
          await tx.quote.deleteMany({
            where: {
              id: {
                in: quoteIds,
              },
            },
          })
        ).count;

        result.estimateItems = (
          await tx.estimateItem.deleteMany({
            where: {
              id: {
                in: ids(estimateItems),
              },
            },
          })
        ).count;

        result.estimates = (
          await tx.estimate.deleteMany({
            where: {
              id: {
                in: estimateIds,
              },
            },
          })
        ).count;

        result.orders = (
          await tx.order.deleteMany({
            where: {
              id: {
                in: orderIds,
              },
            },
          })
        ).count;

        result.sessions = (
          await tx.session.deleteMany({
            where: {
              id: {
                in: sessionIds,
              },
            },
          })
        ).count;

        result.customers = (
          await tx.customer.deleteMany({
            where: {
              id: {
                in: customerIds,
              },
            },
          })
        ).count;

        return result;
      },
      {
        maxWait: 10000,
        timeout: 60000,
      },
    );

    printSection("USUNITE REKORDY", deleted);

    const remainingCustomerCount =
      await prisma.customer.count({
        where: {
          email: {
            equals: targetEmail,
            mode: "insensitive",
          },
        },
      });

    const remainingRelatedCounts = {
      customers: remainingCustomerCount,
      sessions: await prisma.session.count({
        where: {
          id: {
            in: sessionIds,
          },
        },
      }),
      orders: await prisma.order.count({
        where: {
          id: {
            in: orderIds,
          },
        },
      }),
      estimates: await prisma.estimate.count({
        where: {
          id: {
            in: estimateIds,
          },
        },
      }),
      quotes: await prisma.quote.count({
        where: {
          id: {
            in: quoteIds,
          },
        },
      }),
      invoices: await prisma.invoice.count({
        where: {
          id: {
            in: invoiceIds,
          },
        },
      }),
    };

    printSection(
      "KONTROLA PO USUNICIU",
      remainingRelatedCounts,
    );

    const remainingTotal = Object.values(
      remainingRelatedCounts,
    ).reduce((sum, count) => sum + count, 0);

    if (remainingTotal !== 0) {
      throw new Error(
        `Kontrola kocowa nieudana. Pozostao ${remainingTotal} gównych rekordów.`,
      );
    }

    console.log("");
    console.log("SUKCES E11F");
    console.log(
      "Klient i wszystkie wykryte rekordy powizane zostay usunite.",
    );
    console.log(
      "Mona rozpocz nowy test QuickOffer od zera.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("");
  console.error("BD E11F:");
  console.error(error);
  process.exit(1);
});
