import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CArtifactEvent,
  CEstimationSize,
  CEventTrigger,
  CPriority,
  type TArtifactEvent,
  type TEventTrigger,
} from "../../constants.js";
import { createEvent } from "../../state/event-builder.js";
import { type CascadeChild, CascadeEngine } from "./engine.js";

const BASE_ACTOR = "Jane Doe (jane@example.com)";

type EventSequence = {
  state: TArtifactEvent;
  trigger: TEventTrigger;
  metadata?: Record<string, unknown>;
};

function buildChild(events: readonly EventSequence[]): CascadeChild {
  return {
    metadata: {
      title: "Child Artifact",
      priority: CPriority.HIGH,
      estimation: CEstimationSize.S,
      created_by: BASE_ACTOR,
      assignee: BASE_ACTOR,
      schema_version: "0.0.1",
      relationships: {
        blocks: [],
        blocked_by: [],
      },
      events: events.map((entry, index) => ({
        event: entry.state,
        timestamp: `2025-10-31T13:${String(index).padStart(2, "0")}:00Z`,
        actor: BASE_ACTOR,
        trigger: entry.trigger,
        metadata: entry.metadata,
      })),
    },
  };
}

function sequence(
  state: TArtifactEvent,
  trigger: TEventTrigger,
  metadata?: Record<string, unknown>,
): EventSequence {
  return { state, trigger, metadata };
}

const engine = new CascadeEngine();

describe("CascadeEngine.generateCascadeEvent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-10-31T19:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds an in_progress cascade event with trigger context", () => {
    const trigger = createEvent({
      event: CArtifactEvent.IN_PROGRESS,
      actor: "Alice Doe (alice@example.com)",
      trigger: CEventTrigger.BRANCH_CREATED,
      timestamp: "2025-10-31T18:45:00Z",
    });

    const cascade = engine.generateCascadeEvent(
      CArtifactEvent.IN_PROGRESS,
      trigger,
      "child_started",
    );

    expect(cascade.event).toBe(CArtifactEvent.IN_PROGRESS);
    expect(cascade.trigger).toBe(CEventTrigger.CHILDREN_STARTED);
    expect(cascade.actor).toBe("System Cascade (cascade@completion)");
    expect(cascade.timestamp).toBe("2025-10-31T19:00:00Z");
    expect(cascade.metadata).toEqual({
      cascade_type: "child_started",
      trigger_event: trigger.event,
      trigger_actor: trigger.actor,
      trigger_timestamp: trigger.timestamp,
    });
  });

  it("builds an in_review cascade event using children_completed trigger", () => {
    const trigger = createEvent({
      event: CArtifactEvent.COMPLETED,
      actor: "Bob Smith (bob@example.com)",
      trigger: CEventTrigger.PR_MERGED,
      timestamp: "2025-10-31T19:05:00Z",
    });

    const cascade = engine.generateCascadeEvent(
      CArtifactEvent.IN_REVIEW,
      trigger,
      "all_children_complete",
    );

    expect(cascade.event).toBe(CArtifactEvent.IN_REVIEW);
    expect(cascade.trigger).toBe(CEventTrigger.CHILDREN_COMPLETED);
    expect(cascade.actor).toBe("System Cascade (cascade@completion)");
    expect(cascade.metadata).toEqual({
      cascade_type: "all_children_complete",
      trigger_event: trigger.event,
      trigger_actor: trigger.actor,
      trigger_timestamp: trigger.timestamp,
    });
  });

  it("throws when cascade state is unsupported", () => {
    const trigger = createEvent({
      event: CArtifactEvent.COMPLETED,
      actor: "Bob Smith (bob@example.com)",
      trigger: CEventTrigger.PR_MERGED,
      timestamp: "2025-10-31T19:05:00Z",
    });

    expect(() =>
      engine.generateCascadeEvent(CArtifactEvent.CANCELLED, trigger, "invalid"),
    ).toThrow(/unsupported cascade event/i);
  });

  it("builds an archived cascade event with parent_archived trigger", () => {
    const trigger = createEvent({
      event: CArtifactEvent.CANCELLED,
      actor: "Parent Owner (owner@example.com)",
      trigger: CEventTrigger.MANUAL_CANCEL,
      timestamp: "2025-10-31T18:30:00Z",
    });

    const cascade = engine.generateCascadeEvent(
      CArtifactEvent.ARCHIVED,
      trigger,
      "parent_archived",
    );

    expect(cascade.event).toBe(CArtifactEvent.ARCHIVED);
    expect(cascade.trigger).toBe(CEventTrigger.PARENT_ARCHIVED);
    expect(cascade.metadata).toEqual({
      cascade_type: "parent_archived",
      trigger_event: trigger.event,
      trigger_actor: trigger.actor,
      trigger_timestamp: trigger.timestamp,
    });
  });
});

describe("CascadeEngine.shouldCascadeToParent", () => {
  it("returns in_review when all active children are completed", () => {
    const children: CascadeChild[] = [
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
        sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
        sequence(CArtifactEvent.IN_REVIEW, CEventTrigger.CHILDREN_STARTED),
        sequence(CArtifactEvent.COMPLETED, CEventTrigger.PR_MERGED),
      ]),
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
        sequence(CArtifactEvent.COMPLETED, CEventTrigger.PR_MERGED),
      ]),
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.CANCELLED, CEventTrigger.MANUAL_CANCEL),
      ]),
    ];

    const result = engine.shouldCascadeToParent(
      children,
      CArtifactEvent.IN_PROGRESS,
    );

    expect(result.shouldCascade).toBe(true);
    if (!result.shouldCascade) {
      throw new Error("expected cascade to parent");
    }
    expect(result.newState).toBe(CArtifactEvent.IN_REVIEW);
    expect(result.reason).toBe("All active children completed");
  });

  it("returns in_progress when parent is ready and a child progressed past ready", () => {
    const children: CascadeChild[] = [
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
      ]),
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
        sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
      ]),
    ];

    const result = engine.shouldCascadeToParent(children, CArtifactEvent.READY);

    expect(result.shouldCascade).toBe(true);
    if (!result.shouldCascade) {
      throw new Error("expected cascade to parent");
    }
    expect(result.newState).toBe(CArtifactEvent.IN_PROGRESS);
    expect(result.reason).toBe("First active child progressed");
  });

  it("ignores cancelled children when determining active work", () => {
    const children: CascadeChild[] = [
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.CANCELLED, CEventTrigger.MANUAL_CANCEL),
      ]),
    ];

    const result = engine.shouldCascadeToParent(children, CArtifactEvent.READY);

    expect(result.shouldCascade).toBe(false);
    expect(result.reason).toBe("No active children to evaluate");
  });

  it("returns false with remaining active child count when work is incomplete", () => {
    const children: CascadeChild[] = [
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
      ]),
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
        sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
      ]),
    ];

    const result = engine.shouldCascadeToParent(
      children,
      CArtifactEvent.IN_PROGRESS,
    );

    expect(result.shouldCascade).toBe(false);
    expect(result.reason).toBe("2 active children incomplete");
  });

  it("produces deterministic outputs for identical inputs", () => {
    const children: CascadeChild[] = [
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
        sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
      ]),
    ];

    const parentState = CArtifactEvent.READY;

    const first = engine.shouldCascadeToParent(children, parentState);
    const second = engine.shouldCascadeToParent(children, parentState);

    expect(second).toEqual(first);
  });
});
