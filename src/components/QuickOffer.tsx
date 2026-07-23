"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
} from "motion/react";
import {
  Calculator,
  Check,
  Clock,
  Mail,
  Phone,
  ScanLine,
  Sparkles,
  Zap,
} from "lucide-react";

import QuickOfferPhotoUpload from "./QuickOfferPhotoUpload";
import {
  calculateQuickOfferPrice,
} from "@/lib/quick-offer-pricing";

const services = [
  "Unterhaltsreinigung",
  "Grundreinigung",
  "Umzugsreinigung",
  "Hausreinigung",
  "Buero",
  "Fenster",
  "Garten",
  "Kleine Reparaturen",
];

const extras = [
  "Fenster",
  "Backofen",
  "Kuehlschrank",
  "Balkon",
  "Keller",
  "Garage",
  "Storen",
];

const whatsappNumber =
  "41762581948";

type SentStatus =
  | "idle"
  | "success"
  | "partial"
  | "error";

type QuickOfferApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  emailSent?: boolean;
  ownerEmailSent?: boolean;
  customerEmailSent?: boolean;
  customerEmailSkipped?: boolean;
  customerEmailError?: string | null;
  crm?: {
    orderNumber?: string;
    estimateNumber?: string;
  };
};

function getErrorMessage(
  data: QuickOfferApiResponse | null,
) {
  return (
    data?.error ??
    data?.message ??
    "Die Anfrage konnte nicht im CRM gespeichert werden."
  );
}

