# Cascade Automation

This directory contains the cascade engine primitives used by
`@kodebase/core`.

- **`engine.ts`** exposes helpers for:
  - recommending parent state transitions (`shouldCascadeToParent`)
  - generating parent-facing cascade events (`generateCascadeEvent`)
  - resolving dependency metadata (`resolveDependencyCompletion`)
  - guarding cancellation when children have already completed
    (`evaluateParentCancellation`)
- **`engine.test.ts`** provides coverage for all of the above flows across
  issue → milestone → initiative hierarchies, dependency scenarios, archival
  cascades, and cancellation edge cases.

These helpers are intentionally side-effect free so they can be reused by CLI
automation, editors, and background services without mutating child artifacts
directly.
