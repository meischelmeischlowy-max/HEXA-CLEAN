"use client";

import { motion } from "motion/react";

const contactItems = [
  {
    label: "Telefon",
    value: "+41 XX XXX XX XX",
    text: "Direkter Kontakt für schnelle Anfragen.",
  },
  {
    label: "E-Mail",
    value: "info@hexa-clean.ch",
    text: "Für Offerten, Termine und Rückfragen.",
  },
  {
    label: "Region",
    value: "Schweiz",
    text: "Reinigung, Hauswartung und Service vor Ort.",
  },
];

const services = [
  "Reinigung",
  "Hauswartung",
  "Gartenpflege",
  "Kleinreparaturen",
  "Express Service",
  "Umzugsreinigung",
];

export default function Contact() {
  return (
    <section
      id="kontakt"
      className="relative overflow-hidden bg-[#020711] px-6 py-28 text-white"
    >
      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(0,210,255,0.14),transparent_34%),radial-gradient(circle_at_80%_75%,rgba(0,90,255,0.16),transparent_34%),linear-gradient(180deg,#020711_0%,#04101f_52%,#020711_100%)]" />
      <div className="absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-[150px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* TITLE */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.85 }}
          className="mx-auto mb-16 max-w-3xl text-center"
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
            Kontakt
          </p>

          <h2 className="text-4xl font-semibold tracking-[-0.05em] md:text-6xl">
            Bereit für
            <span className="block bg-gradient-to-r from-cyan-200 via-white to-blue-300 bg-clip-text text-transparent">
              sichtbare Sauberkeit?
            </span>
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-300">
            Senden Sie eine Anfrage für Reinigung, Hauswartung, Gartenpflege
            oder Express Service. HEXA CLEAN meldet sich schnellstmöglich zurück.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          {/* LEFT CONTACT CARDS */}
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.85 }}
            className="space-y-5"
          >
            {contactItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-[32px] border border-white/12 bg-white/[0.045] p-6 shadow-[0_0_70px_rgba(0,200,255,0.08)] backdrop-blur-2xl transition duration-500 hover:border-cyan-200/35 hover:bg-white/[0.07]"
              >
                <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-cyan-300/0 blur-[70px] transition duration-700 group-hover:bg-cyan-300/18" />

                <div className="relative z-10">
                  <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
                    {item.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">
                    {item.value}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    {item.text}
                  </p>
                </div>
              </motion.div>
            ))}

            <div className="rounded-[32px] border border-cyan-200/15 bg-cyan-200/[0.06] p-6 backdrop-blur-2xl">
              <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">
                Leistungen
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {services.map((service) => (
                  <span
                    key={service}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* RIGHT FORM */}
          <motion.div
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.85 }}
            className="relative overflow-hidden rounded-[38px] border border-white/15 bg-white/[0.055] p-6 shadow-[0_0_90px_rgba(0,200,255,0.16)] backdrop-blur-2xl md:p-8"
          >
            <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-cyan-300/14 blur-[90px]" />

            <div className="relative z-10">
              <div className="mb-8">
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
                  Anfrageformular
                </p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                  Jetzt unverbindlich anfragen
                </h3>
              </div>

              <form className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Name
                    </label>
                    <input
                      type="text"
                      placeholder="Ihr Name"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none backdrop-blur-xl transition placeholder:text-slate-500 focus:border-cyan-300/50"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Telefon / E-Mail
                    </label>
                    <input
                      type="text"
                      placeholder="Kontaktangabe"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none backdrop-blur-xl transition placeholder:text-slate-500 focus:border-cyan-300/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Dienstleistung
                  </label>
                  <select className="w-full rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none backdrop-blur-xl transition focus:border-cyan-300/50">
                    <option>Reinigung</option>
                    <option>Hauswartung</option>
                    <option>Gartenpflege</option>
                    <option>Kleinreparaturen</option>
                    <option>Express Service</option>
                    <option>Umzugsreinigung</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Nachricht
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Beschreiben Sie kurz Ihre Anfrage..."
                    className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-white outline-none backdrop-blur-xl transition placeholder:text-slate-500 focus:border-cyan-300/50"
                  />
                </div>

                <button
                  type="button"
                  className="group relative w-full overflow-hidden rounded-full bg-cyan-300 px-8 py-4 text-sm font-semibold text-[#02101a] shadow-[0_0_45px_rgba(103,232,249,0.35)] transition hover:scale-[1.01]"
                >
                  <span className="relative z-10">Anfrage senden</span>
                  <span className="absolute inset-0 -translate-x-full bg-white/40 transition duration-700 group-hover:translate-x-full" />
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                Hinweis: Das Formular ist aktuell visuell vorbereitet. Die
                technische Verbindung kann später ergänzt werden.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}