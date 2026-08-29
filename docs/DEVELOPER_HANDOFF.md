# Developer Handoff

This is the first document to read when resuming MissionChief Command Nexus development.

**Developer and technical owner:** MartyBlyth  
**Repository and documentation support:** Conroy1988

## Current verified baseline

| Item | Current state |
|---|---|
| Repository | `Team-Killing-Bastards/MissionChief-Command-Nexus` |
| Default branch | `main` |
| Canonical userscript | `src/missionchief-command-nexus.user.js` |
| Command Nexus version | `3.0.30` |
| Mission Finder baseline | `V10.6.177` |
| Resource Administration module | `V4.2.8` |
| Unit / Station / Personnel UI versions | `3.3.27` / `1.3.22` / `1.3.12` |
| Userscript author metadata | `MartyBlyth` |
| MissionChief domains | `www.missionchief.co.uk` and `police.missionchief.co.uk` |
| Distribution source | Canonical userscript on trusted `main` |
| Automated validation | Syntax, canonical versions, repository integrity and the complete permanent regression suite |
| Release delivery | Reconciled GitHub Release assets, Greasy Fork synchronization and one verified Discord receipt per version |

The repository contains one installable userscript. The Resource Administration and Mission Operations engines share one metadata block and outer installation guard while retaining isolated startup boundaries.

## Current implementation shape

```text
MissionChief Command Nexus
├── Resource Administration Engine
│   ├── Unit and station naming
│   ├── Personnel assignment
│   ├── Training profiles
│   └── Shared vehicle-training registry
└── Mission Operations Engine
    ├── Requirement and patient parsing
    ├── Unit Finder and Mission Update
    ├── Qualification-aware selection
    ├── Auto Mode and dispatch
    └── Queue and transport continuation
```

The single-file shape is deliberate. Logical consolidation may continue, but established behavior must remain protected by executable regressions before structural refactoring.

## What is already complete

- One canonical `.user.js` source and one metadata block are published from `main`.
- Duplicate-initialisation protection and independent engine startup isolation are retained.
- Unit Naming, Station Naming and Personnel Assignment use background native forms instead of opening every resource page.
- Medical Personnel Assignment provides live exact Ambulance Officer, HART, Tactical Command, SORT, Midwifery and Specialist Paramedic profiles plus a specialist-first batch; the established standalone Critical Care engine remains unchanged.
- Fire/Airfield and SAR/Coastguard Personnel Assignment profiles are live with exact UK mappings. Trailer and pod profiles resolve the actual tractor through the station vehicle API, ambiguous relationships fail closed, and full-service batches merge overlapping qualifications onto one crew.
- Mission requirements, selected and en-route reconciliation, trained-personnel capability, dispatch, Auto Mode and transport continuation are implemented.
- A visible mission opened with Auto Mode stopped mounts the manual controls without expanding MissionChief's complete vehicle list. Unit Finder, Mission Update and Ally Steal retain explicit on-demand loading before they inspect or select vehicles.
- Confirmed Auto Mode cancels pending discovery. A stale discovery callback on a patient/prisoner vehicle route exits to the watcher. A completed mission's one-use `/alarm` 404 worker is discarded before discovery, with the final-dispatch latch preserved and a fresh canonical mission selected. A missing mount gets one clean A-only retry after a 900 ms worker-free gap, and bounded startup milestones/errors are retained before teardown so a repeated failure identifies the stopped bootstrap stage.
- A transport-only upgrade with no explicit missing-resource wording is rotated for transport continuation without being classified as a zero-selection fleet shortage.
- A patient transport is operationally complete for the dispatcher as soon as its exact personal Radio request clears. If an in-flight navigation leaves Worker A on that Ambulance vehicle page, V3 protects any still-active destination selection, then rebuilds only the verified pending mission after the bounded redirect window instead of waiting for the Ambulance to arrive.
- Prisoner handoffs prefer the first exact visible green destination with positive capacity. If no usable cell remains or the cell route disappears, Auto Mode runs the exact current-mission `Release Prisoners` fallback before Mission Update, vehicle expansion or Unit Finder; the generic V3 transport watchdog cannot rebuild Worker A underneath that release flow.
- V3 owns an adaptive two-mission pipeline: Worker A is the sole dispatcher and dormant Worker B warms only the immediate next page without expanding the full vehicle table. Promotion is fail-closed unless the next mission and storage owner are verified.
- V3 pauses with zero mission frames below two actionable personal missions, including the exact final Dispatch-only path, waits for two missions to remain stable, then creates a fresh A. A managed worker never enters Mission Finder's standalone 15-mission queue watcher. It recycles A/B after 12 advances or 8 minutes. RAM protection first learns the normal 60-second A+B baseline, then requires either 192 MiB sustained growth or the 768 MiB ceiling for 15 seconds before B is released and A uses an 8-advance/4-minute boundary recycle. No durable register is cleared.
- V3 exports a true 12-hour run count, successful dispatch count, estimated mission value/rate, bounded timing percentiles and aggregate low-queue time. Staffing stops and recent confirmed-empty Ambulance exclusions include vehicle and station evidence but never personnel names.
- Qualification-sensitive selection fails closed: exact compatible vehicles with missing or stale evidence first enter live assignment-page verification, but only fresh, complete Personnel Register evidence satisfies trained-personnel demand and Auto Mode stops without dispatch when verified coverage remains short.
- Search Dog Unit (SAR) uses exact native MissionChief UK type `102` across Mission Finder selection, selected-unit verification and Unit Naming.
- Mission Update converts exact `Any vehicle` wording to one normal Ambulance and pins both selection and verification to native type `5`.
- Airfield Operations Supervisor requirements are singularised and pinned to native type `80`; maximum truck towing is isolated from the type-105 car rule and pinned one-for-one to native HGV Recovery type `106`.
- Mission and Resource Administration behavior is protected by permanent `scripts/check-*.mjs` regressions.
- Canonical release and component versions are validated only by `scripts/validate-userscript.mjs`; behavioral checks are version-agnostic.
- Trusted main events reconcile GitHub Release assets and external delivery without republishing an already-complete version.

