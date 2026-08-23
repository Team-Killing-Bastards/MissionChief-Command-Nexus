# Changelog

All notable changes to MissionChief Command Nexus are documented here.

The project uses Semantic Versioning for the unified userscript release line.

## [Unreleased]

## [3.0.12] - 2026-08-23

### Fixed

- Recover Worker A after a prisoner cell assignment redirects it to the map and leaves the embedded engine waiting without a mission control. The controller reloads the exact persisted mission after 12 seconds, without clicking Dispatch or skipping.
- Added an atomic session-level Dispatch latch keyed by mission ID. A MissionChief redraw or same-document queue handoff can no longer click Dispatch twice or add a second successful-completion record for the same mission transition.
- Kept prisoner recovery independent of a still-visible Radio Transport Request, closing the deadlock exposed after the request row had already cleared.

### Safety

- Preserved the single active dispatcher, oldest-first personal transport handling, trained-personnel rules, memory lifecycle and all exact vehicle cross-references.
- Recovery remains fail-closed when an exact persisted mission URL cannot be verified.

## [3.0.11] - 2026-08-23

### Fixed

- Replaced transport-kind-only watching with exact patient/prisoner identity tracking using the vehicle and subject IDs. A handoff from one patient or prisoner to another now resets the stall clock instead of inheriting a stale context.
- Added one bounded Worker-A rebuild after 20 seconds in the same exact personal transport context. The recovery reopens only the matching personal request or verified mission, never clicks Dispatch, never skips, and fails closed if that exact context stalls again within two minutes.
- Rebuilt post-sleep recovery to discard stale workers and timers, then service the oldest outstanding personal transport before mission work resumes. Alliance requests remain ignored.
- Made adaptive RAM protection reversible: after the heap remains below the safe release threshold for 60 seconds, the A-only latch clears and lightweight preload B may return. Worker C remains parked.
- Added a run-scoped exact-vehicle staffing quarantine. A uniquely identified vehicle that raises a confirmed staffing alert is excluded and Unit Finder retries the same mission; ambiguous generic alerts still stop safely.
- Expanded mission-value discovery across the active mission document and readable nested frames, with capture-source and miss telemetry for exports.
- Increased Command Nexus from `3.0.10` to `3.0.11` and Mission Finder from `V10.6.176` to `V10.6.177`.

### Safety

- Preserved the single active dispatcher, personal oldest-first transport clearing, two-mission pause, trained-personnel fail-closed rules and durable station/unit/personnel registers.
- Preserved exact cross-references: Rescue Dog to Search Dog Unit type `102`, Airfield Operations Supervisor type `80`, Mission Upgrade Any vehicle to Ambulance type `5`, car towing to Flatbed Recovery type `105`, and truck towing to HGV Recovery type `106`.
- Added permanent regression coverage for exact transport identity, bounded no-dispatch recovery, wake recovery, reversible RAM protection, staffing quarantine, value parsing and all banked vehicle mappings.

## [3.0.10] - 2026-08-23

### Fixed

- Replaced the controller's rolling 80-ID display count with a true run counter and a bounded 5,000-ID continuity ledger, so a 12-hour endurance export does not stop counting at 80 missions.
- Added exact successful-dispatch totals from Mission Finder plus estimated mission value, value per hour, dispatches per hour and bounded dispatch/full-cycle percentile telemetry. Estimated value is explicitly distinguished from settled bank income.
- Added station-aware staffing diagnostics. A staffing stop now records the selected Ambulance/HEMS candidates, vehicle IDs, station names and Personnel Register evidence in the main V3 export.
- Excluded an Ambulance or HEMS before selection only when an exact Personnel Register match has a complete scan, zero assigned personnel and evidence no older than 24 hours. Missing, incomplete, stale and staffed evidence remains eligible.
- Added aggregate low-queue pause duration/count telemetry that survives visible-page continuity without retaining an unbounded event history.
- Increased Command Nexus from `3.0.9` to `3.0.10` and Mission Finder from `V10.6.175` to `V10.6.176`.

### Safety

- The sole active Worker A, lightweight B preload, two-mission pause, transport clearing, trained-personnel fail-closed behavior and all exact vehicle cross-references remain in place.
- Rescue Dog/Search Dog Unit remains pinned to exact native type `102`; Mission Update Any vehicle remains one exact type-`5` Ambulance.
- Added permanent endurance telemetry and recent-complete-zero-personnel regression coverage.

## [3.0.9] - 2026-08-22

### Fixed

- Fixed the final Dispatch-only handoff that could leave hidden Worker A inside Mission Finder's standalone silent queue path waiting for 15 unattended missions. A parent-owned active frame now remains identifiable across MissionChief's brief same-document ownership-bridge refresh.
- Forced every verified final-dispatch route to signal the V3 two-mission controller before standalone queue-watcher state can start. Worker A is released, the zero-worker pause remains transport-aware, and the controller resumes from a fresh A after two actionable missions remain stable.
- Added final Dispatch, Dispatch & Share and final-queue status evidence to the existing duplicate-safe 8/16-second post-dispatch watchdog, providing a bounded fallback if the primary low-queue signal is ever lost.
- Cleared stale `TRANSPORT_WARN` UI state when the exact warned personal Radio Transport Request disappears, without changing transport selection or clicking another destination.
- Counted a full low-queue A/B teardown as satisfying any pending memory-pressure recycle, preventing an unnecessary second Worker A restart immediately after mission supply returns.
- Increased the unified userscript from `3.0.8` to `3.0.9` and Mission Finder from `V10.6.174` to `V10.6.175`.

### Safety

- Vehicle selection, Mission Upgrade, trained-personnel, hospital, prisoner, Rescue/Search Dog type `102`, Airfield Operations Supervisor type `80`, Ambulance type `5`, Flatbed Recovery type `105`, HGV Recovery type `106`, shortage cooldown and personal-only transport rules are unchanged.
- Added permanent regression coverage for the observed final-dispatch/15-mission deadlock, bridge-refresh identity, bounded fallback recovery, stale transport-warning restoration and memory-recycle handoff.

## [3.0.8] - 2026-08-22

### Fixed

- Constrained the V3 control panel to the available viewport and added an internal scroll region, preventing long Temporary Skips lists from extending the popup below the screen.
- Kept Start, Stop, Retry and Export in a fixed control footer outside the scrolling status content so they remain reachable at every list length.
- Capped Temporary Skips itself at 96 px with independent overflow and removed the obsolete initial Worker C placeholder.
- Increased the unified userscript from `3.0.7` to `3.0.8` and Mission Finder from `V10.6.173` to `V10.6.174`.

## [3.0.7] - 2026-08-22

### Memory and performance

- Rebuilt dormant Worker B as a lightweight page/network preload. B no longer allocates the complete Mission Finder engine, observers, requirement maps or automation state while waiting.
- B still loads and stabilises the immediate next MissionChief mission page. On verified promotion and sole-owner handoff, it mounts the complete Mission Finder engine exactly once before Worker A automation starts.
- This retains the useful DOM/network warm-up while removing the wasteful second full automation runtime during normal A+B operation.

### Safety

- Lightweight B keeps the native dormant protocol, storage-ownership validation, interaction blocker, exact mission-ID check and activation-token gate. A failed promotion still falls back through the existing safe ownership circuit breaker.
- Increased the unified userscript from `3.0.6` to `3.0.7` and Mission Finder from `V10.6.172` to `V10.6.173`.

## [3.0.6] - 2026-08-22

### Fixed

- Made the stopped main-map state genuinely idle. The large Resource Administration and Mission Finder engines now initialise only for an actual mission, managed A/B worker, patient/prisoner transport page or Stations workspace; the lightweight V3 controller and Dispatch Centres popup support remain available on the map.
- Prevented an old session `background wanted` flag from silently creating Worker A/B when Nexus is re-enabled. Automatic continuation now requires a fresh 15-second page-navigation handoff or a browser-confirmed discarded-tab restoration.
- Kept normal sleep recovery for the still-open page and browser-discarded tabs while refusing stale intent left behind by disabling the userscript.
- Added idle-runtime and resume-lease regression coverage plus an exported `heavyRuntimeLoaded` diagnostic.

### Changed

- Increased the unified userscript from `3.0.5` to `3.0.6` and Mission Finder from `V10.6.171` to `V10.6.172`.

## [3.0.5] - 2026-08-22

### Fixed

- Replaced the absolute 512 MiB RAM trigger, which could disable warm Worker B within seconds on a naturally heavy MissionChief page, with an adaptive pressure guard.
- The guard now learns the normal A+B high-water baseline for the first 60 seconds, permits 192 MiB of subsequent growth, requires 15 seconds of continuous pressure and retains a firm 768 MiB ceiling.
- Added diagnostic evidence for baseline, peak, candidate duration, trigger reason and both pressure limits so future exports distinguish normal startup footprint from sustained growth.

### Performance and safety

- Normal A+B page warming now remains active through an expected high starting heap. The existing A-only fallback, clean boundary restart, transport clearing, sole-dispatch ownership and durable-register protections remain unchanged.
- Increased the unified userscript from `3.0.4` to `3.0.5` and Mission Finder from `V10.6.170` to `V10.6.171`.

## [3.0.4] - 2026-08-22

### Fixed

- Replaced the untracked Airfield cross-reference MutationObservers with an owned observer map. Every observer is now disconnected when Worker A changes document, reloads, is promoted, recycled or removed, preventing old mission DOM from being retained by the top controller.
- Managed frame teardown now removes its load handler, stops outstanding frame work, asks the embedded runtime to release observers/timers/large transient selection state, then blanks and detaches the frame.
- Embedded cleanup now drops requirement-preload rows, Unit Finder diagnostic working rows, selected-vehicle state, patient ledgers, stale modal references and iPhone document references before a mission frame is discarded.

### Memory and performance

- Reduced the normal pipeline from A/B/C to A plus one dormant B. B still warms the immediate next mission—the preload that produced the measured handoff benefit—while C no longer holds a third full MissionChief document and userscript runtime.
- Added adaptive RAM protection at 512 MiB reported JavaScript heap. It releases B immediately, switches the current run to A-only and schedules one clean A restart at the next verified mission boundary.
- Normal boundary recycling remains 12 advances or 8 minutes. Once RAM protection is active, A-only recycling tightens to 8 advances or 4 minutes with a 900 ms worker-free gap to give the browser a genuine reclamation window.
- Added controller diagnostics for heap size, preload limit, memory-pressure state/activation count and live Airfield observer count.

### Safety

- Memory actions only stop and recreate disposable mission frames. They do not clear MissionChief data or Command Nexus station, unit, personnel, training, naming, assignment or durable settings registers.
- Worker A remains the only dispatcher. Personal transport clearing, Alliance exclusion, hospital choice, shortage rotation and every exact vehicle/personnel rule are unchanged.

### Changed

- Increased the unified userscript from `3.0.3` to `3.0.4` and Mission Finder from `V10.6.169` to `V10.6.170`.

## [3.0.3] - 2026-08-22

### Performance

- Replaced repeated 1,500-row vehicle-ID signature construction during list loading with a bounded edge-and-midpoint structural signature. Vehicle counts, row counts, pagination-control transitions, progress evidence and loading indicators remain mandatory before selection can begin.
- Reduced only state-confirmed Mission Update and final vehicle-list stability windows, while retaining the established bounded timeouts and fail-closed zero-list behavior.
- Recycle A/B/C at a verified mission boundary after 12 native advances or 8 minutes, reducing long-session frame and detached-DOM accumulation without clearing any durable station, unit, personnel, training or settings register.
- Release a stale post-transport V2 queue guard immediately only when Worker A is complete, Auto Mode is confirmed running and its exact mission is still the authoritative top actionable personal mission.

### Fixed

- Personal Radio Transport Requests are now ordered by first-seen time, so a newer DOM row cannot continuously hide or reset the age of an older pending request. Cleared requests also release their retry bookkeeping.
- Dormant B/C pages now capture-block clicks, form submissions and `window.open` until transactional promotion grants sole storage ownership. Any dormant transport navigation or missing/inactive interaction guard opens the existing A-only circuit breaker.
- Added diagnostics for request age, blocked dormant interactions, post-transport fast releases and the active recycle thresholds.

### Safety

- Kept Worker A as the only operational dispatcher. B/C still perform zero vehicle-pagination clicks and cannot run Mission Finder before verified promotion.
- Did not change vehicle choice, shortage, dispatch, hospital, personnel, training or Mission Upgrade decisions. Rescue/Search Dog type `102`, Airfield Operations Supervisor type `80`, Mission Upgrade Ambulance type `5`, Mass Casualty Equipment type `33`, Flatbed Recovery type `105`, HGV Recovery type `106`, the universal 20-advance shortage cooldown and personal-only transport rules remain protected by the complete regression suite.
- Added a permanent speed/transport/isolation regression covering bounded vehicle polling, oldest-first transport fairness, verified stale-guard release and dormant interaction blocking.

### Changed

- Increased the unified userscript from `3.0.2` to `3.0.3` and Mission Finder from `V10.6.168` to `V10.6.169`.

## [3.0.2] - 2026-08-22

### Fixed

- Quarantined a mission after the 16-second post-dispatch hard recovery so the priority controller cannot route Worker A back to the same stale `NEW` row. The normal 20-advance safety window applies, but an authoritative mission-state or requirement change releases this specific quarantine early.
- Personal Radio transports present at run start, page resume, mission wait or hard recovery now receive the exact transport-only Worker A before another mission is opened; Alliance requests remain excluded.
- Fatal controller errors now snapshot diagnostics, clear only operational V2 queue/running state and explicitly release A/B/C. Worker A can no longer continue processing after V3 reports `ERROR`.
- B/C remain dormant page-warm mission preloads but no longer expand the complete vehicle table. Only promoted Worker A loads the full list, cutting the multi-frame heap pressure seen with 1,927-row vehicle lists.
- Added a permanent regression for stalled-dispatch quarantine and release, transport-first startup, fatal all-worker teardown, priority locking and page-only B/C warming.

### Changed

- Increased the unified userscript from `3.0.1` to `3.0.2`; Mission Finder remains `V10.6.168`.

## [3.0.1] - 2026-08-22

### Added

- Added a V3 low-supply lifecycle: when the active worker sees fewer than two next personal missions, it uses MissionChief's exact Dispatch-only action, leaves one mission in reserve, completes any patient/prisoner transport and requests a zero-worker pause.
- Added automatic resume after at least two actionable personal missions remain stable for 1.5 seconds. Resume always creates a fresh Worker A; B/C return only as dormant preloads.
- Added scheduled A/B/C lifecycle recycling at a verified mission boundary after 20 native mission advances or 15 minutes, plus explicit embedded-runtime teardown before every managed frame is blanked and removed.

### Safety

- Preserved standalone Mission Finder queue behavior: outside a sole-owner V3 Worker A, only `Next Mission (0)` is the final-queue signal.
- Kept low-supply teardown transport-aware and prevented both native Dispatch & Next and saved Dispatch & Share continuation from opening the reserved mission. A personal radio request that arrives during the pause receives one temporary transport-only Worker A, which releases itself after clearing or a bounded retry timeout.
- Bounded controller mission-identity and handled-event caches. Runtime cleanup does not clear MissionChief data or Command Nexus station, unit, personnel, training and durable setting registers.
- Added a permanent regression for the two-mission watermark, stable resume, transport gates, boundary recycling, explicit frame teardown and durable-register preservation.

### Changed

- Increased the unified userscript from `3.0.0` to `3.0.1` and Mission Finder from `V10.6.167` to `V10.6.168`.

## [3.0.0] - 2026-08-21

### Added

- Promoted the tested single-install V3 master to the canonical production source. Its ownership controller starts at `document-start`, then starts the complete embedded Command Nexus runtime at its established DOM-ready boundary.
- Added one active dispatcher (Worker A) with two isolated dormant warm preloads (Workers B/C). Promotion requires the activation token, expected mission, active-frame identity and sole operational-storage ownership before Mission Finder can start.
- Added a transport-aware post-dispatch watchdog: an 8-second soft queue reconcile preserves the final-dispatch duplicate guard, a 16-second hard recovery prefers a verified warm next mission, and a repeated same-mission hard recovery inside two minutes fails closed.
- Added exact Airfield Operations Supervisor type `80` routing and separate maximum-truck towing ingestion selecting one exact HGV Recovery type `106` per truck. The existing maximum-car capacity rule remains one exact Flatbed Recovery type `105` per two cars.

### Safety

- Increased Mission Finder to `V10.6.167`; exact selection, selected-unit verification and generic-fallback protection share the same Airfield and towing classifiers.
- Increased B/C target-rotation retention and freeze rotation during transport, promotion and post-dispatch recovery so warm workers are not repeatedly destroyed by transient queue churn.
- Added V3 merge, watchdog, Airfield and HGV regressions while preserving transport clearing, Rescue/Search Dog type `102`, Mission Upgrade Ambulance type `5`, the universal 20-advance shortage cooldown and sole-dispatch-owner rules.
- Preserved computer-sleep recovery: stale B/C preloads are discarded and Worker A is recovered without allowing V3 itself to click Dispatch or guess a transport destination.

### Changed

- Removed obsolete one-use builders, trigger files and historical repair/inspection workflows from permanent repository automation.
- Centralized canonical release and component-version validation in `scripts/validate-userscript.mjs`; permanent behavioral regressions are now version-agnostic and automatically discovered by the validation workflow.
- Added a permanent Repository Quality gate that parses every retained GitHub Actions workflow with a pinned YAML parser before repository checks continue.
- Increased the unified userscript from `2.0.3` to `3.0.0` and made V3 the production installation path.

## [2.0.3] - 2026-08-21

### Fixed

- Mission Update now converts the exact `Any vehicle` requirement family into one normal Ambulance and selects/verifies only native vehicle type `5`; HEMS type `9`, Ambulance Officers and every other vehicle type remain excluded.
- Added explicit Rescue Dog and Search Dog Unit cross-reference aliases while preserving the established fail-closed native Search Dog Unit type `102` selector.

### Safety

- Added permanent regressions for the exact upgrade conversion, one-vehicle cap, type-5 ownership, selected-unit verification, cross-reference aliases and exclusion of unrelated vehicles.
- Increased Mission Finder from `V10.6.165` to `V10.6.166` and the unified userscript from `2.0.2` to `2.0.3`. Resource Administration remains `V4.2.8`, Unit Naming remains `3.3.27`, Station Naming remains `1.3.22`, and Personnel Assignment remains `1.3.12`.

## [2.0.2] - 2026-08-21

### Added

- Added a V2-owned dormant-preload lifecycle for explicitly named Nexus V3 B/C frames. Dormant frames may load MissionChief's native mission page and vehicle pagination, but Mission Finder does not mount its UI, observers, alert override or operational Auto Mode state until a validated sole-owner promotion.
- Added a synchronous, fail-closed promotion bridge that verifies the activation token, expected mission ID, active-frame name and V3 storage ownership before starting Mission Finder in the warm document.

### Safety

- Normal top-level pages, direct mission pages and ordinary child frames retain the established V2 behaviour. The dormant path applies only to the explicit `mcn-v3-pipeline-preload-` frame contract.
- Increased Mission Finder from `V10.6.164` to `V10.6.165` and the unified userscript from `2.0.1` to `2.0.2`. Resource Administration remains `V4.2.8`, Unit Naming remains `3.3.27`, Station Naming remains `1.3.22`, and Personnel Assignment remains `1.3.12`.

