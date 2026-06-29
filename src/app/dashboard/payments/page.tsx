"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Payment = {
  id: string;
  invoiceId?: string | null;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  method?: string | null;
  provider?: string | null;
  transactionId?: string | null;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardPaymentsResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    payments: Payment[];
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

export default function DashboardPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPayments() {
      try {
        const response = await fetch("/api/dashboard/payments", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Dashboard Payments API returned an error");
        }

        const json: DashboardPaymentsResponse = await response.json();

        setPayments(json.data.payments ?? []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown payments error"
        );
      } finally {
        setLoading(false);
      }
    }

    loadPayments();
  }, []);

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">Płatności</h1>

          <p className="mt-3 max-w-2xl text-neutral-400">
            Lista płatności zapisanych w bazie HEXA OS.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            Ładowanie płatności...
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
              <h2 className="text-xl font-semibold">Lista płatności</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Liczba rekordów: {payments.length}
              </p>
            </div>

            {payments.length === 0 ? (
              <div className="p-6 text-neutral-500">
                Brak płatności w bazie.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="border-b border-neutral-800 text-neutral-400">
                    <tr>
                      <th className="p-4 font-medium">Płatność</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Kwota</th>
                      <th className="p-4 font-medium">Metoda</th>
                      <th className="p-4 font-medium">Provider</th>
                      <th className="p-4 font-medium">Transakcja</th>
                      <th className="p-4 font-medium">Zapłacono</th>
                      <th className="p-4 font-medium">Dodano</th>
                      <th className="p-4 font-medium">Akcja</th>
                    </tr>
                  </thead>

                  <tbody>
                    {payments.map((payment) => {
                      const currency = payment.currency ?? "CHF";

                      return (
                        <tr
                          key={payment.id}
                          className="border-b border-neutral-800 last:border-b-0"
                        >
                          <td className="max-w-[220px] truncate p-4 font-medium text-white">
                            {payment.id}
                          </td>

                          <td className="p-4 text-neutral-300">
                            {payment.status ?? "—"}
                          </td>

                          <td className="p-4 font-medium text-white">
                            {formatMoney(payment.amount, currency)}
                          </td>

                          <td className="p-4 text-neutral-300">
                            {payment.method ?? "—"}
                          </td>

                          <td className="p-4 text-neutral-300">
                            {payment.provider ?? "—"}
                          </td>

                          <td className="p-4 text-neutral-300">
                            {payment.transactionId ?? "—"}
                          </td>

                          <td className="p-4 text-neutral-400">
                            {formatDate(payment.paidAt)}
                          </td>

                          <td className="p-4 text-neutral-400">
                            {formatDate(payment.createdAt)}
                          </td>

                          <td className="p-4">
                            <Link
                              href={`/dashboard/payments/${payment.id}`}
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