## What is not yet proven complete

These remain evidence questions rather than claims of missing implementation:

- Full live coverage of every mission and resource combination on both MissionChief UK domains.
- Migration evidence for every combination of legacy installations and stored state.
- Long-session stability across all supported browsers, devices and interacting userscripts.
- A complete public compatibility matrix beyond the environments already observed.
- A fully consolidated internal module and interface architecture.

## Safe first development workflow

1. Fetch and verify current `main`, then create a focused branch.
2. Preserve unrelated work and change the smallest justified surface.
3. If `src/missionchief-command-nexus.user.js` changes, increase `@version`, update the relevant component version and add a changelog release entry.
4. Add or update a permanent behavioral regression without pinning release numbers.
5. Run the complete local gate:

   ```bash
   node --check src/missionchief-command-nexus.user.js
   node scripts/validate-userscript.mjs
   for check in scripts/check-*.mjs; do node "$check"; done
   python3 scripts/check_repository.py
   git diff --check
   ```

6. Test the affected live behavior at the smallest safe scope and record domain, browser, userscript manager and interacting scripts.
7. Merge an approved pull request to `main`; use direct main maintenance only when explicitly agreed.
8. For a new userscript version, verify GitHub assets, Greasy Fork and the single Discord delivery receipt. Repository-only work must not create a duplicate release.
9. Record the actual PR, merge commit, validation and delivery outcome in the project operating records.

## High-risk areas

- Dispatch and repeated-submission guards.
- Patient, ambulance and specialist-capability calculations.
- Selected, en-route, still-needed and mission-upgrade reconciliation.
- Trained-personnel matching and shared registry data.
- Bulk naming, personnel assignment and native-form verification.
- Queue continuation and transport handling.
- Storage, migration and rollback behavior.
- Observers, intervals, timeouts, cross-window ownership and cleanup.

## Current engineering priorities

1. Expand live evidence and reproducible fixtures around high-risk mission selection.
2. Complete migration, compatibility and long-session evidence.
3. Keep regressions behavior-focused and the repository free of one-use builders or trigger artifacts.
4. Consolidate shared lifecycle, storage and UI responsibilities only behind protected behavior.
5. Keep the release path idempotent, auditable and recoverable.

The authoritative active queue is the repository's [open issue list](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues). Versioned handovers and incident reports are historical records, not current operating instructions.

## Release authority

MartyBlyth controls source-code direction and final release approval. Repository, documentation and presentation changes by Conroy1988 do not constitute technical approval of userscript behavior.

## Key references

- [Canonical source](../src/missionchief-command-nexus.user.js)
- [Architecture](ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)
- [Testing strategy](TESTING.md)
- [Migration guide](MIGRATION.md)
- [Release process](RELEASE_PROCESS.md)
- [Greasy Fork setup](GREASY_FORK_SETUP.md)
