# State Utilities

The state helpers centralise lifecycle logic for artifacts:

- **`state-machine.ts`** – legal transition maps plus helpers
  (`canTransition`, `getValidTransitions`, `assertTransition`).
- **`event-order.ts`** – chronological validation and error types for event
  sequences.
- **`event-builder.ts`** – canonical event constructor with explicit trigger
  enforcement and convenience creators for common flows.

Accompanying test files (`*.test.ts` and `event-order.fixtures.test.ts`) cover
transition rules, ordering guarantees, and builder behaviour. All utilities
exported from this folder are pure and ready for reuse across the CLI,
automation, and editor integrations.
