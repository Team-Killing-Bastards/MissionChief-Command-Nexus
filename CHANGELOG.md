# Changelog

All notable changes to MissionChief Command Nexus are documented here.

The project uses Semantic Versioning for the unified userscript release line.

## [Unreleased]

No changes have been queued after `1.1.8`.

## [1.1.8] - 2026-08-18

### Changed

- Read Maximum amount of trucks to tow from mission-definition Other information and feed the value into the existing strict HGV Recovery type-106 path. Use Minimum amount of trucks to tow only as a fallback when Maximum is absent or invalid, never add both values together, and preserve the existing Flatbed Recovery car-towing rule. Add permanent regression coverage based on the supplied MissionChief mission HTML.
- Increased the unified userscript version from `1.1.7` to `1.1.8`.

## [1.1.7] - 2026-08-18

### Added

- Added an attached **Patient Transfers** drawer beside Mission Control for the default-off background patient transport worker. The collapsed tab exposes the live pending count and a warning when the current Auto Mode run has terminal failures; expanding it shows Pending, Completed this run and Failed this run counters, the current worker state, last completion time and the queued patient/vehicle requests.
- Added a bounded ten-entry terminal failure history with exact worker reasons and the retained reason from each of the worker's maximum three attempts. The log persists after Auto Mode stops so live failures can be diagnosed, and includes an explicit Clear control.
- Manual Auto Mode start resets only the run counters. The real queue remains authoritative for Pending, the existing lifetime sent counter remains intact, and terminal failures are counted only after the existing three-attempt safety limit is exhausted.

### Compatibility

- The patient transport engine itself is unchanged: exact same-origin patient routes, available-hospital selection, hidden worker rendering, prisoner/cell exclusion, 40-request queue limit, three-attempt retry bound, stop handling and Auto Mode continuation remain authoritative.
- The new drawer reuses the attached Vehicle Load interaction pattern on desktop and keeps the established iPhone/iPad Safari mission surfaces isolated. Opening Patient Transfers collapses Vehicle Load and opening Vehicle Load collapses Patient Transfers.
- Added `scripts/check-patient-transfer-drawer-v117.mjs`. Increased Command Nexus from `1.1.6` to `1.1.7` and Mission Finder from `V10.7.4` to `V10.7.5`; all other component versions remain unchanged.

## [1.1.6] - 2026-08-18

### Changed

- Replaced the per-browser logger pairing/token flow with a much simpler private deployment profile: Settings now stores one private Google Apps Script `/exec` URL plus an active user choice (`Marty` or `Conroy`). The same setup can be reused on any browser or computer; browser-generated device IDs remain diagnostics only.
- The Apps Script backend now resolves the submitted profile name against the single active `Players` record server-side and assigns the canonical `player_id` itself. Browser event-level player identity is never trusted, while unknown, disabled or duplicate active names fail closed.
- Removed one-time pairing-code generation, token issuance/expiry, device revoke buttons and Disconnect as active security controls. Legacy pair/revoke requests return `PAIRING_DISABLED`; historical `Pairings` / `Devices` sheet schema is retained for compatibility only.
- First migration from a legacy token profile, or a later change of the private URL/user, deliberately clears that browser's legacy token, local queue, pending batch, observation dedupe, mission registry and upload lock. Saving the same current URL/user again keeps the queue intact.
- The existing loss-resistant `1.1.5` outbox/drain behavior, exact mission/dispatch/journey evidence, completion recovery, dashboard, backups and weekly archive remain unchanged after the identity simplification.
- Security boundary: the new private `/exec` URL is effectively the credential for this approved two-user deployment and must not be committed, posted to Discord or included in screenshots. A leak requires creating a new deployment URL.
- Deployment requirement: do **not** reuse the pre-`1.1.6` Apps Script deployment because that URL exists in public userscript history. Publish the merged `Code.gs` as a brand-new Web app deployment and verify build marker `1.1.6-private-profile-1`.
- Added `scripts/check-private-url-logger-profile.mjs` and updated logger/dashboard/journey regressions to enforce the private-profile backend contract. Increased Command Nexus from `1.1.5` to `1.1.6` and Mission Finder from `V10.7.3` to `V10.7.4`; all other component versions remain unchanged.

## [1.1.5] - 2026-08-18

### Changed

- Reworked Mission Analytics outbox draining for high-volume mission generation. The local queue now permits up to 1,200 events within the existing 3 MB storage ceiling, automatic passes drain up to eight 40-event batches and manual/reconnect passes drain up to twelve. A follow-up bounded pass is scheduled while backlog remains.
- `Sync now` is handed to the authoritative top-window logger owner when invoked from a mission frame/pop-out and no longer silently returns when another upload or tab lock is active. The request is queued as a full manual drain and the UI reports `Drain queued`, accepted-event totals and per-batch remaining counts.
- The cross-tab upload lock is renewed before each batch. A timed-out Google response is reconfirmed once with the same idempotent batch ID before leaving the batch queued for a later pass. Eager uploads start at 20 queued events.
- Overflow retention now discards low-value `mission-observed` evidence before dispatch, mission-completed or exact-credit evidence. Previously dropped local events cannot be reconstructed.
- Added a default-off **Handle patient transports in the background** setting. During Auto Mode, exact same-origin Transport Patient requests are queued and processed one at a time in an off-screen MissionChief frame so the visible mission queue can continue; destinations must still expose confirmed free hospital capacity.
- The patient worker caps its queue at 40 requests, retries each request at most three times, reports Watching/Queued/Sending/Retrying/Sent/Failed state and clears immediately when the setting or Auto Mode stops. Prisoner/cell transport remains on the established foreground route.
- Added `scripts/check-background-patient-transport-worker.mjs` and `scripts/check-mission-logger-outbox-drain.mjs`, and expanded `scripts/check-mission-user-logger.mjs`. Increased Command Nexus from `1.1.4` to `1.1.5` and Mission Finder from `V10.7.2` to `V10.7.3`; all other component versions remain unchanged.

## [1.1.4] - 2026-08-17

### Fixed

- Moved Mission Analytics dispatch capture onto the actual Nexus dispatch functions instead of relying only on a document click listener. Every manual, manual-share, Auto Mode, auto-share, auto-not-ready, Ally Steal and upgrade re-dispatch now prepares its selected-unit snapshot before MissionChief clears the checkbox state, invokes the native control, then commits the exact event.
- Retained the native dispatch listener as a compatibility path while adding direct programmatic fallback capture and shared fingerprint dedupe, so one physical dispatch cannot be logged twice when both routes see it.
- Added dispatch-source diagnostics (`dispatchCaptureSource`, `dispatchControlId`, `selectedUnitCount`) and rejects zero-unit snapshots.
- Added `scripts/check-mission-dispatch-path-logger.mjs` to permanently cover every Nexus dispatch mode. Increased Command Nexus from `1.1.3` to `1.1.4` and Mission Finder from `V10.7.1` to `V10.7.2`; all other component versions remain unchanged.

## [1.1.3] - 2026-08-17

### Added

- Added automatic current-player mission-generation capture to the opt-in Mission Analytics Logger from MissionChief's native mission list, including safe startup catch-up without depending on opening the mission detail page.
- Added `scripts/check-mission-generation-logger.mjs` to lock current-user ownership, baseline-only initial list hydration, native callback preservation and duplicate suppression through the existing observation registry.

### Fixed

- Expanded the shared dispatch-journey reader so it accepts MissionChief's native route evidence from the selected input and nested metric cells as well as the enclosing row, with bounded parsing of explicit distance/duration units when native attributes are unavailable.
- Reused the same journey evidence for vehicle arrival ordering and Mission Analytics dispatch rows so route metrics are interpreted consistently; historical blank journey fields remain blank because MissionChief's dispatch-time evidence is no longer available after the fact.
- Increased Command Nexus from `1.1.2` to `1.1.3` and Mission Finder from `V10.7.0` to `V10.7.1`; all other component versions remain unchanged.

