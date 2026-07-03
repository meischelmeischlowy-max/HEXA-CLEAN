"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

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

type ServiceCatalogItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category: string;
  unit: string;
  basePrice?: string | number | null;
  minPrice?: string | number | null;
  maxPrice?: string | number | null;
  defaultQuantity?: string | number | null;
  riskMultiplier?: string | number | null;
  isActive: boolean;
  sortOrder?: number | null;
};

type ServicesResponse = {
  data?: {
    status?: string;
    message?: string;
    services?: ServiceCatalogItem[];
  };
};

type EstimateItemForm = {
  serviceCatalogItemId: string;
  itemName: string;
  itemDescription: string;
  itemCategory: string;
  itemUnit: string;
  quantity: string;
  unitPrice: string;
  riskMultiplier: string;
};

type EstimateForm = {
  customerType: "PRIVATE" | "BUSINESS";
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  customerNotes: string;
  title: string;
  description: string;
  serviceStreet: string;
  serviceZipCode: string;
  serviceCity: string;
  serviceCountry: string;
  travelFee: string;
  materialFee: string;
  discountAmount: string;
  notesCustomer: string;
  notesInternal: string;
  items: EstimateItemForm[];
};

const emptyItem: EstimateItemForm = {
  serviceCatalogItemId: "",
  itemName: "",
  itemDescription: "",
  itemCategory: "OTHER",
  itemUnit: "FLAT",
  quantity: "1",
  unitPrice: "0",
  riskMultiplier: "1.00",
};

const initialForm: EstimateForm = {
  customerType: "PRIVATE",
  firstName: "",
  lastName: "",
  companyName: "",
  email: "",
  phone: "",
  customerNotes: "",
  title: "",
  description: "",
  serviceStreet: "",
  serviceZipCode: "",
  serviceCity: "",
  serviceCountry: "CH",
  travelFee: "0",
  materialFee: "0",
  discountAmount: "0",
  notesCustomer:
    "Preis ist eine unverbindliche Schätzung. Die definitive Offerte erfolgt nach Bestätigung des Umfangs.",
  notesInternal: "Wycena utworzona ręcznie w panelu HEXA OS.",
  items: [
    {
      ...emptyItem,
      itemName: "Nowa pozycja wyceny",
    },
  ],
};

const categoryLabels: Record<string, string> = {
  REINIGUNG: "Sprzątanie",
  HAUSWARTUNG: "Hauswartung",
  KLEINREPARATUREN: "Małe naprawy",
  UMZUGSREINIGUNG: "Sprzątanie po przeprowadzce",
  FENSTERREINIGUNG: "Mycie okien",
  WOHNUNGSABGABE: "Oddanie mieszkania",
  SPEZIALREINIGUNG: "Czyszczenie specjalne",
  OTHER: "Inne",
};

const unitLabels: Record<string, string> = {
  FLAT: "Ryczałt",
  HOUR: "Godzina",
  M2: "m²",
  ROOM: "Pokój",
  WINDOW: "Okno",
  PIECE: "Sztuka",
  KM: "Kilometr",
  CUSTOM: "Własna",
};

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  const number = Number(String(value).replace(",", "."));

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return number;
}

function toInputValue(value?: string | number | null, fallback = "") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function money(value: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
  }).format(value);
}

function formatCategory(category?: string | null) {
  if (!category) return "—";

  return categoryLabels[category] ?? category;
}

function formatUnit(unit?: string | null) {
  if (!unit) return "—";

  return unitLabels[unit] ?? unit;
}

function inputClass(extra = "") {
  return `rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-cyan-300/60 ${extra}`;
}

function smallButtonClass(active = false) {
  return active
    ? "rounded-2xl border border-cyan-300/60 bg-cyan-300/15 px-4 py-3 text-left text-sm font-semibold text-cyan-100 transition"
    : "rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-left text-sm font-semibold text-neutral-300 transition hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-100";
}

