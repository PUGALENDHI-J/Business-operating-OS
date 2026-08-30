import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Company,
  User,
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
  AppNotification,
  Activity,
  AiInsight,
  Role,
  FollowUp,
} from "../types";

interface AuthState {
  currentUser: User;
  setRole: (role: Role) => void;
}

interface DataState {
  company: Company;
  users: User[];
  leads: Lead[];
  clients: Client[];
  contacts: Contact[];
  deals: Deal[];
  proposals: Proposal[];
  services: Service[];
  projects: Project[];
  tasks: Task[];
  revenue: RevenueEntry[];
  expenses: Expense[];
  invoices: Invoice[];
  payments: Payment[];
  adCampaigns: AdCampaign[];
  goals: Goal[];
  documents: Doc[];
  notifications: AppNotification[];
  activities: Activity[];
  insights: AiInsight[];
  followUps: FollowUp[];
  hasDemoData: boolean;
}

interface Actions {
  setEntities: <K extends keyof DataState>(key: K, value: DataState[K]) => void;
  addEntity: <T extends { id: string }>(key: keyof DataState, entity: T) => void;
  updateEntity: <T extends { id: string }>(key: keyof DataState, id: string, patch: Partial<T>) => void;
  removeEntity: (key: keyof DataState, id: string) => void;
  logActivity: (a: Omit<Activity, "id" | "company_id" | "created_at" | "updated_at" | "is_demo">) => void;
  loadDemoData: () => void;
  resetDemoData: () => void;
  resetAllData: () => void;
}

export type Store = AuthState & DataState & Actions;

const DEFAULT_COMPANY: Company = {
  id: "company-1",
  company_id: "company-1",
  name: "TrinityAI",
  stage: "Agency",
  currency: "INR",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_demo: false,
};

const FOUNDER_USER: User = {
  id: "user-founder",
  company_id: "company-1",
  name: "Founder",
  email: "founder@trinityai.com",
  role: "OWNER",
  avatar_initials: "FN",
  avatar_color: "bg-primary",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_demo: false,
};

const emptyData: DataState = {
  company: DEFAULT_COMPANY,
  users: [FOUNDER_USER],
  leads: [],
  clients: [],
  contacts: [],
  deals: [],
  proposals: [],
  services: [],
  projects: [],
  tasks: [],
  revenue: [],
  expenses: [],
  invoices: [],
  payments: [],
  adCampaigns: [],
  goals: [],
  documents: [],
  notifications: [],
  activities: [],
  insights: [],
  followUps: [],
  hasDemoData: false,
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      currentUser: FOUNDER_USER,
      ...emptyData,

      setRole: (role) =>
        set((s) => ({ currentUser: { ...s.currentUser, role } })),

      setEntities: (key, value) => set({ [key]: value } as unknown as Partial<Store>),

      addEntity: (key, entity) =>
        set((s) => ({ [key]: [...(s[key] as unknown as unknown[]), entity] } as unknown as Partial<Store>)),

      updateEntity: (key, id, patch) =>
        set((s) => ({
          [key]: (s[key] as unknown as { id: string }[]).map((e) =>
            e.id === id ? { ...e, ...patch, updated_at: new Date().toISOString() } : e
          ),
        } as unknown as Partial<Store>)),

      removeEntity: (key, id) =>
        set((s) => ({
          [key]: (s[key] as unknown as { id: string }[]).filter((e) => e.id !== id),
        } as unknown as Partial<Store>)),

      logActivity: (a) =>
        set((s) => ({
          activities: [
            {
              ...a,
              id: crypto.randomUUID(),
              company_id: s.company.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_demo: false,
            },
            ...s.activities,
          ].slice(0, 200),
        })),

      loadDemoData: () => {
        // Imported lazily to avoid circular imports at module init time.
        import("./seed").then(({ buildDemoData }) => {
          const demo = buildDemoData(get().company.id);
          set((s) => ({
            leads: [...s.leads, ...demo.leads],
            clients: [...s.clients, ...demo.clients],
            contacts: [...s.contacts, ...demo.contacts],
            deals: [...s.deals, ...demo.deals],
            proposals: [...s.proposals, ...demo.proposals],
            services: [...s.services, ...demo.services],
            projects: [...s.projects, ...demo.projects],
            tasks: [...s.tasks, ...demo.tasks],
            revenue: [...s.revenue, ...demo.revenue],
            expenses: [...s.expenses, ...demo.expenses],
            invoices: [...s.invoices, ...demo.invoices],
            payments: [...s.payments, ...demo.payments],
            adCampaigns: [...s.adCampaigns, ...demo.adCampaigns],
            goals: [...s.goals, ...demo.goals],
            documents: [...s.documents, ...demo.documents],
            insights: [...s.insights, ...demo.insights],
            hasDemoData: true,
          }));
        });
      },

      resetDemoData: () =>
        set((s) => {
          const stripDemo = <T extends { is_demo: boolean }>(arr: T[]) => arr.filter((e) => !e.is_demo);
          return {
            leads: stripDemo(s.leads),
            clients: stripDemo(s.clients),
            contacts: stripDemo(s.contacts),
            deals: stripDemo(s.deals),
            proposals: stripDemo(s.proposals),
            services: stripDemo(s.services),
            projects: stripDemo(s.projects),
            tasks: stripDemo(s.tasks),
            revenue: stripDemo(s.revenue),
            expenses: stripDemo(s.expenses),
            invoices: stripDemo(s.invoices),
            payments: stripDemo(s.payments),
            adCampaigns: stripDemo(s.adCampaigns),
            goals: stripDemo(s.goals),
            documents: stripDemo(s.documents),
            insights: stripDemo(s.insights),
            hasDemoData: false,
          };
        }),

      resetAllData: () => set({ ...emptyData }),
    }),
    {
      name: "trinityai-business-os-store",
      version: 1,
    }
  )
);
