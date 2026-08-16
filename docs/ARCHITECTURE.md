# Architecture

This document describes the architecture in the current MissionChief Command Nexus v1.0.125 production source and the direction for future consolidation.

> Source-code direction and final technical decisions remain with **MartyBlyth**, the project developer. Conroy1988 provides repository and documentation support only.

## Current architecture

The canonical distributable is a single userscript:

```text
src/missionchief-command-nexus.user.js
```

The canonical module baseline is Resource Administration `V4.2.8` and Mission Finder `V10.6.162`. The Resource Administration interfaces report Unit Naming `3.3.27`, Station Naming `1.3.22` and Personnel Assignment `1.3.11`. Exact release and component-version validation belongs to `scripts/validate-userscript.mjs`; behavioral regressions do not pin these numbers.

It contains one userscript metadata block, one outer installation guard and two retained runtime engines:

```text
MissionChief Command Nexus
│
├── Metadata and combined installation guard
│
├── Resource Administration Engine
│   ├── Unit naming
│   ├── Station naming
│   ├── Personnel assignment
│   ├── Training profiles
│   ├── Shared vehicle-training registry
│   ├── Reports and bounded logs
│   └── Registered lifecycle cleanup
│
└── Mission Operations Engine
    ├── Mission requirement parsing
    ├── Live Mission Update parsing
    ├── Patient and specialist-resource demand
    ├── Vehicle and trained-personnel matching
    ├── Unit Finder and manual controls
    ├── Auto Mode and dispatch
    ├── Queue continuation
    ├── Transport processing
    └── Mission logging and diagnostics
```

The source intentionally retains the established module guards and startup isolation. A startup failure in one engine is reported without automatically preventing the other engine from loading.

## What is genuinely shared

The most important current integration point is the vehicle-training registry. Personnel administration can record verified training capability against vehicle identity, and mission selection can use that information for qualification-sensitive requirements.

Qualification-sensitive dispatch is fail-closed. A candidate must have a fresh, complete, exact-vehicle Personnel Register entry, and the verified assigned training profiles must cover the real course quantity. Correct vehicle type or nominal seating capacity alone cannot satisfy the requirement. Unit Finder and Mission Update remain not-ready on missing, stale or partial evidence; Auto Mode stops before Dispatch.

Shared operational concerns also include:

- One public userscript name and version.
- One installation and distribution file.
- One outer duplicate-initialisation guard.
- Common MissionChief UK domain matching.
- Compatible local and session storage in the same browser context.
- Coordinated repository validation, release and documentation controls.

## What remains separate

The current merge is not yet a complete architectural rewrite. The retained engines still contain substantial independent state, UI, lifecycle and helper logic.

Known consolidation targets include:

- Launcher and navigation shell.
- Settings and storage schema.
- Observer, listener, interval and timeout registration.
- Page and mission execution ownership.
- Logging and diagnostics presentation.
- Reusable DOM utilities and visibility checks.
- Version and migration bookkeeping.
- Error and cancellation reporting.

These areas should not be unified through broad refactoring until existing behaviour is protected by repeatable tests.

## Runtime and lifecycle rules

Every new or modified subsystem should follow these rules:

1. Claim ownership of the relevant page or mission instance before acting.
2. Prevent duplicate initialization after MissionChief partial-page updates.
3. Scope DOM queries to the current visible mission or administration context.
4. Register deterministic cleanup for observers, listeners, intervals and timeouts.
5. Stop long-running work when navigation, cancellation or ownership changes occur.
6. Debounce or cache high-frequency DOM work.
7. Bound diagnostic output and persistent registries.
8. Avoid full-page polling where an event or scoped observer can provide the same signal.

## Storage and migration

The source currently retains versioned keys inherited from the established engines. Before changing storage behaviour:

