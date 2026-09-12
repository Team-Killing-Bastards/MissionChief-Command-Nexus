Local Alliance mission support, based on .56. Not a store release.

The top-bar Alliance missions button opens a Nexus panel listing shared alliance and event missions, including cards hidden by native filters. A Show already supported toggle is off initially. Credit filters partition estimated rewards into 0–3k, 3–5k, 5–10k, 10–15k, 15–20k and 20k+; unknown estimates appear only under All values.

Support dispatches one Fire Officer (native UK type 3) from that mission's available vehicle list. Select and Support selected create a serial batch. Arrival time is the primary order, with distance as a fallback only when every candidate has distance data. Disabled vehicles, existing visible selections and officers reserved by this batch are excluded. Missing arrival evidence or an incomplete list stops the action. Native pagination must finish first.

Dispatch uses the game's own checkbox and normal Dispatch button inside one sandboxed same-origin frame. No endpoint, CSRF payload or game script is recreated. The frame is removed after each result. Heavy Nexus runtime and manual worker decorations are excluded. The sandbox lacks top-navigation permission, keeping the panel open. Background means a user-triggered queue in the current game tab, not a persistent service-worker task.

Only a native success message identifying that exact officer or its presence in the mission's travelling/on-scene table confirms success. Pending identities are persisted before clicking. An uncertain result stops the queue and remains visible as Check result, including after reload. Result checking does not dispatch; it either confirms attendance or verifies the officer is still selectable before allowing a new explicit attempt. Confirmed identities are retained for up to a day to bridge stale cards. Stop queue permits an already submitted result to finish checking and leaves remaining selections intact. Closing the panel leaves its queue running.

The controller exposes a lightweight busy check. Starting a batch requires Auto Mode to be stopped; Auto Start/Retry are guarded while this queue is busy. A same-origin Web Lock serializes alliance queues across tabs. Local lease and pending records protect starts/refreshes. Other manually issued game actions remain the player's responsibility. No fleet API snapshots, logger reads or background idle polling are added.

Reviewed runtime additions are exact frame-isolation, state-reader and Start/Retry guards. The executable-AST identity check continues to protect all other .55/.56 logic. New packaged files and settings changes have an explicit .57 provenance allowlist. Existing permissions, content-script hosts and optional reporting destination are retained.

Run `node scripts/prepare-alliance-57.mjs`, then `node scripts/verify-alliance-57.mjs`. `--resume` is only for a repaired test harness with unchanged package source. Delivery is `node native-navigation/build-alliance-57.mjs` from the workspace root, after committing the verified source. The full verification runner also includes the alliance browser suite.

Verification uses isolated browser fixtures, not the player's session. Live game dispatch and physical Orion acceptance are pending. The player's loaded extension and store publication are separate from the local package.
