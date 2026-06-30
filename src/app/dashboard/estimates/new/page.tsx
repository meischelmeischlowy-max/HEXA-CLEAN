"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type CreateEstimateResponse = {
  layer?: string;
  message?: string;
  data?: {
    status?: string;
    message?: string;
    estimate?: {
      id: string;
      estimateNumber?: string | null;
    } | null;
  };
};

type EstimateForm = {
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  title: string;
  description: string;
  serviceStreet: string;
  serviceZipCode: string;
  serviceCity: string;
  itemName: string;
  itemDescription: string;
  itemCategory: string;
  itemUnit: string;
  quantity: string;
  unitPrice: string;
  riskMultiplier: string;
  travelFee: string;
  materialFee: string;
  discountAmount: string;
  notesCustomer: string;
  notesInternal: string;
};

const initialForm: EstimateForm = {
  firstName: "",
  lastName: "",
  companyName: "",
  email: "",
  phone: "",
  title: "",
  description: "",
  serviceStreet: "",
  serviceZipCode: "",
  serviceCity: "",
  itemName: "Sprzątanie mieszkania",
  itemDescription: "",
  itemCategory: "cleaning",
  itemUnit: "h",
  quantity: "4",
  unitPrice: "45",
  riskMultiplier: "1.00",
  travelFee: "0",
  materialFee: "0",
  discountAmount: "0",
  notesCustomer:
    "Cena orientacyjna. Ostateczna oferta po potwierdzeniu zakresu.",
  notesInternal: "Wycena utworzona ręcznie w panelu HEXA OS.",
};

function toNumber(value: string) {
  const number = Number(value.replace(",", "."));

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return number;
}

function money(value: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
  }).format(value);
}

