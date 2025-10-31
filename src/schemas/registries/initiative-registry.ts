import * as z from "zod";
import {
  type ArtifactFieldMeta,
  CriteriaListSchema,
} from "./shared-registry.js";

// ------------------------------------------
// Initiative Content Schemas
// ------------------------------------------
const initiativeContentMeta = {
  id: "initiative.content",
  title: "Initiative Content",
  description: "Content composition for initiative: vision, scope, criteria.",
};
const visionMeta = {
  id: "initiative.content.vision",
  title: "Vision",
  description: "Overall vision statement guiding the initiative.",
  examples: [
    "All downstream projects import types from registry using canonical Zod schemas.",
    "Artifact workflow is event-driven and validated consistently.",
  ],
};
const scopeMeta = {
  id: "initiative.content.scope",
  title: "Scope",
  description:
    "Explicitly defines what is in/out of scope for this initiative.",
};
const inScopeMeta = {
  id: "initiative.content.scope.in",
  title: "In Scope",
  description: "Efforts, deliverables, or areas that are included.",
  examples: [
    ["Registry adoption", "Documentation gen"],
    ["Testing event triggers"],
  ],
};
const outOfScopeMeta = {
  id: "initiative.content.scope.out",
  title: "Out of Scope",
  description: "Key activities, features, or deliverables not to be included.",
  examples: [["Legacy file formats", "Retrofitting untestable flows"]],
};
const successCriteriaMeta = {
  id: "initiative.content.success_criteria",
  title: "Success Criteria",
  description: "Concrete, measurable criteria for initiative closure.",
  examples: [
    ["100% registry adoption", "All schemas export documented JSON"],
    ["Meta-driven UI generation possible"],
  ],
};

const initiativeContentRegistry = z.registry<ArtifactFieldMeta>();
const VisionSchema = z
  .string()
  .min(1)
  .register(z.globalRegistry, visionMeta)
  .register(initiativeContentRegistry, {
    ...visionMeta,
    ui: { label: visionMeta.title },
  });
const InScopeSchema = CriteriaListSchema.register(
  z.globalRegistry,
  inScopeMeta,
).register(initiativeContentRegistry, {
  ...inScopeMeta,
  ui: { label: inScopeMeta.title },
});
const OutOfScopeSchema = CriteriaListSchema.register(
  z.globalRegistry,
  outOfScopeMeta,
).register(initiativeContentRegistry, {
  ...outOfScopeMeta,
  ui: { label: outOfScopeMeta.title },
});
const ScopeSchema = z
  .object({
    in: InScopeSchema,
    out: OutOfScopeSchema,
  })
  .register(z.globalRegistry, scopeMeta)
  .register(initiativeContentRegistry, {
    ...scopeMeta,
    ui: { label: scopeMeta.title },
  });
const SuccessCriteriaSchema = CriteriaListSchema.register(
  z.globalRegistry,
  successCriteriaMeta,
).register(initiativeContentRegistry, {
  ...successCriteriaMeta,
  ui: { label: successCriteriaMeta.title },
});

// ------------------------------------------
// Impact Summary Field Schemas (with registry)
// ------------------------------------------
const impactSummaryMeta = {
  id: "initiative.impact_summary",
  title: "Impact Summary",
  description:
    "Summary of major business, technical, or process-level value created by this initiative, with supporting evidence and forward-looking next steps.",
};
const impactOutcomeMeta = {
  id: "initiative.impact_summary.outcome",
  title: "Outcome",
  description:
    "One line with the main benefit, realized change, or organizational impact resulting from this initiative.",
  examples: [
    "Every product now validates artifacts via canonical registry.",
    "All projects use schema-driven processes.",
  ],
};
const benefitsMeta = {
  id: "initiative.impact_summary.benefits",
  title: "Benefits",
  description:
    "Tangible or intangible improvements as evidenced by the initiative's completion.",
  examples: [
    [
      "Reduced onboarding time",
      "100% type safety in CI",
      "Accelerated feature delivery",
    ],
  ],
};
const evidenceMeta = {
  id: "initiative.impact_summary.evidence",
  title: "Evidence",
  description:
    "Quantitative/qualitative proof points, observations, or testimonials supporting each benefit.",
  examples: [
    [
      "Survey: onboarding went from weeks to days",
      "CI logs: 0 type errors post-migration",
    ],
  ],
};
const impactNextMeta = {
  id: "initiative.impact_summary.next",
  title: "Next Steps",
  description:
    "Actionable follow-ups or recommendations after initiative closes.",
  examples: [
    "Scale registry system org-wide.",
    "Present initiative learnings at engineering all-hands.",
  ],
};

export const impactSummaryRegistry = z.registry<ArtifactFieldMeta>();
const ImpactOutcomeSchema = z
  .string()
  .trim()
  .min(1)
  .register(z.globalRegistry, impactOutcomeMeta)
  .register(impactSummaryRegistry, {
    ...impactOutcomeMeta,
    ui: { label: impactOutcomeMeta.title },
  });
const BenefitsSchema = z
  .array(z.string().trim().min(1))
  .min(1)
  .register(z.globalRegistry, benefitsMeta)
  .register(impactSummaryRegistry, {
    ...benefitsMeta,
    ui: { label: benefitsMeta.title },
  });
const EvidenceSchema = z
  .array(z.string().trim().min(1))
  .optional()
  .register(z.globalRegistry, evidenceMeta)
  .register(impactSummaryRegistry, {
    ...evidenceMeta,
    ui: { label: evidenceMeta.title },
  });
const ImpactNextSchema = z
  .string()
  .trim()
  .min(1)
  .register(z.globalRegistry, impactNextMeta)
  .register(impactSummaryRegistry, {
    ...impactNextMeta,
    ui: { label: impactNextMeta.title },
  });

export const InitiativeContentSchema = z
  .object({
    vision: VisionSchema,
    scope: ScopeSchema,
    success_criteria: SuccessCriteriaSchema,
  })
  .register(z.globalRegistry, initiativeContentMeta)
  .register(initiativeContentRegistry, {
    ...initiativeContentMeta,
    ui: { label: initiativeContentMeta.title },
  });

export const ImpactSummarySchema = z
  .object({
    outcome: ImpactOutcomeSchema,
    benefits: BenefitsSchema,
    evidence: EvidenceSchema,
    next: ImpactNextSchema,
  })
  .register(z.globalRegistry, impactSummaryMeta)
  .register(impactSummaryRegistry, {
    ...impactSummaryMeta,
    ui: { label: impactSummaryMeta.title },
  });
