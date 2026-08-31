# ADR-0001: Durable project records and authority order

**Status:** accepted  
**Date:** 2026-08-31  
**Decision owner:** MartyBlyth

## Context

The project has accumulated source code, release records, long diagnostic exports, historical handovers, a connected Google Memory Bank and conversation summaries. Treating all of them as equal “memory” makes it easy to reintroduce retired behaviour or mistake a historical diagnostic for current production truth.

## Decision

Use a strict authority order:

1. The canonical userscript on trusted `main`, matching tag and verified release artifacts define implemented production behaviour.
2. `project-state.json` is the machine-readable current operating index.
3. Accepted ADRs explain the current locked decisions and their reasons.
4. `docs/PROJECT_STATE.md` is generated from `project-state.json` for human reading.
5. Sanitised evidence summaries support claims but do not become current state.
6. The Google Memory Bank and conversation memory provide navigation and history only.

`docs/PROJECT_STATE.md` must never be hand-edited. Current state changes begin in `project-state.json`, are rendered with `scripts/render-project-state.mjs`, and are validated with `scripts/check-project-state.mjs`.

## Locked consequences

- A historical handover or diagnostic cannot silently override current source or project state.
- Raw diagnostics are not copied wholesale into the current-state record.
- Release completion updates the repository state first, then writes a concise verified pointer to the connected Memory Bank.
- Source candidates may use `canonical.status = candidate`; public production remains separately recorded until publication is verified.
- Accepted decisions are superseded by a new ADR rather than rewritten.

## Validation

- `scripts/check-project-state.mjs`
- `scripts/render-project-state.mjs --check`
- Repository Quality runs the state validator on every pull request and `main` push.
