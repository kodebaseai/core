import * as z from "zod";
import {
  ARTIFACT_EVENTS,
  CArtifactEvent,
  CEstimationSize,
  CEventTrigger,
  CPriority,
  ESTIMATION_SIZES,
  EVENT_TRIGGERS,
  HUMAN_ACTOR_REGEX,
  PRIORITIES,
  SIMPLE_AGENT_REGEX,
} from "../../constants.js";
import {
  type ArtifactFieldMeta,
  ArtifactIdSchema,
  artifactRegistry,
} from "./shared-registry.js";

// ------------------------------------------
// Metadata Registry Setup
// ------------------------------------------
const titleMeta = {
  id: "artifact.metadata.title",
  title: "Title",
  description: "Human-readable title of the artifact (3-100 chars)",
  examples: [
    "Update Artifact Schemas and Templates",
    "Implement Email Validation",
    "Fix Login Bug on Mobile",
  ],
};
const priorityMeta = {
  id: "artifact.metadata.priority",
  title: "Priority",
  description: "Priority level - use your judgment, not everything is critical",
  examples: PRIORITIES,
};
const estimationMeta = {
  id: "artifact.metadata.estimation",
  title: "Estimation",
  description: "T-shirt size estimation (err on the side of smaller tasks)",
  examples: ESTIMATION_SIZES,
};
const actorMeta = {
  id: "artifact.metadata.actor",
  title: "Actor (any)",
  description: "Actor/agent for actions — human or system.",
  examples: [
    "Jane Smith (jane@example.com)",
    "agent.cascade@acme",
    "agent.system",
  ],
};
const createdByMeta = {
  id: "artifact.metadata.created_by",
  title: "Created by",
  description:
    "Creator in format 'Name (email)' or a agent reference in format 'agent.cascade@acme' or 'agent.cascade'",
  examples: [
    "Jane Smith (jane@example.com)",
    "agent.cascade@acme",
    "agent.system",
  ],
};
const assigneeMeta = {
  id: "artifact.metadata.assignee",
  title: "Assignee",
  description: "Assignee in format 'Name (email)'",
  examples: [
    "Jane Smith (jane@example.com)",
    "agent.cascade@acme",
    "agent.system",
  ],
};
const schemaVersionMeta = {
  id: "artifact.metadata.schema_version",
  title: "Schema version",
  description: "Version of this schema",
};

export const metadataRegistry = z.registry<ArtifactFieldMeta>();
export const TitleSchema = z
  .string()
  .min(3)
  .max(100)
  .register(z.globalRegistry, titleMeta)
  .register(metadataRegistry, {
    ...titleMeta,
    ui: { label: titleMeta.title },
  });
export const PrioritySchema = z
  .string()
  .refine((v) => (PRIORITIES as readonly string[]).includes(v), {
    message: `Invalid priority. Allowed: ${PRIORITIES.join(", ")}`,
  })
  .default(CPriority.MEDIUM)
  .register(z.globalRegistry, priorityMeta)
  .register(metadataRegistry, {
    ...priorityMeta,
    ui: { label: priorityMeta.title },
    default: CPriority.MEDIUM,
  });
export const EstimationSchema = z
  .string()
  .refine((v) => (ESTIMATION_SIZES as readonly string[]).includes(v), {
    message: `Invalid estimation size. Allowed: ${ESTIMATION_SIZES.join(", ")}`,
  })
  .default(CEstimationSize.S)
  .register(z.globalRegistry, estimationMeta)
  .register(metadataRegistry, {
    ...estimationMeta,
    ui: { label: estimationMeta.title },
    default: CEstimationSize.S,
  });
export const ActorSchema = z
  .string()
  .trim()
  .refine((s) => HUMAN_ACTOR_REGEX.test(s) || SIMPLE_AGENT_REGEX.test(s), {
    message:
      "Invalid actor. Use 'Name (email@domain)' or 'agent.system|agent.cascade' (optionally '@tenant')",
  })
  .register(z.globalRegistry, actorMeta)
  .register(metadataRegistry, actorMeta);
export const CreatedBySchema = ActorSchema.register(
  z.globalRegistry,
  createdByMeta,
).register(metadataRegistry, {
  ...createdByMeta,
  ui: { placeholder: "Name (email)", label: createdByMeta.title },
});
export const AssigneeSchema = ActorSchema.register(
  z.globalRegistry,
  assigneeMeta,
).register(metadataRegistry, {
  ...assigneeMeta,
  ui: { placeholder: "Name (email)", label: assigneeMeta.title },
});
export const SchemaVersionSchema = z
  .string()
  .default("0.0.1")
  .register(z.globalRegistry, schemaVersionMeta)
  .register(metadataRegistry, {
    ...schemaVersionMeta,
    ui: { placeholder: "0.0.1", label: schemaVersionMeta.title },
    default: "0.0.1",
  });

// ------------------------
// Relationships (with sub-field registration)
// ------------------------

const blocksMeta = {
  id: "artifact.metadata.relationships.blocks",
  title: "Blocks",
  description: "IDs of artifacts that depend on this one completing",
  examples: [
    ["A.1", "A.2"],
    ["AB.1.1", "AB.1.2"],
  ],
};
const blockedByMeta = {
  id: "artifact.metadata.relationships.blocked_by",
  title: "Blocked by",
  description: "IDs of artifacts that must complete before this can start",
  examples: [
    ["A.1", "A.2"],
    ["AB.1.1", "AB.1.2"],
  ],
};
const relationshipsMeta = {
  id: "artifact.metadata.relationships",
  title: "Relationships",
  description:
    "Dependencies between artifacts (optional - start empty, fill as needed)",
};

