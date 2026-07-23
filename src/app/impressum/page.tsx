"use client";

import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-[#020711] px-5 py-16 text-white sm:px-6">
      <section className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_60px_rgba(0,220,255,0.08)] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
          Rechtliche Informationen
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          Impressum
        </h1>

        <div className="mt-8 space-y-8 text-sm leading-7 text-slate-300 sm:text-base">
          <section>
            <h2 className="text-xl font-bold text-white">
              HEXA CLEAN
            </h2>

            <p className="mt-3">
              Reinigungs- und Hauswartungsdienstleistungen
              <br />
              Pieterlen, Schweiz
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">
              Verantwortlich für den Inhalt
            </h2>

            <p className="mt-3">
              HEXA CLEAN
              <br />
              Telefon:{" "}
              <a
                href="tel:+41762581948"
                className="text-cyan-300 hover:text-cyan-200"
              >
                +41 76 258 19 48
              </a>
              <br />
              E-Mail:{" "}
              <a
                href="mailto:info@hexaclean.ch"
                className="text-cyan-300 hover:text-cyan-200"
              >
                info@hexaclean.ch
              </a>
            </p>
          </section>

          <section className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5">
            <h2 className="text-xl font-bold text-white">
              Website Design &amp; Development
            </h2>

            <p className="mt-3">
              MM Digital Studio
              <br />
              Michal Majewski
              <br />
              Bad Zurzach, Schweiz
              <br />
              E-Mail:{" "}
              <a
                href="mailto:meischel.meischlowy@gmail.com"
                className="text-cyan-300 hover:text-cyan-200"
              >
                meischel.meischlowy@gmail.com
              </a>
              <br />
              Website:{" "}
              <a
                href="https://mmdigitalstudio.ch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 hover:text-cyan-200"
              >
                mmdigitalstudio.ch
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white">
              Haftungsausschluss
            </h2>

            <p className="mt-3">
              Die Inhalte dieser Website wurden mit grösstmöglicher
              Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit
              und Aktualität der Inhalte kann jedoch keine Gewähr
              übernommen werden. Für externe Links übernehmen wir
              keine Haftung. Für den Inhalt verlinkter Seiten sind
              ausschliesslich deren Betreiber verantwortlich.
            </p>
          </section>
        </div>

        <Link
          href="/"
          className="mt-10 inline-flex rounded-xl border border-cyan-300/25 px-5 py-3 font-semibold text-cyan-200 transition hover:bg-cyan-300/10"
        >
          Zurück zur Startseite
        </Link>
      </section>
    </main>
  );
}
