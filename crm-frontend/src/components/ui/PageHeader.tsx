import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  action,
  backHref,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  backHref?: string;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        {backHref && (
          <Link href={backHref} className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-slate-700">
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </Link>
        )}
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
