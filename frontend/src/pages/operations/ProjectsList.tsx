import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { KPICard } from "../../components/ui/KPICard";
import { StatusPill } from "../../components/ui/StatusPill";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Field, Select, TextInput } from "../../components/ui/FormField";
import { useStore } from "../../lib/store";
import { useUiStore } from "../../lib/uiStore";
import { newId, nowIso } from "../../lib/id";
import { formatDate, formatCurrency } from "../../lib/format";
import { calculateOverdueProjectsCount, calculateProjectHealth } from "../../lib/calculations";
import { toast } from "../../components/ui/Toast";
import type { Project, ProjectStatus } from "../../types";

const PROJECT_STATUSES: ProjectStatus[] = ["Planning", "In Progress", "At Risk", "On Hold", "Completed"];

export default function ProjectsList() {
  const { projects, clients, company, addEntity, updateEntity, logActivity } = useStore();
  const requestedCreate = useUiStore((s) => s.requestedCreate);
  const clearRequestedCreate = useUiStore((s) => s.clearRequestedCreate);
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", client_id: "", deadline: "", budget: 0 });
  const [editProject, setEditProject] = useState<Project | null>(null);

  useEffect(() => {
    if (requestedCreate === "project") {
      setModalOpen(true);
      clearRequestedCreate();
    }
  }, [requestedCreate, clearRequestedCreate]);

  // Deep-link support: Client Profile's "View All" / project row links here with ?open=<id> (spec Section 15)
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

  const overdueCount = calculateOverdueProjectsCount(projects);
  const inProgress = projects.filter((p) => p.status === "In Progress").length;
  const completed = projects.filter((p) => p.status === "Completed").length;

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

  const columns: Column<Project>[] = [
    {
      key: "name",
      label: "Project",
      sortValue: (r) => r.name,
      render: (r) => {
        const client = clients.find((c) => c.id === r.client_id);
        const health = calculateProjectHealth(r);
        return (
          <div className="w-full">
            <div className="font-semibold text-on-surface">{r.name}</div>
            <div className="text-xs text-on-surface-variant mb-1">{client?.name ?? "—"}</div>
            <div className="w-full max-w-[180px]">
              <ProgressBar value={r.progress} variant={health} />
            </div>
          </div>
        );
      },
    },
    { key: "client", label: "Client", hideOnMobile: true, render: (r) => clients.find((c) => c.id === r.client_id)?.name ?? "—" },
    { key: "progress", label: "Progress", width: "w-16", align: "center", hideOnMobile: true, render: (r) => <span className="font-semibold">{r.progress}%</span> },
    {
      key: "deadline",
      label: "Deadline",
      hideOnMobile: true,
      sortValue: (r) => r.deadline,
      render: (r) => {
        const overdue = calculateProjectHealth(r) === "at-risk" && r.status !== "Completed";
        return <span className={overdue ? "text-error font-semibold" : ""}>{formatDate(r.deadline)}</span>;
      },
    },
    {
      key: "owner",
      label: "Owner",
      width: "w-16",
      align: "center",
      hideOnMobile: true,
      render: (r) => <Avatar name={r.owner_id ?? "Unassigned"} size={24} />,
    },
    { key: "status", label: "Status", width: "w-28", align: "center", render: (r) => <StatusPill label={r.status} /> },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Projects List"
        subtitle="Track delivery across every active engagement."
        right={
          <Button variant="primary" icon={<Icon name="add" size={18} />} onClick={() => setModalOpen(true)}>
            Add Project
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
        <KPICard label="Total Projects" value={projects.length} hasData={projects.length > 0} height={100} />
        <KPICard label="In Progress" value={inProgress} hasData={projects.length > 0} height={100} />
        <KPICard label="Completed" value={completed} hasData={projects.length > 0} height={100} />
        <KPICard
          label="Overdue"
          value={overdueCount}
          hasData={projects.length > 0}
          alert={overdueCount > 0}
          alertText={overdueCount > 0 ? `Overdue: ${overdueCount} — Requires immediate attention` : undefined}
          height={100}
        />
      </div>

      <DataTable
        columns={columns}
        rows={projects}
        onRowClick={(p) => setEditProject(p)}
        searchFields={(r) => `${r.name} ${clients.find((c) => c.id === r.client_id)?.name ?? ""}`}
        exportFilename="projects"
        exportMapper={(r) => ({ Name: r.name, Status: r.status, Progress: r.progress, Deadline: r.deadline, Budget: r.budget })}
        emptyState={{
          icon: "folder_open",
          title: "No projects yet",
          description: "Projects appear here once a deal is won, or you can start one directly.",
          actionLabel: "+ Add your first project",
          onAction: () => setModalOpen(true),
        }}
        pageSize={5}
        height={520}
      />

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
