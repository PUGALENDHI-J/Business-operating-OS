"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, UserCircle, Layers, Boxes, UsersRound, CreditCard, Gavel,
  BadgeCheck, Building2, Bell, Activity, Settings, Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/customers", label: "Customers", icon: UserCircle },
  { href: "/chit-schemes", label: "Chit Schemes", icon: Layers },
  { href: "/chit-groups", label: "Chit Groups", icon: Boxes },
  { href: "/chit-members", label: "Chit Members", icon: UsersRound },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/auctions", label: "Auctions", icon: Gavel },
  { href: "/staff", label: "Staff", icon: BadgeCheck },
  { href: "/branches", label: "Branches", icon: Building2 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-sidebar-bg">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-brand text-sm font-bold text-white">
          N
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-white">NACHIYAR</p>
          <p className="text-[10px] leading-tight tracking-wide text-sidebar-text">CHIT &amp; FINANCE PVT LTD</p>
        </div>
        <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-sidebar-text">CRM</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-sidebar-bg-active text-sidebar-text-active" : "text-sidebar-text hover:bg-white/5 hover:text-sidebar-text-active",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 border-t border-white/10 px-5 py-4">
        <Landmark className="h-4 w-4 text-sidebar-text" />
        <div>
          <p className="text-xs font-medium text-sidebar-text-active">NACHIYAR CHIT &amp; FINANCE</p>
          <p className="text-[10px] text-sidebar-text">Building Trust... Growing Together...</p>
        </div>
      </div>
    </aside>
  );
}
