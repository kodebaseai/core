import z from "zod";
import {
  ImpactSummarySchema,
  InitiativeContentSchema,
} from "./registries/initiative-registry.js";
import {
  ImplementationNotesSchema,
  IssueContentSchema,
} from "./registries/issue-registry.js";
import { ArtifactMetadataSchema } from "./registries/metadata-registry.js";
import {
  DeliverySummarySchema,
  MilestoneContentSchema,
} from "./registries/milestone-registry.js";
import { artifactRegistry, NotesSchema } from "./registries/shared-registry.js";

// ------------------------------------------------------
// Issue Full Schema
// ------------------------------------------------------
const issueMeta = {
  id: "issue",
  title: "Issue Artifact",
  description: "Schema for atomic work units - focused on what matters",
};
export const IssueSchema = z
  .object({
    metadata: ArtifactMetadataSchema,
    content: IssueContentSchema,
    implementation_notes: ImplementationNotesSchema.optional(),
    notes: NotesSchema.optional(),
  })
  .register(z.globalRegistry, issueMeta)
  .register(artifactRegistry, {
    ...issueMeta,
    ui: { label: issueMeta.title },
  });

// ------------------------------------------------------
// Milestone Full Schema
// ------------------------------------------------------
const milestoneMeta = {
  id: "milestone",
  title: "Milestone Artifact",
  description: "Schema for milestone artifacts that group related issues",
};
export const MilestoneSchema = z
  .object({
    metadata: ArtifactMetadataSchema,
    content: MilestoneContentSchema,
    delivery_summary: DeliverySummarySchema.optional(),
    notes: NotesSchema.optional(),
  })
  .register(z.globalRegistry, milestoneMeta)
  .register(artifactRegistry, {
    ...milestoneMeta,
    ui: { label: milestoneMeta.title },
  });

// ------------------------------------------------------
// Initiative Full Schema
// ------------------------------------------------------
const initiativeMeta = {
  id: "initiative",
  title: "Initiative Artifact",
  description:
    "Schema for high-level initiatives driving business/technical strategical changes",
};
export const InitiativeSchema = z
  .object({
    metadata: ArtifactMetadataSchema,
    content: InitiativeContentSchema,
    notes: NotesSchema.optional(),
    impact_summary: ImpactSummarySchema.optional(),
  })
  .register(z.globalRegistry, initiativeMeta)
  .register(artifactRegistry, {
    ...initiativeMeta,
    ui: { label: initiativeMeta.title },
  });

export type TIssue = z.infer<typeof IssueSchema>;
export type TMilestone = z.infer<typeof MilestoneSchema>;
export type TInitiative = z.infer<typeof InitiativeSchema>;
