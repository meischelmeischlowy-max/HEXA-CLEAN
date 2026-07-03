"use client";

export default function EstimateOfferPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-2xl border border-cyan-600 bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-700"
    >
      Drucken / PDF
    </button>
  );
}