import { create } from "zustand";

export type QuickAddEntity = "lead" | "client" | "deal" | "project" | "task" | "invoice" | "expense" | "proposal" | "payment" | "followup" | null;

interface UiState {
  quickAddOpen: boolean;
  requestedCreate: QuickAddEntity;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
  requestCreate: (entity: QuickAddEntity) => void;
  clearRequestedCreate: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  quickAddOpen: false,
  requestedCreate: null,
  openQuickAdd: () => set({ quickAddOpen: true }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
  requestCreate: (entity) => set({ requestedCreate: entity, quickAddOpen: false }),
  clearRequestedCreate: () => set({ requestedCreate: null }),
}));
