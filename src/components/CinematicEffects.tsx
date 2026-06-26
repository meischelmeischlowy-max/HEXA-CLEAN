"use client";

export default function CinematicEffects() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* MOBILE — efekt bez animacji */}
      <div className="absolute inset-0 md:hidden">
        <div className="absolute left-[-35%] top-[-5%] h-[420px] w-[420px] rounded-full bg-cyan-400/22 blur-[75px]" />
        <div className="absolute right-[-30%] bottom-[5%] h-[360px] w-[360px] rounded-full bg-cyan-300/16 blur-[65px]" />
        <div className="absolute left-[10%] top-[42%] h-[160px] w-[160px] rounded-full bg-white/10 blur-[45px]" />

        <div className="absolute left-0 top-[52%] h-px w-full bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent shadow-[0_0_18px_rgba(34,211,238,.55)]" />

        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_35%,transparent_28%,rgba(0,0,0,.65)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/85 to-transparent" />
      </div>

      {/* DESKTOP */}
      <div className="hidden md:block">
        <div className="absolute left-[-18%] top-[4%] h-[620px] w-[620px] rounded-full bg-cyan-400/18 blur-[150px]" />
        <div className="absolute right-[-12%] top-[34%] h-[460px] w-[460px] rounded-full bg-cyan-200/10 blur-[140px]" />
        <div className="absolute bottom-[-150px] left-[-25%] h-[360px] w-[160%] bg-white/8 blur-[85px]" />
        <div className="absolute bottom-[-40px] left-[-35%] h-[260px] w-[180%] bg-cyan-200/8 blur-[100px]" />
        <div className="absolute bottom-[18%] left-[-20%] h-[180px] w-[140%] bg-white/5 blur-[120px]" />

        <div className="absolute top-[-25%] left-[20%] h-[150%] w-[24%] rotate-12 bg-gradient-to-r from-transparent via-cyan-100/16 to-transparent blur-2xl" />
        <div className="absolute right-[18%] top-[24%] h-24 w-24 rounded-full bg-cyan-200/20 blur-2xl" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(0,0,0,0.78)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
      </div>
    </div>
  );
}