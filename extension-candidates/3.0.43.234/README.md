# Nexus 3.0.43.234 — Alliance Auto batches

Based on .233 (`e7953ef38adbeae137e844195fbd4fbe95bf1645`). Local candidate; no browser-store submission.

## Controls

Available directly in **Alliance missions**, and in **Nexus Tools > Settings > Alliance support**:

- **Minimum credits**: 0 by default. Set a value to exclude missions below it; missions equal to it qualify. Unknown values are excluded when a minimum is set. It combines with the existing value-range filter, so choose All values if you only want the new minimum. Applies to displayed missions, selection and automatic support.
- **Missions per batch**: 10 by default, adjustable from 1 to 100. This is a maximum number of attempts, not a guarantee that every mission has a suitable available unit. A shortage consumes a slot rather than being replaced by an unbounded stream of candidates.
- **Pause (minutes)**: 10 by default, adjustable from 1 to 1,440. The first eligible batch starts without an initial ten-minute delay. After a batch finishes, even if partial, the fixed pause begins. The panel shows progress and the next batch time.

Alliance Auto remains off by default. An existing enabled setting is retained. Save the options, then enable Alliance Auto when ready. Manual support remains available during an automatic pause.

## Continuity and performance

The existing exclusive alliance lock plus one small timestamp coordinate the pause across tabs in the same browser profile and retain it after refresh. The timestamp is saved before each attempt and after the batch; an interrupted tab cannot immediately bypass the pause by reopening. A reduced batch size applies before the next mission; increasing it does not enlarge the current batch. Value filters are rechecked before native dispatch and after the durable dispatch checkpoint. Stop verifies any already-sent action before ending the batch. Unknown dispatch results retain their existing no-replay handling.

The three preferences use the existing Discord settings allowlist and validation. The running schedule is local to a browser profile and is not a cross-PC dispatch scheduler. No VPS change is needed for these additional preferences.

Personal Auto Mode, the .233 Worker B recovery, patient cleanup and trained-crew selection are unchanged except for the runtime's displayed version. The alliance scheduler reuses its one existing timer. No live countdown polling is added; a hidden paused panel skips list/register refreshes on mission mutations.

## Validation

`check-alliance-batches-browser.mjs` exercises the actual packaged settings, alliance implementation and results store in an isolated Edge profile. All network requests are intercepted. It covers exact minimum equality, unknown/zero values, combined value ranges, settings UI, batch limits, timed resumption, distinct vehicles, personal selection protection, refresh, multiple tabs, manual support, Stop, shortages, uncertain results, corrupt pacing data, settings changes during loading/sending and storage-quota failure. Desktop and narrow-layout captures accompany the candidate.

`check-scope.mjs` compares all 150 packaged files against .233, validates settings bounds and the cloud allowlist, checks permissions and pinned update-note links, and syntax-checks the JavaScript files. Prior personal Auto Mode behavior is retained by source equality; those unchanged full suites are inherited, not presented as rerun here.

The final package and committed candidate are byte-compared. Live-game pacing, cross-PC cloud round trips and long-run throughput have not been verified for .234.

## Install

Stop Auto Mode and Alliance Auto. Extract `Nexus-3.0.43.234-Alliance-Batches.zip`, update the unpacked extension, then refresh all MissionChief tabs/windows before restarting. Existing settings, Discord identity and personnel registers are retained.

The first-update notice links to the committed GitHub changelog entry. This candidate has not been submitted to Chrome or Edge stores.
