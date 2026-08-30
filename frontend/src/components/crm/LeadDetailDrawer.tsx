import { Drawer } from "../ui/Drawer";
import { EditableField } from "../ui/EditableField";
import { ContactActions } from "../ui/ContactActions";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { useStore } from "../../lib/store";
import { formatCurrency, formatDate } from "../../lib/format";
import { phoneValidator, emailValidator } from "../../lib/contact";
import { toast } from "../ui/Toast";
import type { Lead, LeadSource, LeadStatus } from "../../types";

const SOURCES: LeadSource[] = ["Website", "Referral", "Cold Outreach", "Social", "Ads", "Event", "Other"];
const LEAD_STATUSES: LeadStatus[] = ["New", "Contacted", "Follow-up", "Negotiation", "Hot", "Qualified", "Unqualified", "Won", "Lost", "Converted"];

interface LeadDetailDrawerProps {
  leadId: string | null;
  onClose: () => void;
  onRequestConvert: (lead: Lead) => void;
}

export function LeadDetailDrawer({ leadId, onClose, onRequestConvert }: LeadDetailDrawerProps) {
  const { leads, company, updateEntity, logActivity } = useStore();
  const lead = leads.find((l) => l.id === leadId) || null;

  function save<K extends keyof Lead>(field: K, value: Lead[K]) {
    if (!lead) return;
    updateEntity<Lead>("leads", lead.id, { [field]: value } as Partial<Lead>);
    logActivity({ entity_type: "Lead", entity_id: lead.id, summary: `${lead.name}'s ${String(field).replace("_", " ")} updated` });
    toast.success("Lead updated successfully");
  }

  return (
    <Drawer
      open={!!lead}
      onClose={onClose}
      title={lead?.name || ""}
      subtitle={lead?.lead_number}
      footer={
        lead && lead.status !== "Converted" ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" onClick={() => onRequestConvert(lead)}>
              Convert to Client
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose} className="w-full">
            Close
          </Button>
        )
      }
    >
      {lead && (
        <>
          {/* Lead Overview */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <select
                value={lead.status}
                onChange={(e) => save("status", e.target.value as LeadStatus)}
                className="text-[12px] font-semibold leading-none rounded-full px-2.5 py-1 border-0 bg-status-neutral-bg text-status-neutral-text focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="text-xs text-on-surface-variant">Score {lead.score}</span>
              <span className="text-xs text-on-surface-variant">· Created {formatDate(lead.created_at)}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <EditableField label="Lead Name" value={lead.name} onSave={(v) => save("name", v)} />
              <EditableField label="Business / Company" value={lead.company_name} onSave={(v) => save("company_name", v)} />
            </div>
          </section>

          {/* Contact */}
          <section className="border-t border-outline-variant pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-headline-md text-headline-md">Contact</h4>
              <ContactActions whatsapp={lead.whatsapp || lead.phone} phone={lead.phone} email={lead.email} />
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <EditableField label="WhatsApp" value={lead.whatsapp || ""} type="tel" placeholder="+91 98765 43210" validate={phoneValidator} onSave={(v) => save("whatsapp", v)} />
              <EditableField label="Phone" value={lead.phone} type="tel" placeholder="+91 98765 43210" validate={phoneValidator} onSave={(v) => save("phone", v)} />
              <EditableField label="Email" value={lead.email} type="email" placeholder="name@company.com" validate={emailValidator} onSave={(v) => save("email", v)} />
              <EditableField label="Website" value={lead.website || ""} placeholder="company.com" onSave={(v) => save("website", v)} />
              <EditableField label="Location" value={lead.location || ""} placeholder="Mumbai, IN" onSave={(v) => save("location", v)} />
              <div>
                <span className="block text-label-sm font-label-sm text-on-surface-variant mb-1.5">Source</span>
                <select
                  value={lead.source}
                  onChange={(e) => save("source", e.target.value as LeadSource)}
                  className="w-full bg-surface-container-lowest border border-border-hairline rounded px-3 py-2 text-body-sm font-body-sm text-on-surface focus:outline-none focus:border-primary"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Business Requirement */}
          <section className="border-t border-outline-variant pt-4">
            <h4 className="font-headline-md text-headline-md mb-2">Business Requirement</h4>
            <EditableField label="Requirement" value={lead.requirement || ""} type="textarea" placeholder="Need a modern ecommerce website with payment gateway, WhatsApp integration and SEO." onSave={(v) => save("requirement", v)} />
          </section>

          {/* Estimate */}
          <section className="border-t border-outline-variant pt-4">
            <h4 className="font-headline-md text-headline-md mb-2">Project Estimate</h4>
            <EditableField
              label="Estimated Value"
              value={lead.estimated_value != null ? String(lead.estimated_value) : ""}
              type="number"
              placeholder="75000"
              formatDisplay={(v) => formatCurrency(Number(v), company.currency)}
              validate={(v) => (v && Number(v) < 0 ? "Must be 0 or more" : null)}
              onSave={(v) => save("estimated_value", v ? Number(v) : undefined)}
            />
          </section>

          {/* Follow-up */}
          <section className="border-t border-outline-variant pt-4">
            <h4 className="font-headline-md text-headline-md mb-2 flex items-center gap-2">
              <Icon name="event" size={18} className="text-on-surface-variant" />
              Follow-up
            </h4>
            <EditableField
              label="Next Follow-up"
              value={lead.next_follow_up ? lead.next_follow_up.slice(0, 10) : ""}
              type="text"
              placeholder="YYYY-MM-DD"
              formatDisplay={(v) => formatDate(v)}
              onSave={(v) => save("next_follow_up", v ? new Date(v).toISOString() : null)}
            />
            <EditableField
              label="Next Action"
              value={lead.next_action || ""}
              placeholder="Call customer, Send quotation, Collect advance…"
              onSave={(v) => save("next_action", v)}
            />
          </section>

          {/* Notes */}
          <section className="border-t border-outline-variant pt-4">
            <h4 className="font-headline-md text-headline-md mb-2">Notes</h4>
            <EditableField label="Internal notes" value={lead.notes || ""} type="textarea" placeholder="Internal notes about this lead…" onSave={(v) => save("notes", v)} />
          </section>

          {lead.status === "Converted" && (
            <div className="bg-status-active-bg text-status-active-text rounded-lg p-3 text-body-sm font-body-sm flex items-center gap-2">
              <Icon name="check_circle" size={18} />
              Converted to client — open the client profile from Clients.
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
