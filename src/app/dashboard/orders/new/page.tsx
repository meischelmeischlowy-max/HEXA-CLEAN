import { OrderStatus, PrismaClient, ServiceType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Link from "next/link";

import OrderForm from "@/components/dashboard/OrderForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

function getPrisma() {
  if (!globalForPrisma.hexaPrisma) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL is missing");
    }

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    globalForPrisma.hexaPrisma = new PrismaClient({
      adapter,
    });
  }

  return globalForPrisma.hexaPrisma;
}

function customerLabel(customer: {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    customer.companyName ||
    fullName ||
    customer.email ||
    customer.phone ||
    "Kunde ohne Namen"
  );
}

export default async function NewOrderPage() {
  const prisma = getPrisma();

  const customers = await prisma.customer.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 500,
  });

  const customerOptions = customers.map((customer) => ({
    id: customer.id,
    label: customerLabel(customer),
  }));

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <Link
            href="/dashboard/orders"
            className="text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
          >
            ← Zurück zu Aufträgen
          </Link>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM / Orders
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
            Auftrag anlegen
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Manuelle Erstellung eines Auftrags für einen Kunden aus der CRM-Datenbank.
          </p>
        </div>

        <OrderForm
          mode="create"
          customers={customerOptions}
          statuses={Object.values(OrderStatus)}
          serviceTypes={Object.values(ServiceType)}
        />
      </section>
    </main>
  );
}