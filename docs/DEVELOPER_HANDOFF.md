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
| Command Nexus version | `1.0.122` |
| Mission Finder baseline | `V10.6.160` |
| Resource Administration module | `V4.2.8` |
| Unit / Station / Personnel UI versions | `3.3.27` / `1.3.22` / `1.3.10` |
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
- Mission requirements, selected and en-route reconciliation, trained-personnel capability, dispatch, Auto Mode and transport continuation are implemented.
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
