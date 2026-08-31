# ADR-0005: Prisoner release routes are terminal results

**Status:** accepted  
**Date:** 2026-08-30  
**Introduced:** Command Nexus 3.0.39

## Context

MissionChief can return `/missions/{id}/gefangene/entlassen` as a 404-style page while also presenting proof that prisoner release succeeded. Treating that URL as a normal mission caused Mission Finder bootstrap, clean retry and resume persistence to replay a terminal result page.

## Decision

`/missions/{id}/gefangene/entlassen` is a terminal prisoner-release result, never a reusable mission document. Success evidence completes the prisoner flow immediately. When the result is ambiguous, the controller waits only for the bounded terminal evidence window, then removes the worker and continues fail-closed.

## Locked consequences

The terminal URL cannot become `currentMissionUrl`, `bootstrapMissionUrl`, stored resume state or a clean-retry target. Mission Finder, Unit Finder, Auto Mode discovery and Dispatch never start on that route. Recovery canonicalises to `/missions/{id}` or another actionable mission.

## Protection

The prisoner-release terminal-route regression must prove no terminal URL persistence, replay or Auto Mode lookup.
