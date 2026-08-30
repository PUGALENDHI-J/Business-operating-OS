import type { ReactNode } from "react";
import { useEffect } from "react";
import { Icon } from "./Icon";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Slides in from the right on desktop/tablet; becomes a full-screen sheet on
 * mobile. Used for viewing + inline-editing an existing record (Leads,
 * Clients, ...) instead of forcing navigation to a separate page or a
 * heavyweight modal form (spec Section 7, 22).
 */
export function Drawer({ open, onClose, title, subtitle, children, footer }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-[440px] bg-surface-container-lowest border-l border-outline-variant shadow-soft-hover flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-outline-variant flex-shrink-0">
          <div className="min-w-0">
            <h3 className="font-headline-md text-headline-md text-on-surface truncate">{title}</h3>
            {subtitle && <p className="text-xs text-on-surface-variant mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant flex-shrink-0 ml-2">
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-outline-variant flex justify-end gap-3 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
