# Nexus 3.0.43.228: shorter confirmed-shortage recovery

Based on .227 (`0d65eaafb06a8ac618c69ee243c3e5d6e21606ca`). Local candidate; no browser-store submission.

## Latest run evidence

The supplied .227 export covers 18 October 2026, 14:05:48–14:43:32 UTC: 2,264 seconds, 63 recorded dispatches (100.2/hour), 44 skip records across 22 missions, and 46 transport requests cleared. No post-dispatch soft/hard recoveries or loading-category failures were recorded. The recent loading statistics start later, at 14:27:00; their 61 completed checks report zero failures and cannot establish what every earlier load did.

Thirty-four skip records mention Police Cars. Repeat visits follow the existing twenty-advance retry policy. Their shortage labels alone do not prove fleet unavailability; this export does not retain enough candidate/crew evidence to decide whether those units were busy, out of range or excluded incorrectly.

The retained recovery history contains 36 ended resource-shortage waits totalling 428,479 ms (7m 8s), plus four personnel-shortage waits totalling 12,522 ms. That is a bounded history, not the entire run. The exact final resource-stop wording uses “No vehicles were dispatched”, while the old fast-path classifier required “Dispatch was not clicked”; resource failures therefore waited twelve seconds. The change allows the same three-second terminal window only with fresh, current-document proof. The nine-second reduction applies per qualifying stop, not to loading/selection time and not as a live throughput forecast.

Recent trained/personnel searches took up to 16.8 seconds loading the full vehicle list. The export also records main-thread long tasks, but does not attribute them to Nexus, Toolkit or the game. Its dispatch/full-cycle summary has zero samples, so no reliable dispatch-stage percentile can be reported. Recorded dispatch counts do not verify server acceptance or full mission fulfilment.

## Change and safeguards

The controller recognises only the exact completed resource-selection stop, matched to its current stop record and confirmed active document. It checks the stopped control, mission identity, document connection/readiness, selection state and dispatch claim before using three seconds. If that proof changes, the ordinary window restarts. The normal once-only fresh search, transport handoff and twenty-advance cooldown are retained. .227 dispatch/loading recovery is retained.

The complete Auto Mode selection loop, vehicle loading/stability, coverage and trained-crew functions are byte-identical to .227. There is no new timer, scan or network request. Tests reproduce the old twelve-second delay, exercise the shorter recovery, prove one fresh retry and normal queue continuation, and reject stale/active/claimed cases. Isolated Edge checks use intercepted requests and the real stop-store reader; they are not a live game test.

## Install

Stop Auto Mode, extract `Nexus-3.0.43.228-Shortage-Recovery.zip` to a fresh folder, update the unpacked extension and refresh every MissionChief tab. Confirm .228 and restart Auto Mode. Settings and Discord identity are preserved. A subsequent live export is needed to measure the effect and investigate any remaining selection shortages.