## [2.0.1] - 2026-08-19

### Changed

- Publication recovery for the clean V2 baseline. No MissionChief runtime behaviour changes; this creates a normal canonical userscript version update so Greasy Fork can synchronize V2.
- Increased the unified userscript version from `2.0.0` to `2.0.1`.

## [2.0.0] - 2026-08-19

### Changed

- Reset the production line to the exact proven Command Nexus `1.0.127` operational baseline and promoted that code to the new major `2.0.0` release line.
- Deliberately abandoned the Mission Analytics / Sharing & Sync / Google Apps Script logger work introduced after `1.0.127`. V2 contains no external analytics uploader, logger outbox, activity recorder, hard-coded Apps Script endpoint or logger backend integration.
- Preserved Mission Finder `V10.6.164`, Resource Administration `V4.2.8`, Unit Naming `3.3.27`, Station Naming `1.3.22` and Personnel Assignment `1.3.12` from the proven rollback baseline.

### Safety

- Added a permanent `check-no-external-logger-v200.mjs` regression so the abandoned logger stack cannot silently return to the canonical userscript or repository integration paths.
- Historical `1.1.x` commits, tags and releases remain historical records only; they are not part of the V2 production source.

## [1.0.127] - 2026-08-16

### Added

- Completed issue #18 by enabling live Aircraft Rescue and Firefighting, Co-Responder, Fire Drone, High Volume Pump and Fire Lifeguard Personnel Assignment profiles with exact UK vehicle types, training keys, seat targets and Fire Station scopes.
- Completed issue #19 by enabling every listed SAR, Mountain Rescue, Coastguard and Lifeboat profile with exact vehicle, academy, live-seat and eligible-building mappings, plus a live full-service batch.
- Added same-origin station vehicle-API authority for HVP pods, Boat, Flood, Hovercraft, Rescue Watercraft and Inland Rescue Boat trailers. Explicit `tractive_vehicle_id` links are preferred, a unique one-to-one pair is the only fallback, and ambiguity fails closed without assigning an unrelated tractor.
- SAR batch runs now merge overlapping qualifications onto the same actual crew, preventing Mud/Flood, Search/Flood, Drone/Flood and other shared-vehicle rules from competing for separate seats.
- Recorded sanitized issue #18/#19 mapping decisions and added permanent Fire, SAR, companion-link, overlap, quantity, building-scope and live-batch regressions.
- Added singular, plural and `Required` cross-reference aliases for **Aerial Appliance Truck(s) or Rescue Stairs**.
- The shared Unit Finder and Mission Update selector now exhausts exact type `78` Rescue Stairs first, then fills only the remaining quantity with exact type `17` Combined Aerial Rescue Pumps (CARPs).
- Both exact vehicle types count toward selected-unit verification, while Water Ladders, Rescue Pumps and every other Fire or Airfield vehicle remain excluded from this combined requirement.
- Blocked generic quick-select fallback for this specialist mixed pool and added a permanent regression for alias recognition, exact type ownership, ordering, remainder selection and selected-unit accounting.
- Increased Mission Finder from `V10.6.163` to `V10.6.164`, Personnel Assignment from `1.3.11` to `1.3.12`, and the unified userscript from `1.0.126` to `1.0.127`. Resource Administration remains `V4.2.8`, Unit Naming remains `3.3.27`, and Station Naming remains `1.3.22`.

## [1.0.126] - 2026-08-16

### Fixed

- Closed issue #331 by repairing the trained-personnel live-verification candidate pool broken in `v1.0.123`.
- Exact compatible vehicles with missing or stale Personnel Register entries can now enter the live assignment-page scan that creates fresh qualification evidence.
- Removed the circular gate where the pre-verification pool required a vehicle to already have the fresh evidence that its own scan was responsible for producing.
- Preserved strict fail-closed final selection, readiness and Auto Mode dispatch: missing, stale, partial or wrong-type evidence still cannot satisfy a trained-personnel requirement.
- Added sanitized incident evidence and a permanent regression that separately locks pre-verification type eligibility and final evidence-backed selection.
- Increased Mission Finder from `V10.6.162` to `V10.6.163` and the unified userscript from `1.0.125` to `1.0.126`. Resource Administration remains `V4.2.8`, Unit Naming remains `3.3.27`, Station Naming remains `1.3.22`, and Personnel Assignment remains `1.3.11`.

## [1.0.125] - 2026-08-16

### Added

- Completed issue #17 by enabling live Ambulance Officer, HART, Tactical Command, SORT, Midwifery and Specialist Paramedic Personnel Assignment profiles with exact MissionChief UK vehicle types, academy keys and native seat targets.
- Added explicit specialist station scopes for Ambulance Stations, Small Ambulance Stations, Urgent Treatment Centers, Home Response Locations, HART Bases and GP Surgeries according to each eligible vehicle family.
- Enabled `Run all Medical profiles` in specialist-first order with Critical Care Ambulances last, while preserving the established standalone Critical Care engine.
- Reused the verified background assignment path for both Preview and Live, including exact live-page vehicle-type rejection, per-vehicle confirmation and final station-wide verification.
- Kept training shortfall and assignment shortfall separate for quantities above one and added permanent mapping, batch-order, scope, preview/live and verification regression coverage.
- Recorded the current source evidence and resolved the stale ATV association: exact type `30` ATV Carrier uses HART `hazard_response_ems`; Tactical Command `elw2_ems` belongs to exact type `31` Ambulance Control Unit.
- Increased Personnel Assignment from `1.3.10` to `1.3.11` and the unified userscript from `1.0.124` to `1.0.125`. Resource Administration remains `V4.2.8`, Unit Naming remains `3.3.27`, Station Naming remains `1.3.22`, and Mission Finder remains `V10.6.162`.

## [1.0.124] - 2026-08-16

### Fixed

- Resolved issue #300 from user-supplied native MissionChief UK mission-row evidence: Search Dog Unit (SAR) is exact `vehicle_type_id` `102`, not `101`.
- Aligned Rescue Dog and Search Dog Unit candidate selection and selected-unit verification with Unit Naming's existing exact type-`102` identity.
- Retained strict specialist behavior: Police Dog / Dog Support Unit wording remains separate, and no generic vehicle fallback can satisfy Search Dog demand.
- Added a sanitized evidence record for the native mission route and row attributes plus a permanent consistency regression that checks the Mission Finder selector and Unit Naming map use the same verified ID.
- Increased Mission Finder from `V10.6.161` to `V10.6.162` and the unified userscript from `1.0.123` to `1.0.124`. Resource Administration remains `V4.2.8`, Unit Naming remains `3.3.27`, Station Naming remains `1.3.22`, and Personnel Assignment remains `1.3.10`.

## [1.0.123] - 2026-08-16

### Fixed

- Aligned trained-personnel selection with the locked strict fail-closed safety contract across Unit Finder, Mission Update and Auto Mode.
- Only fresh, complete, exact-vehicle Personnel Register evidence now selects and satisfies qualification-sensitive requirements; correct vehicle type or nominal seating capacity alone is insufficient.
- Removed the untrained correct-type fallback phase. Missing, stale and partial evidence remains an explicit verified-training shortage and keeps the mission not-ready.
- Auto Mode now stops without clicking Dispatch when a staffing or verified qualification shortage remains instead of dispatching selected units to skip the mission.
- Added permanent coverage for missing, stale, partial and fully verified Personnel Register states, strict satisfaction, blocked UI state and the no-dispatch Auto Mode path.
- Increased Mission Finder from `V10.6.160` to `V10.6.161` and the unified userscript from `1.0.122` to `1.0.123`. Resource Administration remains `V4.2.8`, Unit Naming remains `3.3.27`, Station Naming remains `1.3.22`, and Personnel Assignment remains `1.3.10`.

## [1.0.122] - 2026-08-16

### Fixed

- Corrected the supplied SAR mission case where `Required Drones` reported no available unit because Nexus treated the wording as Police Drone type `91` only.
- `Require Drone(s)`, `Requires Drone(s)` and `Required Drone(s)` now use a strict generic Drone-family mode that accepts exact type `89` **Drone Vehicle SAR HQ** and exact type `91` **Police Drone Vehicle**, ordered by best arrival.
- Explicit `Police Drone(s)` remains type `91` only, explicit `Police Helicopter(s)` remains type `11` only, and `Police Helicopter or Drone(s)` retains Police Drone-first with Police Helicopter fallback.
- Bare `Drone` and `Drones` prose remains excluded, preventing unrelated cross-service text from creating dispatch demand.
- Added permanent regression coverage for both exact Drone families, strict service-specific modes, shared fresh/update selection, selected-unit verification, ETA ordering and the bare-word guard.
- Increased Mission Finder from `V10.6.159` to `V10.6.160` and the unified userscript from `1.0.121` to `1.0.122`. Unit Naming remains `3.3.27`, Station Naming remains `1.3.22`, and Personnel Assignment remains `1.3.10`.

## [1.0.121] - 2026-08-15

### Fixed

- Fixed the standalone `/leitstellenansicht` timing failure where Dispatch Centre controls rendered first and an empty station-membership map was cached before the native station cards finished loading.
- Unit Naming and Station Naming now rescan the current native `leitstelle_building_id` rows whenever their normal Refresh Stations path runs, so Dispatch Centre → Service → Station Type → Start From rebuilds from the complete popup DOM.
- Refresh Dispatch Centres now reapplies the refreshed membership map to Unit and Station Naming snapshots that are already loaded instead of leaving their `dispatchCentreId` values stale.
- Preserved exact native-row membership authority, true Unassigned/default stations, the same-origin document graph, standalone `window.opener` isolation and the verified background-only rename workflow.
- Added a permanent late-render regression covering the initial empty snapshot, subsequent native-row render, forced recovery, existing-snapshot rebinding and downstream Fire & Rescue Service filtering.
- Increased Unit Naming from `3.3.26` to `3.3.27`, Station Naming from `1.3.21` to `1.3.22`, and the unified userscript from `1.0.120` to `1.0.121`. Personnel Assignment remains `1.3.10` and Mission Finder remains `V10.6.159`.

## [1.0.120] - 2026-08-15

### Fixed

- Resource Administration now recognises a popped-out top-level `/leitstellenansicht` window as an authoritative Stations workspace when its native station entries are connected, even though those links do not carry the desktop lightbox classes.
- Station Naming and Unit Naming now run the same verified background native-form workflow from normal, embedded and standalone Stations layouts without opening station or vehicle pages.
- The standalone window reads its own MissionChief DOM and same-origin forms; it does not inspect or depend on `window.opener`.
- Preserved the same-origin embedded-frame gate, desktop Stations lifecycle and iOS rendered-entry lifecycle while keeping mission, building-detail and unrelated frames excluded.
- Added executable regression coverage for the exact standalone lifecycle failure, background-only Station and Unit saves, disconnected-entry rejection, unrelated-page rejection and existing embedded/desktop paths.
- Increased Unit Naming from `3.3.25` to `3.3.26`, Station Naming from `1.3.20` to `1.3.21`, and the unified userscript from `1.0.119` to `1.0.120`. Personnel Assignment remains `1.3.10` and Mission Finder remains `V10.6.159`.

## [1.0.119] - 2026-08-15

### Changed

- Station Naming now reads the station and its exact native edit form through same-origin background requests, preserves MissionChief's hidden fields and CSRF token, and verifies the saved name without opening a station lightbox.
- Unit Naming now reads station vehicle tables and each exact native vehicle edit form in the background, rejects mismatched vehicle IDs or form actions, and counts a rename only after a fresh edit-page verification.
- Personnel Assignment remains on its established background GET/POST path, with a permanent regression contract preventing link clicks, lightboxes, iframe navigation, or unverified assignment counts.
- Stop and lifecycle cleanup now abort active Station and Unit Naming requests.
- Added permanent cross-workflow regression coverage for native-form integrity, same-origin resource validation, background-only operation, and post-save verification ordering.
- Increased Unit Naming from `3.3.24` to `3.3.25`, Station Naming from `1.3.19` to `1.3.20`, Personnel Assignment from `1.3.9` to `1.3.10`, and the unified userscript from `1.0.118` to `1.0.119`.

## [1.0.118] - 2026-08-15

### Changed

- Fire Engines or RIVs now selects exact type-76 RIVs first and fills only the remaining requirement with exact type-16 Rescue Pumps.
- Mixed RIV and Rescue Pump selections count together toward the row while Water Ladders and Combined Aerial Rescue Pumps remain excluded.
- Added permanent regression coverage for RIV-first ordering, exact remainder top-up, selection caps and selected-unit verification.
- Advanced the Mission Finder engine from V10.6.158 to V10.6.159.
- Increased the unified userscript version from `1.0.117` to `1.0.118`.

## [1.0.117] - 2026-08-15

### Changed

- Railway Police Officer requirements now use the shared trained PSU and IRV vehicle pool.
- A live-verified type-51 PSU can contribute up to 9 Railway Police Officers, while type-8 IRVs contribute 2 and handle smaller remainders.
- Added regression coverage for Railway Police PSU planning and nine-officer trained coverage.
- Advanced the Mission Finder engine from V10.6.157 to V10.6.158.
- Increased the unified userscript version from `1.0.116` to `1.0.117`.

## [1.0.116] - 2026-08-15

### Changed

- Mission Update now recalculates the live requirement target from Missing on mission, En-route, Still needed, and Selected before every click.
- A zero live shortage hard-stops stale mission-definition selections; 1 missing, 1 en-route, and 0 still needed now selects no additional unit.
- Advanced the Mission Finder engine from V10.6.156 to V10.6.157.
- Increased the unified userscript version from `1.0.115` to `1.0.116`.

## [1.0.115] - 2026-08-15

### Changed

- Mission Update now treats each Missing on mission Still needed value as the current selection target and stops when the live Selected counter reaches it.
- BASU, Welfare, HazMat, and HazMat/CBRN requirements now share Operational Support Units and dispatch only the largest Still needed amount.
- Mission Finder increased from V10.6.155 to V10.6.156.
- Increased the unified userscript version from `1.0.114` to `1.0.115`.

## [1.0.114] - 2026-08-15

### Fixed

- Completed the Auto Mode `Release Prisoners` flow after MissionChief replaces the cell-selection iframe with the exact `<div class="alert alert-success">The prisoners were released.</div>` result.
- Captured the owning Vue `.vm--container` and stable `data-modal` identity before release navigation, then reacquired that same modal's live `span.lightbox-close[title="Close"]` control after the old iframe document detached.
- Added a scoped Font Awesome `xmark` fallback that resolves the SVG to its interactive close ancestor without allowing an unrelated visible modal to be dismissed.
- Preserved the current-mission release selector, duplicate-click guard, bounded waits, verified-close restart gate and fail-closed Auto Mode stop when either the exact success result or its owned close control cannot be confirmed.

### Regression coverage

- Added `scripts/check-auto-prisoner-release-close-v10114.mjs` with the supplied success result and Vue close-span structure.
- Covered pre-navigation owner capture, detached result-document discovery, rejection of an unrelated modal with identical success text, live close-control reacquisition and close verification before Auto Mode restarts.
- Extended the existing prisoner cell gate regression to require owner capture before the release click and exact success confirmation before the result modal is closed.

### Changed engine baseline

- Command Nexus increased from `1.0.113` to `1.0.114`.
- Mission Finder increased from `V10.6.154` to `V10.6.155`.
- Unit Naming remains `3.3.24`.
- Station Naming remains `1.3.19`.
- Personnel Assignment remains `1.3.9`.

## [1.0.113] - 2026-08-14

### Fixed

- Restored Auto Mode prisoner transport handling for MissionChief's current structured `Cell Selection` screen. The new markup identifies the active chooser with `data-transport-request-type="prisoner"` instead of the older explanatory sentence.
- Scoped prison destinations to the active prisoner request and continued to select only the first visible, enabled `btn-success` destination with available cells. Full `btn-danger` destinations are ignored, so the supplied DALGETY BAY zero-cell row is skipped and CARDENDEN is selected.
- Retained the legacy prisoner-alert detection as a fallback for older MissionChief page variants.

### Regression coverage

- Added `scripts/check-auto-prison-cell-success-v10113.mjs` using the supplied current transport-request structure and destination ordering.
- Covered a red zero-cell destination first, stale zero-capacity and disabled green rows, first valid green selection, later green rows, active-request scoping, and the legacy alert fallback.

### Changed engine baseline

- Command Nexus increased from `1.0.112` to `1.0.113`.
- Mission Finder increased from `V10.6.153` to `V10.6.154`.
- Unit Naming remains `3.3.24`.
- Station Naming remains `1.3.19`.
- Personnel Assignment remains `1.3.9`.

## [1.0.112] - 2026-08-14

### Fixed

