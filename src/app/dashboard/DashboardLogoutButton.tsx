"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DashboardLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    await fetch("/api/dashboard/logout", {
      method: "POST",
    });

    router.push("/dashboard-login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="mt-6 w-full rounded-xl border border-red-800/70 bg-red-950/40 px-4 py-3 text-sm font-semibold text-red-200 transition hover:border-red-500 hover:bg-red-900/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Wylogowywanie..." : "Wyloguj"}
    </button>
  );
}