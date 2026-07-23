export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-[#020711] px-6 py-24 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-10 text-5xl font-bold">
          DatenschutzerklĂ¤rung
        </h1>

        <div className="space-y-8 rounded-3xl border border-white/10 bg-white/[0.04] p-10">

          <section>
            <h2 className="mb-3 text-2xl font-semibold">
              Datenschutz
            </h2>

            <p className="leading-8 text-slate-300">
              Der Schutz Ihrer persĂ¶nlichen Daten ist uns wichtig. Personenbezogene
              Daten werden ausschlieĂźlich im Rahmen der gesetzlichen Vorschriften
              verarbeitet.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              Kontaktformular
            </h2>

            <p className="leading-8 text-slate-300">
              Wenn Sie unser Kontaktformular nutzen, werden die von Ihnen
              angegebenen Daten ausschlieĂźlich zur Bearbeitung Ihrer Anfrage
              verwendet und nicht an Dritte verkauft oder weitergegeben.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              E-Mail
            </h2>

            <p className="leading-8 text-slate-300">
              Kontaktanfragen per E-Mail werden nur zur Kommunikation mit Ihnen
              gespeichert, soweit dies zur Bearbeitung erforderlich ist.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              Cookies
            </h2>

            <p className="leading-8 text-slate-300">
              Diese Website verwendet technisch notwendige Cookies, um eine
              fehlerfreie Funktion der Website sicherzustellen.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              Google Maps
            </h2>

            <p className="leading-8 text-slate-300">
              Diese Website nutzt Google Maps zur Darstellung unseres
              Einsatzgebietes. Dabei kĂ¶nnen Daten an Google ĂĽbertragen werden.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              Kontakt
            </h2>

            <p>Michal Majewski</p>
            <p>Telefon: +41 76 258 19 48</p>
            <p>E-Mail: info@hexaclean.ch</p>
          </section>

        </div>
      </div>
    </main>
  );
}
