import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { Card } from "./Card";

interface KPICardProps {
  label: string;
  value: ReactNode;
  icon?: string;
  hasData: boolean;
  emptyHint?: string; // e.g. "No data yet"
  emptyAction?: { label: string; onClick: () => void };
  trend?: { direction: "up" | "down"; label: string };
  alert?: boolean;
  alertText?: string;
  height?: number;
  onClick?: () => void;
}

export function KPICard({
  label,
  value,
  icon,
  hasData,
  emptyHint = "No data yet",
  emptyAction,
  trend,
  alert = false,
  alertText,
  height = 120,
  onClick,
}: KPICardProps) {
  return (
    <Card
      alert={alert}
      className={`flex flex-col relative ${onClick ? "cursor-pointer hover:ring-2 hover:ring-secondary-container/40" : ""}`}
      style={{ height }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
    >
      <div className="text-on-surface-variant font-label-bold text-label-bold uppercase flex justify-between items-center">
        <span>{label}</span>
        {alert ? (
          <Icon name="warning" className="text-error" />
        ) : (
          icon && <Icon name={icon} className="text-outline" />
        )}
      </div>
      <div className="font-metric-md text-metric-md mt-auto flex items-end justify-between gap-2">
        <span className={alert ? "text-on-error-container" : ""}>{value}</span>
        {trend && (
          <span
            className={`text-xs font-bold rounded-full px-2 py-0.5 mb-1 ${
              trend.direction === "up" ? "bg-status-active-bg text-status-active-text" : "bg-status-overdue-bg text-status-overdue-text"
            }`}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.label}
          </span>
        )}
      </div>
      {!hasData ? (
        <div className="text-outline text-xs mt-1 flex justify-between items-center">
          <span>{emptyHint}</span>
          {emptyAction && (
            <button onClick={emptyAction.onClick} className="text-primary hover:underline font-semibold">
              {emptyAction.label}
            </button>
          )}
        </div>
      ) : alert && alertText ? (
        <div className="text-on-error-container text-xs mt-1 font-semibold">{alertText}</div>
      ) : null}
    </Card>
  );
}
