import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

type PremiumButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "ghost";

type PremiumButtonSize = "sm" | "md" | "lg";

type CommonProps = {
  children: ReactNode;
  variant?: PremiumButtonVariant;
  size?: PremiumButtonSize;
  className?: string;
};

type PremiumButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type PremiumButtonAsLink = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    disabled?: never;
    type?: never;
  };

type PremiumButtonProps = PremiumButtonAsButton | PremiumButtonAsLink;

const variantStyles: Record<PremiumButtonVariant, string> = {
  primary:
    "border-cyan-400/40 bg-cyan-400/15 text-cyan-100 shadow-cyan-500/20 hover:border-cyan-300/70 hover:bg-cyan-400/25 hover:shadow-cyan-500/30",
  secondary:
    "border-white/10 bg-white/8 text-zinc-100 shadow-black/20 hover:border-white/20 hover:bg-white/12",
  success:
    "border-emerald-400/40 bg-emerald-400/15 text-emerald-100 shadow-emerald-500/20 hover:border-emerald-300/70 hover:bg-emerald-400/25",
  warning:
    "border-amber-400/40 bg-amber-400/15 text-amber-100 shadow-amber-500/20 hover:border-amber-300/70 hover:bg-amber-400/25",
  danger:
    "border-red-400/40 bg-red-400/15 text-red-100 shadow-red-500/20 hover:border-red-300/70 hover:bg-red-400/25",
  ghost:
    "border-transparent bg-transparent text-zinc-300 shadow-none hover:border-white/10 hover:bg-white/5 hover:text-white",
};

const sizeStyles: Record<PremiumButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-sm",
};

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-xl border font-semibold tracking-wide shadow-lg transition duration-200 disabled:cursor-not-allowed disabled:opacity-50";

export default function PremiumButton(props: PremiumButtonProps) {
  const variant = props.variant ?? "secondary";
  const size = props.size ?? "md";
  const className = props.className ?? "";

  const classes = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if (typeof props.href === "string") {
    const {
      href,
      children,
      variant: _variant,
      size: _size,
      className: _className,
      ...linkProps
    } = props;

    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }

  const {
    children,
    variant: _variant,
    size: _size,
    className: _className,
    href: _href,
    ...buttonProps
  } = props;

  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}