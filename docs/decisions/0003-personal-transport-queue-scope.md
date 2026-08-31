# ADR-0003: Only exact personal Radio transport enters Worker B

**Status:** accepted  
**Date:** 2026-08-29  
**Introduced:** Command Nexus 3.0.35

## Context

A generic mission message such as “Transport is needed” is not enough to prove which vehicle and mission own the action. Alliance rows also appear in Radio and must never be handled as personal work.

## Decision

Worker B may start only from a currently verified personal Radio request containing an exact request key, vehicle ID and mission ID. Requests are handled oldest-first using retained first-seen time. The request is revalidated immediately before B starts and again when recovery chooses between completing or rebuilding B.

## Locked consequences

- Alliance Radio transport is excluded.
- Stale or manually cleared requests do not create B.
- One B handles one request at a time.
- Missing or conflicting identity evidence fails closed.
- Normal mission position does not determine transport priority.

## Protection

Transport fairness, Alliance exclusion, exact-identity and role-aware wake-recovery regressions protect this decision.
