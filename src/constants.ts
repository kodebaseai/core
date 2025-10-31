/**
 * Core constants and enums for Kodebase v1
 * - States, priorities, estimation sizes, artifact types
 * - Event triggers including parent_* and manual_cancel
 */

// Artifact lifecycle events (states)
export const CArtifactEvent = {
  DRAFT: "draft",
  READY: "ready",
  BLOCKED: "blocked",
  CANCELLED: "cancelled",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  COMPLETED: "completed",
  ARCHIVED: "archived",
} as const;
export type TArtifactEvent =
  (typeof CArtifactEvent)[keyof typeof CArtifactEvent];

// Event triggers (v1)
export const CEventTrigger = {
  ARTIFACT_CREATED: "artifact_created",
  DEPENDENCIES_MET: "dependencies_met",
  HAS_DEPENDENCIES: "has_dependencies",
  BRANCH_CREATED: "branch_created",
  PR_READY: "pr_ready",
  PR_MERGED: "pr_merged",
  DEPENDENCY_COMPLETED: "dependency_completed",
  CHILDREN_STARTED: "children_started",
  CHILDREN_COMPLETED: "children_completed",
  PARENT_COMPLETED: "parent_completed",
  PARENT_ARCHIVED: "parent_archived",
  MANUAL_CANCEL: "manual_cancel",
} as const;
export type TEventTrigger = (typeof CEventTrigger)[keyof typeof CEventTrigger];

// Priority levels
export const CPriority = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;
export type TPriority = (typeof CPriority)[keyof typeof CPriority];

// Estimation sizes (t-shirt)
export const CEstimationSize = {
  XS: "XS",
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
} as const;
export type TEstimationSize =
  (typeof CEstimationSize)[keyof typeof CEstimationSize];

// Artifact types
export const CArtifact = {
  INITIATIVE: "initiative",
  MILESTONE: "milestone",
  ISSUE: "issue",
} as const;
export type TArtifactType = (typeof CArtifact)[keyof typeof CArtifact];

// Convenience arrays
export const ARTIFACT_EVENTS = Object.values(CArtifactEvent);
export const EVENT_TRIGGERS = Object.values(CEventTrigger);
export const PRIORITIES = Object.values(CPriority);
export const ESTIMATION_SIZES = Object.values(CEstimationSize);
export const ARTIFACT_TYPES = Object.values(CArtifact);

// Human actor: "Full Name (email@domain.tld)"
export const HUMAN_ACTOR_REGEX =
  /^[^()]+\s\([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\)$/i;

// Simplified AI agent actors (v1):
// - agent.system
// - agent.cascade
// Optional tenant suffix: agent.<type>@<tenant>
export const AGENT_TYPES = ["system", "cascade"] as const;
export const SIMPLE_AGENT_REGEX = new RegExp(
  `^agent\\.(?:${AGENT_TYPES.join("|")})(?:@[a-z0-9-]+)?$`,
  "i",
);

// Artifact ID patterns
// Initiative IDs support base-26 style sequences: A..Z, AA..ZZ, AAA...
export const INITIATIVE_ID_REGEX = /^[A-Z]+$/;
export const MILESTONE_ID_REGEX = /^[A-Z]+\.\d+$/;
export const ISSUE_ID_REGEX = /^[A-Z]+\.\d+\.\d+$/;

// Strict ISO-8601 UTC timestamp (no milliseconds), e.g., 2025-10-28T19:37:00Z
export const ISO_UTC_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)Z$/;
