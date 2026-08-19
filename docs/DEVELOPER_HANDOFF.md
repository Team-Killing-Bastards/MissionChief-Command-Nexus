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
| Command Nexus version | `1.1.11` |
| Mission Finder baseline | `V10.7.7` |
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
    ├── Queue and transport continuation
    └── Opt-in private activity recorder

Google integration
└── Separately deployed Apps Script logger backend and native Sheet
```

The single-file shape is deliberate. Logical consolidation may continue, but established behavior must remain protected by executable regressions before structural refactoring.

## What is already complete

- One canonical `.user.js` source and one metadata block are published from `main`.
- Duplicate-initialisation protection and independent engine startup isolation are retained.
- Unit Naming, Station Naming and Personnel Assignment use background native forms instead of opening every resource page.
- Medical Personnel Assignment provides live exact Ambulance Officer, HART, Tactical Command, SORT, Midwifery and Specialist Paramedic profiles plus a specialist-first batch; the established standalone Critical Care engine remains unchanged.
- Fire/Airfield and SAR/Coastguard Personnel Assignment profiles are live with exact UK mappings. Trailer and pod profiles resolve the actual tractor through the station vehicle API, ambiguous relationships fail closed, and full-service batches merge overlapping qualifications onto one crew.
- Mission requirements, selected and en-route reconciliation, trained-personnel capability, dispatch, Auto Mode and transport continuation are implemented.
- The default-off background patient transport worker queues exact same-origin Transport Patient requests, keeps Auto Mode moving, uses only available hospital destinations and retains the established 40-request / three-attempt safety bounds. Desktop Mission Control exposes the worker through an attached Patient Transfers drawer with the real pending queue, current-run completed/failed counters, worker state, last completion time and a bounded ten-entry terminal failure log retaining each failed attempt reason. Vehicle Load and Patient Transfers open exclusively; established iPhone/iPad Safari mission surfaces remain isolated.
- Qualification-sensitive selection fails closed: exact compatible vehicles with missing or stale evidence first enter live assignment-page verification, but only fresh, complete Personnel Register evidence satisfies trained-personnel demand and Auto Mode stops without dispatch when verified coverage remains short.
- Search Dog Unit (SAR) uses exact native MissionChief UK type `102` across Mission Finder selection, selected-unit verification and Unit Naming.
- Sharing & Sync is off by default and exposes one checkbox only. The approved private Apps Script endpoint is compiled into the trusted two-user build; identity is detected automatically from `#navbar_profile_link`, the numeric `/profile/{id}` value is the stable player ID and the visible MissionChief username is the current display name. Enabling requests an immediate bounded backlog drain and never clears the existing queue or pending batch. Existing mission observation, generated-mission, dispatch, route distance/ETA and offline-completion recovery remain intact.
- Once the private Apps Script backend advertises activity schema v2, Nexus records privacy-bounded user interactions, Nexus synthetic actions, MissionChief same-origin fetch/XHR lifecycle, navigation, same-origin iframe activity, lifecycle changes and runtime errors. It does not collect entered values, passwords, cookies, auth tokens, clipboard data or request bodies. The local outbox remains bounded and batch uploads remain idempotent.
- The repository contains the Apps Script backend, manifest, deployment guide and permanent logger contract regressions. The backend stores raw v2 action evidence in Activity Log, maintains Sessions and Action Summary alongside Mission Summary, Dashboard Data and Journey Data, and includes the new activity datasets in daily backups and copy-verified weekly raw archives. Mission-ID + title matches remain preferred for credit recovery; a title/time match must be unique or the row remains pending.
- Weekly retention remains a hard archive → verify → purge contract: live rows are never removed until the archive copy has passed verification, with the Monday 03:15 Europe/London rollover and emergency cell-limit guard retained.
- Mission and Resource Administration behavior is protected by permanent `scripts/check-*.mjs` regressions.
- Canonical release and component versions are validated only by `scripts/validate-userscript.mjs`; behavioral checks are version-agnostic except where an external backend contract marker is intentionally asserted.
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
4. Add or update a permanent behavioral regression without pinning release numbers unless the asserted value is itself part of an external compatibility contract.
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
- Activity capture, privacy boundaries, logger identity and backend rollout compatibility.
- Storage, archive verification, migration and rollback behavior.
- Observers, intervals, timeouts, cross-window ownership and cleanup.

## Current engineering priorities

1. Expand live evidence and reproducible fixtures around high-risk mission selection and the new activity recorder.
2. Complete migration, compatibility and long-session evidence.
3. Keep regressions behavior-focused and the repository free of one-use builders or trigger artifacts.
4. Consolidate shared lifecycle, storage and UI responsibilities only behind protected behavior.
5. Keep the release and logger retention paths idempotent, auditable and recoverable.

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
