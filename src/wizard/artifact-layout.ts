import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import { loadAllArtifactPaths } from "../loading/artifact-loader.js";
import { getArtifactIdFromPath } from "../loading/artifact-paths.js";

const ARTIFACTS_DIR = ".kodebase/artifacts";

/**
 * Ensures the `.kodebase/artifacts` directory structure exists.
 * Idempotent - safe to call multiple times.
 *
 * @param baseDir - Base directory (defaults to process.cwd())
 * @returns Absolute path to the artifacts directory
 */
export async function ensureArtifactsLayout(
  baseDir: string = process.cwd(),
): Promise<string> {
  const artifactsPath = path.join(baseDir, ARTIFACTS_DIR);
  await fs.mkdir(artifactsPath, { recursive: true });
  return artifactsPath;
}

export interface ResolvePathsOptions {
  /** Artifact ID (e.g., "A", "A.1", "A.1.1") */
  id: string;
  /** Optional human-readable slug */
  slug?: string;
  /** Base directory (defaults to process.cwd()) */
  baseDir?: string;
}

export interface ResolvedPaths {
  /** Directory where the artifact lives */
  dirPath: string;
  /** Full path to the YAML file */
  filePath: string;
}

/**
 * Resolves canonical directory and file paths for an artifact.
 *
 * - Initiatives: `A.slug/A.yml`
 * - Milestones: `A.slug/A.1.slug/A.1.yml`
 * - Issues: `A.slug/A.1.slug/A.1.1.slug.yml` (looks up parent milestone directory)
 *
 * @param options - Artifact ID, optional slug, and base directory
 * @returns Resolved directory and file paths
 * @throws Error if ID is invalid or parent milestone not found (for issues)
 */
export async function resolveArtifactPaths(
  options: ResolvePathsOptions,
): Promise<ResolvedPaths> {
  const { id, slug, baseDir = process.cwd() } = options;

  // Validate ID format (supports multi-letter initiatives like AA, ABC, etc.)
  const idPattern = /^[A-Z]+(?:\.\d+)*$/;
  if (!idPattern.test(id)) {
    throw new Error(
      `Invalid artifact ID "${id}". Expected format: A, AA, A.1, AB.123, A.1.1, etc.`,
    );
  }

  const artifactsRoot = path.join(baseDir, ARTIFACTS_DIR);
  const segments = id.split(".");
  const segmentCount = segments.length;

  // Initiative: A.slug/A.yml
  if (segmentCount === 1) {
    if (!slug) {
      throw new Error(
        `Initiative "${id}" requires a slug for directory naming`,
      );
    }
    const folderName = `${id}.${slug}`;
    const dirPath = path.join(artifactsRoot, folderName);
    const filePath = path.join(dirPath, `${id}.yml`);
    return { dirPath, filePath };
  }

  // Milestone: A.slug/A.1.slug/A.1.yml
  if (segmentCount === 2) {
    if (!slug) {
      throw new Error(`Milestone "${id}" requires a slug for directory naming`);
    }

    // Extract parent initiative ID
    const initiativeId = segments[0];

    // Find parent initiative folder
    let initiativeFolders: Dirent[];
    try {
      initiativeFolders = await fs.readdir(artifactsRoot, {
        withFileTypes: true,
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new Error(
          `Parent initiative "${initiativeId}" directory not found. Ensure the initiative exists first.`,
        );
      }
      throw error;
    }

    const initiativeFolder = initiativeFolders.find(
      (entry) =>
        entry.isDirectory() && entry.name.startsWith(`${initiativeId}.`),
    );

    if (!initiativeFolder) {
      throw new Error(
        `Parent initiative "${initiativeId}" directory not found. Ensure the initiative exists first.`,
      );
    }

    const folderName = `${id}.${slug}`;
    const dirPath = path.join(artifactsRoot, initiativeFolder.name, folderName);
    const filePath = path.join(dirPath, `${id}.yml`);
    return { dirPath, filePath };
  }

  // Issue: A.slug/A.1.slug/A.1.1.slug.yml
  // Need to find parent milestone directory using loader
  const parentMilestoneId = segments.slice(0, 2).join(".");

  // Use loader to find parent milestone directory
  let allPaths: string[];
  try {
    allPaths = await loadAllArtifactPaths(artifactsRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Parent milestone "${parentMilestoneId}" not found. Ensure the milestone exists first.`,
      );
    }
    throw error;
  }

  const parentPath = allPaths.find((p) => {
    const pathId = getArtifactIdFromPath(p);
    return pathId === parentMilestoneId;
  });

  if (!parentPath) {
    throw new Error(
      `Parent milestone "${parentMilestoneId}" not found. Ensure the milestone exists first.`,
    );
  }

  // Parent milestone's directory is where the issue file goes
  const dirPath = path.dirname(parentPath);

  // Issue filename: A.1.1.slug.yml or A.1.1.yml if no slug
  const fileName = slug ? `${id}.${slug}.yml` : `${id}.yml`;
  const filePath = path.join(dirPath, fileName);

  return { dirPath, filePath };
}
