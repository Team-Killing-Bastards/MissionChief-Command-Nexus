# Project Roadmap

MissionChief Command Nexus is an actively released userscript. This roadmap records the production baseline and the remaining engineering priorities; it is not a pre-release plan.

**Developer and technical owner:** MartyBlyth  
**Repository and documentation support:** Conroy1988

## Current production baseline — v1.1.6

- [x] Publish one canonical userscript on trusted `main`.
- [x] Release Command Nexus `1.1.6` with Mission Finder `V10.7.4`.
- [x] Retain Resource Administration `V4.2.8`, with Unit Naming `3.3.27`, Station Naming `1.3.22` and Personnel Assignment `1.3.12`.
- [x] Protect duplicate initialization and independent engine startup.
- [x] Provide Unit Naming, Station Naming and Personnel Assignment through background native-form workflows.
- [x] Provide requirement parsing, patient handling, trained-capability selection, Mission Update, dispatch, Auto Mode and queue continuation.
- [x] Reconcile selected and en-route capability before mission-upgrade selection.
- [x] Fail closed when fresh, complete Personnel Register evidence does not verify the full trained-personnel requirement.
- [x] Admit missing and stale exact-type vehicles to live verification before enforcing the final evidence-backed selection gate.
- [x] Align Search Dog Unit selection, verification and naming to evidence-backed native type `102`.
- [x] Complete all Medical Personnel Assignment profiles with exact UK vehicle, academy, seat and eligible-building mappings.
- [x] Complete issue #18 Fire/Airfield Personnel Assignment profiles with exact mappings and fail-closed pod/trailer authority.
- [x] Complete issue #19 SAR/Coastguard Personnel Assignment profiles with exact mappings, live seat overrides and overlap-safe batching.
- [x] Route Aerial Appliance Truck(s) or Rescue Stairs through exact Rescue Stairs-first, CARP-remainder selection.
- [x] Add an opt-in, paired Mission Analytics Logger with bounded five-minute uploads, exact dispatched-unit rows and a separately deployed Google Apps Script / Sheets backend.
- [x] Run canonical version validation and the complete permanent behavioral regression suite.
- [x] Reconcile GitHub Release assets, Greasy Fork synchronization and one Discord delivery receipt for each userscript release.

## Current roadmap

### 1. Live evidence and mission safety

- [ ] Expand sanitized fixtures and live evidence for representative Fire, Ambulance, Police, specialist and trained-personnel missions.
- [ ] Record mission-upgrade cases with missing, en-route, still-needed and selected values.
- [ ] Extend stale-mission, repeated-dispatch and zero-shortage evidence.
- [ ] Keep requirement-family substitutions exact and bounded.

### 2. Resource Administration assurance

- [ ] Expand bounded preview, save and verification evidence for native station, vehicle and personnel forms.
- [ ] Record pause, stop, cancellation and partial-failure behavior on longer runs.
- [ ] Prove scope boundaries across normal, embedded and standalone Stations views.
- [ ] Preserve Dispatch Centre, service, station-type and start-point hierarchy recovery after late rendering.

### 3. Lifecycle, migration and compatibility

- [ ] Complete the persistent/session storage inventory and migration precedence rules.
- [ ] Record long-session observer, timer, memory and CPU behavior.
- [ ] Test migration from each supported legacy-installation combination.
- [ ] Maintain an evidence-backed browser, userscript-manager and device matrix for both MissionChief UK domains.

### 4. Architecture and interface consolidation

- [ ] Consolidate shared lifecycle, storage and diagnostics contracts behind existing regressions.
- [ ] Reduce duplicate helpers without weakening module isolation.
- [ ] Continue the coherent Command Nexus interface while preserving advanced controls.
- [ ] Split source boundaries only when the maintenance and validation benefit is demonstrated.

### 5. Release and repository durability

- [x] Remove obsolete one-use builders, triggers and repair workflows from permanent automation.
- [x] Make behavioral regressions version-agnostic and centralize canonical version validation.
- [x] Separate current operational documentation from immutable historical handovers and incident records.
- [ ] Keep trusted-main publication idempotent and retain a documented recovery path.
- [ ] Keep temporary build mechanisms out of tracked permanent automation.
- [ ] Record each production or operating-contract change in GitHub and the connected project operating records.
- [x] Implement fail-closed MissionChief transaction-to-mission matching: prefer a ledger mission ID + normalized title, otherwise require one unique normalized title inside the bounded completion window; retain ambiguous rows as pending for live verification.

### 6. Opt-in mission analytics — delivered and monitored

- [x] Complete [issue #334](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/334) with proven pairing, local-credential, bounded-outbox, idempotent-upload and privacy contracts.
- [x] Keep logging disabled by default and present visible paired, queued, synchronized and failed states.
- [x] Route manual Dispatch, Dispatch & Share, Auto Mode and Ally Steal paths through one evidence-backed event schema.
- [x] Verify live cross-origin transport, server-side credential hashing and separation of advertised versus awarded credits.
- [x] Add mission completion timing, exact native Credits-ledger matching, weekly archives and compact all-weeks Dashboard Data.
- [x] Recover exact mission completion time and awarded credits after every paired browser was offline, using resumable mission-ID + title ledger reconciliation without changing the existing Google deployment or pairing.
- [x] Capture MissionChief's available dispatch-time route distance/ETA per selected unit and retain compact weekly station journey aggregates for placement analysis.
- [x] Capture each newly generated current-player mission from the native mission list without opening its detail page.
- [ ] Continue monitoring multi-browser live batches, MissionChief transaction variants and weekly rollover evidence after release.

## Phase 7 — Formal release (completed)

The original first-release milestone is complete. Command Nexus has a production release line, canonical tags, verified GitHub assets, Greasy Fork delivery and Discord release notification evidence. Future releases use the current [Release Process](RELEASE_PROCESS.md), not the old pre-release checklist.

## Planning rules

- Implemented code is not automatically live-tested behavior.
- A versioned release or incident document remains historical and must not be rewritten as current guidance.
- Every source behavior change needs a version increase, changelog entry and permanent regression.
- Documentation-only and repository-administration work keeps the current userscript version when canonical source is unchanged.
- Active priorities and acceptance criteria live in [GitHub Issues](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues).

Start with the [Developer Handoff](DEVELOPER_HANDOFF.md) when resuming work.
