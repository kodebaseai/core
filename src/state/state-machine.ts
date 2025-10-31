import type { TArtifactEvent, TArtifactType } from "../constants.js";
import { CArtifact, CArtifactEvent } from "../constants.js";

// Defines valid state transitions for each artifact type
// Arrays are ordered to represent recommended progression order.
const STATE_TRANSITIONS: Record<
  TArtifactType,
  Record<TArtifactEvent, readonly TArtifactEvent[]>
> = {
  [CArtifact.ISSUE]: {
    [CArtifactEvent.DRAFT]: [
      CArtifactEvent.READY,
      CArtifactEvent.BLOCKED,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.BLOCKED]: [CArtifactEvent.READY, CArtifactEvent.CANCELLED],
    [CArtifactEvent.READY]: [
      CArtifactEvent.IN_PROGRESS,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.IN_PROGRESS]: [
      CArtifactEvent.IN_REVIEW,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.IN_REVIEW]: [
      CArtifactEvent.COMPLETED,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.COMPLETED]: [],
    [CArtifactEvent.CANCELLED]: [CArtifactEvent.DRAFT, CArtifactEvent.ARCHIVED],
    [CArtifactEvent.ARCHIVED]: [],
  },
  [CArtifact.MILESTONE]: {
    [CArtifactEvent.DRAFT]: [CArtifactEvent.READY, CArtifactEvent.CANCELLED],
    [CArtifactEvent.BLOCKED]: [CArtifactEvent.READY, CArtifactEvent.CANCELLED],
    [CArtifactEvent.READY]: [
      CArtifactEvent.IN_PROGRESS,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.IN_PROGRESS]: [
      CArtifactEvent.IN_REVIEW,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.IN_REVIEW]: [
      CArtifactEvent.COMPLETED,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.COMPLETED]: [],
    [CArtifactEvent.CANCELLED]: [CArtifactEvent.DRAFT, CArtifactEvent.ARCHIVED],
    [CArtifactEvent.ARCHIVED]: [],
  },
  [CArtifact.INITIATIVE]: {
    [CArtifactEvent.DRAFT]: [CArtifactEvent.READY, CArtifactEvent.CANCELLED],
    [CArtifactEvent.BLOCKED]: [CArtifactEvent.READY, CArtifactEvent.CANCELLED],
    [CArtifactEvent.READY]: [
      CArtifactEvent.IN_PROGRESS,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.IN_PROGRESS]: [
      CArtifactEvent.IN_REVIEW,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.IN_REVIEW]: [
      CArtifactEvent.COMPLETED,
      CArtifactEvent.CANCELLED,
    ],
    [CArtifactEvent.COMPLETED]: [],
    [CArtifactEvent.CANCELLED]: [CArtifactEvent.DRAFT, CArtifactEvent.ARCHIVED],
    [CArtifactEvent.ARCHIVED]: [],
  },
};

export class StateTransitionError extends Error {
  readonly artifactType: TArtifactType;
  readonly fromState: TArtifactEvent;
  readonly toState: TArtifactEvent;
  readonly validTransitions: readonly TArtifactEvent[];

  constructor(
    message: string,
    details: {
      artifactType: TArtifactType;
      fromState: TArtifactEvent;
      toState: TArtifactEvent;
      validTransitions: readonly TArtifactEvent[];
    },
  ) {
    super(message);
    this.name = "StateTransitionError";
    this.artifactType = details.artifactType;
    this.fromState = details.fromState;
    this.toState = details.toState;
    this.validTransitions = details.validTransitions;
  }
}

export function canTransition(
  artifactType: TArtifactType,
  fromState: TArtifactEvent,
  toState: TArtifactEvent,
): boolean {
  const transitions = STATE_TRANSITIONS[artifactType];
  if (!transitions) return false;
  const valid = transitions[fromState];
  if (!valid) return false;
  return valid.includes(toState);
}

export function getValidTransitions(
  artifactType: TArtifactType,
  currentState: TArtifactEvent,
): TArtifactEvent[] {
  const transitions = STATE_TRANSITIONS[artifactType];
  if (!transitions) return [];
  const next = transitions[currentState] ?? [];
  // Return de-duplicated while preserving original order
  const seen = new Set<string>();
  const result: TArtifactEvent[] = [];
  for (const state of next) {
    if (!seen.has(state)) {
      seen.add(state);
      result.push(state);
    }
  }
  return result;
}

export function assertTransition(
  artifactType: TArtifactType,
  fromState: TArtifactEvent,
  toState: TArtifactEvent,
): void {
  if (canTransition(artifactType, fromState, toState)) return;
  const validTransitions = getValidTransitions(artifactType, fromState);
  const message =
    `Invalid state transition: ${fromState} → ${toState} for ${artifactType}. ` +
    (validTransitions.length > 0
      ? `Valid transitions: ${validTransitions.join(", ")}`
      : "No valid transitions from current state.");
  throw new StateTransitionError(message, {
    artifactType,
    fromState,
    toState,
    validTransitions,
  });
}

export function getStateTransitionsMap() {
  return STATE_TRANSITIONS;
}