- Restored Unit Naming and Station Naming in a standalone `/leitstellenansicht` window. MissionChief omits type-7 Dispatch Centre cards from that layout and exposes the same native ID/name pairs through `.leitstelle_selection[leitstelle]` navbar controls instead.
- Retained type-7 building-card discovery in the embedded Stations layout, with full type-7 rows taking precedence when both native layouts expose the same Dispatch Centre.
- Kept each station card's `leitstelle_building_id` as the authority for Dispatch Centre membership, including the `Unassigned / default` group.
- Removed any need for the popout to depend on or inspect its opener window; all required centre and station data is read from its own MissionChief DOM.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-popout-v10112.mjs` using the exact standalone layout from the supplied live HTML: navbar Dispatch Centre controls, membership-bearing station cards, and no type-7 cards.
- Covered centre-list readiness, station-assignment readiness, Unit/Station Naming filtering, and the unassigned group while preserving existing embedded-layout regressions.

### Changed engine baseline

- Command Nexus increased from `1.0.111` to `1.0.112`.
- Unit Naming increased from `3.3.23` to `3.3.24`.
- Station Naming increased from `1.3.18` to `1.3.19`.
- Mission Finder remains `V10.6.153`.
- Personnel Assignment remains `1.3.9`.

## [1.0.111] - 2026-08-14

### Changed

- Changed building type `22` response locations to town-only Station Naming. A station previously proposed as `ABERDOUR-FO1` is now named exactly `ABERDOUR`.
- Removed the vehicle role and station sequence from type-22 station names. Unit Naming now owns both layers, producing names such as `ABERDOUR-FO-1`, `ABERDOUR-AO-1`, `ABERDOUR-OTL-1`, and `ABERDOUR-DSU-1`.
- Removed the type-22 vehicle-table dependency from Station Naming. These response locations no longer need Station Naming to identify an FO, AO or OTL vehicle before the station can be named.
- Retained the existing service suffix and station sequence rules for ordinary fire, ambulance, police and other supported station types.

### Regression coverage

- Added `scripts/check-type22-town-only-naming-v10111.mjs` around the exact live `ABERDOUR-FO1` case.
- Covered town-only station output, FO/AO/OTL/DSU role ownership, Unit Naming sequences `1` and `2`, removal of the duplicate FO layer, and unchanged ordinary station naming.

### Changed engine baseline

- Command Nexus increased from `1.0.110` to `1.0.111`.
- Station Naming increased from `1.3.17` to `1.3.18`.
- Mission Finder remains `V10.6.153`.
- Unit Naming remains `3.3.23`.
- Personnel Assignment remains `1.3.9`.

## [1.0.110] - 2026-08-14

### Fixed

- Changed Station Naming to prefer MissionChief's coordinate reverse-address response over the flattened Move Building text field. The Move page remains the fallback when coordinates or reverse lookup are unavailable.
- Added guarded recovery for Move Building values that repeat the post town after a locality. The exact live value `Ladywalk, KY10 3EX Anstruther Easter Anstruther` now resolves to `ANSTRUTHER` instead of `ANSTRUTHER EASTER ANSTRUTHER`.
- Preserved ordinary multi-word post towns such as `South Queensferry`, `St Andrews`, `Grantown-on-Spey`, and `Bridge of Allan`.

### Regression coverage

- Added `scripts/check-station-move-address-v10110.mjs` using the exact failed Move Building value reported from the live Station Naming run.
- Covered reverse-address priority, Move-page fallback, an unseparated country suffix, repeated multi-word post towns, and unchanged ordinary multi-word post towns.

### Changed engine baseline

- Command Nexus increased from `1.0.109` to `1.0.110`.
- Station Naming increased from `1.3.16` to `1.3.17`.
- Mission Finder remains `V10.6.153`.
- Unit Naming remains `3.3.23`.
- Personnel Assignment remains `1.3.9`.

## [1.0.109] - 2026-08-13

### Fixed

- Preserved MissionChief reverse-address line breaks as address-component separators before Station Naming extracts the post town. This stops responses such as `Anstruther Easter` plus `Anstruther` being flattened into the invalid town name `ANSTRUTHER EASTER ANSTRUTHER`.
- Restored a mandatory station sequence to every generated station name, including building type `22`. The format is now consistently town, service and station sequence, such as `ANSTRUTHER-FS1`, `ANSTRUTHER-FO1`, and `ANSTRUTHER-FO2`.
- Added a per-run sequence registry that preserves valid existing numbers, allocates the first free number to unnumbered stations, and separates duplicate existing numbers deterministically.
- Confirmed Unit Naming uses the complete numbered station name before adding the vehicle type and vehicle sequence. A Fire Officer at `ANSTRUTHER-FO1` is therefore named `ANSTRUTHER-FO1-FO-1`; the station `FO` and vehicle `FO` represent separate layers and are both intentional.

### Regression coverage

- Added `scripts/check-station-unit-naming-chain-v10109.mjs` to execute reverse-address normalization, post-town extraction, station sequence allocation, station-name generation and Unit Naming as one chain.
- Covered HTML and newline address separators, same-town officer station allocation, valid existing sequence preservation, duplicate sequence repair, all three officer service IDs, and unchanged ordinary station/unit naming.

### Changed engine baseline

- Command Nexus increased from `1.0.108` to `1.0.109`.
- Station Naming increased from `1.3.15` to `1.3.16`.
- Mission Finder remains `V10.6.153`.
- Unit Naming remains `3.3.23`.
- Personnel Assignment remains `1.3.9`.

## [1.0.108] - 2026-08-13

### Added

- Added Station Naming support for MissionChief building type `22` using the exact vehicle held at that location: type `20` produces `-OTL`, type `3` produces `-FO`, and type `34` produces `-AO`.
- The dynamic rule reads only native `vehicle_type_id` attributes from the station vehicle table; it does not infer officer identity from mutable display text.
- Dynamic officer locations do not preserve a stale numeric suffix, so `KIRK-AO1` is proposed as exactly `KIRK-AO`, `KIRK-FO`, or `KIRK-OTL` according to the vehicle found.
- Empty locations, unsupported vehicles, and locations containing more than one distinct supported officer type fail closed with an explicit skip reason instead of risking an incorrect name.

### Regression coverage

- Added `scripts/check-officer-station-naming-v10108.mjs` to execute the real building-type mapping, exact vehicle-table parser, dynamic suffix resolver, and station-name builder.
- Covered all three verified vehicle IDs, duplicate rows of one type, `data-vehicle-type-id`, empty/unsupported input, ambiguous mixed officer types, removal of the stale dynamic number, and preservation of ordinary station numbering.

### Changed engine baseline

- Command Nexus increased from `1.0.107` to `1.0.108`.
- Station Naming increased from `1.3.14` to `1.3.15`.
- Mission Finder remains `V10.6.153`.
- Unit Naming remains `3.3.23`.
- Personnel Assignment remains `1.3.9`.

## [1.0.107] - 2026-08-13

### Fixed

- Completed the Road Rail Unit's existing partial Unit Naming integration using its verified native type `107` identity.
- Changed the naming label from the internal abbreviation `RRU` to MissionChief's canonical `Road Rail Unit` wording while retaining the `RRU` callsign.
- Moved the class from the incorrect Airfield selector to Fire and retained it under All classes.
- Replaced the aircraft-themed icon with the service-matched 🚒🚆 rail/fire icon.
- Preserved Mission Finder's exact type-107-only selection and verification contract, including separation from the type `59` Coastguard Rope Rescue Unit.

### Regression coverage

- Added `scripts/check-road-rail-unit-naming-class-v10107.mjs` to execute the real Unit Naming class-option builder and callsign generator.
- Covered the native type, canonical label, Fire and All availability, Airfield exclusion, icon, generated callsign and strict Mission Finder matcher.

### Changed engine baseline

- Command Nexus increased from `1.0.106` to `1.0.107`.
- Unit Naming increased from `3.3.22` to `3.3.23`.
- Mission Finder remains `V10.6.153`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

## [1.0.106] - 2026-08-13

### Added

- Added native type `106` HGV Recovery Vehicle to Unit Naming with the `HGV` callsign and a distinct 🚛 icon.
- Changed Unit Naming's type `105` display label to MissionChief's live `Recovery Vehicle` wording while preserving its established `FRV` callsign and 🛻 icon.
- Both recovery classes now appear under Recovery and All classes. The existing `Flatbed Recovery Vehicle` naming alias remains compatible.
- Mission Finder's exact type-105 Flatbed and type-106 HGV recovery selection routes remain unchanged.

### Regression coverage

- Added `scripts/check-recovery-unit-naming-classes-v10106.mjs` to execute the real Unit Naming class-option builder and callsign generator for both recovery types.
- Covered Recovery and All selector availability, exact type IDs, distinct icons, generated callsigns and legacy Flatbed Recovery naming compatibility.
- Preserved the Police Unit Naming, towing/recovery selector and current Mission Finder regression baselines.

### Changed engine baseline

- Command Nexus increased from `1.0.105` to `1.0.106`.
- Unit Naming increased from `3.3.21` to `3.3.22`.
- Mission Finder remains `V10.6.153`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

## [1.0.105] - 2026-08-13

### Added

- Completed issue #295 using a sanitized live MissionChief UK Police purchase-page capture: type `13` Armed Response Vehicle (`ARV`), type `19` Joint Response Unit (`JRU`), type `24` Traffic Car (`TC`) and type `52` Firearms Personnel Carrier (`FPC`).
- Added the four exact native mappings and naming rules to Unit Naming. Each class now appears under both Police and All classes and produces its approved callsign code with a distinct service-matched icon.
- Recorded the verified IDs, canonical labels, approved codes and sanitized capture method in the permanent architecture contract and evidence record.
- Mission Finder vehicle selection, Police requirement aliases and existing type-25 Armed Traffic Car behaviour remain unchanged.

### Regression coverage

- Added `scripts/check-police-unit-naming-classes-v10105.mjs` to execute the real Unit Naming class-option builder for Police and All classes and verify generated callsigns for all four mappings.
- Refreshed obsolete release-baseline tokens across the retained regression scripts and repaired stale dashboard/preload harness assumptions, allowing all 69 permanent regressions to run successfully against the current source again.
- Preserved the canonical userscript validator, repository integrity checks and the current Mission Finder regression baseline.

### Changed engine baseline

- Command Nexus increased from `1.0.104` to `1.0.105`.
- Unit Naming increased from `3.3.20` to `3.3.21`.
- Mission Finder remains `V10.6.153`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

## [1.0.104] - 2026-08-12

### Added

- Added issue #304's persistent Auto Mode stop evidence to Mission Control. Automatic safety stops now show a compact red **AUTO STOPPED** flag, the local stop date/time and the exact supplied reason.
- The stop record is stored independently from the live status message, so mission changes, document reloads and later status updates cannot erase the explanation.
- A recreated Mission Control panel restores the saved flag and reason. Starting Auto Mode clears the record; deliberately pressing **Auto Mode: Stop** does not create a false automatic-stop warning.
- Invalid or corrupt saved stop data is discarded safely without blocking Mission Control.
- Existing safety-stop decisions, selector logic, dispatch behaviour and Police Unit Naming issue #295 remain unchanged.

### Regression coverage

- Added `scripts/check-auto-stop-reason.mjs` to exercise real stop-record storage, flag rendering, exact-reason retention, local timestamp display, cross-panel restoration, live-status isolation, restart clearing and corrupt-data recovery.
- Preserved the canonical userscript validator, repository integrity checks and current Ambulance Officer/Mission Update authority regressions.

### Changed engine baseline

- Command Nexus increased from `1.0.103` to `1.0.104`.
- Mission Finder increased from `V10.6.152` to `V10.6.153`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

## [1.0.103] - 2026-08-12

### Fixed

- Completed issue #299 for genuinely fresh missions: the Ambulance Officer threshold now receives the ordinary Ambulance total already calculated from the current patient badge count, even when no explicit patient `We need: Ambulance` row exists.
- Fresh patient badge demand and explicit patient Ambulance rows are collapsed to the larger authoritative total for threshold comparison, preventing the same patient demand from being counted twice.
- The late-render fresh-mission recovery path now applies the same threshold and exact type-34 selector after patient data appears.
- Late visible, legacy-list and refetched mission-help fallbacks now retain the configured fresh-mission rules instead of silently bypassing them.
- Existing positive Officer demand, selected/on-mission Officer coverage, live shortage authority, the separate High-risk Missing Person Ambulance rule and the Upgrade exclusion remain unchanged.

### Regression coverage

- Extended `scripts/check-ambulance-officer-threshold-v10101.mjs` with the real missed state: six fresh patient-badge Ambulances, no mission-help Ambulance row and no explicit patient Ambulance alert must select one Officer at threshold five.
- Added equal-threshold, badge/explicit-row de-duplication, larger-explicit-total, preloaded Vehicle Load and late fresh-recovery assertions.
- Preserved the chained High-risk Missing Person, Mission Update single-pass and Missing-on-mission authority regressions.

### Changed engine baseline

- Command Nexus increased from `1.0.102` to `1.0.103`.
- Mission Finder increased from `V10.6.151` to `V10.6.152`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

## [1.0.102] - 2026-08-12

### Fixed

- Fixed issue #299: the configured Ambulance Officer threshold now runs consistently through Unit Finder, Auto Mode and Mission Update, including cycles where the current live Missing Vehicles/Personnel table is authoritative.
- The active path counts only its authoritative positive ordinary Ambulance demand and adds exactly one Ambulance Officer when that count is strictly greater than the configured threshold.
- Ambulance Officer selection now prefers exact MissionChief vehicle type `34`, with an exact-name fallback only when MissionChief does not expose a vehicle type ID.
- Existing positive Officer demand, an already-selected Officer, a mission-scoped Officer selected by an earlier pass, or a confirmed satisfied live Officer requirement prevents duplication.
- The separate High-risk Missing Person Ambulance rule remains fresh-mission-only and is not enabled during Mission Update.

### Regression coverage

- Extended `scripts/check-ambulance-officer-threshold-v10101.mjs` to cover fresh Unit Finder, live-authority Unit Finder, Auto Mode, manual/post-selection Mission Update, strict type-34 matching and duplicate protection.
- Preserved the chained High-risk Missing Person regression and re-ran the Mission Update single-pass and Missing-on-mission authority checks against the current release baseline.

### Changed engine baseline

- Command Nexus increased from `1.0.101` to `1.0.102`.
- Mission Finder increased from `V10.6.150` to `V10.6.151`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

## [1.0.101] - 2026-08-12

### Added

- Added a new Settings checkbox, **Automatically add 1 Ambulance Officer**, alongside the existing High-risk Missing Person Ambulance rule.
- Added a user-set numeric threshold from `0` to `99`, defaulting to `5` while the rule remains disabled by default.
- On fresh Unit Finder and Auto Mode requirement loads, one **Ambulance Officer** is added when the final ordinary Ambulance demand is strictly greater than the configured threshold. Example: threshold `5` triggers at `6` Ambulances.
- Multiple ordinary Ambulance rows are summed across fresh mission and current patient requirements, an existing positive Ambulance Officer requirement in either source prevents duplication, and the configured row appears in the preloaded Vehicle Load display.

### Preserved safety and authority

- The existing **Always include 1 Ambulance in Unit Finder** option for High Risk and Very High Risk Missing Person missions remains unchanged and fully covered.
- The Ambulance Officer threshold evaluates after the high-risk rule, so any configured high-risk Ambulance is included in the final Ambulance count.
- Current Missing Vehicles, Missing Personnel, Mission Update and other live shortage sources remain authoritative and never re-add the configured Officer.
- Both settings default off and persist independently in local storage.

### Regression coverage

- Added `scripts/check-ambulance-officer-threshold-v10101.mjs` for settings persistence, threshold bounds, strict more-than comparison, summed Ambulance demand, duplicate protection, fresh-path gating, Vehicle Load display and diagnostics.
- Chained the new regression through `scripts/check-high-risk-missing-person-ambulance-v1076.mjs`, which continues to prove the original high-risk rule.

### Changed engine baseline

- Command Nexus increased from `1.0.100` to `1.0.101`.
- Mission Finder increased from `V10.6.149` to `V10.6.150`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

## [1.0.100] - 2026-08-11

### Fixed

- Added MissionChief Police requirement aliases **Require Drone**, **Requires Drone** and **Required Drone** (plus plural forms) to the existing Police Drone cross-reference.
- These requirement labels enter the established drone-only Police Air path and select exact MissionChief vehicle type `91`, **Police Drone Vehicle / Drone Vehicle (Police Station)**.
- Existing helicopter-only and explicit **Police Helicopter or Drone** flexible behavior remains unchanged.
- A bare **Drone** / **Drones** alias is deliberately not added, avoiding accidental capture of unrelated cross-service drone wording.

### Regression coverage

- Added `scripts/check-police-drone-requirement-v10100.mjs` to lock the reported aliases, exact type-91 selection, drone-only routing, selected-unit verification and the no-bare-Drone guard.
- Chained the new check through the existing Search Dog / recovery regression path so the permanent validation gate continues to cover it without adding another workflow step.

### Changed engine baseline

- Command Nexus increased from `1.0.99` to `1.0.100`.
- Mission Finder increased from `V10.6.148` to `V10.6.149`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

## [1.0.99] - 2026-08-11

### Fixed

- Extended the existing exact Search Dog Unit cross-reference so MissionChief requirement **Required Search Dog Units** follows the same strict rule as **Rescue Dog**.
- Supported Search Dog Unit wording now includes singular/plural, optional numeric quantities, and optional `Required` prefixes while continuing to select exact MissionChief vehicle type `101`.
- Police **Dog Support Unit (DSU)** demand remains separate and is not captured by the Search Dog matcher.
- Generic fallback remains blocked for this specialist requirement, so an unrelated vehicle cannot satisfy Search Dog Unit demand when no type `101` unit is available.

### Regression coverage

- Extended `scripts/check-rescue-dog-search-dog-v1098.mjs` with `Search Dog Unit`, `Search Dog Units`, counted variants, `Required Search Dog Unit`, the reported `Required Search Dog Units`, and counted `Required` variants.
- Existing negative coverage continues to reject Police Dog / Dog Support Unit wording and unrelated rescue or towing requirements.

### Changed engine baseline

- Command Nexus increased from `1.0.98` to `1.0.99`.
- Mission Finder increased from `V10.6.147` to `V10.6.148`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

## [1.0.98] - 2026-08-10

### Fixed

- Added an exact cross-reference from MissionChief requirement **Rescue Dog** to **Search Dog Unit**.
- Rescue Dog demand now uses exact MissionChief vehicle type `101` in the shared Unit Finder, Upgrade and Auto Mode vehicle-selection path.
- The specialist requirement is protected from generic fallback so an unrelated vehicle cannot satisfy Rescue Dog demand when no Search Dog Unit is available.
- Existing Flatbed Recovery type `105` and HGV Recovery type `106` specialist routing remains unchanged.

### Regression coverage

- Added `scripts/check-rescue-dog-search-dog-v1098.mjs` to prove supported Rescue Dog wording, reject unrelated dog/support requirements, require exact type `101`, and verify candidate selection, selected-unit verification and strict fallback protection.
- Chained the regression through the existing HGV/recovery validation path so the permanent userscript gate covers it without adding another workflow step.

### Changed engine baseline

- Command Nexus increased from `1.0.97` to `1.0.98`.
- Mission Finder increased from `V10.6.146` to `V10.6.147`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

## [1.0.97] - 2026-08-09

### Fixed

- Reverted the v1.0.96 towing matcher to the proven v1.0.95 car-towing implementation after v1.0.96 introduced an out-of-scope `normalise(...)` call that could throw during the shared vehicle-selection path used by Unit Finder, Upgrade and Auto Mode.
- Added a separate HGV towing classifier for explicit `truck to tow`, `HGV to tow` and `lorry to tow` wording without broadening the restored car-towing helper.
- `Car(s) to tow` continues to use exact MissionChief vehicle type `105` (Flatbed Recovery Vehicle).
- HGV/truck/lorry towing now uses exact MissionChief vehicle type `106` (HGV Recovery Vehicle).
- Generic fallback is blocked for both recovery requirements so a missing specialist vehicle cannot silently substitute the wrong type.

### Regression coverage

- Added `scripts/check-hgv-recovery-v1097.mjs` to execute the restored car matcher, prove it has no dependency on an external `normalise` helper, validate the HGV-only towing aliases, protect unrelated truck wording, require exact type 105/106 selectors, and verify the strict matching/count/fallback branches.
- The existing v1.0.96 towing regression now delegates to the corrected v1.0.97 contract so the established validation chain remains intact.

### Changed engine baseline

- Command Nexus increased from `1.0.96` to `1.0.97`.
- Mission Finder increased from `V10.6.145` to `V10.6.146`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

## [1.0.96] - 2026-08-09

### Fixed

- Expanded the existing towing/recovery cross-reference so explicit road-vehicle towing wording such as `1 truck to tow`, `trucks to tow`, `lorry/lorries to tow`, `van/vans to tow`, `vehicle/vehicles to tow`, and `... to be towed` enters the established Recovery path.
- Added direct `Tow truck(s)` and `Recovery truck(s)` aliases to the same strict Recovery path.
- Preserved existing `Car to tow`, `Cars to tow`, `Car Recovery` and towing quantity conversion behavior.
- Recovery selection remains exact MissionChief vehicle type `105` (Flatbed Recovery Vehicle); generic vehicle quick-select fallback remains blocked for recognised recovery demand.
- Unrelated truck wording such as `1 truck`, `Fire truck`, `Heavy Rescue truck`, or `Trucks required` is deliberately not classified as towing demand.

### Regression coverage

- Added `scripts/check-towing-recovery-crossref-v1096.mjs`, including the reported `1 truck to tow` case, supported road-vehicle towing variants, unrelated-truck negative cases, the existing towing converter, strict recovery classification and exact type-105 selection.
- Chained the new regression through the already-registered bulk trained-register/recovery validation gate, avoiding a permanent workflow-definition change.

### Changed engine baseline

- Command Nexus increased from `1.0.95` to `1.0.96`.
- Mission Finder increased from `V10.6.144` to `V10.6.145`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

## [1.0.95] - 2026-08-09

### Improved

- Selecting a Dispatch Centre in Unit Naming now automatically runs the existing **Refresh Stations** routine before rebuilding the downstream filters.
- Selecting a Dispatch Centre in Station Naming now automatically runs the existing Station Naming refresh routine before rebuilding the downstream filters.
- The selected Dispatch Centre is preserved while its options are rebuilt, then the established **Dispatch Centre → Service → Station Type → Start From** cascade is regenerated from the fresh Resource Administration station snapshot.
- Each Dispatch Centre change performs exactly one station refresh; programmatic restoration of the selected centre does not fire another change event.
- The manual **Refresh Stations** control remains available unchanged as a fallback.
- Existing Personnel Assignment/runtime guards remain owned by the normal refresh routines rather than duplicated in the Dispatch Centre handlers.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-auto-station-refresh-v1095.mjs`.
- The regression executes both production Dispatch Centre change handlers, requires exactly one normal station-refresh call per selection, protects selected-centre restoration and verifies both refresh routines rebuild Service, Station Type and Start From in order.
- The regression is chained through the already-registered naming hierarchy gate, so no permanent workflow-definition change is required.