export const relationshipsRegistry = z.registry<ArtifactFieldMeta>();
export const BlocksSchema = z
  .array(ArtifactIdSchema)
  .default([])
  .register(z.globalRegistry, blocksMeta)
  .register(relationshipsRegistry, {
    ...blocksMeta,
    ui: { label: blocksMeta.title },
    default: [],
  });
export const BlockedBySchema = z
  .array(ArtifactIdSchema)
  .default([])
  .register(z.globalRegistry, blockedByMeta)
  .register(relationshipsRegistry, {
    ...blockedByMeta,
    ui: { label: blockedByMeta.title },
    default: [],
  });
export const RelationshipsSchema = z
  .object({
    blocks: BlocksSchema,
    blocked_by: BlockedBySchema,
  })
  .register(z.globalRegistry, relationshipsMeta)
  .register(relationshipsRegistry, {
    ...relationshipsMeta,
    ui: { label: relationshipsMeta.title },
  });

// ------------------------
// Events (with sub-fields and registry)
// ------------------------

const eventTypeMeta = {
  id: "event.type",
  title: "Event type",
  description: "State transition type",
  examples: ARTIFACT_EVENTS,
};
const eventActorMeta = {
  id: "event.actor",
  title: "Event Actor",
  description: "Who triggered this event (Name (email) format or agent)",
  examples: ["Miguel Carvalho (miguel@kodebase.ai)", "agent.system"],
};
const timestampMeta = {
  id: "event.timestamp",
  title: "Event timestamp",
  description: "ISO 8601 timestamp (YYYY-MM-DDTHH:MM:SSZ)",
  examples: ["2025-10-29T18:10:40Z"],
};
const eventTriggerMeta = {
  id: "event.trigger",
  title: "Event trigger",
  description: "How the event was triggered - usually by some automation",
  examples: EVENT_TRIGGERS,
};
const eventMetadataMeta = {
  id: "event.metadata",
  title: "Event metadata",
  description: "Optional context for special events",
};
const eventMeta = {
  id: "event",
  title: "Single Event",
  description: "Single state transition tracked in artifact history",
};
const eventsMeta = {
  id: "artifact.metadata.events",
  title: "Events",
  description:
    "Event log tracking artifact lifecycle (automation handles most entries)",
};

export const eventRegistry = z.registry<ArtifactFieldMeta>();
export const EventTypeSchema = z
  .string()
  .refine((v) => (ARTIFACT_EVENTS as readonly string[]).includes(v), {
    message: `Invalid event. Allowed: ${Object.values(CArtifactEvent).join(", ")}`,
  })
  .default(CArtifactEvent.DRAFT)
  .register(z.globalRegistry, eventTypeMeta)
  .register(eventRegistry, {
    ...eventTypeMeta,
    ui: { label: eventTypeMeta.title },
    default: CArtifactEvent.DRAFT,
  });
export const EventActorSchema = ActorSchema.register(
  z.globalRegistry,
  eventActorMeta,
).register(eventRegistry, {
  ...eventActorMeta,
  ui: { label: eventActorMeta.title },
});
export const TimestampSchema = z
  .string()
  .regex(/^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)Z$/, {
    message:
      "Timestamp must be ISO-8601 UTC ending with 'Z' (YYYY-MM-DDTHH:MM:SSZ)",
  })
  .register(z.globalRegistry, timestampMeta)
  .register(eventRegistry, {
    ...timestampMeta,
    ui: { label: timestampMeta.title },
  });
export const EventTriggerSchema = z
  .string()
  .refine((v) => (EVENT_TRIGGERS as readonly string[]).includes(v), {
    message: `Invalid trigger. Allowed: ${Object.values(CEventTrigger).join(", ")}`,
  })
  .register(z.globalRegistry, eventTriggerMeta)
  .register(eventRegistry, {
    ...eventTriggerMeta,
    ui: { label: eventTriggerMeta.title },
  });
export const EventMetadataSchema = z
  .record(z.string(), z.any())
  .optional()
  .register(z.globalRegistry, eventMetadataMeta)
  .register(eventRegistry, {
    ...eventMetadataMeta,
    ui: { label: eventMetadataMeta.title },
  });
export const EventSchema = z
  .object({
    event: EventTypeSchema,
    timestamp: TimestampSchema,
    actor: EventActorSchema,
    trigger: EventTriggerSchema,
    metadata: EventMetadataSchema,
  })
  .register(z.globalRegistry, eventMeta)
  .register(eventRegistry, {
    ...eventMeta,
    ui: { label: eventMeta.title },
  });
export const EventsSchema = z
  .array(EventSchema)
  .min(1, { message: "At least one event required" })
  .register(z.globalRegistry, eventsMeta)
  .register(eventRegistry, {
    ...eventsMeta,
    ui: { label: eventsMeta.title },
  });

// ------------------------
// Main ArtifactMetadata Compound Schema
// ------------------------
const artifactMetadataMeta = {
  id: "artifact.metadata",
  title: "Artifact Metadata",
  description:
    "Common metadata structure for all Kodebase artifacts - streamlined for productivity",
};

export const ArtifactMetadataSchema = z
  .object({
    title: TitleSchema,
    priority: PrioritySchema,
    estimation: EstimationSchema,
    created_by: CreatedBySchema,
    assignee: AssigneeSchema,
    schema_version: SchemaVersionSchema,
    relationships: RelationshipsSchema,
    events: EventsSchema,
  })
  .register(z.globalRegistry, artifactMetadataMeta)
  .register(artifactRegistry, {
    ...artifactMetadataMeta,
    ui: { label: artifactMetadataMeta.title },
  });

export type TArtifactMetadata = z.infer<typeof ArtifactMetadataSchema>;
// Each schema and registry is exported for docs/consumers
