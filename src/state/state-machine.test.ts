import { describe, expect, it } from "vitest";
import {
  ARTIFACT_EVENTS,
  CArtifact,
  CArtifactEvent,
  type TArtifactEvent,
  type TArtifactType,
} from "../constants.js";
import {
  assertTransition,
  canTransition,
  getStateTransitionsMap,
  getValidTransitions,
} from "./state-machine.js";

const ARTIFACT_TYPES: TArtifactType[] = [
  CArtifact.INITIATIVE,
  CArtifact.MILESTONE,
  CArtifact.ISSUE,
];

describe("state-machine", () => {
  it("defines transition maps for all states per type", () => {
    const map = getStateTransitionsMap();
    for (const type of ARTIFACT_TYPES) {
      const transitions = map[type];
      expect(transitions, `${type} map missing`).toBeTruthy();
      const keys = Object.keys(transitions) as TArtifactEvent[];
      expect(new Set(keys)).toEqual(new Set(ARTIFACT_EVENTS));
    }
  });

  it("canTransition allows only legal transitions", () => {
    // Issue: draft → ready allowed
    expect(
      canTransition(
        CArtifact.ISSUE,
        CArtifactEvent.DRAFT,
        CArtifactEvent.READY,
      ),
    ).toBe(true);
    // Issue: draft → in_progress not allowed
    expect(
      canTransition(
        CArtifact.ISSUE,
        CArtifactEvent.DRAFT,
        CArtifactEvent.IN_PROGRESS,
      ),
    ).toBe(false);
    // Milestone: in_review → completed allowed
    expect(
      canTransition(
        CArtifact.MILESTONE,
        CArtifactEvent.IN_REVIEW,
        CArtifactEvent.COMPLETED,
      ),
    ).toBe(true);
    // Initiative: archived → anything not allowed
    expect(
      canTransition(
        CArtifact.INITIATIVE,
        CArtifactEvent.ARCHIVED,
        CArtifactEvent.DRAFT,
      ),
    ).toBe(false);
  });

  it("getValidTransitions returns ordered, de-duplicated next states", () => {
    const next = getValidTransitions(CArtifact.ISSUE, CArtifactEvent.DRAFT);
    expect(next).toEqual([
      CArtifactEvent.READY,
      CArtifactEvent.BLOCKED,
      CArtifactEvent.CANCELLED,
    ]);

    // Terminal state has no transitions
    expect(
      getValidTransitions(CArtifact.ISSUE, CArtifactEvent.COMPLETED),
    ).toEqual([]);
  });

  it("assertTransition throws with clear error for illegal transitions", () => {
    const from = CArtifactEvent.DRAFT;
    const to = CArtifactEvent.IN_PROGRESS;
    try {
      assertTransition(CArtifact.ISSUE, from, to);
      throw new Error("expected to throw");
    } catch (e) {
      const err = e as Error & { validTransitions?: TArtifactEvent[] };
      expect(err.message).toMatch(
        /Invalid state transition: draft → in_progress for issue/,
      );
      expect(err.message).toMatch(
        /Valid transitions: ready, blocked, cancelled/,
      );
      expect(err.validTransitions).toEqual(
        getValidTransitions(CArtifact.ISSUE, from),
      );
    }
  });

  it("allows valid transition sequences per artifact type", () => {
    const flows: Array<{
      type: TArtifactType;
      sequence: TArtifactEvent[];
    }> = [
      {
        type: CArtifact.ISSUE,
        sequence: [
          CArtifactEvent.DRAFT,
          CArtifactEvent.READY,
          CArtifactEvent.IN_PROGRESS,
          CArtifactEvent.IN_REVIEW,
          CArtifactEvent.COMPLETED,
        ],
      },
      {
        type: CArtifact.MILESTONE,
        sequence: [
          CArtifactEvent.DRAFT,
          CArtifactEvent.READY,
          CArtifactEvent.IN_PROGRESS,
          CArtifactEvent.IN_REVIEW,
          CArtifactEvent.COMPLETED,
        ],
      },
      {
        type: CArtifact.INITIATIVE,
        sequence: [
          CArtifactEvent.DRAFT,
          CArtifactEvent.READY,
          CArtifactEvent.IN_PROGRESS,
          CArtifactEvent.IN_REVIEW,
          CArtifactEvent.COMPLETED,
        ],
      },
    ];

    for (const { type, sequence } of flows) {
      for (let i = 1; i < sequence.length; i++) {
        const from = sequence[i - 1] as TArtifactEvent;
        const to = sequence[i] as TArtifactEvent;
        expect(canTransition(type, from, to), `${type}: ${from}→${to}`).toBe(
          true,
        );
        expect(() => assertTransition(type, from, to)).not.toThrow();
      }
    }
  });

  it("rejects illegal transitions for each artifact type", () => {
    // Issue: cancelled -> ready is illegal
    expect(
      canTransition(
        CArtifact.ISSUE,
        CArtifactEvent.CANCELLED,
        CArtifactEvent.READY,
      ),
    ).toBe(false);

    // Milestone: draft -> in_review is illegal
    expect(
      canTransition(
        CArtifact.MILESTONE,
        CArtifactEvent.DRAFT,
        CArtifactEvent.IN_REVIEW,
      ),
    ).toBe(false);

    // Initiative: archived -> any is illegal
    expect(
      canTransition(
        CArtifact.INITIATIVE,
        CArtifactEvent.ARCHIVED,
        CArtifactEvent.DRAFT,
      ),
    ).toBe(false);
  });
});
