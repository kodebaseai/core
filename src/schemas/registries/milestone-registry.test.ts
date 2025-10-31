import { describe, expect, it } from "vitest";

import {
  DeliverySummarySchema,
  MilestoneContentSchema,
} from "./milestone-registry.js";

describe("MilestoneContentSchema", () => {
  it("accepts summary and non-empty deliverables; validation optional", () => {
    const ok = MilestoneContentSchema.safeParse({
      summary: "Migrate all schemas to registry",
      deliverables: ["Registry Zod schemas", "Migration doc"],
      validation: ["No deprecated files"],
    });
    expect(ok.success).toBe(true);
  });

  it("trims deliverables and validation items (CriteriaListSchema)", () => {
    const parsed = MilestoneContentSchema.parse({
      summary: "Something",
      deliverables: [" one ", " two "],
      validation: ["  v1  ", " v2"],
    });
    expect(parsed.deliverables).toEqual(["one", "two"]);
    expect(parsed.validation).toEqual(["v1", "v2"]);
  });

  it("rejects empty summary or empty deliverables list", () => {
    expect(
      MilestoneContentSchema.safeParse({
        summary: "",
        deliverables: ["a"],
      }).success,
    ).toBe(false);
    expect(
      MilestoneContentSchema.safeParse({
        summary: "Valid",
        deliverables: [],
      }).success,
    ).toBe(false);
  });
});

describe("DeliverySummarySchema", () => {
  it("accepts required fields; deviations/risks optional", () => {
    const ok = DeliverySummarySchema.safeParse({
      outcome: "All targets delivered",
      delivered: ["Registry system"],
      next: "Adopt across products",
    });
    expect(ok.success).toBe(true);
  });

  it("trims strings and list items", () => {
    const parsed = DeliverySummarySchema.parse({
      outcome: "  Outcome text  ",
      delivered: [" one ", " two"],
      deviations: ["  skip optional refactor  "],
      next: "  Continue rollout ",
      risks: ["  lagging downstream migrations  "],
    });
    expect(parsed.outcome).toBe("Outcome text");
    expect(parsed.delivered).toEqual(["one", "two"]);
    expect(parsed.deviations).toEqual(["skip optional refactor"]);
    expect(parsed.next).toBe("Continue rollout");
    expect(parsed.risks).toEqual(["lagging downstream migrations"]);
  });

  it("rejects missing required fields or empty delivered list", () => {
    const cases: Array<Record<string, unknown>> = [
      { delivered: ["a"], next: "x" }, // outcome missing
      { outcome: "x", next: "x" }, // delivered missing
      { outcome: "x", delivered: [], next: "x" }, // delivered empty
      { outcome: "", delivered: ["a"], next: "x" }, // outcome empty
      { outcome: "x", delivered: ["a"], next: "" }, // next empty
      { outcome: "x", delivered: [" "], next: "x" }, // delivered item empty
    ];
    for (const c of cases) {
      expect(DeliverySummarySchema.safeParse(c as unknown).success).toBe(false);
    }
  });
});
