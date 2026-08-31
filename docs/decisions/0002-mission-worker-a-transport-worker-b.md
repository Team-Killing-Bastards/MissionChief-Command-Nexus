# ADR-0002: Mission Worker A and Transport Worker B are separate serialized roles

**Status:** accepted  
**Date:** 2026-08-29  
**Introduced:** Command Nexus 3.0.35

## Context

Using one worker for mission dispatch and transport navigation repeatedly crossed document and ownership boundaries. A successful transport could return the same frame to a mission or additional-vehicle route, where a secondary ownership gate rejected the already-appointed worker.

## Decision

- `MISSION_A` owns mission requirements, complete vehicle loading, Unit Finder, trained-personnel checks, vehicle selection, Dispatch and mission queue progression.
- `TRANSPORT_B` owns one exact personal patient or prisoner transport.
- A is removed before B is created.
- B is removed before a fresh A is created.
- The two active roles never coexist.
- `PIPELINE_PRELOAD_COUNT` remains zero; B is not a dormant next-mission preload.

## Locked consequences

Worker A cannot select hospitals, cells or prisoner release. Worker B cannot run Unit Finder, mission Auto Mode, vehicle selection, Dispatch or mission queue progression. B cannot be promoted into A.

## Acceptable exceptions

A verified transport route accidentally reached by A is not handled by A. The parent controller converts the exact request into B ownership or removes the invalid A context fail-closed.

## Protection

The permanent Worker A/Worker B separation and route-handoff regressions must pass before release.
