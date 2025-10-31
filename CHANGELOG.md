# @kodebase/core

## 0.1.1

### Patch Changes

- bump to 0.1.1

## 0.1.0

### Minor Changes

- [#33](https://github.com/kodebaseai/kodebase/pull/33) [`a600c91`](https://github.com/kodebaseai/kodebase/commit/a600c911decd5c635df0579d05dee532c0bfe44f) Thanks [@migcarva](https://github.com/migcarva)! - Core schema stack shipped with registry coverage and passing test suite, enabling downstream adoption work. (A.1)

- [#33](https://github.com/kodebaseai/kodebase/pull/33) [`a600c91`](https://github.com/kodebaseai/kodebase/commit/a600c911decd5c635df0579d05dee532c0bfe44f) Thanks [@migcarva](https://github.com/migcarva)! - Parser and validator stack shipped with actionable errors, fixtures, and docs ready for downstream tooling. (A.2)

- [#33](https://github.com/kodebaseai/kodebase/pull/33) [`a600c91`](https://github.com/kodebaseai/kodebase/commit/a600c911decd5c635df0579d05dee532c0bfe44f) Thanks [@migcarva](https://github.com/migcarva)! - Readiness validation now ensures relationships are sibling-only, cycle-free, cross-level safe, and reciprocal. (A.3)

- [#34](https://github.com/kodebaseai/kodebase/pull/34) [`b1594b0`](https://github.com/kodebaseai/kodebase/commit/b1594b0f76c7d23279bee023e308d5fd78dba24f) Thanks [@migcarva](https://github.com/migcarva)! - Add lifecycle state utilities and chronology validation in @kodebase/core:

  - State machine: `canTransition`, `getValidTransitions`, and `StateTransitionError` with tests and docs. (A.4.1)
  - Event ordering: `validateEventOrder` and `EventOrderError` enforcing first `draft` and non-decreasing timestamps, with tests. (A.4.2)

### Patch Changes

- [#37](https://github.com/kodebaseai/kodebase/pull/37) [`0c74355`](https://github.com/kodebaseai/kodebase/commit/0c743557763fa4ac6f7f9a9a2eaa59334ea4630a) Thanks [@migcarva](https://github.com/migcarva)! - Add state-machine transition sequence tests across artifact types, event-order fixture tests, and lifecycle YAML fixtures. Expand archived helper coverage. (A.4.4)
