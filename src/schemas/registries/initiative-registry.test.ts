import { describe, expect, it } from "vitest";

import {
  ImpactSummarySchema,
  InitiativeContentSchema,
} from "./initiative-registry.js";

describe("InitiativeContentSchema", () => {
  it("accepts vision, scope.in/out, and non-empty success_criteria", () => {
    const ok = InitiativeContentSchema.safeParse({
      vision: "Adopt registry-based schemas",
      scope: {
        in: ["Registry everywhere", "Docs gen"],
        out: ["Legacy formats"],
      },
      success_criteria: ["100% adoption"],
    });
    expect(ok.success).toBe(true);
  });

  it("trims scope lists and success_criteria entries (vision unchanged)", () => {
    const parsed = InitiativeContentSchema.parse({
      vision: "  Clear vision  ",
      scope: { in: [" a ", "b"], out: [" c "] },
      success_criteria: [" x ", "y"],
    });
    // VisionSchema does not trim; keep as-is
    expect(parsed.vision).toBe("  Clear vision  ");
    expect(parsed.scope.in).toEqual(["a", "b"]);
    expect(parsed.scope.out).toEqual(["c"]);
    expect(parsed.success_criteria).toEqual(["x", "y"]);
  });

  it("rejects empty vision and empty in/out/success lists", () => {
    expect(
      InitiativeContentSchema.safeParse({
        vision: "",
        scope: { in: ["a"], out: ["b"] },
        success_criteria: ["x"],
      }).success,
    ).toBe(false);

    for (const bad of [
      { vision: "v", scope: { in: [], out: ["b"] }, success_criteria: ["x"] },
      { vision: "v", scope: { in: ["a"], out: [] }, success_criteria: ["x"] },
      { vision: "v", scope: { in: ["a"], out: ["b"] }, success_criteria: [] },
    ]) {
      expect(InitiativeContentSchema.safeParse(bad as unknown).success).toBe(
        false,
      );
    }
  });
});

describe("ImpactSummarySchema", () => {
  it("accepts outcome, non-empty benefits, and next; evidence optional", () => {
    const ok = ImpactSummarySchema.safeParse({
      outcome: "Reduced onboarding time",
      benefits: ["-22% setup time", "+10% conversion"],
      next: "Expand org-wide",
    });
    expect(ok.success).toBe(true);
  });

  it("trims strings and list items", () => {
    const parsed = ImpactSummarySchema.parse({
      outcome: "  Outcome  ",
      benefits: [" a ", "b"],
      evidence: ["  dashboard#123  "],
      next: "  Next step  ",
    });
    expect(parsed.outcome).toBe("Outcome");
    expect(parsed.benefits).toEqual(["a", "b"]);
    expect(parsed.evidence).toEqual(["dashboard#123"]);
    expect(parsed.next).toBe("Next step");
  });

  it("rejects missing required fields and empty/whitespace-only values", () => {
    const cases: Array<Record<string, unknown>> = [
      { benefits: ["a"], next: "x" }, // outcome missing
      { outcome: "x", next: "x" }, // benefits missing
      { outcome: "x", benefits: [], next: "x" }, // benefits empty
      { outcome: "", benefits: ["a"], next: "x" }, // outcome empty
      { outcome: "x", benefits: ["a"], next: "" }, // next empty
      { outcome: "x", benefits: [" "], next: "x" }, // benefits item empty
    ];
    for (const c of cases) {
      expect(ImpactSummarySchema.safeParse(c as unknown).success).toBe(false);
    }
  });
});
