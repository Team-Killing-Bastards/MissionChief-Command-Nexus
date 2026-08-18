# Changelog

All notable changes to MissionChief Command Nexus are documented here.

The project uses Semantic Versioning for the unified userscript release line.

## [Unreleased]

No changes have been queued after `1.1.5`.

## [1.1.5] - 2026-08-18

### Added

- Added the default-off **Handle patient transports in the background** setting. During Auto Mode, exact current-player Transport Patient requests are queued, processed one at a time in an off-screen same-origin MissionChief frame, sent to the first destination with confirmed free hospital capacity and removed only after MissionChief confirms the handoff.
- Added visible background-transport states for Watching, Queued, Sending, Retrying, Sent and Failed. Prisoner/cell transport remains on the established foreground route.

### Fixed

- Fixed the Mission Analytics Logger reaching its 300-event local ceiling during long offline or high-volume sessions. The queue now retains up to 1,200 events within the existing 3 MB storage bound, drains up to eight 40-event batches per automatic pass, drains up to twelve batches on manual sync/reconnect and immediately schedules another bounded pass while backlog remains.
- Fixed **Sync now** appearing to do nothing when it was pressed inside a mission frame/pop-out or while another MissionChief tab owned the shared upload lock. Manual drains are handed to the top-window logger owner, queued behind an active upload and visibly report **Drain queued** and per-batch progress.
- Renewed the cross-tab upload lock before every batch and added an immediate confirmation retry using the same idempotent batch ID after a Google response timeout, avoiding the old five-minute accepted-then-acknowledged retry delay.
- Added eager upload when the local outbox reaches 20 events, so normal high-volume activity no longer waits for the next five-minute timer.
- Made overflow fail safer: low-value mission-observed rows are discarded before dispatch, completion or exact-credit evidence if the fixed storage ceiling is still reached. Existing dropped events cannot be reconstructed.

### Security and compatibility

- Background patient transport accepts only exact same-origin `/vehicles/{vehicle}/patient/{patient}` routes captured from a visible Transport Patient request or active patient/hospital page. It rejects prisoner/cell contexts, keeps one worker and one request active, caps the queue at 40, retries at most three times and clears immediately when the setting or Auto Mode is stopped.
- Preserved the existing Google Apps Script endpoint and its 40-event server batch limit; no `Code.gs` deployment, pairing change or workbook migration is required.
- Added permanent regressions for background patient transport lifecycle and logger backlog draining. Increased the unified userscript from `1.1.4` to `1.1.5` and Mission Finder from `V10.7.2` to `V10.7.3`; all other component versions remain unchanged.

## [1.1.4] - 2026-08-18

### Fixed

- Made every Nexus-controlled dispatch route logger-aware instead of relying solely on a document click listener. Manual Dispatch, Dispatch & Share, Auto Mode, high-value auto-share, not-ready skip dispatches, Ally Steal and post-dispatch upgrade passes now snapshot selected units before MissionChief clears the vehicle selection and commit the prepared event after the dispatch control is invoked.
- Added a direct programmatic fallback for mission runtimes where the capture-phase click listener is absent. The existing dispatch fingerprint dedupe prevents the listener and fallback from creating duplicate events.
- Rejected zero-unit dispatch snapshots so navigation or repeated dispatch controls cannot create misleading dispatch events with no unit evidence.
- Added dispatch-capture provenance and selected-unit counts to event metadata for live diagnosis.

### Security and compatibility

- Preserved native MissionChief dispatch controls, Auto Mode behaviour, the existing logger endpoint, spreadsheet, player/browser pairings and queued events. Actions performed in a completely different unpaired browser or profile remain outside the browser-local logger boundary.
- Added `scripts/check-mission-dispatch-path-logger.mjs` and expanded the permanent Mission Analytics Logger regression to lock every supported dispatch path.
- Increased the unified userscript from `1.1.3` to `1.1.4` and Mission Finder from `V10.7.1` to `V10.7.2`. Resource Administration remains `V4.2.8`, Unit Naming remains `3.3.27`, Station Naming remains `1.3.22`, and Personnel Assignment remains `1.3.12`.

## [1.1.3] - 2026-08-17

### Added

