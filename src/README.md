# Source Directory

The authoritative distributable source for MissionChief Command Nexus is:

```text
src/missionchief-command-nexus.user.js
```

## Current baseline

| Item | Value |
|---|---|
| Command Nexus version | `3.0.35` |
| Mission Finder baseline | `V10.6.177` |
| Unit, Station & Personnel baseline | `V4.2.8` |
| Unit / Station / Personnel interfaces | `3.3.27` / `1.3.22` / `1.3.12` |
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

The source is merged and installable. Resource Administration uses one filtered lifecycle controller, runs in the top-level Stations view, the exact same-origin `/leitstellenansicht` lightbox frame or a standalone `/leitstellenansicht` window, remains scoped to the rendered personal Stations view on iOS Safari and preserves the same panel instance across responsive navigation. The standalone route is independently authoritative when its native station entries are connected and reads only its own DOM, with no `window.opener` dependency. Unit Naming and Station Naming use the live MissionChief hierarchy Dispatch Centre → Service → Station Type → Start From. Dispatch Centre ID/name pairs come from MissionChief's native type-7 building cards where those are rendered and from the native `.leitstelle_selection[leitstelle]` navbar controls in the standalone popout, where type-7 cards are omitted. Station membership remains authoritative from each Stations row's `leitstelle_building_id`; both normal station refresh paths rescan those current rows so an early standalone snapshot cannot survive after the remaining cards render. A manual Dispatch Centre refresh also rebinds any already-loaded Unit and Station Naming snapshots. Service is derived from MissionChief building type IDs, then Station Type and Start From are scoped progressively. Station Naming and Unit Naming fetch MissionChief's native edit forms in the background from every supported Stations layout, preserve the exact hidden fields and CSRF token, validate the expected station or vehicle action, and verify every saved name with a fresh read. Personnel Assignment remains background-only and verifies submitted assignments with fresh assignment-page requests. Medical, Fire/Airfield, Police and SAR/Coastguard services expose live exact UK vehicle, academy, seat and eligible-building rules. Trailer and pod profiles resolve MissionChief's actual tractor relationship through the same-origin station vehicle API, ambiguous links fail closed, and Fire/SAR batches merge overlapping qualifications onto one actual crew. None of these workflows clicks a resource link or opens a station/vehicle lightbox. Mission Finder ignores its own panel mutations, preserves its runtime during Safari bfcache entry and owns every global lifecycle listener. Unit Finder resolves the hidden or visible same-origin Requirements for this Mission source for the exact active mission, validates the `/einsaetze/{missionType}?mission_id={instance}` response, then resolves vehicle controls from the same active mission document and counts a selection only after MissionChief's exact checkbox is confirmed checked. Prefixed generic Drone requirements use exact type `89` SAR and type `91` Police Drone Vehicle checkboxes through the shared selector and verification paths, while explicit Police Drone, Police Helicopter and flexible Police Air wording remain strict. Aerial Appliance Truck(s) or Rescue Stairs exhausts exact type `78` Rescue Stairs before exact type `17` CARPs fill any remainder; both types count toward the same requirement and generic fallback is blocked. Rescue Dog and Search Dog Unit aliases use exact native Search Dog Unit (SAR) type `102`, matching Unit Naming's existing identity map. On Mission Update, exact Any vehicle wording is capped at one normal Ambulance and both selection and verification accept only native type `5`, excluding HEMS and every other family. iPhone Safari receives a separate compact Mission Finder command card with collapsed advanced settings and fixed safe-area ownership, including phone-sized Safari desktop-site sessions that identify as `MacIntel`. Mission Control and Vehicle Load List are launched from two compact iPhone-only buttons labelled Mission and Vehicle. Both start closed and open exclusively below a launcher placed left of the complete native control cluster with stable geometry. MissionChief's native quick-select DOM is left structurally untouched and receives passive document-owned selector CSS only; the former Unit Quick Select disclosure and stored state are removed. The active mission document also receives an in-place compact native Unit Quick Select disclosure for its `search_attribute` controls, including same-origin iframe/lightbox documents, while iPad and desktop retain their established dimensions, dragging, saved positioning and interaction model.

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
- Run `node scripts/check-auto-stop-reason.mjs`.
- Run `node scripts/check-police-unit-naming-classes-v10105.mjs`.
- Run `node scripts/check-recovery-unit-naming-classes-v10106.mjs`.
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

### Attached Vehicle Load drawer

On desktop and tablet, Vehicle Load is attached to the right edge of the compact Mission shell. Its collapsed state is a narrow vertical Vehicle tab sharing the Mission border. Opening the drawer expands it to the right without resizing Mission Control; Settings, Diagnostics and whole-shell collapse hide it. iPhone/iOS vehicle launcher behaviour is unchanged.

### Vehicle drawer motion refinement

The desktop/tablet Vehicle Load drawer is anchored at the top-right edge of Mission Control and uses a short eased transition. Reduced-motion users receive an immediate transition. Mission Update now precedes Ally Steal in the primary action grid; button IDs and handlers remain unchanged.
