import { BrowserRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import LeadsList from "./pages/crm/LeadsList";
import ClientsList from "./pages/crm/ClientsList";
import ClientProfile from "./pages/crm/ClientProfile";
import DealsPipeline from "./pages/crm/DealsPipeline";
import ProposalsList from "./pages/crm/ProposalsList";
import ProjectsList from "./pages/operations/ProjectsList";
import TasksKanban from "./pages/operations/TasksKanban";
import ServicesList from "./pages/operations/ServicesList";
import TeamList from "./pages/operations/TeamList";
import RevenuePL from "./pages/finance/RevenuePL";
import InvoicesList from "./pages/finance/InvoicesList";
import ExpensesList from "./pages/finance/ExpensesList";
import ChannelsOverview from "./pages/marketing/ChannelsOverview";
import MetaAds from "./pages/marketing/MetaAds";
import GoalsList from "./pages/growth/GoalsList";
import Forecast from "./pages/growth/Forecast";
import BusinessHealth from "./pages/growth/BusinessHealth";
import AIAdvisor from "./pages/ai/AIAdvisor";
import Documents from "./pages/Documents";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Help from "./pages/Help";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route path="/crm/leads" element={<LeadsList />} />
        <Route path="/crm/clients" element={<ClientsList />} />
        <Route path="/crm/clients/:id" element={<ClientProfile />} />
        <Route path="/crm/pipeline" element={<DealsPipeline />} />
        <Route path="/crm/proposals" element={<ProposalsList />} />

        <Route path="/operations/projects" element={<ProjectsList />} />
        <Route path="/operations/tasks" element={<TasksKanban />} />
        <Route path="/operations/services" element={<ServicesList />} />
        <Route path="/operations/team" element={<TeamList />} />

        <Route path="/finance/revenue" element={<RevenuePL />} />
        <Route path="/finance/invoices" element={<InvoicesList />} />
        <Route path="/finance/expenses" element={<ExpensesList />} />

        <Route path="/marketing/channels" element={<ChannelsOverview />} />
        <Route path="/marketing/meta-ads" element={<MetaAds />} />

        <Route path="/growth/goals" element={<GoalsList />} />
        <Route path="/growth/forecast" element={<Forecast />} />
        <Route path="/growth/health" element={<BusinessHealth />} />

        <Route path="/ai" element={<AIAdvisor />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />

        <Route path="*" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