## [1.1.2] - 2026-08-16

### Added

- Added MissionChief-native dispatch journey evidence to the opt-in Mission Analytics Logger. Each selected unit may now carry the dispatch-time estimated route distance in kilometres and ETA in seconds when MissionChief exposes those native attributes.
- Extended the existing `Dispatch Units` schema with `estimated_distance_km` and `estimated_eta_seconds`, retained the values in the weekly raw archive, and added compact `Journey Data` aggregation plus Station coverage and Furthest dispatch tables on the existing dashboard.
- Added `scripts/check-mission-journey-metrics.mjs` to permanently cover native attribute parsing, compatible sheet migration, Journey Data aggregation and station placement formulas.

### Compatibility

- Missing, invalid or historical route metrics remain blank; Nexus does not estimate or backfill them.
- Existing Apps Script endpoint, spreadsheet, players, devices, pairings, dashboard link and historical rows stay in place. Deploy the updated `Code.gs` as a **New version** of the existing web app and initialise once so the two trailing unit columns and Journey Data/dashboard surfaces are created.
- Increased Command Nexus from `1.1.1` to `1.1.2`; Mission Finder remains `V10.7.0` and all Resource Administration component versions remain unchanged.

## [1.1.1] - 2026-08-15

### Added

- Added resumable MissionChief Credits-ledger recovery for dispatched missions that completed while every paired browser was offline. Recovery requires the exact mission ID plus normalized title, uses the authoritative transaction timestamp and exact positive amount, and fails closed on title-only or side transactions.
- Added bounded recovery checkpoints so a long Credits catch-up pauses before the existing outbox limit, resumes the same partially processed page after upload space is available, and does not advance the last-successful checkpoint after a failed fetch.
- Reused the existing browser `online` event and `Sync now` action to request immediate catch-up without adding a new timer, observer or worker.

### Compatibility

- Existing Apps Script endpoint, workbook, dashboard link, browser pairings, device tokens, local queued events and Greasy Fork installation/update route remain unchanged.
- Added recovery coverage to `scripts/check-mission-user-logger.mjs`. Increased Command Nexus from `1.1.0` to `1.1.1`; Mission Finder remains `V10.7.0` and all Resource Administration component versions remain unchanged.

## [1.1.0] - 2026-08-15

### Added

- Added an opt-in Mission Analytics Logger that pairs each browser/origin to a stable player profile, captures exact player mission observations, dispatch snapshots, current requirements, patient demand and awarded-credit evidence, and uploads idempotent 40-event batches to the bundled Google Apps Script backend.
- Added the Google Sheets logger backend with `Players`, `Pairings`, `Devices`, `Mission Events`, `Dispatch Units`, `Mission Summary`, `Dashboard Data` and `Upload Batches`, plus automatic five-minute sync, exact MissionChief Credits-ledger matching, all-weeks dashboard formulas, daily JSON Drive backups and copy-verified weekly archive/purge.
- Added install-time local migration guards and permanent `scripts/check-mission-user-logger.mjs` coverage. Increased Command Nexus from `1.0.127` to `1.1.0` and Mission Finder from `V10.6.164` to `V10.7.0`; all Resource Administration component versions remain unchanged.

## [1.0.127] - 2026-08-14

### Added

- Added exact Fire/Airfield Personnel Assignment profiles for Aircraft Rescue and Firefighting (types 75/76/77/78), Co-Responder (type 18) and Fire Drone (type 90), plus exact HVP pod type 50 → Prime Mover type 40 and Boat Trailer type 74 → Light 4x4 type 73 companion resolution.
- Added exact SAR/Coastguard Personnel Assignment profiles for Cave, Coastal Air, Coastal Command, Search Advisor, Dog, SAR Drone, Lifeboat, Mud, Rope and Search Management fixed vehicles, plus Flood, Hovercraft, Jet Ski and Lifeguard trailer-to-tractor profiles with exact courses and seat targets.
- Added deterministic companion resolution through MissionChief's station vehicle API using explicit `tractive_vehicle_id` first and only a unique one-companion/one-eligible-tractor fallback; ambiguous pairings and API failure fail closed.
- Added overlap-safe full-service batches that merge every applicable course requirement onto the same actual fixed crew, preserving existing occupants and exact pre/post write verification.
- Added Rescue Stairs-first / CARP-remainder selection for Aerial Appliance Truck or Rescue Stairs requirements, including matching selected-unit verification.
- Added permanent regressions for Fire/Airfield profiles, SAR/Coastguard profiles, companion rules and Rescue Stairs priority, plus privacy-safe evidence records for issues #18 and #19.
- Increased Command Nexus from `1.0.126` to `1.0.127`, Mission Finder from `V10.6.163` to `V10.6.164` and Personnel Assignment from `1.3.11` to `1.3.12`; Unit Naming and Station Naming remain unchanged.

## [1.0.126] - 2026-08-14

### Fixed

- Fixed trained-personnel live verification after the strict v1.0.123 dispatch gate. Exact compatible vehicles with missing or stale Personnel Register evidence are now admitted to the verification candidate pool so their current assignment pages can refresh the record before final selection.
- Kept final dispatch strict: wrong vehicle types remain excluded, while missing, stale or partial exact-vehicle evidence still cannot satisfy Required Personnel. Unit Finder, Mission Update and Auto Mode continue to fail closed until fresh, complete register evidence proves the required qualifications.
- Added `scripts/check-trained-personnel-live-verification-pool.mjs` and a privacy-safe evidence note for issue #331. Increased Command Nexus from `1.0.125` to `1.0.126` and Mission Finder from `V10.6.162` to `V10.6.163`; all Resource Administration component versions remain unchanged.

## [1.0.125] - 2026-08-14

### Added

- Added live Medical Personnel Assignment profiles for Ambulance Officer, HART, Tactical Command, SORT, Midwifery and Specialist Paramedic with exact UK vehicle/course/seat/building mappings.
- Added a **Run all Medical** batch that runs specialist profiles first and exact type-5 Critical Care last while reusing the existing service-aware background assignment engine.
- Added strict Preview/Live verification for each Medical profile, including exact vehicle-type checks before writes, per-vehicle confirmation and final-station validation; training shortfall remains separate from assignment shortfall.
- Added permanent `scripts/check-medical-personnel-assignment-profiles.mjs` coverage plus `docs/evidence/issue-17-medical-training-profiles.md`.
- Increased Command Nexus from `1.0.124` to `1.0.125` and Personnel Assignment from `1.3.10` to `1.3.11`; Mission Finder, Unit Naming and Station Naming remain unchanged.

## [1.0.124] - 2026-08-14

### Fixed

- Corrected the Search Dog Unit identity from legacy assumed type 101 to exact native MissionChief UK vehicle type `102` after supplied mission-row DOM proved the native checkbox and containing row both expose `vehicle_type_id="102"` for `Search Dog Unit (SAR)`.
- Updated Mission Finder candidate selection and selected-unit verification to require exact type 102; type 101 is rejected and Police Dog Support Unit / DSU remains separate.
- Added privacy-safe native evidence under `docs/evidence/issue-300-search-dog-vehicle-type.md` plus cross-module consistency regression coverage. Increased Command Nexus from `1.0.123` to `1.0.124` and Mission Finder from `V10.6.161` to `V10.6.162`; Resource Administration component versions remain unchanged.

## [1.0.123] - 2026-08-14

### Changed

