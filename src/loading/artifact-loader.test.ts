import { describe, expect, it, vi } from "vitest";

import {
  loadAllArtifactPaths,
  loadArtifactsByType,
} from "./artifact-loader.js";

vi.mock("node:fs/promises", () => ({
  default: {
    readdir: vi.fn(),
  },
}));

const fs = await import("node:fs/promises");

describe("artifact loader", () => {
  it("recursively discovers artifact paths", async () => {
    const readdirMock = fs.default.readdir as unknown as ReturnType<
      typeof vi.fn
    >;

    readdirMock.mockImplementation(async (dir: string) => {
      if (dir === "/root") {
        return [
          { name: "A.yml", isDirectory: () => false, isFile: () => true },
          { name: "misc.txt", isDirectory: () => false, isFile: () => true },
          { name: "A.1", isDirectory: () => true, isFile: () => false },
        ];
      }
      if (dir === "/root/A.1") {
        return [
          {
            name: "A.1.1.feature.yml",
            isDirectory: () => false,
            isFile: () => true,
          },
          {
            name: ".hidden.yml",
            isDirectory: () => false,
            isFile: () => true,
          },
        ];
      }
      return [];
    });

    const paths = await loadAllArtifactPaths("/root");
    expect(paths).toEqual(["/root/A.1/A.1.1.feature.yml", "/root/A.yml"]);
  });

  it("filters artifacts by type using ID segments", () => {
    const paths = [
      "/root/A.yml",
      "/root/A.1.yml",
      "/root/A.1.2.slug.yml",
      "/root/notes.md",
    ];

    expect(loadArtifactsByType(paths, "initiative")).toEqual(["A"]);
    expect(loadArtifactsByType(paths, "milestone")).toEqual(["A.1"]);
    expect(loadArtifactsByType(paths, "issue")).toEqual(["A.1.2"]);
  });
});