- Inventory every localStorage and sessionStorage key.
- Record the owning engine and expected data shape.
- Identify keys that must remain backward compatible.
- Validate data before migration.
- Define precedence where both legacy scripts stored overlapping preferences.
- Keep recoverable legacy data through the documented support and rollback window.
- Never silently delete unknown or malformed user data.
- Increase the Command Nexus version when a migration ships.

The migration state is tracked in [MIGRATION.md](MIGRATION.md).

## Mission selection model

Mission selection must evaluate operational capability rather than vehicle labels alone. A candidate may need to satisfy:

- Required vehicle type or accepted substitute.
- Live availability and selection state.
- Required quantity after selected or responding units are reconciled.
- Required trained personnel.
- Specialist medical, police, railway, aviation or EOD capability.
- Patient count and transport demand.
- Current mission ownership and freshness.
- Queue and continuation state.

The live Mission Requirements panel should be treated as authoritative when present. Legacy alerts are fallback inputs and must not override a confirmed live still-needed value.

## Administrative safety model

Bulk station naming, unit naming and personnel assignment must retain:

- A disclosed and bounded scope.
- Preview where the workflow supports writes.
- Progress and active-operation state.
- Pause, resume and stop controls where applicable.
- Per-item success, skip and failure reporting.
- Verification after submitted changes.
- Separation of genuine training shortages from technical failures.

Medical Personnel Assignment keeps the standalone Critical Care path on its established exact type-5 engine. Ambulance Officer, HART, Tactical Command, SORT, Midwifery and Specialist Paramedic use the shared rule engine with exact vehicle types, academy keys, native seat targets and eligible medical building types. The all-Medical batch processes those specialists before its exact type-5 Critical Care tail, preserves existing assignments and performs fresh per-vehicle plus final station verification in Live mode.

### Police Unit Naming identity contract

Unit Naming uses MissionChief's native `vehicle_type_id` as the authority for
vehicle identity. The following UK Police purchase-page mappings were captured
from the live DOM on 13 August 2026 and are permanent unless new live evidence
shows that MissionChief has changed them:

| `vehicle_type_id` | Canonical MissionChief label | Naming code | Icon | Station class |
|---:|---|---|---|---|
| `13` | Armed Response Vehicle | `ARV` | 🚔🎯 | Police |
| `19` | Joint Response Unit | `JRU` | 🚔🚑 | Police |
| `24` | Traffic Car | `TC` | 🚔🚗 | Police |
| `52` | Firearms Personnel Carrier | `FPC` | 🚔🛡️ | Police |

