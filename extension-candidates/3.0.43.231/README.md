# Nexus 3.0.43.231: isolate unverified patient cleanup

Based on .230 (`2ee86907458360f2256e75cbfcdaf77cae7bc1b1`). Includes the .229 station crew fix and .230 initial-worker-load recovery. Local candidate; not submitted to a browser store.

The supplied .230 diagnostic export (`missionchief-command-nexus-v3-1792348303261.json`) shows the inner Auto loop stopping on an unverified zero-patient cancellation at 18:24:47 UTC while the controller retains run intent. It remains there until the 18:31:43 export. The native action returned HTTP 200 and the fresh mission read also returned 200, but the response body is not retained. This establishes the missing recovery path, not a game rejection or confirmation-parser defect. Live read-only inspection later found the user's controller already stopped and no active worker; no cancellation or restart was performed.

## Behavior

- A current-document cleanup stop becomes a `PATIENT_CLEANUP_REVIEW` deferral. Other missions and eligible Worker B transports can proceed without Start/Retry. Early stops before startup acknowledgement use the same verified handoff.
- A small session guard is committed before cancellation. Replacement workers and page refreshes cannot repeat uncertain actions; subsequent visits only read the mission. Guards do not expire automatically, have a maximum of 200 outstanding records, and clear on verified closure. They belong to this game tab's session; closing the tab/browser can end that session.
- The existing second cancellation is preserved only inside a single verified cleanup sequence. Explicit first-action acknowledgement and a fresh zero-patient, zero-unit, no-other-demand result remain required. HTTP 200 alone never permits it.
- Response classification is recorded as compact text through the existing bounded event mechanism, without raw HTML. Deferred cleanup also enters the controller recovery history and Reasons display.
- Unit selection, quantities, alternatives, training and final dispatch checks are unchanged. Healthy missions gain no network requests or timers; the guard uses one small local session read at the existing patient-tail gate.

## Validation

Production-function regressions reproduce the old unhandled stop and verify continuation to another mission, transport handoff, waiting for supply, and early-start recovery. Stale signals/documents, active selection, manual Stop, dispatch claims and transport ownership block inappropriate recovery. Real isolated Edge tests exercise native-looking cancellation responses, fresh verification, positive/unknown patient protection, two-step success, unconfirmed 200, returning workers, storage failure/full/corrupt records and closure. Every fixture request is intercepted.

The package scope check compares every file to .230, allowing only eight cleanup/controller functions, version labels and update notes. The existing throughput, staff, initial-load and dispatch-handoff regressions are retained. These results do not establish live throughput or unattended endurance. The full fixed extension has not been run on the user's live game.

## Install

Stop Auto Mode. Extract `Nexus-3.0.43.231-Patient-Cleanup-Recovery.zip` to a fresh folder, update the unpacked extension, and refresh all MissionChief tabs/windows. Confirm .231 before restarting. Settings and Discord identity are retained. An unresolved cleanup is visible in Reasons; automatic revisits only check whether that mission has closed.
