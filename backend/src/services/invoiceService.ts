import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { NotFoundError } from "./leadService.js";

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1),
  amount: z.number().min(0),
  dueDate: z.string().datetime().optional(),
  projectId: z.string().optional(),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

const PAYMENT_METHODS = ["Bank Transfer", "Card", "UPI", "Cash", "Other"] as const;
export const recordPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(PAYMENT_METHODS).default("Bank Transfer"),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const invoiceService = {
  async list(companyId: string) {
    return prisma.invoice.findMany({ where: { companyId, deletedAt: null }, orderBy: { createdAt: "desc" } });
  },

  async get(companyId: string, id: string) {
    const invoice = await prisma.invoice.findFirst({ where: { id, companyId, deletedAt: null } });
    if (!invoice) throw new NotFoundError("Invoice not found");
    return invoice;
  },

  async create(companyId: string, input: CreateInvoiceInput) {
    return prisma.invoice.create({
      data: {
        companyId,
        invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
        clientId: input.clientId,
        dueDate: input.dueDate ? new Date(input.dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        amount: input.amount,
        amountPaid: 0,
        status: "Unpaid",
        projectId: input.projectId,
      },
    });
  },

  /**
   * Third reference cascade, same shape as leadService.convertToClient and
   * dealService.markWon: one $transaction covering every table this touches
   * (Payment, Invoice, RevenueEntry, optionally AiInsight), plus Activity +
   * AuditLog. Never split into sequential non-transactional writes — a
   * partial failure here would leave the books wrong.
   */
  async recordPayment(companyId: string, invoiceId: string, input: RecordPaymentInput, actorId: string) {
    const invoice = await this.get(companyId, invoiceId);

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const payment = await tx.payment.create({
        data: { companyId, invoiceId, amount: input.amount, method: input.method },
      });

      const newPaid = Number(invoice.amountPaid) + input.amount;
      const newStatus = newPaid >= Number(invoice.amount) ? "Paid" : invoice.status === "Draft" ? "Unpaid" : invoice.status;

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid: newPaid, status: newStatus },
      });

      const revenueEntry = await tx.revenueEntry.create({
        data: {
          companyId,
          clientId: invoice.clientId,
          service: "Invoice payment",
          amount: input.amount,
          isRecurring: false,
          invoiceId,
        },
      });

      await tx.activity.create({
        data: { companyId, entityType: "Payment", entityId: payment.id, actorId, summary: `Payment received for ${invoice.invoiceNumber}` },
      });

      await tx.auditLog.create({
        data: { companyId, actorId, action: "invoice.record_payment", entityType: "Invoice", entityId: invoiceId, meta: { paymentId: payment.id, amount: input.amount } },
      });

      // If fully paid and the linked project is complete, surface an upsell
      // opportunity instead of auto-messaging the client (spec Section 4).
      let insight = null;
      if (newStatus === "Paid" && invoice.projectId) {
        const project = await tx.project.findUnique({ where: { id: invoice.projectId } });
        if (project && project.progress >= 100) {
          insight = await tx.aiInsight.create({
            data: {
              companyId,
              title: "Upsell Opportunity Identified",
              body: `${project.name} wrapped and its invoice is fully paid. This is a good moment to propose a follow-on engagement.`,
              severity: "info",
              source: "upsell",
              entityType: "Project",
              entityId: project.id,
            },
          });
        }
      }

      return { payment, invoice: updatedInvoice, revenueEntry, insight };
    });
  },
};
