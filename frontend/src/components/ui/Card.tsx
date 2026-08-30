import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  padded?: boolean;
  alert?: boolean; // red-outlined alert card variant (Screen 5: overdue/at-risk metrics)
}

export function Card({ children, padded = true, alert = false, className = "", ...rest }: CardProps) {
  return (
    <div
      className={`bg-surface-container-lowest rounded-xl border shadow-soft hover:shadow-soft-hover transition-shadow ${
        alert ? "border-error" : "border-outline-variant"
      } ${padded ? "p-stack-md" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
