import type { ReactNode } from "react";
import { useState } from "react";
import { Icon } from "./Icon";

export interface KanbanColumnDef {
  key: string;
  label: string;
  tone?: "default" | "won" | "lost"; // won/lost get tinted headers per Screen 4
}

interface KanbanBoardProps<T extends { id: string }> {
  columns: KanbanColumnDef[];
  itemsByColumn: Record<string, T[]>;
  renderCard: (item: T) => ReactNode;
  onMove: (itemId: string, toColumn: string) => void;
  emptyLabel?: string;
}

const toneHeaderClasses: Record<NonNullable<KanbanColumnDef["tone"]>, string> = {
  default: "bg-surface-container-low text-on-surface",
  won: "bg-status-active-bg text-status-active-text",
  lost: "bg-status-overdue-bg text-status-overdue-text",
};

export function KanbanBoard<T extends { id: string }>({
  columns,
  itemsByColumn,
  renderCard,
  onMove,
  emptyLabel = "Nothing here yet.",
}: KanbanBoardProps<T>) {
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  return (
    <div className="flex-1 overflow-x-auto flex gap-6 pb-4 scrollbar-hide">
      {columns.map((col) => {
        const items = itemsByColumn[col.key] ?? [];
        const tone = col.tone ?? "default";
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCol(col.key);
            }}
            onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain") || dragItem;
              if (id) onMove(id, col.key);
              setDragOverCol(null);
              setDragItem(null);
            }}
            className={`w-80 flex-shrink-0 flex flex-col bg-surface-container rounded-xl border h-full max-h-full overflow-hidden ${
              dragOverCol === col.key ? "border-secondary-container ring-2 ring-secondary-container/40" : "border-outline-variant"
            }`}
          >
            <div className={`p-4 border-b border-outline-variant flex justify-between items-center flex-shrink-0 ${toneHeaderClasses[tone]}`}>
              <h3 className="font-label-bold text-label-bold uppercase tracking-wider">{col.label}</h3>
              <span className="bg-surface-container-lowest/70 px-2 py-0.5 rounded-full text-xs font-bold">{items.length}</span>
            </div>
            <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-2">
              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <Icon name="inbox" className="text-outline-variant mb-2" size={36} />
                  <p className="font-body-sm text-body-sm text-on-surface-variant px-2">{emptyLabel}</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", item.id);
                      setDragItem(item.id);
                    }}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    {renderCard(item)}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
