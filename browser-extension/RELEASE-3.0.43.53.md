# Nexus 3.0.43.53 — Home Response quick buy

Repairs the empty .52 vehicle table. The reader scanned only `table tbody tr` and required currency words inside link text. The market uses `.vehicle_type` cards with `h3` vehicle names and `.buy-vehicle-btn` links, including numeric prices beside icons. The new test reproduces .52 returning no vehicles and dumping requirement notices for this structure, then checks .53 produces working purchase rows from the same response.

The panel is now a compact category / vehicle / Quick buy table. Each card gets one button using its native credit option, with the price included. Disabled credit options remain disabled; the code never silently substitutes a coin purchase. Category search, the dropdown and the unrelated warning block are removed. A small refresh control and full-market fallback remain beneath the table. Per-vehicle unavailable details are available on the disabled control's tooltip.

Names, prices, availability, action URLs, currency, method and confirmations come from the returned market page. Icon-only prices use the currency in the supplied action. The helper does not construct purchase URLs. Individual clicks delegate to the native GET or POST; native CSRF and confirmation behavior, single-submit guards, full capacity checks and success-only return behavior remain. Cross-building action paths and query parameters are rejected. Market parsing creates no iframe or periodic reads. Other building, schooling and mission features match .52; Auto changes are version markers only.

Protocol evidence inspected 12 September 2026:

- [Cleaner Vehicle Market source](https://github.com/jxn-30/LSS-Scripts/blob/master/src/cleanerVehicleMarket.user.js) documents the card, title, buy-link, disabled-link and category selectors and explicitly targets MissionChief UK.
- [Vehicle Market Show Amount source](https://github.com/jxn-30/LSS-Scripts/blob/master/src/vehicleMarketShowAmount.user.js) documents the native credit-action path and building query structure, also targeting MissionChief UK.

Only interface facts were used; the third-party scripts are neither bundled nor executed. Browser fixtures reconstruct this documented structure. No live game tab is exposed through the browser tool, so a real purchase and current account acceptance remain unverified. No account purchase was made during development.

Base: .52 `d4f6f256`; branch `codex/home-response-quick-buy-53`; LOCAL ONLY.

Validation: `node scripts/verify-quick-buy-53.mjs` runs the ten relevant stages: baseline extraction, runtime build/parity, hardening, adapted regressions, packaging, package verification, Edge smoke, existing market safeguards and the card regression. Package provenance checks that all other bundle sources remain unchanged. Unrelated settings/schooling/responsive feature suites are not repeated for this isolated reader/UI repair; `scripts/verify-all.mjs` retains all eighteen stages for a full release run. Delivery requires all ten scoped stages, and the report explicitly identifies that scope.

Use `native-navigation/build-quick-buy-53.mjs` for the local ZIP and ready-to-load folder. Do not push, merge, tag or publish without a subsequent user request.
