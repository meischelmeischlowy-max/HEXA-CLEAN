"use client";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#020711] px-6 py-12 text-white">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 border-t border-cyan-300/20 pt-8 md:flex-row md:items-center">
        <div>
          <div className="text-2xl font-black tracking-wide">
            HEXA<span className="text-cyan-300">CLEAN</span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Premium Reinigung, Hauswartung & Gartenpflege.
          </p>
        </div>

        <div className="flex flex-wrap gap-5 text-sm text-slate-500">
          <a href="#" className="hover:text-cyan-300">
            Impressum
          </a>
          <a href="#" className="hover:text-cyan-300">
            Datenschutz
          </a>
          <a href="#" className="hover:text-cyan-300">
            AGB
          </a>
        </div>

        <div className="text-sm text-slate-500">
          © 2026 HEXA CLEAN
        </div>
      </div>
    </footer>
  );
}