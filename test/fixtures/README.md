## Fixture Library

This directory contains the golden fixtures used by the parser and validator test suites.

- YAML files capture canonical artifact payloads (valid and invalid).
- JSON files record the expected data structures or error payloads produced by the parser/validator.

### Layout

```
artifacts/
  initiative.valid.yaml          # Valid initiative input
  initiative.valid.json          # Parsed output snapshot
  issue.invalid.missing-...yaml  # Invalid example
  issue.invalid...error.json     # Expected error payload
dependencies/
  valid-siblings.json            # Graph of sibling-only dependencies
  invalid-cross-level.json       # Graph illustrating cross-level violations
```

### Updating fixtures

1. Modify the YAML (and refresh the JSON snapshot if the parsed shape changes).
2. Run `pnpm --filter @kodebase/core test` to ensure the new fixtures are exercised.
3. Commit both YAML and JSON updates so goldens stay in sync with the parser/validator behaviour.
