"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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

const services = [
  "Wohnung",
  "Haus",
  "Büro",
  "Fenster",
  "Garten",
  "Kleine Reparaturen",
];

const extras = [
  "Fenster",
  "Backofen",
  "Kühlschrank",
  "Balkon",
  "Keller",
  "Garage",
];

const whatsappNumber = "41762581948";

type SentStatus = "idle" | "success" | "partial" | "error";

type QuickOfferApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  emailSent?: boolean;
  crm?: {
    customerId?: string;
    sessionId?: string;
    orderId?: string;
    orderNumber?: string;
    estimateId?: string;
    estimateNumber?: string;
    notificationId?: string;
  };
};

function getErrorMessage(data: QuickOfferApiResponse | null) {
  if (data?.error) {
    return data.error;
  }

  if (data?.message) {
    return data.message;
  }

  return "Die Anfrage konnte nicht im CRM gespeichert werden.";
}

export default function QuickOffer() {
  const [service, setService] = useState("Wohnung");
  const [size, setSize] = useState(80);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [time, setTime] = useState("Diese Woche");
  const [analyzing, setAnalyzing] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [sentStatus, setSentStatus] = useState<SentStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [crmSummary, setCrmSummary] = useState<QuickOfferApiResponse["crm"] | null>(
    null,
  );

  const price = useMemo(() => {
    let base = 120;

    if (service === "Wohnung") base = size * 2.6;
    if (service === "Haus") base = size * 3.1;
    if (service === "Büro") base = size * 2.2;
    if (service === "Fenster") base = 140;
    if (service === "Garten") base = 180;
    if (service === "Kleine Reparaturen") base = 120;

    const extraPrice = selectedExtras.length * 35;
    const min = Math.round(base + extraPrice);
    const max = Math.round(min * 1.18);

    return `CHF ${min}–${max}`;
  }, [service, size, selectedExtras]);

  useEffect(() => {
    setAnalyzing(true);
    const timer = setTimeout(() => setAnalyzing(false), 500);
    return () => clearTimeout(timer);
  }, [service, size, selectedExtras, time]);

  function toggleExtra(extra: string) {
    setSelectedExtras((current) =>
      current.includes(extra)
        ? current.filter((item) => item !== extra)
        : [...current, extra],
    );
  }

  function buildMessage() {
    return `Hallo HEXA CLEAN.

Ich interessiere mich für eine Offerte.

Leistung: ${service}
Grösse: ${size} m²
Zusatzleistungen: ${
      selectedExtras.length > 0 ? selectedExtras.join(", ") : "Keine"
    }
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
    setSending(true);
    setSentStatus("idle");
    setStatusMessage("");
    setCrmSummary(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          contact,
          service,
          size,
          selectedExtras,
          time,
          price,
        }),
      });

      const data = (await response
        .json()
        .catch(() => null)) as QuickOfferApiResponse | null;

      if (!response.ok || !data?.success) {
        setSentStatus("error");
        setStatusMessage(getErrorMessage(data));
        return false;
      }

      setCrmSummary(data.crm ?? null);

      if (data.emailSent) {
        setSentStatus("success");
        setStatusMessage(
          "Anfrage wurde im CRM gespeichert. Die Benachrichtigung wurde gesendet. WhatsApp wurde geöffnet.",
        );
      } else {
        setSentStatus("partial");
        setStatusMessage(
          "Anfrage wurde im CRM gespeichert. Die E-Mail-Benachrichtigung muss später geprüft werden. WhatsApp wurde geöffnet.",
        );
      }

      return true;
    } catch {
      setSentStatus("error");
      setStatusMessage(
        "Serverfehler. Die Anfrage konnte nicht im CRM gespeichert werden.",
      );

      return false;
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit() {
    await sendQuickOfferToCrm();
    sendWhatsApp();
  }

  const optionClass =
    "rounded-xl border px-3 py-3 text-left text-sm font-semibold transition hover:scale-[1.015]";

  return (
    <section
      id="quick-offer"
      className="relative scroll-mt-24 overflow-hidden bg-[#020711] px-6 py-20 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(34,211,238,0.16),transparent_36%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_75%,rgba(34,211,238,0.1),transparent_30%)]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
          className="mb-8 max-w-2xl"
        >
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
            <Sparkles size={15} />
            Schnelle Offerte
          </p>

          <h2 className="text-3xl font-black tracking-[-0.05em] md:text-5xl">
            In wenigen Klicks zur
            <span className="block bg-gradient-to-r from-cyan-200 via-white to-cyan-400 bg-clip-text text-transparent">
              orientierenden Anfrage.
            </span>
          </h2>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, x: -24, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative overflow-hidden rounded-[26px] border border-cyan-300/20 bg-white/[0.05] p-5 shadow-[0_0_50px_rgba(0,220,255,0.12)] backdrop-blur-2xl"
          >
            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-black">
                <Calculator size={19} className="text-cyan-300" />
                Was brauchen Sie?
              </h3>

              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {services.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setService(item)}
                    className={`${optionClass} ${
                      service === item
                        ? "border-cyan-300 bg-cyan-300 text-[#02101b]"
                        : "border-white/10 bg-black/25 text-slate-300 hover:border-cyan-300/50 hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 rounded-[20px] border border-white/10 bg-black/20 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-black">Grösse</h3>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-sm font-black text-cyan-300">
                  {size} m²
                </span>
              </div>

              <input
                type="range"
                min="20"
                max="250"
                step="10"
                value={size}
                onChange={(event) => setSize(Number(event.target.value))}
                className="w-full accent-cyan-300"
              />
            </div>

            <div className="mb-6">
              <h3 className="mb-3 text-lg font-black">Zusatzleistungen</h3>

              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {extras.map((extra) => {
                  const active = selectedExtras.includes(extra);

                  return (
                    <button
                      key={extra}
                      type="button"
                      onClick={() => toggleExtra(extra)}
                      className={`${optionClass} flex items-center justify-between ${
                        active
                          ? "border-cyan-300 bg-cyan-300/15 text-cyan-200"
                          : "border-white/10 bg-black/25 text-slate-300 hover:border-cyan-300/50 hover:text-white"
                      }`}
                    >
                      {extra}
                      {active && <Check size={15} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-black">
                <Clock size={19} className="text-cyan-300" />
                Wann?
              </h3>

              <div className="grid gap-2 sm:grid-cols-3">
                {["Heute", "Diese Woche", "Flexibel"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTime(item)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      time === item
                        ? "border-cyan-300 bg-cyan-300 text-[#02101b]"
                        : "border-white/10 bg-black/25 text-slate-300 hover:border-cyan-300/50"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="relative overflow-hidden rounded-[26px] border border-cyan-300/25 bg-[#06111d]/90 p-5 shadow-[0_0_60px_rgba(0,220,255,0.18)] backdrop-blur-2xl"
          >
            <div className="relative z-10">
              <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-cyan-300">
                <Zap size={15} />
                HEXA Analyse
              </p>

              <div className="relative overflow-hidden rounded-[22px] border border-cyan-300/20 bg-black/30 p-5">
                <AnimatePresence mode="wait">
                  {analyzing ? (
                    <motion.div
                      key="analyzing"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <div className="mb-3 flex items-center gap-2 text-sm text-cyan-300">
                        <ScanLine className="animate-pulse" size={19} />
                        <span className="font-bold">Analyse läuft...</span>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-cyan-300"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="price"
                      initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <p className="text-xs text-slate-400">
                        Orientierende Preisspanne
                      </p>

                      <h3 className="mt-2 text-3xl font-black text-cyan-200 md:text-4xl">
                        {price}
                      </h3>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-400">
                Die finale Offerte erfolgt nach Prüfung der Angaben. Keine
                automatische verbindliche Preiszusage.
              </p>

              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-400">Leistung</span>
                  <span className="font-semibold">{service}</span>
                </div>

                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-400">Grösse</span>
                  <span className="font-semibold">{size} m²</span>
                </div>

                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-slate-400">Termin</span>
                  <span className="font-semibold">{time}</span>
                </div>

                <div className="border-b border-white/10 pb-2">
                  <span className="text-slate-400">Zusatzleistungen</span>
                  <p className="mt-1 font-semibold">
                    {selectedExtras.length > 0
                      ? selectedExtras.join(", ")
                      : "Keine"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                <input
                  placeholder="Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
                />

                <input
                  placeholder="Telefon oder E-Mail"
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
                />

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={sending}
                  className="group relative mt-1 overflow-hidden rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-[#02101b] shadow-[0_0_30px_rgba(0,220,255,0.42)] transition hover:scale-[1.02] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="relative">
                    {sending ? "Wird gespeichert..." : "Anfrage senden →"}
                  </span>
                </button>

                {sentStatus === "success" && (
                  <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-200">
                    <p>{statusMessage}</p>

                    {crmSummary?.orderNumber || crmSummary?.estimateNumber ? (
                      <p className="mt-1 text-cyan-100/80">
                        CRM: {crmSummary.orderNumber ?? "Order erstellt"} ·{" "}
                        {crmSummary.estimateNumber ?? "Estimate erstellt"}
                      </p>
                    ) : null}
                  </div>
                )}

                {sentStatus === "partial" && (
                  <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100">
                    <p>{statusMessage}</p>

                    {crmSummary?.orderNumber || crmSummary?.estimateNumber ? (
                      <p className="mt-1 text-amber-50/80">
                        CRM: {crmSummary.orderNumber ?? "Order erstellt"} ·{" "}
                        {crmSummary.estimateNumber ?? "Estimate erstellt"}
                      </p>
                    ) : null}
                  </div>
                )}

                {sentStatus === "error" && (
                  <p className="rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-200">
                    {statusMessage}
                  </p>
                )}

                <div className="mt-2 grid gap-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-cyan-300" />
                    Rückruf oder Kontakt nach Prüfung
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-cyan-300" />
                    Anfrage wird im CRM gespeichert und mit Benachrichtigung
                    verknüpft
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}