### Changed resource baselines

- Command Nexus increased from `1.0.94` to `1.0.95`.
- Unit Naming increased from `3.3.19` to `3.3.20`.
- Station Naming increased from `1.3.13` to `1.3.14`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

## [1.0.94] - 2026-08-09

### Fixed

- Fixed Dispatch Centre membership appearing entirely under **Unassigned / default** after the v1.0.93 native-centre discovery correction.
- Station-to-centre membership now scans the same active/top/same-origin Resource Administration document collection as Dispatch Centre discovery instead of restricting `leitstelle_building_id` reads to the userscript's current document.
- Native station rows such as `leitstelle_building_id="<centre id>"` now populate the building-to-centre map even when those rows live inside the normal Stations child frame.
- Literal `null`, `undefined`, `false`, blank and non-positive assignments remain genuinely unassigned.
- The established **Dispatch Centre → Service → Station Type → Start From** cascade is unchanged; selecting a centre now exposes the services and station types actually assigned to it.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-membership-frame-v1094.mjs`.
- The regression starts with an empty top document and puts assigned native station rows in a same-origin Resource Administration child frame, then executes the production membership loader and proves NI Fire Dispatch membership reaches the downstream Fire & Rescue Service subset while only a literal-null station remains Unassigned/default.
- The regression is permanently registered in `Validate userscript`.

### Changed resource baselines

- Command Nexus increased from `1.0.93` to `1.0.94`.
- Unit Naming increased from `3.3.18` to `3.3.19`.
- Station Naming increased from `1.3.12` to `1.3.13`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

## [1.0.93] - 2026-08-09

### Fixed

- Fixed the live `Rendered profile did not expose any Dispatch Centre panels within 15000ms` failure in Unit Naming and Station Naming.
- v1.0.92 incorrectly assumed that loading `/profile/{id}` in a hidden iframe would reproduce the LSSMV4/Vue profile lightbox with its Buildings tab selected; live MissionChief does not expose those modal-only panels in that iframe.
- Dispatch Centre ID/name authority now comes directly from native Resource Administration building rows with `building_type_id="7"`.
- Station-to-centre membership remains directly authoritative from the same native row model's `leitstelle_building_id` attribute.
- Native row discovery checks the active document and same-origin frame documents, so the naming tools work whether Resource Administration owns the current frame or the top page.
- Removed profile route resolution, `.profile-dispatchcenter` parsing and the hidden profile renderer from Dispatch Centre naming discovery.
- Dispatch Centre → Service → Station Type → Start From, delegated Refresh/Retry ownership and Personnel Assignment isolation remain unchanged.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-native-station-rows-v1093.mjs`, executing the production row parser against all seven supplied Dispatch Centres plus ordinary, mismatched and invalid rows.
- Reworked the retained v1.0.86-v1.0.92 Dispatch Centre regressions so they preserve hierarchy, membership and Retry contracts while permanently rejecting the failed profile acquisition architecture.
- The already-registered hierarchy gate chains the v1.0.93 regression, so no new workflow-definition mutation is required.

### Changed resource baselines

- Command Nexus increased from `1.0.92` to `1.0.93`.
- Unit Naming increased from `3.3.17` to `3.3.18`.
- Station Naming increased from `1.3.11` to `1.3.12`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

## [1.0.92] - 2026-08-09

### Fixed

- Fixed the live `Profile did not expose any Dispatch Centre panels` failure in Unit Naming and Station Naming.
- The signed-in profile is now loaded in a hidden same-origin iframe so MissionChief/Vue can render `.profile-dispatchcenter` panels before Command Nexus reads them.
- Raw `fetch('/profile/...')` HTML is no longer used as the Dispatch Centre source because the server response can be only the pre-render application shell.
- The rendered profile frame is bounded to 15 seconds, hidden from interaction, and removed after success or failure.
- Dispatch Centre → Service → Station Type → Start From, row-level `leitstelle_building_id` membership, delegated Retry ownership and Personnel Assignment isolation remain unchanged.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-profile-render-v1092.mjs`, which starts from an empty profile shell, simulates the rendered seven-centre DOM appearing, verifies centre extraction, and requires renderer cleanup.
- The permanent workflow now runs the renderer regression for pull requests and main updates.

### Changed resource baselines

- Command Nexus increased from `1.0.91` to `1.0.92`.
- Unit Naming increased from `3.3.16` to `3.3.17`.
- Station Naming increased from `1.3.10` to `1.3.11`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

## [1.0.91] - 2026-08-09

### Rebuilt

- Rebuilt Unit Naming and Station Naming around the live MissionChief hierarchy **Dispatch Centre → Service → Station Type → Start From**.
- Dispatch Centre ID/name pairs now come directly from the signed-in user's native profile `.profile-dispatchcenter` panels. The profile route is resolved from MissionChief's `#navbar_profile_link`, with the page `user_id` available only as a bounded fallback.
- The empty profile Dispatch Centre placeholder is ignored because it has no exact `/buildings/{id}` centre link.
- Dispatch Centre options become available as soon as the profile list loads; station-assignment loading no longer blocks the first dropdown.
- Station membership remains authoritative from row-level `leitstelle_building_id`, including literal `null` normalisation for unassigned buildings.
- Added a Service stage derived from MissionChief building type IDs so Air Ambulance stays Ambulance while Police Helicopter/EOD remain Police; RNLI, Coastguard and SAR are grouped under Search & Rescue / Coastguard.
- Station Type is rebuilt from the selected Dispatch Centre + Service subset, and Start From is rebuilt from Dispatch Centre + Service + Station Type.
- Removed the failed station-seed, `/leitstellenansicht` seed fallback and building-edit-page centre discovery runtime introduced during 1.0.88–1.0.90 troubleshooting.
- Preserved delegated Refresh/Retry ownership, visible Refreshing/error diagnostics and Personnel Assignment isolation.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs` using the supplied seven-centre profile fixture and exact service/building-type mappings.
- Reworked the v1.0.88–v1.0.90 Dispatch Centre regressions so they preserve station-membership, Retry and null-normalisation contracts without protecting the removed seed architecture.

### Changed resource baselines

- Command Nexus increased from `1.0.90` to `1.0.91`.
- Unit Naming increased from `3.3.15` to `3.3.16`.
- Station Naming increased from `1.3.9` to `1.3.10`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

## [1.0.90] - 2026-08-09

### Fixed

- Dispatch Centre name discovery no longer requires the seed station to already be assigned to a Dispatch Centre. Any ordinary station edit page may seed the native **Assigned Dispatch Center** selector.
- MissionChief's literal `leitstelle_building_id="null"` value is now normalized as genuinely unassigned rather than being treated as a Dispatch Centre ID.
- When the active Resource Administration document/state has no usable station rows yet, the loader performs one bounded `/leitstellenansicht` fetch only to discover up to three station building IDs, then still reads Dispatch Centre ID/name pairs from the edit-page assignment selector.
- The native Stations view remains a seed-discovery fallback only; it is not restored as Dispatch Centre name authority, and station-to-centre membership remains the row-level `leitstelle_building_id` relationship.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-unassigned-seed-v1090.mjs` covering literal `null`, an unassigned ordinary station as a valid edit-page seed, an empty live Resource Administration DOM, and native Stations HTML fallback without changing centre-name authority.

### Changed resource baselines

- Command Nexus increased from `1.0.89` to `1.0.90`.
- Unit Naming increased from `3.3.14` to `3.3.15`.
- Station Naming increased from `1.3.8` to `1.3.9`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

## [1.0.89] - 2026-08-09

### Fixed

- **Retry Dispatch Centres** now uses one delegated document-level click owner, so the action remains live even if MissionChief replaces the Resource Administration panel DOM after the original mount.
- Dispatch Centre discovery no longer trusts the first arbitrary building as its edit-page seed. It prefers ordinary fire, ambulance, police and other supported station rows that carry a real `leitstelle_building_id` assignment.
- The edit-page lookup is bounded to at most three assigned station candidates and stops on the first page that exposes MissionChief's **Assigned Dispatch Center** selector. This is a retry fallback, not a per-building crawl.
- The button now holds a visible **Refreshing…** state before loading starts, records an explicit loading/error state, and exposes the concrete loader failure in the button tooltip and naming logs instead of appearing inert.
- Unit Naming and Station Naming keep the existing Dispatch Centre → Station Type → Start From cascade and authoritative station-row `leitstelle_building_id` membership.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-retry-v1089.mjs`, which executes the production seed selector against a fixture with early unassigned Home Response rows, a Dispatch Centre row and later assigned ordinary stations; it also protects delegated Retry ownership, visible loading state, failure diagnostics and pointer/touch affordance.

### Changed resource baselines

- Command Nexus increased from `1.0.88` to `1.0.89`.
- Unit Naming increased from `3.3.13` to `3.3.14`.
- Station Naming increased from `1.3.7` to `1.3.8`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

## [1.0.88] - 2026-08-09

### Fixed

- Dispatch Centre names for Unit Naming and Station Naming now come from MissionChief's **Assigned Dispatch Center** selector on one ordinary building edit page (`#building_leitstelle_building_id`), which exposes the real Dispatch Centre ID/name pairs.
- Station-to-centre membership now comes directly from each Stations row's `leitstelle_building_id` attribute instead of a second buildings JSON lookup.
- Selecting a Dispatch Centre scopes the station set first; **Station Type** is rebuilt from that centre subset, then **Start From** is rebuilt from centre + type.
- The obsolete `/leitstellenansicht` Dispatch Centre-name parser is removed from the naming flow.
- Refresh/retry states from v1.0.87 remain unchanged.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs` using the supplied MissionChief assignment-selector fixture, including the real `LODON DISPATCH` and `Scotlands Dispatch` ID/name pairs.
- Rebased the v1.0.85-v1.0.87 naming regressions so they protect the filter/cascade/refresh UI without preserving the incorrect old source assumptions.

### Changed resource baselines

- Command Nexus increased from `1.0.87` to `1.0.88`.
- Unit Naming increased from `3.3.12` to `3.3.13`.
- Station Naming increased from `1.3.6` to `1.3.7`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

## [1.0.87] - 2026-08-09

### Fixed

- **Refresh Dispatch Centres** now parses the native `/leitstellenansicht` list without requiring MissionChief to expose `building_type_id="7"` on each list wrapper.
- Dispatch Centre discovery first uses MissionChief's building-list containers and falls back to exact same-origin `/buildings/{id}` links if wrapper markup changes.
- Unit Naming and Station Naming now show **Refreshing…** while the list is loading and **Retry Dispatch Centres** when either centre discovery or station-to-centre assignment data fails.
- A failed load now leaves a clear **Dispatch Centres unavailable — refresh** placeholder instead of a disabled **All dispatch centres** selector that appears to do nothing.
- Station membership remains authoritative through `/building/buildings_json` and `leitstelle_building_id`.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-refresh-v1087.mjs`, which executes the production parser against Dispatch Centre HTML fixtures without `building_type_id="7"`, verifies wrapperless fallback behaviour, rejects nested/cross-origin links and protects the visible refresh/retry states.

### Changed resource baselines

- Command Nexus increased from `1.0.86` to `1.0.87`.
- Unit Naming increased from `3.3.11` to `3.3.12`.
- Station Naming increased from `1.3.5` to `1.3.6`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

## [1.0.86] - 2026-08-08

### Fixed

- Unit Naming and Station Naming now load the **Dispatch Centre list independently** from MissionChief's native `/leitstellenansicht` view instead of inferring available centres from station records.
- Naming now follows **Dispatch Centre → Station Type → Start From**. Choosing a centre first narrows Station Type to types represented in that centre, and Start From is then limited to the selected centre and type.
- Added **Refresh Dispatch Centres** controls to both naming tools.
- Station membership still uses MissionChief's `leitstelle_building_id` relationship from `/building/buildings_json`; centre names are not hard-coded or guessed.

### Changed resource baselines

- Unit Naming increased from `3.3.10` to `3.3.11`.
- Station Naming increased from `1.3.4` to `1.3.5`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.
- Command Nexus increased from `1.0.85` to `1.0.86`.

## [1.0.85] - 2026-08-08

### Added

- Unit Naming and Station Naming now include a **Dispatch Centre** filter alongside the existing station-type filter.
- Dispatch Centre options come from MissionChief's authoritative `/building/buildings_json` building data and each station's `leitstelle_building_id` relationship rather than station-name guessing.
- **All dispatch centres** remains the default. When MissionChief reports stations with no Dispatch Centre assignment, **Unassigned / default** is available as an explicit filter.

### Safety and scope

- The filter only changes which stations enter the Unit Naming or Station Naming queue; established naming and save logic are unchanged.
- Personnel Assignment is not filtered by this control.
- If Dispatch Centre data cannot be loaded, the selector stays disabled and naming falls back to the existing all-stations behaviour.

### Changed resource baselines

- Unit Naming increased from `3.3.9` to `3.3.10`.
- Station Naming increased from `1.3.3` to `1.3.4`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.
- Command Nexus increased from `1.0.84` to `1.0.85`.

## [1.0.84] - 2026-08-05

### Changed

- Restore every Personnel Assignment action on iPhone and iPad Safari: Refresh Stations, Import, Start, Pause and Stop.
- Keep the native JSON file input hidden so it cannot displace or cover the visible mobile action buttons.
- Restore the Tools and reports disclosure so closed content stays hidden and every status/report tool appears when opened.
- Add touch-sized two-column mobile grids, dynamic-viewport scrolling and iOS safe-area protection without removing desktop functionality.
- Increased the unified userscript version from `1.0.83` to `1.0.84`.

## [1.0.83] - 2026-08-05

### Changed

- Patient transport keeps the existing exact-route, iframe and duplicate-click safeguards while reducing the shared repeat-click window from 4.0 seconds to 2.5 seconds.
- A stalled patient **Transport Patient / Approach** attempt now retries the live Vue/iframe state after 0.9 seconds instead of 1.8 seconds.
- Prisoner cell and release destination discovery now polls the live result UI at 100-125 ms rather than 200-250 ms.
- Verified prisoner-result close retries now run after 250 ms instead of 480 ms, and guarded failed-click retries become eligible after 4 seconds instead of 6.5 seconds.

### Safety

- Exact patient and prisoner routes, nearest valid destination selection, pending-state hand-off, result-screen identity, duplicate-click protection and fail-closed maximum timeouts remain unchanged.
- Unit Finder remains blocked while patient or prisoner transport ownership is unresolved.

### Changed engine baseline

- Mission Finder increased from `V10.6.142` to `V10.6.143`.

## [1.0.82] - 2026-08-02

### Fixed

- Reduced the default-on Event Scanner from a one-second independent iframe/document walk to a shared cached document snapshot every 15 seconds, while retaining the immediate startup scan and exact claim route.
- Reduced top-window mission-frame reconciliation from a forced document-graph rebuild every five seconds to a cached reconciliation every 15 seconds.
- Background automation now starts only the silent-queue and post-transport pollers whose state is actually active instead of running all three watchers for the whole Auto Mode session.
- Live Trained Personnel updates are now coalesced, cached briefly and skipped when generated markup is unchanged, preventing repeated full parser/model work and detached DOM churn on rapidly mutating mission pages.
- High-heap idle recovery can now recycle safely above 700 MiB after user-idle and operational safety checks even when benign live mission mutations prevent a 15-second mutation-free window.
- Soft memory maintenance releases the live personnel display cache and stale detached transport-modal references.
- Ally Steal now uses shorter bounded selection, dispatch-resume and parent-close settle delays, reducing the normal path without weakening exact Fire Officer, success-alert or mission-close confirmation.

### Safety and compatibility

- No additional observer, repeating timer, fetch, selection or dispatch path was added.
- Exact Unit Finder, Mission Update, trained-personnel authority, patient/prisoner transport, Auto Mode mission ownership and final dispatch safeguards remain unchanged.
- Ally Steal retains the exact selected-vehicle identity, new-success-alert matching, 15-second confirmation window, pending-state hand-off and 12-attempt parent-close fallback.
- Event collection remains enabled by the existing setting and still performs an immediate scan when the runtime starts.
- iPhone/iPadOS ownership and native-picker cleanup paths remain intact.

### Changed engine baseline

- Mission Finder increased from `V10.6.141` to `V10.6.142`.
- Unit Naming remains `3.3.9`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.

## [1.0.81] - 2026-08-01

### Fixed

- After vehicles arrive on scene, the Trained Personnel panel now displays the current live Missing Personnel/course shortages already parsed by Mission Update.
- The panel switches from the fresh-mission **Mission Required Personnel** totals to a **Current Missing Personnel** section with the exact remaining count for each supported course.
- When no live trained-personnel shortage is reported, the panel explicitly shows zero current shortages rather than retaining the new-mission totals.

### Safety and authority

- Before the first vehicle reaches the scene, the existing mission-definition Required Personnel totals and selected/required coverage remain unchanged.
- Live shortage values are already residual MissionChief demand and are not reduced a second time by selected vehicle checkboxes.
- Selected-vehicle Personnel Register evidence remains visible beneath the live shortage section.
- The display reuses `readMissionUpdateRows({ silent: true })`; it adds no fetch, timer, observer, selection or dispatch side effect.
- The existing coalesced mission mutation flush now rerenders the panel after invalidating current mission caches, so live shortage changes appear automatically without a button click.
- Vehicle Load, Unit Finder, Mission Update, Auto Mode, memory lifecycle and iOS/iPadOS paths remain unchanged.

### Changed engine baseline

- Mission Finder increased from `V10.6.140` to `V10.6.141`.
- Unit Naming remains `3.3.9`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.

## [1.0.80] - 2026-08-01

### Fixed

- Mission-definition **Required Personnel** and course totals are now authoritative only while no vehicle has reached the mission scene.
- As soon as `#mission_vehicle_at_mission` contains a real `vehicle_row`, initial Unit Finder filters the static personnel/course rows before choosing its authority source.
- The Trained Personnel panel hides the cached **Mission Required Personnel** totals after the first vehicle arrives and explains that live personnel and course shortages are authoritative.

### Safety and authority

- Vehicles listed only in `#mission_vehicle_driving` remain en route and do not suppress the initial mission-definition requirements.
- Current live Missing Personnel/course rows remain actionable after vehicles arrive on scene.
- Ordinary vehicle requirements, Personnel Register evidence, trained-vehicle optimisation, Mission Update, Auto Mode, Vehicle Load and iOS/iPadOS paths remain unchanged.
- The panel continues to be display-only and adds no fetch, timer or observer.

