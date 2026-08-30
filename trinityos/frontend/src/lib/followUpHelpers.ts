import type { Client, FollowUp, Lead } from "../types";

export interface FollowUpTarget {
  kind: "Lead" | "Client";
  entityId: string;
  name: string;
  business: string;
  whatsapp?: string | null;
  phone?: string | null;
  requirement?: string;
  value?: number;
}

/**
 * Resolves the customer a follow-up is about, so the follow-up widgets
 * (Dashboard "Today's Follow-ups", Client Profile) can show WhatsApp/Call
 * buttons and context without the caller needing to know which entity
 * the follow-up was scheduled against (spec Section 26).
 */
export function resolveFollowUpTarget(followUp: FollowUp, data: { leads: Lead[]; clients: Client[] }): FollowUpTarget | null {
  if (followUp.lead_id) {
    const lead = data.leads.find((l) => l.id === followUp.lead_id);
    if (lead) {
      return {
        kind: "Lead",
        entityId: lead.id,
        name: lead.name,
        business: lead.company_name,
        whatsapp: lead.whatsapp || lead.phone,
        phone: lead.phone,
        requirement: lead.requirement,
        value: lead.estimated_value,
      };
    }
  }
  if (followUp.client_id) {
    const client = data.clients.find((c) => c.id === followUp.client_id);
    if (client) {
      return {
        kind: "Client",
        entityId: client.id,
        name: client.name,
        business: client.descriptor,
        whatsapp: client.whatsapp || client.phone,
        phone: client.phone,
        requirement: client.requirement,
        value: client.project_value,
      };
    }
  }
  return null;
}
