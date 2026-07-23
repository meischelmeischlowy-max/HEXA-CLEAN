"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type ReviewItem = {
  id: string;
  name: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
};

type EstimateReviewModalProps = {
  estimateId: string;
  estimateNumber: string;
  currency: string;
  customer: {
    firstName: string;
    lastName: string;
    companyName: string;
    email: string;
    phone: string;
    street: string;
    zipCode: string;
    city: string;
    country: string;
  };
  estimate: {
    title: string;
    description: string;
    serviceStreet: string;
    serviceZipCode: string;
    serviceCity: string;
    serviceCountry: string;
    preferredDate: string;
    travelFee: string;
    materialFee: string;
    discountAmount: string;
    notesCustomer: string;
    notesInternal: string;
  };
  items: ReviewItem[];
};

const UNIT_OPTIONS = [
  "FLAT",
  "HOUR",
  "M2",
  "ROOM",
  "WINDOW",
  "PIECE",
  "KM",
  "CUSTOM",
];

const DEFAULT_PHOTO_SUBJECT =
  "Fotos für Ihre Anfrage bei HEXA CLEAN";

const DEFAULT_PHOTO_MESSAGE = [
  "Guten Tag,",
  "",
  "damit wir Ihre Anfrage zuverlässig prüfen und eine passende Offerte erstellen können, benötigen wir noch einige Fotos vom Objekt und von den zu reinigenden Bereichen.",
  "",
  "Bitte antworten Sie auf diese E-Mail und senden Sie die Fotos als Anhang.",
  "",
  "Vielen Dank.",
  "HEXA CLEAN",
].join("\n");