export default function NewEstimatePage() {
  const router = useRouter();

  const [form, setForm] = useState<EstimateForm>(initialForm);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError("");

    try {
      const response = await fetch("/api/dashboard/services", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json = (await response.json()) as ServicesResponse;

      if (!response.ok || json.data?.status === "error") {
        throw new Error(
          json.data?.message ?? "Nie udało się pobrać cennika usług."
        );
      }

      setServices((json.data?.services ?? []).filter((item) => item.isActive));
    } catch (caughtError) {
      setServicesError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nieznany błąd pobierania cennika."
      );
    } finally {
      setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const servicesById = useMemo(() => {
    return new Map(services.map((service) => [service.id, service]));
  }, [services]);

  const preview = useMemo(() => {
    const itemRows = form.items.map((item) => {
      const catalogItem = item.serviceCatalogItemId
        ? servicesById.get(item.serviceCatalogItemId)
        : null;

      const quantity =
        toNumber(item.quantity) ||
        toNumber(catalogItem?.defaultQuantity) ||
        1;

      const unitPrice =
        toNumber(item.unitPrice) || toNumber(catalogItem?.basePrice);

      const riskMultiplier =
        toNumber(item.riskMultiplier) ||
        toNumber(catalogItem?.riskMultiplier) ||
        1;

      const minPrice = toNumber(catalogItem?.minPrice);
      const subtotal = quantity * unitPrice;
      const riskTotal = subtotal * riskMultiplier;
      const total = Math.max(riskTotal, minPrice);
      const riskAmount = Math.max(total - subtotal, 0);

      return {
        name:
          item.itemName ||
          catalogItem?.name ||
          `Pozycja ${form.items.indexOf(item) + 1}`,
        subtotal,
        riskAmount,
        total,
        minPrice,
      };
    });

    const subtotal = itemRows.reduce((sum, item) => sum + item.subtotal, 0);
    const riskAmount = itemRows.reduce((sum, item) => sum + item.riskAmount, 0);
    const travelFee = toNumber(form.travelFee);
    const materialFee = toNumber(form.materialFee);
    const discountAmount = toNumber(form.discountAmount);

    const totalBeforeDiscount = subtotal + riskAmount + travelFee + materialFee;
    const total = Math.max(totalBeforeDiscount - discountAmount, 0);

    return {
      itemRows,
      subtotal,
      riskAmount,
      travelFee,
      materialFee,
      discountAmount,
      total,
      aiMinTotal: total * 0.9,
      aiMaxTotal: total * 1.15,
    };
  }, [form, servicesById]);

  function updateField(field: keyof Omit<EstimateForm, "items">, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function updateItemField(
    index: number,
    field: keyof EstimateItemForm,
    value: string
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      items: currentForm.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  }

  function applyCatalogService(index: number, service: ServiceCatalogItem) {
    setForm((currentForm) => ({
      ...currentForm,
      items: currentForm.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              serviceCatalogItemId: service.id,
              itemName: service.name,
              itemDescription: service.description ?? "",
              itemCategory: service.category,
              itemUnit: service.unit,
              quantity: toInputValue(service.defaultQuantity, "1"),
              unitPrice: toInputValue(service.basePrice, "0"),
              riskMultiplier: toInputValue(service.riskMultiplier, "1.00"),
            }
          : item
      ),
    }));
  }

  function clearCatalogService(index: number) {
    setForm((currentForm) => ({
      ...currentForm,
      items: currentForm.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              serviceCatalogItemId: "",
            }
          : item
      ),
    }));
  }

  function addItem() {
    setForm((currentForm) => ({
      ...currentForm,
      items: [
        ...currentForm.items,
        {
          ...emptyItem,
          itemName: `Pozycja ${currentForm.items.length + 1}`,
        },
      ],
    }));
  }

  function addCatalogItem(service: ServiceCatalogItem) {
    setForm((currentForm) => ({
      ...currentForm,
      items: [
        ...currentForm.items,
        {
          serviceCatalogItemId: service.id,
          itemName: service.name,
          itemDescription: service.description ?? "",
          itemCategory: service.category,
          itemUnit: service.unit,
          quantity: toInputValue(service.defaultQuantity, "1"),
          unitPrice: toInputValue(service.basePrice, "0"),
          riskMultiplier: toInputValue(service.riskMultiplier, "1.00"),
        },
      ],
    }));
  }

  function removeItem(index: number) {
    setForm((currentForm) => {
      if (currentForm.items.length <= 1) {
        return currentForm;
      }

      return {
        ...currentForm,
        items: currentForm.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError("");

    try {
      const cleanedItems = form.items
        .map((item) => ({
          ...item,
          itemName: item.itemName.trim(),
          itemDescription: item.itemDescription.trim(),
        }))
        .filter(
          (item) =>
            item.itemName.length > 0 || item.serviceCatalogItemId.length > 0
        );

      if (cleanedItems.length === 0) {
        throw new Error("Dodaj przynajmniej jedną pozycję wyceny.");
      }

      const response = await fetch("/api/dashboard/estimates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          mode: "manual",
          ...form,
          items: cleanedItems,
        }),
      });

      const rawText = await response.text();

      if (!rawText.trim()) {
        throw new Error(
          `API zwróciło pustą odpowiedź. HTTP status: ${response.status}`
        );
      }

      let data: CreateEstimateResponse;

      try {
        data = JSON.parse(rawText) as CreateEstimateResponse;
      } catch {
        throw new Error(
          `API nie zwróciło JSON. HTTP status: ${
            response.status
          }. Odpowiedź: ${rawText.slice(0, 300)}`
        );
      }

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
                Wycena MVP: klient, adres, pozycje z cennika, ręczna korekta
                ilości/ceny/ryzyka i szybki podgląd sumy.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-5 py-4 text-sm text-amber-100">
              To jeszcze nie jest oficjalna oferta dla klienta.
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-100">
            {error}
          </section>
        ) : null}

        {servicesError ? (
          <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-100">
            Błąd cennika: {servicesError}
          </section>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[1fr_380px]"
        >
          <div className="flex flex-col gap-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Klient</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <span className="mb-3 block text-sm text-neutral-400">
                    Typ klienta
                  </span>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => updateField("customerType", "PRIVATE")}
                      className={smallButtonClass(
                        form.customerType === "PRIVATE"
                      )}
                    >
                      Osoba prywatna
                    </button>

                    <button
                      type="button"
                      onClick={() => updateField("customerType", "BUSINESS")}
                      className={smallButtonClass(
                        form.customerType === "BUSINESS"
                      )}
                    >
                      Firma
                    </button>
                  </div>
                </div>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Imię</span>
                  <input
                    value={form.firstName}
                    onChange={(event) =>
                      updateField("firstName", event.target.value)
                    }
                    className={inputClass()}
                    placeholder="np. Anna"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Nazwisko</span>
                  <input
                    value={form.lastName}
                    onChange={(event) =>
                      updateField("lastName", event.target.value)
                    }
                    className={inputClass()}
                    placeholder="np. Müller"
                  />
                </label>

                <label className="flex flex-col gap-2 md:col-span-2">
                  <span className="text-sm text-neutral-400">Firma</span>
                  <input
                    value={form.companyName}
                    onChange={(event) =>
                      updateField("companyName", event.target.value)
                    }
                    className={inputClass()}
                    placeholder="opcjonalnie"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Telefon</span>
                  <input
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    className={inputClass()}
                    placeholder="+41 ..."
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className={inputClass()}
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
                    className={inputClass()}
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
                    className={inputClass()}
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
                    className={inputClass()}
                    placeholder="Biel/Bienne"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Zakres wyceny</h2>

              <div className="mt-5 grid gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Tytuł wyceny</span>
                  <input
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    className={inputClass()}
                    placeholder="np. Endreinigung mieszkania"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Opis / zakres</span>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    rows={4}
                    className={inputClass("resize-none")}
                    placeholder="Krótki opis pracy, mieszkania, stanu zabrudzenia itd."
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Szybkie dodanie z cennika</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Kliknij usługę, żeby dodać ją jako kolejną pozycję wyceny.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
                >
                  Dodaj pustą pozycję
                </button>
              </div>

              {servicesLoading ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
                    />
                  ))}
                </div>
              ) : services.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                  Brak aktywnych usług w cenniku. Dodaj usługę w module Cennik.
                </div>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => addCatalogItem(service)}
                      className="rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
                    >
                      <p className="font-bold text-white">{service.name}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {formatCategory(service.category)} ·{" "}
                        {formatUnit(service.unit)}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-cyan-100">
                        {money(toNumber(service.basePrice))}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Pozycje wyceny</h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    Każdą pozycję możesz poprawić ręcznie: ilość, cena i mnożnik
                    ryzyka.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
                >
                  Dodaj pozycję
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-5">
                {form.items.map((item, index) => {
                  const selectedService = item.serviceCatalogItemId
                    ? servicesById.get(item.serviceCatalogItemId)
                    : null;

                  return (
                    <div
                      key={index}
                      className="rounded-3xl border border-white/10 bg-black/20 p-5"
                    >
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200">
                            Pozycja {index + 1}
                          </p>
                          {selectedService ? (
                            <p className="mt-1 text-xs text-neutral-500">
                              Z cennika: {selectedService.slug}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-neutral-500">
                              Pozycja ręczna
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {selectedService ? (
                            <button
                              type="button"
                              onClick={() => clearCatalogService(index)}
                              className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-300/20"
                            >
                              Odłącz cennik
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={form.items.length <= 1}
                            className="rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Usuń
                          </button>
                        </div>
                      </div>

                      {services.length > 0 ? (
                        <div className="mb-5">
                          <span className="mb-3 block text-sm text-neutral-400">
                            Wybierz usługę z cennika
                          </span>

                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {services.map((service) => (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => applyCatalogService(index, service)}
                                className={smallButtonClass(
                                  item.serviceCatalogItemId === service.id
                                )}
                              >
                                <span className="block">{service.name}</span>
                                <span className="mt-1 block text-xs text-neutral-500">
                                  {formatUnit(service.unit)} ·{" "}
                                  {money(toNumber(service.basePrice))}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2 md:col-span-2">
                          <span className="text-sm text-neutral-400">
                            Nazwa pozycji
                          </span>
                          <input
                            value={item.itemName}
                            onChange={(event) =>
                              updateItemField(
                                index,
                                "itemName",
                                event.target.value
                              )
                            }
                            required
                            className={inputClass()}
                            placeholder="np. Sprzątanie mieszkania"
                          />
                        </label>

                        <label className="flex flex-col gap-2 md:col-span-2">
                          <span className="text-sm text-neutral-400">
                            Opis pozycji
                          </span>
                          <textarea
                            value={item.itemDescription}
                            onChange={(event) =>
                              updateItemField(
                                index,
                                "itemDescription",
                                event.target.value
                              )
                            }
                            rows={3}
                            className={inputClass("resize-none")}
                            placeholder="np. Kuchnia, łazienka, podłogi, kurz"
                          />
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm text-neutral-400">
                            Kategoria
                          </span>
                          <input
                            value={item.itemCategory}
                            onChange={(event) =>
                              updateItemField(
                                index,
                                "itemCategory",
                                event.target.value
                              )
                            }
                            className={inputClass()}
                            placeholder="REINIGUNG"
                          />
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm text-neutral-400">
                            Jednostka
                          </span>
                          <input
                            value={item.itemUnit}
                            onChange={(event) =>
                              updateItemField(
                                index,
                                "itemUnit",
                                event.target.value
                              )
                            }
                            className={inputClass()}
                            placeholder="HOUR / M2 / FLAT"
                          />
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm text-neutral-400">Ilość</span>
                          <input
                            value={item.quantity}
                            onChange={(event) =>
                              updateItemField(
                                index,
                                "quantity",
                                event.target.value
                              )
                            }
                            inputMode="decimal"
                            required
                            className={inputClass()}
                          />
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm text-neutral-400">
                            Cena jednostkowa CHF
                          </span>
                          <input
                            value={item.unitPrice}
                            onChange={(event) =>
                              updateItemField(
                                index,
                                "unitPrice",
                                event.target.value
                              )
                            }
                            inputMode="decimal"
                            required
                            className={inputClass()}
                          />
                        </label>

                        <label className="flex flex-col gap-2 md:col-span-2">
                          <span className="text-sm text-neutral-400">
                            Mnożnik ryzyka
                          </span>
                          <input
                            value={item.riskMultiplier}
                            onChange={(event) =>
                              updateItemField(
                                index,
                                "riskMultiplier",
                                event.target.value
                              )
                            }
                            inputMode="decimal"
                            className={inputClass()}
                            placeholder="1.00"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Opłaty dodatkowe</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Dojazd CHF</span>
                  <input
                    value={form.travelFee}
                    onChange={(event) =>
                      updateField("travelFee", event.target.value)
                    }
                    inputMode="decimal"
                    className={inputClass()}
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
                    className={inputClass()}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">Rabat CHF</span>
                  <input
                    value={form.discountAmount}
                    onChange={(event) =>
                      updateField("discountAmount", event.target.value)
                    }
                    inputMode="decimal"
                    className={inputClass()}
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold">Notatki</h2>

              <div className="mt-5 grid gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">
                    Notatka dla klienta po niemiecku
                  </span>
                  <textarea
                    value={form.notesCustomer}
                    onChange={(event) =>
                      updateField("notesCustomer", event.target.value)
                    }
                    rows={3}
                    className={inputClass("resize-none")}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm text-neutral-400">
                    Notatka wewnętrzna
                  </span>
                  <textarea
                    value={form.notesInternal}
                    onChange={(event) =>
                      updateField("notesInternal", event.target.value)
                    }
                    rows={3}
                    className={inputClass("resize-none")}
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
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
                  Pozycje
                </p>

                <div className="mt-3 space-y-3">
                  {preview.itemRows.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="border-b border-white/10 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="flex justify-between gap-4">
                        <span className="text-neutral-300">{item.name}</span>
                        <span className="font-semibold">{money(item.total)}</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        Subtotal {money(item.subtotal)} · Korekta/min.{" "}
                        {money(item.riskAmount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-neutral-400">Subtotal</span>
                <span className="font-semibold">{money(preview.subtotal)}</span>
              </div>

              <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                <span className="text-neutral-400">Ryzyko/minimum</span>
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
                <span className="font-semibold">
                  - {money(preview.discountAmount)}
                </span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-neutral-950/70 p-5">
              <p className="text-sm text-cyan-100/70">Razem</p>
              <p className="mt-2 text-4xl font-black text-cyan-100">
                {money(preview.total)}
              </p>
              <p className="mt-3 text-xs leading-5 text-cyan-100/60">
                Widełki robocze: {money(preview.aiMinTotal)} –{" "}
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
              Po utworzeniu system przeniesie Cię na szczegóły tej jednej
              wyceny.
            </p>
          </aside>
        </form>
      </div>
    </main>
  );
}