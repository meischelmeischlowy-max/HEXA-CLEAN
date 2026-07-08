"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_PIN = "2026";
const IDLE_TIME_MS = 90_000;

export default function DashboardScreenSaver() {
  const [isLocked, setIsLocked] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const correctPin = useMemo(() => {
    return process.env.NEXT_PUBLIC_HEXA_PANEL_PIN || DEFAULT_PIN;
  }, []);

  function lockScreen() {
    setIsLocked(true);
    setIsPinMode(false);
    setPin("");
    setError("");
  }

  function unlockScreen() {
    setIsLocked(false);
    setIsPinMode(false);
    setPin("");
    setError("");
  }

  useEffect(() => {
    if (isLocked) {
      return;
    }

    let timer: number | undefined;

    function resetTimer() {
      window.clearTimeout(timer);

      timer = window.setTimeout(() => {
        lockScreen();
      }, IDLE_TIME_MS);
    }

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];

    events.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer);
    });

    resetTimer();

    return () => {
      window.clearTimeout(timer);

      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isPinMode && event.code === "Space") {
        event.preventDefault();
        setIsPinMode(true);
        setPin("");
        setError("");
        return;
      }

      if (!isPinMode) {
        return;
      }

      if (event.key === "Escape") {
        setIsPinMode(false);
        setPin("");
        setError("");
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setPin((currentPin) => currentPin.slice(0, -1));
        setError("");
        return;
      }

      if (/^\d$/.test(event.key)) {
        event.preventDefault();

        setPin((currentPin) => {
          if (currentPin.length >= 4) {
            return currentPin;
          }

          return `${currentPin}${event.key}`;
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLocked, isPinMode]);

  useEffect(() => {
    if (pin.length !== 4) {
      return;
    }

    if (pin === correctPin) {
      const timeout = window.setTimeout(() => {
        unlockScreen();
      }, 250);

      return () => {
        window.clearTimeout(timeout);
      };
    }

    const timeout = window.setTimeout(() => {
      setError("Falsche PIN");
      setPin("");
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [pin, correctPin]);

  if (!isLocked) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />

      <div className="absolute inset-0 opacity-[0.08]">
        <div className="h-full w-full bg-[linear-gradient(to_bottom,transparent_0px,transparent_7px,rgba(255,255,255,0.7)_8px)] bg-[length:100%_8px]" />
      </div>

      <div className="absolute left-8 top-8 text-xs font-black uppercase tracking-[0.35em] text-cyan-300/70">
        HEXA OS SECURE DASHBOARD
      </div>

      <div className="absolute right-8 top-8 text-xs font-black uppercase tracking-[0.35em] text-cyan-300/70">
        PANEL LOCKED
      </div>

      <div className="relative flex flex-col items-center">
        <div className="relative flex h-72 w-72 items-center justify-center">
          <div className="hexa-orbit absolute h-72 w-72 rounded-full border border-cyan-300/20" />
          <div className="hexa-orbit-reverse absolute h-60 w-60 rounded-full border border-cyan-200/20" />

          <div className="hexa-octagon absolute h-48 w-48 border border-cyan-300/70 bg-cyan-300/5 shadow-[0_0_80px_rgba(34,211,238,0.25)]" />

          <div className="relative flex h-36 w-36 items-center justify-center rounded-3xl border border-white/10 bg-neutral-950/80 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl">
            <span className="text-7xl font-black tracking-tight text-cyan-200 drop-shadow-[0_0_22px_rgba(103,232,249,0.7)]">
              H
            </span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.5em] text-cyan-300">
            HEXA CLEAN COMMAND CENTER
          </p>

          <h1 className="mt-4 text-3xl font-black uppercase tracking-[0.2em] text-white">
            Secure Screen Saver
          </h1>

          {!isPinMode ? (
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.25em] text-neutral-400">
              Drücken Sie die LEERTASTE zum Entsperren
            </p>
          ) : (
            <div className="mt-7 flex flex-col items-center gap-4">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-neutral-400">
                4-stellige PIN eingeben
              </p>

              <div className="flex gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`h-5 w-5 rounded-full border ${
                      pin.length > index
                        ? "border-cyan-200 bg-cyan-200 shadow-[0_0_18px_rgba(103,232,249,0.9)]"
                        : "border-white/20 bg-white/5"
                    }`}
                  />
                ))}
              </div>

              {error ? (
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-300">
                  {error}
                </p>
              ) : (
                <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  Backspace löscht eine Ziffer · Escape kehrt zum
                  Bildschirmschoner zurück
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="absolute bottom-8 left-8 text-xs uppercase tracking-[0.25em] text-neutral-600">
        IDLE PROTECTION ACTIVE
      </div>

      <div className="absolute bottom-8 right-8 text-xs uppercase tracking-[0.25em] text-neutral-600">
        HEXA OS v1
      </div>

      <style jsx>{`
        .hexa-octagon {
          clip-path: polygon(
            30% 0%,
            70% 0%,
            100% 30%,
            100% 70%,
            70% 100%,
            30% 100%,
            0% 70%,
            0% 30%
          );
          animation: hexa-spin 8s linear infinite;
        }

        .hexa-orbit {
          animation: hexa-spin 12s linear infinite;
          box-shadow: 0 0 70px rgba(34, 211, 238, 0.12);
        }

        .hexa-orbit-reverse {
          animation: hexa-spin-reverse 9s linear infinite;
          box-shadow: 0 0 50px rgba(103, 232, 249, 0.1);
        }

        @keyframes hexa-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes hexa-spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
}