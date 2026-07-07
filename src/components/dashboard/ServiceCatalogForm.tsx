"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ServiceCatalogFormMode = "create" | "edit";

type ServiceCatalogFormInitial = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  category?: string;
  unit?: string;
  basePrice?: string;
  minPrice?: string;
  maxPrice?: string;
  defaultQuantity?: string;
  riskMultiplier?: string;
  isActive?: boolean;
  sortOrder?: string;
  notes?: string;
};

type ServiceCatalogFormProps = {
  mode: ServiceCatalogFormMode;
  categories: string[];
  units: string[];
  initialService?: ServiceCatalogFormInitial;
};

const categoryLabels: Record<string, string> = {
  REINIGUNG: "Reinigung",
  WOHNUNGSABGABE: "Wohnungsabgabe",
  FENSTERREINIGUNG: "Fensterreinigung",
  HAUSWARTUNG: "Hauswartung",
  KLEINREPARATUREN: "Kleinreparaturen",
  SPEZIALREINIGUNG: "Spezialreinigung",
  OTHER: "Andere",
};

const unitLabels: Record<string, string> = {
  FLAT: "Pauschal",
  HOUR: "Stunde",
  M2: "m²",
  WINDOW: "Fenster",
  PIECE: "Stück",
  CUSTOM: "Manuell",
};

function ButtonOption({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
        active
          ? "border-cyan-400 bg-cyan-500/15 text-cyan-100"
          : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-cyan-500/60 hover:text-cyan-100"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "md:col-span-2" : ""}>
      <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-400";

export default function ServiceCatalogForm({
  mode,
  categories,
  units,
  initialService,
}: ServiceCatalogFormProps) {
  const router = useRouter();

  const defaults = useMemo(
    () => ({
      name: initialService?.name ?? "",
      slug: initialService?.slug ?? "",
      description: initialService?.description ?? "",
      category: initialService?.category ?? categories[0] ?? "OTHER",
      unit: initialService?.unit ?? units[0] ?? "FLAT",
      basePrice: initialService?.basePrice ?? "0.00",
      minPrice: initialService?.minPrice ?? "0.00",
      maxPrice: initialService?.maxPrice ?? "",
      defaultQuantity: initialService?.defaultQuantity ?? "",
      riskMultiplier: initialService?.riskMultiplier ?? "1.00",
      isActive: initialService?.isActive ?? true,
      sortOrder: initialService?.sortOrder ?? "0",
      notes: initialService?.notes ?? "",
    }),
    [categories, initialService, units],
  );

  const [form, setForm] = useState(defaults);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateField(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        mode: "manual",
        ...form,
      };

      const url =
        mode === "edit" && initialService?.id
          ? `/api/dashboard/services/${initialService.id}`
          : "/api/dashboard/services";

      const method = mode === "edit" ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json();

      if (!response.ok || json?.data?.status === "error") {
        throw new Error(
          json?.data?.message ??
            json?.message ??
            "Die Leistung konnte nicht gespeichert werden.",
        );
      }

      router.push("/dashboard/services");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unbekannter Fehler beim Speichern der Leistung.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6"
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-semibold text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Name der Leistung">
          <input
            className={inputClass}
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="z.B. Endreinigung 3.5 Zimmer"
            required
          />
        </Field>

        <Field label="Slug">
          <input
            className={inputClass}
            value={form.slug}
            onChange={(event) => updateField("slug", event.target.value)}
            placeholder="automatisch aus dem Namen oder manuell"
          />
        </Field>

        <Field label="Beschreibung" wide>
          <textarea
            className={`${inputClass} min-h-28 resize-y`}
            value={form.description}
            onChange={(event) =>
              updateField("description", event.target.value)
            }
            placeholder="Beschreibung für CRM, Angebot und Rechnung."
          />
        </Field>

        <Field label="Kategorie" wide>
          <div className="grid gap-3 md:grid-cols-3">
            {categories.map((category) => (
              <ButtonOption
                key={category}
                active={form.category === category}
                onClick={() => updateField("category", category)}
              >
                {categoryLabels[category] ?? category}
              </ButtonOption>
            ))}
          </div>
        </Field>

        <Field label="Einheit" wide>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {units.map((unit) => (
              <ButtonOption
                key={unit}
                active={form.unit === unit}
                onClick={() => updateField("unit", unit)}
              >
                {unitLabels[unit] ?? unit}
              </ButtonOption>
            ))}
          </div>
        </Field>

        <Field label="Basispreis CHF">
          <input
            className={inputClass}
            value={form.basePrice}
            onChange={(event) =>
              updateField("basePrice", event.target.value)
            }
            inputMode="decimal"
            placeholder="0.00"
          />
        </Field>

        <Field label="Mindestpreis CHF">
          <input
            className={inputClass}
            value={form.minPrice}
            onChange={(event) => updateField("minPrice", event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
          />
        </Field>

        <Field label="Maximalpreis CHF">
          <input
            className={inputClass}
            value={form.maxPrice}
            onChange={(event) => updateField("maxPrice", event.target.value)}
            inputMode="decimal"
            placeholder="leer = kein Limit"
          />
        </Field>

        <Field label="Standardmenge">
          <input
            className={inputClass}
            value={form.defaultQuantity}
            onChange={(event) =>
              updateField("defaultQuantity", event.target.value)
            }
            inputMode="decimal"
            placeholder="z.B. 60"
          />
        </Field>

        <Field label="Risikofaktor">
          <input
            className={inputClass}
            value={form.riskMultiplier}
            onChange={(event) =>
              updateField("riskMultiplier", event.target.value)
            }
            inputMode="decimal"
            placeholder="1.00"
          />
        </Field>

        <Field label="Sortierung">
          <input
            className={inputClass}
            value={form.sortOrder}
            onChange={(event) => updateField("sortOrder", event.target.value)}
            inputMode="numeric"
            placeholder="0"
          />
        </Field>

        <Field label="Status" wide>
          <div className="grid gap-3 md:grid-cols-2">
            <ButtonOption
              active={form.isActive}
              onClick={() => updateField("isActive", true)}
            >
              Aktiv
            </ButtonOption>

            <ButtonOption
              active={!form.isActive}
              onClick={() => updateField("isActive", false)}
            >
              Inaktiv
            </ButtonOption>
          </div>
        </Field>

        <Field label="Interne Notizen" wide>
          <textarea
            className={`${inputClass} min-h-28 resize-y`}
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Interne Hinweise, Zuschläge, Regeln für manuelle Kontrolle."
          />
        </Field>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl border border-cyan-500 bg-cyan-500/15 px-5 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting
            ? "Speichern..."
            : mode === "edit"
              ? "Änderungen speichern"
              : "Leistung hinzufügen"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/dashboard/services")}
          className="rounded-xl border border-neutral-700 bg-neutral-950 px-5 py-3 text-sm font-bold text-neutral-300 transition hover:border-neutral-500 hover:text-white"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}