# Nexus 3.0.43.223: crew-check throughput

Based on .222 (41bed47f7e81607c80090fbeb16b6929df9406a6). The supplied .222 run recorded 258 dispatches in 4435 seconds, 17.2 seconds each overall, but its last retained sequence averaged 27.5 seconds between sends. Slow visits included 60-66 assignment reads and repeat shortage visits. These counters do not prove unique fulfilled missions or completed calls.

## Changes

- Reuse complete live assignment evidence across worker navigation within the existing ten-minute lifetime. Stale, future-dated, different-type, incomplete or non-live register evidence still requires a fresh read.
- Save a patch of changed records once per scan, after all six-wide batches needed for coverage, instead of writing the entire register after every batch. Await durable commit before selection; retain timestamp merging and account isolation.
- Keep the local final full-list search. Avoid the additional whole-page personnel-shortage recheck only when the current stopped worker proves that final search completed, and the pool, requirements and register have not changed. Retain transport priority and the existing skip cooldown.
- Retain exact vehicle types, trained occupant combinations, seat capacity, current requirement authority and final dispatch guards. No extra background polling, no increased request concurrency. Failed reads remain unknown.

## Validation

Run `check-crew-throughput.mjs` for actual production-function fixtures and `check-crew-browser.mjs` for the real assignment parser and personnel IndexedDB in an isolated Edge profile. Browser routes are intercepted; these fixtures do not dispatch to the live game. Regression scripts cover the previous startup, handoff, unit coverage, transport, queue priority, memory lifecycle, Alliance and update-notice behavior.

The 66-vehicle fixture preserves all required trained occupants, changes eleven database commits to one, and reuses the evidence on the next document with zero assignment reads. Changed assignments prevent full coverage. Fixture timings are not a prediction of game speed.

## Install and measure

Stop Auto Mode, extract the ZIP into a fresh folder, disable the previous Nexus copy and load the new extension folder unpacked. Refresh all MissionChief tabs and confirm 3.0.43.223. Run with normal settings for 20-30 minutes, including a normal recycle, then export. Check recorded dispatch intervals, staffing shortages, `trained-crew-check` timings and the completed-shortage-recheck log. The target is sustained under twenty seconds per recorded dispatch; it has not been established by a live .223 run. No browser-store submission.
