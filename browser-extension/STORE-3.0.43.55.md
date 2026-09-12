# 3.0.43.55: mission selection, schooling and Home Response improvements

The user authorized publishing the current tested build to both stores on 12 September 2026. This supersedes the local-only staging notes for versions .46 through .55. The release promotes the same feature files and manifest as the local .55 package; `reference/store-55.json` records their hashes. The existing main-branch workflow builds and verifies one production ZIP and submits it to the existing Edge and Chrome listings.

## Included since store version .45

- Missing-vehicle requirement boxes select the remaining suitable loaded units with one manual click. Existing matching rules, coverage checks and shortage indicators apply; selection does not dispatch.
- Schooling lists have course-type and dependent active-course-name dropdowns. The specialist crew panel links to matching courses. Personnel selection has dispatch-centre, station-name and specific station-type filters, with Home Response separated and the duplicate general Stations tab removed.
- Educate uses the Nexus theme. Educate + select again submits once and, after confirmed success, opens the next advertised session of the same course, preferring ten free places. Errors and unconfirmed results remain visible. Selected personnel stay visible through filter changes.
- Native training filters hide once their Nexus replacements are ready. Course-start, pricing and enrolment controls remain intact; failed initial metadata reads retain the native filters.
- Station personnel requirements and assigned-crew controls refresh after vehicle-list and binding changes, using scoped uncached reads. Incomplete data is shown as partial.
- Home Response buildings show a full-width strip of individual quick-buy buttons below the crew and extensions panels. Each button shows the unit name and a smaller price beneath. Native price, capacity, currency, confirmation and purchase actions are preserved.

## Validation and delivery

The full eighteen-stage local verification suite is required for promotion and runs again in pull-request and trusted-main CI. It covers 128 hardening tests, 133 adapted regressions, source/ZIP provenance, unpacked Edge smoke, settings, phone/desktop-site layout, mission selection, schooling, crew refresh and Home Response purchases in isolated fixtures. Actual purchases or enrolments are not performed against a user account by these checks.

The existing optional reporting destination and stored settings are retained. No permission, credential, backend or listing-identity change is included. Publication receipts distinguish submission from store approval and browser rollout. Open game tabs should be fully refreshed after updating to avoid mixed parent/worker versions.

Earlier `RELEASE-3.0.43.*.md` files document their development snapshots; this file describes the cumulative release. Review the GitHub release receipts for current submission state.
