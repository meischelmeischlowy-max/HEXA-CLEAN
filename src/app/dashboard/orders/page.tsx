"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Order = {
  id: string;
  orderNumber?: string | null;
  status?: string | null;
  serviceType?: string | null;
  service?: string | null;
  city?: string | null;
  address?: string | null;
  total?: string | number | null;
  estimatedTotal?: string | number | null;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardOrdersResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    orders: Order[];
  };
};

function formatDate(value?: string) {
  if (!value) return "brak daty";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getOrderTitle(order: Order) {
  return order.orderNumber ?? order.serviceType ?? order.service ?? order.id;
}

function getOrderAmount(order: Order) {
  return order.total ?? order.estimatedTotal ?? null;
}

export default function DashboardOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch("/api/dashboard/orders", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Dashboard Orders API returned an error");
        }

        const json: DashboardOrdersResponse = await response.json();

        setOrders(json.data.orders ?? []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown orders error"
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">Zlecenia</h1>

          <p className="mt-3 max-w-2xl text-neutral-400">
            Lista zleceń zapisanych w bazie HEXA OS.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            Ładowanie zleceń...
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
              <h2 className="text-xl font-semibold">Lista zleceń</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Liczba rekordów: {orders.length}
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="p-6 text-neutral-500">Brak zleceń w bazie.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="border-b border-neutral-800 text-neutral-400">
                    <tr>
                      <th className="p-4 font-medium">Zlecenie</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Usługa</th>
                      <th className="p-4 font-medium">Miejsce</th>
                      <th className="p-4 font-medium">Kwota</th>
                      <th className="p-4 font-medium">Dodano</th>
                      <th className="p-4 font-medium">Akcja</th>
                    </tr>
                  </thead>

                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-neutral-800 last:border-b-0"
                      >
                        <td className="p-4 font-medium text-white">
                          {getOrderTitle(order)}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {order.status ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {order.serviceType ?? order.service ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {[order.address, order.city]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {getOrderAmount(order)
                            ? `${String(getOrderAmount(order))} CHF`
                            : "—"}
                        </td>

                        <td className="p-4 text-neutral-400">
                          {formatDate(order.createdAt)}
                        </td>

                        <td className="p-4">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="rounded-xl border border-cyan-700 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400 hover:text-white"
                          >
                            Szczegóły
                          </Link>
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