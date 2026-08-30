import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card } from "../../components/ui/Card";
import { StatusPill, toneForStatus } from "../../components/ui/StatusPill";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { Field, Select, TextInput } from "../../components/ui/FormField";
import { useStore } from "../../lib/store";
import { useUiStore } from "../../lib/uiStore";
import { newId, nowIso } from "../../lib/id";
import { formatDateShort, formatCurrency } from "../../lib/format";
import { toast } from "../../components/ui/Toast";
import type { Project, ProjectStatus } from "../../types";

const PROJECT_STATUSES: ProjectStatus[] = ["Planning", "In Progress", "At Risk", "On Hold", "Completed"];
const SORTS = ["Deadline", "Value"] as const;

const STATUS_BORDER: Record<ProjectStatus, string> = {
  Planning: "border-l-status-warning-text",
  "In Progress": "border-l-status-success-text",
  "At Risk": "border-l-status-overdue-text",
  "On Hold": "border-l-outline",
  Completed: "border-l-status-success-text",
};

export default function ProjectsList() {
  const { projects, clients, company, addEntity, updateEntity, logActivity } = useStore();
  const requestedCreate = useUiStore((s) => s.requestedCreate);
  const clearRequestedCreate = useUiStore((s) => s.clearRequestedCreate);
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "All">("All");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Deadline");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", client_id: "", deadline: "", budget: 0 });
  const [editProject, setEditProject] = useState<Project | null>(null);

  useEffect(() => {
    if (requestedCreate === "project") {
      setModalOpen(true);
      clearRequestedCreate();
    }
  }, [requestedCreate, clearRequestedCreate]);

  // Deep-link support: Client Profile's project rows link here with ?open=<id> (spec Section 15)
  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) {
      const p = projects.find((pr) => pr.id === openId);
      if (p) setEditProject(p);
      searchParams.delete("open");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const visibleProjects = useMemo(() => {
    let list = statusFilter === "All" ? projects : projects.filter((p) => p.status === statusFilter);
    list = [...list].sort((a, b) => (sort === "Deadline" ? new Date(a.deadline).getTime() - new Date(b.deadline).getTime() : b.budget - a.budget));
    return list;
  }, [projects, statusFilter, sort]);

  function handleCreate() {
    if (!form.name || !form.client_id) {
      toast.error("Project name and client are required");
      return;
    }
    const project: Project = {
      id: newId(),
      company_id: company.id,
      name: form.name,
      client_id: form.client_id,
      status: "Planning",
      progress: 0,
      deadline: form.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      budget: form.budget,
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("projects", project);
    toast.success("Project created");
    setModalOpen(false);
    setForm({ name: "", client_id: "", deadline: "", budget: 0 });
  }

  return (
    <AppShell>
      <PageHeader
        title="Active Projects"
        subtitle="Manage ongoing client deliverables and financial status."
        right={
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | "All")}
                className="appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg pl-9 pr-8 h-10 text-body-sm font-body-sm text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="All">All statuses</option>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <Icon name="filter_list" size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}
                className="appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg pl-9 pr-8 h-10 text-body-sm font-body-sm text-on-surface focus:outline-none focus:border-primary"
              >
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    Sort: {s}
                  </option>
                ))}
              </select>
              <Icon name="swap_vert" size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            </div>
          </div>
        }
      />

      {visibleProjects.length === 0 ? (
        <EmptyState
          icon="folder_open"
          title="No projects yet"
          description="Projects appear here once a deal is won, or you can start one directly."
          actionLabel="+ Add your first project"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          {visibleProjects.map((p) => {
            const client = clients.find((c) => c.id === p.client_id);
            const totalPaid = p.total_paid || 0;
            const balanceDue = Math.max(0, p.budget - totalPaid);
            const paidPercentage = p.budget > 0 ? Math.round((totalPaid / p.budget) * 100) : 0;
            return (
              <Card key={p.id} className={`border-l-4 ${STATUS_BORDER[p.status]}`} onClick={() => setEditProject(p)} style={{ cursor: "pointer" }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusPill label={p.status} tone={toneForStatus(p.status)} />
                    <span className="text-body-sm font-body-sm text-on-surface-variant">{client?.name ?? "No client"}</span>
                  </div>
                  <Icon name="more_horiz" size={18} className="text-on-surface-variant" />
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-1.5">{p.name}</h3>
                {p.requirements && <p className="text-body-sm font-body-sm text-on-surface-variant mb-4 line-clamp-2">{p.requirements}</p>}

                <div className="grid grid-cols-4 gap-3 bg-surface-container-low rounded-lg p-3 mb-4">
                  <div>
                    <div className="text-[10px] font-label-bold uppercase text-on-surface-variant">Value</div>
                    <div className="font-semibold text-body-sm text-on-surface">{formatCurrency(p.budget, company.currency)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-label-bold uppercase text-on-surface-variant">Advance</div>
                    <div className="font-semibold text-body-sm text-status-success-text">{formatCurrency(p.advance_paid || 0, company.currency)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-label-bold uppercase text-on-surface-variant">Balance</div>
                    <div className="font-semibold text-body-sm text-primary">{formatCurrency(balanceDue, company.currency)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-label-bold uppercase text-on-surface-variant">Paid</div>
                    <div className="mt-1.5">
                      <ProgressBar value={paidPercentage} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                    <div>
                      <div className="uppercase text-[10px] font-label-bold">Start Date</div>
                      <div className="font-medium text-on-surface">{formatDateShort(p.created_at)}</div>
                    </div>
                    <div>
                      <div className="uppercase text-[10px] font-label-bold">Deadline</div>
                      <div className="font-medium text-error">{formatDateShort(p.deadline)}</div>
                    </div>
                  </div>
                  {p.next_action && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditProject(p);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary text-primary text-label-sm font-label-bold hover:bg-primary/10 transition-colors flex-shrink-0"
                    >
                      Next: {p.next_action}
                      <Icon name="arrow_forward" size={14} />
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Project — every field editable in place, no re-creating records (spec Sections 16, 24-25) */}
      <Modal
        open={!!editProject}
        onClose={() => setEditProject(null)}
        title={editProject?.name ?? "Project"}
        footer={
          <Button variant="secondary" onClick={() => setEditProject(null)}>
            Close
          </Button>
        }
      >
        {editProject && (
          <>
            <Field label="Client">
              <TextInput disabled value={clients.find((c) => c.id === editProject.client_id)?.name ?? "—"} />
            </Field>
            <Field label="Status">
              <Select
                value={editProject.status}
                onChange={(e) => {
                  const status = e.target.value as ProjectStatus;
                  updateEntity<Project>("projects", editProject.id, { status });
                  logActivity({ entity_type: "Project", entity_id: editProject.id, summary: `${editProject.name} status changed to ${status}` });
                  setEditProject({ ...editProject, status });
                  toast.success("Project updated");
                }}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Progress %">
                <TextInput
                  type="number"
                  min={0}
                  max={100}
                  value={editProject.progress}
                  onChange={(e) => {
                    const progress = Math.max(0, Math.min(100, Number(e.target.value)));
                    updateEntity<Project>("projects", editProject.id, { progress });
                    setEditProject({ ...editProject, progress });
                  }}
                />
              </Field>
              <Field label="Deadline">
                <TextInput
                  type="date"
                  value={editProject.deadline?.slice(0, 10)}
                  onChange={(e) => {
                    const deadline = new Date(e.target.value).toISOString();
                    updateEntity<Project>("projects", editProject.id, { deadline });
                    setEditProject({ ...editProject, deadline });
                  }}
                />
              </Field>
            </div>
            <Field label="Budget">
              <TextInput
                type="number"
                value={editProject.budget}
                onChange={(e) => {
                  const budget = Number(e.target.value);
                  updateEntity<Project>("projects", editProject.id, { budget });
                  setEditProject({ ...editProject, budget });
                }}
              />
            </Field>
            <Field label="Next Action">
              <TextInput
                value={editProject.next_action || ""}
                placeholder="Send milestone update to client"
                onChange={(e) => {
                  const next_action = e.target.value;
                  updateEntity<Project>("projects", editProject.id, { next_action });
                  setEditProject({ ...editProject, next_action });
                }}
              />
            </Field>
            <p className="text-xs text-on-surface-variant pt-2">
              Budget: {formatCurrency(editProject.budget, company.currency)} — changes save immediately.
            </p>
          </>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Add Project
            </Button>
          </>
        }
      >
        <Field label="Project Name" required>
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Northwind Rebrand" />
        </Field>
        <Field label="Client" required>
          <Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Deadline">
            <TextInput type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: new Date(e.target.value).toISOString() })} />
          </Field>
          <Field label="Budget">
            <TextInput type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} />
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