- Enforced fail-closed trained-personnel selection everywhere qualification evidence matters. Missing, stale or partial Personnel Register evidence no longer falls back to nominal vehicle capacity or an untrained correct-type vehicle.
- Unit Finder and Mission Update remain blocked while trained coverage cannot be proven; Auto Mode now stops without clicking Dispatch rather than treating nominal capacity as trained staff.
- Added explicit stale-register detection and manual Mission Update recovery for a previous trained-personnel block. Increased Command Nexus from `1.0.122` to `1.0.123` and Mission Finder from `V10.6.160` to `V10.6.161`.

## [1.0.122] - 2026-08-14

### Fixed

- Corrected generic `Require Drone`, `Requires Drone` and `Required Drone` mission rows so they can use the exact Drone Vehicle (SAR HQ) type `89` or Police Drone Vehicle type `91`, ordered by best arrival, across fresh Unit Finder, Mission Update fallback and selected-unit verification.
- Kept explicit Police Drone strict to type `91`, explicit Police Helicopter strict to type `11`, and `Police Helicopter or Drone` on its established Police Drone-first / Police Helicopter-fallback path.
- Added `scripts/check-generic-drone-family-v10122.mjs`. Increased Command Nexus from `1.0.121` to `1.0.122` and Mission Finder from `V10.6.159` to `V10.6.160`.

## [1.0.121] - 2026-08-14

### Fixed

- Fixed standalone `/leitstellenansicht` naming when Dispatch Centre controls mount before all native station cards finish rendering. Refresh Stations now forces a fresh native `leitstelle_building_id` scan instead of reusing the initial empty membership snapshot.
- Refresh Dispatch Centres now reapplies that fresh membership map to already-loaded Unit Naming and Station Naming station snapshots before rebuilding Dispatch Centre → Service → Station Type → Start From.
- Added `scripts/check-naming-popout-late-membership-v10121.mjs`. Increased Command Nexus from `1.0.120` to `1.0.121` and Unit Naming from `3.3.26` to `3.3.27`; Station Naming increased from `1.3.21` to `1.3.22`; Mission Finder and Personnel Assignment remain unchanged.

## [1.0.120] - 2026-08-14

### Fixed

- Fixed Resource Administration mounting in a top-level popped-out `/leitstellenansicht` before all native station rows render. The complete Unit Naming, Station Naming and Personnel Assignment workspace now becomes authoritative as soon as a connected station entry appears, while unrelated top-level pages and child frames remain excluded.
- Reused the verified same-origin background native-form save path for Station and Unit naming from the pop-out; it does not open per-resource lightboxes and does not depend on `window.opener`.
- Added `scripts/check-background-resource-admin-popout-v10120.mjs` and increased Command Nexus from `1.0.119` to `1.0.120`; component versions remain Unit Naming `3.3.26`, Station Naming `1.3.21`, Personnel Assignment `1.3.10` and Mission Finder `V10.6.159`.

## [1.0.119] - 2026-08-14

### Added

- Added same-origin background native-form handling for Unit Naming, Station Naming and Personnel Assignment so Preview/Live can read and save exact resource forms without opening each vehicle/station page in the MissionChief lightbox.
- Station and Unit bulk runs now use the shared background request path with exact per-resource verification; Personnel Assignment background writes retain exact service/profile checks, pause/stop boundaries and final verification.
- Added `scripts/check-background-resource-admin-v10119.mjs`; increased Command Nexus from `1.0.118` to `1.0.119`, Personnel Assignment from `1.3.9` to `1.3.10`, Unit Naming from `3.3.25` to `3.3.26` and Station Naming from `1.3.20` to `1.3.21`; Mission Finder remains `V10.6.159`.

## [1.0.118] - 2026-08-14

### Fixed

- Corrected `Fire Engines or RIVs` to select exact type-76 Rapid Intervention Vehicles before exact type-16 Rescue Pumps, topping up only the remaining shortfall and counting both families toward the same requirement.
- Added `scripts/check-fire-engine-or-riv-priority-v10118.mjs`; increased Command Nexus from `1.0.117` to `1.0.118` and Mission Finder from `V10.6.158` to `V10.6.159`.

## [1.0.117] - 2026-08-14

### Fixed

- Included Railway Police Officers inside the existing exact Public Order Support Unit (PSU) trained-personnel coverage path for Unit Finder, Mission Update and Auto Mode.
- Added `scripts/check-railway-police-psu-v10117.mjs`; increased Command Nexus from `1.0.116` to `1.0.117` and Mission Finder from `V10.6.157` to `V10.6.158`.

## [1.0.116] - 2026-08-14

### Fixed

- Corrected Mission Update vehicle shortfall to use the live remaining target (`Missing - En-route`) before selected-unit subtraction, preventing an extra vehicle when MissionChief already shows one en route and the remaining need is zero.
- Added `scripts/check-mission-update-enroute-v10116.mjs`; increased Command Nexus from `1.0.115` to `1.0.116` and Mission Finder from `V10.6.156` to `V10.6.157`.

## [1.0.115] - 2026-08-14

### Fixed

- Made live `Missing on mission` rows authoritative for Mission Update and existing-mission Unit Finder: `Still needed` is bounded by `Missing - En-route`, selected vehicles are subtracted once, and a visible zero-shortage table suppresses fresh mission-definition vehicle totals.
- Added the shared OSU-demand collapse for BASU, Welfare, HazMat and CBRN, using the maximum current requirement instead of summing categories.
- Added exact type-family selected-unit counting before each live requirement is acted on. Added `scripts/check-mission-update-live-targets-v10115.mjs`; increased Command Nexus from `1.0.114` to `1.0.115` and Mission Finder from `V10.6.155` to `V10.6.156`.

## [1.0.114] - 2026-08-14

### Fixed

- Captured the owning Vue transport lightbox before clicking Release Prisoners, waited for the exact released-prisoners success result after iframe navigation, reacquired the live parent `span.lightbox-close[title="Close"]` control and verified the owned modal disappeared before restarting Auto Mode.
- Added `scripts/check-auto-prisoner-release-close-v10114.mjs`; increased Command Nexus from `1.0.113` to `1.0.114` and Mission Finder from `V10.6.154` to `V10.6.155`.

## [1.0.113] - 2026-08-14

### Fixed

- Hardened Auto Mode prisoner Cell Selection parsing so it recognises the current structured transport block, skips red/full cell buttons and clicks the first usable green `btn-success` destination while retaining the legacy `btn-success` alert fallback.
- Added `scripts/check-auto-prison-cell-success-v10113.mjs`; increased Command Nexus from `1.0.112` to `1.0.113` and Mission Finder from `V10.6.153` to `V10.6.154`.

## [1.0.112] - 2026-08-14

### Fixed

- Corrected standalone Stations pop-outs so Unit Naming and Station Naming load native Dispatch Centre options even when the workspace mounts after the first station rows. Added `scripts/check-naming-dispatch-centre-popout-v10112.mjs`; increased Command Nexus from `1.0.111` to `1.0.112`, Unit Naming from `3.3.23` to `3.3.24` and Station Naming from `1.3.18` to `1.3.19`.

## [1.0.111] - 2026-08-14

### Fixed

- Added an exact live regression for building type 22 station naming using the expected town-only base, so a Home Response Location such as ABERDOUR becomes `ABERDOUR` and its FO/AO/OTL/DSU vehicles derive role/number callsigns from that base. Increased Command Nexus from `1.0.110` to `1.0.111`, Unit Naming from `3.3.22` to `3.3.23` and Station Naming from `1.3.17` to `1.3.18`.

## [1.0.110] - 2026-08-14

### Fixed

- Corrected flattened station addresses by preferring MissionChief's structured station data and edit-form address fields, using Move Building text only as a last bounded fallback and collapsing duplicated town prefixes such as `ANSTRUTHER EASTER ANSTRUTHER-FS1` before naming.
- Updated Home Response Location (building type 22) station names to use town only, so its FO/AO/OTL/DSU unit roles do not inherit an HRL station suffix.
- Added `scripts/check-station-move-address-v10110.mjs` and `scripts/check-station-unit-naming-chain-v10109.mjs`; increased Command Nexus from `1.0.109` to `1.0.110`, Unit Naming from `3.3.21` to `3.3.22` and Station Naming from `1.3.16` to `1.3.17`.

