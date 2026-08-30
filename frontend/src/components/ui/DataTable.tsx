import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { EmptyState } from "./EmptyState";
import { exportToExcel, exportToCsv, businessFilename } from "../../lib/export";

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  width?: string; // tailwind width class, e.g. "w-32"
  align?: "left" | "center" | "right";
  hideOnMobile?: boolean;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  rows: T[];
  searchFields?: (row: T) => string; // concatenated searchable text
  emptyState: { icon: string; title: string; description: string; actionLabel?: string; onAction?: () => void };
  onRowClick?: (row: T) => void;
  exportFilename?: string;
  exportMapper?: (row: T) => Record<string, unknown>;
  pageSize?: number;
  toolbarExtra?: ReactNode;
  height?: number;
  /** When given, mobile viewports render this card instead of the stacked-column row (spec Sections 5, 37). */
  renderMobileCard?: (row: T) => ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  searchFields,
  emptyState,
  onRowClick,
  exportFilename,
  exportMapper,
  pageSize = 8,
  toolbarExtra,
  height,
  renderMobileCard,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim() || !searchFields) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => searchFields(r).toLowerCase().includes(q));
  }, [rows, query, searchFields]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleSort(col: Column<T>) {
    if (!col.sortValue) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  function handleExport(format: "xlsx" | "csv") {
    if (!exportFilename) return;
    const mapper = exportMapper ?? ((r: T) => r as unknown as Record<string, unknown>);
    const mapped = sorted.map(mapper); // "sorted" already reflects the active search (spec Section 54)
    const filename = businessFilename(exportFilename);
    if (format === "xlsx") exportToExcel(mapped, filename, exportFilename.slice(0, 31));
    else exportToCsv(mapped, filename);
  }

  return (
    <div className="bg-surface rounded-xl border border-outline-variant shadow-soft overflow-hidden flex flex-col" style={height ? { height } : undefined}>
      {(searchFields || exportFilename || toolbarExtra) && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-outline-variant bg-surface-container-lowest">
          {searchFields && (
            <div className="relative w-full sm:w-64">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search..."
                className="w-full bg-surface-container-low border border-outline-variant rounded-full py-2 pl-9 pr-4 text-body-sm font-body-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}
          <div className="flex-1" />
          {toolbarExtra}
          {exportFilename && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleExport("xlsx")}
                title="Export current results to Excel"
                className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-label-sm text-label-sm hover:bg-surface-container-low transition-colors shadow-soft"
              >
                <Icon name="download" size={18} />
                Excel
              </button>
              <button
                onClick={() => handleExport("csv")}
                title="Export current results to CSV"
                className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface font-label-sm text-label-sm hover:bg-surface-container-low transition-colors shadow-soft"
              >
                <Icon name="download" size={18} />
                CSV
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table header */}
      <div className="hidden md:flex items-center px-6 py-3 border-b border-outline-variant bg-surface-container-low text-outline font-label-bold text-label-bold uppercase text-[10px] tracking-wider flex-shrink-0">
        {columns.map((col) => (
          <button
            key={col.key}
            onClick={() => handleSort(col)}
            className={`flex items-center gap-1 ${col.width ?? "flex-1"} ${
              col.align === "center" ? "justify-center text-center" : col.align === "right" ? "justify-end text-right" : "text-left"
            } ${col.sortValue ? "cursor-pointer hover:text-on-surface" : "cursor-default"}`}
          >
            {col.label}
            {sortKey === col.key && <Icon name={sortDir === "asc" ? "arrow_upward" : "arrow_downward"} size={12} />}
          </button>
        ))}
      </div>

      {/* Body */}
      {sorted.length === 0 ? (
        <EmptyState {...emptyState} />
      ) : renderMobileCard ? (
        <div className="flex-1 overflow-y-auto">
          <div className="md:hidden divide-y divide-outline-variant/60">
            {pageRows.map((row) => (
              <div key={row.id} onClick={() => onRowClick?.(row)} className={onRowClick ? "cursor-pointer" : ""}>
                {renderMobileCard(row)}
              </div>
            ))}
          </div>
          <div className="hidden md:block divide-y divide-outline-variant/60">
            {pageRows.map((row) => (
              <div
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`flex items-center px-6 h-14 ${onRowClick ? "cursor-pointer hover:bg-surface-container-low" : ""} transition-colors`}
              >
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className={`${col.width ?? "flex-1"} flex items-center min-w-0 ${
                      col.align === "center" ? "justify-center" : col.align === "right" ? "justify-end" : "justify-start"
                    } text-body-sm font-body-sm text-on-surface`}
                  >
                    {col.render(row)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/60">
          {pageRows.map((row) => (
            <div
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`flex flex-col md:flex-row md:items-center gap-1 md:gap-0 px-6 py-3 md:py-0 md:h-14 ${
                onRowClick ? "cursor-pointer hover:bg-surface-container-low" : ""
              } transition-colors`}
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={`${col.width ?? "flex-1"} ${col.hideOnMobile ? "hidden md:flex" : "flex"} items-center min-w-0 ${
                    col.align === "center" ? "justify-center" : col.align === "right" ? "justify-end" : "justify-start"
                  } text-body-sm font-body-sm text-on-surface`}
                >
                  {col.render(row)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Pagination footer */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-outline-variant text-body-sm font-body-sm text-on-surface-variant flex-shrink-0">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sorted.length)} of {sorted.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg border border-outline-variant disabled:opacity-40 hover:bg-surface-container-low"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, currentPage - 3), Math.max(0, currentPage - 3) + 5)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg ${p === currentPage ? "bg-primary text-on-primary" : "border border-outline-variant hover:bg-surface-container-low"}`}
                >
                  {p}
                </button>
              ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded-lg border border-outline-variant disabled:opacity-40 hover:bg-surface-container-low"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
