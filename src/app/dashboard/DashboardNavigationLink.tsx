"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardNavigationLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description?: string;
}) {
  const pathname = usePathname();

  const isActive =
    href === "/dashboard"
      ? pathname === href
      : pathname === href ||
        pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`block rounded-2xl border px-3.5 py-2.5 transition ${
        isActive
          ? "border-cyan-300/50 bg-cyan-400/15 shadow-lg shadow-cyan-950/30"
          : "border-white/10 bg-white/[0.03] hover:border-cyan-400/40 hover:bg-cyan-400/10"
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            isActive
              ? "bg-cyan-300"
              : "bg-neutral-700"
          }`}
        />

        <span
          className={`text-sm font-bold ${
            isActive
              ? "text-cyan-50"
              : "text-white"
          }`}
        >
          {label}
        </span>
      </span>

      {description && isActive ? (
        <span
          className={`mt-1 block pl-4 text-xs leading-4 ${
            isActive
              ? "text-cyan-100/65"
              : "text-neutral-500"
          }`}
        >
          {description}
        </span>
      ) : null}
    </Link>
  );
}
