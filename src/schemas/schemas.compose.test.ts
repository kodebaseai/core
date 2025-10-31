import { describe, expect, it } from "vitest";
import { CArtifactEvent, CEstimationSize, CPriority } from "../constants.js";
import { InitiativeSchema, IssueSchema, MilestoneSchema } from "./schemas.js";

describe("Composed Artifact Schemas (schemas.ts)", () => {
  const baseEvent = {
    event: CArtifactEvent.DRAFT,
    timestamp: "2025-10-28T19:37:00Z",
    actor: "Jane Doe (jane@example.com)",
    trigger: "artifact_created",
  } as const;

  it("IssueSchema applies metadata defaults and accepts optional sections", () => {
    const minimalIssue = {
      metadata: {
        title: "Minimal issue",
        // omit priority, estimation, schema_version to test defaults
        created_by: "Jane Doe (jane@example.com)",
        assignee: "John Smith (john@example.com)",
        relationships: {},
        events: [baseEvent],
      },
      content: {
        summary: "Do the thing",
        acceptance_criteria: ["It works"],
      },
      // optional: implementation_notes, notes omitted
    } as const;

    const res = IssueSchema.safeParse(minimalIssue);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.metadata.priority).toBe(CPriority.MEDIUM);
      expect(res.data.metadata.estimation).toBe(CEstimationSize.S);
      expect(res.data.metadata.schema_version).toBe("0.0.1");
      expect(res.data.metadata.relationships.blocks).toEqual([]);
      expect(res.data.metadata.relationships.blocked_by).toEqual([]);
    }
  });

  it("MilestoneSchema accepts optional delivery_summary and notes", () => {
    const minimalMilestone = {
      metadata: {
        title: "Minimal milestone",
        created_by: "Jane Doe (jane@example.com)",
        assignee: "John Smith (john@example.com)",
        relationships: {},
        events: [baseEvent],
      },
      content: {
        summary: "Group of work",
        deliverables: ["Output"],
        // validation optional
      },
      // delivery_summary optional
      // notes optional
    } as const;

    const res = MilestoneSchema.safeParse(minimalMilestone);
    expect(res.success).toBe(true);
  });

  it("InitiativeSchema accepts optional impact_summary and notes", () => {
    const minimalInitiative = {
      metadata: {
        title: "Minimal initiative",
        created_by: "Jane Doe (jane@example.com)",
        assignee: "John Smith (john@example.com)",
        relationships: {},
        events: [baseEvent],
      },
      content: {
        vision: "Improve things",
        scope: { in: ["A"], out: ["B"] },
        success_criteria: ["Done"],
      },
      // impact_summary optional
      // notes optional
    } as const;

    const res = InitiativeSchema.safeParse(minimalInitiative);
    expect(res.success).toBe(true);
  });

  it("Rejects when required sub-objects are missing", () => {
    const issueMissingMeta = {
      content: { summary: "x", acceptance_criteria: ["y"] },
    };
    expect(IssueSchema.safeParse(issueMissingMeta as unknown).success).toBe(
      false,
    );

    const issueMissingContent = {
      metadata: {
        title: "x",
        created_by: "Jane Doe (jane@example.com)",
        assignee: "John Smith (john@example.com)",
        relationships: {},
        events: [baseEvent],
      },
    };
    expect(IssueSchema.safeParse(issueMissingContent as unknown).success).toBe(
      false,
    );

    const milestoneMissingMeta = {
      content: { summary: "x", deliverables: ["y"] },
    };
    expect(
      MilestoneSchema.safeParse(milestoneMissingMeta as unknown).success,
    ).toBe(false);
    const milestoneMissingContent = {
      metadata: {
        title: "x",
        created_by: "Jane Doe (jane@example.com)",
        assignee: "John Smith (john@example.com)",
        relationships: {},
        events: [baseEvent],
      },
    };
    expect(
      MilestoneSchema.safeParse(milestoneMissingContent as unknown).success,
    ).toBe(false);

    const initiativeMissingMeta = {
      content: {
        vision: "v",
        scope: { in: ["a"], out: ["b"] },
        success_criteria: ["x"],
      },
    };
    expect(
      InitiativeSchema.safeParse(initiativeMissingMeta as unknown).success,
    ).toBe(false);
    const initiativeMissingContent = {
      metadata: {
        title: "x",
        created_by: "Jane Doe (jane@example.com)",
        assignee: "John Smith (john@example.com)",
        relationships: {},
        events: [baseEvent],
      },
    };
    expect(
      InitiativeSchema.safeParse(initiativeMissingContent as unknown).success,
    ).toBe(false);
  });
});
