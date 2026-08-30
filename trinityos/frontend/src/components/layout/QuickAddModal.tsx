import { useNavigate } from "react-router-dom";
import { Modal } from "../ui/Modal";
import { Icon } from "../ui/Icon";
import { useUiStore, type QuickAddEntity } from "../../lib/uiStore";

const OPTIONS: { key: QuickAddEntity; label: string; icon: string; path: string }[] = [
  { key: "lead", label: "Lead", icon: "group_add", path: "/crm/leads" },
  { key: "client", label: "Client", icon: "domain", path: "/crm/clients" },
  { key: "deal", label: "Deal", icon: "view_kanban", path: "/crm/pipeline" },
  { key: "payment", label: "Payment", icon: "payments", path: "/crm/clients" },
  { key: "followup", label: "Follow-up", icon: "event", path: "/crm/clients" },
  { key: "project", label: "Project", icon: "folder_open", path: "/operations/projects" },
  { key: "task", label: "Task", icon: "task_alt", path: "/operations/tasks" },
  { key: "invoice", label: "Invoice", icon: "receipt_long", path: "/finance/invoices" },
  { key: "expense", label: "Expense", icon: "account_balance_wallet", path: "/finance/expenses" },
];

export function QuickAddModal() {
  const open = useUiStore((s) => s.quickAddOpen);
  const close = useUiStore((s) => s.closeQuickAdd);
  const requestCreate = useUiStore((s) => s.requestCreate);
  const navigate = useNavigate();

  return (
    <Modal open={open} onClose={close} title="What would you like to add?" width={480}>
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => {
              requestCreate(opt.key);
              navigate(opt.path);
            }}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-outline-variant hover:border-primary hover:bg-surface-container-low transition-colors"
          >
            <Icon name={opt.icon} className="text-on-surface-variant" size={26} />
            <span className="font-label-bold text-label-bold text-on-surface">{opt.label}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
