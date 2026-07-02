"use client";

export default function EstimateOfferPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-cyan-400"
    >
      Drukuj / zapisz PDF
    </button>
  );
}