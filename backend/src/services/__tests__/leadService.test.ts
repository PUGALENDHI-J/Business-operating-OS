import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted so the mock factory below (which vitest hoists above imports)
// can reference this fake client, and so the test body can assert on it.
const { mockPrisma, mockTx } = vi.hoisted(() => {
  const mockTx = {
    client: { create: vi.fn(async ({ data }: { data: unknown }) => ({ id: "client-1", ...(data as object) })) },
    contact: { create: vi.fn(async ({ data }: { data: unknown }) => ({ id: "contact-1", ...(data as object) })) },
    deal: { create: vi.fn(async ({ data }: { data: unknown }) => ({ id: "deal-1", ...(data as object) })) },
    lead: { update: vi.fn(async ({ data }: { data: unknown }) => ({ id: "lead-1", ...(data as object) })) },
    activity: { create: vi.fn(async () => ({})) },
    auditLog: { create: vi.fn(async () => ({})) },
  };
  const mockPrisma = {
    lead: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  };
  return { mockPrisma, mockTx };
});

vi.mock("../../lib/prisma.js", () => ({ prisma: mockPrisma }));

const { leadService, ConflictError, NotFoundError } = await import("../leadService.js");

const COMPANY_ID = "company-1";
const ACTOR_ID = "user-1";

const fakeLead = {
  id: "lead-1",
  companyId: COMPANY_ID,
  name: "Priya Sharma",
  companyName: "Solstice Interiors",
  email: "priya@solstice.design",
  phone: "+91 90000 00000",
  source: "Referral",
  score: 78,
  status: "Qualified",
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("leadService.convertToClient", () => {
  it("creates a Client, primary Contact, and New-stage Deal in a single transaction, carrying lead fields forward", async () => {
    mockPrisma.lead.findFirst.mockResolvedValue(fakeLead);

    const result = await leadService.convertToClient(COMPANY_ID, "lead-1", ACTOR_ID);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

    expect(mockTx.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: COMPANY_ID,
          name: "Solstice Interiors",
          sourceLeadId: "lead-1",
        }),
      })
    );

    expect(mockTx.contact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Priya Sharma",
          email: "priya@solstice.design",
          isPrimary: true,
        }),
      })
    );

    expect(mockTx.deal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stage: "New", leadId: "lead-1" }),
      })
    );

    expect(mockTx.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "lead-1" },
        data: expect.objectContaining({ status: "Converted" }),
      })
    );

    // Auditability: both an Activity (visible in-app) and an AuditLog (compliance trail) entry are written.
    expect(mockTx.activity.create).toHaveBeenCalledTimes(1);
    expect(mockTx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "lead.convert_to_client", actorId: ACTOR_ID }),
      })
    );

    expect(result.client).toBeDefined();
    expect(result.contact).toBeDefined();
    expect(result.deal).toBeDefined();
  });

  it("throws NotFoundError for a lead outside the caller's company (company scoping)", async () => {
    // findFirst is called with a companyId filter; simulate "not found because it's scoped out".
    mockPrisma.lead.findFirst.mockResolvedValue(null);

    await expect(leadService.convertToClient(COMPANY_ID, "someone-elses-lead", ACTOR_ID)).rejects.toBeInstanceOf(NotFoundError);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws ConflictError if the lead was already converted", async () => {
    mockPrisma.lead.findFirst.mockResolvedValue({ ...fakeLead, status: "Converted" });

    await expect(leadService.convertToClient(COMPANY_ID, "lead-1", ACTOR_ID)).rejects.toBeInstanceOf(ConflictError);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
