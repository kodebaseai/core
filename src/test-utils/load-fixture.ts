import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../test/fixtures",
);

export function readFixture(file: string): string {
  const absolute = path.join(BASE_DIR, file);
  return readFileSync(absolute, "utf8");
}

export function readFixtureJson<T>(file: string): T {
  const raw = readFixture(file);
  return JSON.parse(raw) as T;
}
