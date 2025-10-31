import { afterEach, describe, expect, it, vi } from "vitest";
import { ZodError, ZodIssueCode } from "zod";

type YamlModule = typeof import("yaml");
type YamlParseFn = YamlModule["parse"];

function getYamlState() {
  const globalObj = globalThis as Record<PropertyKey, unknown>;
  const key = Symbol.for("kodebase.yamlParseState");
  const state = (globalObj[key] as
    | {
        setters: Array<(impl: YamlParseFn) => void>;
        original: YamlParseFn | null;
      }
    | undefined) ?? {
    setters: [] as Array<(impl: YamlParseFn) => void>,
    original: null as YamlParseFn | null,
  };
  globalObj[key] = state;
  return state;
}

vi.mock("yaml", async (importOriginal) => {
  const actual = await importOriginal<YamlModule>();
  let implementation: YamlParseFn = actual.parse;
  const parseProxy = ((src: string, arg2?: unknown, arg3?: unknown) =>
    (implementation as unknown as (...args: unknown[]) => unknown)(
      src,
      arg2,
      arg3,
    )) as YamlParseFn;
  const setImplementation = (fn: typeof actual.parse) => {
    implementation = fn;
  };
  const state = getYamlState();
  state.setters.push(setImplementation);
  if (!state.original) {
    state.original = actual.parse;
  }
  return {
    ...actual,
    parse: parseProxy,
  };
});

import { YAMLParseError } from "yaml";
import { InitiativeSchema, IssueSchema } from "../schemas/schemas.js";
import {
  parseInitiative,
  parseIssue,
  parseMilestone,
  parseYaml,
} from "./artifact-parser.js";

const yamlState = getYamlState();

const setYamlParser = (impl: YamlParseFn) => {
  for (const setter of yamlState.setters) {
    setter(impl);
  }
};

afterEach(() => {
  if (yamlState.original) {
    setYamlParser(yamlState.original);
  }
});

const baseMetadata = `
metadata:
  title: "Sample Artifact"
  priority: medium
  estimation: S
  created_by: "Alice Example (alice@example.com)"
  assignee: "Bob Example (bob@example.com)"
  schema_version: "0.0.1"
  relationships:
    blocks: []
    blocked_by: []
  events:
    - event: draft
      timestamp: "2025-10-30T14:37:00Z"
      actor: "Alice Example (alice@example.com)"
      trigger: artifact_created
`;

describe("parseYaml", () => {
  it("rejects empty input with a clear message", () => {
    const result = parseYaml("   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe("yaml");
      expect(result.error.message).toMatch(/empty/i);
    }
  });

  it("rejects malformed YAML with context", () => {
    const result = parseYaml("metadata:\n  title: [");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe("yaml");
      expect(result.error.message).toMatch(/invalid yaml/i);
    }
  });

  it("rejects non-string input", () => {
    const response = (
      parseYaml as (value: unknown) => ReturnType<typeof parseYaml>
    )(42);
    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.error.kind).toBe("input");
    }
  });

  it("wraps unexpected parser errors with a friendly message", () => {
    setYamlParser(() => {
      throw new Error("boom");
    });
    const result = parseYaml("metadata: {}");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe("yaml");
      expect(result.error.message).toBe("Invalid YAML: boom");
    }
  });

  it("falls back to a generic message when a non-error is thrown", () => {
    setYamlParser(() => {
      throw { boom: true };
    });
    const result = parseYaml("metadata: {}");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe("yaml");
      expect(result.error.message).toBe("Invalid YAML content");
    }
  });

  it("includes line and column information when available", () => {
    const error = new YAMLParseError([0, 0], "UNEXPECTED_TOKEN", "Kaboom");
    (
      error as unknown as {
        linePos: Array<{ line: number; col: number }>;
      }
    ).linePos = [{ line: 3, col: 5 }];
    setYamlParser(() => {
      throw error;
    });
    const result = parseYaml("metadata: {}\ncontent: {}\nnotes:");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("line 3, column 5");
    }
  });
});

describe("parseInitiative", () => {
  it("surfaced YAML errors bubble up through normalizeInput", () => {
    const result = parseInitiative("metadata: [");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe("yaml");
      expect(result.error.message).toMatch(/invalid yaml/i);
    }
  });

  it("parses valid initiative YAML into a typed object", () => {
    const yaml = `
${baseMetadata}
content:
  vision: "Adopt registry-driven artifacts"
  scope:
    in:
      - "Schema coverage"
    out:
      - "Legacy adapters"
  success_criteria:
    - "All artifacts validated"
impact_summary:
  outcome: "Artifacts backed by strong schemas"
  benefits:
    - "Higher reliability"
  next: "Roll into downstream repos"
`;

    const result = parseInitiative(yaml);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.title).toBe("Sample Artifact");
      expect(result.data.content.success_criteria).toEqual([
        "All artifacts validated",
      ]);
    }
  });

  it("returns formatted schema errors when required fields are missing", () => {
    const yaml = `
${baseMetadata}
content:
  scope:
    in:
      - "Schema coverage"
    out:
      - "Legacy adapters"
  success_criteria:
    - "All artifacts validated"
`;
    const result = parseInitiative(yaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe("schema");
      expect(result.error.issues?.[0]?.path).toBe("content.vision");
      expect(result.error.issues?.[0]?.message).toMatch(/expected string/i);
    }
  });
});

