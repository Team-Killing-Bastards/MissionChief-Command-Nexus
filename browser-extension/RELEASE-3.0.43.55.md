# Local 3.0.43.55: training filter cleanup

**Store promotion authorized on 12 September 2026.** The cumulative release and verification scope are described in [STORE-3.0.43.55.md](STORE-3.0.43.55.md). The local-only statements below record the earlier staging state and are superseded by that request.

The training personnel screen showed native dispatch-centre, building-type and station-search filters above the Nexus replacements. Once Nexus has mounted and loaded building metadata, these duplicate controls are hidden. Course start/publication choices, prices, personnel inputs and enrolment actions stay in place.

The cleanup recognises station filter labels shown in the user's screenshot and scopes them to the area before the personnel accordion. It does not remove form data or invoke any native controls. Originals remain available if the initial metadata read fails or the Schooling > Course personnel filters setting is disabled. Suspension removes the added hiding classes. The existing observer handles later filter insertion without polling or additional requests.

## Verification and scope

Run `node scripts/verify-training-cleanup-55.mjs`. Its twelve scoped stages cover runtime/package provenance, existing hardening/adapted regressions, Edge smoke and the four schooling UI suites: personnel filters, station types, next-course navigation and course dropdowns. The personnel fixture includes the screenshot's native labels and checks hiding, later insertion, unchanged course-start/price submission, API-error fallback and settings-off restoration. It also exercises selected staff, mobile layout and native course iframes.

The full eighteen-stage suite remains available in `scripts/verify-all.mjs`; unrelated UI suites are not rerun for this cleanup. The .54 Home Response strip is preserved by source hashes. Tests run in isolated browser fixtures; no live training submission was performed and the browser inventory had no live game tab.

Build the local deliverable with `native-navigation/build-training-cleanup-55.mjs` from the outer workspace. Local only: no push, merge, tag or store publication.
