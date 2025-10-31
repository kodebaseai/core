import { describe, expect, it } from "vitest";
import { CArtifact } from "../constants.js";
import type { ArtifactParseError } from "../parser/artifact-parser.js";
import type { TInitiative, TIssue, TMilestone } from "../schemas/schemas.js";
import { readFixture, readFixtureJson } from "../test-utils/load-fixture.js";
import {
  ArtifactValidationError,
  validateArtifact,
  validateInitiative,
  validateIssue,
  validateMilestone,
} from "./artifact-validator.js";

const initiativeData = readFixtureJson<TInitiative>(
  "artifacts/initiative.valid.json",
);
const milestoneData = readFixtureJson<TMilestone>(
  "artifacts/milestone.valid.json",
);
const issueData = readFixtureJson<TIssue>("artifacts/issue.valid.json");

const issueInvalidYaml = readFixture(
  "artifacts/issue.invalid.missing-criteria.yaml",
);
const issueInvalidError = readFixtureJson<ArtifactParseError>(
  "artifacts/issue.invalid.missing-criteria.error.json",
);

const milestoneInvalidYaml = readFixture(
  "artifacts/milestone.invalid.missing-deliverables.yaml",
);
const milestoneInvalidError = readFixtureJson<ArtifactParseError>(
  "artifacts/milestone.invalid.missing-deliverables.error.json",
);

describe("artifact validator fixtures", () => {
  it("validates initiative fixture data", () => {
    const validated = validateInitiative(initiativeData);
    expect(validated).toEqual(initiativeData);
  });

  it("validates milestone fixture data", () => {
    const validated = validateMilestone(milestoneData);
    expect(validated).toEqual(milestoneData);
  });

  it("validates issue fixture data", () => {
    const validated = validateIssue(issueData);
    expect(validated).toEqual(issueData);
  });

  it("detects artifact type from issue fixture data", () => {
    const result = validateArtifact(issueData);
    expect(result).toEqual({
      type: CArtifact.ISSUE,
      data: issueData,
    });
  });

  it("throws schema errors for invalid issue YAML fixture", () => {
    try {
      validateIssue(issueInvalidYaml);
      throw new Error("Expected issue validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ArtifactValidationError);
      const validationError = error as ArtifactValidationError;
      expect(validationError.kind).toBe(issueInvalidError.kind);
      expect(validationError.message).toBe(issueInvalidError.message);
      expect(validationError.issues).toEqual(issueInvalidError.issues);
    }
  });

  it("throws schema errors for invalid milestone YAML fixture", () => {
    try {
      validateMilestone(milestoneInvalidYaml);
      throw new Error("Expected milestone validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ArtifactValidationError);
      const validationError = error as ArtifactValidationError;
      expect(validationError.kind).toBe(milestoneInvalidError.kind);
      expect(validationError.message).toBe(milestoneInvalidError.message);
      expect(validationError.issues).toEqual(milestoneInvalidError.issues);
    }
  });
});
