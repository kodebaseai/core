import { describe, expect, it } from "vitest";

import {
  ARTIFACT_FILENAME_REGEX,
  getArtifactIdFromPath,
} from "./artifact-paths.js";

describe("artifact filename regex", () => {
  const validCases = [
    "A.yml",
    "A.1.yml",
    "A.1.1.feature-work.yml",
    "B.12.3.slug.yml",
    "AB.12.3.slug.yml",
    "ZZZ.1112.3333.slug.yml",
  ];

  for (const filename of validCases) {
    it(`matches ${filename}`, () => {
      expect(ARTIFACT_FILENAME_REGEX.test(filename)).toBe(true);
    });
  }

  const invalidCases = [
    "notes.md",
    "A1.yml",
    "a.1.yml",
    "A.1",
    "1.yml",
    "1.1.yml",
    "-A.yml",
    "A-.yml",
    "AA..1.yml",
    "AA1.yml",
  ];

  for (const filename of invalidCases) {
    it(`does not match ${filename}`, () => {
      expect(ARTIFACT_FILENAME_REGEX.test(filename)).toBe(false);
    });
  }
});

describe("getArtifactIdFromPath", () => {
  it("extracts id from bare filenames", () => {
    expect(getArtifactIdFromPath("A.yml")).toBe("A");
    expect(getArtifactIdFromPath("A.1.yml")).toBe("A.1");
    expect(getArtifactIdFromPath("A.1.1.my-feature.yml")).toBe("A.1.1");
  });

  it("extracts id when path includes directories", () => {
    expect(
      getArtifactIdFromPath(
        ".kodebase/artifacts/A.core/A.1.something/A.1.2.slug.yml",
      ),
    ).toBe("A.1.2");
  });

  it("returns null when filename does not match", () => {
    expect(getArtifactIdFromPath("notes.md")).toBeNull();
    expect(getArtifactIdFromPath("/tmp/A1.yml")).toBeNull();
  });
});
