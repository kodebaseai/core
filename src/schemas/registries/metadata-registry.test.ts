import { describe, expect, it } from "vitest";
import { CArtifactEvent, CEstimationSize, CPriority } from "../../constants.js";
import {
  ActorSchema,
  ArtifactMetadataSchema,
  EstimationSchema,
  EventSchema,
  EventTriggerSchema,
  EventTypeSchema,
  PrioritySchema,
  RelationshipsSchema,
  TimestampSchema,
  TitleSchema,
} from "./metadata-registry.js";
import { ArtifactIdSchema } from "./shared-registry.js";

describe("Metadata Registry - Field Schemas", () => {
  it("TitleSchema enforces length bounds", () => {
    expect(TitleSchema.safeParse("A title that is long enough").success).toBe(
      true,
    );
    expect(TitleSchema.safeParse("").success).toBe(false);
    expect(TitleSchema.safeParse("ab").success).toBe(false);
  });

  it("PrioritySchema defaults and allowed set", () => {
    expect(PrioritySchema.safeParse("medium").success).toBe(true);
    expect(PrioritySchema.safeParse("high").success).toBe(true);
    expect(PrioritySchema.safeParse("urgent").success).toBe(false);
    // default
    expect(PrioritySchema.parse(undefined as unknown as string)).toBe(
      CPriority.MEDIUM,
    );
  });

  it("EstimationSchema defaults and allowed set", () => {
    for (const ok of [
      CEstimationSize.XS,
      CEstimationSize.S,
      CEstimationSize.M,
      CEstimationSize.L,
      CEstimationSize.XL,
    ]) {
      expect(EstimationSchema.safeParse(ok).success).toBe(true);
    }
    expect(EstimationSchema.safeParse("XXL").success).toBe(false);
    // default
    expect(EstimationSchema.parse(undefined as unknown as string)).toBe(
      CEstimationSize.S,
    );
  });
});

describe("Actor Schema", () => {
  it("accepts human and agent formats (with trimming)", () => {
    expect(ActorSchema.safeParse("Jane Doe (jane@example.com)").success).toBe(
      true,
    );
    expect(ActorSchema.safeParse("agent.system").success).toBe(true);
    expect(ActorSchema.safeParse("agent.cascade@acme").success).toBe(true);
    // trimming
    expect(
      ActorSchema.safeParse("  Jane Doe (jane@example.com)  ").success,
    ).toBe(true);
  });

  it("rejects invalid actor formats", () => {
    for (const bad of [
      "Jane Doe - jane@example.com",
      "Jane Doe (janeexample.com)",
      "(jane@example.com)",
      "agent.reviewer",
      "agent.cascade@",
      "agent.system@INV@LID",
    ]) {
      expect(ActorSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("Timestamps and Events", () => {
  it("TimestampSchema is strict UTC (no offsets/ms)", () => {
    expect(TimestampSchema.safeParse("2025-10-28T19:37:00Z").success).toBe(
      true,
    );
    for (const bad of [
      "2025-10-28T19:37:00+00:00",
      "2025-10-28T19:37:00.000Z",
      "2025-12-01T24:00:00Z",
      "2025-12-01T23:60:00Z",
    ]) {
      expect(TimestampSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("EventTriggerSchema allows only known triggers", () => {
    expect(EventTriggerSchema.safeParse("artifact_created").success).toBe(true);
    expect(EventTriggerSchema.safeParse("not_a_trigger").success).toBe(false);
  });

  it("EventTypeSchema has default and validates allowed values", () => {
    // default
    expect(EventTypeSchema.parse(undefined as unknown as string)).toBe(
      CArtifactEvent.DRAFT,
    );
    // a couple of allowed explicit values
    expect(EventTypeSchema.safeParse("draft").success).toBe(true);
    expect(EventTypeSchema.safeParse("completed").success).toBe(true);
  });

  it("EventSchema composition validates all fields", () => {
    const ok = EventSchema.safeParse({
      event: CArtifactEvent.DRAFT,
      timestamp: "2025-10-28T19:37:00Z",
      actor: "Jane Doe (jane@example.com)",
      trigger: "artifact_created",
      metadata: { source: "test" },
    });
    expect(ok.success).toBe(true);

    const bad = EventSchema.safeParse({
      event: CArtifactEvent.DRAFT,
      timestamp: "2025-10-28T19:37:00+00:00",
      actor: "Jane Doe (jane@example.com)",
      trigger: "not_a_trigger",
    });
    expect(bad.success).toBe(false);
  });
});

describe("Relationships and Artifact IDs", () => {
  it("RelationshipsSchema applies defaults for arrays", () => {
    const res = RelationshipsSchema.parse({});
    expect(res.blocks).toEqual([]);
    expect(res.blocked_by).toEqual([]);
  });

  it("ArtifactIdSchema matches initiative/milestone/issue and rejects invalid", () => {
    for (const ok of ["A", "A.1", "A.1.2", "AA.2", "AA.2.3"]) {
      expect(ArtifactIdSchema.safeParse(ok).success).toBe(true);
    }
    for (const bad of ["A1", "1.2", "A..1", "A.", ".1"]) {
      expect(ArtifactIdSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("ArtifactMetadataSchema", () => {
  const base = {
    title: "Valid Artifact",
    priority: CPriority.HIGH,
    estimation: CEstimationSize.M,
    created_by: "Jane Doe (jane@example.com)",
    assignee: "John Smith (john@example.com)",
    schema_version: "0.0.1",
    relationships: {},
    events: [
      {
        event: CArtifactEvent.DRAFT,
        timestamp: "2025-10-28T19:37:00Z",
        actor: "Jane Doe (jane@example.com)",
        trigger: "artifact_created",
      },
    ],
  } as const;

  it("accepts valid metadata with required fields and non-empty events", () => {
    expect(ArtifactMetadataSchema.safeParse(base).success).toBe(true);
  });

  it("rejects when required fields are missing", () => {
    const cases: Array<Record<string, unknown>> = [
      { ...base, title: undefined },
      { ...base, created_by: undefined },
      { ...base, assignee: undefined },
      // relationships is required at top-level (its fields default internally)
      { ...base, relationships: undefined },
      { ...base, events: undefined },
      { ...base, events: [] },
    ];
    for (const c of cases) {
      expect(ArtifactMetadataSchema.safeParse(c as unknown).success).toBe(
        false,
      );
    }
  });
});
