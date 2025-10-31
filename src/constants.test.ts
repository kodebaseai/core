import { describe, expect, it } from "vitest";
import {
  ARTIFACT_EVENTS,
  ARTIFACT_TYPES,
  CArtifact,
  CArtifactEvent,
  CEstimationSize,
  CEventTrigger,
  CPriority,
  ESTIMATION_SIZES,
  EVENT_TRIGGERS,
  PRIORITIES,
} from "./constants.js";

describe("core constants", () => {
  it("exposes expected artifact events (states)", () => {
    expect(ARTIFACT_EVENTS).toContain(CArtifactEvent.DRAFT);
    expect(ARTIFACT_EVENTS).toContain(CArtifactEvent.IN_PROGRESS);
    expect(ARTIFACT_EVENTS).toContain(CArtifactEvent.COMPLETED);
  });

  it("includes child-driven triggers", () => {
    expect(EVENT_TRIGGERS).toContain(CEventTrigger.CHILDREN_STARTED);
    expect(EVENT_TRIGGERS).toContain(CEventTrigger.CHILDREN_COMPLETED);
  });

  it("includes common manual and cascade triggers", () => {
    expect(EVENT_TRIGGERS).toContain(CEventTrigger.ARTIFACT_CREATED);
    expect(EVENT_TRIGGERS).toContain(CEventTrigger.BRANCH_CREATED);
    expect(EVENT_TRIGGERS).toContain(CEventTrigger.PR_READY);
    expect(EVENT_TRIGGERS).toContain(CEventTrigger.PR_MERGED);
    expect(EVENT_TRIGGERS).toContain(CEventTrigger.DEPENDENCY_COMPLETED);
    expect(EVENT_TRIGGERS).toContain(CEventTrigger.PARENT_COMPLETED);
    expect(EVENT_TRIGGERS).toContain(CEventTrigger.PARENT_ARCHIVED);
    expect(EVENT_TRIGGERS).toContain(CEventTrigger.MANUAL_CANCEL);
  });

  it("exposes priorities, estimation sizes, and artifact types", () => {
    expect(PRIORITIES).toContain(CPriority.HIGH);
    expect(ESTIMATION_SIZES).toContain(CEstimationSize.M);
    expect(ARTIFACT_TYPES).toContain(CArtifact.ISSUE);
  });
});