function numberValue(value: string) {
  const parsed =
    Number(
      value
        .trim()
        .replace(",", "."),
    );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function money(value: number) {
  return Math.max(
    0,
    Math.round(
      (
        value +
        Number.EPSILON
      ) *
        100,
    ) / 100,
  );
}

export default function EstimateReviewModal({
  estimateId,
  estimateNumber,
  currency,
  customer: initialCustomer,
  estimate: initialEstimate,
  items: initialItems,
}: EstimateReviewModalProps) {
  const router = useRouter();

  const [open, setOpen] =
    useState(false);

  const [customer, setCustomer] =
    useState(initialCustomer);

  const [estimate, setEstimate] =
    useState(initialEstimate);

  const [items, setItems] =
    useState(
      initialItems.length > 0
        ? initialItems
        : [
            {
              id:
                crypto.randomUUID(),
              name: "Leistung",
              description: "",
              unit: "FLAT",
              quantity: "1",
              unitPrice: "0",
            },
          ],
    );

  const [
    photoSubject,
    setPhotoSubject,
  ] = useState(
    DEFAULT_PHOTO_SUBJECT,
  );

  const [
    photoMessage,
    setPhotoMessage,
  ] = useState(
    DEFAULT_PHOTO_MESSAGE,
  );

  const [status, setStatus] =
    useState<
      | "idle"
      | "saving"
      | "success"
      | "error"
    >("idle");

  const [message, setMessage] =
    useState("");

  const subtotal = useMemo(
    () =>
      money(
        items.reduce(
          (sum, item) =>
            sum +
            numberValue(
              item.quantity,
            ) *
              numberValue(
                item.unitPrice,
              ),
          0,
        ),
      ),
    [items],
  );

  const total = useMemo(
    () =>
      money(
        subtotal +
          numberValue(
            estimate.travelFee,
          ) +
          numberValue(
            estimate.materialFee,
          ) -
          numberValue(
            estimate.discountAmount,
          ),
      ),
    [
      estimate.discountAmount,
      estimate.materialFee,
      estimate.travelFee,
      subtotal,
    ],
  );

  function updateCustomer(
    key: keyof typeof customer,
    value: string,
  ) {
    setCustomer((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateEstimate(
    key: keyof typeof estimate,
    value: string,
  ) {
    setEstimate((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateItem(
    id: string,
    key: keyof ReviewItem,
    value: string,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "Neue Position",
        description: "",
        unit: "FLAT",
        quantity: "1",
        unitPrice: "0",
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((current) =>
      current.length > 1
        ? current.filter(
            (item) =>
              item.id !== id,
          )
        : current,
    );
  }

  async function submit(
    action:
      | "SAVE"
      | "REQUEST_PHOTOS",
  ) {
    if (
      action ===
        "REQUEST_PHOTOS" &&
      !customer.email.trim()
    ) {
      setStatus("error");
      setMessage(
        "Für die Foto-Anfrage fehlt die E-Mail-Adresse.",
      );
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/dashboard/estimates/${estimateId}/review`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action,
              customer,
              estimate,
              items: items.map(
                (item) => ({
                  name: item.name,
                  description:
                    item.description,
                  unit: item.unit,
                  quantity:
                    item.quantity,
                  unitPrice:
                    item.unitPrice,
                }),
              ),
              photoRequest: {
                subject:
                  photoSubject,
                message:
                  photoMessage,
              },
            }),
          },
        );

      const payload =
        (await response
          .json()
          .catch(() => null)) as
          | {
              status?: string;
              message?: string;
            }
          | null;

      if (
        !response.ok ||
        payload?.status !== "OK"
      ) {
        throw new Error(
          payload?.message ??
            "Speichern fehlgeschlagen.",
        );
      }

      setStatus("success");
      setMessage(
        payload.message ??
          "Gespeichert.",
      );

      router.refresh();

      if (action === "SAVE") {
        window.setTimeout(
          () => setOpen(false),
          700,
        );
      }
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Speichern fehlgeschlagen.",
      );
    }
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-white/10 bg-black/35 px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-300/60";

  const textAreaClass =
    "min-h-24 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-300/60";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setStatus("idle");
          setMessage("");
          setOpen(true);
        }}
        className="w-full rounded-2xl border border-cyan-300/40 bg-cyan-300/10 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-300/20 sm:w-auto"
      >
        Kalkulation bearbeiten
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6">
          <div className="mx-auto w-full max-w-7xl rounded-3xl border border-white/15 bg-[#07101c] shadow-2xl">
            <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-t-3xl border-b border-white/10 bg-[#07101c]/95 px-5 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                  Interne Bearbeitung
                </p>

                <h2 className="mt-1 text-2xl font-black text-white">
                  {estimateNumber}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10"
              >
                Schliessen
              </button>
            </div>

            <div className="space-y-6 p-5">
              <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-xl font-black">
                  Kunde und Adresse
                </h3>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <input className={inputClass} value={customer.firstName} onChange={(event) => updateCustomer("firstName", event.target.value)} placeholder="Vorname" />
                  <input className={inputClass} value={customer.lastName} onChange={(event) => updateCustomer("lastName", event.target.value)} placeholder="Nachname" />
                  <input className={inputClass} value={customer.companyName} onChange={(event) => updateCustomer("companyName", event.target.value)} placeholder="Firma" />
                  <input className={inputClass} value={customer.email} onChange={(event) => updateCustomer("email", event.target.value)} placeholder="E-Mail" />
                  <input className={inputClass} value={customer.phone} onChange={(event) => updateCustomer("phone", event.target.value)} placeholder="Telefon" />
                  <input className={inputClass} value={customer.street} onChange={(event) => updateCustomer("street", event.target.value)} placeholder="Kundenadresse" />
                  <input className={inputClass} value={customer.zipCode} onChange={(event) => updateCustomer("zipCode", event.target.value)} placeholder="PLZ" />
                  <input className={inputClass} value={customer.city} onChange={(event) => updateCustomer("city", event.target.value)} placeholder="Ort" />
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-xl font-black">
                  Leistung und Einsatzort
                </h3>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <input className={inputClass} value={estimate.title} onChange={(event) => updateEstimate("title", event.target.value)} placeholder="Leistung / Titel" />
                  <input className={inputClass} value={estimate.serviceStreet} onChange={(event) => updateEstimate("serviceStreet", event.target.value)} placeholder="Einsatzstrasse" />
                  <input className={inputClass} value={estimate.serviceZipCode} onChange={(event) => updateEstimate("serviceZipCode", event.target.value)} placeholder="Einsatz-PLZ" />
                  <input className={inputClass} value={estimate.serviceCity} onChange={(event) => updateEstimate("serviceCity", event.target.value)} placeholder="Einsatzort" />
                  <input className={inputClass} type="datetime-local" value={estimate.preferredDate} onChange={(event) => updateEstimate("preferredDate", event.target.value)} />
                </div>

                <textarea className={`${textAreaClass} mt-3`} value={estimate.description} onChange={(event) => updateEstimate("description", event.target.value)} placeholder="Leistungsbeschreibung, Zustand, Fläche, Zimmer, Fenster und Besonderheiten" />
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xl font-black">
                    Positionen und Preis
                  </h3>

                  <button
                    type="button"
                    onClick={addItem}
                    className="rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950"
                  >
                    Position hinzufügen
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {items.map(
                    (item, index) => {
                      const rowTotal =
                        money(
                          numberValue(
                            item.quantity,
                          ) *
                            numberValue(
                              item.unitPrice,
                            ),
                        );

                      return (
                        <div
                          key={item.id}
                          className="grid gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 xl:grid-cols-[2fr_1fr_120px_120px_140px_auto]"
                        >
                          <div>
                            <label className="text-xs text-zinc-500">
                              Position {index + 1}
                            </label>
                            <input className={`${inputClass} mt-1`} value={item.name} onChange={(event) => updateItem(item.id, "name", event.target.value)} />
                          </div>

                          <div>
                            <label className="text-xs text-zinc-500">
                              Beschreibung
                            </label>
                            <input className={`${inputClass} mt-1`} value={item.description} onChange={(event) => updateItem(item.id, "description", event.target.value)} />
                          </div>

                          <div>
                            <label className="text-xs text-zinc-500">
                              Einheit
                            </label>
                            <select className={`${inputClass} mt-1`} value={item.unit} onChange={(event) => updateItem(item.id, "unit", event.target.value)}>
                              {UNIT_OPTIONS.map(
                                (unit) => (
                                  <option key={unit} value={unit}>
                                    {unit}
                                  </option>
                                ),
                              )}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs text-zinc-500">
                              Menge
                            </label>
                            <input className={`${inputClass} mt-1`} inputMode="decimal" value={item.quantity} onChange={(event) => updateItem(item.id, "quantity", event.target.value)} />
                          </div>

                          <div>
                            <label className="text-xs text-zinc-500">
                              Preis
                            </label>
                            <input className={`${inputClass} mt-1`} inputMode="decimal" value={item.unitPrice} onChange={(event) => updateItem(item.id, "unitPrice", event.target.value)} />
                          </div>

                          <div className="flex items-end gap-2">
                            <strong className="min-w-24 pb-3 text-right text-sm text-cyan-200">
                              {currency}{" "}
                              {rowTotal.toFixed(2)}
                            </strong>

                            <button
                              type="button"
                              onClick={() =>
                                removeItem(
                                  item.id,
                                )
                              }
                              disabled={
                                items.length <= 1
                              }
                              className="h-11 rounded-xl border border-red-400/30 px-3 text-red-200 disabled:opacity-30"
                            >
                              Löschen
                            </button>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <input className={inputClass} value={estimate.travelFee} onChange={(event) => updateEstimate("travelFee", event.target.value)} placeholder="Anfahrt CHF" />
                  <input className={inputClass} value={estimate.materialFee} onChange={(event) => updateEstimate("materialFee", event.target.value)} placeholder="Material CHF" />
                  <input className={inputClass} value={estimate.discountAmount} onChange={(event) => updateEstimate("discountAmount", event.target.value)} placeholder="Rabatt CHF" />
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4 sm:grid-cols-2">
                  <div>
                    <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                      Zwischensumme
                    </span>
                    <p className="mt-1 text-xl font-black">
                      {currency}{" "}
                      {subtotal.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                      Endpreis
                    </span>
                    <p className="mt-1 text-3xl font-black text-cyan-200">
                      {currency}{" "}
                      {total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="text-xl font-black">
                    Notizen
                  </h3>

                  <textarea className={`${textAreaClass} mt-4`} value={estimate.notesCustomer} onChange={(event) => updateEstimate("notesCustomer", event.target.value)} placeholder="Notiz für Kunde / Offerte" />
                  <textarea className={`${textAreaClass} mt-3`} value={estimate.notesInternal} onChange={(event) => updateEstimate("notesInternal", event.target.value)} placeholder="Interne Notiz" />
                </div>

                <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
                  <h3 className="text-xl font-black text-amber-50">
                    Fotos anfordern
                  </h3>

                  <p className="mt-2 text-sm text-amber-100/70">
                    Der Kunde antwortet auf die E-Mail und sendet die Fotos als Anhang.
                  </p>

                  <input className={`${inputClass} mt-4`} value={photoSubject} onChange={(event) => setPhotoSubject(event.target.value)} placeholder="Betreff" />

                  <textarea className={`${textAreaClass} mt-3 min-h-52`} value={photoMessage} onChange={(event) => setPhotoMessage(event.target.value)} />
                </div>
              </section>

              {message ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    status === "error"
                      ? "border-red-400/30 bg-red-500/10 text-red-100"
                      : "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                  }`}
                >
                  {message}
                </div>
              ) : null}
            </div>

            <div className="sticky bottom-0 flex flex-col gap-3 rounded-b-3xl border-t border-white/10 bg-[#07101c]/95 p-5 backdrop-blur sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="rounded-xl border border-white/10 px-5 py-3 font-bold text-zinc-300"
              >
                Abbrechen
              </button>

              <button
                type="button"
                disabled={
                  status === "saving"
                }
                onClick={() =>
                  void submit("SAVE")
                }
                className="rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-5 py-3 font-black text-cyan-100 disabled:opacity-50"
              >
                Änderungen speichern
              </button>

              <button
                type="button"
                disabled={
                  status === "saving"
                }
                onClick={() =>
                  void submit(
                    "REQUEST_PHOTOS",
                  )
                }
                className="rounded-xl bg-amber-300 px-5 py-3 font-black text-slate-950 disabled:opacity-50"
              >
                Speichern und Fotos anfordern
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
