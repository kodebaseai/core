import fs from "node:fs/promises";
import path from "node:path";

import { getArtifactIdFromPath } from "./artifact-paths.js";

export async function loadAllArtifactPaths(
  artifactsRoot: string,
): Promise<string[]> {
  const result: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && getArtifactIdFromPath(fullPath)) {
        result.push(fullPath);
      }
    }
  }

  await walk(artifactsRoot);
  result.sort();
  return result;
}

export function loadArtifactsByType(
  artifactPaths: readonly string[],
  type: "initiative" | "milestone" | "issue",
): string[] {
  const segmentsByType = {
    initiative: 1,
    milestone: 2,
    issue: 3,
  } as const;

  const expectedSegments = segmentsByType[type];
  const ids: string[] = [];

  for (const filePath of artifactPaths) {
    const id = getArtifactIdFromPath(filePath);
    if (!id) continue;
    const segments = id.split(".").length;
    if (segments === expectedSegments) {
      ids.push(id);
    }
  }

  ids.sort();
  return ids;
}
