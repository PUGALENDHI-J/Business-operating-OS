import { useStore } from "./store";

export interface SearchResult {
  id: string;
  label: string;
  sublabel: string;
  type: string;
  icon: string;
  path: string;
}

export function useGlobalSearch(query: string): SearchResult[] {
  const { leads, clients, deals, projects, tasks, invoices, documents, proposals } = useStore();
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  leads.forEach((l) => {
    if (`${l.lead_number ?? ""} ${l.name} ${l.company_name} ${l.email} ${l.phone} ${l.whatsapp ?? ""}`.toLowerCase().includes(q))
      results.push({ id: l.id, label: l.name, sublabel: `Lead ${l.lead_number ?? ""} · ${l.company_name}`, type: "Lead", icon: "group_add", path: "/crm/leads" });
  });
  clients.forEach((c) => {
    if (`${c.client_number ?? ""} ${c.name} ${c.phone ?? ""} ${c.whatsapp ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q))
      results.push({ id: c.id, label: c.name, sublabel: `Client ${c.client_number ?? ""} · ${c.status}`, type: "Client", icon: "domain", path: `/crm/clients/${c.id}` });
  });
  deals.forEach((d) => {
    if (d.title.toLowerCase().includes(q))
      results.push({ id: d.id, label: d.title, sublabel: `Deal · ${d.stage}`, type: "Deal", icon: "view_kanban", path: "/crm/pipeline" });
  });
  projects.forEach((p) => {
    if (p.name.toLowerCase().includes(q))
      results.push({ id: p.id, label: p.name, sublabel: `Project · ${p.status}`, type: "Project", icon: "folder_open", path: "/operations/projects" });
  });
  tasks.forEach((t) => {
    if (t.title.toLowerCase().includes(q))
      results.push({ id: t.id, label: t.title, sublabel: `Task · ${t.status}`, type: "Task", icon: "task_alt", path: "/operations/tasks" });
  });
  invoices.forEach((i) => {
    if (`${i.invoice_number}`.toLowerCase().includes(q))
      results.push({ id: i.id, label: i.invoice_number, sublabel: `Invoice · ${i.status}`, type: "Invoice", icon: "receipt_long", path: "/finance/invoices" });
  });
  proposals.forEach((p) => {
    if (`${p.title} ${p.proposal_number}`.toLowerCase().includes(q))
      results.push({ id: p.id, label: p.title, sublabel: `Proposal · ${p.status}`, type: "Proposal", icon: "description", path: "/crm/proposals" });
  });
  documents.forEach((d) => {
    if (d.name.toLowerCase().includes(q))
      results.push({ id: d.id, label: d.name, sublabel: `Document · ${d.category}`, type: "Document", icon: "folder", path: "/documents" });
  });

  return results.slice(0, 8);
}
