import { NavLink, useNavigate } from "react-router-dom";
import { Icon } from "../ui/Icon";
import { NAV_GROUPS } from "../../lib/nav";
import { useUiStore } from "../../lib/uiStore";
import { useStore } from "../../lib/store";
import { signOut } from "../../lib/supabaseAuth";

/**
 * Fixed dark-navy rail — always dark regardless of the light/dark theme
 * toggle (spec Sections 2-3, 33-35). Deliberately short nav list; every
 * other module lives inside one of these per spec Section 3.
 */
export function Sidebar({ mobileOpen, onCloseMobile }: { mobileOpen?: boolean; onCloseMobile?: () => void }) {
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const company = useStore((s) => s.company);
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    onCloseMobile?.();
    navigate("/settings");
  }

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onCloseMobile} />}
      <nav
        className={`fixed left-0 top-0 h-full w-[240px] z-50 bg-sidebar flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold flex-shrink-0">
            {(company.name || "T").charAt(0)}
          </div>
          <div className="min-w-0">
            <h1 className="text-primary font-extrabold text-lg leading-none truncate">{company.name || "TrinityOS"}</h1>
            <p className="text-[10px] font-label-bold uppercase tracking-wider text-on-sidebar-muted mt-0.5">Business OS</p>
          </div>
          <button className="ml-auto lg:hidden text-on-sidebar-muted" onClick={onCloseMobile}>
            <Icon name="close" />
          </button>
        </div>

        <div className="px-4 pb-4 flex-shrink-0">
          <button
            onClick={() => {
              openQuickAdd();
              onCloseMobile?.();
            }}
            className="w-full bg-primary text-on-primary rounded-lg py-2.5 px-4 font-label-bold text-label-bold hover:brightness-105 transition-all flex items-center justify-center gap-2 shadow-soft"
          >
            <Icon name="add" size={18} />
            Quick Action
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide px-2">
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 mb-0.5 rounded-lg transition-colors duration-150 ${
                  isActive ? "bg-sidebar-active-bg text-sidebar-active-text font-semibold" : "text-on-sidebar hover:bg-sidebar-elevated"
                }`
              }
            >
              <Icon name={item.icon} size={20} />
              <span className="font-label-bold text-label-bold text-[13.5px]">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="border-t border-sidebar-border/10 p-4 flex flex-col gap-3 flex-shrink-0">
          <NavLink to="/help" onClick={onCloseMobile} className="flex items-center gap-3 text-on-sidebar-muted hover:text-on-sidebar transition-colors">
            <Icon name="help" size={19} />
            <span className="font-label-bold text-label-bold text-[13.5px]">Help Center</span>
          </NavLink>
          <button onClick={handleLogout} className="flex items-center gap-3 text-on-sidebar-muted hover:text-on-sidebar transition-colors text-left">
            <Icon name="logout" size={19} />
            <span className="font-label-bold text-label-bold text-[13.5px]">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}
