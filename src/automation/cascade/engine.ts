import {
  ARTIFACT_EVENTS,
  CArtifactEvent,
  CEventTrigger,
  type TArtifactEvent,
  type TEventTrigger,
} from "../../constants.js";
import type { TInitiative, TIssue, TMilestone } from "../../schemas/schemas.js";
import { createEvent } from "../../state/event-builder.js";
import type { TEventRecord } from "../../state/event-order.ts";

const CASCADE_SYSTEM_ACTOR = "System Cascade (cascade@completion)";

const CASCADE_TRIGGER_BY_EVENT: Partial<Record<TArtifactEvent, TEventTrigger>> =
  {
    [CArtifactEvent.READY]: CEventTrigger.DEPENDENCY_COMPLETED,
    [CArtifactEvent.IN_PROGRESS]: CEventTrigger.CHILDREN_STARTED,
    [CArtifactEvent.IN_REVIEW]: CEventTrigger.CHILDREN_COMPLETED,
    [CArtifactEvent.ARCHIVED]: CEventTrigger.PARENT_ARCHIVED,
  };

export type CascadeChild = Pick<TInitiative | TMilestone | TIssue, "metadata">;

export type CascadeDecision =
  | {
      shouldCascade: true;
      newState: TArtifactEvent;
      reason: string;
    }
  | {
      shouldCascade: false;
      reason: string;
    };

function isArtifactEvent(value: unknown): value is TArtifactEvent {
  return (
    typeof value === "string" &&
    (ARTIFACT_EVENTS as readonly string[]).includes(value)
  );
}

function getLatestState(child: CascadeChild): TArtifactEvent | null {
  const events = child.metadata.events;
  if (!events || events.length === 0) {
    return null;
  }
  const tail = events[events.length - 1];
  if (!tail) {
    return null;
  }
  const event = tail.event;
  if (!isArtifactEvent(event)) {
    return null;
  }
  return event;
}

function formatRemainingChildren(count: number): string {
  if (count === 1) {
    return "1 active child incomplete";
  }
  return `${count} active children incomplete`;
}

/**
 * Determines whether a parent should update its state based on children states.
 *
 * - Parent moves to `in_progress` when any active child progresses past `ready`
 *   and the parent is currently `ready`.
 * - Parent moves to `in_review` once all active (non-cancelled) children reach
 *   `completed`.
 * - Cancelled children are ignored when counting active work.
 */
export class CascadeEngine {
  /**
   * Generates a cascade event with canonical actor, trigger, and metadata.
   */
  generateCascadeEvent(
    newState: TArtifactEvent,
    triggerEvent: Pick<TEventRecord, "event" | "actor" | "timestamp">,
    cascadeType: string,
  ): TEventRecord {
    const trigger = CASCADE_TRIGGER_BY_EVENT[newState];
    if (!trigger) {
      const supported = Object.keys(CASCADE_TRIGGER_BY_EVENT).join(", ");
      throw new Error(
        `Unsupported cascade event '${newState}'. Supported: ${supported}`,
      );
    }

    const metadata = {
      cascade_type: cascadeType,
      trigger_event: triggerEvent.event,
      trigger_actor: triggerEvent.actor,
      trigger_timestamp: triggerEvent.timestamp,
    };

    return createEvent({
      event: newState,
      actor: CASCADE_SYSTEM_ACTOR,
      trigger,
      metadata,
    });
  }

  shouldCascadeToParent(
    children: ReadonlyArray<CascadeChild>,
    parentState?: TArtifactEvent,
  ): CascadeDecision {
    const activeStates: TArtifactEvent[] = [];

    for (const child of children) {
      const state = getLatestState(child);
      if (
        state &&
        state !== CArtifactEvent.CANCELLED &&
        state !== CArtifactEvent.ARCHIVED
      ) {
        activeStates.push(state);
      }
    }

    if (activeStates.length === 0) {
      return {
        shouldCascade: false,
        reason: "No active children to evaluate",
      };
    }

    const allCompleted = activeStates.every(
      (state) => state === CArtifactEvent.COMPLETED,
    );

    if (allCompleted) {
      return {
        shouldCascade: true,
        newState: CArtifactEvent.IN_REVIEW,
        reason: "All active children completed",
      };
    }

    if (parentState === CArtifactEvent.READY) {
      const hasStarted = activeStates.some(
        (state) =>
          state === CArtifactEvent.IN_PROGRESS ||
          state === CArtifactEvent.IN_REVIEW ||
          state === CArtifactEvent.COMPLETED,
      );

      if (hasStarted) {
        return {
          shouldCascade: true,
          newState: CArtifactEvent.IN_PROGRESS,
          reason: "First active child progressed",
        };
      }
    }

    const incompleteCount = activeStates.filter(
      (state) => state !== CArtifactEvent.COMPLETED,
    ).length;

    return {
      shouldCascade: false,
      reason: formatRemainingChildren(incompleteCount),
    };
  }
}
