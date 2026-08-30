import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { KanbanBoard, type KanbanColumnDef } from "../../components/ui/KanbanBoard";
import { StatusPill } from "../../components/ui/StatusPill";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Field, Select, TextInput } from "../../components/ui/FormField";
import { useStore } from "../../lib/store";
import { useUiStore } from "../../lib/uiStore";
import { newId, nowIso } from "../../lib/id";
import { toast } from "../../components/ui/Toast";
import type { Task, TaskPriority, TaskStatus } from "../../types";

const COLUMNS: KanbanColumnDef[] = [
  { key: "To Do", label: "To Do", tone: "default" },
  { key: "In Progress", label: "In Progress", tone: "progress" },
  { key: "Review", label: "Review", tone: "review" },
  { key: "Done", label: "Done", tone: "won" },
];

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Low Priority",
  MEDIUM: "Med Priority",
  HIGH: "High Priority",
  URGENT: "Urgent",
};

const PRIORITY_TONE: Record<TaskPriority, "warning" | "overdue" | "success"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "overdue",
  URGENT: "overdue",
};

const FILTERS = ["All Tasks", "My Tasks", "Due Today"] as const;

export default function TasksKanban() {
  const { tasks, projects, currentUser, company, addEntity } = useStore();
  const requestedCreate = useUiStore((s) => s.requestedCreate);
  const clearRequestedCreate = useUiStore((s) => s.clearRequestedCreate);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All Tasks");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", project_id: "", priority: "MEDIUM" as TaskPriority });

  useEffect(() => {
    if (requestedCreate === "task") {
      setModalOpen(true);
      clearRequestedCreate();
    }
  }, [requestedCreate, clearRequestedCreate]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (filter === "My Tasks") list = list.filter((t) => t.assignee_id === currentUser.id);
    if (filter === "Due Today") list = list.filter((t) => t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString());
    if (query.trim()) list = list.filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase()));
    return list;
  }, [tasks, filter, currentUser.id, query]);

  const itemsByColumn = useMemo(() => {
    const map: Record<string, Task[]> = { "To Do": [], "In Progress": [], Review: [], Done: [] };
    for (const t of filteredTasks) map[t.status]?.push(t);
    return map;
  }, [filteredTasks]);

  function handleMove(taskId: string, toStatus: string) {
    useStore.getState().updateEntity<Task>("tasks", taskId, { status: toStatus as TaskStatus });
  }

  function handleCreate() {
    if (!form.title) {
      toast.error("Task title is required");
      return;
    }
    const task: Task = {
      id: newId(),
      company_id: company.id,
      title: form.title,
      project_id: form.project_id || undefined,
      status: "To Do",
      priority: form.priority,
      comments_count: 0,
      attachments_count: 0,
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("tasks", task);
    toast.success("Task added");
    setModalOpen(false);
    setForm({ title: "", project_id: "", priority: "MEDIUM" });
  }

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-160px)]">
        <div className="space-y-stack-md flex-shrink-0">
          <PageHeader
            title="Active Tasks"
            subtitle="Manage project deliverables across the team."
            right={
              searchOpen ? (
                <div className="relative">
                  <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onBlur={() => !query && setSearchOpen(false)}
                    placeholder="Search tasks…"
                    className="w-56 bg-surface-container-lowest border border-outline-variant rounded-lg py-2 pl-9 pr-3 text-body-sm font-body-sm focus:outline-none focus:border-primary"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setSearchOpen(true)}
                  className="w-10 h-10 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low flex items-center justify-center transition-colors"
                >
                  <Icon name="search" size={18} />
                </button>
              )
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-label-sm font-label-sm border transition-colors ${
                  filter === f ? "bg-primary text-on-primary border-primary" : "bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 mt-gutter">
          <KanbanBoard<Task>
            columns={COLUMNS}
            itemsByColumn={itemsByColumn}
            onMove={handleMove}
            emptyLabel="Nothing here yet."
            renderCard={(task) => {
              const project = projects.find((p) => p.id === task.project_id);
              const isDone = task.status === "Done";
              const overdue = task.due_date && new Date(task.due_date) < new Date() && !isDone;
              const dueToday = task.due_date && new Date(task.due_date).toDateString() === new Date().toDateString();
              return (
                <div
                  className={`bg-surface-container-lowest rounded-lg border p-3 shadow-soft hover:shadow-soft-hover transition-shadow ${
                    task.priority === "URGENT" && task.status === "In Progress" ? "border-error ring-1 ring-error/30" : "border-outline-variant"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <StatusPill label={PRIORITY_LABEL[task.priority]} tone={PRIORITY_TONE[task.priority]} />
                  </div>
                  <div className={`font-semibold text-body-sm text-on-surface mb-1 ${isDone ? "line-through text-on-surface-variant" : ""}`}>{task.title}</div>
                  {project && <div className="text-xs text-on-surface-variant mb-2">Project: {project.name}</div>}
                  <div className="flex items-center justify-between mt-2">
                    {task.due_date ? (
                      overdue || dueToday ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-error">
                          <Icon name="warning" size={14} /> {dueToday ? "Due Today" : "Overdue"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                          <Icon name="calendar_today" size={14} /> {new Date(task.due_date).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      )
                    ) : (
                      <span />
                    )}
                    {task.assignee_id && <Avatar name={task.assignee_id} size={24} />}
                  </div>
                </div>
              );
            }}
          />
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Task"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Add Task
            </Button>
          </>
        }
      >
        <Field label="Task Title" required>
          <TextInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Finalize logo system" />
        </Field>
        <Field label="Project">
          <Select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
            {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
      </Modal>
    </AppShell>
  );
}
