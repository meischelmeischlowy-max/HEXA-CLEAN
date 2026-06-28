"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function DashboardLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/dashboard/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      setError("Błędne hasło.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-8"
      >
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">
          HEXA OS
        </p>

        <h1 className="mt-4 text-3xl font-bold">Logowanie właściciela</h1>

        <p className="mt-3 text-sm text-neutral-400">
          Wpisz hasło do panelu dashboard.
        </p>

        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-6 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-cyan-500"
          placeholder="Hasło"
        />

        {error && (
          <div className="mt-4 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="mt-6 w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-neutral-950 hover:bg-cyan-400"
        >
          Zaloguj
        </button>
      </form>
    </main>
  );
}