## [1.0.109] - 2026-08-14

### Fixed

- Routed Building Type 22 FO, AO, OTL and DSU vehicles through their role-owned Unit Naming classes so station address tokens are not duplicated into callsigns such as `KIRK-AO1`. The matching station class now carries the clean station base only, and Unit Naming owns the FO/AO/OTL/DSU suffix and sequence. Added `scripts/check-officer-station-naming-v10108.mjs` and increased Command Nexus from `1.0.108` to `1.0.109`, Unit Naming from `3.3.20` to `3.3.21` and Station Naming from `1.3.15` to `1.3.16`.

## [1.0.108] - 2026-08-14

### Added

- Added exact Unit Naming support for Building Type 22 Ambulance Officer, Operations Team Leader, Fire Officer and Duty Station Officer roles, including `AO`, `OTL`, `FO` and `DSU` classes and no trailing `1` for station-scoped role vehicles. Increased Command Nexus from `1.0.107` to `1.0.108`, Unit Naming from `3.3.19` to `3.3.20` and Station Naming from `1.3.14` to `1.3.15`.

## [1.0.107] - 2026-08-14

### Added

- Added exact Unit Naming support for the Fire Road Rail Unit as MissionChief vehicle type `107`, with Fire service classification and `RRU` callsign class. Increased Command Nexus from `1.0.106` to `1.0.107` and Unit Naming from `3.3.18` to `3.3.19`; Mission Finder remains `V10.6.153`.

## [1.0.106] - 2026-08-14

### Added

- Added Unit Naming classes for Flatbed Recovery Vehicle type `105` and HGV Recovery Vehicle type `106`, with `FRV` / `HGV` callsign codes and Recovery Station service classification. Increased Command Nexus from `1.0.105` to `1.0.106` and Unit Naming from `3.3.17` to `3.3.18`; Mission Finder remains `V10.6.153`.

## [1.0.105] - 2026-08-14

### Added

- Added exact Police Unit Naming classes for ARV type `4`, Joint Response Unit type `103`, Traffic Car type `24` and Firearms Personnel Carrier type `57`; retained existing IRV type `8` while accepting the MissionChief purchase label. Increased Command Nexus from `1.0.104` to `1.0.105` and Unit Naming from `3.3.16` to `3.3.17`; Mission Finder remains `V10.6.153`.

## [1.0.104] - 2026-08-14

### Fixed

- Changed Unit Finder to use live `Missing Vehicles` / `Missing Personnel` and `Missing on mission` rows before falling back to full mission-definition totals, keeping current shortages authoritative for existing missions.
- Increased Mission Finder to `V10.6.153` and added permanent live-shortage authority coverage.

## [1.0.103] - 2026-08-14

### Fixed

- Fixed the Ambulance Officer threshold for fresh missions whose Ambulance demand exists only in the patient badge: the patient count now reaches the shared threshold evaluator, late fresh recovery uses the same rule, and explicit patient Ambulance rows collapse with the badge using the larger total rather than being added twice.
- Retained Unit Finder, Auto Mode and Mission Update coverage from v1.0.102, exact type-34 selection and duplicate prevention; Upgrade remains excluded.
- Added focused regression coverage for fresh patient-badge demand and increased Mission Finder from `V10.6.151` to `V10.6.152`.

## [1.0.102] - 2026-08-13

### Fixed

- Extended the user-set Ambulance Officer threshold across Unit Finder, Auto Mode and Mission Update, counting positive ordinary Ambulance demand from the authoritative source for each path and ensuring exactly one type-34 Officer when demand is strictly greater than the configured threshold.
- Added duplicate protection for an existing Officer requirement, an already selected Officer, an Officer selected by an earlier mission-scoped pass and an Officer already satisfying the live mission. High-risk Missing Person Ambulance remains fresh-only and Upgrade remains excluded.
- Added issue-#299 regression coverage across all three selector paths and increased Mission Finder from `V10.6.150` to `V10.6.151`.

## [1.0.101] - 2026-08-13

### Added

- Added an independent **Automatically add 1 Ambulance Officer** setting with a user-controlled threshold from 0 to 99, defaulting to 5 while the option itself defaults off.
- When enabled, fresh Unit Finder and fresh Auto Mode count positive ordinary Ambulance demand from the mission definition plus current patient requirements and add exactly one Ambulance Officer (exact type `34`) only when that total is strictly greater than the threshold.
- The threshold rule runs after the existing High-risk Missing Person Ambulance rule, appears in preloaded Vehicle Load and remains excluded from Mission Update, Upgrade and other live-shortage paths.
- Added `scripts/check-ambulance-officer-threshold-v10101.mjs`; increased Mission Finder from `V10.6.149` to `V10.6.150`.

## [1.0.100] - 2026-08-13

### Fixed

- Added a strict `Require Drone` / `Requires Drone` / `Required Drone` alias path so the live requirement wording selects only exact MissionChief Police Drone Vehicle type `91`, including plural forms.
- Kept bare `Drone` / `Drones` unregistered so unrelated cross-service text does not create a Police dispatch demand, while existing Police Helicopter and Police Helicopter-or-Drone handling remains unchanged.
- Added `scripts/check-police-drone-requirement-v10100.mjs`; increased Mission Finder from `V10.6.148` to `V10.6.149`.

## [1.0.99] - 2026-08-13

### Fixed

- Added `Search Dog Unit` / `Search Dog Units` aliases, including counted and `Required` forms, to the existing strict Rescue Dog requirement path so MissionChief's `Required Search Dog Units` wording selects only exact Search Dog Unit type `101`.
- Kept Police Dog Support Unit / DSU separate and preserved strict no-generic-fallback behaviour for recognised Rescue/Search Dog demand.
- Added permanent alias regression coverage and increased Mission Finder from `V10.6.147` to `V10.6.148`.

## [1.0.98] - 2026-08-13

### Fixed

- Cross-referenced MissionChief `Rescue Dog` requirement wording to the strict Search Dog Unit path so Unit Finder and selected-unit verification use exact MissionChief vehicle type `101` instead of generic fallback.
- Added `scripts/check-rescue-dog-search-dog-v1098.mjs`; increased Mission Finder from `V10.6.146` to `V10.6.147`.

## [1.0.97] - 2026-08-13

### Fixed

- Repaired the v1.0.96 towing matcher ReferenceError by restoring the proven car-towing parser without relying on an out-of-scope normaliser.
- Split explicit truck/HGV/lorry towing into exact HGV Recovery type `106` while car/cars-to-tow remains exact Flatbed Recovery type `105`; both specialist paths block generic fallback.
- Added `scripts/check-hgv-recovery-v1097.mjs`; increased Mission Finder from `V10.6.145` to `V10.6.146`.

## [1.0.96] - 2026-08-13

### Added

- Cross-referenced towing mission wording (`car(s)/truck(s)/lorry/lorries/van(s)/vehicle(s) to tow` plus `tow truck(s)` and `Recovery truck(s)`) to the existing exact Recovery selection path and blocked generic fallback for recognised towing demand.
- Added `scripts/check-towing-recovery-crossref-v1096.mjs`; increased Mission Finder from `V10.6.144` to `V10.6.145`.

## [1.0.95] - 2026-08-12

### Changed

