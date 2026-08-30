import type { ReactNode } from "react";
import { useState } from "react";
import { Icon } from "./Icon";

export interface KanbanColumnDef {
  key: string;
  label: string;
  tone?: "default" | "won" | "lost" | "progress" | "review"; // colored dot + top border per column
}

const toneDotClasses: Record<NonNullable<KanbanColumnDef["tone"]>, string> = {
  default: "bg-outline",
  won: "bg-status-success-text",
  lost: "bg-status-overdue-text",
  progress: "bg-status-overdue-text",
  review: "bg-status-warning-text",
};

const toneBorderClasses: Record<NonNullable<KanbanColumnDef["tone"]>, string> = {
  default: "border-t-outline-variant",
  won: "border-t-status-success-text",
  lost: "border-t-status-overdue-text",
  progress: "border-t-status-overdue-text",
  review: "border-t-status-warning-text",
};

interface KanbanBoardProps<T extends { id: string }> {
  columns: KanbanColumnDef[];
  itemsByColumn: Record<string, T[]>;
  renderCard: (item: T) => ReactNode;
  onMove: (itemId: string, toColumn: string) => void;
  emptyLabel?: string;
  /** Optional custom content for the right side of each column header (defaults to a "..." menu icon). */
  renderColumnRight?: (columnKey: string, items: unknown[]) => ReactNode;
}

export function KanbanBoard<T extends { id: string }>({
  columns,
  itemsByColumn,
  renderCard,
  onMove,
  emptyLabel = "Nothing here yet.",
  renderColumnRight,
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
            className={`w-80 flex-shrink-0 flex flex-col bg-surface-container rounded-xl border border-t-2 h-full max-h-full overflow-hidden ${toneBorderClasses[tone]} ${
              dragOverCol === col.key ? "border-x-primary border-b-primary ring-2 ring-primary/30" : "border-x-outline-variant border-b-outline-variant"
            }`}
          >
            <div className="p-4 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${toneDotClasses[tone]}`} />
                <h3 className="font-label-bold text-label-bold text-on-surface">{col.label}</h3>
                <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full text-xs font-bold">{items.length}</span>
              </div>
              {renderColumnRight ? renderColumnRight(col.key, items) : <Icon name="more_horiz" size={18} className="text-on-surface-variant" />}
            </div>
            <div className="p-3 pt-0 flex-1 overflow-y-auto flex flex-col gap-2">
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
