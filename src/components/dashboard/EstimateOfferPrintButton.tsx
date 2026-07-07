"use client";

export default function EstimateOfferPrintButton() {
  function handlePrint() {
    window.print();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      title="Dokument drucken oder als PDF speichern"
      className="rounded-2xl border border-cyan-600 bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 print:hidden"
    >
      Drucken / PDF speichern
    </button>
  );
}