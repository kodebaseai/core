import path from "node:path";

/**
 * Matches artifact filenames with optional human-readable slugs.
 * Examples: A.yml, A.1.yml, A.1.2.feature-work.yml
 */
export const ARTIFACT_FILENAME_REGEX =
  /^([A-Z]+(?:\.\d+)*)(?:\.[A-Za-z0-9][A-Za-z0-9.-]*)?\.yml$/;

/**
 * Extracts the canonical artifact ID from a file path.
 * Returns null when the filename does not match the expected pattern.
 */
export function getArtifactIdFromPath(filePath: string): string | null {
  const filename = path.basename(filePath);
  const match = ARTIFACT_FILENAME_REGEX.exec(filename);
  if (!match) return null;
  return match[1] ?? null;
}
