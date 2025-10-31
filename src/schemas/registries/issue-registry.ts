import * as z from "zod";
import {
  type ArtifactFieldMeta,
  ChallengeSchema,
  CriteriaListSchema,
} from "./shared-registry.js";

// ------------------------------------------------------
// Issue Content Schemas
// ------------------------------------------------------

const issueContentMeta = {
  id: "issue.content",
  title: "Artifact Content",
  description:
    "The main content for the issue-type artifact (summary + acceptance)",
};
const summaryMeta = {
  id: "issue.content.summary",
  title: "Summary",
  description: "Clear description of what needs to be done and why",
  examples: [
    "Update artifact schemas to remove unused fields and simplify the developer experience based on real usage patterns.",
    "Add email validation to the user registration form to prevent invalid signups.",
    "Fix the navigation menu on mobile devices - currently overlaps with content.",
  ],
};
const acceptanceCriteriaMeta = {
  id: "issue.content.acceptance_criteria",
  title: "Acceptance criteria",
  description: "Specific, testable criteria that define 'done' - be concrete!",
  examples: [
    [
      "Constants export includes states, priorities, estimation sizes, artifact types",
      "Triggers include dependencies_met, has_dependencies, branch_created, pr_ready, pr_merged, dependency_completed, children_started, children_completed, parent_completed, parent_archived, manual_cancel",
      "Types inferred from constants are available for downstream schemas",
    ],
    [
      "Relationships default to empty arrays; only sibling IDs allowed by validator",
      "Artifact metadata requires all core fields and at least one event (draft)",
      "Unit tests cover valid and invalid structures",
    ],
  ],
};

const issueContentRegistry = z.registry<ArtifactFieldMeta>();
const SummarySchema = z
  .string()
  .min(1) // schemas.ts enforces min(1)
  .register(z.globalRegistry, summaryMeta)
  .register(issueContentRegistry, {
    ...summaryMeta,
    ui: { label: summaryMeta.title },
  });
const AcceptanceCriteriaSchema = CriteriaListSchema.register(
  z.globalRegistry,
  acceptanceCriteriaMeta,
).register(issueContentRegistry, {
  ...acceptanceCriteriaMeta,
  ui: { label: acceptanceCriteriaMeta.title },
});

// ------------------------------------------------------
// ImplementationNotesSchema
// ------------------------------------------------------

// Implementation Notes
const implementationNotesMeta = {
  id: "issue.implementation_notes",
  title: "Implementation Notes",
  description:
    "Structured developer commentary capturing the real-world process, obstacles, workarounds, key results, and after-action improvement ideas encountered while implementing the issue.",
};
const resultsMeta = {
  id: "issue.implementation_notes.results",
  title: "Results",
  description:
    "One line description of the main artifacts delivered, outcomes achieved, or changes made in the course of implementation (e.g., new schemas, critical fixes, or infrastructure updates).",
  examples: [
    "Added RelationshipsSchema, ArtifactIdSchema (multi-letter initiatives), ArtifactMetadataSchema; sibling-type validator",
  ],
};
const tagsMeta = {
  id: "issue.implementation_notes.tags",
  title: "Tags",
  description:
    "Relevant keywords that categorize this implementation effort for search, trend analysis, or impact assessment. Common tags include system areas, methodologies, frameworks, or recurring problem themes.",
  examples: [
    ["core", "validation", "zod", "schemas", "actor", "event", "timestamps"],
  ],
};
const challengesMeta = {
  id: "issue.implementation_notes.challenges",
  title: "Challenges",
  description:
    "Specific hurdles, blockers, or complicated decisions encountered during implementation, along with any chosen solutions or rationales. Each entry pairs a challenge with its corresponding solution.",
  examples: [
    [
      {
        challenge:
          "Schema alone cannot know current artifact ID to enforce sibling rule",
        solution:
          "Expose validateSiblingIds(contextId) helper for caller-side checks",
      },
      {
        challenge: "Differentiate initiative prefixes (A vs AA)",
        solution:
          "Parse base-26 style prefix with /^[A-Z]+/ and compare exactly",
      },
    ],
  ],
};
const insightsMeta = {
  id: "issue.implementation_notes.insights",
  title: "Insights",
  description:
    "Key takeaways, best practices, or heuristics discovered during implementation that inform future work. Insights should help elevate the quality and reusability of similar artifacts.",
  examples: [
    [
      "Siblings must share the same initiative and artifact type (milestone↔milestone, issue↔issue)",
      "Validate priority and estimation against constants (PRIORITIES, ESTIMATION_SIZES) for actionable errors",
    ],
  ],
};

const issueImplementationNotesRegistry = z.registry<ArtifactFieldMeta>();
const ResultsSchema = z
  .string()
  .trim()
  .min(1)
  .register(z.globalRegistry, resultsMeta)
  .register(issueImplementationNotesRegistry, {
    ...resultsMeta,
    ui: { label: resultsMeta.title },
  });
const TagsSchema = z
  .array(
    z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: "tags must be kebab-case",
      })
      .min(1),
  )
  .min(1)
  .optional()
  .register(z.globalRegistry, tagsMeta)
  .register(issueImplementationNotesRegistry, {
    ...tagsMeta,
    ui: { label: tagsMeta.title },
  });
const ChallengesSchema = z
  .array(ChallengeSchema)
  .optional()
  .register(z.globalRegistry, challengesMeta)
  .register(issueImplementationNotesRegistry, {
    ...challengesMeta,
    ui: { label: challengesMeta.title },
  });
const InsightsSchema = z
  .array(z.string().trim().min(1))
  .optional()
  .register(z.globalRegistry, insightsMeta)
  .register(issueImplementationNotesRegistry, {
    ...insightsMeta,
    ui: { label: insightsMeta.title },
  });

export const IssueContentSchema = z
  .object({
    summary: SummarySchema,
    acceptance_criteria: AcceptanceCriteriaSchema,
  })
  .register(z.globalRegistry, issueContentMeta)
  .register(issueContentRegistry, {
    ...issueContentMeta,
    ui: { label: issueContentMeta.title },
  });

export const ImplementationNotesSchema = z
  .object({
    result: ResultsSchema,
    tags: TagsSchema,
    challenges: ChallengesSchema,
    insights: InsightsSchema,
  })
  .optional()
  .register(z.globalRegistry, implementationNotesMeta)
  .register(issueImplementationNotesRegistry, {
    ...implementationNotesMeta,
    ui: { label: implementationNotesMeta.title },
  });
