# Nexus 3.0.43.48 — local course list filters

Adds **Course type** and **Course name** filters above the native schooling lists. The controls filter both Courses with participants and Open Courses together. Types come directly from course labels, for example Rescue or Fire Station, and name search is case-insensitive. Clear filters resets both Nexus controls; the game's independent search remains in effect. Matching and total row counts are shown for each list.

The isolated module `extension/nexus-course-list-filters.js` runs only on `/schoolings` and `/schoolings/`, in visible full pages or native iframes. The two table IDs and course-label format were checked against the local LSS reference `src/modules/schoolingOverview/assets/getSchoolings.ts`. The implementation keeps the original table rows, sorting and course links. It performs no requests and never selects staff or submits enrolment. Enter in the name field applies filtering without submitting a surrounding form.

Observers are scoped to the two course tables. They handle inserted, removed and renamed courses, sorting and native search visibility changes. They ignore countdown updates and their own visibility changes. Filtering is debounced, with no periodic scanner; page suspension disconnects observers, releases row references and restores native visibility. An active type remains selected if its final course disappears, avoiding a sudden display of unrelated courses.

The Settings switch is **Schooling → Course type and name filters**. Refresh after changing it. Controls wrap for phone screens and compensate for phone desktop-site scaling.

This builds on local .47 (`ab760072`), retaining its dispatch-centre/station filters on personnel selection and .46's manual missing-vehicle buttons. Auto runtime changes are version markers only; the existing regression verifies the .45 runtime plus the .46 manual bridge. **Local only: do not push, merge, tag or publish .48 without a subsequent explicit request.**

Validation: `node scripts/verify-all.mjs`, thirteen stages. `audit/course-list-filters-48.json` covers combined filters, uncategorised and hyphenated names, empty results, native search/sorting/link preservation, course updates, countdown inactivity, no extra requests, cleanup, settings, iframe routes and mobile layouts. Desktop and phone screenshots are in the same audit directory. Browser tests use an isolated Edge profile, the extension and mocked network; live game and physical Orion acceptance remain pending.

Delivery: run `native-navigation/build-course-list-filters-48.mjs` from the workspace root after all thirteen stages pass. It creates the ZIP and extracted folder at `manual-install/Nexus-Extension-3.0.43.48-LOCAL-COURSE-FILTERS`, verifies all delivered file hashes and preserves the .45 production reporting destination. It does not access credentials or publish.
