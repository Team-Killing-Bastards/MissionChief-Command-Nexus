# Changelog

All notable changes to MissionChief Command Nexus are documented here.

The project uses Semantic Versioning for the unified userscript release line.

## [Unreleased]

### Added

- Current-state developer handoff for resuming source work.
- Evidence-driven roadmap, architecture, migration and testing documentation.
- Expanded repository integrity checks for required development and release files.

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

- Mission Update no longer reuses static mission-help requirements after the live mission requirements panel becomes authoritative.
- Firefighter personnel requirements now convert to Rescue Pumps using nine firefighters per vehicle.
- Car Recovery requirements now select Flatbed Recovery Vehicles.
- `Fire Engines, RIVs or Major Foam Tenders` now selects Major Foam Tenders instead of Rescue Pumps.
- `RIV or Major Foam Tender` now prefers RIVs and falls back to Major Foam Tenders only when no RIV is available.

### Changed

- Mission Finder increased from `V10.6.84` to `V10.6.85`.

## [1.0.19] - 2026-07-22

### Fixed

- Mission Update live requirements now use numeric or bounded `Still Needed` shortages directly and fall back to `Required` only when the `Still Needed` cell is literally `?` or absent.
- `Fire Engine or RIV` shortages no longer expand back to the full required total during Update or retry.
- Added a strict `Rescue Support Vehicles` selector that accepts only type-83 Rescue Support Vehicles and rejects Major Foam Tenders and RIVs during selection, selected counting, fallback and retry verification.

### Preserved

- Existing `Fire Engines or RIVs`, `RIV or Major Foam Tender`, and airfield alternative-unit rules remain on their dedicated selectors.
- Existing selected-unit subtraction and fail-closed loading safeguards remain enabled.

### Changed

- Mission Finder increased from `V10.6.83` to `V10.6.84`.

## [1.0.18] - 2026-07-22

### Fixed

- Mission Update now treats `Still Needed` as authoritative whenever the value is numeric or a bounded range, using `Required` only when the live shortage is literally `?` or the cell is missing.
- A row such as `Required 8 / Selected 7 / Still Needed 1` now selects exactly one additional unit instead of rebuilding the full requirement.
- `Rescue Support Vehicle` and `Rescue Support Vehicles` now use a strict Rescue Support Vehicle-only selector and no longer fall through to Major Foam Tender or RIV alternatives.
- Existing selected-unit subtraction is preserved after the corrected shortage target is chosen.

### Preserved

- Unit Finder Armed Personnel still uses exact type-25 Armed Traffic Cars with Roads Policing plus Firearms verification.
- Legitimate `RIV or Major Foam Tender` requirements still prefer type-76 RIVs and fall back to type-75 Major Foam Tenders.

### Changed

- Mission Finder increased from `V10.6.82` to `V10.6.83`.

## [1.0.17] - 2026-07-22

### Fixed

- Mission Update now uses numeric or bounded `Still Needed` shortages directly and falls back to `Required` only when the live shortage is literally `?` or the cell is unavailable.
- `Fire Engine or RIV` rows therefore select only the visible shortage, while `?` rows continue using the required total.
- Rescue Support Unit/Vehicle requirements are now strict and cannot enter the RIV-or-Major-Foam fallback path.

### Preserved

- Armed Personnel continues to use exact type-25 Armed Traffic Cars with Roads Policing plus Firearms verification.
- Existing selected-unit subtraction remains active after the shortage target is chosen.

### Changed

- Mission Finder increased from `V10.6.81` to `V10.6.82`.

## [1.0.16] - 2026-07-22

### Fixed

- Mission Update now treats numeric `Still Needed` values as shortages, uses the upper bound of bounded ranges such as `0-3`, and falls back to `Required` only when `Still Needed` is a literal `?`.
- Existing matching selections continue to be subtracted before new clicks, preventing duplicate dispatch.
- Rescue Support Unit/Vehicle requirements now use a strict Rescue Support selector that excludes Major Foam Tenders and RIVs.
- The Rescue Support strict route applies to initial selection, selected counting and retry fallback, so final missing-unit reporting retains the original Rescue Support requirement.