- Selecting a Dispatch Centre in Unit Naming now automatically runs the same normal station refresh used by the manual **Refresh Stations** control before rebuilding the selected Dispatch Centre → Service → Station Type → Start From cascade.
- Selecting a Dispatch Centre in Station Naming now automatically runs the same normal station refresh before rebuilding the corresponding naming cascade.
- Retained manual **Refresh Stations** as a fallback and prevented programmatic centre restoration from causing recursive refresh loops.
- Added `scripts/check-naming-dispatch-centre-auto-station-refresh-v1095.mjs`; increased Command Nexus from `1.0.94` to `1.0.95`, Unit Naming from `3.3.19` to `3.3.20` and Station Naming from `1.3.13` to `1.3.14`; Mission Finder and Personnel Assignment remain unchanged.

## [1.0.94] - 2026-08-12

### Fixed

- Corrected Dispatch Centre station-membership loading to scan the same current/top/accessibile same-origin Resource Administration document graph already used for centre discovery, preventing real assigned stations from collapsing into `Unassigned / default` inside the normal Stations lightbox.
- Retained exact native row `leitstelle_building_id` authority and the existing Dispatch Centre → Service → Station Type → Start From hierarchy.
- Added `scripts/check-naming-dispatch-centre-membership-frame-v1094.mjs`; increased Command Nexus from `1.0.93` to `1.0.94`, Unit Naming from `3.3.18` to `3.3.19` and Station Naming from `1.3.12` to `1.3.13`; Mission Finder and Personnel Assignment remain unchanged.

## [1.0.93] - 2026-08-12

### Fixed

- Replaced the failed profile-renderer Dispatch Centre acquisition path with native Resource Administration row authority. Dispatch Centre ID/name pairs now come from already-loaded native rows marked `building_type_id="7"`; malformed row/link IDs fail closed.
- Station-to-centre membership remains exact native `leitstelle_building_id`, and centre discovery plus membership now use the shared current/top/accessible same-origin document graph with no centre-list network fetch.
- Removed profile scraping, hidden profile renderer and raw-profile fetch dependencies from the centre-list architecture.
- Added `scripts/check-naming-dispatch-centre-native-station-rows-v1093.mjs`; increased Command Nexus from `1.0.92` to `1.0.93`, Unit Naming from `3.3.17` to `3.3.18` and Station Naming from `1.3.11` to `1.3.12`; Mission Finder and Personnel Assignment remain unchanged.

## [1.0.92] - 2026-08-12

### Fixed

- Changed Dispatch Centre profile acquisition from raw `fetch()` HTML to a hidden same-origin rendered profile frame and bounded wait, then extracted only exact `/buildings/{id}` links from rendered `.profile-dispatchcenter` panels.
- Added `scripts/check-naming-dispatch-centre-profile-render-v1092.mjs`; increased Command Nexus from `1.0.91` to `1.0.92`, Unit Naming from `3.3.16` to `3.3.17` and Station Naming from `1.3.10` to `1.3.11`; Mission Finder and Personnel Assignment remain unchanged.

## [1.0.91] - 2026-08-12

### Changed

- Rebuilt the naming hierarchy as Dispatch Centre → Service → Station Type → Start From, using profile-backed Dispatch Centre choices, row-level station membership and exact MissionChief building type IDs for service grouping.
- Added `scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs`; increased Command Nexus from `1.0.90` to `1.0.91`, Unit Naming from `3.3.15` to `3.3.16` and Station Naming from `1.3.9` to `1.3.10`; Mission Finder and Personnel Assignment remain unchanged.

## [1.0.90] - 2026-08-12

### Fixed

- Corrected Dispatch Centre seed discovery so literal `leitstelle_building_id="null"` is treated as genuinely unassigned and ordinary station edit pages can seed the native Assigned Dispatch Center selector even before that station is assigned.
- Added a bounded `/leitstellenansicht` fallback that discovers up to three station building IDs only when the current Resource Administration DOM exposes no usable station seed.
- Added `scripts/check-naming-dispatch-centre-unassigned-seed-v1090.mjs`; increased Command Nexus from `1.0.89` to `1.0.90`, Unit Naming from `3.3.14` to `3.3.15` and Station Naming from `1.3.8` to `1.3.9`; Mission Finder and Personnel Assignment remain unchanged.

## [1.0.89] - 2026-08-12

### Fixed

- Made `Retry Dispatch Centres` a delegated live control so MissionChief DOM replacement cannot strand a visible but inert retry button.
- Improved Dispatch Centre discovery by preferring assigned ordinary station seeds, trying at most three bounded edit pages and retaining concrete failure reasons in naming state/tooltips/logs.
- Added `scripts/check-naming-dispatch-centre-retry-v1089.mjs`; increased Command Nexus from `1.0.88` to `1.0.89`, Unit Naming from `3.3.13` to `3.3.14` and Station Naming from `1.3.7` to `1.3.8`; Mission Finder and Personnel Assignment remain unchanged.

## [1.0.88] - 2026-08-12

### Changed

- Replaced Dispatch Centre station-membership fetching with MissionChief's native `leitstelle_building_id` row authority, joined to exact IDs from the assigned-dispatch-centre selector on an ordinary building edit page.
- Added `scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs`; increased Command Nexus from `1.0.87` to `1.0.88`, Unit Naming from `3.3.12` to `3.3.13` and Station Naming from `1.3.6` to `1.3.7`; Mission Finder and Personnel Assignment remain unchanged.

## [1.0.87] - 2026-08-12

### Fixed

- Made Dispatch Centre loading/retry resilient to native `/leitstellenansicht` markup that omits `building_type_id="7"`, keeps the selector disabled until both centre discovery and station membership are ready, and exposes explicit Refreshing / Retry / unavailable states instead of silently failing.
- Added `scripts/check-naming-dispatch-centre-refresh-v1087.mjs`; increased Command Nexus from `1.0.86` to `1.0.87`, Unit Naming from `3.3.11` to `3.3.12` and Station Naming from `1.3.5` to `1.3.6`; Mission Finder and Personnel Assignment remain unchanged.

## [1.0.86] - 2026-08-12

### Fixed

- Corrected Dispatch Centre naming hierarchy to be Dispatch Centre first, then Station Type and Start From. Centre names load independently from native `/leitstellenansicht`, while station membership remains sourced from native building-assignment data.
- Added `scripts/check-naming-dispatch-centre-first-v1086.mjs`; increased Command Nexus from `1.0.85` to `1.0.86`, Unit Naming from `3.3.10` to `3.3.11` and Station Naming from `1.3.4` to `1.3.5`; Mission Finder and Personnel Assignment remain unchanged.

## [1.0.85] - 2026-08-12

### Added

- Added Dispatch Centre filters to Unit Naming and Station Naming, using MissionChief's authoritative station assignments. Added `scripts/check-naming-dispatch-centre-filter-v1085.mjs`; increased Command Nexus from `1.0.84` to `1.0.85`, Unit Naming from `3.3.9` to `3.3.10` and Station Naming from `1.3.3` to `1.3.4`; Mission Finder and Personnel Assignment remain unchanged.

## [1.0.84] - 2026-08-11

### Changed

- Completed Personnel Assignment iOS Safari support so all primary actions and tools/report controls remain available on iPhone/iPad while preserving the existing native file picker and safe-area/touch behavior.
- Retained the 1.0.83 faster Auto Mode patient/prisoner transport timing and existing fail-closed safeguards.
- Added `scripts/check-personnel-assignment-ios-completeness-v1084.mjs`; increased Command Nexus from `1.0.83` to `1.0.84`, Mission Finder from `V10.6.143` to `V10.6.144` and Personnel Assignment from `1.3.8` to `1.3.9`.

## [1.0.83] - 2026-08-11

### Changed

- Reduced bounded Auto Mode patient/prisoner transport response waits without changing exact destination, ownership, duplicate-click, pending-state or fail-closed timeout safeguards. Added `scripts/check-auto-transport-response-v1083.mjs`; increased Command Nexus from `1.0.82` to `1.0.83` and Mission Finder from `V10.6.142` to `V10.6.143`.

