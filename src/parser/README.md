## Parser Module

This directory contains the artifact parsing utilities used by `@kodebase/core`.

- `artifact-parser.ts` exposes the public parsing helpers (`parseYaml`, `parseInitiative`, `parseMilestone`, `parseIssue`). They return `{ success: true, data }` or `{ success: false, error }` so callers can branch on the result without throwing.
- `artifact-parser.test.ts` unit-tests edge cases using synthetic inputs and mocked YAML parsing failures.
- `artifact-parser.fixtures.test.ts` loads golden fixtures from `packages/core/test/fixtures/artifacts` to ensure real-world YAML parses into the expected typed objects and that error payloads remain stable.

Fixtures are versioned alongside tests so tooling (CLI, IDE integrations) can rely on consistent parser behaviour. Any time you update public parsing logic, refresh or extend these tests first.

### Adding new fixtures

1. Place the YAML (and optional JSON expectation) under `packages/core/test/fixtures/artifacts/`.
2. Reference it via the `readFixture` / `readFixtureJson` helpers from `../test-utils/load-fixture.ts`.
3. Extend the fixture test with the new scenario.
