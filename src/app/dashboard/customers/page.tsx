"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Customer = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DashboardCustomersResponse = {
  layer: string;
  message: string;
  data: {
    status: string;
    message: string;
    customers: Customer[];
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

function getCustomerName(customer: Customer) {
  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    customer.name ||
    fullName ||
    customer.email ||
    customer.phone ||
    customer.id
  );
}

export default function DashboardCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const response = await fetch("/api/dashboard/customers", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Dashboard Customers API returned an error");
        }

        const json: DashboardCustomersResponse = await response.json();

        setCustomers(json.data.customers ?? []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown customers error"
        );
      } finally {
        setLoading(false);
      }
    }

    loadCustomers();
  }, []);

  return (
    <main className="min-h-screen px-6 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight">Klienci</h1>

          <p className="mt-3 max-w-2xl text-neutral-400">
            Lista klientów zapisanych w bazie HEXA OS.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            Ładowanie klientów...
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
              <h2 className="text-xl font-semibold">Baza klientów</h2>
              <p className="mt-1 text-sm text-neutral-400">
                Liczba rekordów: {customers.length}
              </p>
            </div>

            {customers.length === 0 ? (
              <div className="p-6 text-neutral-500">Brak klientów w bazie.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="border-b border-neutral-800 text-neutral-400">
                    <tr>
                      <th className="p-4 font-medium">Klient</th>
                      <th className="p-4 font-medium">Email</th>
                      <th className="p-4 font-medium">Telefon</th>
                      <th className="p-4 font-medium">Miasto</th>
                      <th className="p-4 font-medium">Dodano</th>
                      <th className="p-4 font-medium">Akcja</th>
                    </tr>
                  </thead>

                  <tbody>
                    {customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-b border-neutral-800 last:border-b-0"
                      >
                        <td className="p-4 font-medium text-white">
                          {getCustomerName(customer)}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {customer.email ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {customer.phone ?? "—"}
                        </td>

                        <td className="p-4 text-neutral-300">
                          {[customer.postalCode, customer.city]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </td>

                        <td className="p-4 text-neutral-400">
                          {formatDate(customer.createdAt)}
                        </td>

                        <td className="p-4">
                          <Link
                            href={`/dashboard/customers/${customer.id}`}
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