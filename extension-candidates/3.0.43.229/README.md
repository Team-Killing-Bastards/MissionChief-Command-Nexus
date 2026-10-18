# Nexus 3.0.43.229: station crew assignment

Based on .228 (`f9fbd293`). Local candidate; no store submission.

The user reported Assign crew remaining at zero although one person was bound. An isolated Edge fixture using the production assignment parser and real IndexedDB reproduced that exact display when the first verified binding was followed by a never-settling register write. The normal baseline filled all six seats, so this does not prove that every register save hangs. A live read later confirmed two trained bindings on Dromore-OSU-1, with eleven trained personnel at the station. The original hanging tab's debugging connection was unavailable; its exact stalled stage remains unconfirmed.

The station action now updates its count immediately after verification and saves once per vehicle, including a user-stopped partial fill or a failed subsequent read. An uncertain binding is not registered as verified. Writes merge only the changed vehicle into the current account register and check the committed result; unrelated rows and newer records are retained. Every read, response body and register wait has a 15-second deadline. A timeout reports the stage and releases the busy UI. The underlying database operation can still complete later, but cannot resume game assignments.

The native binding endpoint is a toggle: an interrupted response gets a read-only check, never another POST. If the candidate and exact count increase cannot be verified, Assign is blocked until a station refresh. Profile-based crew assignment shares this response verification and deadlines; its existing write frequency is retained. Training, capacity, status-6, identity and binding checks remain. Auto Mode, its timing and its unit/personnel selection are unchanged apart from version strings.

## Validation

`check-station-crew.mjs` runs 26 cases with intercepted traffic in an isolated Edge profile. It loads the real personnel store and assignment modules. It tests complete fills, existing bindings, multiple vehicles, limited seats, insufficient/wrong training, other bindings, changed identity/counts, pagination, missing security token, Stop, accepted errors/redirects, stalled responses and bodies, uncertain results, register timeout/failure/conflict, later save completion and profile assignment. Test deadlines are accelerated to 200ms; production uses 15 seconds. This is not a live mutation test or a throughput benchmark.

## Install

Stop Auto Mode, extract the ZIP into a fresh folder, update the unpacked extension and refresh all MissionChief tabs. Reopen the station before using Assign crew so its old pending operation is gone. Existing verified bindings are read first and are not submitted again. Settings, Discord identity and permissions are unchanged.
