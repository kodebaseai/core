import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import {
  ensureArtifactsLayout,
  resolveArtifactPaths,
} from "./artifact-layout.js";

describe("ensureArtifactsLayout", () => {
  it("creates .kodebase/artifacts directory if missing", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-layout-"));
    try {
      const artifactsPath = await ensureArtifactsLayout(tempDir);
      expect(artifactsPath).toBe(path.join(tempDir, ".kodebase/artifacts"));

      const stats = await fs.stat(artifactsPath);
      expect(stats.isDirectory()).toBe(true);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("is idempotent when directory already exists", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-layout-"));
    try {
      const firstCall = await ensureArtifactsLayout(tempDir);
      const secondCall = await ensureArtifactsLayout(tempDir);
      expect(firstCall).toBe(secondCall);

      const stats = await fs.stat(firstCall);
      expect(stats.isDirectory()).toBe(true);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("returns absolute path to artifacts directory", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-layout-"));
    try {
      const artifactsPath = await ensureArtifactsLayout(tempDir);
      expect(path.isAbsolute(artifactsPath)).toBe(true);
      expect(artifactsPath).toContain(".kodebase/artifacts");
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe("resolveArtifactPaths", () => {
  describe("initiatives", () => {
    it("resolves initiative paths with slug", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-paths-"));
      try {
        const result = await resolveArtifactPaths({
          id: "A",
          slug: "core-package",
          baseDir: tempDir,
        });

        expect(result.dirPath).toBe(
          path.join(tempDir, ".kodebase/artifacts/A.core-package"),
        );
        expect(result.filePath).toBe(
          path.join(tempDir, ".kodebase/artifacts/A.core-package/A.yml"),
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("throws error when initiative slug is missing", async () => {
      await expect(resolveArtifactPaths({ id: "A" })).rejects.toThrow(
        /requires a slug/,
      );
    });

    it("throws error for invalid initiative ID format", async () => {
      await expect(
        resolveArtifactPaths({ id: "a", slug: "test" }),
      ).rejects.toThrow(/Invalid artifact ID/);

      await expect(
        resolveArtifactPaths({ id: "A1", slug: "test" }),
      ).rejects.toThrow(/Invalid artifact ID/);
    });
  });

  describe("milestones", () => {
    it("resolves milestone paths with slug when parent initiative exists", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-paths-"));
      try {
        // Create parent initiative directory
        const initiativeDir = path.join(
          tempDir,
          ".kodebase/artifacts/A.core-package",
        );
        await fs.mkdir(initiativeDir, { recursive: true });

        const result = await resolveArtifactPaths({
          id: "A.1",
          slug: "types-schemas",
          baseDir: tempDir,
        });

        expect(result.dirPath).toBe(
          path.join(initiativeDir, "A.1.types-schemas"),
        );
        expect(result.filePath).toBe(
          path.join(initiativeDir, "A.1.types-schemas/A.1.yml"),
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("throws error when parent initiative directory not found", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-paths-"));
      try {
        await expect(
          resolveArtifactPaths({
            id: "A.1",
            slug: "test",
            baseDir: tempDir,
          }),
        ).rejects.toThrow(/Parent initiative "A" directory not found/);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("throws error when milestone slug is missing", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-paths-"));
      try {
        await fs.mkdir(path.join(tempDir, ".kodebase/artifacts/A.core"), {
          recursive: true,
        });

        await expect(
          resolveArtifactPaths({ id: "A.1", baseDir: tempDir }),
        ).rejects.toThrow(/requires a slug/);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("issues", () => {
    it("resolves issue paths with slug when parent milestone exists", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-paths-"));
      try {
        // Create parent milestone structure
        const milestoneDir = path.join(
          tempDir,
          ".kodebase/artifacts/A.core/A.1.types",
        );
        await fs.mkdir(milestoneDir, { recursive: true });

        // Create milestone file so loader can find it
        await fs.writeFile(
          path.join(milestoneDir, "A.1.yml"),
          "metadata:\n  title: Test\n",
        );

        const result = await resolveArtifactPaths({
          id: "A.1.1",
          slug: "constants",
          baseDir: tempDir,
        });

        expect(result.dirPath).toBe(milestoneDir);
        expect(result.filePath).toBe(
          path.join(milestoneDir, "A.1.1.constants.yml"),
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("resolves issue paths without slug when parent milestone exists", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-paths-"));
      try {
        const milestoneDir = path.join(
          tempDir,
          ".kodebase/artifacts/B.web/B.1.auth",
        );
        await fs.mkdir(milestoneDir, { recursive: true });
        await fs.writeFile(
          path.join(milestoneDir, "B.1.yml"),
          "metadata:\n  title: Test\n",
        );

        const result = await resolveArtifactPaths({
          id: "B.1.2",
          baseDir: tempDir,
        });

        expect(result.dirPath).toBe(milestoneDir);
        expect(result.filePath).toBe(path.join(milestoneDir, "B.1.2.yml"));
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("throws error when parent milestone not found", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-paths-"));
      try {
        await expect(
          resolveArtifactPaths({
            id: "A.1.1",
            slug: "test",
            baseDir: tempDir,
          }),
        ).rejects.toThrow(/Parent milestone "A.1" not found/);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("handles multi-digit issue numbers", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-paths-"));
      try {
        const milestoneDir = path.join(
          tempDir,
          ".kodebase/artifacts/C.api/C.2.endpoints",
        );
        await fs.mkdir(milestoneDir, { recursive: true });
        await fs.writeFile(
          path.join(milestoneDir, "C.2.yml"),
          "metadata:\n  title: Test\n",
        );

        const result = await resolveArtifactPaths({
          id: "C.2.15",
          slug: "pagination",
          baseDir: tempDir,
        });

        expect(result.dirPath).toBe(milestoneDir);
        expect(result.filePath).toBe(
          path.join(milestoneDir, "C.2.15.pagination.yml"),
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("edge cases", () => {
    it("handles special characters in slugs", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-paths-"));
      try {
        const result = await resolveArtifactPaths({
          id: "Z",
          slug: "test-feature_v2",
          baseDir: tempDir,
        });

        expect(result.dirPath).toContain("Z.test-feature_v2");
        expect(result.filePath).toContain("Z.test-feature_v2/Z.yml");
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("supports multi-letter initiative IDs", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-paths-"));
      try {
        const result = await resolveArtifactPaths({
          id: "ABC",
          slug: "multi-letter",
          baseDir: tempDir,
        });

        expect(result.dirPath).toBe(
          path.join(tempDir, ".kodebase/artifacts/ABC.multi-letter"),
        );
        expect(result.filePath).toBe(
          path.join(tempDir, ".kodebase/artifacts/ABC.multi-letter/ABC.yml"),
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("supports multi-letter initiatives with milestones", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-paths-"));
      try {
        // Create parent initiative directory
        const initiativeDir = path.join(
          tempDir,
          ".kodebase/artifacts/XYZ.some-project",
        );
        await fs.mkdir(initiativeDir, { recursive: true });

        const result = await resolveArtifactPaths({
          id: "XYZ.42",
          slug: "milestone",
          baseDir: tempDir,
        });

        expect(result.dirPath).toBe(
          path.join(initiativeDir, "XYZ.42.milestone"),
        );
        expect(result.filePath).toBe(
          path.join(initiativeDir, "XYZ.42.milestone/XYZ.42.yml"),
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("supports multi-digit milestone and issue numbers", async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "kb-paths-"));
      try {
        const milestoneDir = path.join(
          tempDir,
          ".kodebase/artifacts/AB.test/AB.999.large-milestone",
        );
        await fs.mkdir(milestoneDir, { recursive: true });
        await fs.writeFile(
          path.join(milestoneDir, "AB.999.yml"),
          "metadata:\n  title: Test\n",
        );

        const result = await resolveArtifactPaths({
          id: "AB.999.12345",
          slug: "issue",
          baseDir: tempDir,
        });

        expect(result.dirPath).toBe(milestoneDir);
        expect(result.filePath).toBe(
          path.join(milestoneDir, "AB.999.12345.issue.yml"),
        );
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it("rejects IDs with lowercase letters", async () => {
      await expect(
        resolveArtifactPaths({ id: "a.1", slug: "test" }),
      ).rejects.toThrow(/Invalid artifact ID/);
    });

    it("rejects IDs with non-numeric segments after first segment", async () => {
      await expect(
        resolveArtifactPaths({ id: "A.B", slug: "test" }),
      ).rejects.toThrow(/Invalid artifact ID/);
    });
  });
});
