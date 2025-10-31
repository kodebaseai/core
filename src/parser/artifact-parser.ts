import { parse as parseYamlDocument, YAMLParseError } from "yaml";
import type { ZodError } from "zod";

import {
  InitiativeSchema,
  IssueSchema,
  MilestoneSchema,
  type TInitiative,
  type TIssue,
  type TMilestone,
} from "../schemas/schemas.js";

export type ArtifactParseIssue = {
  path: string;
  message: string;
  code?: string;
};

export type ArtifactParseErrorKind = "yaml" | "schema" | "input";

export type ArtifactParseError = {
  kind: ArtifactParseErrorKind;
  message: string;
  issues?: ArtifactParseIssue[];
};

export type ArtifactParseSuccess<T> = {
  success: true;
  data: T;
};

export type ArtifactParseFailure = {
  success: false;
  error: ArtifactParseError;
};

export type ArtifactParseResult<T> =
  | ArtifactParseSuccess<T>
  | ArtifactParseFailure;

const ROOT_PATH = "(root)";

const yamlParseOptions = Object.freeze({
  prettyErrors: false,
});

function formatYamlError(err: unknown): string {
  if (err instanceof YAMLParseError) {
    const at =
      err.linePos && err.linePos.length > 0
        ? ` at line ${err.linePos[0].line}, column ${err.linePos[0].col}`
        : "";
    return `Invalid YAML${at}: ${err.message}`;
  }
  if (err instanceof Error) {
    return `Invalid YAML: ${err.message}`;
  }

  return "Invalid YAML content";
}

function ensurePlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeInput(
  input: unknown,
): ArtifactParseResult<Record<string, unknown>> {
  if (typeof input === "string") {
    const yamlResult = parseYaml(input);
    if (!yamlResult.success) {
      return yamlResult;
    }
    if (!ensurePlainObject(yamlResult.data)) {
      return {
        success: false,
        error: {
          kind: "yaml",
          message:
            "Parsed YAML must produce an object with metadata/content sections",
        },
      };
    }
    return { success: true, data: yamlResult.data };
  }

  if (!ensurePlainObject(input)) {
    return {
      success: false,
      error: {
        kind: "input",
        message:
          "Parser input must be a YAML string or an object matching the artifact schema",
      },
    };
  }

  return { success: true, data: input };
}

function formatZodIssuePath(path: ZodError["issues"][number]["path"]): string {
  if (path.length === 0) {
    return ROOT_PATH;
  }

  return path.reduce<string>((acc, segment) => {
    if (typeof segment === "number") {
      return `${acc}[${segment}]`;
    }
    const key =
      typeof segment === "symbol"
        ? (segment.description ?? "[symbol]")
        : String(segment);
    return acc ? `${acc}.${key}` : key;
  }, "");
}

function formatSchemaError(
  label: string,
  error: ZodError<unknown>,
): ArtifactParseError {
  const issues = error.issues.map((issue) => ({
    path: formatZodIssuePath(issue.path),
    message: issue.message,
    code: issue.code,
  }));
  const plural = issues.length === 1 ? "issue" : "issues";
  return {
    kind: "schema",
    message: `${label} validation failed (${issues.length} ${plural})`,
    issues,
  };
}

function parseWithSchema<T>(
  input: unknown,
  schemaLabel: string,
  parse: (value: unknown) => T,
): ArtifactParseResult<T> {
  const normalized = normalizeInput(input);
  if (!normalized.success) {
    return normalized;
  }

  try {
    const data = parse(normalized.data);
    return { success: true, data };
  } catch (err) {
    if (err && typeof err === "object" && "issues" in err) {
      return {
        success: false,
        error: formatSchemaError(schemaLabel, err as ZodError<unknown>),
      };
    }
    const message =
      err instanceof Error ? err.message : "Unknown validation failure";
    return {
      success: false,
      error: {
        kind: "schema",
        message: `${schemaLabel} validation failed: ${message}`,
      },
    };
  }
}

export function parseYaml(input: string): ArtifactParseResult<unknown> {
  if (typeof input !== "string") {
    return {
      success: false,
      error: {
        kind: "input",
        message: "YAML input must be a string",
      },
    };
  }

  try {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return {
        success: false,
        error: {
          kind: "yaml",
          message: "YAML input is empty",
        },
      };
    }

    const document = parseYamlDocument(trimmed, yamlParseOptions);
    return { success: true, data: document };
  } catch (err) {
    return {
      success: false,
      error: {
        kind: "yaml",
        message: formatYamlError(err),
      },
    };
  }
}

export function parseInitiative(
  input: string | Record<string, unknown>,
): ArtifactParseResult<TInitiative> {
  return parseWithSchema(input, "Initiative artifact", (value) =>
    InitiativeSchema.parse(value),
  );
}

export function parseMilestone(
  input: string | Record<string, unknown>,
): ArtifactParseResult<TMilestone> {
  return parseWithSchema(input, "Milestone artifact", (value) =>
    MilestoneSchema.parse(value),
  );
}

export function parseIssue(
  input: string | Record<string, unknown>,
): ArtifactParseResult<TIssue> {
  return parseWithSchema(input, "Issue artifact", (value) =>
    IssueSchema.parse(value),
  );
}

export const ArtifactParser = {
  parseYaml,
  parseInitiative,
  parseMilestone,
  parseIssue,
} as const;
