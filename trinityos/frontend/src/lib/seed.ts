import { newId } from "./id";
import type {
  Lead,
  Client,
  Contact,
  Deal,
  Proposal,
  Service,
  Project,
  Task,
  RevenueEntry,
  Expense,
  Invoice,
  Payment,
  AdCampaign,
  Goal,
  Doc,
  AiInsight,
} from "../types";

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();

export function buildDemoData(companyId: string) {
  const now = new Date().toISOString();
  const base = { company_id: companyId, created_at: now, updated_at: now, is_demo: true as const };

  const clients: Client[] = [
    { id: newId(), ...base, client_number: "CLI-0001", name: "Northwind Retail", logo_initial: "N", status: "Active", descriptor: "D2C fashion e-commerce brand", location: "Mumbai, IN", website: "northwindretail.com", health_score: 82, contact_person: "Priya Sharma", whatsapp: "+91 9810000001", phone: "+91 9810000001", email: "contact0@northwindretail.com", requirement: "Ongoing growth retainer: paid social, email flows, and quarterly landing page refreshes.", project_value: 180000, advance_paid: 90000, total_paid: 90000 },
    { id: newId(), ...base, client_number: "CLI-0002", name: "Arcadia Health", logo_initial: "A", status: "Active", descriptor: "Telehealth startup, Series A", location: "Bengaluru, IN", website: "arcadiahealth.io", health_score: 74, contact_person: "Rohan Mehta", whatsapp: "+91 9810000002", phone: "+91 9810000002", email: "contact1@arcadiahealth.io", requirement: "Redesign the patient booking flow and provider dashboard for the mobile app.", project_value: 320000, advance_paid: 0, total_paid: 0 },
    { id: newId(), ...base, client_number: "CLI-0003", name: "Blue Summit Logistics", logo_initial: "B", status: "At Risk", descriptor: "B2B freight & logistics", location: "Pune, IN", website: "bluesummit.co", health_score: 41, contact_person: "Kavya Iyer", whatsapp: "+91 9810000003", phone: "+91 9810000003", email: "contact2@bluesummit.co", requirement: "Operations dashboard for live shipment tracking across three warehouses.", project_value: 210000, advance_paid: 0, total_paid: 0 },
    { id: newId(), ...base, client_number: "CLI-0004", name: "Everline Studios", logo_initial: "E", status: "Active", descriptor: "Independent game studio", location: "Remote", website: "everline.studio", health_score: 68, contact_person: "Dev Anand", whatsapp: "+91 9810000004", phone: "+91 9810000004", email: "contact3@everline.studio", requirement: "Launch trailer + storefront assets for the Q3 game release.", project_value: 95000, advance_paid: 30000, total_paid: 30000 },
  ];

  const contacts: Contact[] = clients.flatMap((c, i) => [
    { id: newId(), ...base, client_id: c.id, name: ["Priya Sharma", "Rohan Mehta", "Kavya Iyer", "Dev Anand"][i], role: "Founder & CEO", email: `contact${i}@${c.website}`, phone: `+91 98${String(1000000 + i).slice(0, 8)}`, is_primary: true },
  ]);

  const leads: Lead[] = [
    { id: newId(), ...base, lead_number: "LEAD-0001", name: "Meera Kapoor", company_name: "Solstice Interiors", email: "meera@solstice.design", phone: "+91 9812340012", whatsapp: "+91 9812340012", source: "Referral", score: 78, status: "Qualified", requirement: "Need a modern portfolio website with an inquiry form and WhatsApp click-to-chat.", estimated_value: 85000, next_follow_up: daysFromNow(2) },
    { id: newId(), ...base, lead_number: "LEAD-0002", name: "Arjun Rao", company_name: "Fintrek Labs", email: "arjun@fintrek.io", phone: "+91 9812340013", whatsapp: "+91 9812340013", source: "Website", score: 62, status: "Contacted", requirement: "Landing page + investor deck design for seed round.", estimated_value: 60000, next_follow_up: daysFromNow(5) },
    { id: newId(), ...base, lead_number: "LEAD-0003", name: "Sara Thomas", company_name: "GreenCart", email: "sara@greencart.in", phone: "+91 9812340014", whatsapp: "+91 9812340014", source: "Ads", score: 45, status: "New", requirement: "Ecommerce storefront with 150 products, payment gateway, and SEO setup.", estimated_value: 130000, next_follow_up: daysFromNow(0) },
    { id: newId(), ...base, lead_number: "LEAD-0004", name: "Vikram Nair", company_name: "Hearth & Home Co", email: "vikram@hearthhome.in", phone: "+91 9812340015", whatsapp: "+91 9812340015", source: "Cold Outreach", score: 30, status: "Unqualified", requirement: "Basic brochure site, low budget.", estimated_value: 20000, next_follow_up: daysAgo(3) },
  ];

  const dealStagesCycle: Deal["stage"][] = ["New", "Qualified", "Meeting", "Proposal", "Negotiation", "Won", "Lost"];
  const deals: Deal[] = clients.map((c, i) => ({
    id: newId(),
    ...base,
    title: `${c.name} — Growth Retainer`,
    client_id: c.id,
    value: [180000, 320000, 95000, 210000][i],
    probability: [70, 55, 30, 85][i],
    stage: dealStagesCycle[i + 1],
    expected_close: daysFromNow(14 + i * 4),
  }));

  const proposals: Proposal[] = [
    { id: newId(), ...base, proposal_number: "PRP-1001", client_id: clients[0].id, deal_id: deals[0].id, title: "Q3 Growth Retainer", amount: 180000, status: "Sent", issue_date: daysAgo(4), valid_until: daysFromNow(10) },
    { id: newId(), ...base, proposal_number: "PRP-1002", client_id: clients[1].id, title: "Telehealth App Redesign", amount: 320000, status: "Accepted", issue_date: daysAgo(20), valid_until: daysAgo(5) },
  ];

  const services: Service[] = [
    { id: newId(), ...base, name: "Brand & Web Sprint", category: "Design", default_price: 150000, billing_type: "One-time" },
    { id: newId(), ...base, name: "Growth Retainer", category: "Marketing", default_price: 90000, billing_type: "Recurring" },
    { id: newId(), ...base, name: "Product Design Sprint", category: "Design", default_price: 220000, billing_type: "One-time" },
  ];

  const projects: Project[] = [
    { id: newId(), ...base, name: "Northwind Rebrand", client_id: clients[0].id, status: "In Progress", progress: 68, deadline: daysFromNow(9), budget: 180000, advance_paid: 90000, total_paid: 122400, requirements: "Full visual identity refresh plus a new Shopify storefront theme.", next_action: "Send Milestone 2 invoice" },
    { id: newId(), ...base, name: "Arcadia App Redesign", client_id: clients[1].id, status: "In Progress", progress: 85, deadline: daysFromNow(3), budget: 320000, advance_paid: 96000, total_paid: 272000, requirements: "Redesign the patient booking flow and provider dashboard for the mobile app.", next_action: "Finalize QA checklist" },
    { id: newId(), ...base, name: "Blue Summit Ops Dashboard", client_id: clients[2].id, status: "At Risk", progress: 20, deadline: daysAgo(2), budget: 210000, advance_paid: 0, total_paid: 42000, requirements: "Live shipment tracking dashboard across three warehouses.", next_action: "Escalate blocked API access" },
    { id: newId(), ...base, name: "Everline Launch Trailer", client_id: clients[3].id, status: "Planning", progress: 5, deadline: daysFromNow(21), budget: 95000, advance_paid: 30000, total_paid: 30000, requirements: "Launch trailer and storefront assets for the Q3 game release.", next_action: "Collect final script approval" },
    { id: newId(), ...base, name: "Northwind SEO Overhaul", client_id: clients[0].id, status: "Completed", progress: 100, deadline: daysAgo(12), budget: 60000, advance_paid: 60000, total_paid: 60000, requirements: "Technical SEO audit and quarterly content refresh." },
  ];

  const tasks: Task[] = [
    { id: newId(), ...base, title: "Finalize logo system", project_id: projects[0].id, status: "In Progress", priority: "HIGH", comments_count: 3, attachments_count: 2, due_date: daysFromNow(1) },
    { id: newId(), ...base, title: "Homepage hi-fi mockups", project_id: projects[0].id, status: "Review", priority: "MEDIUM", comments_count: 1, attachments_count: 4, due_date: daysFromNow(2) },
    { id: newId(), ...base, title: "Fix onboarding drop-off", project_id: projects[1].id, status: "In Progress", priority: "URGENT", comments_count: 5, attachments_count: 0, due_date: daysFromNow(0) },
    { id: newId(), ...base, title: "Client kickoff call", project_id: projects[2].id, status: "To Do", priority: "HIGH", comments_count: 0, attachments_count: 0, due_date: daysFromNow(1) },
    { id: newId(), ...base, title: "Storyboard v1", project_id: projects[3].id, status: "To Do", priority: "LOW", comments_count: 0, attachments_count: 1, due_date: daysFromNow(6) },
    { id: newId(), ...base, title: "Publish sitemap redirects", project_id: projects[4].id, status: "Done", priority: "MEDIUM", comments_count: 2, attachments_count: 0, due_date: daysAgo(1) },
  ];

  const revenue: RevenueEntry[] = [
    { id: newId(), ...base, date: daysAgo(2), client_id: clients[0].id, service: "Brand & Web Sprint", amount: 90000, is_recurring: false },
    { id: newId(), ...base, date: daysAgo(6), client_id: clients[1].id, service: "Growth Retainer", amount: 90000, is_recurring: true },
    { id: newId(), ...base, date: daysAgo(10), client_id: clients[3].id, service: "Product Design Sprint", amount: 65000, is_recurring: false },
    { id: newId(), ...base, date: daysAgo(18), client_id: clients[0].id, service: "Growth Retainer", amount: 90000, is_recurring: true },
    { id: newId(), ...base, date: daysAgo(25), client_id: clients[2].id, service: "Ops Dashboard — Milestone 1", amount: 70000, is_recurring: false },
  ];

  const expenses: Expense[] = [
    { id: newId(), ...base, date: daysAgo(3), category: "Software", vendor: "Figma", amount: 4200, notes: "Team seats" },
    { id: newId(), ...base, date: daysAgo(5), category: "Contractors", vendor: "Freelance dev", amount: 45000 },
    { id: newId(), ...base, date: daysAgo(9), category: "Marketing", vendor: "Meta Ads", amount: 32000 },
    { id: newId(), ...base, date: daysAgo(15), category: "Payroll", vendor: "Team payroll", amount: 210000 },
    { id: newId(), ...base, date: daysAgo(20), category: "Office", vendor: "WeWork", amount: 18000 },
  ];

  const invoices: Invoice[] = [
    { id: newId(), ...base, invoice_number: "INV-2041", client_id: clients[0].id, issue_date: daysAgo(20), due_date: daysAgo(6), amount: 90000, amount_paid: 90000, status: "Paid", project_id: projects[0].id },
    { id: newId(), ...base, invoice_number: "INV-2042", client_id: clients[1].id, issue_date: daysAgo(12), due_date: daysFromNow(2), amount: 90000, amount_paid: 0, status: "Unpaid", project_id: projects[1].id },
    { id: newId(), ...base, invoice_number: "INV-2043", client_id: clients[2].id, issue_date: daysAgo(30), due_date: daysAgo(9), amount: 70000, amount_paid: 0, status: "Overdue", project_id: projects[2].id },
    { id: newId(), ...base, invoice_number: "INV-2044", client_id: clients[3].id, issue_date: daysAgo(8), due_date: daysFromNow(6), amount: 65000, amount_paid: 30000, status: "Unpaid", project_id: projects[3].id },
  ];

  const payments: Payment[] = [
    { id: newId(), ...base, invoice_id: invoices[0].id, amount: 90000, date: daysAgo(6), method: "Bank Transfer" },
    { id: newId(), ...base, invoice_id: invoices[3].id, amount: 30000, date: daysAgo(3), method: "UPI" },
  ];

  const adCampaigns: AdCampaign[] = [
    { id: newId(), ...base, channel: "Meta Ads", name: "Prospecting — Founders", spend: 32000, leads_generated: 24, clients_generated: 3, revenue_attributed: 210000, status: "Active" },
    { id: newId(), ...base, channel: "Google Ads", name: "Search — Brand Design", spend: 18000, leads_generated: 11, clients_generated: 1, revenue_attributed: 90000, status: "Active" },
    { id: newId(), ...base, channel: "SEO", name: "Organic — Blog", spend: 5000, leads_generated: 9, clients_generated: 1, revenue_attributed: 65000, status: "Active" },
  ];

  const goals: Goal[] = [
    { id: newId(), ...base, title: "₹60L ARR in 24 months", metric: "Revenue", target_value: 6000000, current_value: 405000, start_date: daysAgo(60), end_date: daysFromNow(670), status: "On Track" },
    { id: newId(), ...base, title: "10 new clients this quarter", metric: "New Clients", target_value: 10, current_value: 4, start_date: daysAgo(30), end_date: daysFromNow(60), status: "At Risk" },
  ];

  const documents: Doc[] = [
    { id: newId(), ...base, name: "Northwind — MSA.pdf", category: "Contract", linked_type: "Client", linked_id: clients[0].id, size_kb: 340 },
    { id: newId(), ...base, name: "Arcadia — Proposal v2.pdf", category: "Proposal", linked_type: "Deal", linked_id: deals[1].id, size_kb: 512 },
  ];

  const insights: AiInsight[] = [
    { id: newId(), ...base, title: "Invoice INV-2043 is overdue", body: "Blue Summit Logistics' invoice for the Ops Dashboard milestone is 9 days past due. Consider a follow-up.", severity: "critical", source: "alert", dismissed: false },
    { id: newId(), ...base, title: "Hot lead going cold", body: "Meera Kapoor (Solstice Interiors) hasn't been contacted in 6 days despite a 78 lead score.", severity: "warning", source: "alert", dismissed: false },
    { id: newId(), ...base, title: "Meta Ads outperforming Google Ads", body: "Meta Ads is returning a ~6.6x ROAS versus ~5x on Google Ads this month — consider reallocating spend.", severity: "info", source: "weekly_review", dismissed: false },
  ];

  return { leads, clients, contacts, deals, proposals, services, projects, tasks, revenue, expenses, invoices, payments, adCampaigns, goals, documents, insights };
}