### Changed engine baseline

- Mission Finder increased from `V10.6.139` to `V10.6.140`.
- Unit Naming remains `3.3.9`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.

## [1.0.79] - 2026-08-01

### Fixed

- The Dispatch Centres **Show all** middle-click now creates the dedicated popup window during the captured middle-button `mousedown` user gesture instead of waiting until `auxclick`.
- The popup opens as a named blank window with explicit dimensions and browser-chrome hints, is moved and resized when browser policy permits, and then navigates to `/leitstellenansicht`.
- A new popup name prevents a previously opened 1.0.78 browser tab from being reused.

### Safety and compatibility

- Captured `mouseup` and `auxclick` handlers suppress the browser's native middle-click new-tab action without opening a second window.
- `auxclick` retains a guarded fallback for browsers that do not deliver the expected `mousedown`.
- Normal left-click remains MissionChief's existing lightbox behaviour.
- Browser popup-blocking and window-management policies remain authoritative.
- The 1.0.77 Stations ownership correction, Mission Finder V10.6.139, Unit Finder, Vehicle Load, Auto Mode and iOS/iPadOS paths remain unchanged.


## [1.0.78] - 2026-08-01

### Added

- Middle-clicking the exact Dispatch Centres **Show all** lightbox link opens `/leitstellenansicht` in a centred, resizable popup window.
- The popup uses a stable window name, focuses after opening and retains scrolling.

### Safety and compatibility

- Normal left-click behaviour remains MissionChief's existing lightbox.
- Only middle-clicks on `a.lightbox-open[href="/leitstellenansicht"]` are intercepted.
- The delegated listener installs once and supports dynamically rendered **Show all** links.
- The 1.0.77 Stations popup ownership fix, Mission Finder, Unit Finder, Vehicle Load, Auto Mode and iOS/iPadOS paths remain unchanged.

## [1.0.77] - 2026-08-01

### Fixed

- Resource Administration now appears inside MissionChief's normal Stations overview popup as well as on the dedicated full-page `/leitstellenansicht` route.
- The popup workspace mounts against the authoritative Stations document instead of being suppressed by the child-frame runtime guard introduced in `1.0.74`.

### Safety and compatibility

- Only the exact same-origin `/leitstellenansicht` child frame may host Resource Administration.
- Mission, building-detail and unrelated child frames remain excluded from the naming/personnel runtime.
- The dedicated desktop Stations view, iOS/iPadOS Safari lifecycle, single-instance protection, saved state, Unit/Station/Personnel handlers and Mission Finder paths remain unchanged.

### Changed component baseline

- Mission Finder remains `V10.6.139`.
- Unit Naming increased from `3.3.8` to `3.3.9`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.

## [1.0.76] - 2026-08-01

### Added

- Settings now includes **Always include 1 Ambulance in Unit Finder** for High Risk and Very High Risk Missing Person missions.
- When enabled, fresh manual and Auto Mode Unit Finder passes guarantee a minimum total of one ordinary Ambulance requirement, while avoiding a duplicate when the mission or patient requirements already include one.
- The configured Ambulance appears in the preloaded Vehicle Load display before Unit Finder runs.

### Safety and authority

- The option is disabled by default and persists in local storage when changed.
- The rule is limited to fresh Unit Finder requirement sources. Mission Update and existing-mission Missing Vehicles, Missing Personnel and Missing on mission authority remain unchanged, so an Ambulance is not resent during update passes.
- The current Ambulance matching and ETA selection contract remains unchanged.
- The compact Settings, Vehicle drawer, Auto Mode, memory lifecycle and iPhone/iOS paths remain unchanged.

### Changed engine baseline

- Mission Finder increased from `V10.6.138` to `V10.6.139`.
- Unit Naming remains `3.3.8`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.

## [1.0.75] - 2026-08-01

### Added

- Vehicle Load now consumes the existing mission-definition preload on a fresh mission and shows ordinary required vehicles before Unit Finder runs.
- Preloaded rows begin at `0 / required` and update from the current selected vehicle checkboxes, including `required / required` covered state.
- A loading message is shown while the authoritative mission requirements are being preloaded.

### Safety and authority

- Preloaded Vehicle Load rows are display-only and do not mutate dispatch readiness, selection guards or the operational `vehicleLoadState`.
- Existing missions keep current Missing Vehicles/Personnel and Missing on mission table authority; static mission-definition totals are suppressed whenever that live authority exists.
- Trained-personnel and patient rows remain excluded from Vehicle Load. Trained requirements continue to use the separate Trained Personnel panel.
- The Vehicle Load renderer reads only the mission-bound cache and never schedules or performs another mission-definition fetch.
- The compact Vehicle drawer UI, action handlers, memory lifecycle and iPhone/iOS paths are unchanged.

### Changed engine baseline

- Mission Finder increased from `V10.6.137` to `V10.6.138`.
- Unit Naming remains `3.3.8`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.

## [1.0.74] - 2026-08-01

### Fixed

- Prevented the Unit Naming, Station Naming and Personnel Assignment workspace runtime from starting inside child mission/lightbox frames; the single top-window owner still operates same-origin edit frames through the established direct-frame route.
- Added top-window frame reconciliation so only the active visible mission child retains the whole-document Mission Finder observer. Inactive, replaced and removed mission frames now release their observer, session ticker, maintenance timer, mounted Mission Finder UI and reconstructible DOM caches, then resume safely if they become the active owner again.
- Added a 15-second memory-maintenance pass. At 480 MiB it performs a soft flush of reconstructible vehicle, mission-context, patient, transport and matching caches. At 640 MiB it may recycle an idle mission frame only after all operational safety gates pass.
- Blocked hard memory recycling while Auto Mode, Unit Finder, Mission Update, Ally Steal, dispatch/share, selected vehicles, Required Personnel preload, Vehicle Load acquisition, patient/prisoner transport, queue transitions or recent mission activity are present.
- Bounded the live trained-personnel verification cache to 600 entries in addition to its existing time-to-live pruning.
- Bounded persisted Unit Finder diagnostic history to 24 entries and 750,000 characters, pruning the oldest snapshots first, and removed the deprecated Issue Recorder payload during safe startup storage maintenance.
- Explicitly preserved authoritative Personnel Register profiles, user settings, mission-bound Required Personnel preload state, selected vehicles and current Vehicle Load state during soft maintenance.

### Diagnostics

- Memory exports now report inactive-frame suspension, maintenance-timer state, soft-flush count and timestamp, recent runtime activity/mutation, persistent diagnostic storage size and recycle mode.

### Compatibility and safety

- The compact `1.0.73` Mission, Vehicle Load, naming and personnel UI, IDs, geometry and event handlers are unchanged.
- Unit Finder, Mission Update, Ally Steal, dispatch/share, Auto Mode, Event Scanner, trained-personnel authority, Personnel Register ownership and iPhone/iOS paths remain on their established routes.
- Added permanent runtime-memory, storage-bound, frame-ownership and operational-lock regression coverage.

### Changed engine baseline

- Mission Finder increased from `V10.6.136` to `V10.6.137`.
- Unit Naming remains `3.3.8`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.

## [1.0.73] - 2026-07-31

### Refined

- Moved the attached Vehicle Load tab and expanded drawer to the top-right edge of the compact Mission shell.
- Added a short eased width, transform, opacity and shadow transition so Vehicle Load opens and closes smoothly without shifting Mission Control.
- Tucked the collapsed tab slightly into the shared shell edge so both surfaces read as one component.
- Added a reduced-motion override that makes the transition effectively immediate.
- Swapped Mission Update and Ally Steal in the primary action grid; Mission Update now appears immediately after Unit Finder.

### Compatibility and safety

- Existing action IDs and event handlers remain unchanged.
- Vehicle Load data, patient/session rendering and collapsed-state ownership remain unchanged.
- iPhone/iOS Mission and Vehicle launcher geometry remains excluded from the desktop drawer refinement.
- Added permanent top-alignment, animation, reduced-motion and action-order regression coverage.

### Changed engine baseline

- Mission Finder increased from `V10.6.135` to `V10.6.136`.

## [1.0.72] - 2026-07-31

### Changed

- Converted desktop/tablet Vehicle Load from a detached panel into an attached right-side Mission drawer.
- Collapsed Vehicle Load is now a slim vertical Vehicle tab sharing the Mission shell edge and border.
- Expanding Vehicle Load opens outward to the right without resizing or shifting Mission Control.
- The Vehicle title and collapse control both open and close the drawer.
- Settings, Diagnostics and whole-shell Mission collapse hide the Vehicle drawer.
- Expanded Vehicle content remains complete with bounded internal scrolling.

### Compatibility and safety

- The attached drawer is limited to the desktop/tablet compact shell and explicitly excludes the established iPhone/iOS launcher geometry.
- Vehicle Load rendering, session data and all mission execution paths remain unchanged.
- Added permanent attached-drawer geometry, disclosure ownership and operational-isolation coverage.

### Changed engine baseline

- Mission Finder increased from `V10.6.134` to `V10.6.135`.


## [1.0.71] - 2026-07-31

### Redesigned

- Immediately superseded the expansive `1.0.70` presentation with a narrow compact operations interface.
- Reduced the desktop Mission surface to a single `390px`-class shell instead of a wide multi-column dashboard.
- Removed the visible identity banner and compressed Mission, Settings and Diagnostics navigation into a small three-button strip.
- Kept Mission actions and live status immediately available while Vehicle Load and Trained Personnel now start collapsed.
- Settings and Diagnostics now replace the operational view instead of expanding the shell beside it.
- Collapsing Mission Control reduces the entire desktop shell to a compact `205px` launcher/header.
- Reduced Unit Naming and Station Naming to a `360px` compact panel and Personnel Assignment to a `390px` compact panel.
- Added progressive-disclosure menus for status, activity logs, profile details, register/report tools, report controls and reports.

### Compactness and usability

- Reduced desktop header, tab, input and action heights while retaining clear focus and click targets.
- Replaced large status metric cards with compact label/value rows.
- Limited expanded logs and reports to bounded internal scrolling.
- Retained safe wrapping, tabular values, low-glare surfaces and semantic state colours.

### Safety

- Required Personnel preload, mission identity safety, Unit Finder, Mission Update, Ally Steal, dispatch, sharing, Auto Mode, Event Scanner, Vehicle Load, trained-personnel optimisation and Personnel Register authority remain unchanged.
- Unit Naming, Station Naming and Personnel Assignment handlers, IDs, storage and execution paths remain unchanged.
- Existing iPhone/iOS layouts and safe-area behaviour remain isolated from the desktop compact rebuild.
- Added permanent compact-shell, collapsed-default and progressive-disclosure regression coverage.

### Changed engine baseline

- Mission Finder increased from `V10.6.133` to `V10.6.134`.
- Unit Naming remains `3.3.8`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.


## [1.0.70] - 2026-07-31

### Redesigned

- Introduced one low-glare, tokenised Nexus visual system across Mission Control, Vehicle Load, Trained Personnel, Unit Naming, Station Naming and Personnel Assignment.
- Replaced the desktop Mission dashboard's vertical utility rail with a compact numbered horizontal Mission, Settings and Diagnostics navigation strip.
- Added a restrained Nexus identity header and responsive three-column, two-column and one-column information layouts.
- Rebuilt the naming and assignment workspace around clear configuration, action, status, analysis, report and log regions while preserving every existing control ID and handler.
- Converted dense operational status text into responsive metric grids with safe wrapping, tabular counts and bounded internal scrolling.
- Removed decorative emoji navigation labels and high-saturation action gradients in favour of precise plain labels and restrained semantic state colour.

### Accessibility and adaptability

- Added visible keyboard focus, consistent disabled states, safe long-label wrapping, `min-width: 0` grid containment and `overflow-wrap: anywhere` across operational surfaces.
- Added responsive layout contracts at 1180px, 900px and 700px while retaining the established iPhone/iOS geometry and lifecycle.
- Collapsed desktop mission cards now remain horizontal compact headers instead of using vertical text.

### Safety

- Mission-definition Required Personnel preload, mission identity validation, Unit Finder, Mission Update, Ally Steal, dispatch, Dispatch & Share, Auto Mode, Event Scanner, Vehicle Load, trained-personnel optimisation and Personnel Register authority remain unchanged.
- Unit Naming, Station Naming and Personnel Assignment execution, storage and lifecycle paths remain unchanged.
- Added permanent visual-system, responsive-layout, iOS-isolation and operational-ownership regression coverage.

### Changed engine baseline

- Mission Finder increased from `V10.6.132` to `V10.6.133`.
- Unit Naming remains `3.3.8`.
- Station Naming remains `1.3.3`.
- Personnel Assignment remains `1.3.8`.


## [1.0.69] - 2026-07-31

### Redesigned

- Replaced the three legacy floating mission surfaces with the integrated MissionChief Nexus dashboard approved for Mission Control.
- Added a slim Mission, Settings and Diagnostics side-tab rail while preserving all existing operational control IDs and handlers.
- Moved Control Window Position, Mission Ready Delay and V10 Queue Restart into Settings.
- Moved Export Diagnostics into Diagnostics and added a persistent Event Scanner switch controlling the real mission-event collectible collector.
- Added the live footer `MissionChief Nexus V1.0.69 · MIT · Martblyth`.

### Safety

- Vehicle Load List, trained-personnel coverage, Required Personnel preload, Unit Finder, Mission Update, Auto Mode and dispatch logic remain on their established execution paths.
- iPhone/iOS mission surfaces retain their existing compact lifecycle while desktop receives the integrated dashboard presentation.
- Added permanent dashboard ownership, collector-gate and footer regression coverage.

### Changed engine baseline

- Mission Finder increased from `V10.6.131` to `V10.6.132`.
- Personnel Assignment remains `1.3.8`.


## [1.0.68] - 2026-07-31

### Fixed

- Corrected mission-load trained-personnel extraction to read the exact **Required Personnel** row from the mission definition's separate **Other information** table.
- Continued to exclude **Required Personnel Available**, which is only a spawn/precondition value and must not create dispatch demand.
- Merged trained-staff requirements into the same mission-bound preload snapshot as ordinary vehicle requirements, so the Trained Personnel panel can show `0 / required` before Unit Finder runs and update as units are selected.
- Allowed a valid Required Personnel source to initialise the requirement cache even when no separate Vehicle and Personnel Requirements table exists.
- Added cross-table regression coverage using distinct Reward and Precondition, Vehicle and Personnel Requirements, and Other information tables.

### Changed engine baseline

- Mission Finder increased from `V10.6.130` to `V10.6.131`.
- Personnel Assignment remains `1.3.8`.


## [Unreleased]

### Added

- Current-state developer handoff for resuming source work.
- Evidence-driven roadmap, architecture, migration and testing documentation.
- Expanded repository integrity checks for required development and release files.

### Fixed

- Prevented duplicate Discord release announcements by removing the second tag-push publisher path and recording a durable per-release Discord receipt asset.
- Publication and repair reruns now skip an already-announced release unless an operator explicitly enables force resend.

### Changed

- Replaced planning-era documentation with the actual merged v1.0.1 baseline.
- Rebuilt the repository README and Command Nexus hero presentation.
- Clarified the difference between implemented code and fully validated release readiness.

### Pending

- Complete live regression testing across both supported MissionChief UK domains.
- Complete migration evidence for each legacy installation state.
- Complete long-session lifecycle and stability evidence.
- Consolidate the two retained control surfaces into one coherent interface.
- Create the first formal tagged GitHub release after MartyBlyth approval.


## [1.0.67] - 2026-07-31

### Fixed

- Restored automatic mission-load preloading for the trained `Required Personnel` row.
- Moved the preload trigger out of the trained-personnel renderer and into the mission-panel mount lifecycle, preventing recursion while still loading requirements before Unit Finder runs.
- The trained-personnel panel now starts with requirement coverage such as `0 / 2` and refreshes to `2 / 2` when matching trained units are selected.
- Added a regression contract requiring the mission UI lifecycle to start preloading while permanently forbidding the renderer from doing so.

### Changed engine baseline

- Mission Finder increased from `V10.6.129` to `V10.6.130`.
- Personnel Assignment remains `1.3.8`.


## [1.0.66] - 2026-07-31

### Fixed

- Restored the selected trained-personnel display after Unit Finder by separating its renderer from the mission requirement preload scheduler.
- Removed the render-to-preload recursion introduced in `1.0.65`, so a panel refresh can no longer start another requirement fetch and render cycle.
- Isolated preload-cache failures from the existing selected-vehicle Personnel Register display; preloading can fail without hiding selected trained staff.
- Kept mission-load `Required Personnel` preloading in the mission lifecycle and retained reuse of the mission-bound requirement snapshot during Unit Finder.

### Changed engine baseline

- Mission Finder increased from `V10.6.128` to `V10.6.129`.
- Personnel Assignment remains `1.3.8`.


## [1.0.65] - 2026-07-31

### Added

- Mission Finder now preloads the authoritative `Required Personnel` row as soon as the mission UI is available, before Unit Finder starts selecting vehicles.
- The trained-personnel panel now shows each required course with required, selected and still-needed personnel counts, including composite rows such as Level 2 Public Order Officer, Police Medic and Police Sergeant.

### Fixed

- Unit Finder reuses the mission-load requirement snapshot instead of fetching and parsing the same mission definition again, while retaining mission-identity checks and clearing stale requirements when the mission changes.
- `Required Personnel Available` remains excluded because it is a mission precondition rather than dispatch demand.

### Changed engine baseline

- Mission Finder increased from `V10.6.127` to `V10.6.128`.
- Personnel Assignment remains `1.3.8`.

## [1.0.64] - 2026-07-31

### Fixed

- `Missing Personnel: Nx HazMat Unit` is now interpreted as a HazMat-trained personnel shortage rather than an ordinary vehicle quantity.
- HazMat personnel demand now uses six `gw_gefahrgut`-trained staff per exact type-39 Fire Operational Support Unit, so four missing staff select one OSU and seven select two.
- The Fire HazMat Personnel Assignment profile now fills six trained staff per OSU, keeping the verified Personnel Register and Mission Finder coverage calculation aligned.
- Ordinary HazMat vehicle requirements remain separate, retain their exact vehicle quantity and continue to reject type-7 HazMat Units and type-86 Operational Support Vans.

### Changed engine baseline

- Mission Finder increased from `V10.6.126` to `V10.6.127`.
- Personnel Assignment increased from `1.3.7` to `1.3.8`.

## [1.0.63] - 2026-07-31

### Fixed

- Fixed Issue #215 by mapping singular, plural and `Required` HazMat-unit captions directly to the Fire Operational Support Unit.
- HazMat-unit requirements now accept only exact MissionChief vehicle type `39` OSUs; type `7` HazMat Units, type `86` Operational Support Vans and other support vehicles cannot satisfy the requirement.
- OSU requirements are now strict no-fallback selections in Unit Finder, Mission Update/Upgrade and Auto Mode while preserving exact quantities and counting already selected OSUs.

### Changed engine baseline

- Mission Finder increased from `V10.6.125` to `V10.6.126`.
- Personnel Assignment remains `1.3.7`.

## [1.0.62] - 2026-07-30

### Added

