import z from "zod";
import {
  INITIATIVE_ID_REGEX,
  ISSUE_ID_REGEX,
  MILESTONE_ID_REGEX,
} from "../../constants.js";

export const artifactRegistry = z.registry();

export const CriteriaListSchema = z
  .array(z.string().trim().min(1))
  .min(1, { message: "At least one item is required" });

export const NotesSchema = z.union([
  z.string().trim().min(1),
  z.array(z.string().trim().min(1)).min(1),
]);

export const ChallengeSchema = z.object({
  challenge: z.string().trim().min(1),
  solution: z.string().trim().min(1),
});

export const ArtifactIdSchema = z
  .string()
  .refine(
    (s) =>
      INITIATIVE_ID_REGEX.test(s) ||
      MILESTONE_ID_REGEX.test(s) ||
      ISSUE_ID_REGEX.test(s),
    { message: "Invalid artifact ID format" },
  );

export type ArtifactFieldMeta = {
  id: string;
  title: string;
  description: string;
  examples?: unknown[];
  ui?: Record<string, unknown>;
  default?: unknown;
};
