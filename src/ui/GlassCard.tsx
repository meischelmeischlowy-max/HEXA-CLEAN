import { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
};

export default function GlassCard({
  children,
  className = "",
}: GlassCardProps) {
  return (
    <div
      className={`
        rounded-3xl
        border
        border-white/10
        bg-white/[0.06]
        backdrop-blur-xl
        shadow-[0_10px_40px_rgba(0,0,0,0.35)]
        transition-all
        duration-300
        hover:border-cyan-300/50
        hover:bg-cyan-300/10
        hover:-translate-y-1
        ${className}
      `}
    >
      {children}
    </div>
  );
}