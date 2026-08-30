import { NavLink } from "react-router-dom";

const TABS = [
  { label: "Overview", path: "/finance/revenue" },
  { label: "Invoices", path: "/finance/invoices" },
  { label: "Expenses", path: "/finance/expenses" },
];

/** Sub-nav for the Finance module — Invoices/Expenses live here, not in the main sidebar (spec Section 3). */
export function FinanceSubNav() {
  return (
    <div className="flex items-center gap-2 border-b border-outline-variant -mt-2">
      {TABS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            `px-4 py-2.5 -mb-px font-label-bold text-label-bold border-b-2 transition-colors ${
              isActive ? "border-primary text-on-surface" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
