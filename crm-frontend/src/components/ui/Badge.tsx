import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const toneClasses: Record<Tone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  neutral: "bg-slate-100 text-slate-600",
  brand: "bg-brand/10 text-brand",
};

// Central mapping so a given status string always renders the same color
// everywhere it appears (leads, installments, payments, auctions, etc.)
const STATUS_TONE: Record<string, Tone> = {
  // leads
  new: "info",
  contacted: "brand",
  interested: "warning",
  follow_up: "warning",
  converted: "success",
  lost: "neutral",
  // kyc / documents
  pending: "warning",
  verified: "success",
  rejected: "danger",
  // chit groups / members
  active: "success",
  completed: "success",
  cancelled: "neutral",
  defaulted: "danger",
  exited: "neutral",
  // installments / payments
  paid: "success",
  partial: "warning",
  overdue: "danger",
  waived: "neutral",
  success: "success",
  failed: "danger",
  refunded: "neutral",
  reversed: "neutral",
  // auctions
  scheduled: "info",
  live: "warning",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-slate-400">—</span>;
  const tone = STATUS_TONE[status] ?? "neutral";
  return <Badge tone={tone}>{titleCase(status)}</Badge>;
}

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", toneClasses[tone], className)}>
      {children}
    </span>
  );
}
