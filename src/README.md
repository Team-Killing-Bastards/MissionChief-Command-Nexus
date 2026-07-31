# Source Directory

The authoritative distributable source for MissionChief Command Nexus is:

```text
src/missionchief-command-nexus.user.js
```

## Current baseline

| Item | Value |
|---|---|
| Command Nexus version | `1.0.71` |
| Mission Finder baseline | `V10.6.134` |
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

The source is merged and installable. Resource Administration uses one filtered lifecycle controller, remains scoped to the rendered personal Stations view on iOS Safari and preserves the same panel instance across responsive navigation. Mission Finder ignores its own panel mutations, preserves its runtime during Safari bfcache entry and owns every global lifecycle listener. Unit Finder resolves the hidden or visible same-origin Requirements for this Mission source for the exact active mission, validates the `/einsaetze/{missionType}?mission_id={instance}` response, then resolves vehicle controls from the same active mission document and counts a selection only after MissionChief's exact checkbox is confirmed checked. iPhone Safari receives a separate compact Mission Finder command card with collapsed advanced settings and fixed safe-area ownership, including phone-sized Safari desktop-site sessions that identify as `MacIntel`. Mission Control and Vehicle Load List are launched from two compact iPhone-only buttons labelled Mission and Vehicle. Both start closed and open exclusively below a launcher placed left of the complete native control cluster with stable geometry. MissionChief's native quick-select DOM is left structurally untouched and receives passive document-owned selector CSS only; the former Unit Quick Select disclosure and stored state are removed. The active mission document also receives an in-place compact native Unit Quick Select disclosure for its `search_attribute` controls, including same-origin iframe/lightbox documents, while iPad and desktop retain their established dimensions, dragging, saved positioning and interaction model.

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
- Run `node scripts/check-ios-compatibility.mjs`.
- Run `node scripts/check-runtime-hardening.mjs`.
- Run `node scripts/check-police-irv-fallback.mjs`.
- Run `node scripts/check-open-issues-batch.mjs`.
- Run `node scripts/check-missing-requirements-priority.mjs`.
- Run `node scripts/check-trained-coverage-optimizer.mjs`.
- Run `node scripts/check-police-search-advisor-register.mjs`.
- Run `node scripts/check-ios-unit-finder-selection.mjs`.
- Run `node scripts/check-ios-mission-requirements-source.mjs`.
- Run `node scripts/check-iphone-mission-ui.mjs`.
- Run `python3 scripts/check_repository.py`.
- Complete the relevant MissionChief regression checks.
- Record the tested domain, browser, userscript manager and interacting scripts.
- Confirm no account data, credentials, webhook URLs or private configuration was introduced.
- Do not run Command Nexus alongside either legacy standalone script.

## High-risk source areas

Changes involving dispatch, patient demand, trained-personnel matching, personnel assignment, bulk naming, storage migration, queue continuation or lifecycle cleanup require explicit evidence and rollback notes.

Start with [Developer Handoff](../docs/DEVELOPER_HANDOFF.md). Publication details are in [Greasy Fork Automated Release Setup](../docs/GREASY_FORK_SETUP.md).

### Nexus visual system

Desktop mission and naming/assignment surfaces share one low-glare tokenised design system. The Mission dashboard uses a numbered horizontal Mission, Settings and Diagnostics strip with responsive three-, two- and one-column layouts. Unit Naming, Station Naming and Personnel Assignment use responsive configuration, action, status, analysis, report and log regions. Existing IDs and handlers remain authoritative. All new desktop selectors explicitly exclude the established iPhone/iOS geometry.

### Compact progressive-disclosure interface

Desktop Mission Control is a narrow single-shell interface. Mission actions remain immediately visible; Vehicle Load and Trained Personnel start collapsed; Settings and Diagnostics replace the mission view rather than expanding beside it. Unit Naming, Station Naming and Personnel Assignment use narrow single-column panels with status, tools, reports and logs behind native disclosure controls. The entire Mission shell and naming panel can collapse to compact headers. Existing IDs, handlers, authoritative data paths and iPhone/iOS geometry remain unchanged.
