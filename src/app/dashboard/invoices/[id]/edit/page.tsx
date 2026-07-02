"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import PremiumButton from "../../../../../components/dashboard/PremiumButton";
import StatusBadge from "../../../../../components/dashboard/StatusBadge";

type Invoice = {
  id: string;
  invoiceNumber?: string | null;
  number?: string | null;
  status?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  subtotal?: string | number | null;
  taxRate?: string | number | null;
  taxAmount?: string | number | null;
  total?: string | number | null;
  paidAmount?: string | number | null;
  currency?: string | null;
  notes?: string | null;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

type InvoiceApiResponse = {
  layer?: string;
  message?: string;
  data?: unknown;
  invoice?: Invoice | null;
  invoiceDetails?: Invoice | null;
};

type InvoiceForm = {
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  paidAmount: string;
  currency: string;
  notes: string;
};

const statusOptions = [
  { value: "DRAFT", label: "Szkic" },
  { value: "SENT", label: "Wysłana" },
  { value: "PAID", label: "Opłacona" },
  { value: "PARTIALLY_PAID", label: "Częściowo opłacona" },
  { value: "OVERDUE", label: "Po terminie" },
  { value: "CANCELLED", label: "Anulowana" },
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function looksLikeInvoice(value: unknown, expectedId: string): value is Invoice {
  if (!isObject(value)) {
    return false;
  }

  if (value.id !== expectedId) {
    return false;
  }

  return (
    "invoiceNumber" in value ||
    "number" in value ||
    "total" in value ||
    "subtotal" in value ||
    "paidAmount" in value ||
    "dueDate" in value ||
    "status" in value
  );
}

function findInvoiceDeep(value: unknown, expectedId: string): Invoice | null {
  if (looksLikeInvoice(value, expectedId)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findInvoiceDeep(item, expectedId);

      if (found) {
        return found;
      }
    }

    return null;
  }

  if (isObject(value)) {
    for (const item of Object.values(value)) {
      const found = findInvoiceDeep(item, expectedId);

      if (found) {
        return found;
      }
    }
  }

  return null;
}

function apiMessage(data: InvoiceApiResponse) {
  if (isObject(data.data)) {
    const nestedMessage = data.data.message;

    if (typeof nestedMessage === "string") {
      return nestedMessage;
    }
  }

  return data.message ?? "Brak komunikatu API.";
}

function apiStatus(data: InvoiceApiResponse) {
  if (isObject(data.data) && typeof data.data.status === "string") {
    return data.data.status;
  }

  return null;
}

function toInputDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toMoneyText(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "0.00";
  }

  const parsed = Number(String(value).replace(",", "."));

  if (!Number.isFinite(parsed)) {
    return "0.00";
  }

  return (Math.round((parsed + Number.EPSILON) * 100) / 100).toFixed(2);
}

function customerName(invoice: Invoice | null) {
  const customer = invoice?.customer;

  if (!customer) {
    return "—";
  }

  if (customer.companyName) {
    return customer.companyName;
  }

  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || customer.email || customer.phone || "—";
}

function createForm(invoice: Invoice): InvoiceForm {
  return {
    invoiceNumber: invoice.invoiceNumber ?? invoice.number ?? "",
    status: invoice.status ?? "DRAFT",
    issueDate: toInputDate(invoice.issueDate),
    dueDate: toInputDate(invoice.dueDate),
    subtotal: toMoneyText(invoice.subtotal),
    taxRate: toMoneyText(invoice.taxRate),
    taxAmount: toMoneyText(invoice.taxAmount),
    total: toMoneyText(invoice.total),
    paidAmount: toMoneyText(invoice.paidAmount),
    currency: invoice.currency ?? "CHF",
    notes: invoice.notes ?? "",
  };
}

