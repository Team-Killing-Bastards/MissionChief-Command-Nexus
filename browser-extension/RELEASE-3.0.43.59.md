# Local .59 — Home Response buy and next building

Adds a themed switch in the Home Response quick-buy strip. It defaults off and remembers the player's choice in the browser. Off retains the existing purchase flow; on captures the game's Next building link when the player buys a vehicle and opens it once the native response confirms success. The destination stays in the current building frame, including the game's query parameters. It does not buy anything at the destination.

The existing native GET/POST actions, price, CSRF and confirmation are retained. Rejected, cancelled, expired and unconfirmed purchases do not advance. A missing, same-building or external next link disables the switch and retains normal quick buy. Pending purchase intent is consumed on the result page to prevent repeat navigation. Success on either a market response or a direct return to the current building is supported.

Based on local .58 and retains its alliance participation and single-officer label fixes. Only `nexus-home-market.js` and version markers change in the shipped payload; no Auto Mode or Alliance dispatch changes.

Validation command: `node scripts/verify-home-buy-next-59.mjs`. Twelve scoped stages cover the reference, generated runtime and protected parity, all hardening tests, adapted runtime regressions, package and hash verification, isolated Edge, new buy-next cases, both existing Home Response suites and responsive layout. The new browser fixture checks default-off, remembered preference, one GET/POST purchase, cancellation, direct-result redirects, failures, unavailable next links, expired intent, the visible building iframe and phone layout. Tests intercept game responses and do not purchase real vehicles. Unchanged alliance and schooling UI suites are not rerun.

Local testing release only. Store submission and live game acceptance remain separate.
