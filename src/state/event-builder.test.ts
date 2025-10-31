import { describe, expect, it } from "vitest";
import { CArtifactEvent, CEventTrigger } from "../constants.js";
import {
  createArchivedEvent,
  createBlockedEvent,
  createCancelledEvent,
  createCompletedEvent,
  createDraftEvent,
  createEvent,
  createInProgressEvent,
  createInReviewEvent,
  createReadyEvent,
} from "./event-builder.js";

const actor = "Tester (tester@example.com)";

function isIsoUtcSeconds(ts: string): boolean {
  return /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)Z$/.test(
    ts,
  );
}

describe("event-builder", () => {
  it("throws if trigger is missing (no fallback)", () => {
    expect(() => createEvent({ event: CArtifactEvent.DRAFT, actor })).toThrow(
      /trigger.*required/i,
    );
  });

  it("createDraftEvent produces correct event + trigger + ISO timestamp", () => {
    const ev = createDraftEvent(actor);
    expect(ev.event).toBe(CArtifactEvent.DRAFT);
    expect(ev.trigger).toBe(CEventTrigger.ARTIFACT_CREATED);
    expect(isIsoUtcSeconds(ev.timestamp)).toBe(true);
    expect(ev.actor).toBe(actor);
  });

  it("createReadyEvent produces correct event + trigger + ISO timestamp", () => {
    const ev = createReadyEvent(actor);
    expect(ev.event).toBe(CArtifactEvent.READY);
    expect(ev.trigger).toBe(CEventTrigger.DEPENDENCIES_MET);
    expect(isIsoUtcSeconds(ev.timestamp)).toBe(true);
    expect(ev.actor).toBe(actor);
  });

  it("createEvent uses provided timestamp and metadata when given", () => {
    const ts = "2025-10-31T14:00:00Z";
    const ev = createEvent({
      event: CArtifactEvent.IN_REVIEW,
      actor,
      trigger: CEventTrigger.PR_READY,
      timestamp: ts,
      metadata: { pr: 123 },
    });
    expect(ev.timestamp).toBe(ts);
    expect(ev.metadata).toEqual({ pr: 123 });
  });

  it("asserts event↔trigger compatibility (rejects mismatches)", () => {
    expect(() =>
      createEvent({
        event: CArtifactEvent.DRAFT,
        actor,
        trigger: CEventTrigger.PR_READY,
      }),
    ).toThrow(/invalid trigger/i);

    // Accepts cascade variant for in_progress
    expect(() =>
      createEvent({
        event: CArtifactEvent.IN_PROGRESS,
        actor,
        trigger: CEventTrigger.CHILDREN_STARTED,
      }),
    ).not.toThrow();
  });

  it("createBlockedEvent emits blocked with has_dependencies and normalized metadata", () => {
    const ev = createBlockedEvent(actor, [
      { artifact_id: "A.1.2" },
      {
        artifact_id: "A.1.3",
        resolved: true,
        resolved_at: "2025-10-31T10:00:00Z",
      },
    ]);
    expect(ev.event).toBe(CArtifactEvent.BLOCKED);
    expect(ev.trigger).toBe(CEventTrigger.HAS_DEPENDENCIES);
    expect(isIsoUtcSeconds(ev.timestamp)).toBe(true);
    expect(ev.metadata).toBeDefined();
    type BlockedMeta = {
      blocking_dependencies: Array<{
        artifact_id: string;
        resolved: boolean;
        resolved_at?: string;
      }>;
    };
    const md = ev.metadata as BlockedMeta;
    expect(Array.isArray(md.blocking_dependencies)).toBe(true);
    expect(md.blocking_dependencies[0]).toEqual({
      artifact_id: "A.1.2",
      resolved: false,
    });
    expect(md.blocking_dependencies[1]).toEqual({
      artifact_id: "A.1.3",
      resolved: true,
      resolved_at: "2025-10-31T10:00:00Z",
    });
  });

  it("createBlockedEvent requires at least one dependency and validates resolved_at format", () => {
    expect(() => createBlockedEvent(actor, [])).toThrow(/at least one/i);
    expect(() =>
      createBlockedEvent(actor, [
        { artifact_id: "A.1.2", resolved: true, resolved_at: "bad" },
      ]),
    ).toThrow(/ISO-8601 UTC/);
  });

  it("creates in_progress/in_review/completed/cancelled with correct triggers", () => {
    const a = createInProgressEvent(actor);
    expect(a.event).toBe(CArtifactEvent.IN_PROGRESS);
    expect(a.trigger).toBe(CEventTrigger.BRANCH_CREATED);
    expect(isIsoUtcSeconds(a.timestamp)).toBe(true);

    const b = createInReviewEvent(actor);
    expect(b.event).toBe(CArtifactEvent.IN_REVIEW);
    expect(b.trigger).toBe(CEventTrigger.PR_READY);
    expect(isIsoUtcSeconds(b.timestamp)).toBe(true);

    const c = createCompletedEvent(actor);
    expect(c.event).toBe(CArtifactEvent.COMPLETED);
    expect(c.trigger).toBe(CEventTrigger.PR_MERGED);
    expect(isIsoUtcSeconds(c.timestamp)).toBe(true);

    const d = createCancelledEvent(actor, undefined, { reason: "cut scope" });
    expect(d.event).toBe(CArtifactEvent.CANCELLED);
    expect(d.trigger).toBe(CEventTrigger.MANUAL_CANCEL);
    expect(isIsoUtcSeconds(d.timestamp)).toBe(true);
    const cancelMeta = d.metadata as { reason?: string };
    expect(cancelMeta.reason).toBe("cut scope");
  });

  it("createArchivedEvent accepts only parent_completed/parent_archived causes", () => {
    const ev1 = createArchivedEvent(actor, CEventTrigger.PARENT_COMPLETED);
    expect(ev1.event).toBe(CArtifactEvent.ARCHIVED);
    expect(ev1.trigger).toBe(CEventTrigger.PARENT_COMPLETED);
    expect(isIsoUtcSeconds(ev1.timestamp)).toBe(true);

    const ev2 = createArchivedEvent(actor, CEventTrigger.PARENT_ARCHIVED);
    expect(ev2.event).toBe(CArtifactEvent.ARCHIVED);
    expect(ev2.trigger).toBe(CEventTrigger.PARENT_ARCHIVED);
    expect(isIsoUtcSeconds(ev2.timestamp)).toBe(true);

    // @ts-expect-error runtime validation should throw on invalid cause
    expect(() => createArchivedEvent(actor, "pr_ready")).toThrow(
      /cause must be/,
    );
  });
});
