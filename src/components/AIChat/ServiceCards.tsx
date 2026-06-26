"use client";

import { SERVICES, ServiceType } from "./types";
import { CheckCircle2 } from "lucide-react";

interface ServiceCardsProps {
  selectedService?: ServiceType;
  onSelectService: (service: ServiceType) => void;
}

export default function ServiceCards({
  selectedService,
  onSelectService,
}: ServiceCardsProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">
          Dienstleistung
        </h2>

        <span className="text-[10px] text-slate-500">
          1 / 5
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {SERVICES.map((service) => {
          const active = selectedService === service.id;

          return (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelectService(service.id)}
              className={`relative flex flex-col items-center rounded-lg border p-2 transition-all ${
                active
                  ? "border-cyan-400 bg-cyan-500/10"
                  : "border-white/10 bg-white/[0.02] hover:border-cyan-400/40"
              }`}
            >
              {active && (
                <CheckCircle2
                  size={12}
                  className="absolute right-1 top-1 text-cyan-300"
                />
              )}

              <div className="text-lg leading-none">
                {service.icon}
              </div>

              <span className="mt-1 text-[9px] leading-3 text-center text-white">
                {service.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}