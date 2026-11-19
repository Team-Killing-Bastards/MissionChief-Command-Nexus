# Building & staging profiles

## 1.2.3 — 8 November 2026

Extension .263 separates owned fleet identities/types from changing vehicle status in bulk approval. Dispatching or returning a vehicle no longer invalidates otherwise identical profile quantities and targets. Away vehicles still count toward owned totals and are not renamed or staffed while unavailable.

The original reviewed removal list remains the upper limit. Both the station worker and the locked apply review intersect currently available removals with that approval. An approved vehicle that leaves is skipped, and an unapproved extra vehicle returning is left in place until reviewed. Existing live deletion checks still apply after these reviews. Genuine identity/type, profile, level, quantity or offer differences produce specific messages, including affected vehicle IDs for fleet changes.

The existing current-credit-price policy is retained for bulk profiles; strict single-station quick buy, mutation locks, player checks and pending-outcome checkpoints are unchanged. Isolated browser tests reproduce the earlier rejection and cover both review boundaries, departures/returns, consent narrowing, exact purchases, actual fleet changes and existing failure protection. No live purchases or removals were performed.

## 1.2.2 — 8 November 2026

Extension .259 allows current game credit prices in the bulk profile window. The review shows Estimated credit spend and explains that prices can change during execution. The batch approval compares the station, fleet, profile, quantities, removals, level targets and offer capacities without treating credit-price changes as a changed plan. The engine rechecks the same structure under its existing mutation locks and uses each current native credit offer.

Changed credit estimates and vehicle prices are logged; verified purchase costs are accumulated for the completed passes. No percentage allowance or old quote ceiling stops this explicitly approved batch. Invalid prices, unavailable offers, changed fleets or level targets, player changes and uncertain purchase outcomes retain their existing handling. Individual station profiles and quick buy keep their original price limits unless the bulk execution explicitly opts in.

Isolated browser tests cover rising and falling vehicle/level prices, price changes after a level upgrade and between successive vehicle purchases, unchanged purchase quantities, strict single-station quick buy, fleet/target changes, unknown prices, cancellation and uncertain outcomes. No live purchases were performed. Auto Mode, Alliance and the personnel store are unchanged from .258.

## 1.2.1 — 31 October 2026

Extension .248 explains why a station remains in the matching scan. The Result column shows the first exact difference: a missing vehicle count, another vehicle type, current level with expansion still available, assigned crew count, expected vehicle name, or qualified crew count. A new What this profile checks disclosure lists the selected vehicle quantities, per-vehicle crew and qualifications, naming choice and the current maximum-level checkbox. The checkbox controls the batch and scan even if the profile was previously applied without a level upgrade.

The scan still checks live station evidence rather than relying on a saved applied flag. Confirmed complete matches are hidden; failed or incomplete reads remain visible. It stops at the first difference, preserving the existing request limits. Matching criteria, profile execution, purchases, crew-assignment actions, Auto Mode and Training are unchanged. Isolated browser tests verify detailed results alongside the existing completed, incomplete, cancelled and changing-scope cases.

## 1.2.0 — 31 October 2026

Extension .247 scans when a profile, dispatch centre or maximum-level choice changes in the bulk profile window. It hides stations only after their current fleet meets the profile quantities, no other vehicle types remain, the requested maximum level is reached, and enabled naming and crew targets match. Vehicles away from base still count as owned. Extra vehicles of allowed types follow the existing profile comparison and are retained.

Crew totals come from the current fleet response; targets requiring qualifications also read the native assignment page through the existing personnel parser. Missing, inconsistent or failed reads and unresolved purchase checkpoints keep a station visible with a reason. No cached claim that a profile was applied is treated as proof.

The scan reads at most two stations concurrently, short-circuits on the first change required, does not load markets or buy anything, and is cancelled on filter changes or closing the window. Stop scan retains unchecked stations. Show matching stations restores confirmed matches, and Scan profile matches repeats the check. Changing scan choices clears selections and quotes; hidden matches cannot remain in a batch. Search filters the checked list without another scan. A completed profile pass still requires a fresh scan to confirm the latest setup.

Auto Mode, Training, purchases and crew-assignment actions are unchanged. The existing personnel parser is exposed as an on-demand factory and the existing vehicle-caption calculation is shared with the scanner. Validation uses isolated browser fixtures; no live station changes were made.

## 1.1.1 — 31 October 2026

Extension .246 adds a Personnel column beside the station name in Apply profiles to stations. It displays the current total from the already-loaded building inventory, including unavailable staff. Zero remains zero; absent or invalid data is shown as an em dash. Load profiles and stations refreshes it. No staff scan, background request, purchase or crew-assignment change is added.

## 1.1.0 — 31 October 2026

Extension 3.0.43.244 adds a saved option to upgrade a station to its maximum level before applying its vehicle profile. Older saved profiles keep their previous behaviour until this option is enabled.

Nexus Tools → Profiles → Apply to multiple stations opens a separate bulk window. Choose a profile and dispatch centre or all centres, select individual stations or all matching stations, and review levels, missing vehicles, exact removals, naming, crew targets and total credit cost. Maximum-level upgrading defaults on in this window and can be disabled for the batch.

The existing profile engine processes one station at a time: verify the maximum-level purchase, then apply its vehicle, naming and crew plan. It retains native credit controls, shared building locks, fresh quote and fleet checks, and pending-purchase checkpoints. Unavailable maximum levels or uncertain outcomes stop without repeating a purchase. Review scans are bounded to two concurrent stations, and no automatic or recurring scan is added. Training and Auto Mode are unchanged.

Validation uses isolated browser fixtures and rendered layouts; live game purchases have not been performed for this release.

Added sources: `nexus-station-profiles-engine.js`, `nexus-profile-batch.js`, `nexus-profile-batch-worker.js`.

## 1.0.0 — 31 October 2026

Initial independent version baseline, carried forward from extension 3.0.43.240. This does not claim the feature is newly introduced.

Source: `nexus-station-profiles-store.js`, `nexus-station-profiles-core.js`, `nexus-station-profiles-ui.js`, `nexus-staging-profiles-editor.js`
