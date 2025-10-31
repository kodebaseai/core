import { describe, expect, it } from "vitest";

import {
  ArtifactIdSchema,
  ChallengeSchema,
  CriteriaListSchema,
  NotesSchema,
} from "./shared-registry.js";

describe("CriteriaListSchema", () => {
  it("accepts non-empty trimmed strings and enforces min length", () => {
    expect(CriteriaListSchema.safeParse(["a"]).success).toBe(true);
    const parsed = CriteriaListSchema.parse([" one ", "two"]);
    expect(parsed).toEqual(["one", "two"]); // trims items
  });

  it("rejects empty array and empty/whitespace items", () => {
    for (const bad of [[], [""], [" "]]) {
      expect(CriteriaListSchema.safeParse(bad as unknown).success).toBe(false);
    }
  });
});

describe("NotesSchema", () => {
  it("accepts string or non-empty string array and trims", () => {
    expect(NotesSchema.safeParse("simple note").success).toBe(true);
    expect(NotesSchema.safeParse(["a", "b"]).success).toBe(true);
    const s = NotesSchema.parse("  spaced note  ");
    expect(s).toBe("spaced note");
    const arr = NotesSchema.parse([" a ", " b "]);
    expect(arr).toEqual(["a", "b"]);
  });

  it("rejects empty array and empty/whitespace entries", () => {
    for (const bad of [[], [""], [" "]]) {
      expect(NotesSchema.safeParse(bad as unknown).success).toBe(false);
    }
  });
});

describe("ChallengeSchema", () => {
  it("accepts challenge/solution strings and trims", () => {
    const ok = ChallengeSchema.safeParse({
      challenge: "  hard thing  ",
      solution: "  clever fix  ",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.challenge).toBe("hard thing");
      expect(ok.data.solution).toBe("clever fix");
    }
  });

  it("rejects missing fields or empty strings", () => {
    const cases = [
      {},
      { challenge: "x" },
      { solution: "y" },
      { challenge: "", solution: "y" },
      { challenge: "x", solution: "" },
      { challenge: " ", solution: "z" },
    ];
    for (const c of cases) {
      expect(ChallengeSchema.safeParse(c as unknown).success).toBe(false);
    }
  });
});

describe("ArtifactIdSchema", () => {
  it("accepts initiative, milestone, and issue formats (supports multi-letter initiative)", () => {
    for (const ok of ["A", "AA", "A.1", "AB.2", "A.1.2", "AB.12.34"]) {
      expect(ArtifactIdSchema.safeParse(ok).success).toBe(true);
    }
  });

  it("rejects malformed IDs", () => {
    for (const bad of ["A1", "1", "A..1", "A.", ".1", "a.1", "A.1."]) {
      expect(ArtifactIdSchema.safeParse(bad).success).toBe(false);
    }
  });
});
