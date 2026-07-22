"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CustomerOption = {
  id: string;
  label: string;
};

type OrderFormData = {
  id?: string;
  customerId?: string | null;
  orderNumber?: string | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  serviceType?: string | null;
  scheduledStart?: string | null;
  currency?: string | null;
  estimatedPrice?: string | number | null;
  finalPrice?: string | number | null;
};

type OrderFormProps = {
  mode: "create" | "edit";
  order?: OrderFormData | null;
  customers: CustomerOption[];

  serviceTypes: string[];
};

function inputClass() {
  return "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400";
}

function labelClass() {
  return "mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-500";
}

function normalize(value?: string | number | null) {
  return String(value ?? "");
}

function normalizeDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function humanLabel(value: string) {
  const labels: Record<string, string> = {
    NEW: "Neu",
    OPEN: "Offen",
    PENDING: "Wartend",
    IN_PROGRESS: "In Bearbeitung",
    WAITING_FOR_CUSTOMER: "Wartet auf Kunde",
    CONFIRMED: "Bestätigt",
    SCHEDULED: "Geplant",
    COMPLETED: "Abgeschlossen",
    CANCELLED: "Storniert",

    BASIC_CLEANING: "Grundreinigung",
    DEEP_CLEANING: "Intensivreinigung",
    END_OF_TENANCY: "Wohnungsabgabe",
    OFFICE_CLEANING: "Büroreinigung",
    WINDOW_CLEANING: "Fensterreinigung",
    MOVE_IN_OUT: "Umzug / Abgabe",
    OTHER: "Andere",
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

function choiceButtonClass(active: boolean) {
  return active
    ? "rounded-xl border border-cyan-400/50 bg-cyan-400/15 px-4 py-2 text-sm font-black text-cyan-100 transition"
    : "rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-100";
}

export default function OrderForm({
  mode,
  order,

  serviceTypes,
}: OrderFormProps) {
  const router = useRouter();

  const [form, setForm] = useState({
    customerId: normalize(order?.customerId),

    customerType: "PRIVATE",
    customerCompanyName: "",
    customerFirstName: "",
    customerLastName: "",
    customerEmail: "",
    customerPhone: "",

    orderNumber: normalize(order?.orderNumber),

    title: normalize(order?.title),
    description: normalize(order?.description),
    serviceType: normalize(order?.serviceType) || serviceTypes[0] || "",
    scheduledStart: normalizeDateTime(order?.scheduledStart),
    currency: normalize(order?.currency) || "CHF",
    estimatedPrice: normalize(order?.estimatedPrice),
    finalPrice: normalize(order?.finalPrice),
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
        mode === "edit" && order?.id
          ? `/api/dashboard/orders/${order.id}`
          : "/api/dashboard/orders";

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

      const orderId = json?.data?.order?.id || order?.id;

      if (!orderId) {
        router.push("/dashboard/orders");
        router.refresh();
        return;
      }

      router.push(`/dashboard/orders/${orderId}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Der Auftrag konnte nicht gespeichert werden.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/10">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
          {mode === "create" ? "Neuer Auftrag" : "Auftrag bearbeiten"}
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">
          {mode === "create" ? "Auftrag manuell anlegen" : "Auftragsdaten bearbeiten"}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          Erfassen Sie Kunde, Kontaktdaten und Leistungsumfang. Daraus können
          später Angebot, Rechnung und Zahlung entstehen.
        </p>
      </div>

      <div className="mt-6 grid gap-6">
        <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
            Kunde
          </p>

          <div className="mb-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateField("customerType", "PRIVATE")}
              className={choiceButtonClass(form.customerType === "PRIVATE")}
            >
              Privatkunde
            </button>

            <button
              type="button"
              onClick={() => updateField("customerType", "COMPANY")}
              className={choiceButtonClass(form.customerType === "COMPANY")}
            >
              Firma
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass()}>Firmenname</label>
              <input
                value={form.customerCompanyName}
                onChange={(event) =>
                  updateField("customerCompanyName", event.target.value)
                }
                placeholder="z.B. Muster Reinigung GmbH"
                className={inputClass()}
              />
            </div>

            <div>
              <label className={labelClass()}>Telefon</label>
              <input
                value={form.customerPhone}
                onChange={(event) =>
                  updateField("customerPhone", event.target.value)
                }
                placeholder="+41 ..."
                className={inputClass()}
              />
            </div>

            <div>
              <label className={labelClass()}>Vorname</label>
              <input
                value={form.customerFirstName}
                onChange={(event) =>
                  updateField("customerFirstName", event.target.value)
                }
                placeholder="z.B. Max"
                className={inputClass()}
              />
            </div>

            <div>
              <label className={labelClass()}>Nachname</label>
              <input
                value={form.customerLastName}
                onChange={(event) =>
                  updateField("customerLastName", event.target.value)
                }
                placeholder="z.B. Muster"
                className={inputClass()}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass()}>E-Mail</label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={(event) =>
                  updateField("customerEmail", event.target.value)
                }
                placeholder="kunde@example.ch"
                className={inputClass()}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/10 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
            Auftrag
          </p>

          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass()}>Auftragsnummer</label>
                <input
                  value={form.orderNumber}
                  onChange={(event) =>
                    updateField("orderNumber", event.target.value)
                  }
                  placeholder="Automatisch, wenn leer"
                  className={inputClass()}
                />
              </div>
              <div>
                <label className={labelClass()}>
                  Workflow-Status
                </label>

                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3">
                  <p className="text-sm font-bold text-cyan-100">
                    Automatisch verwaltet
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-400">
                    Der Status wird durch Freigabe, Terminplanung und Abschluss
                    automatisch geändert. Eine manuelle Auswahl ist nicht nötig.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass()}>Titel des Auftrags</label>
              <input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="z.B. Reinigung einer 3.5-Zimmer-Wohnung"
                className={inputClass()}
              />
            </div>

            <div>
              <label className={labelClass()}>Leistungsart</label>
              <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                {serviceTypes.map((serviceType) => (
                  <button
                    key={serviceType}
                    type="button"
                    disabled={loading}
                    onClick={() => updateField("serviceType", serviceType)}
                    className={choiceButtonClass(form.serviceType === serviceType)}
                  >
                    {humanLabel(serviceType)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass()}>Beschreibung</label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Arbeitsumfang, Kundenhinweise, Fläche, Zugang, Material..."
                rows={5}
                className={inputClass()}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className={labelClass()}>Starttermin</label>
                <input
                  type="datetime-local"
                  value={form.scheduledStart}
                  onChange={(event) =>
                    updateField("scheduledStart", event.target.value)
                  }
                  className={inputClass()}
                />
              </div>

              <div>
                <label className={labelClass()}>Währung</label>
                <input
                  value={form.currency}
                  onChange={(event) =>
                    updateField("currency", event.target.value)
                  }
                  placeholder="CHF"
                  className={inputClass()}
                />
              </div>

              <div>
                <label className={labelClass()}>Geschätzter Preis</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimatedPrice}
                  onChange={(event) =>
                    updateField("estimatedPrice", event.target.value)
                  }
                  placeholder="0.00"
                  className={inputClass()}
                />
              </div>

              <div>
                <label className={labelClass()}>Endpreis</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.finalPrice}
                  onChange={(event) =>
                    updateField("finalPrice", event.target.value)
                  }
                  placeholder="0.00"
                  className={inputClass()}
                />
              </div>
            </div>
          </div>
        </section>
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
              ? "Auftrag erstellen"
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