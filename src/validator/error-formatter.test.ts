import { describe, expect, it } from "vitest";
import { ZodError, ZodIssueCode, z } from "zod";
import type { ArtifactParseIssue } from "../parser/artifact-parser.js";
import { InitiativeSchema, IssueSchema } from "../schemas/schemas.js";
import type { FormattedValidationIssue } from "./error-formatter.js";
import {
  formatIssuesSummary,
  formatParseIssues,
  formatZodError,
  formatZodIssue,
} from "./error-formatter.js";

const baseMetadata = {
  title: "Parser Formatter",
  priority: "high",
  estimation: "S",
  created_by: "Alice Example (alice@example.com)",
  assignee: "Bob Example (bob@example.com)",
  schema_version: "0.0.1",
  relationships: { blocks: [] as string[], blocked_by: [] as string[] },
  events: [
    {
      event: "draft",
      timestamp: "2025-10-30T14:37:00Z",
      actor: "Alice Example (alice@example.com)",
      trigger: "artifact_created",
    },
  ],
};

describe("formatZodIssue", () => {
  it("expands enum violations with allowed values", () => {
    const result = InitiativeSchema.safeParse({
      metadata: {
        ...baseMetadata,
        priority: "urgent",
      },
      content: {
        vision: "Validate everything",
        scope: { in: ["validation"], out: ["regressions"] },
        success_criteria: ["0 broken tests"],
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected initiative parse failure");
    }

    const first = result.error.issues[0];
    if (!first) {
      throw new Error("Expected at least one validation issue");
    }
    expect(formatZodIssue(first).suggestion).toMatch(/allowed values/i);
  });

  it("falls back to path hints for custom issues", () => {
    const error = new ZodError([
      {
        code: ZodIssueCode.custom,
        message: "Custom failure",
        path: ["content", "acceptance_criteria", Symbol("hint"), 0],
      },
    ]);
    const issue = error.issues[0];
    if (!issue) {
      throw new Error("Expected at least one validation issue");
    }

    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toMatch(/definition of done/i);
    expect(formatted.suggestion).toMatch(/definition of done/i);
  });

  it("suggests adding missing required fields", () => {
    const result = IssueSchema.safeParse({
      metadata: baseMetadata,
      content: {
        acceptance_criteria: ["Done"],
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected issue parse failure");
    }

    const firstIssue = result.error.issues[0];
    if (!firstIssue) {
      throw new Error("Expected at least one validation issue");
    }
    const formatted = formatZodIssue(firstIssue);
    expect(formatted.path).toBe("content.summary");
    expect(formatted.suggestion).toMatch(/Add the required field/i);
  });

  it("adds required field hint when received is explicitly undefined", () => {
    const invalidArtifact: {
      metadata: Record<string, unknown>;
      content: Record<string, unknown>;
    } = {
      metadata: { ...baseMetadata },
      content: {
        summary: "Clear summary",
        acceptance_criteria: ["Done"],
      },
    };
    invalidArtifact.metadata.title = undefined;

    const result = IssueSchema.safeParse(invalidArtifact);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected issue parse failure");
    }

    const undefinedIssue = result.error.issues.find(
      (candidate) =>
        candidate.path.length === 2 &&
        candidate.path[0] === "metadata" &&
        candidate.path[1] === "title",
    );
    if (!undefinedIssue) {
      throw new Error("Expected metadata.title validation issue");
    }

    const formatted = formatZodIssue(undefinedIssue);
    expect(formatted.suggestion).toMatch(/Add the required field/i);
  });

  it("includes pattern hints for invalid formats", () => {
    const schema = z.object({
      content: z.object({
        token: z.string().regex(/GUID/, { message: "Invalid format" }),
      }),
    });
    const result = schema.safeParse({
      content: {
        token: "not-matching",
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected regex validation failure");
    }

    const issue = result.error.issues[0];
    if (!issue) {
      throw new Error("Expected at least one validation issue");
    }

    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toMatch(/invalid format/i);
    expect(formatted.suggestion).toMatch(/required format/i);
  });
});

describe("formatZodError", () => {
  it("formats missing required array entries with actionable hint", () => {
    const result = IssueSchema.safeParse({
      metadata: baseMetadata,
      content: {
        summary: "Missing acceptance criteria",
        acceptance_criteria: [],
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected issue parse failure");
    }

    const formatted = formatZodError(result.error);
    expect(formatted).toHaveLength(1);
    expect(formatted[0]?.path).toBe("content.acceptance_criteria");
    expect(formatted[0]?.suggestion).toMatch(/Add at least/i);
  });

  it("falls back to parent path hint for nested entries", () => {
    const result = InitiativeSchema.safeParse({
      metadata: baseMetadata,
      content: {
        vision: "Vision",
        scope: { in: [""], out: ["exclude"] },
        success_criteria: ["All good"],
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected initiative parse failure");
    }

    const formatted = formatZodError(result.error);
    const scopeHint = formatted.find((issue) =>
      issue.path.startsWith("content.scope.in"),
    );
    expect(scopeHint?.suggestion).toMatch(/Provide at least/i);
  });

  it("explains invalid timestamps with ISO guidance", () => {
    const schema = z.string().datetime();
    const result = schema.safeParse("30-10-2025");

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected datetime parse failure");
    }

    const firstIssue = result.error.issues[0];
    if (!firstIssue) {
      throw new Error("Expected at least one validation issue");
    }
    const formatted = formatZodIssue(firstIssue);
    expect(formatted.path).toBe("(root)");
    expect(formatted.suggestion).toMatch(/ISO 8601/i);
  });

  it("falls back to path hint when maximum is unavailable", () => {
    const issue = {
      code: ZodIssueCode.too_big,
      origin: "number",
      maximum: undefined,
      message: "",
      path: ["content", "scope", "out"],
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.suggestion).toMatch(/out-of-scope/i);
  });
});

describe("formatIssuesSummary", () => {
  it("aggregates multiple issues into a readable list", () => {
    const result = IssueSchema.safeParse({
      metadata: {
        ...baseMetadata,
        priority: "priority",
      },
      content: {
        summary: "",
        acceptance_criteria: [],
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected issue parse failure");
    }

    const formatted = formatZodError(result.error);
    const summary = formatIssuesSummary(formatted);
    expect(summary).toMatch(/Validation failed with/);
    expect(summary).toMatch(/content.summary/);
    expect(summary).toMatch(/metadata.priority/);
  });

  it("includes single issue hint inline", () => {
    const issues = [
      {
        path: "metadata.priority",
        reason:
          "metadata.priority must be one of: low, medium, high, critical.",
        suggestion:
          "Choose one of the allowed values: low, medium, high, critical.",
      },
    ];
    const summary = formatIssuesSummary(issues);
    expect(summary).toMatch(/metadata.priority/);
    expect(summary).toMatch(/allowed values/);
  });

  it("handles empty issue lists", () => {
    expect(formatIssuesSummary([])).toBe("No validation issues found.");
  });

  it("returns generic failure when single issue entry is missing", () => {
    const summary = formatIssuesSummary([
      undefined as unknown as FormattedValidationIssue,
    ]);
    expect(summary).toBe("Validation failed.");
  });
});

describe("formatParseIssues", () => {
  it("applies path hints when available", () => {
    const issues: ArtifactParseIssue[] = [
      {
        path: "content.acceptance_criteria",
        message: "At least one item is required",
      },
    ];
    const formatted = formatParseIssues(issues);
    expect(formatted[0]?.suggestion).toMatch(/definition of done/i);
  });
});

describe("formatZodIssue (unrecognised keys)", () => {
  it("handles unknown fields with clear messaging", () => {
    const error = new ZodError([
      {
        code: ZodIssueCode.unrecognized_keys,
        keys: ["unexpected"],
        path: ["content"],
        message: "Unrecognised key",
      },
    ]);

    const formatted = formatZodError(error);
    expect(formatted[0]?.reason).toMatch(/Unrecognised field/i);
    expect(formatIssuesSummary(formatted)).toMatch(/Unrecognised field/);
  });
});

describe("formatZodIssue (edge cases)", () => {
  it("explains invalid value when no enum options are provided", () => {
    const issue = {
      code: ZodIssueCode.invalid_value,
      path: ["metadata", "custom_field"],
      message: "Invalid value",
      values: false,
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toMatch(/invalid value/i);
    expect(formatted.suggestion).toBeUndefined();
  });

  it("handles unrecognised keys without key names", () => {
    const issue = {
      code: ZodIssueCode.unrecognized_keys,
      path: ["metadata", "extra"],
      message: "Unexpected",
      keys: [],
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toBe("Unrecognised field at metadata.extra.");
    expect(formatted.suggestion).toBe("Remove the unrecognised field.");
  });

  it("provides divisor guidance for not-multiple-of issues", () => {
    const issue = {
      code: ZodIssueCode.not_multiple_of,
      path: ["content", "estimate"],
      message: "Invalid multiple",
      divisor: 5,
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toBe("content.estimate must be a multiple of 5.");
    expect(formatted.suggestion).toBe(
      "Adjust 'content.estimate' so it is a multiple of 5.",
    );
  });

  it("describes invalid union branches", () => {
    const issue = {
      code: ZodIssueCode.invalid_union,
      path: ["content", "details"],
      message: "",
      errors: [],
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toBe(
      "content.details is invalid in one or more union branches.",
    );
  });

  it("falls back to message for invalid format without pattern", () => {
    const issue = {
      code: ZodIssueCode.invalid_format,
      format: "custom",
      message: "Bad format",
      path: ["content", "vision"],
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toBe("Bad format");
  });

  it("handles too_big string errors with character guidance", () => {
    const issue = {
      code: ZodIssueCode.too_big,
      origin: "string",
      maximum: 3,
      message: "",
      path: ["metadata", "title"],
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toBe(
      "metadata.title must be at most 3 characters long.",
    );
    expect(formatted.suggestion).toBe(
      "Reduce the value to at most 3 characters.",
    );
  });

  it("handles too_big array errors with item guidance", () => {
    const issue = {
      code: ZodIssueCode.too_big,
      origin: "array",
      maximum: 2,
      message: "",
      path: ["content", "acceptance_criteria"],
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toBe(
      "content.acceptance_criteria must include no more than 2 items.",
    );
    expect(formatted.suggestion).toBe(
      "Remove extra entries so 'content.acceptance_criteria' has at most 2.",
    );
  });

  it("falls back to numeric maximum guidance when origin is not sized", () => {
    const issue = {
      code: ZodIssueCode.too_big,
      origin: "number",
      maximum: 99,
      message: "",
      path: ["metadata", "schema_version"],
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toBe(
      "metadata.schema_version must not exceed 99.",
    );
    expect(formatted.suggestion).toMatch(/does not exceed 99/);
  });

  it("reports invalid type when input is present but wrong", () => {
    const issue = {
      code: ZodIssueCode.invalid_type,
      message: "",
      expected: "string",
      input: 123,
      path: ["metadata", "title"],
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toBe("metadata.title has an invalid type.");
  });

  it("lists allowed values when provided by the issue", () => {
    const issue = {
      code: ZodIssueCode.invalid_value,
      message: "",
      path: ["metadata", "status"],
      values: ["draft", "ready"],
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toBe(
      "metadata.status must be one of: draft, ready.",
    );
    expect(formatted.suggestion).toBe(
      "Choose one of the allowed values: draft, ready.",
    );
  });

  it("falls back to path hint when minimum is unavailable", () => {
    const issue = {
      code: ZodIssueCode.too_small,
      origin: "number",
      minimum: undefined,
      message: "",
      path: ["content", "scope", "out"],
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toMatch(/Out-of-scope items describe/i);
  });

  it("marks fields as required when input is undefined", () => {
    const issue = {
      code: ZodIssueCode.invalid_type,
      message: "",
      expected: "string",
      input: undefined,
      path: ["content", "summary"],
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toBe("content.summary is required.");
    expect(formatted.suggestion).toMatch(/Add the required field/);
  });

  it("handles numeric minimum requirements", () => {
    const issue = {
      code: ZodIssueCode.too_small,
      origin: "number",
      minimum: 5,
      message: "",
      path: ["metadata", "schema_version"],
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toBe(
      "metadata.schema_version must meet the minimum requirement of 5.",
    );
    expect(formatted.suggestion).toBe(
      "Ensure 'metadata.schema_version' meets the minimum requirement of 5.",
    );
  });

  it("normalises symbol entries to readable text", () => {
    const issue = {
      code: ZodIssueCode.invalid_value,
      path: ["metadata", "status"],
      message: "",
      values: [Symbol("archived")],
    } as unknown as Parameters<typeof formatZodIssue>[0];
    const formatted = formatZodIssue(issue);
    expect(formatted.reason).toMatch(/archived/);
    expect(formatted.suggestion).toMatch(/archived/);
  });
});
