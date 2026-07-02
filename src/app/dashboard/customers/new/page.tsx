import Link from "next/link";

import CustomerForm from "@/components/dashboard/CustomerForm";

export const dynamic = "force-dynamic";

export default function NewCustomerPage() {
  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <Link
            href="/dashboard/customers"
            className="text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
          >
            ← Wróć do klientów
          </Link>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS CRM / Customers
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
            Dodaj klienta
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Ręczne dodawanie klienta do bazy CRM.
          </p>
        </div>

        <CustomerForm mode="create" />
      </section>
    </main>
  );
}