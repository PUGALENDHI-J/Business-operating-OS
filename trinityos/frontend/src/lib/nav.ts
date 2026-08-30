export interface NavItem {
  label: string;
  path: string;
  icon: string;
}
export interface NavGroup {
  label: string;
  icon: string;
  items: NavItem[];
}

// Primary navigation — deliberately short (spec Section 3). Every module not
// listed here still has a working route; it lives inside the relevant page
// instead of cluttering the rail (e.g. Proposals is a tab inside Pipeline,
// Services/Team live inside Settings, Marketing/Growth/AI Advisor are linked
// from Reports > More Tools so existing functionality is never lost).
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "",
    icon: "dashboard",
    items: [
      { label: "Dashboard", path: "/", icon: "dashboard" },
      { label: "Leads", path: "/crm/leads", icon: "group" },
      { label: "Clients", path: "/crm/clients", icon: "groups" },
      { label: "Pipeline", path: "/crm/pipeline", icon: "view_kanban" },
      { label: "Projects", path: "/operations/projects", icon: "account_circle" },
      { label: "Tasks", path: "/operations/tasks", icon: "assignment" },
      { label: "Finance", path: "/finance/revenue", icon: "credit_card" },
      { label: "Reports", path: "/reports", icon: "bar_chart" },
      { label: "Settings", path: "/settings", icon: "settings" },
    ],
  },
];

// Every route in the app, including ones tucked inside modules — used by
// global search and the Quick Add router so nothing becomes unreachable.
export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((g) => g.items),
  { label: "Proposals", path: "/crm/proposals", icon: "description" },
  { label: "Services", path: "/operations/services", icon: "design_services" },
  { label: "Team", path: "/operations/team", icon: "badge" },
  { label: "Invoices", path: "/finance/invoices", icon: "receipt_long" },
  { label: "Expenses", path: "/finance/expenses", icon: "account_balance_wallet" },
  { label: "Channels", path: "/marketing/channels", icon: "hub" },
  { label: "Meta Ads", path: "/marketing/meta-ads", icon: "ads_click" },
  { label: "Goals", path: "/growth/goals", icon: "flag" },
  { label: "Forecast", path: "/growth/forecast", icon: "insights" },
  { label: "Business Health", path: "/growth/health", icon: "monitor_heart" },
  { label: "AI Advisor", path: "/ai", icon: "smart_toy" },
  { label: "Documents", path: "/documents", icon: "folder" },
  { label: "Help Center", path: "/help", icon: "help" },
];
