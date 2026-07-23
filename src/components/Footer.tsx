"use client";

import {
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#020711] px-6 py-16 text-white">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-4">
        <div>
          <h2 className="text-3xl font-black tracking-wide">
            HEXA<span className="text-cyan-300">CLEAN</span>
          </h2>

          <p className="mt-5 text-sm leading-7 text-slate-400">
            Professionelle Reinigung, Hauswartung,
            Fensterreinigung, Umzugsreinigung und
            Kleinreparaturen.
          </p>
        </div>

        <div>
          <h3 className="mb-5 text-lg font-semibold">
            Kontakt
          </h3>

          <div className="space-y-4 text-sm">
            <a
              href="tel:+41762581948"
              className="flex items-center gap-3 text-slate-400 transition hover:text-cyan-300"
            >
              <Phone className="h-5 w-5 text-cyan-300" />
              +41 76 258 19 48
            </a>

            <a
              href="mailto:info@hexaclean.ch"
              className="flex items-center gap-3 text-slate-400 transition hover:text-cyan-300"
            >
              <Mail className="h-5 w-5 shrink-0 text-cyan-300" />
              info@hexaclean.ch
            </a>

            <a
              href="https://wa.me/41762581948"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-slate-400 transition hover:text-cyan-300"
            >
              <MessageCircle className="h-5 w-5 text-cyan-300" />
              WhatsApp
            </a>

            <div className="flex items-center gap-3 text-slate-400">
              <MapPin className="h-5 w-5 text-cyan-300" />
              Pieterlen • Biel/Bienne
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-5 text-lg font-semibold">
            Öffnungszeiten
          </h3>

          <div className="space-y-3 text-sm text-slate-400">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-cyan-300" />
              Montag – Freitag
            </div>

            <p>08:00 – 18:00</p>
            <p>Samstag nach Vereinbarung</p>
            <p>Sonntag geschlossen</p>
          </div>
        </div>

        <div>
          <h3 className="mb-5 text-lg font-semibold">
            Informationen
          </h3>

          <div className="flex flex-col gap-3 text-sm">
            <a
              href="/impressum"
              className="text-slate-400 transition hover:text-cyan-300"
            >
              Impressum
            </a>

            <a
              href="/datenschutz"
              className="text-slate-400 transition hover:text-cyan-300"
            >
              Datenschutz
            </a>

            <a
              href="/agb"
              className="text-slate-400 transition hover:text-cyan-300"
            >
              AGB
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-8 text-center text-sm text-slate-500">
        <p>© 2026 HEXA CLEAN • Alle Rechte vorbehalten.</p>

        <a
          href="https://mmdigitalstudio.ch"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block font-medium text-cyan-300 transition hover:text-cyan-200"
        >
          Designed &amp; Developed by MM Digital Studio
        </a>
      </div>
    </footer>
  );
}
