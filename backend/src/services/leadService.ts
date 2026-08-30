import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const createLeadSchema = z.object({
  name: z.string().min(1),
  companyName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  source: z.string().default("Other"),
  score: z.number().min(0).max(100).default(50),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const leadService = {
  async list(companyId: string) {
    return prisma.lead.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  },

  async get(companyId: string, id: string) {
    const lead = await prisma.lead.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!lead) throw new NotFoundError("Lead not found");
    return lead;
  },

  async create(companyId: string, input: CreateLeadInput) {
    return prisma.lead.create({
      data: {
        companyId,
        name: input.name,
        companyName: input.companyName,
        email: input.email || undefined,
        phone: input.phone,
        source: input.source,
        score: input.score,
        status: "New",
      },
    });
  },

  async update(companyId: string, id: string, patch: Partial<CreateLeadInput> & { status?: string }) {
    await this.get(companyId, id); // 404s if not found or not in scope
    return prisma.lead.update({
      where: { id },
      data: {
        ...(patch.name && { name: patch.name }),
        ...(patch.companyName && { companyName: patch.companyName }),
        ...(patch.email !== undefined && { email: patch.email }),
        ...(patch.phone !== undefined && { phone: patch.phone }),
        ...(patch.source && { source: patch.source }),
        ...(patch.score !== undefined && { score: patch.score }),
        ...(patch.status && { status: patch.status }),
      },
    });
  },

  async softDelete(companyId: string, id: string) {
    await this.get(companyId, id);
    return prisma.lead.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  /**
   * Lead Won -> Client + Contact + Deal, atomically. Fields are carried
   * forward from the lead, never re-typed by the user (spec Section 4, "Key
   * cascades"). This is the reference pattern every other cascade
   * (Deal Won -> Project+Invoice, Payment -> Invoice/Revenue/Goal) should
   * follow: one $transaction, one audit-log entry, one activity entry.
   */
  async convertToClient(companyId: string, leadId: string, actorId: string) {
    const lead = await this.get(companyId, leadId);
    if (lead.status === "Converted") throw new ConflictError("Lead already converted");

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const client = await tx.client.create({
        data: {
          companyId,
          name: lead.companyName || lead.name,
          logoInitial: (lead.companyName || lead.name).charAt(0).toUpperCase(),
          status: "Active",
          descriptor: `Converted from lead — ${lead.source}`,
          healthScore: 70,
          sourceLeadId: lead.id,
        },
      });

      const contact = await tx.contact.create({
        data: {
          companyId,
          clientId: client.id,
          name: lead.name,
          role: "Primary Contact",
          email: lead.email,
          phone: lead.phone,
          isPrimary: true,
        },
      });

      const deal = await tx.deal.create({
        data: {
          companyId,
          title: `${client.name} — New Engagement`,
          clientId: client.id,
          leadId: lead.id,
          value: 0,
          probability: 40,
          stage: "New",
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: { status: "Converted", convertedClientId: client.id },
      });

      await tx.activity.create({
        data: {
          companyId,
          entityType: "Client",
          entityId: client.id,
          actorId,
          summary: `${client.name} converted from lead "${lead.name}"`,
        },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          actorId,
          action: "lead.convert_to_client",
          entityType: "Lead",
          entityId: lead.id,
          meta: { clientId: client.id, dealId: deal.id },
        },
      });

      return { client, contact, deal };
    });
  },
};

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
