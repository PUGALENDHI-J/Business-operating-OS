interface ProgressBarProps {
  value: number; // 0-100
  variant?: "normal" | "at-risk" | "complete";
  className?: string;
}

export function ProgressBar({ value, variant = "normal", className = "" }: ProgressBarProps) {
  const trackClass = variant === "at-risk" ? "bg-error-container" : "bg-surface-container-high";
  const barClass = variant === "at-risk" ? "bg-error" : variant === "complete" ? "bg-green-600" : "bg-primary";
  return (
    <div className={`w-full rounded-full h-1.5 ${trackClass} ${className}`}>
      <div className={`h-1.5 rounded-full ${barClass}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
