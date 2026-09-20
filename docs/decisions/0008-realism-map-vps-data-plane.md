# ADR-0008: VPS-backed PostGIS is the Realism Map data authority

**Status:** accepted  
**Date:** 2026-09-20  
**Introduced in:** Realism Map Phase 1

## Context

The Nexus Realism Map needs real-world emergency-service locations without making each browser download and parse OpenStreetMap data or repeatedly call public Overpass infrastructure.

The reference Realism Location Marker project is GPL-licensed and its current GitHub repository primarily loads runtime code from its own service. Nexus remains MIT-licensed, so its Realism implementation must be independently implemented and must not copy GPL implementation code.

## Decision

The Nexus VPS is the authoritative data plane for the Realism Map client.

OpenStreetMap regional extracts are filtered server-side with osm2pgsql Flex output, promoted into dedicated PostgreSQL/PostGIS tables, and served to Nexus through bounded read-only collector endpoints.

The browser client must request only the visible map viewport and service types from the Nexus API. It must not parse PBF data or make live Overpass queries for routine map movement.

The Realism schemas remain isolated from existing collector ingestion tables. A physical location may carry multiple Nexus services through a separate location_services relation.

Classifiers fail closed. Ambiguous name-only matches, especially Dispatch/Control Centre wording, are not enough without emergency-service operator or tag evidence.

## Locked consequences

- PostgreSQL 16 uses the PostGIS image while Realism/PostGIS objects are required.
- Public Realism routes are read-only and spatially bounded.
- Raw OSM staging data lives in osm_stage; clean client-facing data lives in realism.
- The collector Realism module owns a small dedicated read pool and does not take ownership of pairing/event ingestion.
- OSM extracts, database dumps, credentials and environment files are runtime data and must not be committed.
- Multi-service sites are represented as one physical location with multiple service links.
- Phase 2 must preserve the existing Worker A / Transport Worker B runtime contracts.

## Evidence

See docs/evidence/realism-backend-phase1-2026-09-20.md and issue #421.

## Exceptions

A future ADR may change the geographic source or backend storage model, but it must preserve a bounded server-side data plane or explicitly document why browser-side bulk geographic processing is safe.
