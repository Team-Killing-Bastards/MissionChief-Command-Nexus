# Nexus 3.0.43.52 — local Home Response market and station tabs

Adds a vehicle table directly beneath the building extensions card for verified Home Response locations (building type 22). It reads the game's current market response, showing category, vehicle name and native prices/purchase options. Category and name filters operate on the loaded rows. Full locations disable purchasing and keep the full market link available. Other building types do not request the market.

Native POST forms preserve fields, CSRF tokens and submitter values; supported Rails purchase links retain their exact action, currency and confirmation. Purchases require an individual click and submit through normal browser navigation. There is no automatic buying, background write request or purchase retry. A confirmed success can return to the same building with fresh crew data; errors and unconfirmed responses remain visible on the native page. Unsupported controls remain unavailable rather than guessing purchase parameters.

The helper reads only the current building's type and market, with uncached bounded reads, cancellation and a timeout. It creates no iframe, account-wide vehicle register or polling loop. It releases its rows on suspension and excludes Auto workers. Settings > Buildings & personnel has a separate Home Response purchase-table switch. Desktop and phone layouts use the existing Nexus theme.

The general **Stations** tab is removed from course personnel selection. **All**, **Home response** and each specific station type remain. Restored old Stations selections become All while retaining dispatch-centre and name filters. The .50 next-course action and .51 crew freshness fixes are retained; Auto runtime changes are version markers only.

Base: .51 `1101f0dd`, branch `codex/home-response-market-52`. LOCAL ONLY. Do not push, merge, tag or publish without a subsequent explicit request.

Validation command: `node scripts/verify-all.mjs` (seventeen stages). The new market tests use synthetic native-form and Rails-link markup, including form/currency fidelity, duplicate-click blocking, native confirmations, full capacity, rejected purchases, unsafe or unsupported controls, missing CSRF, read errors, phone layout, lifecycle release, preferences, building type gates and worker exclusion. Station tests also cover the removed tab and restored old state.

Live market HTML could not be captured because no live game browser tab was available through the browser tool. The fixtures are not a claim that the live game's current market markup or a real purchase was verified. No live vehicle was bought during development. A full-market fallback is provided for unsupported responses; live account acceptance remains pending.

Delivery: `native-navigation/build-home-market-52.mjs` creates the ZIP and ready-to-load folder under `manual-install/Nexus-Extension-3.0.43.52-LOCAL-HOME-MARKET` after all seventeen stages pass. It verifies delivered hashes and retains the already-public .45 reporting destination.