- Added an independently minimisable **Trained Personnel** panel to the right of Vehicle Load List on desktop and the stacked iPad layout.
- The panel shows only personnel training attached to currently selected vehicles, using exact vehicle-ID Personnel Register evidence.
- Complete register evidence is shown as numbered personnel profiles with their courses; summary-only evidence falls back to per-course counts.
- The compact iPhone two-button layout is unchanged and the additional sibling panel is hidden there to prevent overlap.

### Changed engine baseline

- Mission Finder increased from `V10.6.124` to `V10.6.125`.
- Personnel Assignment remains `1.3.7`.

## [1.0.61] - 2026-07-30

### Fixed

- Auto Mode now records whether the main selection pass used current Mission Update authority and suppresses the post-selection Mission Update re-read for that same cycle.
- Fresh Unit Finder missions still retain the late Missing Vehicles/Personnel check, so genuinely new shortages appearing during initial selection remain actionable.
- Trained-personnel Mission Update selection remains on the established exact-register route and is executed once rather than being repopulated by a duplicate update pass.

### Changed engine baseline

- Mission Finder increased from `V10.6.123` to `V10.6.124`.
- Personnel Assignment remains `1.3.7`.

## [1.0.60] - 2026-07-30

### Fixed

- Auto Mode once again treats a visible `Missing on mission / En-route / Still needed / Selected` table as Mission Update authority and suppresses the full mission-definition Unit Finder route.
- Positive `Still needed` values are converted to a current-selection target using the table's `Selected` value, preventing the same shortage from being selected twice during the post-selection recheck.
- A visible Missing-on-mission table with zero positive shortages remains authoritative, so an existing fully supplied mission cannot be mistaken for a fresh mission.
- MissionChief's escaped `data-raw-html` Missing Vehicles alert is now parsed as a scoped fallback when the structured child exists only inside the attribute.
- Existing patient, trained-personnel, prisoner, transport and memory lifecycle rules are unchanged.

### Changed engine baseline

- Mission Finder increased from `V10.6.122` to `V10.6.123`.
- Personnel Assignment remains `1.3.7`.

## [1.0.59] - 2026-07-29

### Fixed

- Browser back-forward-cache transitions now suspend the complete Mission Finder runtime instead of retaining the main subtree observer, session ticker, automation timers and DOM caches with the old mission document.
- Auto Mode now has a high-heap circuit breaker. Before any Unit Finder selection, an Edge/Chromium mission frame using at least 640 MiB of JavaScript heap is reloaded once with `location.replace`, then Auto Mode resumes on the same mission.
- The recycle is guarded by current selection, dispatch-transition, transport and cooldown checks, so it cannot interrupt selected vehicles or change mission requirements.

### Diagnostics

- Memory exports now include runtime suspension state, session ticker state and the bounded automatic recycle receipt.

### Changed engine baseline

- Mission Finder increased from `V10.6.121` to `V10.6.122`.
- Personnel Assignment remains `1.3.7`.

## [1.0.58] - 2026-07-29

### Fixed

- Seasonal collectible scanning now has one top-window owner instead of starting a one-second recursive iframe scanner in every MissionChief frame.
- The collector now starts only after the Mission Finder duplicate-instance guard and is stopped during runtime cleanup and Safari back-forward-cache suspension, then restarted safely on restoration.
- This removes a confirmed long-session timer and frame-retention path without changing Unit Finder, Mission Update, vehicle matching or Auto Mode dispatch decisions.

### Diagnostics

- Existing Unit Finder exports now include an on-demand browser memory snapshot with JavaScript heap figures when supported, accessible document/frame counts, DOM and vehicle-checkbox totals, active timer/observer state and bounded cache sizes.
- Memory evidence is collected only when Export Diagnostics is clicked; no new polling timer is introduced.

### Changed engine baseline

- Mission Finder increased from `V10.6.120` to `V10.6.121`.
- Personnel Assignment remains `1.3.7`.

## [1.0.57] - 2026-07-29

### Fixed

- Auto Mode now runs the mission-definition requirement set once. Its post-Unit Finder Mission Update pass accepts only explicit current **Missing Vehicles** or **Missing Personnel** rows, preventing complete double dispatches.
- Normal **EOD Response Vehicles** use exact MissionChief vehicle type `110`; **Marine EOD Response Vehicles** remain separate on type `113` and can no longer satisfy one another through substring matching.
- Composite **Required Personnel** rows now retain Search Advisor trained-profile demand while also converting Search Technicians and SAR Commanders to their established SARTEC and Control Van capacities.
- **Required Personnel Available** remains a mission precondition and is deliberately excluded from dispatch demand.

### Diagnostics

- Empty post-selection Mission Update snapshots are no longer stored, and diagnostic history capacity increased from 12 to 24 useful attempts.

### Changed engine baseline

- Mission Finder increased from `V10.6.119` to `V10.6.120`.
- Personnel Assignment remains `1.3.7`.

## [1.0.56] - 2026-07-29

### Added

- Added **Export Diagnostics** to Mission Finder. It downloads a JSON report containing the raw mission-definition rows, supplied and processed Unit Finder requirements, current live missing requirements, visible shortage alerts and the vehicles actually selected.
- The report retains the latest 12 Unit Finder and Mission Update attempts so Automatic Unit Finder problems can still be exported after Auto Mode advances to another mission.
- Selected trained vehicles include exact Personnel Register evidence such as training counts, per-person training-code profiles, scan-completeness flags and evidence source. Personnel names, cookies and passwords are not included.

### Diagnostics

- Ready, not-ready, normal Dispatch and Dispatch & Share states create diagnostic snapshots.
- Reports distinguish the original requirement source from any replacement source and include the aggregate selected/required rows shown in the Vehicle Load List.

### Changed engine baseline

- Mission Finder increased from `V10.6.118` to `V10.6.119`.
- Personnel Assignment remains `1.3.7`.

## [1.0.55] - 2026-07-29

### Fixed

- Initial Unit Finder and Automatic Unit Finder now preserve mission-definition trained-personnel rows when MissionChief has rendered a live-requirements panel but has not reported an explicit current shortage.
- The generic authority guard applies to every supported mission-definition training type: Level 1 and Level 2 Public Order, Police Sergeant, Police Medic, Police Inspector, Railway Police Officer, Search Advisor and Armed Response Personnel.
- Railway Police and other trained requirements can no longer disappear between successful definition parsing and the trained-profile optimiser. Mission Update continues to use explicit live Missing Personnel and Missing Vehicles shortages.

### Validation

- Added regression coverage for all supported definition-trained codes and for the initial-dispatch authority boundary.

### Changed engine baseline

- Mission Finder increased from `V10.6.117` to `V10.6.118`.
- Personnel Assignment remains `1.3.7`.

## [1.0.54] - 2026-07-29

### Added

- Unit Finder and Automatic Unit Finder now read the mission definition's composite **Required Personnel** row before the initial dispatch.
- Supported trained-personnel totals are combined with ordinary vehicle requirements and resolved through the existing exact Personnel Register optimiser.
- Level 1/2 Public Order, Police Medic, Police Sergeant, Police Inspector, Railway Police, Search Advisor and Armed Response personnel labels use their existing exact training mappings.

### Behaviour

- Multi-trained personnel count toward every matching course they hold, while singly trained personnel count only toward their own qualification.
- The initial mission definition supplies full personnel totals; later mission upgrades continue to use current live **Missing Personnel** shortages, preventing the definition totals from being dispatched twice.
- Unknown personnel labels remain ignored rather than being guessed, and vehicle selection still fails closed when trusted register evidence is unavailable.

### Changed engine baseline

- Mission Finder increased from `V10.6.116` to `V10.6.117`.
- Personnel Assignment remains `1.3.7`.

## [1.0.53] - 2026-07-28

### Fixed

- Auto Mode patient transport now searches the top-level page, active transport scopes and recursively accessible same-origin iframe documents.
- Current green **Transport Patient** anchors with exact `/vehicles/{vehicle}/patient/{hospital}` routes are found inside nested vehicle lightbox iframes.
- Cross-origin or unavailable frames fail closed, and unrelated green controls remain excluded.

### Changed engine baseline

- Mission Finder increased from `V10.6.115` to `V10.6.116`.
- Personnel Assignment remains `1.3.7`.

## [1.0.52] - 2026-07-28

### Fixed

- Restored Auto Mode patient transport clicking for MissionChief's current green **Transport Patient** anchor with an exact `/vehicles/{vehicle}/patient/{hospital}` route.
- The exact visible enabled patient route is checked before both legacy **Approach** paths; unrelated green links remain excluded.

### Changed engine baseline

- Mission Finder increased from `V10.6.114` to `V10.6.115`.
- Personnel Assignment remains `1.3.7`.

## [1.0.51] - 2026-07-28

### Changed

- Replaced the single slow mass-register action with **Quick Refresh Register** and **Full Verify Register**.
- Quick Refresh reads every station snapshot but reuses a vehicle's previous complete exact record when its exact ID, type, assigned personnel count and complete per-person training profiles are unchanged.
- Changed, new, expired or ambiguous vehicles automatically fall back to their exact `/vehicles/{id}/zuweisung` page; unsafe station evidence can never qualify for reuse.
- Full Verify retains the complete audit path and opens every exact vehicle assignment page.
- Exact vehicle pages now run through a bounded pool of three desktop workers or two iPhone/iPad workers, with one controlled retry, instead of a strictly serial loop.
- Deleted vehicles are removed only after their station page is read successfully, and stopped or failed work preserves older exact records that were not safely replaced.
- Unit or Station Naming runs now block a register refresh, preserving the existing single-tool safety boundary.
- Station records are pruned only when the authoritative `#vehicle_table` is present; an incomplete or unexpected station page fails closed.
- When a changed vehicle exact page fails, its previous record is retained for diagnosis but marked incomplete and non-exact, so a known-changed vehicle cannot remain authoritative.

### Interface and reporting

- Progress reports now separate exact pages read, exact records reused, unsafe stations, deleted vehicles and final retained-register size.
- Unchanged records retain their original exact verification timestamp and receive a separate station-confirmation timestamp.

### Changed engine baseline

- Personnel Assignment increased from `1.3.6` to `1.3.7`.
- Mission Finder remains `V10.6.114`.

## [1.0.50] - 2026-07-27

### Fixed

- Trained-personnel selection now continues through all ready compatible vehicles until the actual quantity for every required training course is covered or no useful trained unit remains.
- Nominal vehicle-seat coverage and qualification coverage are tracked independently. A partly trained PSU or IRV can no longer reduce seat demand to zero and prematurely trigger a false training shortfall while another ready trained unit is available.
- A trained officer on a later vehicle still reduces the correct course deficit even when earlier selected vehicles already provide enough nominal seats.
- Live assignment verification now walks the complete ready compatible vehicle pool in ordered batches and stops as soon as the real per-course demand is covered, instead of imposing a 48-page blind spot.
- Multi-trained personnel continue to satisfy every required course they hold. Singly trained personnel count only toward their own course.
- Type-51 PSUs remain preferred for useful high-capacity Public Order blocks, with type-8 IRVs filling smaller remainders. Correct-type untrained fallback units are selected only after trained coverage is exhausted.
- A training shortfall is now reported only after the complete ready trained pool has been checked. Compatible vehicle-capacity shortages remain separately blocking.

### Validation

- Added regression coverage for a second trained IRV clearing a deficit after nominal seats are already covered, and for a 12-person requirement fulfilled by one PSU plus the minimum IRV mixture.
- Existing register, Search Advisor, Public Order, Armed Response, iOS Safari, mission-requirement, release and repository contracts remain enabled.

### Changed engine baseline

- Mission Finder increased from `V10.6.113` to `V10.6.114`.

## [1.0.49] - 2026-07-26

### Fixed

- Personnel training parsing now supports MissionChief's current space-separated quoted `data-filterable-by` format, so `drone` and `search_and_rescue` are stored as separate qualifications instead of one invalid combined value.
- Build All Register now supplements verified vehicle assignment pages with the station personnel table's persistent **Assigned To** value. This covers Police Search Advisors who are assigned to a Police Drone Vehicle but currently display as **Available**.
- Station-table vehicle-name fallback is accepted only when it resolves to one unique exact vehicle ID; direct `/vehicles/{id}` links remain authoritative and duplicate names fail closed.
- Exact assignment-page evidence still overrides station fallback evidence when both are available.

### Safety

- Search Advisor remains a trained-personnel requirement for `search_and_rescue` and may use any selectable exact registered vehicle carrying the assigned officer.
- Unverified assignments, missing personnel IDs and ambiguous duplicate vehicle names cannot satisfy the requirement.
- The change does not move personnel or broaden automatic Personnel Assignment target vehicles.

### Changed engine baseline

- Mission Finder increased from `V10.6.112` to `V10.6.113`.
- Personnel Assignment increased from `1.3.5` to `1.3.6`.

## [1.0.48] - 2026-07-26

### Changed

- Standard patient and Ambulance demand now compares exact type-5 road Ambulances with exact type-9 HEMS/Air Ambulances in one candidate pool.
- MissionChief displayed arrival time is the primary ordering metric, so a geographically farther HEMS is selected first whenever its ETA is quicker; distance remains only the equal-ETA tie-breaker.
- Already-selected HEMS now count toward ordinary Ambulance demand in Unit Finder, Mission Update and Auto Mode.

### Safety

- Explicit HEMS/Air Ambulance requirements remain strict type 9.
- Critical Care Transfer Ambulance requirements remain strict type 98.
- Generic Critical Care continues to compare HEMS with only verified Critical Care-trained road Ambulances.
- Standard Ambulance demand cannot fall through to generic text or quick-select buttons.

### Changed engine baseline

- Mission Finder increased from `V10.6.111` to `V10.6.112`.

## [1.0.47] - 2026-07-26

### Fixed

- Auto Mode now closes the exact Vue prisoner-release result lightbox after releasing prisoners.
- The close handler follows the owning `.vm--container` and its `data-modal` identity, reacquires the live close span after Vue replaces modal nodes, and verifies that the current replacement modal is gone before restarting.
- Scoped pointer and overlay fallbacks run only inside the same prisoner lightbox when the native close click does not dismiss it.

### Changed engine baseline

- Mission Finder increased from `V10.6.110` to `V10.6.111`.

## [1.0.46] - 2026-07-26

### Changed

- Removed the explanatory copy beneath Mission Ready Delay while retaining its control and 1000 ms default.
- Build All Register now publishes complete per-person training profiles for every exact vehicle assignment page across all vehicle types.
- Mission Finder trusts fresh exact all-vehicle register scans and can find specialist trained staff on any assigned unit.
- Search Advisor demand now selects exact registered vehicles carrying assigned `search_and_rescue`-trained staff instead of hard-mapping to Control Vans.
- `Car to tow` and `Cars to tow` now route through exact type-105 Flatbed Recovery Vehicles, including structured Missing Vehicles alerts.

### Changed engine baseline

- Mission Finder increased from `V10.6.109` to `V10.6.110`.
- Personnel Assignment increased from `1.3.4` to `1.3.5`.

## [1.0.45] - 2026-07-26

### Changed

- Removed the explanatory sentence beneath `Keep my saved panel position` from the Mission Finder control panel.
- The checkbox, stored panel coordinates and centre-on-mission behaviour remain unchanged.

### Changed engine baseline

- Mission Finder increased from `V10.6.108` to `V10.6.109`.

## [1.0.44] - 2026-07-26

### Fixed

- `Missing Vehicles: 3 Fire engines` now uses an exact Fire Engine requirement route instead of the generic substring matcher that could select Ambulances.
- Fire Engine selection and selected-count verification accept only MissionChief UK pump-capable Fire vehicle types `0`, `16` and `17`; Ambulance type `5` is explicitly outside the route.
- The fallback selector can no longer use a generic `search_attribute` quick-select button for Fire Engine shortages.

### Interface

- Removed the explanatory helper sentence beneath the Auto Mode queue checkbox while retaining the checkbox, Start/Stop control and operational status display.

### Changed engine baseline

- Mission Finder increased from `V10.6.107` to `V10.6.108`.

## [1.0.43] - 2026-07-26

### Fixed

- After the exact `Release Prisoners` fallback completes, Auto Mode now waits for the resulting lightbox, clicks its visible topmost `<span title="Close" class="lightbox-close">` control and confirms the screen has disappeared.
- The release-result close path supports MissionChief layouts where the close span is not wrapped by `.control-btn-container`.
- Once the dismiss screen is closed, release state is cleared and Auto Mode restarts the mission cycle instead of remaining blocked on the result screen.

### Safety

- The dismiss close runs only after the exact current-mission `Release Prisoners` action has cleared the prisoner alert.
- Existing patient transport and positive-capacity prison-cell handling remain higher priority and unchanged.

### Changed engine baseline

- Mission Finder increased from `V10.6.106` to `V10.6.107`.

## [1.0.42] - 2026-07-26

### Changed

- Auto Mode continues to prefer the first visible active prison destination with free cells.
- When the prisoner alert remains but no available cell destination exists, Unit Finder, Mission Update and normal vehicle-selection actions are allowed to finish before the fallback is considered.

### Added

- After all normal Auto Mode actions complete, the exact current-mission `Release Prisoners` link is clicked if the prisoner alert still remains.
- The release fallback restarts the Auto cycle and must clear before dispatch or queue advance can continue.

### Safety

- Release is allowed only for a visible `btn-danger` link with `data-method="post"`, exact text `Release Prisoners` and the exact current mission `/gefangene/entlassen` route.
- The fallback is never used while any active destination with positive free-cell capacity remains.
- A separate session guard prevents duplicate release clicks while MissionChief processes the request.

### Changed engine baseline

- Mission Finder increased from `V10.6.105` to `V10.6.106`.

## [1.0.41] - 2026-07-26

### Added

- Auto Mode now detects the visible prisoner-cell handoff before Mission Update, vehicle loading or Unit Finder.
- It selects the first visible green MissionChief destination link in DOM order when the link has a valid `data-prison-id`, a `/gefangener/` route and positive free-cell capacity.
- A session guard prevents duplicate clicks while MissionChief processes the handoff.

### Safety

- The red `Release Prisoners` action is never considered or clicked.
- Auto Mode stops without running Unit Finder when the prisoner alert remains but no active destination can be completed.

### Changed engine baseline

- Mission Finder increased from `V10.6.104` to `V10.6.105`.

## [1.0.40] - 2026-07-26

### Fixed

- Removed the final text-based `RRU` fallback from Road Rail Unit dispatch matching.
- Road Rail Unit requirements now select and verify only checkboxes exposing exact MissionChief vehicle type `107`.
- Coastguard Rope Rescue Unit remains separate as vehicle type `59` and cannot satisfy a Fire Road Rail Unit requirement, even when renamed with an `RRU`-containing callsign.

### Changed engine baseline

- Mission Finder increased from `V10.6.103` to `V10.6.104`.

## [1.0.39] - 2026-07-26

### Fixed

- Separated the Fire Road Rail Unit from the Coastguard Rope Rescue Unit despite their shared RRU abbreviation.
- `Road Rail Unit` and `Road Rail Units` shortages now use a dedicated exact type-107 Fire matcher.
- Coastguard Rope Rescue Unit type 59 is explicitly excluded from the Road Rail route.

### Changed engine baseline

- Mission Finder increased from `V10.6.102` to `V10.6.103`.

## [1.0.38] - 2026-07-26

### Fixed

- `Missing Vehicles: 2 Road Rail Units` now maps the plural MissionChief wording to the established `RRU` route.
- Singular `Road Rail Unit` wording remains supported.
- The route remains restricted to the exact type-107 Road Rail Unit vehicle mapping.

