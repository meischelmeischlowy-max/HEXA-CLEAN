"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function DashboardLoginPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/dashboard/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error("Nieprawidłowe hasło albo błąd logowania.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Nieznany błąd logowania."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
      <section className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
          HEXA OS
        </p>

        <h1 className="mt-4 text-3xl font-bold">Logowanie właściciela</h1>

        <p className="mt-3 text-sm text-neutral-400">
          Dostęp tylko do panelu CRM / Dashboard właściciela.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm text-neutral-300">Hasło</label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
              placeholder="Wpisz hasło"
              autoComplete="current-password"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-neutral-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logowanie..." : "Zaloguj do dashboardu"}
          </button>
        </form>

        <p className="mt-6 text-xs text-neutral-500">
          Przed produkcją można później zamienić to na pełne konto użytkownika,
          ale na tym etapie hasło chroni panel właściciela.
        </p>
      </section>
    </main>
  );
}