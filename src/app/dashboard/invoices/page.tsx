"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Invoice = {
  id: string;
  invoiceNumber?: string | null;
  number?: string | null;
  status?: string | null;
  subtotal?: string | number | null;
  taxAmount?: string | number | null;
  total?: string | number | null;
  paidAmount?: string | number | null;
  currency?: string | null;
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardInvoicesResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    invoices: Invoice[];
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

function formatMoney(value?: string | number | null, currency = "CHF") {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${String(value)} ${currency}`;
}

function getInvoiceNumber(invoice: Invoice) {
  return invoice.invoiceNumber ?? invoice.number ?? invoice.id;
}

export default function DashboardInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const response = await fetch("/api/dashboard/invoices", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Dashboard Invoices API returned an error");
        }

        const json: DashboardInvoicesResponse = await response.json();

        setInvoices(json.data.invoices ?? []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown invoices error"
        );
      } finally {
        setLoading(false);
      }
    }

    loadInvoices();
  }, []);

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">Faktury</h1>

          <p className="mt-3 max-w-2xl text-neutral-400">
            Lista faktur zapisanych w bazie HEXA OS.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            Ładowanie faktur...
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
              <h2 className="text-xl font-semibold">Lista faktur</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Liczba rekordów: {invoices.length}
              </p>
            </div>

            {invoices.length === 0 ? (
              <div className="p-6 text-neutral-500">Brak faktur w bazie.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="border-b border-neutral-800 text-neutral-400">
                    <tr>
                      <th className="p-4 font-medium">Faktura</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Subtotal</th>
                      <th className="p-4 font-medium">VAT</th>
                      <th className="p-4 font-medium">Total</th>
                      <th className="p-4 font-medium">Zapłacono</th>
                      <th className="p-4 font-medium">Termin</th>
                      <th className="p-4 font-medium">Dodano</th>
                      <th className="p-4 font-medium">Akcja</th>
                    </tr>
                  </thead>

                  <tbody>
                    {invoices.map((invoice) => {
                      const currency = invoice.currency ?? "CHF";

                      return (
                        <tr
                          key={invoice.id}
                          className="border-b border-neutral-800 last:border-b-0"
                        >
                          <td className="p-4 font-medium text-white">
                            {getInvoiceNumber(invoice)}
                          </td>

                          <td className="p-4 text-neutral-300">
                            {invoice.status ?? "—"}
                          </td>

                          <td className="p-4 text-neutral-300">
                            {formatMoney(invoice.subtotal, currency)}
                          </td>

                          <td className="p-4 text-neutral-300">
                            {formatMoney(invoice.taxAmount, currency)}
                          </td>

                          <td className="p-4 font-medium text-white">
                            {formatMoney(invoice.total, currency)}
                          </td>

                          <td className="p-4 text-neutral-300">
                            {formatMoney(invoice.paidAmount, currency)}
                          </td>

                          <td className="p-4 text-neutral-400">
                            {formatDate(invoice.dueDate)}
                          </td>

                          <td className="p-4 text-neutral-400">
                            {formatDate(invoice.createdAt)}
                          </td>

                          <td className="p-4">
                            <Link
                              href={`/dashboard/invoices/${invoice.id}`}
                              className="rounded-xl border border-cyan-700 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400 hover:text-white"
                            >
                              Szczegóły
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
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