### Preserved

- Armed Personnel remains linked to exact type-25 Armed Traffic Cars carrying Roads Policing plus Firearms-qualified personnel.
- The legitimate RIV-first/Major-Foam fallback rule remains isolated to explicit `RIV or Major Foam Tender` requirements.

### Changed

- Mission Finder increased from `V10.6.80` to `V10.6.81`.

## [1.0.15] - 2026-07-22

### Fixed

- Mission Update now uses numeric or bounded `Still Needed` shortages directly and falls back to `Required` only when the live shortage is a literal `?`.
- Existing selections remain deducted before additional clicks, so Update does not resend already selected units.
- Rescue Support Vehicle requirements now use an exact strict selector and no longer enter the RIV-or-Major-Foam alternative path.
- `Missing Personnel: N Police Officers` now converts at two officers per ordinary Police Car using ceiling division.

### Preserved

- The v1.0.12 Armed Personnel → exact type-25 Armed Traffic Car route remains enabled.
- Legitimate `RIV or Major Foam Tender` requirements retain RIV-first/Major-Foam fallback behaviour.

### Changed

- Mission Finder increased from `V10.6.80` to `V10.6.81`.

## [1.0.14] - 2026-07-21

### Fixed

- Mission Update now uses numeric or bounded `Still Needed` shortages directly and falls back to `Required` only when the live shortage is a literal `?` or the cell is unavailable.
- Existing selected units remain deducted before additional clicks, preventing duplicate dispatch.
- `Rescue Support Unit` and `Rescue Support Vehicle` requirements now use a strict Rescue Support selector that excludes Major Foam Tenders and RIVs.
- Missing-unit retry uses the same strict Rescue Support selector, preventing the final popup from changing the requirement into Major Foam Tender.

### Preserved

- The v1.0.12 Armed Personnel → exact type-25 Armed Traffic Car route remains enabled.
- Legitimate `RIV or Major Foam Tender` requirements retain RIV-first/Major-Foam fallback behaviour.

### Changed

- Mission Finder increased from `V10.6.80` to `V10.6.81`.

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

## [1.0.11] - 2026-07-20

### Fixed

- Restored `4x4 Vehicle` as its own MissionChief requirement using exact vehicle type `66`; type `93` SAR 4x4 and type `99` Mountain Rescue 4x4 no longer satisfy the generic 4x4 row.
- Restored `SAR Commander` conversion at two commanders per Control Van in both the shared Unit Finder row normaliser and the supplied Mission Update/Upgrade live-row path.
- Preserved the separate `Mountain Rescue 4x4 or SAR 4x4` priority rule with Mountain Rescue first and SAR fallback.

### Changed

- Mission Finder increased from `V10.6.76` to `V10.6.77`.

## [1.0.10] - 2026-07-20

### Added

- Added a context-sensitive `Unit Class` dropdown to Unit Naming below `Station Type`, with `All classes` as the default option.
- The Unit Class list follows the selected station type and filters the vehicle queue before any edit page is opened.

### Changed

- Mission Finder trained-vehicle selection now prefers cars carrying two correctly trained personnel and falls back to one-person cars only when no valid two-person car remains.
- Trained requirements now track the full trained-person total rather than marking the preferred vehicle count as complete.
- A two-person trained car remains preferred even when only one trained person is left to cover.
- Unit Naming increased from `3.3.4` to `3.3.5`.
- Mission Finder increased from `V10.6.75` to `V10.6.76`.

### Preserved

- Critical Care Ambulances remain on the established one-trained-person-per-Ambulance rule.
- Exact vehicle IDs, live assignment-page verification, type restrictions and genuine shortfall warnings remain enabled.

## [1.0.9] - 2026-07-20

### Fixed

- Public Order trained-vehicle selection no longer combines Level 1, Level 2 and Sergeant into one all-qualifications eligibility rule.
- Level 1, Level 2, Sergeant, Police Medic, Railway Police Officer and Inspector requirements are now evaluated as independent profile-specific demands.
- Each selected type-8 IRV still requires two personnel with the requested profile; multi-trained personnel contribute to each requested profile they actually hold.
- Unit Finder, Mission Update and Auto Mode now use the same independent trained-profile selector.

