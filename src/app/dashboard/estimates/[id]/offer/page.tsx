import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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

function formatMoney(value: unknown, currency = "CHF") {
  const number =
    typeof value === "object" && value !== null && "toString" in value
      ? Number(value.toString())
      : Number(value ?? 0);

  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(number);
}

function formatNumber(value: unknown) {
  const number =
    typeof value === "object" && value !== null && "toString" in value
      ? Number(value.toString())
      : Number(value ?? 0);

  return new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "—";
  }

  return value.toLocaleDateString("de-CH", {
    dateStyle: "medium",
  });
}

function customerName(customer: {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
} | null) {
  if (!customer) {
    return "—";
  }

  if (customer.companyName) {
    return customer.companyName;
  }

  return [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—";
}

function statusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    DRAFT: "Robocza",
    AI_REVIEW: "AI sprawdza",
    NEEDS_PHOTOS: "Potrzebne zdjęcia",
    NEEDS_HUMAN_REVIEW: "Do kontroli właściciela",
    READY_TO_SEND: "Gotowa do wysłania",
    SENT: "Wysłana",
    ACCEPTED: "Zaakceptowana",
    REJECTED: "Odrzucona",
    EXPIRED: "Wygasła",
  };

  if (!status) {
    return "—";
  }

  return labels[status] ?? status;
}

