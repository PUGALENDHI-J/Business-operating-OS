import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { KanbanBoard, type KanbanColumnDef } from "../../components/ui/KanbanBoard";
import { StatusPill } from "../../components/ui/StatusPill";
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
  { key: "To Do", label: "To Do" },
  { key: "In Progress", label: "In Progress" },
  { key: "Review", label: "Review" },
  { key: "Done", label: "Done", tone: "won" },
];

const PRIORITY_TONE: Record<TaskPriority, "warning" | "active" | "overdue"> = {
  LOW: "active",
  MEDIUM: "active",
  HIGH: "warning",
  URGENT: "overdue",
};

const FILTERS = ["All Tasks", "My Tasks", "Due Today"] as const;

export default function TasksKanban() {
  const { tasks, projects, currentUser, company, addEntity } = useStore();
  const requestedCreate = useUiStore((s) => s.requestedCreate);
  const clearRequestedCreate = useUiStore((s) => s.clearRequestedCreate);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All Tasks");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", project_id: "", priority: "MEDIUM" as TaskPriority });

  useEffect(() => {
    if (requestedCreate === "task") {
      setModalOpen(true);
      clearRequestedCreate();
    }
  }, [requestedCreate, clearRequestedCreate]);

  const filteredTasks = useMemo(() => {
    if (filter === "My Tasks") return tasks.filter((t) => t.assignee_id === currentUser.id);
    if (filter === "Due Today") return tasks.filter((t) => t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString());
    return tasks;
  }, [tasks, filter, currentUser.id]);

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
          <PageHeader title="Tasks" />
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
            <div className="flex-1" />
            <Button variant="primary" icon={<Icon name="add" size={18} />} onClick={() => setModalOpen(true)}>
              Add Task
            </Button>
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
              const isUrgentInProgress = task.priority === "URGENT" && task.status === "In Progress";
              return (
                <div
                  className={`bg-surface-container-lowest rounded-lg border p-3 shadow-soft hover:shadow-soft-hover transition-shadow ${
                    isUrgentInProgress ? "border-error ring-1 ring-error/30" : "border-outline-variant"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <StatusPill label={task.priority} tone={PRIORITY_TONE[task.priority]} />
                    {isDone && <Icon name="check_circle" className="text-green-600" size={18} />}
                  </div>
                  <div className={`font-semibold text-body-sm text-on-surface mb-1 ${isDone ? "line-through text-on-surface-variant" : ""}`}>{task.title}</div>
                  {project && <div className="text-xs text-on-surface-variant mb-2">{project.name}</div>}
                  <div className="flex items-center justify-between text-xs text-on-surface-variant">
                    <div className="flex items-center gap-3">
                      {task.comments_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Icon name="chat_bubble" size={14} /> {task.comments_count}
                        </span>
                      )}
                      {task.attachments_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Icon name="attach_file" size={14} /> {task.attachments_count}
                        </span>
                      )}
                    </div>
                    {task.assignee_id && <Icon name="account_circle" size={16} />}
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
