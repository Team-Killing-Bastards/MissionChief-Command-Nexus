# Developer Handoff

Read the generated [Current Project State](PROJECT_STATE.md) first. This document provides the deeper implementation handoff after the current versions, accepted decisions, evidence and next work are confirmed.

**Developer and technical owner:** MartyBlyth  
**Repository and documentation support:** Conroy1988

## Current verified baseline

| Item | Current state |
|---|---|
| Public installation | [Chrome Web Store](https://chromewebstore.google.com/detail/missionchief-command-nexu/pheccockibcappcdgonjjfcmlkemmaln) |
| Current extension version | `3.0.43.205` (listing checked 7 October 2026) |
| Versioned extension source | `extension-candidates/3.0.43.205/extension` |
| Build and test entry point | [extension-candidates/3.0.43.205/README.md](../extension-candidates/3.0.43.205/README.md) |
| Technical owner / release authority | MartyBlyth |
| Current-state record | `project-state.json` → generated `docs/PROJECT_STATE.md` |
| Command Nexus version | `3.0.43` |
| Mission Finder baseline | `V10.6.180` |

The last two rows describe the retained **legacy userscript**, not the current extension. Its source and tests remain for provenance and regression coverage. The older `browser-extension` `.82` pipeline is also historical; do not use it to rebuild the current package.

## Current implementation shape

Manifest V3 defines the extension service worker, popup, collector options page, content-script modules and isolated/main-world bridges. The versioned package contains the Nexus runtime, mission and administration features, account/profile sync, station checks and update notices. Read the actual manifest and module source before editing a feature; old single-file userscript descriptions do not define the whole extension.

## Retained userscript implementation record

The following implementation details and pending live-evidence items describe the retained baseline. Verify them against the current extension before treating them as current behavior or active work.

### What was implemented in the userscript baseline

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
- V3 owns a serialized one-worker lifecycle: Worker A is mission-only and Worker B is created on demand for one exact personal patient/prisoner Radio request. A is removed before B starts, B is removed before a fresh A starts, and no dormant mission preload exists.
- V3 pauses with zero background workers below two actionable personal missions, including the exact final Dispatch-only path, and resumes from a fresh A after two missions remain stable. Worker recycling, role-aware wake recovery and RAM protection never clear a durable register. Visible-page sleep recovery requires 90 seconds and hidden-page recovery requires three minutes.
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
3. Start from the versioned extension. Increase its four-part manifest version and update provenance and extension change notes when packaged bytes change. Legacy userscript changes keep their separate `@version` checks.
4. Add or update a permanent behavioral regression without pinning release numbers.
5. Run the versioned extension package/validation checks from its build guide, then the retained-source and repository gate:

   ```bash
   node --check src/missionchief-command-nexus.user.js
   node scripts/validate-userscript.mjs
   for check in scripts/check-*.mjs; do node "$check"; done
   python3 scripts/check_repository.py
   git diff --check
   ```

6. Test the affected live behavior at the smallest safe scope and record domain, browser, installation source and interacting extensions/scripts.
7. Merge an approved pull request to `main`; use direct main maintenance only when explicitly agreed.
8. Follow the Chrome [release process](RELEASE_PROCESS.md). Repository-only work must not publish a package or announce a release.
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

## Retained engineering priorities — recheck against current extension

1. Complete issue [#396](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/396): reduce long-session memory growth without slowing the hot mission or transport path.
2. Live-validate the 3.0.43 role-aware wake-recovery and managed Worker A admission contract.
3. Expand live evidence and reproducible fixtures around high-risk mission selection.
4. Keep regressions behaviour-focused and the repository free of one-use builders or trigger artifacts.
5. Consolidate shared lifecycle, storage and UI responsibilities only behind protected behaviour.

The authoritative active queue is the repository's [open issue list](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues). Versioned handovers and incident reports are historical records, not current operating instructions.

## Release authority

MartyBlyth controls source-code direction and final release approval. Repository, documentation and presentation changes by Conroy1988 do not constitute technical approval of userscript behavior.

## Key references

- [Machine-readable project state](../project-state.json)
- [Generated current project state](PROJECT_STATE.md)
- [Decision register](decisions/README.md)
- [Evidence register](evidence/README.md)
- [Current extension source](../extension-candidates/3.0.43.205/extension)
- [Architecture](ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)
- [Testing strategy](TESTING.md)
- [Migration guide](MIGRATION.md)
- [Release process](RELEASE_PROCESS.md)
- [Extension build guide](../extension-candidates/3.0.43.205/README.md)
