import type { TArtifactEvent, TEventTrigger } from "../constants.js";
import { CArtifactEvent } from "../constants.js";

export type TEventRecord = {
  event: TArtifactEvent;
  timestamp: string;
  actor: string;
  trigger: TEventTrigger;
  metadata?: Record<string, unknown>;
};

export type EventOrderErrorCode =
  | "EMPTY_EVENTS"
  | "FIRST_EVENT_MUST_BE_DRAFT"
  | "EVENTS_OUT_OF_ORDER";

export class EventOrderError extends Error {
  readonly code: EventOrderErrorCode;
  readonly index?: number;
  readonly prevTimestamp?: string;
  readonly currTimestamp?: string;

  constructor(
    message: string,
    details: {
      code: EventOrderErrorCode;
      index?: number;
      prevTimestamp?: string;
      currTimestamp?: string;
    },
  ) {
    super(message);
    this.name = "EventOrderError";
    this.code = details.code;
    this.index = details.index;
    this.prevTimestamp = details.prevTimestamp;
    this.currTimestamp = details.currTimestamp;
  }
}

// Enforce: first event is draft; timestamps are non-decreasing
export function validateEventOrder(events: ReadonlyArray<TEventRecord>): void {
  if (events.length === 0) {
    throw new EventOrderError("Events array cannot be empty", {
      code: "EMPTY_EVENTS",
    });
  }

  const first = events[0];
  if (!first || first.event !== CArtifactEvent.DRAFT) {
    throw new EventOrderError("First event must be draft", {
      code: "FIRST_EVENT_MUST_BE_DRAFT",
      index: 0,
      currTimestamp: first?.timestamp,
    });
  }

  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];
    if (!prev || !curr) {
      // Sparse arrays or unexpected holes; schema validation should catch
      // structural issues elsewhere.
      continue;
    }
    // Non-decreasing order allowed (equal timestamps ok)
    const prevTime = new Date(prev.timestamp).getTime();
    const currTime = new Date(curr.timestamp).getTime();
    if (Number.isNaN(prevTime) || Number.isNaN(currTime)) {
      // If timestamps are invalid, leave to schema validation upstream; skip order check
      continue;
    }
    if (currTime < prevTime) {
      throw new EventOrderError(
        `Events are not in chronological order: ${prev.timestamp} > ${curr.timestamp}`,
        {
          code: "EVENTS_OUT_OF_ORDER",
          index: i,
          prevTimestamp: prev.timestamp,
          currTimestamp: curr.timestamp,
        },
      );
    }
  }
}
