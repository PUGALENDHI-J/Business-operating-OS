import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
      <div>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-semibold text-on-surface">{title}</h2>
        {subtitle && <p className="text-on-surface-variant mt-1 font-body-lg text-body-lg">{subtitle}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}
