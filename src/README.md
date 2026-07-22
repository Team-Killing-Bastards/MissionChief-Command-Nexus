# Source Directory

The authoritative distributable source for MissionChief Command Nexus is:

```text
src/missionchief-command-nexus.user.js
```

## Current baseline

| Item | Value |
|---|---|
| Command Nexus version | `1.0.17` |
| Mission Finder baseline | `V10.6.81` |
| Unit, Station & Personnel baseline | `V4.2.8` |
| Licence | MIT |
| Developer and source-code owner | **MartyBlyth** |
| Repository and documentation support | **Conroy1988** |

The source was imported as one installable `.user.js` file with one standardized Command Nexus metadata block. The established operational bodies, compatibility guards and module startup isolation were retained.

## Current implementation model

The file contains:

1. One outer Command Nexus installation guard.
2. The Resource Administration Engine.
3. The Mission Operations Engine.
4. A shared vehicle-training registry used for qualification-aware selection.

The source is merged and installable, but deeper interface, lifecycle and storage consolidation remains subject to testing and MartyBlyth's technical direction.

## Distribution rule

`src/missionchief-command-nexus.user.js` on `main` is the only authoritative synchronization source. Feature branches, pull-request refs, copied text files and GitHub Release assets must not be configured as the live synchronization URL.

Raw canonical source:

```text
https://raw.githubusercontent.com/Team-Killing-Bastards/MissionChief-Command-Nexus/main/src/missionchief-command-nexus.user.js
```

## Source-change requirements

Before publishing a source change:

- Pull the current `main` baseline.
- Change the canonical `.user.js` file only.
- Increase `@version`.
- Update `CHANGELOG.md`.
- Run `node --check src/missionchief-command-nexus.user.js`.
- Run `node scripts/validate-userscript.mjs`.
- Run `python3 scripts/check_repository.py`.
- Complete the relevant MissionChief regression checks.
- Record the tested domain, browser, userscript manager and interacting scripts.
- Confirm no account data, credentials, webhook URLs or private configuration was introduced.
- Do not run Command Nexus alongside either legacy standalone script.

## High-risk source areas

Changes involving dispatch, patient demand, trained-personnel matching, personnel assignment, bulk naming, storage migration, queue continuation or lifecycle cleanup require explicit evidence and rollback notes.

Start with [Developer Handoff](../docs/DEVELOPER_HANDOFF.md). Publication details are in [Greasy Fork Automated Release Setup](../docs/GREASY_FORK_SETUP.md).
