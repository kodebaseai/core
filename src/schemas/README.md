# Schemas

This folder contains the Zod-based schemas and registry wiring for
`@kodebase/core`:

- **`schemas.ts`** – initiative, milestone, and issue schema definitions with
  registry metadata.
- **`index.ts`** – export surface for consumers.
- **`registries/`** – field-level registries shared across artifact types.

Tests in `schemas.compose.test.ts` ensure the schemas compose as expected and
stay aligned with registry metadata. These definitions act as the single source
of truth for artifact parsing and validation.