describe("parseMilestone", () => {
  it("rejects YAML documents that do not produce an object", () => {
    const yaml = `
- item: 1
- item: 2
`;
    const result = parseMilestone(yaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe("yaml");
      expect(result.error.message).toMatch(/must produce an object/i);
    }
  });

  it("parses a valid milestone object passed directly", () => {
    const milestone = {
      metadata: {
        title: "Milestone Alpha",
        priority: "high",
        estimation: "M",
        created_by: "Alice Example (alice@example.com)",
        assignee: "Bob Example (bob@example.com)",
        schema_version: "0.0.1",
        relationships: { blocks: [], blocked_by: [] },
        events: [
          {
            event: "draft",
            timestamp: "2025-10-30T14:37:00Z",
            actor: "Alice Example (alice@example.com)",
            trigger: "artifact_created",
          },
        ],
      },
      content: {
        summary: "Deliver parser and validator",
        deliverables: ["Parser module", "Validation utilities"],
        validation: ["CI green"],
      },
      delivery_summary: {
        outcome: "Delivered parser",
        delivered: ["Parser", "Tests"],
        deviations: ["Skipped stretch goal"],
        next: "Integrate with CLI",
        risks: ["Adoption risk"],
      },
    };
    const result = parseMilestone(milestone);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content.deliverables).toHaveLength(2);
    }
  });
});

describe("parseIssue", () => {
  it("rejects inputs that are not plain objects when provided directly", () => {
    const result = parseIssue([] as unknown as Record<string, unknown>);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe("input");
      expect(result.error.message).toMatch(/must be a yaml string/i);
    }
  });

  it("parses valid issue YAML", () => {
    const yaml = `
${baseMetadata}
content:
  summary: "Implement artifact parser"
  acceptance_criteria:
    - "parseYaml rejects invalid input"
    - "parseIssue returns typed object"
implementation_notes:
  result: "Parser utilities implemented"
`;
    const result = parseIssue(yaml);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content.acceptance_criteria[0]).toMatch(/rejects/i);
    }
  });

  it("returns friendly zod validation errors", () => {
    const yaml = `
${baseMetadata}
content:
  summary: "Implement artifact parser"
  acceptance_criteria: []
`;
    const result = parseIssue(yaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.kind).toBe("schema");
      const issue = result.error.issues?.[0];
      expect(issue?.path).toBe("content.acceptance_criteria");
      expect(issue?.message).not.toMatch(/ZodError/i);
    }
  });

  it("formats root and indexed issue paths", () => {
    const zodError = new ZodError([
      {
        code: ZodIssueCode.custom,
        message: "Root validation failed",
        path: [],
        params: {},
      },
      {
        code: ZodIssueCode.custom,
        message: "Item invalid",
        path: ["content", "items", 0],
        params: {},
      },
    ]);
    const spy = vi.spyOn(IssueSchema, "parse").mockImplementation(() => {
      throw zodError;
    });
    try {
      const result = parseIssue({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual([
          {
            code: ZodIssueCode.custom,
            path: "(root)",
            message: "Root validation failed",
          },
          {
            code: ZodIssueCode.custom,
            path: "content.items[0]",
            message: "Item invalid",
          },
        ]);
      }
    } finally {
      spy.mockRestore();
    }
  });

  it("formats symbol paths using descriptions", () => {
    const symbolKey = Symbol("custom");
    const zodError = new ZodError([
      {
        code: ZodIssueCode.custom,
        message: "Symbolic issue",
        path: [symbolKey],
        params: {},
      },
    ]);
    const spy = vi.spyOn(IssueSchema, "parse").mockImplementation(() => {
      throw zodError;
    });
    try {
      const result = parseIssue({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues?.[0]).toEqual({
          code: ZodIssueCode.custom,
          path: "custom",
          message: "Symbolic issue",
        });
      }
    } finally {
      spy.mockRestore();
    }
  });

  it("falls back to placeholder when symbol lacks description", () => {
    const anonymousSymbol = Symbol();
    const zodError = new ZodError([
      {
        code: ZodIssueCode.custom,
        message: "Anonymous symbol issue",
        path: [anonymousSymbol],
        params: {},
      },
    ]);
    const spy = vi.spyOn(IssueSchema, "parse").mockImplementation(() => {
      throw zodError;
    });
    try {
      const result = parseIssue({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues?.[0]).toEqual({
          code: ZodIssueCode.custom,
          path: "[symbol]",
          message: "Anonymous symbol issue",
        });
      }
    } finally {
      spy.mockRestore();
    }
  });
});

describe("parseInitiative error fallbacks", () => {
  it("handles unexpected schema errors without issue trees", () => {
    const spy = vi.spyOn(InitiativeSchema, "parse").mockImplementation(() => {
      throw new Error("unexpected failure");
    });
    try {
      const result = parseInitiative({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.kind).toBe("schema");
        expect(result.error.message).toMatch(/unexpected failure/);
      }
    } finally {
      spy.mockRestore();
    }
  });

  it("falls back to generic message when non-error is thrown", () => {
    const spy = vi.spyOn(InitiativeSchema, "parse").mockImplementation(() => {
      throw { fail: true };
    });
    try {
      const result = parseInitiative({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.kind).toBe("schema");
        expect(result.error.message).toMatch(/Unknown validation failure/);
      }
    } finally {
      spy.mockRestore();
    }
  });
});
