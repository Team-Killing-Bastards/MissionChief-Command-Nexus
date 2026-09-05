# Architecture Decision Register

This directory records decisions that future work must understand before changing protected behaviour. The current accepted set is indexed by [`project-state.json`](../../project-state.json) and rendered in [`PROJECT_STATE.md`](../PROJECT_STATE.md).

## Status rules

- **proposed** — under review; not yet a locked operating contract.
- **accepted** — current and protected by source, tests, project state or all three.
- **superseded** — historical; the replacement ADR must be named explicitly.

Do not rewrite an accepted ADR to pretend a later design was always present. Add a new ADR and mark the old one superseded.

## Accepted decisions

1. [ADR-0001: Durable project records and authority order](0001-project-record-authority.md)
2. [ADR-0002: Mission Worker A and Transport Worker B are separate serialized roles](0002-mission-worker-a-transport-worker-b.md)
3. [ADR-0003: Only exact personal Radio transport enters Worker B](0003-personal-transport-queue-scope.md)
4. [ADR-0004: Qualification-sensitive dispatch is fail-closed](0004-trained-personnel-fail-closed.md)
5. [ADR-0005: Prisoner release routes are terminal results](0005-prisoner-release-terminal-routes.md)
6. [ADR-0006: Managed Worker A admission is terminal and wake recovery is role-aware](0006-managed-worker-admission-and-wake-recovery.md)

## Adding a decision

Use the next four-digit number and include: status, date, context, decision, locked consequences, acceptable exceptions, regression/evidence references and supersession details where relevant. Update `project-state.json`, regenerate `docs/PROJECT_STATE.md`, and run `node scripts/check-project-state.mjs`.

7. [ADR-0007: Independent verified Edge Store delivery](0007-edge-store-release.md)