export default function QuickOffer() {
  const [service, setService] =
    useState("Grundreinigung");

  const [size, setSize] =
    useState(80);

  const [rooms, setRooms] =
    useState(3.5);

  const [
    bathrooms,
    setBathrooms,
  ] = useState(1);

  const [
    condition,
    setCondition,
  ] = useState("NORMAL");

  const [
    frequency,
    setFrequency,
  ] = useState("EINMALIG");

  const [
    selectedExtras,
    setSelectedExtras,
  ] = useState<string[]>([]);

  const [time, setTime] =
    useState("Diese Woche");

  const [analyzing, setAnalyzing] =
    useState(false);

  const [name, setName] =
    useState("");

  const [contact, setContact] =
    useState("");

  const [photos, setPhotos] =
    useState<File[]>([]);

  const [sending, setSending] =
    useState(false);

  const [
    sentStatus,
    setSentStatus,
  ] = useState<SentStatus>("idle");

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  const [
    crmSummary,
    setCrmSummary,
  ] =
    useState<
      QuickOfferApiResponse["crm"] | null
    >(null);

  const calculation = useMemo(
    () =>
      calculateQuickOfferPrice({
        service,
        size,
        rooms,
        bathrooms,
        condition,
        frequency,
        selectedExtras,
        photoCount: photos.length,
      }),
    [
      service,
      size,
      rooms,
      bathrooms,
      condition,
      frequency,
      selectedExtras,
      photos.length,
    ],
  );

  const price =
    `CHF ${calculation.min}–${calculation.max}`;

  useEffect(() => {
    const startTimer =
      window.setTimeout(
        () => setAnalyzing(true),
        0,
      );

    const stopTimer =
      window.setTimeout(
        () => setAnalyzing(false),
        350,
      );

    return () => {
      window.clearTimeout(
        startTimer,
      );
      window.clearTimeout(
        stopTimer,
      );
    };
  }, [
    service,
    size,
    rooms,
    bathrooms,
    condition,
    frequency,
    selectedExtras,
    photos.length,
    time,
  ]);

  function toggleExtra(
    extra: string,
  ) {
    setSelectedExtras(
      (current) =>
        current.includes(extra)
          ? current.filter(
              (item) =>
                item !== extra,
            )
          : [...current, extra],
    );
  }

  function buildMessage() {
    return `Hallo HEXA CLEAN.

Ich interessiere mich für eine Offerte.

Leistung: ${service}
Fläche: ${size} m²
Zimmer: ${rooms}
Bäder: ${bathrooms}
Zustand: ${condition}
Rhythmus: ${frequency}
Zusatzleistungen: ${
      selectedExtras.length > 0
        ? selectedExtras.join(", ")
        : "Keine"
    }
Fotos: ${photos.length}
Termin: ${time}
Orientierende Preisspanne: ${price}

Name: ${name || "-"}
Kontakt: ${contact || "-"}`;
  }

  function sendWhatsApp() {
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        buildMessage(),
      )}`,
      "_blank",
    );
  }

  async function sendQuickOfferToCrm() {
    if (!contact.trim()) {
      setSentStatus("error");
      setStatusMessage(
        "Bitte geben Sie eine Telefonnummer oder E-Mail-Adresse ein.",
      );
      return;
    }

    if (
      calculation.requiresPhotoReview &&
      photos.length === 0
    ) {
      setSentStatus("error");
      setStatusMessage(
        "Für diese Dienstleistung ist mindestens ein Foto für die visuelle Prüfung erforderlich.",
      );
      return;
    }

    setSending(true);
    setSentStatus("idle");
    setStatusMessage("");
    setCrmSummary(null);

    try {
      const formData =
        new FormData();

      formData.set(
        "payload",
        JSON.stringify({
          name,
          contact,
          service,
          size,
          rooms,
          bathrooms,
          condition,
          frequency,
          selectedExtras,
          time,
          price,
          calculatedMinPrice:
            calculation.min,
          calculatedMaxPrice:
            calculation.max,
          pricingConfidence:
            calculation.confidence,
          requiresPhotoReview:
            calculation.requiresPhotoReview,
        }),
      );

      for (const photo of photos) {
        formData.append("photos", photo, photo.name);
      }

      const response = await fetch(
        "/api/contact",
        {
          method: "POST",
          cache: "no-store",
          body: formData,
        },
      );

      const data = (await response
        .json()
        .catch(() => null)) as
        | QuickOfferApiResponse
        | null;

      if (
        !response.ok ||
        !data?.success
      ) {
        setSentStatus("error");
        setStatusMessage(
          getErrorMessage(data),
        );
        return;
      }

      setCrmSummary(
        data.crm ?? null,
      );

      if (
        data.ownerEmailSent &&
        data.customerEmailSent
      ) {
        setSentStatus("success");
        setStatusMessage(
          "Anfrage und Fotos wurden gespeichert. Sie erhalten eine Bestätigung. HEXA CLEAN prüft die Angaben und Bilder vor der verbindlichen Offerte.",
        );
      } else {
        setSentStatus("partial");
        setStatusMessage(
          "Anfrage und Fotos wurden im CRM gespeichert. Die Benachrichtigungen werden im System geprüft.",
        );
      }
    } catch {
      setSentStatus("error");
      setStatusMessage(
        "Serverfehler. Die Anfrage konnte nicht gespeichert werden.",
      );
    } finally {
      setSending(false);
    }
  }

  const optionClass =
    "rounded-xl border px-3 py-3 text-left text-sm font-semibold transition hover:scale-[1.01]";

  return (
    <section
      id="quick-offer"
      className="relative scroll-mt-24 overflow-hidden bg-[#020711] px-5 py-16 text-white sm:px-6 sm:py-20"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(34,211,238,0.16),transparent_36%)]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
            <Sparkles size={15} />
            Unverbindliche Orientierung
          </p>

          <h2 className="text-3xl font-black tracking-[-0.05em] md:text-5xl">
            Realistische Preisspanne
            <span className="block text-cyan-300">
              vor der persönlichen Prüfung.
            </span>
          </h2>

          <p className="mt-4 text-sm leading-6 text-slate-300">
            Die Berechnung berücksichtigt
            Dienstleistung, Fläche,
            Zimmer, Bäder, Zustand,
            Rhythmus und Zusatzleistungen.
            Die verbindliche Offerte entsteht
            erst nach visueller Prüfung der
            Fotos und Angaben.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[26px] border border-cyan-300/20 bg-white/[0.05] p-5">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-black">
              <Calculator
                size={19}
                className="text-cyan-300"
              />
              Angaben zum Auftrag
            </h3>

            <div className="grid gap-2 sm:grid-cols-2">
              {services.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setService(item)
                  }
                  className={`${optionClass} ${
                    service === item
                      ? "border-cyan-300 bg-cyan-300 text-[#02101b]"
                      : "border-white/10 bg-black/25 text-slate-300"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                <span className="text-slate-400">
                  Fläche
                </span>
                <strong className="float-right text-cyan-200">
                  {size} m²
                </strong>
                <input
                  type="range"
                  min="20"
                  max="300"
                  step="10"
                  value={size}
                  onChange={(event) =>
                    setSize(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  className="mt-4 w-full accent-cyan-300"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-slate-400">
                  Zimmer
                </span>
                <select
                  value={rooms}
                  onChange={(event) =>
                    setRooms(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  className="h-12 rounded-xl border border-white/10 bg-[#07111d] px-3 text-white"
                >
                  {[
                    1,
                    1.5,
                    2.5,
                    3.5,
                    4.5,
                    5.5,
                    6.5,
                  ].map((value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value} Zimmer
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-slate-400">
                  Badezimmer
                </span>
                <select
                  value={bathrooms}
                  onChange={(event) =>
                    setBathrooms(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  className="h-12 rounded-xl border border-white/10 bg-[#07111d] px-3 text-white"
                >
                  {[1, 2, 3, 4].map(
                    (value) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {value}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                <span className="text-slate-400">
                  Verschmutzung
                </span>
                <select
                  value={condition}
                  onChange={(event) =>
                    setCondition(
                      event.target.value,
                    )
                  }
                  className="h-12 rounded-xl border border-white/10 bg-[#07111d] px-3 text-white"
                >
                  <option value="LEICHT">
                    Leicht
                  </option>
                  <option value="NORMAL">
                    Normal
                  </option>
                  <option value="STARK">
                    Stark
                  </option>
                </select>
              </label>

              <label className="grid gap-2 text-sm sm:col-span-2">
                <span className="text-slate-400">
                  Rhythmus
                </span>
                <select
                  value={frequency}
                  onChange={(event) =>
                    setFrequency(
                      event.target.value,
                    )
                  }
                  className="h-12 rounded-xl border border-white/10 bg-[#07111d] px-3 text-white"
                >
                  <option value="EINMALIG">
                    Einmalig
                  </option>
                  <option value="WOECHENTLICH">
                    Wöchentlich
                  </option>
                  <option value="ZWEIWOECHENTLICH">
                    Alle zwei Wochen
                  </option>
                  <option value="MONATLICH">
                    Monatlich
                  </option>
                </select>
              </label>
            </div>

            <h3 className="mb-3 mt-6 font-black">
              Zusatzleistungen
            </h3>

            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {extras.map((extra) => {
                const active =
                  selectedExtras.includes(
                    extra,
                  );

                return (
                  <button
                    key={extra}
                    type="button"
                    onClick={() =>
                      toggleExtra(extra)
                    }
                    className={`${optionClass} flex items-center justify-between ${
                      active
                        ? "border-cyan-300 bg-cyan-300/15 text-cyan-200"
                        : "border-white/10 bg-black/25 text-slate-300"
                    }`}
                  >
                    {extra}
                    {active ? (
                      <Check size={15} />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <h3 className="mb-3 mt-6 flex items-center gap-2 font-black">
              <Clock
                size={18}
                className="text-cyan-300"
              />
              Gewünschter Zeitraum
            </h3>

            <div className="grid gap-2 sm:grid-cols-3">
              {[
                "Heute",
                "Diese Woche",
                "Flexibel",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setTime(item)
                  }
                  className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                    time === item
                      ? "border-cyan-300 bg-cyan-300 text-[#02101b]"
                      : "border-white/10 bg-black/25 text-slate-300"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-cyan-300/25 bg-[#06111d]/90 p-5">
            <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-cyan-300">
              <Zap size={15} />
              Preisorientierung
            </p>

            <div className="rounded-[22px] border border-cyan-300/20 bg-black/30 p-5">
              <AnimatePresence mode="wait">
                {analyzing ? (
                  <motion.div
                    key="analysis"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex items-center gap-2 text-sm text-cyan-300">
                      <ScanLine
                        className="animate-pulse"
                        size={19}
                      />
                      Berechnung wird aktualisiert...
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="price"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <p className="text-xs text-slate-400">
                      Unverbindliche Preisspanne
                    </p>

                    <h3 className="mt-2 text-3xl font-black text-cyan-200 md:text-4xl">
                      {price}
                    </h3>

                    <p className="mt-2 text-xs text-slate-400">
                      Schätzsicherheit:{" "}
                      {calculation.confidence ===
                      "MEDIUM"
                        ? "mit Fotos verbessert"
                        : "vorläufig"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ul className="mt-4 space-y-2 text-xs leading-5 text-slate-400">
              {calculation.explanation.map(
                (line) => (
                  <li
                    key={line}
                    className="flex gap-2"
                  >
                    <span className="text-cyan-300">
                      •
                    </span>
                    {line}
                  </li>
                ),
              )}
            </ul>

            <div className="mt-5 grid gap-2">
              <input
                placeholder="Name"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm outline-none focus:border-cyan-300/60"
              />

              <input
                placeholder="Telefon oder E-Mail"
                value={contact}
                onChange={(event) =>
                  setContact(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm outline-none focus:border-cyan-300/60"
              />

              <QuickOfferPhotoUpload
                files={photos}
                disabled={sending}
                onChange={setPhotos}
              />

              {calculation.requiresPhotoReview &&
              photos.length === 0 ? (
                <p className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                  Für diese Leistung ist
                  mindestens ein Foto zur
                  visuellen Prüfung erforderlich.
                </p>
              ) : null}

              <button
                type="button"
                onClick={
                  sendQuickOfferToCrm
                }
                disabled={sending}
                className="mt-1 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-[#02101b] transition hover:bg-white disabled:opacity-60"
              >
                {sending
                  ? "Wird gespeichert..."
                  : "Anfrage mit Fotos senden"}
              </button>

              {sentStatus !== "idle" ? (
                <div
                  className={`rounded-xl border px-3 py-2 text-xs leading-5 ${
                    sentStatus === "error"
                      ? "border-red-400/25 bg-red-400/10 text-red-200"
                      : sentStatus === "partial"
                        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                        : "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
                  }`}
                >
                  <p>{statusMessage}</p>

                  {crmSummary?.orderNumber ? (
                    <p className="mt-1 text-white/70">
                      Anfrage:{" "}
                      {
                        crmSummary.orderNumber
                      }
                    </p>
                  ) : null}
                </div>
              ) : null}

              {sentStatus === "success" ||
              sentStatus === "partial" ? (
                <button
                  type="button"
                  onClick={sendWhatsApp}
                  className="rounded-xl border border-white/10 bg-black/30 px-5 py-3 text-sm font-bold text-slate-200"
                >
                  Optional zusätzlich per
                  WhatsApp senden
                </button>
              ) : null}

              <div className="mt-2 grid gap-2 text-xs text-slate-400">
                <p className="flex items-center gap-2">
                  <Phone
                    size={13}
                    className="text-cyan-300"
                  />
                  Rückruf oder E-Mail nach Prüfung
                </p>

                <p className="flex items-center gap-2">
                  <Mail
                    size={13}
                    className="text-cyan-300"
                  />
                  Fotos werden sicher im CRM
                  gespeichert
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
