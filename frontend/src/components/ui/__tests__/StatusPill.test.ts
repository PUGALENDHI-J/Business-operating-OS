import { describe, expect, it } from "vitest";
import { toneForStatus } from "../StatusPill";

describe("toneForStatus — expanded lead/client lifecycle vocabulary (spec Section 13)", () => {
  it("treats terminal-positive states as success", () => {
    expect(toneForStatus("Won")).toBe("success");
    expect(toneForStatus("Completed")).toBe("success");
  });

  it("treats terminal-negative and at-risk states as overdue", () => {
    expect(toneForStatus("Lost")).toBe("overdue");
    expect(toneForStatus("At Risk")).toBe("overdue");
  });

  it("treats in-progress lifecycle states as warning", () => {
    expect(toneForStatus("Negotiation")).toBe("warning");
    expect(toneForStatus("Hot")).toBe("warning");
    expect(toneForStatus("Follow-up")).toBe("warning");
    expect(toneForStatus("Advance Received")).toBe("warning");
    expect(toneForStatus("Project Started")).toBe("warning");
    expect(toneForStatus("In Progress")).toBe("warning");
    expect(toneForStatus("Payment Due")).toBe("warning");
  });

  it("is case-insensitive", () => {
    expect(toneForStatus("HOT")).toBe("warning");
    expect(toneForStatus("won")).toBe("success");
  });
});
