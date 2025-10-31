import { describe, expect, it } from "vitest";
import { CArtifactEvent } from "../constants.js";
import { type EventOrderError, validateEventOrder } from "./event-order.js";

const base = {
  actor: "Jane Doe (jane@example.com)",
  trigger: "artifact_created" as const,
};

describe("validateEventOrder", () => {
  it("throws when events array is empty", () => {
    try {
      validateEventOrder([]);
      throw new Error("expected throw");
    } catch (e) {
      const err = e as EventOrderError;
      expect(err.code).toBe("EMPTY_EVENTS");
      expect(err.message).toMatch(/cannot be empty/i);
    }
  });

  it("requires first event to be draft", () => {
    const events = [
      {
        event: CArtifactEvent.READY,
        timestamp: "2025-10-31T13:00:00Z",
        ...base,
      },
    ];
    try {
      validateEventOrder(events);
      throw new Error("expected throw");
    } catch (e) {
      const err = e as EventOrderError;
      expect(err.code).toBe("FIRST_EVENT_MUST_BE_DRAFT");
      expect(err.index).toBe(0);
    }
  });

  it("accepts non-decreasing chronological order with draft first", () => {
    const events = [
      {
        event: CArtifactEvent.DRAFT,
        timestamp: "2025-10-31T13:00:00Z",
        ...base,
      },
      {
        event: CArtifactEvent.READY,
        timestamp: "2025-10-31T13:00:00Z",
        ...base,
      },
      {
        event: CArtifactEvent.IN_PROGRESS,
        timestamp: "2025-10-31T13:10:00Z",
        ...base,
      },
    ];
    expect(() => validateEventOrder(events)).not.toThrow();
  });

  it("rejects out-of-order timestamps and includes offending values", () => {
    const events = [
      {
        event: CArtifactEvent.DRAFT,
        timestamp: "2025-10-31T13:10:00Z",
        ...base,
      },
      {
        event: CArtifactEvent.READY,
        timestamp: "2025-10-31T13:05:00Z",
        ...base,
      },
    ];
    try {
      validateEventOrder(events);
      throw new Error("expected throw");
    } catch (e) {
      const err = e as EventOrderError;
      expect(err.code).toBe("EVENTS_OUT_OF_ORDER");
      expect(err.message).toMatch("2025-10-31T13:10:00Z");
      expect(err.message).toMatch("2025-10-31T13:05:00Z");
      expect(err.index).toBe(1);
    }
  });
});
