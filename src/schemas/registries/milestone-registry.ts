import * as z from "zod";
import {
  type ArtifactFieldMeta,
  CriteriaListSchema,
} from "./shared-registry.js";

// ------------------------------------------
// Milestone Content Schemas
// ------------------------------------------
const milestoneContentMeta = {
  id: "milestone.content",
  title: "Milestone Content",
  description:
    "Content for milestone artifact: summary, deliverables, optional validation criteria.",
};
const summaryMeta = {
  id: "milestone.content.summary",
  title: "Summary",
  description: "Clear overall goal or intent for the milestone.",
  examples: [
    "All registry-based schemas migrated and covered by tests.",
    "System reliably verifies sibling relationships on artifact reference.",
  ],
};
const deliverablesMeta = {
  id: "milestone.content.deliverables",
  title: "Deliverables",
  description:
    "Concrete outputs or tracked units that must exist when milestone is complete.",
  examples: [
    ["Registry Zod schema", "Migration doc", "Passing coverage in CI"],
    ["Refined constants", "Validator helpers"],
  ],
};
const validationMeta = {
  id: "milestone.content.validation",
  title: "Validation",
  description:
    "Optional specific acceptance or review requirements for success.",
  examples: [
    ["No deprecated files referenced", "Edge cases handled"],
    ["Backwards compatibility retained"],
  ],
};

const milestoneContentRegistry = z.registry<ArtifactFieldMeta>();
export const SummarySchema = z
  .string()
  .min(1)
  .register(z.globalRegistry, summaryMeta)
  .register(milestoneContentRegistry, {
    ...summaryMeta,
    ui: { label: summaryMeta.title },
  });
const DeliverablesSchema = CriteriaListSchema.register(
  z.globalRegistry,
  deliverablesMeta,
).register(milestoneContentRegistry, {
  ...deliverablesMeta,
  ui: { label: deliverablesMeta.title },
});
const ValidationSchema = CriteriaListSchema.optional()
  .register(z.globalRegistry, validationMeta)
  .register(milestoneContentRegistry, {
    ...validationMeta,
    ui: { label: validationMeta.title },
  });

// ------------------------------------------
// Delivery Summary Field Schemas (with registry)
// ------------------------------------------
const outcomeMeta = {
  id: "milestone.delivery_summary.outcome",
  title: "Outcome",
  description:
    "One-line summary of the main result or state at milestone completion.",
  examples: [
    "All targets delivered, with backward compatibility maintained.",
    "Event triggers integrated across artifact workflows.",
  ],
};
const deliveredMeta = {
  id: "milestone.delivery_summary.delivered",
  title: "Delivered Items",
  description: "List of concrete outputs completed as part of the milestone.",
  examples: [
    ["Migration scripts", "CI coverage report", "New artifact registry"],
  ],
};
const deviationsMeta = {
  id: "milestone.delivery_summary.deviations",
  title: "Deviations",
  description: "Areas where final delivery differed from plan, with rationale.",
  examples: [
    [
      "Next phase will incorporate legacy adapters",
      "Skipped optional refactor",
    ],
  ],
};
const nextMeta = {
  id: "milestone.delivery_summary.next",
  title: "Next Steps",
  description: "Clear directive for work to continue following this milestone.",
  examples: [
    "Start UI integration for all downstream projects.",
    "Draft documentation on new registry usage.",
  ],
};
const risksMeta = {
  id: "milestone.delivery_summary.risks",
  title: "Risks and Issues",
  description: "Any open issues, concerns, or risks that apply post-milestone.",
  examples: [
    ["Breakage if downstreams lag on migration", "Gaps in legacy coverage"],
  ],
};
const deliverySummaryMeta = {
  id: "milestone.delivery_summary",
  title: "Delivery Summary",
  description:
    "Concise report on what was delivered, outcomes, key deviations, next steps, and associated risks for this milestone.",
};

export const deliverySummaryRegistry = z.registry<ArtifactFieldMeta>();
const OutcomeSchema = z
  .string()
  .trim()
  .min(1)
  .register(z.globalRegistry, outcomeMeta)
  .register(deliverySummaryRegistry, {
    ...outcomeMeta,
    ui: { label: outcomeMeta.title },
  });
const DeliveredSchema = z
  .array(z.string().trim().min(1))
  .min(1)
  .register(z.globalRegistry, deliveredMeta)
  .register(deliverySummaryRegistry, {
    ...deliveredMeta,
    ui: { label: deliveredMeta.title },
  });
const DeviationsSchema = z
  .array(z.string().trim().min(1))
  .optional()
  .register(z.globalRegistry, deviationsMeta)
  .register(deliverySummaryRegistry, {
    ...deviationsMeta,
    ui: { label: deviationsMeta.title },
  });
const NextSchema = z
  .string()
  .trim()
  .min(1)
  .register(z.globalRegistry, nextMeta)
  .register(deliverySummaryRegistry, {
    ...nextMeta,
    ui: { label: nextMeta.title },
  });
const RisksSchema = z
  .array(z.string().trim().min(1))
  .optional()
  .register(z.globalRegistry, risksMeta)
  .register(deliverySummaryRegistry, {
    ...risksMeta,
    ui: { label: risksMeta.title },
  });

export const MilestoneContentSchema = z
  .object({
    summary: SummarySchema,
    deliverables: DeliverablesSchema,
    validation: ValidationSchema,
  })
  .register(z.globalRegistry, milestoneContentMeta)
  .register(milestoneContentRegistry, {
    ...milestoneContentMeta,
    ui: { label: milestoneContentMeta.title },
  });

export const DeliverySummarySchema = z
  .object({
    outcome: OutcomeSchema,
    delivered: DeliveredSchema,
    deviations: DeviationsSchema,
    next: NextSchema,
    risks: RisksSchema,
  })
  .register(z.globalRegistry, deliverySummaryMeta)
  .register(deliverySummaryRegistry, {
    ...deliverySummaryMeta,
    ui: { label: "Delivery Summary" },
  });
