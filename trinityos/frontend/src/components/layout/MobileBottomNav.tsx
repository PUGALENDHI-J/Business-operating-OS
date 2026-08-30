import { NavLink } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { useUiStore } from "../../lib/uiStore";

const ITEMS = [
  { label: "Dashboard", path: "/", icon: "dashboard" },
  { label: "Leads", path: "/crm/leads", icon: "group" },
  { label: "Add", path: "__add__", icon: "add_circle" },
  { label: "Clients", path: "/crm/clients", icon: "groups" },
  { label: "Finance", path: "/finance/revenue", icon: "credit_card" },
];

export function MobileBottomNav() {
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar flex items-center justify-around h-16 no-print">
      {ITEMS.map((item) =>
        item.path === "__add__" ? (
          <button key="add" onClick={openQuickAdd} className="flex flex-col items-center justify-center text-primary">
            <Icon name={item.icon} filled size={30} />
          </button>
        ) : (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 ${isActive ? "text-primary" : "text-on-sidebar-muted"}`}
          >
            <Icon name={item.icon} size={22} />
            <span className="text-[10px] font-label-bold">{item.label}</span>
          </NavLink>
        )
      )}
    </nav>
  );
}
