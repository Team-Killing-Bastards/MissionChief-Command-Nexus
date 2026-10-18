# Nexus 3.0.43.233 — transport-worker loading recovery

Based on .232 (`b93153b9c34ae2da270b712f17ee34cd685be890`). Local candidate; no browser-store submission.

The previously observed live UI showed “Transport Worker B did not finish loading” and Auto Mode stopped. Source inspection confirms that B's initial iframe deadline bypassed Worker A's recovery and called the controller-wide error handler, clearing run intent. This change corrects that recovery path; it does not claim to fix a server or network condition that made the page slow.

## Behavior

- B's initial loading deadline uses its existing 18-second transport side-pass budget. Worker A retains its existing 30-second initial load deadline.
- A readable expected vehicle/transport document with a delayed load event is retained and adopted. The normal transport watcher gets its service window. Recovery does not navigate to or submit a transport destination again.
- An unready canonical vehicle GET is deferred. Other eligible personal transports run first, then personal missions resume. The existing mission-boundary/rescan paths automatically retry from the vehicle page after 30 seconds; recent repeated failures increase this to at most five minutes. No successful mission advance or manual Retry is required.
- Cooldowns are checked at the start of B as well as by the queue selector, preventing late handoff callbacks from bypassing them. Failure history and deferrals use the existing bounded history and run-continuity storage.
- Cleared Radio requests return to normal work. Failed loads are labelled deferred, not counted as successful transport. Existing click and dispatch locks are retained. Stale callbacks, manual Stop, unexpected pages/origins/request identities and unobservable action state cannot authorise a load retry.
- Successful page loads gain no extra timer, network request, scan or deliberate delay. The additional normal entry check reads the existing in-memory cooldown map.

## Validation

Production-function tests reproduce .232's whole-run stop and exercise continuation, cooldown enforcement, increasing backoff, retries while no missions are available, other pending transports, active documents, in-flight action evidence, manual Stop, stale callbacks and unchanged locks. Isolated real Edge tests stall initial GETs, delay load events, submit one intercepted POST, clear Radio requests and retry after cooldown. Every browser request is intercepted.

The existing ordinary-worker browser tests, controller recovery, throughput and trained-crew checks are rerun. Package scope compares every file to .232, allowing four transport-loading/status functions, version labels and update notes. The .232 patient cleanup implementation and station crew fix are retained unchanged; their previous test results remain inherited.

This candidate has not yet recovered a real failed B load in the user's running game. The isolated checks do not establish live throughput or long-run endurance.

## Install

Stop Auto Mode. Extract `Nexus-3.0.43.233-Transport-Worker-Recovery.zip` and update the unpacked extension. Refresh all MissionChief tabs/windows so every parent and worker uses .233 before restarting Auto Mode. Existing settings, Discord identity and personnel registers are retained.

The update notice includes the Worker B recovery change and links to the pinned GitHub changelog. No store submission is included.
