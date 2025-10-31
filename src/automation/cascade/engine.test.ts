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

function buildBlockedDependent(dependencyIds: readonly string[]): CascadeChild {
  return {
    metadata: {
      title: "Dependent Artifact",
      priority: CPriority.MEDIUM,
      estimation: CEstimationSize.S,
      created_by: BASE_ACTOR,
      assignee: BASE_ACTOR,
      schema_version: "0.0.1",
      relationships: {
        blocks: [],
        blocked_by: dependencyIds.slice(),
      },
      events: [
        {
          event: CArtifactEvent.DRAFT,
          timestamp: "2025-10-28T10:00:00Z",
          actor: BASE_ACTOR,
          trigger: CEventTrigger.ARTIFACT_CREATED,
        },
        {
          event: CArtifactEvent.BLOCKED,
          timestamp: "2025-10-28T11:00:00Z",
          actor: BASE_ACTOR,
          trigger: CEventTrigger.HAS_DEPENDENCIES,
          metadata: {
            blocking_dependencies: dependencyIds.map((id) => ({
              artifact_id: id,
              resolved: false,
            })),
          },
        },
      ],
    },
  };
}

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
      "parent_cancel_archive",
    );

    expect(cascade.event).toBe(CArtifactEvent.ARCHIVED);
    expect(cascade.trigger).toBe(CEventTrigger.PARENT_ARCHIVED);
    expect(cascade.metadata).toEqual({
      cascade_type: "parent_cancel_archive",
      trigger_event: trigger.event,
      trigger_actor: trigger.actor,
      trigger_timestamp: trigger.timestamp,
    });
  });

  it("builds an archived cascade event with parent_completed trigger", () => {
    const trigger = createEvent({
      event: CArtifactEvent.COMPLETED,
      actor: "Parent Owner (owner@example.com)",
      trigger: CEventTrigger.PR_MERGED,
      timestamp: "2025-10-31T20:00:00Z",
    });

    const cascade = engine.generateCascadeEvent(
      CArtifactEvent.ARCHIVED,
      trigger,
      "parent_completion_archive",
    );

    expect(cascade.event).toBe(CArtifactEvent.ARCHIVED);
    expect(cascade.trigger).toBe(CEventTrigger.PARENT_COMPLETED);
    expect(cascade.metadata).toEqual({
      cascade_type: "parent_completion_archive",
      trigger_event: trigger.event,
      trigger_actor: trigger.actor,
      trigger_timestamp: trigger.timestamp,
    });
  });
});

describe("CascadeEngine.resolveDependencyCompletion", () => {
  it("marks dependency entry as resolved and leaves others pending", () => {
    const dependent = buildBlockedDependent(["A.1.1", "A.1.2"]);

    const result = engine.resolveDependencyCompletion(dependent, {
      dependencyId: "A.1.1",
      resolutionTimestamp: "2025-10-31T20:00:00Z",
    });

    expect(result.updated).toBe(true);
    if (!result.updated) throw new Error("expected update");
    expect(result.readyEventAdded).toBe(false);

    const blocked = result.artifact.metadata.events[1];
    expect(blocked).toBeDefined();
    const deps = (blocked?.metadata?.blocking_dependencies ?? []) as Array<
      Record<string, unknown>
    >;
    const first = deps.find((dep) => dep?.artifact_id === "A.1.1");
    const second = deps.find((dep) => dep?.artifact_id === "A.1.2");
    expect(first?.resolved).toBe(true);
    expect(first?.resolved_at).toBe("2025-10-31T20:00:00Z");
    expect(second?.resolved).toBe(false);
  });

  it("adds a ready event when all blocking dependencies resolve", () => {
    const dependent = buildBlockedDependent(["A.2.1", "A.2.2"]);

    const first = engine.resolveDependencyCompletion(dependent, {
      dependencyId: "A.2.1",
      resolutionTimestamp: "2025-10-31T20:05:00Z",
    });
    if (!first.updated) throw new Error("first resolution should update");

    const second = engine.resolveDependencyCompletion(first.artifact, {
      dependencyId: "A.2.2",
      resolutionTimestamp: "2025-10-31T20:10:00Z",
    });

    expect(second.updated).toBe(true);
    if (!second.updated) throw new Error("second resolution should update");
    expect(second.readyEventAdded).toBe(true);

    const events = second.artifact.metadata.events;
    const readyEvent = events[events.length - 1];
    expect(readyEvent).toBeDefined();
    expect(readyEvent?.event).toBe(CArtifactEvent.READY);
    expect(readyEvent?.trigger).toBe(CEventTrigger.DEPENDENCY_COMPLETED);
    expect(readyEvent?.actor).toBe("System Cascade (cascade@completion)");
    expect(readyEvent?.timestamp).toBe("2025-10-31T20:10:00Z");
    expect(readyEvent?.metadata?.dependencies_resolved).toEqual([
      "A.2.1",
      "A.2.2",
    ]);
  });

  it("does not mutate the original dependent artifact", () => {
    const dependent = buildBlockedDependent(["A.3.1"]);
    const snapshot = JSON.parse(JSON.stringify(dependent));

    engine.resolveDependencyCompletion(dependent, {
      dependencyId: "A.3.1",
      resolutionTimestamp: "2025-10-31T20:15:00Z",
    });

    expect(dependent).toEqual(snapshot);
  });
});