## [1.0.82] - 2026-08-11

### Changed

- Reduced bounded Ally Steal waits while retaining exact selected-vehicle identity, new-success-alert matching, refreshed-page confirmation, pending-state hand-off and close fallback.
- Added runtime-memory hardening for long sessions by replacing independent fast frame walks with the shared cached document graph, restricting Auto Mode background pollers to required states, coalescing trained-personnel refresh work and permitting only guarded idle recycling at extreme memory pressure.
- Added `scripts/check-runtime-memory-deep-dive-v1082.mjs` and `scripts/check-ally-steal-response-v1082.mjs`; increased Command Nexus from `1.0.81` to `1.0.82` and Mission Finder from `V10.6.141` to `V10.6.142`.

## [1.0.81] - 2026-08-10

### Added

- Added live Current Missing Personnel values to the Trained Personnel panel after a vehicle arrives on scene, driven by the existing Mission Finder mutation refresh and the same `readMissionUpdateRows` authority as Mission Update. Increased Command Nexus from `1.0.80` to `1.0.81` and Mission Finder from `V10.6.140` to `V10.6.141`.

## [1.0.80] - 2026-08-10

### Fixed

- Prevented cached mission-definition Required Personnel totals from remaining authoritative after any real vehicle reaches the scene. Current live Missing Personnel/course rows are now authoritative after arrival, while vehicles that are only en route do not suppress the initial personnel requirements.
- Added `scripts/check-trained-personnel-on-scene-authority-v1080.mjs`; increased Command Nexus from `1.0.79` to `1.0.80` and Mission Finder from `V10.6.139` to `V10.6.140`.

## [1.0.79] - 2026-08-09

### Fixed

- Reworked Dispatch Centres Show all middle-click handling to intercept captured middle-button `mousedown`, synchronously create the named popup, suppress later native `mouseup` / `auxclick` new-tab behavior, and keep left click on the existing MissionChief lightbox path.
- Added `scripts/check-dispatch-centres-popup-window-v1079.mjs`; increased Command Nexus from `1.0.78` to `1.0.79`.

## [1.0.78] - 2026-08-09

### Added

- Added middle-click support for the exact Dispatch Centres **Show all** link so it opens a centered, reusable, resizable and scrollable popup while normal left click keeps MissionChief's existing lightbox behavior.
- Added `scripts/check-dispatch-centres-show-all-popup-v1078.mjs`; increased Command Nexus from `1.0.77` to `1.0.78`.

## [1.0.77] - 2026-08-09

### Fixed

- Restored Resource Administration in MissionChief's normal Stations overview popup after memory hardening accidentally excluded the same-origin `/leitstellenansicht` child frame. The dedicated full-page Stations route remains supported while mission/building frames stay excluded.
- Added `scripts/check-station-overview-popup-v1077.mjs`; increased Command Nexus from `1.0.76` to `1.0.77`, Unit Naming from `3.3.8` to `3.3.9`, Station Naming from `1.3.2` to `1.3.3` and Personnel Assignment from `1.3.7` to `1.3.8`.

## [1.0.76] - 2026-08-09

### Added

- Added an independent `Always include 1 Ambulance in Unit Finder` setting for High Risk Missing Person and Very High Risk Missing Person missions. The option defaults off, persists in its own key and only affects fresh manual/Auto Mode Unit Finder requirement loads.
- It adds an ordinary Ambulance only when neither mission-definition nor patient demand already requires one, appears in the fresh Vehicle Load preload, and never re-runs from Mission Update/current live shortage authority.
- Added `scripts/check-high-risk-missing-person-ambulance-v1076.mjs`; increased Command Nexus from `1.0.75` to `1.0.76` and Mission Finder from `V10.6.138` to `V10.6.139`.

## [1.0.75] - 2026-08-08

### Added

- Added fresh-mission Vehicle Load preload rows using the existing authoritative mission-definition requirement cache. The drawer now shows ordinary vehicle demand before Unit Finder runs, updates from selected checkboxes and suppresses static rows once live current-shortage authority exists.
- Added `scripts/check-vehicle-load-preloaded-requirements-v1075.mjs`; increased Command Nexus from `1.0.74` to `1.0.75` and Mission Finder from `V10.6.137` to `V10.6.138`.

## [1.0.74] - 2026-08-08

### Changed

- Hardened long-session runtime memory without changing the compact MissionChief Nexus UI: only the active authoritative mission frame keeps the heavy Mission Finder observer, inactive frames release reconstructible runtime state, live caches are bounded and an idle recycle can occur only behind strict operational safety gates.
- Added bounded runtime maintenance for live verification and diagnostics while preserving the Personnel Register, mission-bound Required Personnel preload, settings and selected vehicles.
- Added `scripts/check-runtime-memory-maintenance-v1074.mjs`; increased Command Nexus from `1.0.73` to `1.0.74` and Mission Finder from `V10.6.136` to `V10.6.137`.

## [1.0.73] - 2026-08-08

### Changed

- Top-aligned the attached Vehicle Load drawer with the Mission Control shell and added a short 190ms cubic-bezier slide/fade/shadow transition while keeping the shell itself fixed in place.
- Added reduced-motion handling for the drawer and retained the compact primary action order.
- Added `scripts/check-vehicle-drawer-animation-v1073.mjs`; increased Command Nexus from `1.0.72` to `1.0.73` and Mission Finder from `V10.6.135` to `V10.6.136`.

## [1.0.72] - 2026-08-08

### Changed

- Moved Vehicle Load into an attached right-side Mission Control drawer with a slim collapsed tab, bounded internal scrolling and no movement/resizing of the main Mission shell. Added `scripts/check-vehicle-load-drawer-v1072.mjs`; increased Command Nexus from `1.0.71` to `1.0.72` and Mission Finder from `V10.6.134` to `V10.6.135`.

## [1.0.71] - 2026-08-08

### Changed

- Replaced the wide 1.0.70 card layout with a compact progressive-disclosure Nexus UI: Mission Control is narrow again, Vehicle Load and Trained Personnel default closed, and Naming/Personnel secondary status, logs, reports and advanced tools move behind small disclosures.
- Added `scripts/check-compact-nexus-ui-v1071.mjs`; increased Command Nexus from `1.0.70` to `1.0.71` and Mission Finder from `V10.6.133` to `V10.6.134`.

## [1.0.70] - 2026-08-07

### Changed

- Applied one low-glare Command Nexus visual system across Mission Control, Unit Naming, Station Naming and Personnel Assignment while preserving existing ownership, field/action IDs and execution paths. Increased Command Nexus from `1.0.69` to `1.0.70` and Mission Finder from `V10.6.132` to `V10.6.133`.

## [1.0.69] - 2026-08-07

### Added

- Replaced the separate Mission Control, Vehicle Load and Trained Personnel floating surfaces with one integrated desktop MissionChief Nexus dashboard while keeping each existing engine authoritative for its own data and actions.
- Added Mission, Settings and Diagnostics views; Settings owns Control Window Position, Mission Ready Delay and V10 Queue Restart, Diagnostics owns Export Diagnostics and the real persistent Event Scanner switch, and Mission owns the existing Unit Finder / Ally Steal / Mission Update / Dispatch / Dispatch & Share / Auto Mode actions.
- Preserved the existing iPhone/iOS compact lifecycle rather than forcing the desktop dashboard onto mobile. Added `scripts/check-mission-dashboard-v1069.mjs`; increased Command Nexus from `1.0.68` to `1.0.69` and Mission Finder from `V10.6.131` to `V10.6.132`.

## [1.0.68] - 2026-08-07

### Fixed

