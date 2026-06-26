"use client";

import { MapPin, Navigation } from "lucide-react";

const places = [
  "Pieterlen",
  "Biel/Bienne",
  "Nidau",
  "Lyss",
  "Grenchen",
  "Solothurn",
  "Bern",
  "Aarberg",
];

export default function ServiceArea() {
  return (
    <section id="gebiet" className="py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">
            Einsatzgebiet
          </p>
          <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
            Wir sind in Ihrer Region unterwegs
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-white/70">
            HEXA CLEAN bietet professionelle Reinigung, Hauswartung und kleine
            Reparaturen in Pieterlen, Biel/Bienne und Umgebung.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <div className="mb-6 flex items-center gap-3">
              <MapPin className="h-6 w-6 text-cyan-400" />
              <h3 className="text-xl font-semibold text-white">
                Region HEXA CLEAN
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {places.map((place) => (
                <div
                  key={place}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-center text-sm text-white/80"
                >
                  {place}
                </div>
              ))}
            </div>

            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Pieterlen%2C%20Schweiz"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-3 font-semibold text-black transition hover:bg-cyan-300"
            >
              <Navigation className="h-5 w-5" />
              Route planen
            </a>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
            <iframe
              title="HEXA CLEAN Einsatzgebiet"
              src="https://www.google.com/maps?q=Pieterlen%2C%20Schweiz&output=embed"
              className="h-[420px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}