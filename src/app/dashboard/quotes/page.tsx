"use client";

import { useEffect, useState } from "react";

type Quote = {
  id: string;
  quoteNumber?: string | null;
  status?: string | null;
  subtotal?: string | number | null;
  taxAmount?: string | number | null;
  total?: string | number | null;
  currency?: string | null;
  validUntil?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardQuotesResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    quotes: Quote[];
  };
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function DashboardQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuotes() {
      try {
        const response = await fetch("/api/dashboard/quotes", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Dashboard Quotes API returned an error");
        }

        const json: DashboardQuotesResponse = await response.json();

        setQuotes(json.data.quotes);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown quotes error"
        );
      } finally {
        setLoading(false);
      }
    }

    loadQuotes();
  }, []);

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">Oferty</h1>

          <p className="mt-3 max-w-2xl text-neutral-400">
            Lista ofert i wycen zapisanych w bazie HEXA OS.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            Ładowanie ofert...
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-800 bg-red-950/40 p-6 text-red-200">
            Błąd: {errorMessage}
          </div>
        )}

        {!loading && !errorMessage && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900">
            <div className="border-b border-neutral-800 p-5">
              <h2 className="text-xl font-semibold">Lista ofert</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Liczba rekordów: {quotes.length}
              </p>
            </div>

            {quotes.length === 0 ? (
              <div className="p-6 text-neutral-500">Brak ofert w bazie.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-neutral-800 text-neutral-400">
                    <tr>
                      <th className="p-4 font-medium">Oferta</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Subtotal</th>
                      <th className="p-4 font-medium">VAT</th>
                      <th className="p-4 font-medium">Total</th>
                      <th className="p-4 font-medium">Dodano</th>
                    </tr>
                  </thead>

                  <tbody>
                    {quotes.map((quote) => (
                      <tr
                        key={quote.id}
                        className="border-b border-neutral-800 last:border-b-0"
                      >
                        <td className="p-4 font-medium text-white">
                          {quote.quoteNumber ?? quote.id}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {quote.status ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {quote.subtotal
                            ? `${String(quote.subtotal)} ${
                                quote.currency ?? "CHF"
                              }`
                            : "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {quote.taxAmount
                            ? `${String(quote.taxAmount)} ${
                                quote.currency ?? "CHF"
                              }`
                            : "—"}
                        </td>

                        <td className="p-4 font-medium text-white">
                          {quote.total
                            ? `${String(quote.total)} ${
                                quote.currency ?? "CHF"
                              }`
                            : "—"}
                        </td>

                        <td className="p-4 text-neutral-400">
                          {formatDate(quote.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}