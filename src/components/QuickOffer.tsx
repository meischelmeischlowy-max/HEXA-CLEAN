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

export default function QuickOffer() {
  const [service, setService] = useState("Wohnung");
  const [size, setSize] = useState(80);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [time, setTime] = useState("Diese Woche");
  const [analyzing, setAnalyzing] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [sentStatus, setSentStatus] = useState<"idle" | "success" | "error">(
    "idle"
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
    const timer = setTimeout(() => setAnalyzing(false), 650);
    return () => clearTimeout(timer);
  }, [service, size, selectedExtras, time]);

  function toggleExtra(extra: string) {
    setSelectedExtras((current) =>
      current.includes(extra)
        ? current.filter((item) => item !== extra)
        : [...current, extra]
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
        buildMessage()
      )}`,
      "_blank"
    );
  }

  async function sendEmail() {
    setSending(true);
    setSentStatus("idle");

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

      if (!response.ok) {
        setSentStatus("error");
        return;
      }

      setSentStatus("success");
    } catch {
      setSentStatus("error");
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit() {
    await sendEmail();
    sendWhatsApp();
  }

  const optionClass =
    "rounded-2xl border px-4 py-4 text-left font-semibold transition hover:scale-[1.02]";

  return (
    <section
      id="quick-offer"
      className="scroll-mt-28 relative overflow-hidden bg-[#020711] px-6 py-32 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(34,211,238,0.18),transparent_38%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_75%,rgba(34,211,238,0.12),transparent_32%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 34, filter: "blur(14px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-14 max-w-3xl"
        >
          <p className="mb-4 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.4em] text-cyan-300">
            <Sparkles size={18} />
            Schnelle Offerte
          </p>

          <h2 className="text-4xl font-black tracking-[-0.05em] md:text-6xl">
            In wenigen Klicks zur
            <span className="block bg-gradient-to-r from-cyan-200 via-white to-cyan-400 bg-clip-text text-transparent">
              orientierenden Anfrage.
            </span>
          </h2>
        </motion.div>

        <div className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div
            initial={{ opacity: 0, x: -35, filter: "blur(14px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.85 }}
            className="relative overflow-hidden rounded-[36px] border border-cyan-300/20 bg-white/[0.05] p-7 shadow-[0_0_70px_rgba(0,220,255,0.14)] backdrop-blur-2xl"
          >
            <div className="mb-9">
              <h3 className="mb-4 flex items-center gap-3 text-xl font-black">
                <Calculator size={22} className="text-cyan-300" />
                Was brauchen Sie?
              </h3>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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

            <div className="mb-9 rounded-[26px] border border-white/10 bg-black/20 p-5">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xl font-black">Grösse</h3>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 font-black text-cyan-300">
                  {size} m²
                </span>
              </div>

              <input
                type="range"
                min="20"
                max="250"
                step="10"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full accent-cyan-300"
              />
            </div>

            <div className="mb-9">
              <h3 className="mb-4 text-xl font-black">Zusatzleistungen</h3>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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
                      {active && <Check size={17} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-4 flex items-center gap-3 text-xl font-black">
                <Clock size={22} className="text-cyan-300" />
                Wann?
              </h3>

              <div className="grid gap-3 sm:grid-cols-3">
                {["Heute", "Diese Woche", "Flexibel"].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTime(item)}
                    className={`rounded-2xl border px-4 py-4 font-semibold transition ${
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
            initial={{ opacity: 0, x: 35, filter: "blur(14px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.85, delay: 0.1 }}
            className="relative overflow-hidden rounded-[36px] border border-cyan-300/25 bg-[#06111d]/90 p-7 shadow-[0_0_90px_rgba(0,220,255,0.22)] backdrop-blur-2xl"
          >
            <div className="relative z-10">
              <p className="mb-4 flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-cyan-300">
                <Zap size={17} />
                HEXA Analyse
              </p>

              <div className="relative overflow-hidden rounded-[28px] border border-cyan-300/20 bg-black/30 p-6">
                <AnimatePresence mode="wait">
                  {analyzing ? (
                    <motion.div
                      key="analyzing"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="mb-4 flex items-center gap-3 text-cyan-300">
                        <ScanLine className="animate-pulse" size={22} />
                        <span className="font-bold">Analyse läuft...</span>
                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-cyan-300"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="price"
                      initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: -14 }}
                    >
                      <p className="text-sm text-slate-400">
                        Orientierende Preisspanne
                      </p>

                      <h3 className="mt-2 text-4xl font-black text-cyan-200 md:text-5xl">
                        {price}
                      </h3>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-400">
                Die finale Offerte erfolgt nach Prüfung der Angaben. Keine
                automatische verbindliche Preiszusage.
              </p>

              <div className="mt-8 grid gap-4 text-sm">
                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-slate-400">Leistung</span>
                  <span className="font-semibold">{service}</span>
                </div>

                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-slate-400">Grösse</span>
                  <span className="font-semibold">{size} m²</span>
                </div>

                <div className="flex justify-between border-b border-white/10 pb-3">
                  <span className="text-slate-400">Termin</span>
                  <span className="font-semibold">{time}</span>
                </div>

                <div className="border-b border-white/10 pb-3">
                  <span className="text-slate-400">Zusatzleistungen</span>
                  <p className="mt-2 font-semibold">
                    {selectedExtras.length > 0
                      ? selectedExtras.join(", ")
                      : "Keine"}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-3">
                <input
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-4 outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
                />

                <input
                  placeholder="Telefon oder E-Mail"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-4 outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
                />

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={sending}
                  className="group relative mt-2 overflow-hidden rounded-xl bg-cyan-300 px-6 py-4 font-black text-[#02101b] shadow-[0_0_40px_rgba(0,220,255,0.5)] transition hover:scale-[1.03] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="relative">
                    {sending ? "Wird gesendet..." : "Anfrage senden →"}
                  </span>
                </button>

                {sentStatus === "success" && (
                  <p className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-200">
                    Anfrage wurde per E-Mail gesendet. WhatsApp wurde geöffnet.
                  </p>
                )}

                {sentStatus === "error" && (
                  <p className="rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
                    E-Mail konnte nicht gesendet werden. WhatsApp wurde trotzdem
                    geöffnet.
                  </p>
                )}

                <div className="mt-3 grid gap-2 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <Phone size={15} className="text-cyan-300" />
                    Rückruf oder Kontakt nach Prüfung
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-cyan-300" />
                    Anfrage später mit E-Mail / Make verbindbar
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