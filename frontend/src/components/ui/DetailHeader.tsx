import type { ReactNode } from "react";
import { StatusPill, toneForStatus } from "./StatusPill";
import { Button } from "./Button";
import { Icon } from "./Icon";

interface DetailHeaderProps {
  logoInitial: string;
  title: string;
  status: string;
  descriptor: string;
  metaLine?: ReactNode;
  onEdit?: () => void;
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function DetailHeader({ logoInitial, title, status, descriptor, metaLine, onEdit, tabs, activeTab, onTabChange }: DetailHeaderProps) {
  return (
    <div className="space-y-stack-md">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary-container text-white flex items-center justify-center font-bold text-xl flex-shrink-0">
            {logoInitial}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">{title}</h2>
              <StatusPill label={status} tone={toneForStatus(status)} />
            </div>
            <p className="text-on-surface-variant font-body-sm text-body-sm mt-1">{descriptor}</p>
            {metaLine && <div className="flex items-center gap-4 text-on-surface-variant text-body-sm font-body-sm mt-2">{metaLine}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="secondary" icon={<Icon name="more_horiz" size={18} />}>
            Actions
          </Button>
          {onEdit && (
            <Button variant="primary" onClick={onEdit}>
              Edit Profile
            </Button>
          )}
        </div>
      </div>
      <div className="flex gap-6 border-b border-outline-variant overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`pb-3 whitespace-nowrap font-label-bold text-label-bold border-b-2 transition-colors ${
              activeTab === tab ? "border-primary text-on-surface" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
