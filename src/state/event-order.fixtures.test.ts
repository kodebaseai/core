import { describe, expect, it } from "vitest";
import {
  parseInitiative,
  parseIssue,
  parseMilestone,
} from "../parser/artifact-parser.js";
import { readFixture } from "../test-utils/load-fixture.js";
import {
  type EventOrderError,
  type TEventRecord,
  validateEventOrder,
} from "./event-order.js";

describe("event-order fixtures", () => {
  it("accepts the issue lifecycle valid sequence fixture", () => {
    const yaml = readFixture("artifacts/issue.lifecycle.valid.yaml");
    const parsed = parseIssue(yaml);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const events = parsed.data.metadata
      .events as unknown as readonly TEventRecord[];
    expect(() => validateEventOrder(events)).not.toThrow();
  });

  it("accepts milestone lifecycle with equal timestamps", () => {
    const yaml = readFixture(
      "artifacts/milestone.lifecycle.equal-timestamps.yaml",
    );
    const parsed = parseMilestone(yaml);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const events = parsed.data.metadata
      .events as unknown as readonly TEventRecord[];
    expect(() => validateEventOrder(events)).not.toThrow();
  });

  it("rejects initiative lifecycle with out-of-order timestamps", () => {
    const yaml = readFixture(
      "artifacts/initiative.lifecycle.invalid-order.yaml",
    );
    const parsed = parseInitiative(yaml);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    try {
      const events = parsed.data.metadata
        .events as unknown as readonly TEventRecord[];
      validateEventOrder(events);
      throw new Error("expected throw");
    } catch (e) {
      const err = e as EventOrderError;
      expect(err.code).toBe("EVENTS_OUT_OF_ORDER");
      expect(err.index).toBe(1);
    }
  });
});