export default function NewEstimatePage() {
  const router = useRouter();
  const [form, setForm] = useState<EstimateForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const preview = useMemo(() => {
    const quantity = toNumber(form.quantity);
    const unitPrice = toNumber(form.unitPrice);
    const riskMultiplier = toNumber(form.riskMultiplier) || 1;
    const travelFee = toNumber(form.travelFee);
    const materialFee = toNumber(form.materialFee);
    const discountAmount = toNumber(form.discountAmount);

    const subtotal = quantity * unitPrice;
    const riskTotal = subtotal * riskMultiplier;
    const riskAmount = Math.max(riskTotal - subtotal, 0);
    const totalBeforeDiscount = subtotal + riskAmount + travelFee + materialFee;
    const total = Math.max(totalBeforeDiscount - discountAmount, 0);

    return {
      subtotal,
      riskAmount,
      travelFee,
      materialFee,
      discountAmount,
      total,
      aiMinTotal: total * 0.9,
      aiMaxTotal: total * 1.15,
    };
  }, [form]);

  function updateField(field: keyof EstimateForm, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/estimates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "manual",
          ...form,
        }),
      });

      const data = (await response.json()) as CreateEstimateResponse;

      if (!response.ok || data.data?.status === "error") {
        throw new Error(
          data.data?.message ?? data.message ?? "Nie udało się utworzyć wyceny."
        );
      }

      const estimateId = data.data?.estimate?.id;

      if (!estimateId) {
        router.push("/dashboard/estimates");
        router.refresh();
        return;
      }

      router.push(`/dashboard/estimates/${estimateId}`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nieznany błąd tworzenia wyceny."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link
                href="/dashboard/estimates"
                className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
              >
                ← Wróć do wycen
              </Link>

              <p className="mt-5 text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
                HEXA OS / New Estimate
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Nowa wycena
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
                Ręczne utworzenie roboczej wyceny. Cena nadal wymaga kontroli
                właściciela przed wysłaniem klientowi.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-5 py-4 text-sm text-amber-100">
              To nie jest jeszcze oficjalna oferta dla klienta.
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-100">
            {error}
          </section>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Klient</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Imię</span>
                  <input
                    value={form.firstName}
                    onChange={(event) => updateField("firstName", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="np. Anna"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Nazwisko</span>
                  <input
                    value={form.lastName}
                    onChange={(event) => updateField("lastName", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="np. Müller"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Firma</span>
                  <input
                    value={form.companyName}
                    onChange={(event) =>
                      updateField("companyName", event.target.value)
                    }
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="opcjonalnie"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Telefon</span>
                  <input
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="+41 ..."
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm text-neutral-400">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="klient@email.ch"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Adres usługi</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2 md:col-span-3">
                  <span className="text-sm text-neutral-400">Ulica</span>
                  <input
                    value={form.serviceStreet}
                    onChange={(event) =>
                      updateField("serviceStreet", event.target.value)
                    }
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="np. Musterstrasse 1"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Kod</span>
                  <input
                    value={form.serviceZipCode}
                    onChange={(event) =>
                      updateField("serviceZipCode", event.target.value)
                    }
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="2502"
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm text-neutral-400">Miasto</span>
                  <input
                    value={form.serviceCity}
                    onChange={(event) =>
                      updateField("serviceCity", event.target.value)
                    }
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="Biel/Bienne"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Zakres wyceny</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm text-neutral-400">Tytuł wyceny</span>
                  <input
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="np. Sprzątanie mieszkania po przeprowadzce"
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm text-neutral-400">Opis / zakres</span>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    rows={4}
                    className="resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="Krótki opis pracy, mieszkania, stanu zabrudzenia itd."
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm text-neutral-400">Nazwa pozycji</span>
                  <input
                    value={form.itemName}
                    onChange={(event) => updateField("itemName", event.target.value)}
                    required
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="np. Sprzątanie mieszkania"
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm text-neutral-400">Opis pozycji</span>
                  <textarea
                    value={form.itemDescription}
                    onChange={(event) =>
                      updateField("itemDescription", event.target.value)
                    }
                    rows={3}
                    className="resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="np. Kuchnia, łazienka, podłogi, kurz, podstawowe czyszczenie"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Kalkulacja</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Ilość</span>
                  <input
                    value={form.quantity}
                    onChange={(event) => updateField("quantity", event.target.value)}
                    inputMode="decimal"
                    required
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Jednostka</span>
                  <input
                    value={form.itemUnit}
                    onChange={(event) => updateField("itemUnit", event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="h / m² / szt."
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Cena jednostkowa CHF</span>
                  <input
                    value={form.unitPrice}
                    onChange={(event) =>
                      updateField("unitPrice", event.target.value)
                    }
                    inputMode="decimal"
                    required
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Mnożnik ryzyka</span>
                  <input
                    value={form.riskMultiplier}
                    onChange={(event) =>
                      updateField("riskMultiplier", event.target.value)
                    }
                    inputMode="decimal"
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                    placeholder="1.00"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Dojazd CHF</span>
                  <input
                    value={form.travelFee}
                    onChange={(event) => updateField("travelFee", event.target.value)}
                    inputMode="decimal"
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Materiały CHF</span>
                  <input
                    value={form.materialFee}
                    onChange={(event) =>
                      updateField("materialFee", event.target.value)
                    }
                    inputMode="decimal"
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-3">
                  <span className="text-sm text-neutral-400">Rabat CHF</span>
                  <input
                    value={form.discountAmount}
                    onChange={(event) =>
                      updateField("discountAmount", event.target.value)
                    }
                    inputMode="decimal"
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Notatki</h2>

              <div className="mt-5 grid gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Notatka dla klienta</span>
                  <textarea
                    value={form.notesCustomer}
                    onChange={(event) =>
                      updateField("notesCustomer", event.target.value)
                    }
                    rows={3}
                    className="resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Notatka wewnętrzna</span>
                  <textarea
                    value={form.notesInternal}
                    onChange={(event) =>
                      updateField("notesInternal", event.target.value)
                    }
                    rows={3}
                    className="resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/60"
                  />
                </label>
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-6 lg:sticky lg:top-8">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-cyan-200">
              Podgląd ceny
            </p>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-neutral-400">Subtotal</span>
                <span className="font-semibold">{money(preview.subtotal)}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-neutral-400">Ryzyko</span>
                <span className="font-semibold">{money(preview.riskAmount)}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-neutral-400">Dojazd</span>
                <span className="font-semibold">{money(preview.travelFee)}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-neutral-400">Materiały</span>
                <span className="font-semibold">{money(preview.materialFee)}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-neutral-400">Rabat</span>
                <span className="font-semibold">- {money(preview.discountAmount)}</span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-neutral-950/70 p-5">
              <p className="text-sm text-cyan-100/70">Razem</p>
              <p className="mt-2 text-4xl font-black text-cyan-100">
                {money(preview.total)}
              </p>
              <p className="mt-3 text-xs leading-5 text-cyan-100/60">
                Widełki AI demo: {money(preview.aiMinTotal)} –{" "}
                {money(preview.aiMaxTotal)}
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-neutral-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Tworzenie..." : "Utwórz wycenę"}
            </button>

            <p className="mt-4 text-xs leading-5 text-neutral-400">
              Po utworzeniu system przeniesie Cię na szczegóły tej jednej wyceny.
            </p>
          </aside>
        </form>
      </div>
    </main>
  );
}