# ADR-0006: Managed Worker A admission is terminal and wake recovery is role-aware

**Status:** accepted  
**Date:** 2026-08-31  
**Introduced:** Command Nexus 3.0.40

## Context

A 26-second browser scheduling delay interrupted a successfully cleared Worker B transport. Generic “sleep” recovery dismantled B and started A before the normal B-to-A completion path. The new A was then accepted as managed-active and immediately rejected by a secondary inactive-owner check.

## Decision

- Ordinary scheduling delays are not sleep: visible-page recovery requires at least 90 seconds; hidden-page recovery requires at least three minutes.
- When B is active, wake recovery force-checks the exact personal Radio request.
- A cleared request completes through the normal B-to-A function.
- A still-live request rebuilds the same exact B; mission A does not start.
- Radio first-seen ordering and bounded retry cooldowns survive recovery.
- The immutable parent-appointed managed Worker A frame identity is terminal positive authority before DOM body readiness, visible-primary ranking and execution-ownership checks.
- Managed-active and inactive-owner outcomes are mutually exclusive for the same bootstrap.

## Locked consequences

The generic wake path cannot bypass normal transport completion. A clean Worker A retry clears stale shared queue/opening and Auto Mode state while preserving the final-dispatch duplicate guard.

## Protection

`scripts/check-v3-role-aware-wake-recovery-v3040.mjs`, active-bootstrap recovery and transport-context recovery regressions protect this decision.
