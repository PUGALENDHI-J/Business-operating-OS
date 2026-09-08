import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-border bg-card-bg shadow-sm", className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const iconBg: Record<string, string> = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-emerald-100 text-emerald-600",
  purple: "bg-purple-100 text-purple-600",
  amber: "bg-amber-100 text-amber-600",
  red: "bg-red-100 text-red-600",
  teal: "bg-teal-100 text-teal-600",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  color = "blue",
  trend,
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color?: keyof typeof iconBg;
  trend?: { value: string; positive: boolean };
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", iconBg[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">{label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-xl font-semibold text-slate-900">{value}</p>
            {trend && (
              <span className={cn("text-xs font-medium", trend.positive ? "text-success" : "text-danger")}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </span>
            )}
          </div>
          {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
        </div>
      </div>
    </Card>
  );
}
