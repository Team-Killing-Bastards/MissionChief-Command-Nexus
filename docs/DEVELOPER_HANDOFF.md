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
| Command Nexus version | `1.0.1` |
| Mission Finder baseline | `V10.6.69` |
| Unit, Station & Personnel baseline | `V4.2.8` |
| Userscript author metadata | `MartyBlyth` |
| MissionChief domains | `www.missionchief.co.uk` and `police.missionchief.co.uk` |
| Distribution source | Raw canonical file on `main` |
| Automated validation | Repository integrity, JavaScript syntax, metadata, file-size and version-increase checks |
| Release packaging | Tag-driven GitHub Release with userscript asset and SHA-256 checksum |

The repository now contains one installable userscript. The two legacy systems are bundled into one Command Nexus metadata block and one installation guard.

## Current implementation shape

The v1.0.1 source is intentionally conservative. It preserves two established engines inside one file:

```text
MissionChief Command Nexus
├── Resource Administration Engine
│   ├── Unit naming
│   ├── Station naming
│   ├── Personnel assignment
│   ├── Training profiles
│   └── Shared vehicle-training registry
└── Mission Operations Engine
    ├── Requirement parsing
    ├── Patient and specialist demand
    ├── Unit Finder and Mission Update
    ├── Qualification-aware selection
    ├── Auto Mode and dispatch
    └── Queue and transport continuation
```

The engines have separate startup isolation. This reduces merge risk, but it is not yet the final consolidated architecture described by the longer-term roadmap.

## What is already complete

- One canonical `.user.js` source file exists on `main`.
- One userscript metadata block defines name, version, author, licence and supported domains.
- Duplicate installation guards prevent the merged script from starting twice.
- The resource-administration engine is present.
- The mission-operations engine is present.
- A shared personnel-training registry is available to mission selection.
- Patient demand and specialist qualification logic are present.
- Repository and userscript validation workflows are present.
- Greasy Fork synchronization guidance and a tag-based release workflow are present.
- The v1.0.1 update path was used as a no-functional-change synchronization test.

## What is not yet proven complete

These items must remain open until supported by live evidence:

- Full regression coverage across both MissionChief UK domains.
- Clean migration from every combination of the two legacy installations.
- Long-session observer, timer, listener and memory stability.
- A genuinely unified interface replacing both retained control surfaces.
- Browser and userscript-manager compatibility beyond tested environments.
- Mobile and Safari support.
- A formal tagged GitHub release with verified public artefacts.
- A complete public compatibility matrix and sanitized test evidence.

## Safe first development workflow

1. Pull current `main` before making changes.
2. Create a focused branch for functional work.
3. Change only the canonical source:

   ```text
   src/missionchief-command-nexus.user.js
   ```

4. Increase `@version` for every source change intended for publication.
5. Update `CHANGELOG.md` with user-visible behaviour.
6. Run:

   ```bash
   node --check src/missionchief-command-nexus.user.js
   node scripts/validate-userscript.mjs
   python3 scripts/check_repository.py
   ```

7. Test the affected behaviour in MissionChief on the smallest safe scope.
8. Record the exact domain, browser, userscript manager and interacting scripts.
9. Use the pull-request template for substantial changes, even though trusted owners retain direct `main` push access.
10. Verify the Greasy Fork synchronization result after an approved `main` publication.

## High-risk areas

Treat changes in these areas as release-sensitive:

- Dispatch and repeated-submission guards.
- Patient and ambulance calculations.
- Trained-personnel matching and the shared registry.
- Personnel assignment and verification.
- Bulk station or vehicle naming.
- Queue continuation and transport handling.
- Storage keys, migration and rollback behaviour.
- Mutation observers, intervals, timeouts and page-navigation cleanup.

## Current engineering priorities

1. **Establish a repeatable live test baseline** for both domains.
2. **Record migration evidence** from each legacy installation state.
3. **Confirm long-session lifecycle safety** before deeper refactoring.
4. **Consolidate the interface deliberately**, without removing advanced controls.
5. **Separate logical modules safely** only after behaviour is protected by tests.
6. **Create the first formal release candidate** once the compatibility and stability gates pass.

## Release authority

MartyBlyth controls source-code direction and final release approval. Repository, documentation and presentation changes by Conroy1988 do not constitute technical approval of userscript behaviour.

## Key references

- [Canonical source](../src/missionchief-command-nexus.user.js)
- [Architecture](ARCHITECTURE.md)
- [Roadmap](ROADMAP.md)
- [Testing strategy](TESTING.md)
- [Migration guide](MIGRATION.md)
- [Release process](RELEASE_PROCESS.md)
- [Greasy Fork setup](GREASY_FORK_SETUP.md)
- [Master release tracker](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/10)
