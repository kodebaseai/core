# @kodebase/core

[![npm version](https://img.shields.io/npm/v/@kodebase/core.svg?style=flat-square)](https://www.npmjs.com/package/@kodebase/core)
[![npm downloads](https://img.shields.io/npm/dm/@kodebase/core.svg?style=flat-square)](https://www.npmjs.com/package/@kodebase/core)
[![CI status](https://img.shields.io/github/actions/workflow/status/kodebaseai/kodebase/ci.yml?branch=main&style=flat-square)](https://github.com/kodebaseai/kodebase/actions)

Core validation primitives for the Kodebase monorepo. This package exposes the
canonical constants, registries, schemas, and helpers that power every other
Kodebase artifact workflow.

## Installation

```bash
pnpm add @kodebase/core
# or
npm install @kodebase/core
# or
yarn add @kodebase/core
```

## What lives here?

- `src/constants.ts` &mdash; lifecycle events, triggers, priorities, and other
  enumerations shared across services.
- `src/schemas/registries` &mdash; modular Zod registries for metadata, shared
  helpers, and artifact-specific content.
- `src/schemas/schemas.ts` &mdash; composed Initiative, Milestone, and Issue
  schemas built on top of the registries.
- `src/parser` &mdash; parser implementation plus unit and fixture tests that
  validate real-world YAML inputs against golden outputs.
- `src/validator` &mdash; validation orchestration, error formatting, and the
  associated fixture-backed tests.
- `src/state` &mdash; state machine utilities (`canTransition`, `getValidTransitions`,
  and `StateTransitionError`) for artifact lifecycle transitions. Includes the
  event builder (`createEvent`, `createDraftEvent`, `createReadyEvent`) which
  requires an explicit `trigger` and emits ISO UTC timestamps.
- `src/test-utils` &mdash; shared helpers (for example, fixture loaders) used
  across the parser and validator suites.

## Quick start

```ts
import {
  CArtifact,
  CArtifactEvent,
  createDraftEvent,
  validateArtifact,
  canTransition,
  assertTransition,
} from "@kodebase/core";

// Parse + validate an artifact payload (YAML or object)
const { data } = validateArtifact(
  `metadata:
    title: Demo
    priority: high
    estimation: S
    created_by: "Ada Lovelace (ada@example.com)"
    assignee: "Grace Hopper (grace@example.com)"
    schema_version: "0.0.1"
    relationships:
      blocks: []
      blocked_by: []
    events:
      - event: draft
        timestamp: "2025-10-31T14:37:00Z"
        actor: "Ada Lovelace (ada@example.com)"
        trigger: artifact_created
content:
  summary: Demo issue
  acceptance_criteria: ["It works"]
`
);

// Generate new lifecycle events with audited triggers
const draft = createDraftEvent("Ada Lovelace (ada@example.com)");

// Guard transitions across initiatives/milestones/issues
if (canTransition(CArtifact.ISSUE, draft.event, CArtifactEvent.READY)) {
  assertTransition(CArtifact.ISSUE, draft.event, CArtifactEvent.READY);
}
```

## Running the tests

```bash
pnpm --filter @kodebase/core test
```

Vitest is configured with Istanbul coverage. Running the command above prints a
coverage table (and writes `packages/coverage.json`) to ensure the core surface
remains fully exercised.

## When to depend on @kodebase/core

- Validating artifact documents (Initiatives, Milestones, Issues) before they
  are persisted or published.
- Parsing `.yml` artifacts into typed data structures that downstream tools can
  consume safely.
- Auto-detecting artifact types and validating them with readable error
  messages.
- Importing canonical constants for UI dropdowns or automation triggers.
- Generating UI metadata by reading the registry entries registered with `z`
  and the local `artifactRegistry`.

If you need to extend schemas, prefer composing new registries rather than
modifying the exported ones directly. Open an issue or proposal before breaking
changes that affect downstream packages.