### Preserved

- Exact vehicle-ID assignment-page verification, ordinary-IRV specialist protection, vehicle capacity rules and genuine trained-personnel shortfall warnings remain enabled.

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

- Mission Update live-range values such as `0-3`, `0-2` and `0-1` now use the unresolved upper bound instead of the first number.
- The correction applies to Fire Engine, ICCU/ACU, Police Car, PRV, SRV and every other live-panel requirement using the shared range parser.
- A completely unknown `?` remains blocked by the existing safety guard.

### Changed

- Mission Finder increased from `V10.6.73` to `V10.6.74`.

## [1.0.6] - 2026-07-20

### Fixed

- Critical Care Ambulances now require one `critical_care`-trained person per normal Ambulance instead of two.
- Armed Response Personnel requirements now select exact type-25 Armed Traffic Cars carrying two personnel who each hold both Roads Policing and Firearms training.
- The one-click Personnel Register builder now scans every station type and every supported vehicle assignment page instead of Police-only stations.
- Police Officer personnel requirements now convert to Police Cars at two officers per IRV, so eight officers select four IRVs.
- Seagoing Vessel requirements now use strict ALB/ABL and All-weather Lifeboat matching.

### Changed

- Mission Finder increased from `V10.6.72` to `V10.6.73`.
- Personnel Assignment increased from `1.2.8` to `1.2.9`.

## [1.0.5] - 2026-07-20

### Fixed

- Normal Police Car attendance no longer requires an IRV to have at least one permanently bound person; exact type-8 IRVs still require a valid assignment-page scan with zero protected specialist qualifications.
- Police Medic requirements now select exact type-8 IRVs carrying two `police_medic`-trained personnel.
- Railway Police Officer requirements now select exact type-8 IRVs carrying two `railway_police`-trained personnel.
- ATV Carrier selection now uses MissionChief vehicle type `30` with ATV/ATC Carrier aliases kept separate from the Police Armed Traffic Car matcher.

### Added

- Personnel Assignment now includes a one-click `Build Personnel Register` action that scans supported Police stations and vehicles without requiring profile setup and without changing assignments.

### Changed

- Mission Finder increased from `V10.6.71` to `V10.6.72`.
- Personnel Assignment increased from `1.2.7` to `1.2.8`.

## [1.0.4] - 2026-07-19

### Fixed

- Auto Mode now detects and clicks every visible MissionChief `missing_vehicles_load` / `Vehicle display limited! Load more vehicles!` control before Unit Finder selection begins.
- Each additional vehicle page must produce a changed vehicle signature and a progressed/replaced load control before the next page can load.
- The complete vehicle table must remain stable and free of visible loading indicators before unit selection, Mission Update or dispatch can continue.

### Changed

- Mission Finder increased from `V10.6.70` to `V10.6.71`.

## [1.0.3] - 2026-07-19

### Fixed

- Normal Police attendance now selects only exact type-8 IRVs whose assignment pages were freshly verified with assigned personnel and zero protected specialist qualifications.
- Already-selected specialist IRVs no longer count as normal Police attendance.
- Automatic, manual Unit Finder and Mission Update now wait for the vehicle list to load and remain stable before selection begins.

### Changed

- Mission Finder increased from `V10.6.69` to `V10.6.70`.

## [1.0.2] - 2026-07-19

### Changed

- Published version 1.0.2 as a no-functional-change release-control test.
- Updated repository documentation to identify 1.0.2 as the current canonical version.

## [1.0.1] - 2026-07-19

### Changed

- Published version 1.0.1 as a no-functional-change Greasy Fork synchronization test.
- Confirmed the canonical update path from approved `main` to the Greasy Fork listing.

## [1.0.0] - 2026-07-19

### Added

- Published MissionChief Command Nexus as one installable userscript.
- Standardized the userscript metadata for repository ownership and automated distribution.
- Added automated source validation, repository quality checks and GitHub Release packaging.
- Added the maintained Greasy Fork synchronization and release workflow.
- Added release documentation, source ownership notes and installation guidance.
- Added the MIT licence and attribution record.