### Changed engine baseline

- Mission Finder increased from `V10.6.101` to `V10.6.102`.

## [1.0.37] - 2026-07-26

### Restored

- Restored Personnel Assignment `1.3.4` on top of the latest `main` source.
- Restored the readable **Build All Register** action, JSON register export/import, saved-register status, and accurate retained-register reporting.

### Preserved

- Preserved Mission Finder `V10.6.101`, the trained-personnel coverage optimiser, PSU/IRV multi-trained allocation, compatible fallback selection, and non-blocking training-shortfall handling.

### Safety and compatibility

- Register imports validate schema and object keys, enforce the existing 5,000-vehicle limit, cap files at 10 MB, and require confirmation before replacing browser data.
- Export and import remain blocked while Personnel Assignment or a register build is active.
- Added a permanent regression check requiring the Personnel Register controls and the latest trained-coverage optimiser to remain present together.

## [1.0.36] - 2026-07-26

### Changed

- Replaced strict trained-unit pass/fail selection with a best-available coverage optimiser for every supported trained-personnel requirement.
- Level 1 Public Order, Level 2 Public Order, Police Sergeant and Police Medic requirements now share exact type-51 PSU and type-8 IRV candidates. A PSU supplies up to nine personnel seats, while IRVs supply two and fill smaller remainders.
- Multi-trained assigned staff reduce every matching simultaneous course requirement from the same selected vehicle.
- Partially trained vehicles remain useful: an IRV carrying one relevant trained officer can be selected and contributes that one officer instead of being discarded.
- Candidate ranking prefers verified trained coverage, then correct-type capacity, avoids excessive spare capacity, and uses MissionChief arrival order as the final tie-breaker.

### Fallback and reporting

- When verified trained coverage is exhausted, Command Nexus still selects enough correct-type vehicles to provide the required nominal personnel capacity.
- Remaining training deficits are reported clearly but no longer block dispatch when compatible vehicle capacity is present.
- Missing compatible vehicle capacity remains release-blocking and is reported separately from the training shortfall.
- Selection stops as soon as the shared personnel-capacity vector is covered, preventing extra PSUs or IRVs when multi-trained crews already satisfy several courses.
- A 12-person compatible Public Order requirement prefers one nine-seat PSU and two IRVs for the three-person remainder; a second PSU is used only when it is a better fit or the IRV remainder cannot be supplied.

### Safety and validation

- Police Inspector and Railway Police remain exact type-8 profiles; Armed Response remains exact type-25 and still requires the Roads Policing plus Firearms combination for trained credit.
- Exact vehicle IDs and live `/vehicles/{id}/zuweisung` assignment scans remain authoritative for trained-personnel counts.
- Added permanent regression coverage for PSU capacity, partial training, multi-course coverage, correct-type untrained fallback, shortfall reporting and no-oversend behaviour.

### Changed engine baseline

- Mission Finder increased from `V10.6.100` to `V10.6.101`.

## [1.0.35] - 2026-07-25

### Fixed

- Manual Unit Finder and Auto Mode now check visible current **Missing Vehicles** and supported **Missing Personnel** alerts before reading the full static mission-help requirement set.
- When MissionChief reports a current shortage such as `Missing Vehicles: 2 Fire engines`, only that current shortage is processed; unrelated original mission requirements are no longer selected again.
- Explicit Missing Vehicles quantities are treated as the target number of currently checked unsent vehicles. Existing matching selections reduce the remaining clicks, so Unit Finder followed by Mission Update cannot add the same shortage twice.
- A second current-requirement check runs after the mission-help request completes, preventing a newly rendered shortage from being overwritten by an attachment response already in flight.
- Explicit current shortages outrank larger full/live totals during de-duplication. Current patient shortages are retained while unrelated full mission rows are suppressed.

### Safety and compatibility

- Patient-only `We need` alerts do not suppress the normal authoritative mission-help route.
- Numeric **Still Needed** values from the Live Mission Requirements table retain their existing additional-shortage handling; the current-selection target rule applies only to explicit visible Missing Vehicles/Personnel alerts.
- Specialist training verification, Police IRV protection, HEMS/Critical Care proximity, iPhone Safari interfaces, dispatch validation and Resource Administration remain on their established paths.
- Added permanent regression coverage for missing-requirements-first authority, late-render rechecking, patient retention and duplicate-selection prevention.

### Changed engine baseline

- Mission Finder increased from `V10.6.99` to `V10.6.100`.

## [1.0.34] - 2026-07-25

### Fixed

- Removed the JavaScript-owned iPhone **Unit Quick Select** title, disclosure button, collapse state, per-node classes and repeated native-picker structural enhancement.
- The visible native/enhanced alternation shown in the supplied recording can no longer occur because Command Nexus no longer inserts or reattaches a wrapper inside MissionChief's quick-select DOM.
- MissionChief's native category and unit controls now receive only passive, document-owned iPhone CSS using stable `a[search_attribute]` and `:has(...)` selectors.
- Replacement quick-select DOM is styled automatically by the existing stylesheet without a MutationObserver-driven reattachment pass.
- Removed native-picker state storage and main-observer resynchronisation. Historical toggle/classes/state are cleaned during upgrade and Safari bfcache restoration.

### Compatibility and safety

- The **Mission** and **Vehicle** launcher is unchanged.
- Passive quick-select styling remains strictly limited to the established iPhone Safari document class, including phone-sized desktop-site sessions.
- iPad/tablet and desktop layouts remain unchanged.
- MissionChief's native anchors, counts, colours and click handlers are not cloned or replaced.
- Mission requirements, unit selection, dispatch, Mission Update, Ally Steal, Auto Mode and Resource Administration are unchanged.

### Changed engine baseline

- Mission Finder increased from `V10.6.98` to `V10.6.99`.

## [1.0.33] - 2026-07-25

### Fixed

- Stopped the iPhone Unit Quick Select disclosure from repeatedly expanding and collapsing after one tap.
- User-triggered picker state changes now update the tracked mission documents directly and no longer schedule an immediate structural re-scan of the control being tapped.
- Added a bounded duplicate-touch/click lock and immediate propagation guard for the native picker disclosure.
- Native picker class, text, ARIA, title and count writes are now idempotent and use a per-document render signature.
- The main MutationObserver now ignores the short, explicitly marked window of Command Nexus-owned native-picker mutations while continuing to observe genuine MissionChief vehicle-list changes.
- Mission and Vehicle launcher placement now measures the union of all visible top-right native controls rather than trusting one container rectangle.
- The launcher now clears that full cluster by 16px, uses a farther-left 112px fallback and retains the last valid cluster briefly during modal replacement.
- Pixel hysteresis prevents sub-pixel geometry changes from continuously rewriting launcher CSS variables.

### Compatibility and safety

- The correction remains strictly limited to the established iPhone Safari path, including phone-sized desktop-site sessions.
- iPad/tablet and desktop layouts are unchanged.
- Mission requirements, matching, vehicle selection, dispatch, Mission Update, Ally Steal, Auto Mode, Unit Quick Select anchors and Resource Administration logic are unchanged.
- No new observer or recurring timer was added; the existing bounded/coalesced lifecycle remains authoritative.

### Changed engine baseline

- Mission Finder increased from `V10.6.97` to `V10.6.98`.

## [1.0.32] - 2026-07-25

### Changed

- Replaced the two full-width iPhone Mission Finder header bars with one compact launcher containing exactly **Mission** and **Vehicle** buttons.
- Both panels start closed. Opening Mission closes Vehicle, opening Vehicle closes Mission, and tapping the active button again closes it.
- The launcher is positioned from MissionChief's live native `.control-btn-container`, immediately to the left of the visible mission controls rather than from a hard-coded screen offset.
- Mission Control and Vehicle Load List open below the launcher and remain bounded to the visual viewport and Safari safe area.

### Fixed

- Removed the detached right-side collapse controls and overlapping full-width header layer seen in the supplied iPhone recording.
- Native Unit Quick Select expansion no longer changes the Command Nexus launcher geometry through the obsolete bars.
- Launcher active state, `aria-pressed`, `aria-expanded` and `aria-controls` remain synchronized.
- Modal replacement, visual viewport changes, rotation and Safari page restoration now recalculate launcher placement through the existing bounded lifecycle.

### Compatibility and safety

- The launcher exists only on the established iPhone Safari path, including phone-sized desktop-site sessions.
- iPad/tablet and all desktop layouts retain the existing Mission Control and Vehicle Load headers and controls.
- Mission requirements, matching, checkbox selection, dispatch, Mission Update, Ally Steal, Auto Mode, native quick-select controls and Resource Administration logic are unchanged.
- Added permanent regression checks for exact labels, exclusive panel state, hidden legacy bars, native-control-cluster positioning and mutation/viewport reconciliation.

### Changed engine baseline

- Mission Finder increased from `V10.6.96` to `V10.6.97`.

## [1.0.31] - 2026-07-25

### Fixed

- Mission Control, Vehicle Load List and Unit Quick Select now migrate to collapsed defaults on the corrected iPhone Safari profile instead of inheriting stale expanded state from the earlier mobile rollout.
- Mission Control and Vehicle Load List disclosures now own touch and keyboard activation explicitly, prevent event propagation into MissionChief and keep icons, titles, `aria-expanded` and `aria-controls` synchronized.
- Collapsed iPhone cards now hide their bodies through explicit iPhone-scoped rules, leaving one compact header row.
- Mission Control now reserves a pointer-transparent upper-right gutter for MissionChief's visible native close control, preventing the Command Nexus card from covering or intercepting the mission-window X button.
- The close-control gutter is recalculated from the live modal control during visual-viewport changes, orientation changes and Safari page restoration.

### Compatibility and safety

- The correction remains strictly gated to the established iPhone Safari path, including phone-sized desktop-site sessions.
- iPad/tablet and desktop layout, dragging and saved positioning remain unchanged.
- Mission requirements, resource matching, vehicle selection, dispatch, Mission Update, Ally Steal, Auto Mode and Resource Administration logic are unchanged.
- Added permanent regression contracts for collapse migration, deterministic disclosure ownership, explicit collapsed-body hiding, ARIA synchronization and native close-control clearance.

### Changed engine baseline

- Mission Finder increased from `V10.6.95` to `V10.6.96`.

## [1.0.30] - 2026-07-25

### Fixed

- Personnel Assignment registry scans now detect PSU/type-51 vehicles through all current vehicle-type attributes, parse every personnel row on each exact `/vehicles/{id}/zuweisung` page and recognise both `btn-assigned` and visible **Remove binding** controls. Exact vehicle IDs remain authoritative, separate PSU records are preserved and refreshed snapshots replace stale assignment counts.
- `CRV` and `CRVs` now select and count only the exact type-57 Coastguard Rescue Vehicle in Unit Finder, Mission Update and Auto Mode.
- Current `[data-requirement-type="vehicles"]` **Missing Vehicles** elements are parsed with non-breaking-space normalisation even when the Live Mission Requirements panel is present. Police Car quantities remain additional vehicle shortages, not personnel counts or total-fleet targets, and flow through the existing type-8 ordinary-first selector.
- Each Search Advisor requirement now maps one-for-one to an exact type-85 Control Van. Search Technicians remain on SARTEC and SAR Commanders remain on Control Vans.
- Missing Police Officers continue to convert with ceiling division at two officers per Police Car, including current visible alerts beside the live panel.
- Generic Critical Care requirements now compare exact type-9 HEMS/Air Ambulances with exact type-5 Ambulances whose current exact-ID Personnel registry record confirms at least one `critical_care` member, then choose whichever eligible resource has the better MissionChief arrival order. Explicit HEMS-only, Critical Care Transfer Ambulance/type-98 and road-transport Ambulance requirements remain strict and separate.

### Validation

- Added permanent regression coverage for PSU registry capture, exact CRV and Control Van mapping, structured Missing Vehicles markup, Police Officer conversion and nearest eligible HEMS/Critical Care selection.
- Existing iOS Safari, iPhone desktop-site detection, iPhone UI, Police IRV, lifecycle, repository and userscript validation contracts remain enabled.

### Changed

- Personnel Assignment increased from `1.3.2` to `1.3.3`.
- Mission Finder increased from `V10.6.94` to `V10.6.95`.

## [1.0.29] - 2026-07-25

### Fixed

- Corrected the iPhone Safari gate for Safari **Request Desktop Website** sessions that report `MacIntel`, which caused the compact `v1.0.27` and native-picker `v1.0.28` layouts to be skipped completely.
- Touch-capable `MacIntel` Safari now enters the phone layout only when the physical screen's shortest side is phone-sized (`<= 600` CSS pixels).

### Compatibility and regression protection

- iPad remains excluded by physical screen dimensions even in desktop-site or narrow split-screen layouts.
- Desktop Safari remains excluded by its non-touch identity; other iOS browsers remain excluded by the Safari guard.
- Added positive regression coverage for a 393px physical iPhone screen with a 980px desktop layout viewport and negative coverage for an 820px iPad in a 500px split-screen viewport.
- Mission logic, native controls, matching, selection and dispatch remain unchanged.

### Changed engine baseline

- Mission Finder increased from `V10.6.93` to `V10.6.94`.

## [1.0.28] - 2026-07-25

### Fixed

- Completed the iPhone Safari mission-interface redesign by taking ownership of MissionChief's native `a[search_attribute]` unit quick-selection matrix, which remained desktop-sized after `v1.0.27`.
- The native search field, wrapped service tabs and three-column unit matrix are now discovered in the same active mission document that renders them, including same-origin mission iframes and lightboxes.
- Added one compact **Unit Quick Select** disclosure that defaults collapsed on iPhone. Expanding it reveals a single horizontally scrolling category strip and a readable two-column internally scrolling unit grid.
- Native quick-select anchors are styled in place. Their original `search_attribute`, colours, counts, text and MissionChief click handlers are not cloned, moved or replaced.

### Lifecycle and compatibility

- Added bounded initial retries for mission iframe load timing and reuse of the existing filtered/coalesced Mission Finder mutation observer when the native selector matrix is replaced.
- Native picker classes, disclosure controls, document-local styles and retry timers now have deterministic mission-close, unload and bfcache reconciliation paths.
- The native picker stylesheet is injected into the document that owns the controls rather than only the top page.
- The correction remains strictly limited to iPhone/iPod Safari. iPad Safari, iPad desktop-site mode, desktop browsers, other iOS browsers and native webviews remain unchanged.
- Added permanent regression contracts for cross-document injection, native selector discovery, horizontal categories, two-column layout, collapsed state, mutation resynchronisation and cleanup ownership.

### Changed engine baseline

- Mission Finder increased from `V10.6.92` to `V10.6.93`.

## [1.0.27] - 2026-07-25

### Changed

- Rebuilt Mission Finder's mission-tab interface as a compact iPhone Safari command card based on the supplied screen recording.
- Advanced Mission Ready Delay and Queue Restart controls now sit behind a dedicated Settings disclosure on iPhone, while primary mission actions remain immediately available.
- Mission Control and Vehicle Load List use smaller native-style headers, tighter card spacing, compact touch targets and bounded internal scrolling.
- The six established action handlers now render in a compact two-column grid without changing their logic or dispatch ownership.
- Vehicle Load List remains independently collapsible and defaults to its compact state on a fresh iPhone UI profile.

### Compatibility and safety

- Added a strict iPhone/iPod Safari detector separate from the existing iOS detector.
- iPad Safari, iPad desktop-site `MacIntel`, desktop Safari, Chrome/Firefox/Edge on iOS and every desktop browser remain on their previous layouts.
- The iPhone card respects Safari safe areas, `visualViewport`, `100dvh`, address-bar changes and bounded overscroll.
- Drag ownership is disabled only for the fixed iPhone command card; iPad and desktop dragging remain unchanged.
- Mission requirement acquisition, unit matching, checkbox selection, Mission Update, Ally Steal, dispatch, sharing and Auto Mode handlers are unchanged.
- Added permanent regression checks for strict platform gating, compact presentation contracts and preserved action handlers.

### Changed engine baseline

- Mission Finder increased from `V10.6.91` to `V10.6.92`.

## [1.0.26] - 2026-07-25

### Fixed

- iPhone and iPad Safari Unit Finder now discovers the authoritative `#mission_help` link even when MissionChief hides the desktop button with `hidden-xs`.
- Mission-help URLs are constrained to the current MissionChief origin, the `/einsaetze/{missionType}` route and the exact active `mission_id`; stale or cross-mission links are rejected.
- When the hidden link is absent, Mission Finder may construct the same requirement route only from explicit active-mission type metadata and the exact active mission instance.
- Requirement responses are verified against the requested mission type and instance before their HTML is parsed.
- The Vehicle and Personnel Requirements table detector now accepts the exact heading and a bounded semantic table fallback while rejecting unrelated HTML responses.

### Safety and diagnostics

- Missing, failed, redirected-to-the-wrong-mission or structurally invalid requirement responses now stop Unit Finder before visible or legacy fallbacks can report a false success.
- A legitimate authoritative table with no actionable vehicle rows remains valid so patient-only missions can continue through the established patient path.
- The previous `v1.0.25` exact checkbox-state verification remains unchanged and now receives authoritative mission rows on mobile Safari.
- Added permanent tests for the supplied hidden link, same-origin URL construction, mission-ID mismatch rejection, response identity, hidden-link discovery, table selection and fail-closed handoff.

### Changed

- Mission Finder increased from `V10.6.90` to `V10.6.91`.

## [1.0.25] - 2026-07-25

### Fixed

- Unit Finder on the MissionChief website in iPhone and iPad Safari now resolves vehicle checkboxes, load controls and fallback selectors from the active mission document instead of assuming the global document owns the live vehicle table.
- Vehicle selection is counted only after MissionChief's exact checkbox is confirmed checked. Safari now receives bounded native-click, associated-label and checked-property plus `input`/`change` fallbacks when required.
- Complete vehicle-list stability checks, visible load controls, loading indicators, legacy vehicle requirements and the Mission Update first-pass gate now use the same active mission document as Unit Finder.

### Safety and compatibility

- A failed or ignored checkbox activation now returns selection failure instead of advancing internal assigned counts.
- Exact vehicle type, trained-personnel, mission ownership, stale-mission, complete-list and final-confirmation safeguards remain unchanged.
- Desktop selection retains the native click path; the additional fallbacks run only when the real checkbox remains unchecked.
- Added permanent regression tests covering active mission-document resolution and native, label, property/event, failed and disabled checkbox activation paths.

### Changed

- Mission Finder increased from `V10.6.89` to `V10.6.90`.

## [1.0.24] - 2026-07-25

### Fixed

- Restored normal type-8 Incident Response Vehicle / Police Car selection in both manual Unit Finder and Auto Mode.
- Generic Police attendance now prefers verified ordinary IRVs, then unknown or stale IRVs, and uses known specialist-trained IRVs only when the ordinary pool is insufficient.
- Any already selected exact type-8 IRV now counts toward a generic Police Car requirement, preventing trained IRVs from being ignored and duplicate cars from being requested.
- `Missing Personnel: Police Officers` remains actionable when the Live Mission Requirements panel is present and converts at two officers per Police Car, including `Police Officers: 3`-style wording.

### Safety and performance

