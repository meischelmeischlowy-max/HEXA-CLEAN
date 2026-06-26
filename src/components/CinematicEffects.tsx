"use client";

export default function CinematicEffects() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* MOBILE — statyczne lekkie efekty, bez motion */}
      <div className="absolute inset-0 md:hidden">
        <div className="absolute left-[-20%] top-[8%] h-[260px] w-[260px] rounded-full bg-cyan-400/12 blur-[55px]" />
        <div className="absolute right-[-18%] bottom-[12%] h-[220px] w-[220px] rounded-full bg-cyan-300/10 blur-[45px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,.72)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/70 to-transparent" />
      </div>

      {/* DESKTOP — efekty zostają, ale tylko od md w górę */}
      <div className="hidden md:block">
        <div className="absolute left-[-18%] top-[4%] h-[620px] w-[620px] rounded-full bg-cyan-400/18 blur-[150px]" />
        <div className="absolute right-[-12%] top-[34%] h-[460px] w-[460px] rounded-full bg-cyan-200/10 blur-[140px]" />
        <div className="absolute bottom-[-150px] left-[-25%] h-[360px] w-[160%] bg-white/8 blur-[85px]" />
        <div className="absolute bottom-[-40px] left-[-35%] h-[260px] w-[180%] bg-cyan-200/8 blur-[100px]" />
        <div className="absolute bottom-[18%] left-[-20%] h-[180px] w-[140%] bg-white/5 blur-[120px]" />

        <div className="absolute right-[18%] top-[24%] h-24 w-24 rounded-full bg-cyan-200/20 blur-2xl" />
        <div className="absolute right-[24%] top-[30%] h-px w-52 bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(0,0,0,0.78)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
      </div>
    </div>
  );
}