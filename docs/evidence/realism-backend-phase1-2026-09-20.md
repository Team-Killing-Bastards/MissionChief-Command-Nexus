# Realism Map Phase 1 VPS/PostGIS validation — 2026-09-20

## Scope

Sanitised production evidence for issue #421 and ADR-0008. No credentials, tokens, database passwords or private account data are included.

## Environment

- Existing MissionChief Nexus VPS stack.
- PostgreSQL 16.15.
- PostGIS 3.5.7.
- Existing collector remained behind Caddy at nexus.blyth.scot.
- OSM import used osm2pgsql 2.3.1 Flex output.
- Great Britain extract size observed on the VPS: approximately 2.1 GB.

## Observed Phase 1 results

The filtered Great Britain import completed successfully and promoted 6,726 physical locations.

The final service counts were:

- ambulance_station: 695
- coastguard_station: 14
- dispatch_centre: 2
- fire_station: 2,039
- hospital: 1,797
- lifeboat_station: 173
- mountain_rescue: 31
- police_station: 1,796
- prison: 182

There were 6,729 service links for 6,726 physical locations. The three extra service links were intentional verified multi-service sites:

- Ambulance and Fire Services Resources Centre — ambulance + fire.
- Lancaster Community Fire and Ambulance Station — ambulance + fire.
- North Bristol Operations Centre — ambulance + dispatch centre.

The strict Dispatch/Control Centre classifier returned two Great Britain records with supporting emergency-service evidence:

- National Maritime Operations Centre — HM Coastguard.
- North Bristol Operations Centre — South Western Ambulance Service/NHS.

Generic name-only Dispatch/Control matches were deliberately rejected.

## API verification

The following paths were verified locally and through the public Caddy route:

- /health
- /v1/realism/status
- /v1/realism/locations

A bounded Dunfermline viewport filtered to Fire/Ambulance returned the expected local records, including Dunfermline Fire Station.

The public status endpoint reported the latest Great Britain import as successful.

## Existing collector safety

After the PostGIS image change, full GB import, Realism module deployment and collector rebuild:

- PostgreSQL reported healthy.
- The collector remained up.
- /health returned status ok.
- Existing pairing/event ingestion code was not modified by the Realism module.

## Validation

The live validation script completed all seven checks and finished with:

    === Nexus Realism validation PASSED ===

## Limits

OpenStreetMap completeness and tagging quality vary. A missing Realism record is not proof that no real-world facility exists. Phase 3 matching must preserve confidence/manual-review concepts rather than treating OSM as perfect ground truth.
