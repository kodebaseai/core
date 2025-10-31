# Loading Utilities

Helper functions for working with artifact file paths live here.

- `artifact-paths.ts` – slug-tolerant regex + `getArtifactIdFromPath` helper
  used throughout the loader stack. Tests cover valid/invalid naming patterns.
- `artifact-loader.ts` – `loadAllArtifactPaths` recursively discovers artifact
  files, while `loadArtifactsByType` filters initiatives/milestones/issues based
  on ID segments. Tests mock the filesystem to exercise discovery rules.
