# Nexus 3.0.43.230: crew assignment and automatic load recovery

Based on .229 (`144308e341207dfc50061d248e1f4df9d2e2ef21`), including its complete station crew fix. Local candidate; no store submission.

## Confirmed stop

The user's .228 export `missionchief-command-nexus-v3-1792339180704.json` records Worker A opening Large public disturbance (264761626) at 15:48:37.895 UTC on 18 October 2026. At 15:49:08.096 UTC its initial 30-second frame deadline calls `setError`, clears run intent and removes the worker. It followed a 121-second unchanged post-dispatch wait on a different mission; that earlier claim was deferred without another dispatch. The export contains 29 recorded dispatches and six cleared transport requests over 1,273 seconds. Counters are not proof of server acceptance or mission fulfilment. The export does not establish why the next page failed to load.

## Change

Only the initial canonical mission GET can use the new recovery. An operational document is adopted normally if its final frame load event is delayed. Otherwise, a pre-start frame without selected units or a matching/unreadable dispatch claim gets one fresh attempt using the existing bounded recovery ledger. A repeat failure gets a WORKER_LOADING deferral with a one-to-five-minute backoff. Transport or the next eligible mission is chosen, or the normal rescan waits for supply. The existing two-mission low-queue threshold remains.

Manual Stop, stale frames/generations, action and login routes, cross-origin/unreadable locations, an issued or confirmed Auto start, selected units, dispatch claims and transport activity cannot authorise a fresh retry. Existing claims are preserved, including claims for an earlier mission. Worker B's uncertain transport safeguards are unchanged. Recovery writes bounded scalar evidence into the existing export history. Healthy missions gain no scan, request or timer; the normal 30-second load deadline is retained.

The .229 station action updates verified assignment counts immediately and saves one changed vehicle at a time, with bounded read/save waits and no replay of an uncertain binding. Its production files are byte-identical in .230. See the .229 candidate README and validation for the reproduced register-save hang and live-read limitations.

## Validation and limits

The new tests exercise production recovery functions and real iframe requests in isolated Edge with every request intercepted. Existing dispatch handoff, loading, throughput and trained-crew regressions are also run. Package scope checks compare the complete runtime outside the explicit loading/timed-skip functions, and confirm the entire station crew fix is retained. No changes are made to unit selection, coverage, training, quantities or dispatch claims. Fixtures establish these safeguards, not live throughput or unattended endurance.

The original Dromore hanging document remained inaccessible. A separate live read confirmed two trained bindings out of six OSU seats; no live crew bindings or dispatches were changed during inspection. The fixed versions have not yet been run on the user's live game.

## Install

Stop Auto Mode, extract `Nexus-3.0.43.230-Crew-and-Auto-Recovery.zip` to a fresh folder, update the unpacked extension, and refresh **all** MissionChief tabs/windows. Confirm .230 before restarting. Reopen Dromore and use Assign crew: it reads the existing bindings before adding the remaining eligible crew. This package includes both fixes, so .229 need not be installed first. Settings and Discord identity are retained.
