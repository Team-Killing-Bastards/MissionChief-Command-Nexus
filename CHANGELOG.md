# Changelog

All notable changes to MissionChief Command Nexus are documented here.

The project uses Semantic Versioning for the unified userscript release line.

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
