# Nexus 3.0.43.54 — Home Response button strip

Replaces the Home Response vehicle table with the user's requested full-width button strip beneath both building overview columns. Each purchase control displays the vehicle name, with its price underneath in smaller text. The strip wraps to additional rows on narrower screens. Category remains available in the tooltip. Refresh and the full-market link sit beside the heading to keep the panel compact.

The .53 market reader, native action/method/currency selection, confirmations, capacity checks, success return and single-submission guards are preserved. Relabelled controls keep their native names and submitted values; input submitters become visually equivalent buttons while preserving their value. Disabled vehicles show the same name/price layout. No new reads or background work are added.

Base: .53 `b6d867a0`; branch `codex/home-response-button-strip-54`; LOCAL ONLY. The user's screenshot confirms that .53 renders real market offers. It does not confirm a successful account purchase; development still uses isolated browser pages and makes no live purchases.

Validation: `node scripts/verify-button-strip-54.mjs` runs ten scoped stages, including package/source identity, runtime/parity, hardening, adapted regressions, Edge smoke and the two existing market browser suites updated for the new presentation. The browser checks include full-width placement below both columns, smaller price text below the name, wrapping at phone width and preservation of native form/submitter values. Unrelated feature UI suites are not rerun for this display-only change; the full eighteen-stage suite remains in `scripts/verify-all.mjs` for a future store release.

Delivery: `native-navigation/build-button-strip-54.mjs` creates the local ZIP and ready-to-load folder, checks all delivered hashes and retains the existing production reporting destination. Do not push, merge, tag or publish without a subsequent user request.