- Named Police Inspector, Police Medic, Public Order, Railway Police and other trained-personnel requirements remain exact type-8, exact-vehicle-ID and live-assignment verified.
- Generic Police Car selection no longer scans multiple `/zuweisung` pages before choosing ordinary attendance; the training registry is used only to rank ordinary, unknown and specialist fallback candidates.
- Added permanent regression checks for ordinary-first ordering, specialist fallback, selected trained-IRV counting and live-panel Missing Personnel parsing.

### Changed

- Mission Finder increased from `V10.6.88` to `V10.6.89`.

## [1.0.23] - 2026-07-24

### Added

- Added automatic collection for visible seasonal mission items, including the current summer sunflower, when MissionChief renders the exact `#easter-egg-link` claim control.
- The collector recognises only `/missions/{id}/claim_found_object_sync`, including mission content rendered inside same-origin lightboxes and iframes.

### Safety and performance

- Claims use a same-origin background GET, so collecting an item does not navigate away from the mission or interrupt dispatch selection.
- Duplicate requests are guarded by an in-flight/retry cooldown and a bounded claim cache.
- The collector uses a lightweight one-second exact-ID scan and adds no new `MutationObserver`, preserving the v1.0.22 runtime-hardening contract.

### Changed

- Mission Finder increased from `V10.6.87` to `V10.6.88`.

## [1.0.22] - 2026-07-24

### Fixed

- Resource Administration on iOS Safari now follows only the visibly rendered personal Stations view, removing the stale panel from Map, Missions, Chat and Radio while preserving one panel instance and its saved state.
- Mission Finder now preserves its observer, timers and listeners during Safari bfcache entry and reconciles the restored page on `pageshow` instead of returning with a torn-down runtime.
- The personnel-training registry update listener now has a named owner and deterministic teardown.

### Performance

- Consolidated two full-document Resource Administration observers into one filtered, animation-frame-coalesced lifecycle controller.
- Mission Finder now ignores mutations generated inside its own panel while retaining wrapper creation/removal detection and all mission, patient, vehicle and transport invalidation paths.
- Added permanent runtime-hardening tests for observer count, lifecycle decisions, bfcache preservation, listener ownership and self-mutation exclusion.

### Changed

- Unit Naming increased from `3.3.7` to `3.3.8`.
- Mission Finder increased from `V10.6.86` to `V10.6.87`.
- Desktop Resource Administration, Mission Control, vehicle selection, trained-personnel verification and fail-closed dispatch safeguards remain on their established paths.

## [1.0.21] - 2026-07-23

### Added

- Added `Firefighter`, `Firefighters` and `Required` aliases mapped to `Rescue Pump`.
- Added `Car Recovery` and `Required Car Recovery` aliases mapped to the existing `Flatbed Recovery Vehicle`.
- Added singular, plural and `Required` aliases for `RIV or Major Foam Tender`.

### Changed

- Firefighter personnel requirements now convert at 9 personnel per Rescue Pump: 1–9 → 1, 10–18 → 2, and so on.
- `RIV or Major Foam Tender` now selects eligible type-76 RIVs first and uses a type-75 Major Foam Tender only when no eligible RIV is available.
- Mission Finder increased from `V10.6.85` to `V10.6.86`.

## [1.0.20] - 2026-07-23

### Fixed

- Added the exact Fire cross-reference `Road Rail Unit` → `RRU`.

### Verified

- Police Medic personnel counts continue to use two `police_medic`-trained personnel per exact type-8 IRV: 1 → 1 IRV, 2 → 1 IRV and 3 → 2 IRVs.

### Changed

- Mission Finder increased from `V10.6.84` to `V10.6.85`.

## [1.0.19] - 2026-07-22

### Fixed

- Mapped the exact `Fire, rescue or aerial appliance` mission requirement to `Rescue Pump`.

### Changed

- Mission Finder increased from `V10.6.83` to `V10.6.84`.

## [1.0.18] - 2026-07-22

### Added

- Enabled Railway Fire (2 `railway_fire` per type-107 RRU), Level 1 Incident Commander (3 `elw2` per type-15 ICCU) and HazMat (3 `gw_gefahrgut` per type-39 Fire OSU) personnel profiles.

### Fixed

- Mission Control now uses an iOS Safari-only safe-area top layout instead of opening as the centred 560px desktop interface over the dispatch screen.
- Added a horizontal chevron collapse control, pointer dragging and visual-viewport recovery for Safari address-bar changes, rotation and bfcache restoration.
- The Vehicle Load List defaults collapsed on first iOS Safari use and uses mobile-specific collapse storage without changing desktop preferences.

### Changed

- BASU, Welfare and HazMat mission wording now shares one exact type-39 Fire OSU; type-86 SAR Operational Support Vans remain separate.
- High Volume Pump, Drone Operator, Co-Responder and Lifeguard remain disabled pending later evidence.
- Desktop Mission Control sizing, saved positioning, centring and mouse dragging remain unchanged.
- Personnel Assignment increased to `1.3.2`; Mission Finder increased to `V10.6.83`.

## [1.0.17] - 2026-07-22

### Fixed

- Restored the `Operational Support or SAR Vehicle` requirement mapping to `Operational Support Van`.
- Unit Finder, Mission Update/Upgrade and final selected-unit verification now use the exact MissionChief type-86 Operational Support Van.
- Fire Operational Support Units using type 39 are explicitly excluded from satisfying the SAR requirement.
- Added current, legacy, singular, plural, `Required` and `x1` wording aliases for the same requirement.

### Changed

- Mission Finder increased from `V10.6.80` to `V10.6.81`.

## [1.0.16] - 2026-07-22

### Changed

- Restore Unit Naming, Station Naming, Personnel Assignment and Personnel Register station discovery on the responsive iOS Stations tab.
- Enforce exactly one Command Nexus tools menu after Safari bfcache restoration or duplicate injection.
- Add a same-origin iOS station iframe fallback when responsive Details links do not activate MissionChief lightboxes.
- Increased the unified userscript version from `1.0.15` to `1.0.16`.

## [1.0.15] - 2026-07-22

### Added

- Added Safari website support on iPhone and iPad for the shared Unit Naming, Station Naming and Personnel Assignment menu.
- Added iPad desktop-site detection through `MacIntel` plus touch capability while excluding Chrome, Firefox, Edge and native iOS webview wrappers.
- Added touch/pointer dragging and visual-viewport clamping for the shared tools panel.

### Fixed

- Fixed the shared tools menu not appearing when MissionChief uses the responsive iOS station-list markup.
- Fixed the 470px desktop panel width placing the menu partly or completely outside an iPhone viewport.
- Fixed panel positioning after Safari address-bar changes, bfcache restoration and device rotation.

### Changed

- Unit Naming increased from `3.3.5` to `3.3.6`.
- Station Naming increased from `1.3.1` to `1.3.2`.
- Personnel Assignment increased from `1.2.9` to `1.3.0`.

### Preserved

- Desktop layout, station and vehicle filtering, naming rules, personnel assignment rules, logs, reports, pause/stop controls and saved active-tab/collapse state remain unchanged.

## [1.0.14] - 2026-07-21

### Fixed

- Unit Finder now uses the visible Live Mission Requirements panel as the authoritative source whenever it exists, preventing stale mission-help rows from requesting outdated units.
- A current `Rescue Support Vehicles` live row can no longer be replaced by an outdated `Major Foam Tender` mission-help requirement.
- Numeric or bounded `Still Needed` values are now treated as shortages and are no longer reduced by already-selected units a second time.
- `Still Needed = ?` continues to use `Required` as a total target and deducts existing matching selections.
- Successful selection clicks are included in final confirmation, preventing a false `Fire Engines or RIVs x2` warning when the live shortage was one.

### Preserved

- Static mission-help remains the fallback when no live requirements panel exists.
- Armed Personnel exact type-25 Armed Traffic Car selection remains enabled.

### Changed

- Mission Finder increased from `V10.6.79` to `V10.6.80`.

## [1.0.13] - 2026-07-21

### Fixed

- Mission Update/Upgrade now uses a numeric `Still Needed` value as the dispatch shortage instead of replacing it with the full `Required` total.
- A bounded `Still Needed` range such as `0-3` continues to use its upper bound.
- A literal `Still Needed` value of `?` now falls back to the row's `Required` value.
- Existing matching selections are still deducted before additional vehicles are selected.

### Preserved

- The v1.0.12 Armed Personnel to exact type-25 Armed Traffic Car route remains enabled, including Roads Policing plus Firearms live verification and the two-person-first/one-person-fallback policy.

### Changed

- Mission Finder increased from `V10.6.78` to `V10.6.79`.

## [1.0.12] - 2026-07-21

### Fixed

- Mission Update/Upgrade now uses the confirmed `Required` column as its total vehicle target instead of using `Still Needed` as the target quantity.
- Existing selected vehicles are still counted and subtracted before any new selections, preventing duplicate dispatches while fulfilling the full required total.
- Unknown unresolved `?` rows remain blocked from full-target dispatch unless the existing trusted-row rules provide a confirmed actionable value.
- Unit Finder now converts `Armed Personnel`, `Armed Response Personnel` and their `Required`/`In Armed Vehicles` variants into the trained Armed Traffic Car route.
- Armed personnel requirements now live-verify and select exact type-25 Armed Traffic Cars carrying Roads Policing and Firearms-qualified personnel.

### Changed

- Mission Finder increased from `V10.6.77` to `V10.6.78`.

### Preserved

- Exact vehicle-ID assignment-page verification, two-person preference, one-person trained fallback, ordinary IRV protection, patient authority rules and genuine trained-personnel shortfall warnings remain enabled.

## [1.0.11] - 2026-07-21

### Fixed

- Restored the live `4x4 Vehicle` requirement link in Unit Finder and Mission Update/Upgrade by matching the exact MissionChief type-66 4x4 Vehicle.
- Kept the explicit `Mountain Rescue 4x4 or SAR 4x4` requirement on its separate type-99/type-93 specialist pool.
- Restored raw live-table `SAR Commander` conversion at both shared processing entry points: two SAR Commanders are covered by one Control Van.
- Added direct SAR Commander aliases so singular, plural and `Required` labels resolve consistently.

### Changed

- Mission Finder increased from `V10.6.76` to `V10.6.77`.

### Preserved

- Existing SARTEC, Search Advisor, Mountain Rescue, SAR 4x4, Control Van, trained-personnel, patient and vehicle verification rules remain enabled.

## [1.0.10] - 2026-07-21

### Added

- Added issue #63 Unit Class filtering directly below Station Type in the Unit Naming Tool.
- Unit Class options are generated from the vehicle classes valid for the selected station type, with All classes preserving the existing broad rename behaviour.
- Selected-station and all-matching-stations runs now filter the lightweight vehicle queue before opening any vehicle edit page, preventing unrelated classes from being renamed.

### Changed

- Trained Police vehicle selection now prefers exact vehicles carrying two correctly trained personnel, then falls back to exact vehicles carrying one correctly trained person when no two-person option remains.
- Trained mission fulfilment is now measured against the complete qualified-personnel demand, so one-person fallback vehicles continue to be selected until the requirement is genuinely covered.
- One-person registry hints are prioritised after two-person hints and before ordinary arrival-limited candidates.
- Unit Naming Tool increased from `3.3.4` to `3.3.5`.
- Mission Finder increased from `V10.6.75` to `V10.6.76`.

### Preserved

- Critical Care Ambulances remain one Critical Care-trained person per ambulance.
- Exact vehicle-ID assignment-page verification, vehicle-type restrictions, multi-profile matching, ordinary IRV protection and genuine shortfall warnings remain enabled.

## [1.0.9] - 2026-07-20

### Fixed

- Fixed urgent issue #57: Level 1 Public Order, Level 2 Public Order and Police Sergeant requirements are now matched independently instead of being collapsed into one mandatory combined profile bundle.
- Sergeant-only, Level 1-only, Level 2-only and Police Medic-only personnel now qualify for missions requesting their exact training profile.
- Multi-trained personnel continue to qualify for every requested profile they actually hold without unrelated training becoming a prerequisite.
- Preserved exact type-8 IRV verification, two trained personnel per selected IRV, capacity controls and genuine missing-training shortfall warnings across Unit Finder, Mission Update and Auto Mode.

### Changed

- Mission Finder increased from `V10.6.74` to `V10.6.75`.

## [1.0.8] - 2026-07-20

### Fixed

- Fixed Unit Naming long runs retaining the full original station document while navigating through every vehicle edit page.
- Replaced Unit Naming iframe navigation history entries instead of continually appending edit-page history.
- Closed the modal associated with the active Unit Naming iframe rather than the first close control in the document.
- Cleared hidden or reused station iframes after each station so old station and vehicle documents can be garbage collected.
- Released edit-document and form-control references before each post-save delay and guaranteed iframe cleanup after stop, error or page exit.

### Changed

- Unit Naming increased from `3.3.3` to `3.3.4`; naming rules, vehicle order, numbering and save behaviour are unchanged.

## [1.0.7] - 2026-07-20

### Fixed

- Fixed Mission Update treating bounded unresolved requirement ranges such as `0-3` and `0-1` as zero by reading only the first number.
- Mission Update now uses the upper bound of an explicit range, allowing Fire Engine, ICCU/ACU, Police Car, PRV and SRV shortages from the live panel to reach the normal selector.
- Kept the existing safety behaviour for a completely unknown naked `?`, so unsupported unresolved rows still cannot resend an entire original mission load.
- Applied the corrected live-range interpretation to manual Mission Update and the shared Auto Mode update path.

### Changed

- Mission Finder baseline increased from `V10.6.73` to `V10.6.74`.

## [1.0.6] - 2026-07-20

### Added

- Added exact Armed Response mission matching for `Required Armed Response Personnel (In Armed Vehicles)`, using type-25 Armed Traffic Cars with two personnel who each hold both Roads Policing and Firearms.
- Expanded the one-click Personnel Register builder to every station type and every discovered vehicle, reading each vehicle's own assignment page before recording trained personnel.
- Added strict Seagoing Vessel matching for ALB/ABL and All-weather Lifeboat display variants.

### Changed

- Changed the Medical Critical Care assignment target from two trained personnel to one trained person per normal Ambulance, including Preview, Live, target planning, shortfall and reporting calculations.
- Police Officer mission-upgrade rows now convert at two officers per normal Police IRV before Unit Finder, Mission Update or Auto Mode selects vehicles.
- Mission Finder baseline increased from `V10.6.72` to `V10.6.73`; Personnel Assignment increased from `1.2.8` to `1.2.9`.

### Fixed

- Fixed issue #42 by stopping the Personnel Assignment Tool from planning or assigning a second unnecessary Critical Care-trained person to each Ambulance.
- Fixed issue #30 by restoring Armed Response Personnel selection through dual-trained Armed Traffic Cars without excluding officers who also hold Firearms training.
- Fixed live upgrade rows such as `Police Officers x8` selecting eight IRVs instead of four.
- Fixed Seagoing Vessel upgrade rows falling through generic text matching instead of selecting an exact ALB/ABL vehicle.
- Fixed the register builder copying a single vehicle-page snapshot across a station instead of recording exact vehicle assignments.

## [1.0.5] - 2026-07-20

### Added

- Added a one-click **Build Personnel Register** action that scans Police, Police Aviation and EOD stations without changing staffing assignments or requiring profile, mode, action or start-point setup.
- Added exact trained-IRV mission selection for **Police Medic** and **Railway Police Officer**, using two correctly trained personnel per IRV.

### Changed

- Ordinary Police Car attendance now accepts a freshly verified exact IRV with zero protected specialist qualifications even when no personnel are permanently bound to that vehicle.
- Mission Finder baseline increased from `V10.6.71` to `V10.6.72`; Personnel Assignment increased from `1.2.7` to `1.2.8`.

### Fixed

- Fixed ordinary Police Cars being rejected by Unit Finder, Mission Update and Auto Mode solely because their assignment page reported zero permanent bindings.
- Fixed issue #16 by mapping Police Medic requirement rows and Missing Personnel text to exact IRVs containing two `police_medic`-trained personnel.
- Added Railway Police Officer parsing for both table and alert layouts, selecting exact type-8 IRVs containing two `railway_police`-trained personnel.
- Added an authoritative type-30 ATV Carrier matcher, including `ATV Carrier`, `ATV` and `ATC Carrier` display aliases without matching Police Armed Traffic Cars.
- Prevented incomplete or structurally invalid assignment-page scans from overwriting or authorising specialist-training decisions.

## [1.0.4] - 2026-07-20

### Changed

- Auto Mode now activates every visible MissionChief `missing_vehicles_load` control before Unit Finder begins selecting vehicles.
- Increased the unified userscript version from `1.0.3` to `1.0.4` and the Mission Finder baseline from `V10.6.70` to `V10.6.71`.

### Fixed

- Fixed Auto Mode waiting on the `Vehicle display limited! Load more vehicles!` bar without clicking it.
- Added sequential `offset_page` loading so every additional vehicle page is requested, not only the first page.
- Added per-page progress checks using the vehicle ID and row-count signature, control replacement and loading-indicator state.
- Unit selection now starts only after the final load control has disappeared and the complete vehicle list remains stable.
- Loading fails closed when the mission changes, the control cannot be clicked, no progress occurs or the bounded timeout is reached.

## [1.0.3] - 2026-07-20

### Changed

- Normal Police Car and Police Officer attendance now uses only exact-ID IRVs live-verified with assigned staff and no protected specialist Police training.
- Auto Mode and the manual Unit Finder/Mission Update paths now wait for a complete, non-zero, ID-stable vehicle list after loading finishes before selecting units.
- Increased the unified userscript version from `1.0.2` to `1.0.3`.

### Fixed

- Prevented Level 1, Level 2, Sergeant, Medic, Inspector and other specialist-trained Police IRVs from satisfying ordinary Police attendance requirements.
- Prevented an ordinary Police group-button fallback from bypassing exact vehicle training protection.
- Prevented Auto Mode from continuing to selection or dispatch when the vehicle list times out, remains empty or is still changing.

## [1.0.2] - 2026-07-19

### Changed

- Adds verified GitHub, Greasy Fork and Discord deployment notifications. This release tests the complete automated publication and validation process without changing MissionChief runtime behaviour.
- Increased the unified userscript version from `1.0.1` to `1.0.2`.

## [1.0.1] - 2026-07-19

### Changed

- Increased the unified userscript version from `1.0.0` to `1.0.1` without functional changes.
- Confirmed the canonical `main`-branch source synchronization path used for external distribution.

## [1.0.0] - 2026-07-19

### Added

- First canonical MissionChief Command Nexus userscript.
- One standardized userscript metadata block naming MartyBlyth as author.
- Mission Finder `V10.6.69` baseline.
- Unit, Station & Personnel Tools `V4.2.8` baseline.
- One combined installation guard with retained module startup isolation.
- Unit and station naming workflows.
- Personnel assignment, verification and reporting workflows.
- Shared vehicle-training registry.
- Mission requirement, patient and specialist-resource handling.
- Qualification-aware vehicle selection.
- Unit Finder, Mission Update, dispatch and Auto Mode workflows.
- Queue continuation and transport handling.
- JavaScript, metadata, file-size and version-increase validation.
- Tag-driven GitHub Release packaging with a userscript asset and SHA-256 checksum.
- Greasy Fork synchronization, rollback and troubleshooting guidance.
- Contribution, support, security and community policies.

## Release format

Future entries use:

```text
## [x.y.z] - YYYY-MM-DD
### Added
### Changed
### Fixed
### Removed
### Security
```

Release notes should describe user-visible behaviour, migration impact, tested environments and known limitations rather than commit history alone.