Each mapping must remain available from both the Police selector and the
unfiltered All classes selector. The sanitized capture record is retained in
[issue #295 evidence](evidence/issue-295-police-unit-naming-ids.md).

### Town-only response location naming contract

MissionChief building type `22` uses a town-only station identity. Station
Naming must not append a vehicle role or a station sequence and must not depend
on the vehicle table. A response location in Kirkcaldy is therefore named
`KIRKCALDY` regardless of whether it currently houses an FO, AO, OTL or DSU.

Unit Naming owns the vehicle role and the only sequence used for these
locations. The expected outputs are `KIRKCALDY-FO-1`, `KIRKCALDY-AO-1`,
`KIRKCALDY-OTL-1`, and `KIRKCALDY-DSU-1`. This prevents duplicated role layers
such as `KIRKCALDY-FO1-FO-1`. Ordinary supported station types retain their
`TOWN-SERVICESEQUENCE` contract.

### Station address and sequence contract

Station Naming must prefer MissionChief's coordinate reverse-address endpoint
and preserve its structural separators before removing HTML. `<br>` elements
and meaningful line breaks separate address components; flattening them into
spaces can merge a locality and post town into one invalid station area. The
Move Building address field is a fallback because MissionChief may expose its
locality and post town as one space-delimited value. When that fallback repeats
the terminal post town, Station Naming retains the longest repeated terminal
phrase without shortening ordinary multi-word post towns.

Every generated ordinary station name must have a positive sequence. Existing
valid sequences are retained when unique. Unnumbered stations sharing a town
and service receive the first free positive numbers in processing order, while
duplicate existing numbers are separated deterministically. Station sequence
format remains directly attached to the service suffix (`ANSTRUTHER-FS1`), and
vehicle names retain the whole station name before their own type and sequence
(`ANSTRUTHER-FS1-ICCU-1`). Building type `22` is the deliberate town-only
exception; its sequence comes from Unit Naming.

### Recovery Unit Naming identity contract

Recovery Unit Naming uses the same native `vehicle_type_id` authority. Type
`105` is shown by the current MissionChief vehicle table as `Recovery Vehicle`,
but it preserves the established `FRV` callsign for compatibility. Type `106`
is the separate HGV class:

| `vehicle_type_id` | Live MissionChief label | Naming code | Icon | Station class |
|---:|---|---|---|---|
| `105` | Recovery Vehicle | `FRV` | 🛻 | Recovery |
| `106` | HGV Recovery Vehicle | `HGV` | 🚛 | Recovery |

Both mappings must remain available from the Recovery selector and the
unfiltered All classes selector. The legacy `Flatbed Recovery Vehicle` naming
alias remains valid so existing `FRV` callsign generation is not broken.

### Road Rail Unit Naming identity contract

The Road Rail Unit is the Fire service vehicle with native MissionChief
`vehicle_type_id` `107`. Unit Naming must expose its canonical `Road Rail Unit`
label with the `RRU` callsign and 🚒🚆 icon under Fire and All classes. It must
not be classified as Airfield, and it must remain separate from the type `59`
Coastguard Rope Rescue Unit despite the historical shared abbreviation.

### Search Dog Unit identity contract

MissionChief UK exposes Search Dog Unit (SAR) as native `vehicle_type_id` `102`
on both the mission vehicle checkbox and its containing type cell. Rescue Dog
and Search Dog Unit requirements must therefore use exact type `102` for fresh
selection and selected-unit verification. Police Dog and Dog Support Unit
wording remains separate from this SAR rule and continues to use its own exact
Police identity.

Unit Naming already maps type `102` to `Search Dog Unit SAR` with the `K9`
callsign. A permanent consistency regression prevents Mission Finder and Unit
Naming from drifting to different IDs. The sanitized native mission-row capture
is retained in [issue #300 evidence](evidence/issue-300-search-dog-vehicle-type.md).

## Target architecture

The long-term target is logical modularity without sacrificing a single-file userscript distribution:

```text
Source modules or clearly bounded sections
        ↓
Shared lifecycle, storage and diagnostics contracts
        ↓
One coherent Command Nexus interface
        ↓
Validated single-file userscript build
```

Potential source boundaries are:

```text
core/          bootstrap, ownership, lifecycle, storage, logging
mission/       requirements, patients, capabilities, selection, dispatch
resources/     stations, vehicles, personnel, training registry
ui/            shell, mission controls, administration controls, progress
reporting/     run reports, diagnostics, compatibility evidence
```

The repository may continue to publish one generated or maintained `.user.js` file. Splitting source files is not itself a goal; safer maintenance and verifiable behaviour are the goals.

## Distribution architecture

The authoritative source is the canonical userscript on trusted `main`. Approved publication follows:

```text
Focused source change
        ↓
Version increase and changelog
        ↓
Automated validation
        ↓
Live regression evidence
        ↓
MartyBlyth approval
        ↓
Approved pull-request merge to main
        ↓
Idempotent release-state reconciliation
        ↓
Matching tag, verified GitHub assets and Greasy Fork synchronization
        ↓
Single verified Discord delivery receipt
```

Repository-only changes keep the current userscript version. The release-state gate detects the already-complete version and must not create duplicate assets or notifications.

See [Developer Handoff](DEVELOPER_HANDOFF.md), [Testing Strategy](TESTING.md) and [Release Process](RELEASE_PROCESS.md).
