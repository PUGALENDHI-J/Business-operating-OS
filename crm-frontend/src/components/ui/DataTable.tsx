"use client";

import { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Search } from "lucide-react";
import { Input } from "./Form";
import { TableSkeleton, EmptyState, ErrorState } from "./States";
import type { PaginationMeta } from "@/lib/types";
import type { ListParams } from "@/lib/use-resource-list";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  params: ListParams;
  setParams: (updates: Partial<ListParams>) => void;
  onRetry?: () => void;
  searchPlaceholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  toolbarExtra?: ReactNode;
  onRowClick?: (row: T) => void;
  getRowKey: (row: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  meta,
  loading,
  error,
  params,
  setParams,
  onRetry,
  searchPlaceholder = "Search…",
  emptyTitle,
  emptyDescription,
  toolbarExtra,
  onRowClick,
  getRowKey,
}: DataTableProps<T>) {
  const toggleSort = (key: string) => {
    if (params.sortBy !== key) {
      setParams({ sortBy: key, sortDir: "asc", page: params.page });
    } else {
      setParams({ sortDir: params.sortDir === "asc" ? "desc" : "asc", page: params.page });
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder={searchPlaceholder}
            defaultValue={params.search}
            onChange={(e) => setParams({ search: e.target.value })}
          />
        </div>
        {toolbarExtra}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        <TableSkeleton cols={columns.length} />
      ) : data.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/60 text-left text-xs font-medium uppercase tracking-wide text-muted">
                {columns.map((col) => (
                  <th key={col.key} className={cn("px-5 py-3", col.className)}>
                    {col.sortable ? (
                      <button
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-700"
                        onClick={() => toggleSort(col.key)}
                      >
                        {col.header}
                        {params.sortBy === col.key ? (
                          params.sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row) => (
                <tr
                  key={getRowKey(row)}
                  className={cn("transition-colors", onRowClick && "cursor-pointer hover:bg-slate-50")}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-5 py-3.5 text-slate-700", col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalItems > 0 && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted">
          <span>
            Showing {(meta.page - 1) * meta.pageSize + 1}–{Math.min(meta.page * meta.pageSize, meta.totalItems)} of {meta.totalItems}
          </span>
          <div className="flex items-center gap-1">
            <button
              className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
              disabled={meta.page <= 1}
              onClick={() => setParams({ page: meta.page - 1 })}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-medium">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setParams({ page: meta.page + 1 })}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
