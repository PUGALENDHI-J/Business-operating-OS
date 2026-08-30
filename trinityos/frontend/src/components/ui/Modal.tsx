import type { ReactNode } from "react";
import { useEffect } from "react";
import { Icon } from "./Icon";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, footer, width = 520 }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative bg-surface-container-lowest rounded-xl border border-outline-variant shadow-soft-hover w-full max-h-[85vh] flex flex-col"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant flex-shrink-0">
          <h3 className="font-headline-md text-headline-md text-on-surface">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center text-on-surface-variant">
            <Icon name="close" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-3 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