describe("CascadeEngine.shouldCascadeToParent", () => {
  it("does not mutate child event histories", () => {
    const child = buildChild([
      sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
      sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
    ]);

    const snapshot = child.metadata.events.map((event) =>
      structuredClone(event),
    );

    engine.shouldCascadeToParent([child], CArtifactEvent.READY);

    expect(child.metadata.events).toEqual(snapshot);
  });

  it("moves a milestone parent to in_progress when first issue starts", () => {
    const issues: CascadeChild[] = [
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
      ]),
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
        sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
      ]),
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
      ]),
    ];

    const milestoneState = CArtifactEvent.READY;

    const result = engine.shouldCascadeToParent(issues, milestoneState);

    expect(result.shouldCascade).toBe(true);
    if (!result.shouldCascade) {
      throw new Error("expected cascade to milestone parent");
    }
    expect(result.newState).toBe(CArtifactEvent.IN_PROGRESS);
    expect(result.reason).toBe("First active child progressed");
  });

  it("moves a milestone parent to in_review when all active issues complete", () => {
    const issues: CascadeChild[] = [
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
        sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
        sequence(CArtifactEvent.IN_REVIEW, CEventTrigger.PR_READY),
        sequence(CArtifactEvent.COMPLETED, CEventTrigger.PR_MERGED),
      ]),
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
        sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
        sequence(CArtifactEvent.IN_REVIEW, CEventTrigger.PR_READY),
        sequence(CArtifactEvent.COMPLETED, CEventTrigger.PR_MERGED),
      ]),
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.CANCELLED, CEventTrigger.MANUAL_CANCEL),
      ]),
    ];

    const milestoneState = CArtifactEvent.IN_PROGRESS;

    const result = engine.shouldCascadeToParent(issues, milestoneState);

    expect(result.shouldCascade).toBe(true);
    if (!result.shouldCascade) {
      throw new Error("expected cascade to milestone parent");
    }
    expect(result.newState).toBe(CArtifactEvent.IN_REVIEW);
    expect(result.reason).toBe("All active children completed");
  });

  it("keeps milestone parent in_progress when additional issues start", () => {
    const issues: CascadeChild[] = [
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
        sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
      ]),
      buildChild([
        sequence(CArtifactEvent.DRAFT, CEventTrigger.ARTIFACT_CREATED),
        sequence(CArtifactEvent.READY, CEventTrigger.DEPENDENCIES_MET),
        sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
      ]),
    ];

    const result = engine.shouldCascadeToParent(
      issues,
      CArtifactEvent.IN_PROGRESS,
    );

    expect(result.shouldCascade).toBe(false);
    expect(result.reason).toBe("2 active children incomplete");
  });

  it("moves an initiative parent to in_review when all milestones complete", () => {
    const milestones: CascadeChild[] = [
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
        sequence(CArtifactEvent.IN_PROGRESS, CEventTrigger.BRANCH_CREATED),
        sequence(CArtifactEvent.IN_REVIEW, CEventTrigger.PR_READY),
        sequence(CArtifactEvent.COMPLETED, CEventTrigger.PR_MERGED),
      ]),
    ];

    const initiativeState = CArtifactEvent.IN_PROGRESS;

    const result = engine.shouldCascadeToParent(milestones, initiativeState);

    expect(result.shouldCascade).toBe(true);
    if (!result.shouldCascade) {
      throw new Error("expected cascade to initiative parent");
    }
    expect(result.newState).toBe(CArtifactEvent.IN_REVIEW);
    expect(result.reason).toBe("All active children completed");
  });

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
