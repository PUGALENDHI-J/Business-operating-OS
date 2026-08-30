export type PillTone = "active" | "overdue" | "warning" | "neutral" | "success";

interface StatusPillProps {
  label: string;
  tone?: PillTone;
  className?: string;
}

const toneClasses: Record<PillTone, string> = {
  active: "bg-status-active-bg text-status-active-text",
  overdue: "bg-status-overdue-bg text-status-overdue-text",
  warning: "bg-status-warning-bg text-status-warning-text",
  success: "bg-status-success-bg text-status-success-text",
  neutral: "bg-status-neutral-bg text-status-neutral-text",
};

/** Maps common domain status strings to the correct pill tone automatically. */
export function toneForStatus(status: string): PillTone {
  const s = status.toLowerCase();
  if (["completed", "won", "paid", "received"].includes(s)) return "success";
  if (["active", "good", "ahead", "accepted"].includes(s)) return "active";
  if (["overdue", "delayed", "blocked", "at risk", "lost", "behind", "urgent"].includes(s)) return "overdue";
  if (
    [
      "warning",
      "review",
      "unpaid",
      "planning",
      "on hold",
      "draft",
      "new",
      "follow-up",
      "negotiation",
      "hot",
      "advance received",
      "project started",
      "in progress",
      "payment due",
    ].includes(s)
  )
    return "warning";
  return "neutral";
}

/** Same tone classes StatusPill uses, exposed for inline controls (e.g. a <select> styled as a pill). */
export function pillClassNameForStatus(status: string, tone?: PillTone): string {
  return toneClasses[tone ?? toneForStatus(status)];
}

export function StatusPill({ label, tone, className = "" }: StatusPillProps) {
  const resolvedTone = tone ?? toneForStatus(label);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-semibold leading-none ${toneClasses[resolvedTone]} ${className}`}
    >
      {label}
    </span>
  );
}
