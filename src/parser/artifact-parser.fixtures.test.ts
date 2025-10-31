import { describe, expect, it } from "vitest";
import type { TInitiative, TIssue, TMilestone } from "../schemas/schemas.js";
import { readFixture, readFixtureJson } from "../test-utils/load-fixture.js";
import type { ArtifactParseError } from "./artifact-parser.js";
import {
  parseInitiative,
  parseIssue,
  parseMilestone,
} from "./artifact-parser.js";

const initiativeYaml = readFixture("artifacts/initiative.valid.yaml");
const initiativeExpected = readFixtureJson<TInitiative>(
  "artifacts/initiative.valid.json",
);

const milestoneYaml = readFixture("artifacts/milestone.valid.yaml");
const milestoneExpected = readFixtureJson<TMilestone>(
  "artifacts/milestone.valid.json",
);

const issueYaml = readFixture("artifacts/issue.valid.yaml");
const issueExpected = readFixtureJson<TIssue>("artifacts/issue.valid.json");

const issueInvalidYaml = readFixture(
  "artifacts/issue.invalid.missing-criteria.yaml",
);
const issueInvalidExpected = readFixtureJson<ArtifactParseError>(
  "artifacts/issue.invalid.missing-criteria.error.json",
);

const milestoneInvalidYaml = readFixture(
  "artifacts/milestone.invalid.missing-deliverables.yaml",
);
const milestoneInvalidExpected = readFixtureJson<ArtifactParseError>(
  "artifacts/milestone.invalid.missing-deliverables.error.json",
);

describe("artifact parser fixtures", () => {
  it("parses the initiative golden fixture", () => {
    const result = parseInitiative(initiativeYaml);
    expect(result).toEqual({
      success: true,
      data: initiativeExpected,
    });
  });

  it("parses the milestone golden fixture", () => {
    const result = parseMilestone(milestoneYaml);
    expect(result).toEqual({
      success: true,
      data: milestoneExpected,
    });
  });

  it("parses the issue golden fixture", () => {
    const result = parseIssue(issueYaml);
    expect(result).toEqual({
      success: true,
      data: issueExpected,
    });
  });

  it("returns the expected error payload for the invalid issue fixture", () => {
    const result = parseIssue(issueInvalidYaml);
    expect(result).toEqual({
      success: false,
      error: issueInvalidExpected,
    });
  });

  it("returns the expected error payload for the invalid milestone fixture", () => {
    const result = parseMilestone(milestoneInvalidYaml);
    expect(result).toEqual({
      success: false,
      error: milestoneInvalidExpected,
    });
  });
});