- Added true generated-mission capture for the opt-in Mission Analytics Logger. Nexus now records each new mission belonging to the signed-in player when MissionChief adds it to the native mission list, without requiring that mission's detail page to be opened first.
- Reused MissionChief's native `missionMarkerAdd` callback and the existing top-window mutation observer as a bounded fallback. Initial mission-list hydration is recorded only as a local baseline, preventing a refresh or userscript update from falsely importing the whole existing mission list as newly generated.

### Fixed

- Fixed dispatch journey evidence remaining blank because MissionChief may expose distance and ETA on the selected checkbox or a native metric cell rather than the enclosing row. One shared reader now checks those exact native attributes and explicit unit-labelled values, and vehicle arrival sorting uses the same evidence path.
- Preserved Google Sheets dashboard and analysis formula references during logger rebuilds by clearing source data cells instead of deleting the referenced rows.
- Blocked duplicate active player display names and directs additional browsers to **Create another device pairing**, preventing ambiguous dashboard player filters.

### Security and compatibility

- Generated-mission capture accepts only a mission whose native owner ID exactly matches the current signed-in user. Alliance missions owned by another player and records without exact ownership evidence fail closed.
- Preserved the existing logger endpoint, player/browser pairings, local queue, spreadsheet and dashboard. Historical journey rows with missing evidence cannot be reconstructed; new distance/ETA evidence begins with dispatches captured by `1.1.3`.
- Increased the unified userscript from `1.1.2` to `1.1.3` and Mission Finder from `V10.7.0` to `V10.7.1`. Resource Administration remains `V4.2.8`, Unit Naming remains `3.3.27`, Station Naming remains `1.3.22`, and Personnel Assignment remains `1.3.12`.

## [1.1.2] - 2026-08-17

### Added

- Added MissionChief's dispatch-time estimated route distance and ETA to each selected-unit logger record when those values are available in the native vehicle-selection row.
- Added two append-only columns to `Dispatch Units`: `estimated_distance_km` and `estimated_eta_seconds`.
- Added retained ISO-week/player/station `Journey Data`, including journey counts, distance/ETA evidence counts, averages, maximums and missing-evidence counts.
- Added dashboard views for Station Coverage Distance / ETA and Furthest Individual Unit Dispatches.

### Security and compatibility

- Journey analytics stores only MissionChief-provided dispatch-time estimates. Missing values remain blank and are counted explicitly; the logger never estimates distance or ETA.
- Preserved existing endpoint, spreadsheet, player/browser pairings, local queue, dashboard filters, historical rows and weekly archive flow.
- Increased the unified userscript from `1.1.1` to `1.1.2` and Mission Finder from `V10.6.152` to `V10.7.0`. Resource Administration remains `V4.2.8`, Unit Naming remains `3.3.27`, Station Naming remains `1.3.22`, and Personnel Assignment remains `1.3.12`.

## [1.1.1] - 2026-08-16

### Added

- Added an optional, default-off **Share anonymous mission analytics** switch that can be enabled per paired browser.
- Added a five-minute bounded upload queue for mission observations, dispatch snapshots, exact selected-unit evidence, completion records and exact MissionChief credit matches.
- Added pairing, device revocation, batch deduplication and rejected-event diagnostics through the Google Apps Script integration.

### Security and compatibility

- The logger records mission IDs, URLs, mission names, advertised and exact awarded credits, current casualty counts, generator evidence, exact selected vehicles and timings needed for mission analysis. It does not upload account passwords, cookies, free-form chat, personal names or the rest of the account ledger.
- Exact awarded-credit recovery uses MissionChief's own credit transaction ledger locally and uploads only matched mission transaction evidence.
- Each browser holds its own pairing credential and queue. Disconnecting removes that browser's credential and unsent local events.
- Preserved all prior Mission Finder, Unit Finder, Auto Mode, Ally Steal, Mission Update, transport, personnel, naming and Resource Administration behaviour.

## [1.1.0] - 2026-08-16

### Added

- Added the Mission Analytics Logger integration and Google Apps Script backend under `integrations/google-apps-script/`.
- Added browser pairing, player/device management, batch ledger, mission event, dispatch-unit, summary, dashboard and weekly archive support.
- Added permanent regression coverage for logger transport, pairing, dashboard, privacy and archive behaviour.

### Security and compatibility

- Logger setup is opt-in and defaults off.
- Pairing codes are one-time use; browser tokens are stored locally and hashed in Google Sheets.
- Upload batches are bounded and deduplicated.
- Existing Mission Finder behaviour remains unchanged unless the user enables and pairs the logger.
