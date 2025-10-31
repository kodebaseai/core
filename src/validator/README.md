## Validator Module

This folder houses the runtime validators for artifact data along with the error-formatting helpers.

- `artifact-validator.ts` wraps the parser helpers and schema objects so callers can validate initiatives, milestones, and issues. It surfaces a typed `ArtifactValidationError` that includes `kind` and the formatted issue list.
- `artifact-validator.test.ts` covers logic-specific edge cases (type detection, custom errors, interop with the parser).
- `artifact-validator.fixtures.test.ts` consumes the shared fixtures to assert that real artifacts validate successfully and that broken fixtures produce the expected error responses.
- `error-formatter.ts` centralises how Zod errors are translated into path/reason/suggestion triples. Its tests (`error-formatter.test.ts`) exercise every branch so messaging stays consistent.

### Working with fixtures

Fixtures live under `packages/core/test/fixtures/artifacts`. Use the helpers in `../test-utils/load-fixture.ts` to load them; keep YAML/JSON goldens in sync whenever validation logic changes so downstream tools retain predictable output.
