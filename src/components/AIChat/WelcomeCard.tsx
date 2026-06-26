"use client";

import Image from "next/image";
import { ShieldCheck, Star } from "lucide-react";

export default function WelcomeCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">

      <div className="flex flex-col items-center text-center">

        <div className="relative mb-5 h-56 w-full overflow-hidden rounded-2xl">

          <Image
            src="/team/michal-monika.webp"
            alt="Michal und Monika"
            fill
            className="object-cover"
            priority
          />

        </div>

        <h2 className="text-2xl font-bold text-white">
          Willkommen!
        </h2>

        <p className="mt-3 text-slate-300">
          Wir sind
        </p>

        <h3 className="mt-1 text-xl font-semibold text-cyan-300">
          Michal &amp; Monika
        </h3>

        <p className="mt-4 max-w-sm leading-7 text-slate-400">
          Ihr persönliches HEXA CLEAN Team.
          Wir helfen Ihnen schnell, freundlich und professionell
          bei allen Fragen rund um Reinigung,
          Hauswartung und Kleinreparaturen.
        </p>

        <div className="mt-6 flex items-center gap-1 text-yellow-400">

          <Star fill="currentColor" size={18} />
          <Star fill="currentColor" size={18} />
          <Star fill="currentColor" size={18} />
          <Star fill="currentColor" size={18} />
          <Star fill="currentColor" size={18} />

        </div>

        <p className="mt-2 text-sm text-slate-500">
          Persönliche Beratung mit AI-Unterstützung
        </p>

        <div className="mt-6 flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-5 py-3">

          <ShieldCheck
            className="text-cyan-300"
            size={22}
          />

          <span className="text-sm font-medium text-cyan-200">
            Sichere Kommunikation
          </span>

        </div>

      </div>
    </div>
  );
}