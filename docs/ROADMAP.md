# Project Roadmap

MissionChief Command Nexus is in pre-release planning. Dates are intentionally omitted until the unified codebase exists and can be tested.

**Developer:** MartyBlyth  
**Project helper:** Conroy1988

## Phase 0 — Repository foundation

- [x] Establish the Team Killing Bastards organisation.
- [x] Create the Command Nexus repository.
- [x] Define project identity and purpose.
- [x] Add licensing and community documentation.
- [x] Add issue and pull-request structure.
- [x] Document initial architecture and release expectations.

## Phase 1 — Source intake and baseline

- [ ] Import the latest verified versions of both source userscripts.
- [ ] Record source versions and checksums.
- [ ] Document existing storage keys, global variables and interfaces.
- [ ] Identify duplicated observers, timers, listeners and page hooks.
- [ ] Establish a reproducible pre-merge test baseline.

## Phase 2 — Unified core

- [ ] Create one userscript metadata block and bootstrap path.
- [ ] Establish shared storage with versioned migration.
- [ ] Establish lifecycle and cleanup management.
- [ ] Introduce controlled logging and diagnostics.
- [ ] Prevent duplicate initialization across MissionChief page updates.

## Phase 3 — Resource administration

- [ ] Integrate station naming.
- [ ] Integrate vehicle naming.
- [ ] Integrate personnel assignment and verification.
- [ ] Preserve preview, pause, resume and stop behaviour.
- [ ] Build the shared training and capability registry.

## Phase 4 — Mission intelligence

- [ ] Integrate mission requirement parsing.
- [ ] Integrate live mission-update parsing.
- [ ] Account for patients and ambulance demand.
- [ ] Match vehicles against training and capability requirements.
- [ ] Track selected and en-route counts.
- [ ] Preserve manual dispatch and alliance workflows.

## Phase 5 — Automation and interface

- [ ] Integrate queue processing and mission continuation.
- [ ] Re-check upgraded missions safely.
- [ ] Consolidate both interfaces into one navigation system.
- [ ] Add clear run state, cancellation and diagnostics.
- [ ] Test long sessions for duplicate work and memory growth.

## Phase 6 — Compatibility and migration

- [ ] Migrate legacy preferences without destructive deletion.
- [ ] Migrate training-registry data.
- [ ] Test MissionChief UK and Police MissionChief UK domains.
- [ ] Test supported desktop browsers and userscript managers.
- [ ] Define mobile and Safari support based on evidence.
- [ ] Document conflicts with other common userscripts.

## Phase 7 — First release

- [ ] Freeze the first release candidate.
- [ ] Complete the release checklist.
- [ ] Publish a tagged GitHub pre-release.
- [ ] Record the release checksum.
- [ ] Test installation and update behaviour from a clean profile.
- [ ] Publish the unified Greasy Fork listing when approved by MartyBlyth.
- [ ] Publish migration guidance for users of both original scripts.

## Beyond the first release

Potential future work should be evaluated against real operational value, performance cost and maintenance burden. The project will not accumulate features merely to appear larger.
