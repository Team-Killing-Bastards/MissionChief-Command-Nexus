# 3.0.43.59: Auto Mode panel, alliance support and Home Response navigation

The user authorized publishing the current .59 build to Chrome and Edge on 12 September 2026. This supersedes the local-only staging notes for .56–.59. The release preserves the tested .59 application files and manifest, recorded in `reference/store-59.json`. The existing trusted-main workflow verifies one production ZIP and submits it to the existing store listings.

## Included since store version .55

- The Auto Mode Focus panel presents the current mission and run counts more compactly, with expandable temporary skips showing recorded unit shortages, mission links and retry eligibility. System diagnostics remain available in a separate disclosure.
- The Alliance missions button opens a shared-mission list with supported visibility and credit bands. Support sends one closest available Fire Officer; selected missions can be processed as a batch while the panel stays open. Native vehicle pagination, confirmation, uncertain-result recovery, queue stopping and cross-tab exclusion remain enforced. Auto Mode must be stopped before using alliance support.
- Existing support is recognised from the player's vehicles travelling to or attending missions, including non-fire units, even when a mission card still says new. Supported missions hide when the toggle is off. Confirmed dispatch reads `Sent: 1 Fire Officer`, without treating a vehicle status badge as a count.
- Home Response quick buy has a remembered Buy and next building switch. After confirmed purchase it opens the native next building in the current building frame. Cancelled, rejected and unconfirmed purchases do not advance, and opening the destination does not trigger another purchase.

## Validation and publishing

The full twenty-two-stage verification suite runs locally and in pull-request/trusted-main CI. It covers 138 hardening tests, 133 adapted regressions, package/source integrity, isolated Edge, Settings, responsive layouts, mission selection, schooling, crew refresh, Home Response purchase flows, Auto Focus and alliance support. Browser fixtures intercept game responses; these checks do not buy or dispatch real vehicles and do not establish overnight performance.

The existing permissions, listing identities, credentials, optional reporting destination and saved settings are preserved. Local installation notes are omitted from the store ZIP. Store submission, store approval and browser rollout are reported separately. Refresh open game tabs after updating to avoid mixed parent/worker versions. The canonical Tampermonkey edition and its release process are unchanged.
