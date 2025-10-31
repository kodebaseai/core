import fs from "node:fs/promises";

import yaml from "yaml";

export async function readArtifact<T = unknown>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return yaml.parse(content) as T;
  } catch (error) {
    throw new Error(
      `Failed to read artifact at ${filePath}: ${(error as Error).message}`,
    );
  }
}

const YAML_OPTIONS: yaml.ToStringOptions = {
  lineWidth: 0,
};

export async function writeArtifact(
  filePath: string,
  data: unknown,
): Promise<void> {
  try {
    const serialized = yaml.stringify(data, YAML_OPTIONS);
    await fs.writeFile(filePath, serialized, "utf8");
  } catch (error) {
    throw new Error(
      `Failed to write artifact at ${filePath}: ${(error as Error).message}`,
    );
  }
}