function metadataText(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  if (!(key in metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];

  if (typeof value !== "string") {
    return null;
  }

  return value;
}

function unitLabel(value: unknown, metadata: unknown) {
  const manualUnit = metadataText(metadata, "manualUnit");

  if (manualUnit) {
    return manualUnit;
  }

  if (typeof value !== "string") {
    return "—";
  }

  const labels: Record<string, string> = {
    HOUR: "h",
    HOURS: "h",
    PIECE: "szt.",
    PIECES: "szt.",
    M2: "m²",
    SQM: "m²",
    FLAT: "ryczałt",
    FIXED: "ryczałt",
    KM: "km",
  };

  return labels[value] ?? value;
}

export default async function DashboardEstimateOfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prisma = getPrisma();

  const estimate = await prisma.estimate.findUnique({
    where: {
      id,
    },
    include: {
      customer: true,
      items: {
        include: {
          serviceCatalogItem: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!estimate) {
    notFound();
  }

  const customerAddress = [
    estimate.customer?.street,
    [estimate.customer?.zipCode, estimate.customer?.city].filter(Boolean).join(" "),
    estimate.customer?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const serviceAddress = [
    estimate.serviceStreet,
    [estimate.serviceZipCode, estimate.serviceCity].filter(Boolean).join(" "),
    estimate.serviceCountry,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-neutral-200 px-4 py-8 text-neutral-950 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
          <Link
            href={`/dashboard/estimates/${estimate.id}`}
            className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            ← Wróć do szczegółów
          </Link>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.print();
              }
            }}
            className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-cyan-400"
          >
            Drukuj / zapisz PDF
          </button>
        </div>

        <article className="rounded-3xl bg-white p-8 shadow-2xl shadow-neutral-400/40 print:rounded-none print:p-10 print:shadow-none">
          <header className="flex flex-col gap-8 border-b border-neutral-200 pb-8 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50">
                <span className="text-4xl font-black text-cyan-600">H</span>
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight">
                HEXA CLEAN
              </h1>

              <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
                Oferta / wycena usługi sprzątania. Cena jest ważna po
                potwierdzeniu zakresu przez właściciela.
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Wycena
              </p>

              <h2 className="mt-2 text-2xl font-black">
                {estimate.estimateNumber}
              </h2>

              <p className="mt-3 text-sm text-neutral-500">
                Data: {formatDate(estimate.createdAt)}
              </p>

              <p className="mt-1 text-sm text-neutral-500">
                Status: {statusLabel(estimate.status)}
              </p>
            </div>
          </header>

          <section className="grid gap-6 border-b border-neutral-200 py-8 md:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Klient
              </p>

              <p className="mt-3 text-xl font-bold">
                {customerName(estimate.customer)}
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {estimate.customer?.email ? (
                  <>
                    Email: {estimate.customer.email}
                    <br />
                  </>
                ) : null}
                {estimate.customer?.phone ? (
                  <>
                    Tel.: {estimate.customer.phone}
                    <br />
                  </>
                ) : null}
                {customerAddress || "Brak adresu klienta"}
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Miejsce usługi
              </p>

              <p className="mt-3 text-xl font-bold">
                {estimate.serviceCity ?? estimate.customer?.city ?? "—"}
              </p>

              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {serviceAddress || customerAddress || "Brak adresu usługi"}
              </p>
            </div>
          </section>

          <section className="border-b border-neutral-200 py-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
              Zakres
            </p>

            <h2 className="mt-3 text-2xl font-black">
              {estimate.title ?? "Wycena usługi HEXA CLEAN"}
            </h2>

            <p className="mt-3 text-sm leading-6 text-neutral-600">
              {estimate.description ??
                estimate.notesCustomer ??
                "Zakres usługi zostanie potwierdzony przed wykonaniem zlecenia."}
            </p>
          </section>

          <section className="py-8">
            <div className="overflow-hidden rounded-2xl border border-neutral-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-neutral-100 text-xs uppercase tracking-[0.18em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-4">Pozycja</th>
                    <th className="px-4 py-4">Ilość</th>
                    <th className="px-4 py-4">Cena</th>
                    <th className="px-4 py-4 text-right">Razem</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-200">
                  {estimate.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4 align-top">
                        <p className="font-bold">{item.name}</p>
                        <p className="mt-1 text-xs leading-5 text-neutral-500">
                          {item.description ?? "—"}
                        </p>
                      </td>

                      <td className="px-4 py-4 align-top text-neutral-700">
                        {formatNumber(item.quantity)}{" "}
                        {unitLabel(item.unit, item.metadata)}
                      </td>

                      <td className="px-4 py-4 align-top text-neutral-700">
                        {formatMoney(item.unitPrice, estimate.currency)}
                      </td>

                      <td className="px-4 py-4 text-right align-top font-bold">
                        {formatMoney(item.total, estimate.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {estimate.items.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
                Brak pozycji wyceny.
              </div>
            ) : null}
          </section>

          <section className="grid gap-6 border-t border-neutral-200 pt-8 md:grid-cols-[1fr_340px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                Informacja dla klienta
              </p>

              <p className="mt-3 text-sm leading-6 text-neutral-600">
                {estimate.notesCustomer ??
                  "Cena orientacyjna. Ostateczna oferta po potwierdzeniu zakresu, terminu i ewentualnych zdjęć."}
              </p>

              <p className="mt-5 text-xs leading-5 text-neutral-400">
                Oferta została przygotowana w systemie HEXA OS CRM. Ten dokument
                nie jest fakturą.
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
              <div className="flex justify-between gap-4 border-b border-neutral-200 pb-3 text-sm">
                <span className="text-neutral-500">Subtotal</span>
                <span className="font-semibold">
                  {formatMoney(estimate.subtotal, estimate.currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-neutral-200 py-3 text-sm">
                <span className="text-neutral-500">Ryzyko / trudność</span>
                <span className="font-semibold">
                  {formatMoney(estimate.riskAmount, estimate.currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-neutral-200 py-3 text-sm">
                <span className="text-neutral-500">Dojazd</span>
                <span className="font-semibold">
                  {formatMoney(estimate.travelFee, estimate.currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-neutral-200 py-3 text-sm">
                <span className="text-neutral-500">Materiały</span>
                <span className="font-semibold">
                  {formatMoney(estimate.materialFee, estimate.currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-neutral-200 py-3 text-sm">
                <span className="text-neutral-500">Rabat</span>
                <span className="font-semibold">
                  - {formatMoney(estimate.discountAmount, estimate.currency)}
                </span>
              </div>

              <div className="flex justify-between gap-4 pt-5">
                <span className="text-lg font-black">Razem</span>
                <span className="text-2xl font-black text-cyan-700">
                  {formatMoney(estimate.total, estimate.currency)}
                </span>
              </div>
            </div>
          </section>

          <footer className="mt-10 border-t border-neutral-200 pt-6 text-xs leading-5 text-neutral-400">
            HEXA CLEAN · Oferta robocza · Wygenerowano z HEXA OS CRM ·{" "}
            {formatDate(new Date())}
          </footer>
        </article>
      </div>
    </main>
  );
}