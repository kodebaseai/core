import { describe, expect, it, vi } from "vitest";
import { ZodError, ZodIssueCode } from "zod";

import { CArtifact, type TArtifactType } from "../constants.js";
import * as ArtifactParser from "../parser/artifact-parser.js";
import {
  InitiativeSchema,
  IssueSchema,
  MilestoneSchema,
} from "../schemas/schemas.js";
import {
  ArtifactValidationError,
  ArtifactValidator,
  getArtifactType,
  validateArtifact,
  validateInitiative,
  validateIssue,
  validateMilestone,
} from "./artifact-validator.js";

const baseMetadata = {
  title: "Sample Artifact",
  priority: "medium",
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

const initiative = {
  metadata: baseMetadata,
  content: {
    vision: "Adopt registry-driven artifacts",
    scope: {
      in: ["Schema coverage"],
      out: ["Legacy adapters"],
    },
    success_criteria: ["All artifacts validated"],
  },
  impact_summary: {
    outcome: "Artifacts backed by strong schemas",
    benefits: ["Higher reliability"],
    next: "Roll into downstream repos",
  },
};

const milestone = {
  metadata: baseMetadata,
  content: {
    summary: "Deliver parser and validator",
    deliverables: ["Parser module", "Validator helpers"],
    validation: ["CI green"],
  },
  delivery_summary: {
    outcome: "Delivered parser",
    delivered: ["Parser", "Validator"],
    next: "Integrate with CLI",
  },
};

const issue = {
  metadata: baseMetadata,
  content: {
    summary: "Implement artifact validator",
    acceptance_criteria: [
      "getArtifactType detects content",
      "validateIssue throws readable errors",
    ],
  },
};

function expectValidationError(
  fn: () => unknown,
  assertion: (error: ArtifactValidationError) => void,
) {
  try {
    fn();
    throw new Error("Expected ArtifactValidationError");
  } catch (err) {
    expect(err).toBeInstanceOf(ArtifactValidationError);
    assertion(err as ArtifactValidationError);
  }
}

describe("getArtifactType", () => {
  it("detects the correct artifact type for initiative data", () => {
    expect(getArtifactType(initiative)).toBe(CArtifact.INITIATIVE);
  });

  it("detects milestone type even with missing optional sections", () => {
    const partialMilestone = {
      ...milestone,
      delivery_summary: undefined,
    };
    expect(getArtifactType(partialMilestone)).toBe(CArtifact.MILESTONE);
  });

  it("rejects artifacts without content", () => {
    expectValidationError(
      () => getArtifactType({ metadata: baseMetadata }),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.message).toMatch(/content/i);
      },
    );
  });

  it("rejects YAML strings during type detection", () => {
    expectValidationError(
      () => getArtifactType("[]"),
      (error) => {
        expect(error.kind).toBe("input");
        expect(error.message).toMatch(/must be an object/i);
      },
    );
  });

  it("rejects invalid YAML during type detection", () => {
    expectValidationError(
      () => getArtifactType("metadata: [unclosed"),
      (error) => {
        expect(error.kind).toBe("yaml");
        expect(error.message).toMatch(/invalid yaml/i);
      },
    );
  });

  it("infers the closest matching artifact type when schemas fail", () => {
    const metadata = {
      ...baseMetadata,
      relationships: {
        blocks: [...baseMetadata.relationships.blocks],
        blocked_by: [...baseMetadata.relationships.blocked_by],
      },
      events: [...baseMetadata.events],
    };
    const partial = {
      metadata,
      content: {
        summary: "Partial issue content",
        acceptance_criteria: [],
        deliverables: [""],
        validation: [],
      },
    };
    expect(getArtifactType(partial)).toBe(CArtifact.ISSUE);
  });
});

