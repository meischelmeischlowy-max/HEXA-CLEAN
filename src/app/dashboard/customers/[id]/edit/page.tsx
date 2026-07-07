import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Link from "next/link";
import { notFound } from "next/navigation";

import CustomerForm from "@/components/dashboard/CustomerForm";

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

export default async function EditCustomerPage({ params }: PageProps) {
  const { id } = await params;
  const prisma = getPrisma();

  const customer = await prisma.customer.findUnique({
    where: {
      id,
    },
  });

  if (!customer) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <Link
            href={`/dashboard/customers/${customer.id}`}
            className="text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
          >
            ← Zurück zum Kunden
          </Link>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM / Customers
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
            Kunde bearbeiten
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Kontakt-, Adressdaten und Notizen des Kunden bearbeiten.
          </p>
        </div>

        <CustomerForm mode="edit" customer={customer} />
      </section>
    </main>
  );
}