import {
  CArtifactEvent,
  CEventTrigger,
  ISO_UTC_REGEX,
  type TArtifactEvent,
  type TEventTrigger,
} from "../constants.js";
import type { TEventRecord } from "./event-order.js";

export type CreateEventArgs = {
  event: TArtifactEvent;
  actor: string;
  trigger?: TEventTrigger; // explicit at runtime; throws if missing
  timestamp?: string; // ISO-8601 UTC (YYYY-MM-DDTHH:MM:SSZ). Defaults to now.
  metadata?: Record<string, unknown>;
};

// Allowed triggers by event for core flows (v1)
export const EVENT_TRIGGER_BY_EVENT: Record<
  TArtifactEvent,
  ReadonlyArray<TEventTrigger>
> = {
  [CArtifactEvent.DRAFT]: [CEventTrigger.ARTIFACT_CREATED],
  [CArtifactEvent.READY]: [CEventTrigger.DEPENDENCIES_MET],
  [CArtifactEvent.BLOCKED]: [CEventTrigger.HAS_DEPENDENCIES],
  [CArtifactEvent.IN_PROGRESS]: [
    CEventTrigger.BRANCH_CREATED,
    CEventTrigger.CHILDREN_STARTED,
  ],
  [CArtifactEvent.IN_REVIEW]: [
    CEventTrigger.PR_READY,
    CEventTrigger.CHILDREN_COMPLETED,
  ],
  [CArtifactEvent.COMPLETED]: [CEventTrigger.PR_MERGED],
  [CArtifactEvent.CANCELLED]: [CEventTrigger.MANUAL_CANCEL],
  [CArtifactEvent.ARCHIVED]: [
    CEventTrigger.PARENT_COMPLETED,
    CEventTrigger.PARENT_ARCHIVED,
  ],
};

export function assertEventTrigger(
  event: TArtifactEvent,
  trigger: TEventTrigger,
): void {
  const allowed = EVENT_TRIGGER_BY_EVENT[event];
  if (!allowed || allowed.length === 0) return; // nothing to assert
  if (!allowed.includes(trigger)) {
    const allowedList = allowed.join(", ");
    throw new Error(
      `Invalid trigger '${trigger}' for event '${event}'. Allowed: ${allowedList}`,
    );
  }
}

// Generate ISO-8601 UTC with seconds precision (no milliseconds)
function nowIsoUtcSeconds(): string {
  const d = new Date();
  // toISOString includes milliseconds; strip them
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function createEvent(args: CreateEventArgs): TEventRecord {
  const { event, actor, trigger, timestamp, metadata } = args;

  if (!trigger) {
    throw new Error("EventBuilder: 'trigger' is required and must be explicit");
  }

  // Validate trigger is compatible with event
  assertEventTrigger(event, trigger);

  return {
    event,
    actor,
    trigger,
    timestamp: timestamp ?? nowIsoUtcSeconds(),
    ...(metadata ? { metadata } : {}),
  };
}

export function createDraftEvent(
  actor: string,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  return createEvent({
    event: CArtifactEvent.DRAFT,
    actor,
    trigger: CEventTrigger.ARTIFACT_CREATED,
    timestamp,
    metadata,
  });
}

export function createReadyEvent(
  actor: string,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  return createEvent({
    event: CArtifactEvent.READY,
    actor,
    trigger: CEventTrigger.DEPENDENCIES_MET,
    timestamp,
    metadata,
  });
}

// -----------------------------
// Blocked helper (with metadata)
// -----------------------------
export type BlockingDependency = {
  artifact_id: string;
  resolved?: boolean;
  resolved_at?: string; // ISO when resolved
};

export function createBlockedEvent(
  actor: string,
  blockingDependencies: ReadonlyArray<BlockingDependency>,
  timestamp?: string,
): TEventRecord {
  if (
    !Array.isArray(blockingDependencies) ||
    blockingDependencies.length === 0
  ) {
    throw new Error(
      "createBlockedEvent: provide at least one blocking dependency entry",
    );
  }

  // Normalize and lightly validate entries; do not enforce ID shape here.
  const normalized = blockingDependencies.map((d) => {
    const resolved = Boolean(d.resolved);
    if (resolved && d.resolved_at && !ISO_UTC_REGEX.test(d.resolved_at)) {
      throw new Error(
        "createBlockedEvent: 'resolved_at' must be ISO-8601 UTC (YYYY-MM-DDTHH:MM:SSZ)",
      );
    }
    return {
      artifact_id: String(d.artifact_id),
      ...(resolved ? { resolved: true } : { resolved: false }),
      ...(d.resolved_at ? { resolved_at: d.resolved_at } : {}),
    };
  });

  return createEvent({
    event: CArtifactEvent.BLOCKED,
    actor,
    trigger: CEventTrigger.HAS_DEPENDENCIES,
    timestamp,
    metadata: { blocking_dependencies: normalized },
  });
}

// -----------------------------
// Remaining common helpers
// -----------------------------
export function createInProgressEvent(
  actor: string,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  return createEvent({
    event: CArtifactEvent.IN_PROGRESS,
    actor,
    trigger: CEventTrigger.BRANCH_CREATED,
    timestamp,
    metadata,
  });
}

export function createInReviewEvent(
  actor: string,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  return createEvent({
    event: CArtifactEvent.IN_REVIEW,
    actor,
    trigger: CEventTrigger.PR_READY,
    timestamp,
    metadata,
  });
}

export function createCompletedEvent(
  actor: string,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  return createEvent({
    event: CArtifactEvent.COMPLETED,
    actor,
    trigger: CEventTrigger.PR_MERGED,
    timestamp,
    metadata,
  });
}

export function createCancelledEvent(
  actor: string,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  return createEvent({
    event: CArtifactEvent.CANCELLED,
    actor,
    trigger: CEventTrigger.MANUAL_CANCEL,
    timestamp,
    metadata,
  });
}

type ArchivedCause =
  | typeof CEventTrigger.PARENT_COMPLETED
  | typeof CEventTrigger.PARENT_ARCHIVED;
export function createArchivedEvent(
  actor: string,
  cause: ArchivedCause,
  timestamp?: string,
  metadata?: Record<string, unknown>,
): TEventRecord {
  if (
    cause !== CEventTrigger.PARENT_COMPLETED &&
    cause !== CEventTrigger.PARENT_ARCHIVED
  ) {
    throw new Error(
      "createArchivedEvent: cause must be 'parent_completed' or 'parent_archived'",
    );
  }
  return createEvent({
    event: CArtifactEvent.ARCHIVED,
    actor,
    trigger: cause,
    timestamp,
    metadata,
  });
}
