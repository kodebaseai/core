import { describe, expect, it } from "vitest";

import {
  ImplementationNotesSchema,
  IssueContentSchema,
} from "./issue-registry.js";

describe("IssueContentSchema", () => {
  it("accepts summary and non-empty acceptance_criteria", () => {
    const ok = IssueContentSchema.safeParse({
      summary: "Implement strict validation",
      acceptance_criteria: ["Reject empty titles", "Use strict UTC timestamps"],
    });
    expect(ok.success).toBe(true);
  });

  it("trims acceptance_criteria items via shared CriteriaListSchema", () => {
    const parsed = IssueContentSchema.parse({
      summary: "Something",
      acceptance_criteria: [" one ", "two"],
    });
    expect(parsed.acceptance_criteria).toEqual(["one", "two"]);
  });

  it("rejects empty summary or empty acceptance_criteria list", () => {
    expect(
      IssueContentSchema.safeParse({
        summary: "",
        acceptance_criteria: ["ok"],
      }).success,
    ).toBe(false);

    expect(
      IssueContentSchema.safeParse({
        summary: "Valid",
        acceptance_criteria: [],
      }).success,
    ).toBe(false);
  });
});

describe("ImplementationNotesSchema", () => {
  it("is optional and can be omitted (undefined)", () => {
    // optional schema should parse undefined
    const res = ImplementationNotesSchema.safeParse(undefined);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toBeUndefined();
    }
  });

  it("accepts result and optional fields; trims strings", () => {
    const ok = ImplementationNotesSchema.safeParse({
      result: "  Added tests and schemas  ",
      tags: ["core", "zod-schemas"],
      challenges: [
        {
          challenge: "  timestamp edge-case  ",
          solution: "  tightened regex  ",
        },
      ],
      insights: ["Prefer unions for flexible shapes"],
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data?.result).toBe("Added tests and schemas");
      expect(ok.data?.challenges?.[0]?.challenge).toBe("timestamp edge-case");
      expect(ok.data?.challenges?.[0]?.solution).toBe("tightened regex");
    }
  });

  it("rejects non-kebab-case tags and empty tags array", () => {
    const badTags = ImplementationNotesSchema.safeParse({
      result: "Done",
      tags: ["Not-Kebab", "ok"],
    });
    expect(badTags.success).toBe(false);

    const emptyTags = ImplementationNotesSchema.safeParse({
      result: "Done",
      tags: [],
    });
    expect(emptyTags.success).toBe(false);
  });

  it("rejects invalid challenges structure and empty/whitespace values", () => {
    const cases = [
      { result: "x", challenges: [{}] },
      { result: "x", challenges: [{ challenge: "x" }] },
      { result: "x", challenges: [{ solution: "y" }] },
      { result: "x", challenges: [{ challenge: " ", solution: "y" }] },
      { result: "x", challenges: [{ challenge: "x", solution: "" }] },
    ];
    for (const c of cases) {
      expect(ImplementationNotesSchema.safeParse(c as unknown).success).toBe(
        false,
      );
    }
  });
});
