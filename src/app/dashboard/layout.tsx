import Link from "next/link";

const navItems = [
  { label: "Overview", href: "/dashboard" },
  { label: "Klienci", href: "/dashboard/customers" },
  { label: "Zlecenia", href: "/dashboard/orders" },
  { label: "Oferty", href: "/dashboard/quotes" },
  { label: "Faktury", href: "/dashboard/invoices" },
  { label: "Płatności", href: "/dashboard/payments" },
  { label: "Powiadomienia", href: "/dashboard/notifications" },
  { label: "Załączniki", href: "/dashboard/attachments" },
  { label: "Audit Logi", href: "/dashboard/audit-logs" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white lg:flex">
      <aside className="border-b border-neutral-800 bg-neutral-950/95 p-4 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
            HEXA OS
          </p>

          <h2 className="mt-3 text-2xl font-bold">Owner Panel</h2>

          <p className="mt-2 text-sm text-neutral-500">
            CRM, zlecenia, faktury, płatności i historia systemu.
          </p>
        </div>

        <nav className="mt-6 grid gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-300 transition hover:border-cyan-500 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 rounded-xl border border-yellow-800/60 bg-yellow-950/30 p-4 text-xs text-yellow-200">
          Brak logowania — przed produkcją dashboard musi być zabezpieczony.
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}