export default function DashboardInvoiceEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const invoiceId = params.id;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState<InvoiceForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const recalculatedTotal = useMemo(() => {
    if (!form) {
      return "0.00";
    }

    const subtotal = Number(form.subtotal.replace(",", "."));
    const taxAmount = Number(form.taxAmount.replace(",", "."));

    const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0;
    const safeTaxAmount = Number.isFinite(taxAmount) ? taxAmount : 0;

    return (Math.round((safeSubtotal + safeTaxAmount) * 100) / 100).toFixed(2);
  }, [form]);

  const loadInvoice = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/dashboard/invoices/${invoiceId}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });

      const rawText = await response.text();

      if (!rawText.trim()) {
        throw new Error(
          `API zwróciło pustą odpowiedź. HTTP status: ${response.status}`
        );
      }

      const data = JSON.parse(rawText) as InvoiceApiResponse;
      const loadedInvoice = findInvoiceDeep(data, invoiceId);

      if (!response.ok || apiStatus(data) === "error") {
        throw new Error(apiMessage(data));
      }

      if (!loadedInvoice) {
        throw new Error(
          `API odpowiedziało, ale formularz nie znalazł danych faktury. Komunikat API: ${apiMessage(
            data
          )}`
        );
      }

      setInvoice(loadedInvoice);
      setForm(createForm(loadedInvoice));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nieznany błąd pobierania faktury."
      );
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  function updateField(field: keyof InvoiceForm, value: string) {
    setForm((currentForm) => {
      if (!currentForm) {
        return currentForm;
      }

      return {
        ...currentForm,
        [field]: value,
      };
    });
  }

  function applyCalculatedTotal() {
    updateField("total", recalculatedTotal);
  }

  async function saveInvoice() {
    if (!form) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/dashboard/invoices/${invoiceId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const rawText = await response.text();

      if (!rawText.trim()) {
        throw new Error(
          `API zwróciło pustą odpowiedź. HTTP status: ${response.status}`
        );
      }

      const data = JSON.parse(rawText) as InvoiceApiResponse;
      const updatedInvoice = findInvoiceDeep(data, invoiceId);

      if (!response.ok || apiStatus(data) === "error") {
        throw new Error(apiMessage(data));
      }

      if (!updatedInvoice) {
        throw new Error(
          `API zapisało odpowiedź, ale formularz nie znalazł zapisanej faktury. Komunikat API: ${apiMessage(
            data
          )}`
        );
      }

      setInvoice(updatedInvoice);
      setForm(createForm(updatedInvoice));
      setMessage(apiMessage(data) || "Faktura została zapisana.");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nieznany błąd zapisu faktury."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-8 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          Ładowanie faktury...
        </div>
      </main>
    );
  }

  if (!form || !invoice) {
    return (
      <main className="min-h-screen px-6 py-8 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-red-400/20 bg-red-500/10 p-8 text-red-100">
          {error || "Nie znaleziono faktury."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href={`/dashboard/invoices/${invoice.id}`}
                className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
              >
                ← Wróć do szczegółów faktury
              </Link>

              <p className="mt-5 text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
                HEXA OS CRM / Invoice Edit
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight">
                Edycja faktury
              </h1>

              <p className="mt-2 text-sm text-neutral-400">
                Klient: {customerName(invoice)}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatusBadge status={form.status} />

              <PremiumButton
                href={`/dashboard/invoices/${invoice.id}/print`}
                variant="ghost"
              >
                Drukuj
              </PremiumButton>
            </div>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Dane faktury</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm text-neutral-400">Numer faktury</span>
                <input
                  value={form.invoiceNumber}
                  onChange={(event) =>
                    updateField("invoiceNumber", event.target.value)
                  }
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-neutral-400">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-neutral-400">Data faktury</span>
                <input
                  type="date"
                  value={form.issueDate}
                  onChange={(event) =>
                    updateField("issueDate", event.target.value)
                  }
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-neutral-400">Termin płatności</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => updateField("dueDate", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-neutral-400">Waluta</span>
                <input
                  value={form.currency}
                  onChange={(event) => updateField("currency", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                />
              </label>

              <div className="hidden md:block" />

              <label className="flex flex-col gap-2">
                <span className="text-sm text-neutral-400">Subtotal</span>
                <input
                  value={form.subtotal}
                  onChange={(event) => updateField("subtotal", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-neutral-400">Podatek %</span>
                <input
                  value={form.taxRate}
                  onChange={(event) => updateField("taxRate", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-neutral-400">Kwota podatku</span>
                <input
                  value={form.taxAmount}
                  onChange={(event) =>
                    updateField("taxAmount", event.target.value)
                  }
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-neutral-400">Total</span>
                <input
                  value={form.total}
                  onChange={(event) => updateField("total", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-neutral-400">Zapłacono</span>
                <input
                  value={form.paidAmount}
                  onChange={(event) =>
                    updateField("paidAmount", event.target.value)
                  }
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50"
                />
              </label>
            </div>

            <label className="mt-4 flex flex-col gap-2">
              <span className="text-sm text-neutral-400">
                Notatki / treść dla faktury
              </span>
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={7}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/50"
              />
            </label>
          </div>

          <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Kontrola kwoty</h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-neutral-400">Subtotal</span>
                <span className="font-semibold">
                  {form.subtotal} {form.currency}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-neutral-400">Podatek</span>
                <span className="font-semibold">
                  {form.taxAmount} {form.currency}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
                <span className="text-neutral-400">Wyliczony total</span>
                <span className="font-black text-cyan-200">
                  {recalculatedTotal} {form.currency}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-neutral-400">Wpisany total</span>
                <span className="font-black text-emerald-200">
                  {form.total} {form.currency}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={applyCalculatedTotal}
              className="mt-5 w-full rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 hover:bg-cyan-400/20"
            >
              Ustaw total z subtotal + podatek
            </button>

            <button
              type="button"
              onClick={saveInvoice}
              disabled={saving}
              className="mt-3 w-full rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-4 py-3 text-sm font-black text-emerald-100 hover:bg-emerald-400/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Zapisywanie..." : "Zapisz fakturę"}
            </button>

            {message ? (
              <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
                {error}
              </div>
            ) : null}
          </aside>
        </section>
      </section>
    </main>
  );
}