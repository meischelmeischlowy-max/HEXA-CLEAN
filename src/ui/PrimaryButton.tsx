import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function PrimaryButton({
  children,
  className = "",
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={`
        relative
        overflow-hidden
        rounded-full
        bg-gradient-to-r
        from-cyan-400
        to-blue-500
        px-8
        py-4
        font-semibold
        text-white
        shadow-lg
        shadow-cyan-500/20
        transition-all
        duration-300
        hover:-translate-y-1
        hover:scale-[1.02]
        hover:shadow-cyan-400/40
        active:scale-95
        ${className}
      `}
    >
      {children}
    </button>
  );
}