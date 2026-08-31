# ADR-0004: Qualification-sensitive dispatch is fail-closed

**Status:** accepted  
**Date:** 2026-08-31  
**Introduced:** existing production contract

## Context

A vehicle label or seat count does not prove that the currently assigned crew hold the required MissionChief qualification. Dispatching on stale, partial or guessed evidence can leave missions unresolved and hide real staffing shortages.

## Decision

Qualification-sensitive demand is satisfied only by fresh, complete, exact-vehicle Personnel Register evidence that covers the required trained-personnel quantity. Missing, stale, incomplete or ambiguous evidence keeps Unit Finder/Mission Update not-ready and blocks Auto Mode before Dispatch.

Exact compatible vehicles with missing or stale evidence may enter the live verification pool so their assignment pages can create current evidence. The later selection/readiness gate remains authoritative and fail-closed.

## Locked consequences

- Correct vehicle type alone is insufficient.
- Display-name guessing is not authoritative.
- Aggregate shortages must not be silently treated as success.
- Diagnostic records must avoid personnel names while retaining vehicle/station evidence where available.

## Protection

Training-profile, live-verification, selection-readiness and no-dispatch-on-shortage regressions protect this decision.
