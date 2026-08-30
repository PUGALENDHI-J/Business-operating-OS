import { useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { KPICard } from "../../components/ui/KPICard";
import { Button } from "../../components/ui/Button";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Field, Select, TextInput } from "../../components/ui/FormField";
import { useStore } from "../../lib/store";
import { newId, nowIso } from "../../lib/id";
import { formatCurrency } from "../../lib/format";
import { toast } from "../../components/ui/Toast";
import type { Service } from "../../types";

export default function ServicesList() {
  const { services, company, addEntity } = useStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", default_price: 0, billing_type: "One-time" as Service["billing_type"] });

  function handleCreate() {
    if (!form.name) {
      toast.error("Service name is required");
      return;
    }
    const service: Service = {
      id: newId(),
      company_id: company.id,
      name: form.name,
      category: form.category || "General",
      default_price: form.default_price,
      billing_type: form.billing_type,
      created_at: nowIso(),
      updated_at: nowIso(),
      is_demo: false,
    };
    addEntity("services", service);
    toast.success("Service added");
    setModalOpen(false);
    setForm({ name: "", category: "", default_price: 0, billing_type: "One-time" });
  }

  const columns: Column<Service>[] = [
    { key: "name", label: "Service", sortValue: (r) => r.name, render: (r) => <span className="font-semibold">{r.name}</span> },
    { key: "category", label: "Category", hideOnMobile: true, render: (r) => r.category },
    { key: "billing", label: "Billing", hideOnMobile: true, render: (r) => r.billing_type },
    { key: "price", label: "Default Price", align: "right", sortValue: (r) => r.default_price, render: (r) => formatCurrency(r.default_price, company.currency) },
  ];

  return (
    <AppShell>
      <PageHeader title="Services" subtitle="Your reusable offerings — used to price proposals and deals faster." right={<Button variant="primary" icon={<Icon name="add" size={18} />} onClick={() => setModalOpen(true)}>Add Service</Button>} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <KPICard label="Total Services" value={services.length} hasData={services.length > 0} height={100} />
        <KPICard label="Recurring" value={services.filter((s) => s.billing_type === "Recurring").length} hasData={services.length > 0} height={100} />
        <KPICard label="One-time" value={services.filter((s) => s.billing_type === "One-time").length} hasData={services.length > 0} height={100} />
      </div>

      <DataTable
        columns={columns}
        rows={services}
        searchFields={(r) => `${r.name} ${r.category}`}
        exportFilename="services"
        emptyState={{ icon: "design_services", title: "No services yet", description: "Add the services you offer to speed up proposals and deals.", actionLabel: "+ Add your first service", onAction: () => setModalOpen(true) }}
        height={420}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Service"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate}>Add Service</Button>
          </>
        }
      >
        <Field label="Service Name" required>
          <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Brand & Web Sprint" />
        </Field>
        <Field label="Category">
          <TextInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Design" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Default Price">
            <TextInput type="number" value={form.default_price} onChange={(e) => setForm({ ...form, default_price: Number(e.target.value) })} />
          </Field>
          <Field label="Billing Type">
            <Select value={form.billing_type} onChange={(e) => setForm({ ...form, billing_type: e.target.value as Service["billing_type"] })}>
              <option>One-time</option>
              <option>Recurring</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
