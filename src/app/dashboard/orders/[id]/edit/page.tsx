import { PrismaClient, ServiceType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Link from "next/link";
import { notFound } from "next/navigation";

import OrderForm from "@/components/dashboard/OrderForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const globalForPrisma = globalThis as unknown as {
  hexaPrisma?: PrismaClient;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
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

function serializeOrder(order: {
  id: string;
  customerId: string | null;
  orderNumber: string;
  status: string;
  title: string | null;
  description: string | null;
  serviceType: string;
  scheduledStart: Date | null;
  currency: string;
  estimatedPrice: unknown;
  finalPrice: unknown;
}) {
  return {
    id: order.id,
    customerId: order.customerId,
    orderNumber: order.orderNumber,
    status: order.status,
    title: order.title,
    description: order.description,
    serviceType: order.serviceType,
    scheduledStart: order.scheduledStart
      ? order.scheduledStart.toISOString()
      : null,
    currency: order.currency,
    estimatedPrice:
      order.estimatedPrice === null || order.estimatedPrice === undefined
        ? ""
        : String(order.estimatedPrice),
    finalPrice:
      order.finalPrice === null || order.finalPrice === undefined
        ? ""
        : String(order.finalPrice),
  };
}

export default async function EditOrderPage({ params }: PageProps) {
  const { id } = await params;
  const prisma = getPrisma();

  const [order, customers] = await Promise.all([
    prisma.order.findUnique({
      where: {
        id,
      },
    }),
    prisma.customer.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
    }),
  ]);

  if (!order) {
    notFound();
  }

  const customerOptions = customers.map((customer) => ({
    id: customer.id,
    label: customerLabel(customer),
  }));

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
          >
            ← Zurück zum Auftrag
          </Link>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM / Orders
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
            Auftrag bearbeiten
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Kunden-, Service-, Termin-, Beschreibungs- und Auftragsbetragsdaten anpassen. Der Workflow-Status wird automatisch verwaltet.
          </p>
        </div>

        <OrderForm
          mode="edit"
          order={serializeOrder(order)}
          customers={customerOptions}
serviceTypes={Object.values(ServiceType)}
        />
      </section>
    </main>
  );
}