# Nexus 3.0.43.221: Auto Mode startup readiness

The .220 export stopped on Investigate Flare at 13:53 UTC / 14:53 BST after a full-page recycle. The mission control was mounted, enabled and visible, but still showed Start after two attempts. The run had 566 recorded dispatches in 3h 50m 56s (147/hour), with no memory-pressure activation. The export does not record whether the personnel register was pending or failed, so its exact trigger is not established.

Production-function regression tests reproduce the same five-second error when personnel readiness is delayed, plus two queued starts resuming afterwards. This candidate acknowledges register loading, shares one pending start, and cancels it on Stop, removal, suspension, changed mission or lost ownership. Readiness has a 30-second deadline and specific error reporting. Managed frames receive a directed start; unknown/missing acknowledgements retain the previous bounded gate. Ready registers do not wait for a timer. Existing selection, trained coverage, transport logic and dispatch claims are unchanged.

## Install and verify

Stop Auto Mode, extract this ZIP into a fresh folder, disable the previous Nexus copy and load this extension folder unpacked. Refresh every MissionChief tab and confirm 3.0.43.221. Run with your normal settings and export diagnostics after the next page refresh/recycle, or immediately if it stops. The new worker.autoStartup and worker.startupStatus fields survive worker removal and identify the phase and error instead of only reporting that the button remained on Start.

## Validation

54 controlled startup tests, 11 isolated Edge map/worker tests, 157 throughput checks, 20 startup transport-handoff checks, 52 background-control checks, 53 diagnostic checks, 118 patient-tail checks, 20 Any vehicle checks and 17 CRV checks passed. Syntax, manifest references, permissions, fixed extension key and update-notice lifecycle/render checks passed. Browser fixtures intercept traffic and do not dispatch or cancel units in the live game. The supplied .220 export is evidence of the stop; .221 is locally tested, not yet verified in the installed long-running game. No browser-store submission.
