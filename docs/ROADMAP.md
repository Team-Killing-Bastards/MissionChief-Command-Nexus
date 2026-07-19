# Project Roadmap

MissionChief Command Nexus has moved beyond repository planning. The canonical `main` branch now contains the merged v1.0.1 userscript, validation automation and distribution workflow.

**Developer and technical owner:** MartyBlyth  
**Repository and documentation support:** Conroy1988

Progress markers in this document distinguish **implemented code** from **fully validated release readiness**. A feature being present in the merged file does not prove every live workflow, migration path or long-session condition has passed.

## Current baseline — merged v1.0.1

- [x] Establish the Team Killing Bastards organisation and repository.
- [x] Add licensing, governance, issue forms and pull-request guidance.
- [x] Import Mission Finder `V10.6.69`.
- [x] Import Unit, Station & Personnel Tools `V4.2.8`.
- [x] Publish one canonical userscript metadata block.
- [x] Publish one installable `.user.js` file on `main`.
- [x] Retain duplicate-initialisation protection and module startup isolation.
- [x] Retain unit naming, station naming and personnel-assignment capabilities.
- [x] Retain mission parsing, patient handling, selection, dispatch and queue capabilities.
- [x] Connect personnel-training intelligence to qualification-aware mission selection.
- [x] Add repository and userscript validation workflows.
- [x] Add Greasy Fork synchronization and GitHub Release packaging guidance.
- [x] Confirm the v1.0.1 canonical synchronization path without functional change.

## Phase 1 — Baseline evidence

Goal: turn the imported code baseline into a repeatable engineering baseline.

- [ ] Record sanitized test evidence for the imported Mission Finder behaviour.
- [ ] Record sanitized test evidence for the imported administration behaviour.
- [ ] Record the exact browser, userscript manager, domain and interacting-script environment.
- [ ] Record a source checksum for the first formal release candidate.
- [ ] Identify the smallest safe fixtures or harnesses for requirement and naming logic.
- [ ] Document known defects separately from untested behaviour.

## Phase 2 — Lifecycle and storage assurance

Goal: prove the merged installation does not duplicate work or damage stored state.

- [x] One outer Command Nexus installation guard exists.
- [x] Each retained engine keeps its original startup protection.
- [x] Resource-administration lifecycle cleanup exists for registered handlers.
- [ ] Inventory all persistent and session storage keys used by both engines.
- [ ] Define the migration and precedence rules for conflicting legacy values.
- [ ] Prove navigation and partial-page updates do not duplicate panels or execution ownership.
- [ ] Prove observers, listeners, intervals and timeouts stop when their operation ends.
- [ ] Record long-session memory and CPU observations.

## Phase 3 — Resource administration validation

Goal: prove resource changes are bounded, previewable and verifiable.

- [x] Unit naming code is present.
- [x] Station naming code is present.
- [x] Personnel assignment and verification code is present.
- [x] Training-profile and shared-registry code is present.
- [ ] Validate preview behaviour on representative station types.
- [ ] Validate pause, resume and stop paths during longer runs.
- [ ] Validate before/after, skipped and failure reporting.
- [ ] Prove writes remain inside the disclosed station and vehicle scope.
- [ ] Prove training shortages are distinguished from load, assignment and verification failures.

## Phase 4 — Mission intelligence validation

Goal: prove the mission engine selects capability correctly under live conditions.

- [x] Static mission requirement parsing is present.
- [x] Live Mission Update parsing is present.
- [x] Patient and ambulance demand handling is present.
- [x] Critical Care and specialist medical handling is present.
- [x] Qualification-sensitive vehicle selection is present.
- [x] Queue continuation and transport handling are present.
- [ ] Validate simple vehicle-only missions.
- [ ] Validate patient missions where ambulances are omitted from the displayed vehicle list.
- [ ] Validate specialist medical missions.
- [ ] Validate Public Order, Railway Police, aviation and EOD profiles.
- [ ] Validate selected, responding and still-needed reconciliation where live data is available.
- [ ] Validate mission upgrades after initial dispatch.
- [ ] Prove stale mission state cannot trigger repeated or cross-mission dispatch.

## Phase 5 — Interface consolidation

Goal: move from one installation containing two retained engines to one coherent Command Nexus control surface.

- [ ] Define one launcher and navigation model.
- [ ] Separate routine mission controls from resource-administration controls.
- [ ] Preserve advanced controls and diagnostics without overwhelming normal use.
- [ ] Expose clear active-operation, cancellation and failure state.
- [ ] Prevent duplicate interface elements after MissionChief DOM replacement.
- [ ] Validate supported desktop resolutions.
- [ ] Claim tablet, mobile or Safari support only after evidence-based testing.

## Phase 6 — Migration and compatibility

Goal: replace the two legacy installations safely.

- [ ] Test users migrating from Mission Finder only.
- [ ] Test users migrating from Unit, Station & Personnel Tools only.
- [ ] Test users with both legacy scripts and stored data.
- [ ] Confirm legacy storage remains recoverable during the first release cycle.
- [ ] Test `www.missionchief.co.uk`.
- [ ] Test `police.missionchief.co.uk`.
- [ ] Record supported browser and userscript-manager combinations.
- [ ] Record known conflicts with other MissionChief userscripts.
- [ ] Publish a completed compatibility matrix.

## Phase 7 — First formal release

Goal: publish a controlled, evidence-backed release approved by MartyBlyth.

- [ ] Freeze a release candidate.
- [ ] Complete the release checklist and changelog entry.
- [ ] Confirm all automated checks pass.
- [ ] Complete required live regression tests.
- [ ] Verify clean installation and update behaviour.
- [ ] Obtain MartyBlyth's technical approval.
- [ ] Verify the approved source through the configured external synchronization path.
- [ ] Create the matching version tag.
- [ ] Verify the GitHub Release userscript asset and SHA-256 checksum.
- [ ] Publish tested environments, known limitations and migration instructions.

## Beyond the first release

Future work should be judged by operational value, safety, performance and maintenance cost. Deep refactoring should follow protected behaviour and evidence, not precede it.

Start with the [Developer Handoff](DEVELOPER_HANDOFF.md) when resuming work.
