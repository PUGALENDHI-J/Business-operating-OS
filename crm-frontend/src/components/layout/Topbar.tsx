"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, LogOut, Search, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { initials } from "@/lib/utils";
import { useResourceList } from "@/lib/use-resource-list";
import type { AppNotification } from "@/lib/types";

export function Topbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { meta } = useResourceList<AppNotification>("/notifications", { pageSize: 1, isRead: false });
  const unreadCount = meta?.totalItems ?? 0;

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-white px-6">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search leads, customers, schemes…"
          className="w-full rounded-lg border border-border bg-slate-50 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <Link href="/notifications" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>

      <div className="relative">
        <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            {initials(user?.full_name)}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium leading-tight text-slate-800">{user?.full_name ?? "…"}</p>
            <p className="text-xs leading-tight text-muted">{user?.roles?.[0] ?? ""}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-white py-1 shadow-lg">
              <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
                <Settings className="h-4 w-4" /> Settings
              </Link>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger-bg cursor-pointer"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
