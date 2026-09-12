# Nexus 3.0.43.56 — local Auto Mode Focus panel

The player approved design A with an expandable Temporary skips list for local testing. The map controller now has one mission area, three session totals and a Start/Stop control. Minimise keeps the actions accessible. System diagnostics are collapsed. The existing Nexus launcher and all dispatch, worker, recovery and transport actions retain their handlers.

Temporary skips has a separate disclosure. It shows each mission, specific unit/personnel shortages when present in recorded evidence, the recorded reason and retry eligibility in **mission advances**, not seconds. Mission names link to the native mission view. Legacy or generic failures explicitly say that no specific unit details were recorded; the UI does not infer an unavailable vehicle or manufacture selection counts.

The skip boundary captures up to eight bounded issue strings from evidence already collected, before the old 420-character summary truncation. It adds no network calls, fleet scans, polling or timers. Closed disclosures release their list nodes; unchanged open records retain their nodes. Records keep the existing 80-entry history bound and advance-based expiry.

The panel fits narrow screens using the existing responsive viewport variables, including compensation for desktop-site mode on a phone. Long lists scroll inside the panel and retain access to the primary control. Physical iPhone/Orion testing and live game acceptance remain for the player.

## Verification

Run `node scripts/verify-auto-focus-56.mjs` from `browser-extension`. This covers reference/runtime identity, parity, all hardening tests, adapted regressions, package provenance, isolated packaged Edge smoke, settings integration, responsive UI and the Focus panel scenarios. Results are written to `audit/auto-focus-verification-summary.json` and `audit/auto-focus-56.json`. The full store verification runner also includes the Focus test.

An AST digest compares every executable runtime section outside the reviewed presentation/skip-record functions against .55. The manual-selection bridge retains a byte identity check. New behavior tests cover bounded shortage extraction, legacy records, expiry, escaped mission/reason text, action handlers and narrow-screen controls.

## Local scope

Base: .55 promotion commit `458ef16ef682e287513937d1f7f4df815502eaaa`, whose source matches the .55 store submission. Deliver with `native-navigation/build-auto-focus-56.mjs` after verification. Keep existing settings, rules and the established reporting destination. This version is for local testing only; do not submit, merge or publish without a later release request.
