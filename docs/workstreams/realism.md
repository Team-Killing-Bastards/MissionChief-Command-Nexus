# Realism map

## 1.4.2 — 15 November 2026

Release .281 resolves pending building checkpoints against existing Home Response locations before classifying them as held. The previous strict new-ID/exact-name/exact-position check could fail after a lost checkpoint save, name or position changes, or an older before-list. Recovered locations are verified by type, identity/position and fleet, then saved at their actual position. Only missing vehicle/name work is quoted; no earlier building mutation is resent. Repeated reviews and pending naming can use the saved location even when the current town-plan point differs.

Town-specific uncertainty becomes a named Held row at zero cost, separate from already-completed roles. It does not invalidate unrelated reviewed towns. All-held runs cannot be started, and held towns are never counted complete. An unresolved checkpoint that appears after review holds only that town before execution. Storage/read failures remain fatal, native mutation verification remains unchanged, and no automatic retry of an uncertain purchase is added. Tests cover empty-location recovery, ambiguity/wrong roles, loss of saved confirmation, subsequent review, UI enablement/counts, and exact purchase counts. Normal fleet reads and the limit of three concurrent station checks are retained; no live game changes.

## 1.4.1 — 15 November 2026

Release .280 checks actual Home Response vehicle types before the old-position guard. An existing matching role at a verified saved station, or a matching named Home Response location within 2 km of the town centre, is excluded at zero cost. Saved IDs must still be at their recorded site; names alone cannot match distant namesakes. Other vehicle types do not count. Multiple existing matching roles are left alone rather than triggering another purchase.

The UI unticks these towns only for the current role and shows the existing station. Manual selections remain saved for OTL/AO/other runs. A fresh check before execution catches a matching role added after review. Pending vehicle/naming recovery at the same site is retained, as are unknown-outcome and native purchase checks. Fleet reads are shared within each review with concurrency capped at three; no background work or Auto Mode changes. Tests cover changed historical positions, same-town names, wrong types and distant names, role switching, zero-cost exclusions, races, and interrupted naming. No live game mutations.

## 1.4.0 — 15 November 2026

Release .279 adds multi-select council/county searches, bounded recovery for missing town-service replies and reduced work during Home Response batches. Named areas combine before spacing and retain unique town IDs. Old single-area plans and polygon plans stay compatible. Town/role coordinates remain stable across search methods.

Checkpoint storage migrates to a separate record per town/role plus a plan index. Every copied record is checked before migration readiness; the V1 record is preserved. Builder reads request only the needed keys. Read timeouts retry once; uncertain save replies use read-only reconciliation. Writes and game purchases are never automatically replayed. Invalid extension contexts receive a direct reload-page message. The reported post-Coldingham timeout identifies the next read, but does not independently prove whether the bridge or storage was responsible.

Review shares one fleet read per station and allows three concurrent read-only station checks; purchase and verification remain sequential. Completed reviewed rows are skipped without more reads. Changed identities, duplicate matches, uncertain outcomes and current price/fleet guards remain. An untracked renamed building at the expected role position blocks duplication. Isolated tests cover two-town recovery, exact mutation counts, migration/restart, multi-region persistence, source scope and speed/request counts. No live game changes.

## 1.3.0 — 15 November 2026

Release .278 adds named council/county areas and user-drawn polygons to Home Response towns. UK named regions use coordinate membership precomputed against ONS December 2025 Counties and Unitary Authorities BGC geometry (20m generalised, clipped to coastline), including polygon holes and island parts. No inference from GeoNames UK administrative labels: Horncliffe was incorrectly labelled Scottish Borders and is excluded by the boundary check. Scotland's Borders area is GB.S12000026. The 218 UK areas plus 74 GeoNames areas in Ireland and the islands give 292 named choices. 40,296 towns have confirmed area membership; 333 remain available to map/drawn searches. Named searches cover the entire chosen region independently of the visible map.

Custom outlines have 3–100 points; invalid/crossed shapes are rejected and point-in-polygon includes the edge. Filtering precedes spacing. Saved plan schema 1 gains optional area metadata; old plans retain coordinates, selected flags and stable role keys. The worker validates membership on save. Area changes invalidate review until Find saves a new list. Cancelling a redraw restores the previous list without a rescan. Map listeners, shapes, cursor and double-click state are cleaned up on Finish, Cancel, Escape and Close.

Only precomputed memberships ship, not the ONS polygons. No new permissions, geographic requests or periodic work. Region data loads on demand. Purchase and naming code, native request verification, Auto Mode and Alliance are unchanged. Verified with isolated worker/browser fixtures and real Leaflet mouse events; no live game changes.

## 1.2.0 — 15 November 2026

Release .277 names each verified Home Response vehicle with the shared Renamer formatter, then reads its native edit page to verify the result. Review shows proposed names and includes already-purchased matching vehicles that still need naming at zero purchase cost. Only selected towns and their one matching role vehicle are considered. A vehicle name changed after review requires a new review.

Purchases and naming have separate durable checkpoints. Stop after purchase leaves naming pending. A lost name-save reply is checked without resending; an explicit fresh review may retry naming only. Changed vehicle IDs, wrong edit forms, unavailable rules and failed checkpoint writes stop the action. Name-only saves do not submit staffing or other vehicle settings. Saved towns, spacing and the .276 launcher styling are retained. Auto Mode and Alliance remain unchanged; no live purchase or rename was made during implementation.

## 1.1.1 — 15 November 2026

Fixed Home Response towns launcher contrast outside the location-type grid. It is now a full-width teal button with white text, margin and a keyboard-focus outline. This is a presentation-only correction in release 3.0.43.276; saved plans and building actions are unchanged.

## 1.1.0 — 15 November 2026

Home Response towns adds a saved, per-player town plan to Realism Map. Search the visible area with minimum spacing of 5, 10 or 15 straight-line miles, preferring larger mapped settlements before rural gaps. Select individual locations or all proposed towns and villages. Changing vehicle role or dispatch centre preserves the town list. It is saved in this browser's extension storage, separately from Discord settings sync.

FO, AO, OTL and the other supported Home Response vehicles have fixed positions on a 20-metre grid within each town. Names use the town plus role code. Review reads native building and vehicle credit prices; Run creates one type-22 location and buys the selected vehicle. Existing matching roles are skipped, and an empty verified location can resume with its missing vehicle only. Specialist training and assignment remain separate game actions. An existing Home Response location is needed to read the vehicle market for the initial quote.

Every purchase is checkpointed before submission. Lost replies receive bounded read-only checks; unresolved outcomes survive closing/reloading and are not submitted again. The shared building lock prevents simultaneous Nexus building batches. Closing or Stop prevents later purchases while the current one is checked. Native prices and role availability are rechecked before purchase. No coins, automatic background scans or Auto Mode changes.

Release: 3.0.43.275. Read-only inspection confirmed the native Home Response build form and credit button; purchases and persistence were verified in isolated browser fixtures, not on a live account.

## 1.0.0 — 31 October 2026

Initial independent version baseline, carried forward from extension 3.0.43.240. This does not claim the feature is newly introduced.

Source: Logical workstream within `nexus-runtime.js`; extraction into a separate module remains future work.
