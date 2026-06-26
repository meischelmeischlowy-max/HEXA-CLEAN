export default function AGBPage() {
  return (
    <main className="min-h-screen bg-[#020711] px-6 py-24 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-10 text-5xl font-bold">
          Allgemeine Geschäftsbedingungen (AGB)
        </h1>

        <div className="space-y-8 rounded-3xl border border-white/10 bg-white/[0.04] p-10">

          <section>
            <h2 className="mb-3 text-2xl font-semibold">
              1. Geltungsbereich
            </h2>

            <p className="leading-8 text-slate-300">
              Diese Allgemeinen Geschäftsbedingungen gelten für alle
              Dienstleistungen von HEXA CLEAN.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              2. Angebote
            </h2>

            <p className="leading-8 text-slate-300">
              Alle Angebote sind unverbindlich. Die endgültigen Preise werden
              nach Besichtigung oder auf Grundlage der vereinbarten Leistungen
              festgelegt.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              3. Zahlung
            </h2>

            <p className="leading-8 text-slate-300">
              Rechnungen sind innerhalb der vereinbarten Zahlungsfrist zu
              begleichen.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              4. Terminabsagen
            </h2>

            <p className="leading-8 text-slate-300">
              Vereinbarte Termine sollten mindestens 24 Stunden vorher
              abgesagt werden.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              5. Haftung
            </h2>

            <p className="leading-8 text-slate-300">
              Für Schäden haftet HEXA CLEAN ausschließlich im Rahmen der
              gesetzlichen Bestimmungen.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">
              6. Gerichtsstand
            </h2>

            <p className="leading-8 text-slate-300">
              Es gilt Schweizer Recht.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}