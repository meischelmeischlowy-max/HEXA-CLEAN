export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-[#020711] px-6 py-24 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-10 text-5xl font-bold">
          Impressum
        </h1>

        <div className="space-y-8 rounded-3xl border border-white/10 bg-white/[0.04] p-10">
          <section>
            <h2 className="mb-3 text-2xl font-semibold">
              HEXA CLEAN
            </h2>

            <p>Projekt in Vorbereitung</p>
            <p>Pieterlen, Schweiz</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              Verantwortlich
            </h2>

            <p>Michal Majewski</p>
            <p>Telefon: +41 76 258 19 48</p>
            <p>E-Mail: meischel.meischlowy@gmail.com</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              Website Design & Development
            </h2>

            <p>MM Digital Studio</p>
            <p>Pieterlen, Schweiz</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              Haftungsausschluss
            </h2>

            <p className="leading-8 text-slate-300">
              Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt
              erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der
              Inhalte übernehmen wir jedoch keine Gewähr. Für externe Links
              übernehmen wir keine Haftung. Für den Inhalt der verlinkten Seiten
              sind ausschließlich deren Betreiber verantwortlich.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}