describe("validate specific artifact types", () => {
  it("validates an initiative and returns typed data", () => {
    const validated = validateInitiative(initiative);
    expect(validated.content.scope.in).toEqual(["Schema coverage"]);
  });

  it("throws validation errors with formatted issues for issues", () => {
    const invalidIssue = {
      metadata: baseMetadata,
      content: {
        summary: "Implement artifact validator",
      },
    };
    expectValidationError(
      () => validateIssue(invalidIssue),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.issues?.[0]?.path).toBe("content.acceptance_criteria");
      },
    );
  });

  it("allows YAML strings and relies on parser interop", () => {
    const yaml = `
metadata:
  title: "Sample Artifact"
  priority: medium
  estimation: S
  created_by: "Alice Example (alice@example.com)"
  assignee: "Bob Example (bob@example.com)"
  schema_version: "0.0.1"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: "2025-10-30T14:37:00Z"
      actor: "Alice Example (alice@example.com)"
      trigger: artifact_created
content:
  summary: "Implement artifact validator"
  acceptance_criteria:
    - "getArtifactType detects content"
    - "validateIssue throws readable errors"
`;
    const validated = validateIssue(yaml);
    expect(validated.content.acceptance_criteria).toHaveLength(2);
  });

  it("rejects YAML strings that do not parse into objects", () => {
    expectValidationError(
      () => validateIssue("[]"),
      (error) => {
        expect(error.kind).toBe("yaml");
        expect(error.message).toMatch(/produce an object/i);
      },
    );
  });

  it("rejects YAML strings that fail to parse", () => {
    expectValidationError(
      () => validateIssue("metadata: [unclosed"),
      (error) => {
        expect(error.kind).toBe("yaml");
        expect(error.message).toMatch(/invalid yaml/i);
      },
    );
  });
});

