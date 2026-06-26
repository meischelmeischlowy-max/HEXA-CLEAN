"use client";

import Fog from "./Fog";
import Dust from "./Dust";
import LensFlare from "./LensFlare";
import LightSweep from "./LightSweep";

export default function CinematicDesktop() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block">
      <Fog />
      <LightSweep />
      <LensFlare />
      <Dust />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.78)_100%)]" />

      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />
    </div>
  );
}