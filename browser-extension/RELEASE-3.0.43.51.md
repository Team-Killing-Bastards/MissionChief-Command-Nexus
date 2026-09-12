# Nexus 3.0.43.51 — local crew refresh repair

Fixes a new-purchase mismatch where the game lists six vehicles but Nexus still calculates personnel for one and omits Assign crew links for the new rows. The old implementation requested the account-wide `/api/vehicles` snapshot once and created links only for entries found in that response.

Manual building and personnel pages now read `/api/buildings/{id}/vehicles`; vehicle and binding pages read `/api/vehicles/{id}`. Both use `cache: no-store`, existing same-origin credentials, response size limits, timeouts and cancellation. These narrower endpoints are present in the local LSS `src/workers/stores/api/vehicles.worker.ts` reference. No account-wide vehicle read is used by these manual panels.

Assign crew links are created immediately from native vehicle row IDs, before the API finishes. Station row insertions/removals trigger a debounced refresh with a minimum one-second start gap. Sorting, timers, cosmetic changes and Nexus additions do not fetch the register. A read overtaken by a newer list change cannot replace current data. A replaced station table is rediscovered by the existing lightweight ten-second lifecycle tick. There is no continuous fleet polling.

If the targeted response disagrees with the native vehicle IDs or reported station count, totals are visibly partial. One follow-up read is allowed per changed list; continued disagreement remains partial with a manual refresh available. API failures leave the game's controls and immediate Assign crew links usable. Personnel snapshots refresh with a new vehicle read, use no-store, and cancel superseded reads. Binding changes on the native personnel table refresh the current vehicle's assigned count.

All watchers, queued refreshes and registries are released on suspension. The refresh path remains confined to visible manual building/personnel/vehicle pages. Auto runtime changes are version markers only. Prior .50 station tabs, next matching course navigation, course filters and other local features remain included.

Base: .50 `56c0711b`, branch `codex/crew-freshness-51`. Local only; do not push, merge, tag or publish without a subsequent explicit user request.

Validation: `node scripts/verify-all.mjs`, sixteen stages. `tests/ui/crew-freshness-51.mjs` reproduces the .50 failure and checks six IRVs produce min 6/max 12, immediate links, burst purchases, removals, sorting/timer churn, bounded reconciliation, in-flight changes, specialist crew refresh, binding changes, errors, suspension and Auto-worker exclusion. Tests use isolated mocked game pages; live account and physical device acceptance remain pending.

Delivery: `native-navigation/build-crew-freshness-51.mjs` creates the ZIP and ready-to-load folder under `manual-install/Nexus-Extension-3.0.43.51-LOCAL-CREW-REFRESH`, verifies all delivered hashes and retains the already-public .45 reporting destination.
