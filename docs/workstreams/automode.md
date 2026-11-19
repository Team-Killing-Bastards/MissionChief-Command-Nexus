# Auto Mode

## 1.0.8 — 13 November 2026

Extension .269 gives A a protected mission turn after a bounded transport batch. The turn lasts until a native advance or classified skip, not merely a page reload. Unrelated personal radio requests cannot immediately preempt it through the fresh-document, priority-navigation or rescan paths. Transports belonging to A's own mission retain their handoff. Diagnostics expose the batch count, age and protected turn; the existing bounded transport history records when A receives its turn.

Current-authority patient updates or tables without quantified positive shortages can try the stable loaded pool through the normal Unit Finder. Coverage proof remains unchanged for fresh missions. The trial cannot post a dispatch, and an unverified selection still triggers the existing full-list retry before final vehicle and trained-staff checks. The dispatch loop differs only by opting its two live-authority probes into this trial; selection, validation, full fallback and duplicate-dispatch logic are unchanged.

972 focused checks cover sustained transport queues, old starvation, completed/deferred transports, exact mission requests, stops, ownership, unknown crew, insufficient quantities and full-list fallback. The isolated covered-pool fixture changes simulated loading from 20 seconds/five pages to 0.5 seconds/no extra pages. Actual under-20-second throughput still requires a live run; no global timeout or crew validation was shortened.

## 1.0.7 — 12 November 2026

Early deliberate transport stops can now recover when the controller observes prisoner or mixed transport controls. The worker uses the legacy PATIENT_TRANSPORT_PENDING handoff for both; previously the controller rejected PRISONER and exhausted its start-confirmation retries. The verifier requires the connected current mission document, fresh matching handoff/stop timestamps, stopped control, and no same-mission or unreadable dispatch claim. Existing active-selection, transport-worker and post-dispatch exclusions remain.

The existing recovery path releases A before a live personal radio request goes to B, or defers one mission advance while keeping Auto Mode wanted. The normal selection/dispatch path and patient-cleanup code are unchanged. .267 includes .266's Training filters. Source and isolated browser tests reproduce the .266 failure; 372 focused checks pass without live game actions.

## 1.0.6 — 8 November 2026

Extension .262 fixes the running-confirmation gate missed by .260. An inherited dispatch latch deliberately leaves the replacement document's loop idle, so the handoff must use the existing read-only ownership and inherited-claim proof rather than requiring the loop to restart. Current-document/in-flight claims, pending work, stops and transport remain excluded. No dispatch request is replayed.

Recovered handoffs increment queue progress once per last claim and check the existing memory-recycle policy at the safe boundary. Dispatch counts and mission completion are unaffected. The UI identifies duplicate-send protection instead of showing a normal startup message as a shortage. Real shortage details and required quantities/trained-personnel checks are retained.

The .261 export supplied with this report contains ten claim deferrals following dispatching status, twelve dispatch events but one queue advance, and no fast-handoff recovery events. A browser regression reproduces the failed .261 gate using actual startup and idle-proof functions, then verifies one native POST and one next-mission navigation with the fix. No live dispatches were sent by these checks.

## 1.0.5 — 8 November 2026

Extension .260 extends the existing same-mission replacement-document handoff to ordinary dispatches. The .259 and earlier fast path required the final-queue flag, leaving ordinary inherited claims to the 10-second idle watchdog. A completed replacement document with inactive selection, the active owner and an unchanged inherited claim can now move to the next mission immediately. Current-document claims, unconfirmed ownership, active crew verification, pending navigation/upgrade work and transport contexts refuse this path. The claim is re-read after queue inspection and never cleared or replayed. A live personal transport gets the established boundary first. Existing final-queue recovery is retained.

Confirmed, specifically described shortages use bounded per-mission repeat tracking: 20, 40 and 80 advances for identical category, shortage quantities and missing-requirement text, with eligibility after at most ten minutes even without advances. A changed requirement resets or releases the skip. Saved shortage text permits the first map scan after a recycle to release changed requirements even when the transient row cache is empty. No change is made to selection or trained-personnel validation, loading-error policy, ambiguous stops, cleanup handling or duplicate submission guards. Skip state and history remain capped at 80 entries.

The .258 live comparison showed 23 claim-deferred visits across 13 missions occupying 437 seconds of a retained 31-minute window, versus none in the earlier 160-visit window. Typical visit duration moved from 9.09 to 9.77 seconds; watcher time averaged 51.60 then 53.60 ms. The increased recovery/revisit workload is a demonstrated contributor; these observations cannot exclude changes in server latency or other extensions. Neither the export nor the synthetic test establishes a fixed failure at 2,000 missions. The new handoff adds no idle delay, but a sustained live run is still needed to establish an under-20-second dispatch rate.

## 1.0.4 — 8 November 2026

Record crew-page reading, parsing and register saving separately to locate long verification delays. Small crew updates use the Personnel 1.1.4 committed-record path. Unit selection, trained coverage, timing limits and dispatch gates are unchanged.

## 1.0.3 — 2 November 2026

Before the first additional vehicle page, check the initial pool against a fresh mission definition that is already being read. A single two-second budget applies while that definition is pending. Recheck live shortage quantities when a table appears before its rows. The same coverage checks and final dispatch gates apply.

## 1.0.2 — 2 November 2026

Read the active mission card for assistance checks. Healthy missions bypass the disposed-mission queue scan. Watch edited airfield text and sample routine diagnostics every two seconds. A late callback can confirm a previously growing vehicle list if it now satisfies every readiness check within the hard limit. Exports include cumulative watcher time and slow-pass counts.

## 1.0.1 — 2 November 2026

A late vehicle page with additional selectable rows gets one bounded settle check before a load failure. The mission, owner, native control, row stability and total deadline are still checked. Auto Mode requires recent confirmed assignment evidence when counting a selected vehicle toward strict trained-personnel demand.

## 1.0.0 — 31 October 2026

Initial independent version baseline, carried forward from extension 3.0.43.240. This does not claim the feature is newly introduced.

Source: Logical workstream within `nexus-runtime.js`; extraction into a separate module remains future work.
