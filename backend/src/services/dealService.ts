import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { NotFoundError, ConflictError } from "./leadService.js";

export const createDealSchema = z.object({
  title: z.string().min(1),
  clientId: z.string().min(1),
  value: z.number().min(0).default(0),
  probability: z.number().min(0).max(100).default(40),
  stage: z.string().default("New"),
  expectedClose: z.string().datetime().optional(),
});
export type CreateDealInput = z.infer<typeof createDealSchema>;

const STARTER_TASKS = ["Kickoff call", "Scope & timeline", "Draft deliverable"];

export const dealService = {
  async list(companyId: string) {
    return prisma.deal.findMany({ where: { companyId, deletedAt: null }, orderBy: { createdAt: "desc" } });
  },

  async get(companyId: string, id: string) {
    const deal = await prisma.deal.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!deal) throw new NotFoundError("Deal not found");
    return deal;
  },

  async create(companyId: string, input: CreateDealInput) {
    return prisma.deal.create({
      data: {
        companyId,
        title: input.title,
        clientId: input.clientId,
        value: input.value,
        probability: input.probability,
        stage: input.stage,
        expectedClose: input.expectedClose ? new Date(input.expectedClose) : undefined,
      },
    });
  },

  async updateStage(companyId: string, id: string, stage: string) {
    await this.get(companyId, id);
    return prisma.deal.update({ where: { id }, data: { stage } });
  },

  /**
   * Deal Won -> Project + starter Tasks + draft Invoice, atomically. Mirrors
   * leadService.convertToClient's shape: one $transaction, one Activity
   * entry, one AuditLog entry. This is the second reference cascade — copy
   * this + leadService.convertToClient for any future multi-table write
   * (e.g. Proposal Accepted -> Deal stage change).
   */
  async markWon(companyId: string, dealId: string, actorId: string) {
    const deal = await this.get(companyId, dealId);
    if (deal.stage === "Won") throw new ConflictError("Deal is already marked Won");
    if (!deal.clientId) throw new ConflictError("Deal has no client linked");

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const project = await tx.project.create({
        data: {
          companyId,
          name: deal.title,
          clientId: deal.clientId!,
          status: "Planning",
          progress: 0,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          budget: deal.value,
          dealId: deal.id,
        },
      });

      const tasks = await Promise.all(
        STARTER_TASKS.map((title) =>
          tx.task.create({
            data: { companyId, title, projectId: project.id, status: "To Do", priority: "MEDIUM" },
          })
        )
      );

      const invoice = await tx.invoice.create({
        data: {
          companyId,
          invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
          clientId: deal.clientId!,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          amount: deal.value,
          amountPaid: 0,
          status: "Draft",
          projectId: project.id,
        },
      });

      await tx.deal.update({
        where: { id: deal.id },
        data: { stage: "Won", convertedProjectId: project.id },
      });

      await tx.activity.create({
        data: { companyId, entityType: "Project", entityId: project.id, actorId, summary: `${project.name} created from won deal` },
      });

      await tx.auditLog.create({
        data: {
          companyId,
          actorId,
          action: "deal.mark_won",
          entityType: "Deal",
          entityId: deal.id,
          meta: { projectId: project.id, invoiceId: invoice.id },
        },
      });

      return { project, tasks, invoice };
    });
  },
};