- Expanded mission-definition parsing to detect `Required Personnel` rows outside the main Vehicle and Personnel Requirements table, including MissionChief's separate **Other information** table, and retain recognised trained-personnel course totals in the mission-bound preload cache for the Trained Personnel panel, Unit Finder and Auto Mode.
- Added a cross-table parser regression to `scripts/check-mission-definition-personnel-preload.mjs`; increased Command Nexus from `1.0.67` to `1.0.68` and Mission Finder from `V10.6.130` to `V10.6.131`.

## [1.0.67] - 2026-08-07

### Fixed

- Restored mission-definition preload to the mission-panel mount lifecycle so the existing cross-table Required Personnel parser actually runs on fresh mission load, before Unit Finder or Auto Mode selection.
- Added permanent lifecycle coverage and increased Command Nexus from `1.0.66` to `1.0.67` and Mission Finder from `V10.6.129` to `V10.6.130`.

## [1.0.66] - 2026-08-07

### Fixed

- Removed a startup-blocking `ReferenceError` from Trained Personnel rendering by keeping the renderer pure and deferring all requirement preloading to the existing mission-panel lifecycle. Increased Command Nexus from `1.0.65` to `1.0.66` and Mission Finder from `V10.6.128` to `V10.6.129`.

## [1.0.65] - 2026-08-06

### Added

- Preloaded `Required Personnel` and recognised trained-personnel course totals from the exact active mission definition before Unit Finder runs, so the Trained Personnel panel can show Required / Selected / Still needed immediately on a new mission and Auto Mode uses the same cached requirement set.
- Added mission-definition personnel preload regressions and increased Command Nexus from `1.0.64` to `1.0.65` and Mission Finder from `V10.6.127` to `V10.6.128`.

## [1.0.64] - 2026-08-06

### Changed

- Replaced capacity-based trained-personnel selection with exact Personnel Register coverage and a multi-requirement optimiser. Multi-trained staff now count toward every qualification they actually hold, unknown labels remain fail-closed, and already selected vehicles are excluded from further trained-personnel selection.
- Added strict station-level Register refresh behavior so all assigned personnel rows are loaded before training evidence is trusted, including paginated personnel tables.
- Added `scripts/check-trained-coverage-optimizer.mjs`, `scripts/check-auto-dispatch-eod-required-personnel.mjs` and `scripts/check-bulk-trained-register-update.mjs`; increased Command Nexus from `1.0.63` to `1.0.64` and Mission Finder from `V10.6.126` to `V10.6.127`.

## [1.0.63] - 2026-08-06

### Fixed

- Corrected HazMat vehicle selection to preserve the mission's requested quantity and require exact MissionChief type `39` Operational Support Units, while missing HazMat-trained personnel continue to be translated into OSU vehicle count using six trained personnel per OSU.
- Added permanent regressions for issue #215 across Unit Finder and Mission Update, plus exact vehicle/personnel separation. Increased Command Nexus from `1.0.62` to `1.0.63` and Mission Finder from `V10.6.125` to `V10.6.126`.

## [1.0.62] - 2026-08-06

### Added

- Added a minimisable **Trained Personnel** panel that shows mission Required Personnel, selected trained coverage and remaining demand using the existing Personnel Register, without changing dispatch logic or adding background work. Added `scripts/check-trained-personnel-panel.mjs`; increased Command Nexus from `1.0.61` to `1.0.62` and Mission Finder from `V10.6.124` to `V10.6.125`.

## [1.0.61] - 2026-08-06

### Fixed

- Made Mission Update single-pass: when current live requirements are already used, it no longer falls through into a second fresh Unit Finder selection pass. Fresh missions still perform the late-shortage check after initial selection. Added `scripts/check-mission-update-single-pass.mjs` and increased Command Nexus from `1.0.60` to `1.0.61` and Mission Finder from `V10.6.123` to `V10.6.124`.

## [1.0.60] - 2026-08-06

### Fixed

- Made `Missing on mission` authoritative when present: `Still needed` is bounded by `Missing - En-route`, selected units are subtracted exactly once, and `Still needed: 0` prevents extra selection. Added `scripts/check-missing-on-mission-authority.mjs` and increased Command Nexus from `1.0.59` to `1.0.60` and Mission Finder from `V10.6.122` to `V10.6.123`.

## [1.0.59] - 2026-08-06

### Fixed

- Added guarded Auto Mode memory recycling only before Unit Finder on an empty-selection mission: Mission Finder cleanup and reload is bounded, clears reconstructible caches and cannot dispatch or resume a different mission. Added `scripts/check-auto-memory-recycle.mjs`; increased Command Nexus from `1.0.58` to `1.0.59` and Mission Finder from `V10.6.121` to `V10.6.122`.

## [1.0.58] - 2026-08-05

### Fixed

- Added explicit Mission Finder lifecycle suspension/resume so hidden or replaced mission frames disconnect the heavy observer, session ticker and caches while preserving selected vehicles and current mission state. Added `scripts/check-auto-memory-lifecycle.mjs`; increased Command Nexus from `1.0.57` to `1.0.58` and Mission Finder from `V10.6.120` to `V10.6.121`.

## [1.0.57] - 2026-08-05

### Fixed

- Prevented Auto Mode from adding duplicate EOD vehicles when the mission already includes both a vehicle requirement and EOD-trained personnel demand, while retaining normal Required Personnel handling. Increased Command Nexus from `1.0.56` to `1.0.57` and Mission Finder from `V10.6.119` to `V10.6.120`.

## [1.0.56] - 2026-08-05

### Changed

- Reworked the complete police specialist/trained requirement path for Unit Finder and Mission Update, including exact handling for Level 1/2 Public Order, Police Medic, Sergeant, Inspector, Railway Police, Search Advisor and Armed Response personnel. Increased Command Nexus from `1.0.55` to `1.0.56` and Mission Finder from `V10.6.118` to `V10.6.119`.

## [1.0.55] - 2026-08-05

### Fixed

- Preserved mission-definition trained-personnel requirements through initial fresh Unit Finder selection even after late live row checks, preventing fresh `Required Personnel` demand from being dropped when no current live shortage exists. Increased Command Nexus from `1.0.54` to `1.0.55` and Mission Finder from `V10.6.117` to `V10.6.118`.

## [1.0.54] - 2026-08-05

### Added

- Added mission-definition trained-personnel preloading for recognised course rows and retained the result for both Unit Finder and Auto Mode. Increased Command Nexus from `1.0.53` to `1.0.54` and Mission Finder from `V10.6.116` to `V10.6.117`.

## [1.0.53] - 2026-08-05

### Fixed

- Reworked patient transport modal ownership so Auto Mode follows the MissionChief patient transport UI into same-origin nested frames, confirms success in the correct transport surface and closes only the owning lightbox. Increased Command Nexus from `1.0.52` to `1.0.53` and Mission Finder from `V10.6.115` to `V10.6.116`.

## [1.0.52] - 2026-08-04

### Fixed

- Corrected Auto Mode patient transport selection by requiring a live native transport anchor and matching current mission ownership before choosing a hospital. Increased Command Nexus from `1.0.51` to `1.0.52` and Mission Finder from `V10.6.114` to `V10.6.115`.

## [1.0.51] - 2026-08-04

### Changed

- Reworked Personnel Register refresh so unchanged exact vehicle records are reused during normal updates, unsafe or changed assignments are live-verified before trust, and full audit remains available separately. Increased Command Nexus from `1.0.50` to `1.0.51`.

## [1.0.50] - 2026-08-04

### Added

- Added persistent Auto Mode stop-reason history to the mission panel and diagnostics so unexpected self-stops can be identified after the control has already returned to idle. Increased Command Nexus from `1.0.49` to `1.0.50`.

## [1.0.49] - 2026-08-03

### Changed

- Added an expandable Unit Finder diagnostic export with mission ID, authority source, normalized requirements, selected vehicle evidence and rejection reasons, without changing selection behavior. Increased Command Nexus from `1.0.48` to `1.0.49`.

