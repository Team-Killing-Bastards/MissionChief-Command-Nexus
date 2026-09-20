# Nexus Realism backend

This directory is the source-controlled Phase 1 backend for the Nexus Realism Map.

The implementation is a clean Nexus implementation using public OpenStreetMap data. It does not copy or depend on the GPL implementation code of Realism Location Marker.

## Production architecture

OpenStreetMap extract -> osm2pgsql Flex filter -> PostgreSQL/PostGIS -> Nexus collector API -> Phase 2 map client.

The live VPS stack uses PostgreSQL 16.15 with PostGIS 3.5.7 and keeps the Realism data in separate realism and osm_stage schemas.

## Source layout

- collector/realism.py — read-only FastAPI routes.
- sql/bootstrap.sql — one-time PostGIS/hstore/schema bootstrap.
- osm/nexus-emergency.lua — filtered OSM emergency-service extraction.
- osm/promote-realism.sql — transactional staging-to-clean promotion and classification.
- osm/import-great-britain.sh — tracked Great Britain refresh.
- osm/import-scotland.sh — smaller regional proof/import path.
- osm/validate-realism.sh — runtime validation suite.
- ROLLBACK.md — production rollback notes.

Large OSM PBF files, database dumps, credentials and live environment files are deliberately excluded from Git.

## Collector integration

The live collector copies collector/realism.py to app/realism.py and installs it from the existing app/main.py after the normal collector modules:

    from .realism import install_realism
    install_realism(app, engine)

The Realism module owns a dedicated two-connection read pool. Existing pairing and event ingestion remain on the collector's established pool.

## PostgreSQL image

The live postgres service uses:

    postgis/postgis:16-3.5-alpine

The persistent database bind mount remains unchanged. Run sql/bootstrap.sql against the nexus database after moving to the PostGIS image.

## API

GET /v1/realism/status

Returns dataset totals and latest import state.

GET /v1/realism/locations

Required query parameters: north, south, east, west.

Optional query parameters: types (comma-separated Nexus types), limit (1-5000, default 2000).

Viewport requests are bounded. Queries are read-only and use the PostGIS geometry index.

## Current Phase 1 live proof — 20 September 2026

The verified Great Britain import produced 6,726 physical locations and 6,729 service links. The difference is intentional: three verified locations carry multiple services.

Verified service totals:

- ambulance_station: 695
- coastguard_station: 14
- dispatch_centre: 2
- fire_station: 2,039
- hospital: 1,797
- lifeboat_station: 173
- mountain_rescue: 31
- police_station: 1,796
- prison: 182

The public status and viewport paths were verified through https://nexus.blyth.scot.

## Data rules

Classifiers are fail-closed. Generic words such as "dispatch" or "control centre" are not sufficient by themselves. Dispatch/control centres require emergency-service operator/tag evidence.

A physical location may have more than one Nexus service. Services therefore live in realism.location_services rather than on the location row itself.

The browser must not parse PBF data or make live Overpass calls for map movement. The VPS/PostGIS dataset is the Realism data authority for the Nexus client.
