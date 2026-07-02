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
  statuses: string[];
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
    NEW: "Nowe",
    OPEN: "Otwarte",
    PENDING: "Oczekujące",
    IN_PROGRESS: "W trakcie",
    WAITING_FOR_CUSTOMER: "Czeka na klienta",
    CONFIRMED: "Potwierdzone",
    SCHEDULED: "Zaplanowane",
    COMPLETED: "Zakończone",
    CANCELLED: "Anulowane",

    BASIC_CLEANING: "Sprzątanie podstawowe",
    DEEP_CLEANING: "Sprzątanie gruntowne",
    END_OF_TENANCY: "Po wyprowadzce",
    OFFICE_CLEANING: "Biuro",
    WINDOW_CLEANING: "Okna",
    MOVE_IN_OUT: "Przeprowadzka / odbiór",
    OTHER: "Inne",
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
  statuses,
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
    status: normalize(order?.status) || statuses[0] || "NEW",
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
          : "Nie udało się zapisać zlecenia.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/10">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
          {mode === "create" ? "Nowe zlecenie" : "Edycja zlecenia"}
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">
          {mode === "create" ? "Dodaj zlecenie ręcznie" : "Popraw dane zlecenia"}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          Wpisz klienta normalnie ręcznie: firma albo osoba prywatna, dane
          kontaktowe, a niżej zakres zlecenia.
        </p>
      </div>

      <div className="mt-6 grid gap-6">
        <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-cyan-400">
            Klient
          </p>

          <div className="mb-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateField("customerType", "PRIVATE")}
              className={choiceButtonClass(form.customerType === "PRIVATE")}
            >
              Osoba prywatna
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
              <label className={labelClass()}>Nazwa firmy</label>
              <input
                value={form.customerCompanyName}
                onChange={(event) =>
                  updateField("customerCompanyName", event.target.value)
                }
                placeholder="np. Muster Reinigung GmbH"
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
              <label className={labelClass()}>Imię</label>
              <input
                value={form.customerFirstName}
                onChange={(event) =>
                  updateField("customerFirstName", event.target.value)
                }
                placeholder="np. Max"
                className={inputClass()}
              />
            </div>

            <div>
              <label className={labelClass()}>Nazwisko</label>
              <input
                value={form.customerLastName}
                onChange={(event) =>
                  updateField("customerLastName", event.target.value)
                }
                placeholder="np. Muster"
                className={inputClass()}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass()}>Email</label>
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
            Zlecenie
          </p>

          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass()}>Numer zlecenia</label>
                <input
                  value={form.orderNumber}
                  onChange={(event) =>
                    updateField("orderNumber", event.target.value)
                  }
                  placeholder="Automatycznie, jeśli zostawisz puste"
                  className={inputClass()}
                />
              </div>

              <div>
                <label className={labelClass()}>Status</label>
                <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={loading}
                      onClick={() => updateField("status", status)}
                      className={choiceButtonClass(form.status === status)}
                    >
                      {humanLabel(status)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass()}>Nazwa / tytuł zlecenia</label>
              <input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="np. Sprzątanie mieszkania 3.5 pokoju"
                className={inputClass()}
              />
            </div>

            <div>
              <label className={labelClass()}>Typ usługi</label>
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
              <label className={labelClass()}>Opis zlecenia</label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Zakres pracy, uwagi klienta, metraż, dostęp, materiały..."
                rows={5}
                className={inputClass()}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className={labelClass()}>Termin start</label>
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
                <label className={labelClass()}>Waluta</label>
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
                <label className={labelClass()}>Cena szacunkowa</label>
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
                <label className={labelClass()}>Cena końcowa</label>
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
            ? "Zapisywanie..."
            : mode === "create"
              ? "Dodaj zlecenie"
              : "Zapisz zmiany"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => router.back()}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Anuluj
        </button>
      </div>
    </section>
  );
}