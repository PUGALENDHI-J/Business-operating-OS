import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  // Primary = solid TrinityOS orange, white text — the one CTA color in the app
  primary: "bg-primary text-on-primary hover:brightness-105 shadow-soft focus-visible:ring-2 focus-visible:ring-primary/40",
  // Accent = alias of primary, kept for existing call sites
  accent: "bg-primary text-on-primary hover:brightness-105 shadow-soft",
  // Secondary = surface pill with a hairline border
  secondary: "bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low",
  ghost: "bg-transparent text-on-surface-variant hover:bg-surface-container-low",
  danger: "bg-error text-on-error hover:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-label-sm font-label-sm gap-1.5",
  md: "px-4 py-2.5 text-label-bold font-label-bold gap-2",
};

export function Button({ variant = "secondary", size = "md", icon, children, className = "", ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
