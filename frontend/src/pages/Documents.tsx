import { useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import { DataTable, type Column } from "../components/ui/DataTable";
import { StatusPill } from "../components/ui/StatusPill";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { Modal } from "../components/ui/Modal";
import { Field, Select, TextInput } from "../components/ui/FormField";
import { useStore } from "../lib/store";
import { newId, nowIso } from "../lib/id";
import { toast } from "../components/ui/Toast";
import type { Doc, DocumentCategory } from "../types";

const CATEGORIES: DocumentCategory[] = ["Contract", "Proposal", "Invoice", "Brand Asset", "Report", "Other"];

export default function Documents() {
  const { documents, company, addEntity } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Other" as DocumentCategory });

  function handleCreate() {
    if (!form.name) {
      toast.error("File name is required");
      return;
    }
    const doc: Doc = {
      id: newId(),
      company_id: company.id,
      name: form.name,
      category: form.category,
      size_kb: Math.floor(50 + Math.random() * 900),
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("documents", doc);
    toast.success("Document added");
    setModalOpen(false);
    setForm({ name: "", category: "Other" });
  }

  const columns: Column<Doc>[] = [
    { key: "name", label: "Name", sortValue: (r) => r.name, render: (r) => <span className="font-semibold flex items-center gap-2"><Icon name="description" size={16} className="text-on-surface-variant" />{r.name}</span> },
    { key: "category", label: "Category", width: "w-32", align: "center", render: (r) => <StatusPill label={r.category} tone="neutral" /> },
    { key: "size", label: "Size", hideOnMobile: true, align: "right", render: (r) => `${r.size_kb} KB` },
    { key: "updated", label: "Updated", hideOnMobile: true, render: (r) => new Date(r.updated_at).toLocaleDateString() },
  ];

  return (
    <AppShell>
      <PageHeader title="Documents" subtitle="Contracts, proposals, and brand assets linked across the OS." right={<Button variant="primary" icon={<Icon name="upload" size={18} />} onClick={() => setModalOpen(true)}>Upload</Button>} />

      <DataTable
        columns={columns}
        rows={documents}
        searchFields={(r) => `${r.name} ${r.category}`}
        exportFilename="documents"
        emptyState={{ icon: "folder", title: "No documents yet", description: "Upload contracts, proposals, or brand assets to keep them linked to the right client or project.", actionLabel: "+ Upload your first document", onAction: () => setModalOpen(true) }}
        height={460}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>Add</Button>
          </>
        }
      >
        <Field label="File Name" required>
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Northwind — MSA.pdf" />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as DocumentCategory })}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <p className="text-xs text-on-surface-variant">This demo records file metadata only — actual file storage connects in a later phase (Section 9, Integrations).</p>
      </Modal>
    </AppShell>
  );
}
