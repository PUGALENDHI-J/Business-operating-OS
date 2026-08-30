import { create } from "zustand";
import { Icon } from "./Icon";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg: string) => useToastStore.getState().push("success", msg),
  error: (msg: string) => useToastStore.getState().push("error", msg),
  info: (msg: string) => useToastStore.getState().push("info", msg),
};

const iconFor: Record<ToastKind, string> = { success: "check_circle", error: "error", info: "info" };
const colorFor: Record<ToastKind, string> = {
  success: "border-status-active-text/30 text-status-active-text",
  error: "border-error/30 text-error",
  info: "border-outline-variant text-on-surface",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 no-print">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`bg-surface-container-lowest border rounded-lg shadow-soft-hover px-4 py-3 flex items-center gap-2 min-w-[260px] text-body-sm font-body-sm ${colorFor[t.kind]}`}
        >
          <Icon name={iconFor[t.kind]} size={18} />
          <span className="flex-1 text-on-surface">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="text-on-surface-variant">
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