## [1.0.48] - 2026-08-03

### Fixed

- Ensured mission requirements are always loaded before initial Unit Finder selection, including direct manual Unit Finder on a freshly opened mission. Increased Command Nexus from `1.0.47` to `1.0.48`.

## [1.0.47] - 2026-08-03

### Changed

- Added the Event Scanner setting as a persistent toggle and moved it under Diagnostics. Increased Command Nexus from `1.0.46` to `1.0.47`.

## [1.0.46] - 2026-08-03

### Changed

- Refined compact mission control button ordering and persistent settings rendering. Increased Command Nexus from `1.0.45` to `1.0.46`.

## [1.0.45] - 2026-08-03

### Added

- Added a compact integrated Mission Control shell for desktop mission pages. Increased Command Nexus from `1.0.44` to `1.0.45`.

## [1.0.44] - 2026-08-03

### Changed

- Added current Missing Personnel diagnostics into Mission Finder. Increased Command Nexus from `1.0.43` to `1.0.44`.

## [1.0.43] - 2026-08-03

### Fixed

- Corrected trained-personnel evidence counting to use exact assigned personnel rather than capacity assumptions. Increased Command Nexus from `1.0.42` to `1.0.43`.

## [1.0.42] - 2026-08-03

### Fixed

- Hardened duplicate trained-personnel selection protection. Increased Command Nexus from `1.0.41` to `1.0.42`.

## [1.0.41] - 2026-08-03

### Changed

- Added additional Required Personnel mapping coverage. Increased Command Nexus from `1.0.40` to `1.0.41`.

## [1.0.40] - 2026-08-03

### Changed

- Improved mission requirement normalization and diagnostics. Increased Command Nexus from `1.0.39` to `1.0.40`.

## [1.0.39] - 2026-08-03

### Fixed

- Corrected mission requirement update ordering. Increased Command Nexus from `1.0.38` to `1.0.39`.

## [1.0.38] - 2026-08-03

### Changed

- Added additional mission requirement aliases. Increased Command Nexus from `1.0.37` to `1.0.38`.

## [1.0.37] - 2026-08-03

### Fixed

- Corrected requirement parsing for variable MissionChief whitespace. Increased Command Nexus from `1.0.36` to `1.0.37`.

## [1.0.36] - 2026-08-03

### Changed

- Expanded supported mission aliases. Increased Command Nexus from `1.0.35` to `1.0.36`.

## [1.0.35] - 2026-08-03

### Fixed

- Fixed a Mission Finder selector edge case. Increased Command Nexus from `1.0.34` to `1.0.35`.

## [1.0.34] - 2026-08-03

### Changed

- Improved Mission Finder selection diagnostics. Increased Command Nexus from `1.0.33` to `1.0.34`.

## [1.0.33] - 2026-08-03

### Fixed

- Corrected dynamic mission-panel refresh behavior. Increased Command Nexus from `1.0.32` to `1.0.33`.

## [1.0.32] - 2026-08-03

### Changed

- Added additional strict vehicle type mappings. Increased Command Nexus from `1.0.31` to `1.0.32`.

## [1.0.31] - 2026-08-03

### Fixed

- Fixed selected-unit identity matching. Increased Command Nexus from `1.0.30` to `1.0.31`.

## [1.0.30] - 2026-08-03

### Changed

- Improved combined userscript initialization. Increased Command Nexus from `1.0.29` to `1.0.30`.

## [1.0.29] - 2026-08-03

### Fixed

- Corrected combined userscript metadata and startup guard. Increased Command Nexus from `1.0.28` to `1.0.29`.

## [1.0.28] - 2026-08-03

### Changed

- Improved release packaging checks. Increased Command Nexus from `1.0.27` to `1.0.28`.

## [1.0.27] - 2026-08-03

### Fixed

- Corrected release notification recovery. Increased Command Nexus from `1.0.26` to `1.0.27`.

## [1.0.26] - 2026-08-03

### Changed

- Hardened release workflow permissions. Increased Command Nexus from `1.0.25` to `1.0.26`.

## [1.0.25] - 2026-08-03

### Added

- Added automated Greasy Fork release synchronization. Increased Command Nexus from `1.0.24` to `1.0.25`.

## [1.0.24] - 2026-08-03

### Fixed

- Fixed Police Officer Rescue Support selection and increased Command Nexus from `1.0.23` to `1.0.24`.

## [1.0.23] - 2026-08-03

### Changed

- Improved exact trained-personnel selection. Increased Command Nexus from `1.0.22` to `1.0.23`.

## [1.0.22] - 2026-08-03

### Fixed

- Corrected Mission Finder requirement authority edge cases. Increased Command Nexus from `1.0.21` to `1.0.22`.

## [1.0.21] - 2026-08-02

### Fixed

- Corrected Fire Engine cross-reference selection. Increased Command Nexus from `1.0.20` to `1.0.21`.

## [1.0.20] - 2026-08-02

### Added

- Added Road Rail Unit mapping and increased Command Nexus from `1.0.19` to `1.0.20`.

## [1.0.19] - 2026-08-02

### Fixed

- Corrected iOS Stations ownership and increased Command Nexus from `1.0.18` to `1.0.19`.

## [1.0.18] - 2026-08-02

### Changed

- Completed scoped iOS Safari compatibility work and increased Command Nexus from `1.0.17` to `1.0.18`.

## [1.0.17] - 2026-08-02

### Changed

- Improved iOS Safari touch handling and increased Command Nexus from `1.0.16` to `1.0.17`.

## [1.0.16] - 2026-08-02

### Changed

- Added iPad Safari responsive support and increased Command Nexus from `1.0.15` to `1.0.16`.

## [1.0.15] - 2026-08-02

### Added

- Added iOS Safari mission controls and increased Command Nexus from `1.0.14` to `1.0.15`.

## [1.0.14] - 2026-08-02

### Fixed

- Corrected live Patient/HEMS requirement handling and increased Command Nexus from `1.0.13` to `1.0.14`.

## [1.0.13] - 2026-08-02

### Fixed

- Fixed live shortage authority and increased Command Nexus from `1.0.12` to `1.0.13`.

## [1.0.12] - 2026-08-02

### Changed

- Added Station Naming refinements and increased Command Nexus from `1.0.11` to `1.0.12`.

## [1.0.11] - 2026-08-02

### Fixed

- Corrected Resource Administration station assignment behavior and increased Command Nexus from `1.0.10` to `1.0.11`.

## [1.0.10] - 2026-08-02

### Changed

- Added naming workflow refinements and increased Command Nexus from `1.0.9` to `1.0.10`.

## [1.0.9] - 2026-08-02

### Added

- Added Resource Administration station and unit naming enhancements and increased Command Nexus from `1.0.8` to `1.0.9`.

## [1.0.8] - 2026-08-02

### Changed

- Improved station and unit naming validation and increased Command Nexus from `1.0.7` to `1.0.8`.

## [1.0.7] - 2026-08-02

### Fixed

- Corrected Unit Finder live-range handling and increased Command Nexus from `1.0.6` to `1.0.7`.

## [1.0.6] - 2026-08-02

### Changed

- Added minor mission and naming fixes and increased Command Nexus from `1.0.5` to `1.0.6`.

## [1.0.5] - 2026-08-02

### Fixed

- Corrected Police register ATV handling and increased Command Nexus from `1.0.4` to `1.0.5`.

## [1.0.4] - 2026-08-02

### Fixed

- Corrected Auto Mode load-more handling and increased Command Nexus from `1.0.3` to `1.0.4`.

## [1.0.3] - 2026-08-02

### Fixed

- Hardened trained IRV dispatch safety and increased Command Nexus from `1.0.2` to `1.0.3`.

## [1.0.2] - 2026-08-02

### Added

- First formal public Command Nexus release line after repository consolidation.