describe("sibling relationship validation", () => {
  it("requires artifactId when relationships are present", () => {
    const issueWithDeps = {
      ...issue,
      metadata: {
        ...issue.metadata,
        relationships: { blocks: [], blocked_by: ["A.1.2"] },
      },
    };

    expectValidationError(
      () => validateIssue(issueWithDeps),
      (error) => {
        expect(error.kind).toBe("input");
        expect(error.message).toMatch(/Artifact ID is required/i);
      },
    );
  });

  it("rejects initiative dependencies that are not initiatives", () => {
    const initiativeWithMilestone = {
      ...initiative,
      metadata: {
        ...initiative.metadata,
        relationships: { blocks: ["A.1"], blocked_by: [] },
      },
    };

    expectValidationError(
      () => validateInitiative(initiativeWithMilestone, { artifactId: "A" }),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.issues).toEqual([
          {
            code: "RELATIONSHIP_WRONG_TYPE",
            path: "metadata.relationships.blocks[0]",
            message:
              "'A.1' must reference another initiative ID (for example 'A' or 'B').",
          },
        ]);
      },
    );
  });

  it("rejects dependencies with unknown identifiers", () => {
    const initiativeWithUnknown = {
      ...initiative,
      metadata: {
        ...initiative.metadata,
        relationships: { blocks: ["???.1"], blocked_by: [] },
      },
    };

    const parseSpy = vi
      .spyOn(ArtifactParser, "parseInitiative")
      .mockReturnValue({ success: true, data: initiativeWithUnknown });

    try {
      expectValidationError(
        () => validateInitiative({}, { artifactId: "A" }),
        (error) => {
          expect(error.kind).toBe("schema");
          expect(error.issues).toEqual([
            {
              code: "RELATIONSHIP_INVALID_ID",
              path: "metadata.relationships.blocks[0]",
              message:
                "'???.1' is not a valid artifact ID. Initiatives only depend on initiative IDs like 'A' or 'B'.",
            },
          ]);
        },
      );
    } finally {
      parseSpy.mockRestore();
    }
  });

  it("rejects milestone dependencies referencing another initiative", () => {
    const milestoneWithDeps = {
      ...milestone,
      metadata: {
        ...milestone.metadata,
        relationships: { blocks: [], blocked_by: ["B.2"] },
      },
    };

    expectValidationError(
      () => validateMilestone(milestoneWithDeps, { artifactId: "A.1" }),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.issues).toEqual([
          {
            code: "RELATIONSHIP_DIFFERENT_INITIATIVE",
            path: "metadata.relationships.blocked_by[0]",
            message: "'B.2' must start with 'A.' to stay within initiative A.",
          },
        ]);
      },
    );
  });

  it("rejects milestone dependencies referencing non-milestone identifiers", () => {
    const milestoneWithIssue = {
      ...milestone,
      metadata: {
        ...milestone.metadata,
        relationships: { blocks: ["A.1.2"], blocked_by: [] },
      },
    };

    expectValidationError(
      () => validateMilestone(milestoneWithIssue, { artifactId: "A.1" }),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.issues).toEqual([
          {
            code: "RELATIONSHIP_WRONG_TYPE",
            path: "metadata.relationships.blocks[0]",
            message: "'A.1.2' must reference a milestone ID like 'A.1'.",
          },
        ]);
      },
    );
  });

  it("rejects milestone dependencies with malformed identifiers", () => {
    const milestoneWithMalformed = {
      ...milestone,
      metadata: {
        ...milestone.metadata,
        relationships: { blocks: ["A-one"], blocked_by: [] },
      },
    };

    const parseSpy = vi
      .spyOn(ArtifactParser, "parseMilestone")
      .mockReturnValue({ success: true, data: milestoneWithMalformed });

    try {
      expectValidationError(
        () => validateMilestone({}, { artifactId: "A.1" }),
        (error) => {
          expect(error.kind).toBe("schema");
          expect(error.issues).toEqual([
            {
              code: "RELATIONSHIP_INVALID_ID",
              path: "metadata.relationships.blocks[0]",
              message:
                "'A-one' is not a valid artifact ID. Use a milestone ID like 'A.1' that starts with 'A.'.",
            },
          ]);
        },
      );
    } finally {
      parseSpy.mockRestore();
    }
  });

  it("rejects issue dependencies referencing a non-issue identifier", () => {
    const issueWithMilestoneRef = {
      ...issue,
      metadata: {
        ...issue.metadata,
        relationships: { blocks: ["A.1"], blocked_by: [] },
      },
    };

    expectValidationError(
      () => validateIssue(issueWithMilestoneRef, { artifactId: "A.1.1" }),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.issues).toEqual([
          {
            code: "RELATIONSHIP_WRONG_TYPE",
            path: "metadata.relationships.blocks[0]",
            message: "'A.1' must reference an issue ID like 'A.1.1'.",
          },
        ]);
      },
    );
  });

  it("rejects issue dependencies with malformed identifiers", () => {
    const issueWithMalformed = {
      ...issue,
      metadata: {
        ...issue.metadata,
        relationships: { blocks: [], blocked_by: ["A.1.one"] },
      },
    };

    const parseSpy = vi
      .spyOn(ArtifactParser, "parseIssue")
      .mockReturnValue({ success: true, data: issueWithMalformed });

    try {
      expectValidationError(
        () => validateIssue({}, { artifactId: "A.1.4" }),
        (error) => {
          expect(error.kind).toBe("schema");
          expect(error.issues).toEqual([
            {
              code: "RELATIONSHIP_INVALID_ID",
              path: "metadata.relationships.blocked_by[0]",
              message:
                "'A.1.one' is not a valid artifact ID. Use an issue ID like 'A.1.1' that starts with 'A.1.'.",
            },
          ]);
        },
      );
    } finally {
      parseSpy.mockRestore();
    }
  });

  it("rejects issue dependencies outside the current milestone", () => {
    const issueWithForeignSibling = {
      ...issue,
      metadata: {
        ...issue.metadata,
        relationships: { blocks: [], blocked_by: ["A.2.4"] },
      },
    };

    expectValidationError(
      () => validateIssue(issueWithForeignSibling, { artifactId: "A.1.3" }),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.issues).toEqual([
          {
            code: "RELATIONSHIP_DIFFERENT_MILESTONE",
            path: "metadata.relationships.blocked_by[0]",
            message:
              "'A.2.4' must start with 'A.1.' to stay within milestone A.1.",
          },
        ]);
      },
    );
  });

  it("rejects issue dependencies outside the current initiative", () => {
    const issueWithForeignInitiative = {
      ...issue,
      metadata: {
        ...issue.metadata,
        relationships: { blocks: [], blocked_by: ["B.1.2"] },
      },
    };

    expectValidationError(
      () => validateIssue(issueWithForeignInitiative, { artifactId: "A.1.3" }),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.issues).toEqual([
          {
            code: "RELATIONSHIP_DIFFERENT_INITIATIVE",
            path: "metadata.relationships.blocked_by[0]",
            message:
              "'B.1.2' must start with 'A.' to stay within initiative A.",
          },
        ]);
      },
    );
  });

  it("accepts sibling issue dependencies within the same milestone", () => {
    const issueWithSiblings = {
      ...issue,
      metadata: {
        ...issue.metadata,
        relationships: { blocks: ["A.1.2"], blocked_by: ["A.1.3"] },
      },
    };

    const validated = validateIssue(issueWithSiblings, {
      artifactId: "A.1.1",
    });
    expect(validated.metadata.relationships).toEqual({
      blocks: ["A.1.2"],
      blocked_by: ["A.1.3"],
    });
  });
});

