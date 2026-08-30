import { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { StatusPill } from "../../components/ui/StatusPill";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Field, Select, TextInput } from "../../components/ui/FormField";
import { useStore } from "../../lib/store";
import { newId, nowIso } from "../../lib/id";
import { initials } from "../../lib/format";
import { toast } from "../../components/ui/Toast";
import type { Role, User } from "../../types";

const ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER", "SALES", "EMPLOYEE", "FINANCE"];

export default function TeamList() {
  const { users, company, addEntity, currentUser } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "EMPLOYEE" as Role });

  function handleCreate() {
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    if (currentUser.role !== "OWNER" && currentUser.role !== "ADMIN") {
      toast.error("Only Owners and Admins can invite team members");
      return;
    }
    const user: User = {
      id: newId(),
      company_id: company.id,
      name: form.name,
      email: form.email,
      role: form.role,
      avatar_initials: initials(form.name),
      avatar_color: "bg-primary",
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("users", user);
    toast.success("Team member invited");
    setModalOpen(false);
    setForm({ name: "", email: "", role: "EMPLOYEE" });
  }

  const columns: Column<User>[] = [
    {
      key: "name",
      label: "Name",
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} size={28} />
          <div>
            <div className="font-semibold text-on-surface">{r.name}</div>
            <div className="text-xs text-on-surface-variant md:hidden">{r.email}</div>
          </div>
        </div>
      ),
    },
    { key: "email", label: "Email", hideOnMobile: true, render: (r) => r.email },
    { key: "role", label: "Role", width: "w-32", align: "center", render: (r) => <StatusPill label={r.role} tone="neutral" /> },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Team"
        subtitle={`Signed in as ${currentUser.name} — ${currentUser.role}`}
        right={
          <Button variant="primary" icon={<Icon name="add" size={18} />} onClick={() => setModalOpen(true)}>
            Invite Member
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={users}
        searchFields={(r) => `${r.name} ${r.email} ${r.role}`}
        exportFilename="team"
        emptyState={{ icon: "badge", title: "No team members yet", description: "Invite teammates to collaborate on leads, projects, and tasks.", actionLabel: "+ Invite your first member", onAction: () => setModalOpen(true) }}
        height={420}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Invite Team Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              Send Invite
            </Button>
          </>
        }
      >
        <Field label="Name" required>
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ananya Singh" />
        </Field>
        <Field label="Email" required>
          <TextInput type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ananya@trinityai.com" />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
      </Modal>
    </AppShell>
  );
}
