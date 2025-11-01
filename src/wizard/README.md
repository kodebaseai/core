# Wizard Support Helpers

UI-agnostic helpers for bootstrapping artifacts and managing the `.kodebase/artifacts` layout.

- `artifact-layout.ts` – `ensureArtifactsLayout` creates the artifacts directory structure
  idempotently, and `resolveArtifactPaths` resolves canonical directory and file paths for
  any artifact ID with optional slug support. For issues, automatically looks up the parent
  milestone directory using the loader stack.

These utilities power the `kodebase add` command wizard and can be used by IDE extensions
or other tooling that needs to create artifacts programmatically.
