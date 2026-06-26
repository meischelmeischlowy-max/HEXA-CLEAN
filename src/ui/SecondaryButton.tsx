import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function SecondaryButton({
  children,
  className = "",
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={`
        rounded-full
        border
        border-white/15
        bg-white/5
        px-8
        py-4
        font-semibold
        text-white
        backdrop-blur-xl
        transition-all
        duration-300
        hover:-translate-y-1
        hover:border-cyan-300/50
        hover:bg-white/10
        active:scale-95
        ${className}
      `}
    >
      {children}
    </button>
  );
}// test