describe("validateArtifact", () => {
  it("throws when artifactId format cannot be parsed", () => {
    expectValidationError(
      () => validateIssue(issue, { artifactId: "invalid" }),
      (error) => {
        expect(error.kind).toBe("input");
        expect(error.message).toMatch(/not a recognised artifact identifier/i);
      },
    );
  });

  it("throws when artifactId does not match the artifact type", () => {
    expectValidationError(
      () => validateMilestone(milestone, { artifactId: "A" }),
      (error) => {
        expect(error.kind).toBe("input");
        expect(error.message).toMatch(/does not match expected milestone/i);
      },
    );
  });

  it("allows empty relationships when artifactId is supplied", () => {
    const validated = validateIssue(issue, { artifactId: "A.1.1" });
    expect(validated.metadata.relationships).toEqual({
      blocks: [],
      blocked_by: [],
    });
  });

  it("auto-detects type and returns the typed payload", () => {
    const result = validateArtifact(issue);
    expect(result.type).toBe(CArtifact.ISSUE);
    if (result.type !== CArtifact.ISSUE) {
      throw new Error("Expected issue validation result");
    }
    expect(result.data.content.acceptance_criteria[0]).toMatch(/detects/);
  });

  it("exposes helpers through the ArtifactValidator namespace", () => {
    const validated = ArtifactValidator.validateIssue(issue);
    expect(validated.content.acceptance_criteria).toHaveLength(2);
  });

  it("enforces relationship rules when artifactId is provided", () => {
    const invalidIssue = {
      ...issue,
      metadata: {
        ...issue.metadata,
        relationships: { blocks: ["A.2.1"], blocked_by: [] },
      },
    };

    expectValidationError(
      () => validateArtifact(invalidIssue, undefined, { artifactId: "A.1.1" }),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.issues?.[0]?.path).toBe(
          "metadata.relationships.blocks[0]",
        );
      },
    );
  });

  it("uses the supplied expected type", () => {
    const result = validateArtifact(milestone, CArtifact.MILESTONE);
    expect(result.type).toBe(CArtifact.MILESTONE);
    if (result.type !== CArtifact.MILESTONE) {
      throw new Error("Expected milestone validation result");
    }
    expect(result.data.content.deliverables).toContain("Validator helpers");
  });

  it("returns initiative data when expected type matches", () => {
    const result = validateArtifact(initiative, CArtifact.INITIATIVE);
    expect(result.type).toBe(CArtifact.INITIATIVE);
    if (result.type !== CArtifact.INITIATIVE) {
      throw new Error("Expected initiative validation result");
    }
    expect(result.data.content.scope.in).toEqual(["Schema coverage"]);
  });

  it("throws detection errors when type cannot be resolved", () => {
    const ambiguous = {
      metadata: baseMetadata,
      content: {},
    };
    expectValidationError(
      () => validateArtifact(ambiguous),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.message).toMatch(/determine artifact type/i);
      },
    );
  });

  it("works with parsed artifacts from ArtifactParser", () => {
    const parsed = ArtifactParser.parseIssue(issue);
    if (!parsed.success) {
      throw new Error("Expected parsed issue to succeed");
    }
    const result = validateArtifact(parsed.data);
    expect(result.type).toBe(CArtifact.ISSUE);
    if (result.type !== CArtifact.ISSUE) {
      throw new Error("Expected issue validation result");
    }
  });

  it("throws when detection results in a tie", () => {
    const makeFailure = (count: number) => ({
      success: false as const,
      error: new ZodError(
        Array.from({ length: count }).map((_, index) => ({
          code: ZodIssueCode.custom,
          message: `issue-${index}`,
          path: [],
          params: {},
        })),
      ),
    });

    const artifact = {
      metadata: baseMetadata,
      content: { summary: "Ambiguous content" },
    };

    const initiativeFailure = makeFailure(1) as Extract<
      ReturnType<typeof InitiativeSchema.safeParse>,
      { success: false }
    >;
    const milestoneFailure = makeFailure(1) as Extract<
      ReturnType<typeof MilestoneSchema.safeParse>,
      { success: false }
    >;
    const issueFailure = makeFailure(2) as Extract<
      ReturnType<typeof IssueSchema.safeParse>,
      { success: false }
    >;

    const spies = [
      vi
        .spyOn(InitiativeSchema, "safeParse")
        .mockReturnValue(initiativeFailure),
      vi.spyOn(MilestoneSchema, "safeParse").mockReturnValue(milestoneFailure),
      vi.spyOn(IssueSchema, "safeParse").mockReturnValue(issueFailure),
    ];

    expectValidationError(
      () => getArtifactType(artifact),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.message).toMatch(/determine artifact type/i);
      },
    );

    for (const spy of spies) {
      spy.mockRestore();
    }
  });

  it("throws when an unsupported artifact type is forced", () => {
    expectValidationError(
      () => validateArtifact(issue, "custom" as TArtifactType),
      (error) => {
        expect(error.kind).toBe("schema");
        expect(error.message).toMatch(/Unsupported artifact type/i);
      },
    );
  });
});
