"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CustomerFormData = {
  id?: string;
  type?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  zipCode?: string | null;
  city?: string | null;
  country?: string | null;
  notes?: string | null;
};

type CustomerFormProps = {
  mode: "create" | "edit";
  customer?: CustomerFormData | null;
};

function inputClass() {
  return "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400";
}

function labelClass() {
  return "mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-500";
}

function normalize(value?: string | null) {
  return String(value ?? "");
}

export default function CustomerForm({ mode, customer }: CustomerFormProps) {
  const router = useRouter();

  const [form, setForm] = useState({
    type: normalize(customer?.type) || "PRIVATE",
    firstName: normalize(customer?.firstName),
    lastName: normalize(customer?.lastName),
    companyName: normalize(customer?.companyName),
    email: normalize(customer?.email),
    phone: normalize(customer?.phone),
    street: normalize(customer?.street),
    zipCode: normalize(customer?.zipCode),
    city: normalize(customer?.city),
    country: normalize(customer?.country) || "CH",
    notes: normalize(customer?.notes),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function submitForm() {
    setLoading(true);
    setError(null);

    try {
      const endpoint =
        mode === "edit" && customer?.id
          ? `/api/dashboard/customers/${customer.id}`
          : "/api/dashboard/customers";

      const response = await fetch(endpoint, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || json?.message || `HTTP ${response.status}`);
      }

      const customerId = json?.data?.customer?.id || customer?.id;

      if (!customerId) {
        router.push("/dashboard/customers");
        router.refresh();
        return;
      }

      router.push(`/dashboard/customers/${customerId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Der Kunde konnte nicht gespeichert werden.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/10">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
          {mode === "create" ? "Neuer Kunde" : "Kunde bearbeiten"}
        </p>

        <h2 className="text-2xl font-black text-white">
          {mode === "create" ? "Kunde manuell anlegen" : "Kundendaten bearbeiten"}
        </h2>

        <p className="max-w-3xl text-sm leading-6 text-zinc-500">
          Erfassen Sie die Kundendaten. Diese Daten werden später für Aufträge,
          Angebote, Rechnungen, Zahlungen und Kommunikation verwendet.
        </p>
      </div>

      <div className="mt-6 grid gap-5">
        <div>
          <label className={labelClass()}>Kundentyp</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateField("type", "PRIVATE")}
              className={
                form.type === "PRIVATE"
                  ? "rounded-xl border border-cyan-400/50 bg-cyan-400/15 px-4 py-2 text-sm font-bold text-cyan-100"
                  : "rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/[0.06]"
              }
            >
              Privatkunde
            </button>

            <button
              type="button"
              onClick={() => updateField("type", "COMPANY")}
              className={
                form.type === "COMPANY"
                  ? "rounded-xl border border-cyan-400/50 bg-cyan-400/15 px-4 py-2 text-sm font-bold text-cyan-100"
                  : "rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/[0.06]"
              }
            >
              Firma
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass()}>Vorname</label>
            <input
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
              placeholder="z.B. Max"
              className={inputClass()}
            />
          </div>

          <div>
            <label className={labelClass()}>Nachname</label>
            <input
              value={form.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
              placeholder="z.B. Muster"
              className={inputClass()}
            />
          </div>
        </div>

        <div>
          <label className={labelClass()}>Firmenname</label>
          <input
            value={form.companyName}
            onChange={(event) => updateField("companyName", event.target.value)}
            placeholder="z.B. Muster Reinigung GmbH"
            className={inputClass()}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass()}>E-Mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="kunde@example.ch"
              className={inputClass()}
            />
          </div>

          <div>
            <label className={labelClass()}>Telefon</label>
            <input
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="+41 ..."
              className={inputClass()}
            />
          </div>
        </div>

        <div>
          <label className={labelClass()}>Strasse / Adressese</label>
          <input
            value={form.street}
            onChange={(event) => updateField("street", event.target.value)}
            placeholder="Strasse und Hausnummer"
            className={inputClass()}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className={labelClass()}>PLZ</label>
            <input
              value={form.zipCode}
              onChange={(event) => updateField("zipCode", event.target.value)}
              placeholder="z.B. 2502"
              className={inputClass()}
            />
          </div>

          <div>
            <label className={labelClass()}>Ort</label>
            <input
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              placeholder="z.B. Biel/Bienne"
              className={inputClass()}
            />
          </div>

          <div>
            <label className={labelClass()}>Land</label>
            <input
              value={form.country}
              onChange={(event) => updateField("country", event.target.value)}
              placeholder="CH"
              className={inputClass()}
            />
          </div>
        </div>

        <div>
          <label className={labelClass()}>Notizen</label>
          <textarea
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Hinweise zum Kunden, Zugang, Präferenzen, Kontaktverlauf..."
            rows={5}
            className={inputClass()}
          />
        </div>
      </div>

      {error ? (
        <p className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={submitForm}
          className="rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Speichern..."
            : mode === "create"
              ? "Kunde erstellen"
              : "Änderungen speichern"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => router.back()}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Abbrechen
        </button>
      </div>
    </section>
  );
}