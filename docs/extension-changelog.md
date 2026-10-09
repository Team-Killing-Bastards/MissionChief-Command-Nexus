# Nexus extension changelog

Selected recent extension changes. Each linked entry is bundled with its release. The update notice shows entries newer than the version previously installed in this browser.

3.0.43.206 is a prepared release candidate; this record does not mean it has been published to a browser store.

## v3-0-43-212-any-vehicle-ambulance

**Dispatch the ambulance selected for Any vehicle · 3.0.43.212**

The native warning “Missing Vehicles: Any vehicle” does not include a number. The generic shortage parser previously required a number, so the known medical fallback could select one ambulance while the final ready-state check still treated the warning as unresolved. The latest .211 export shows repeated one-vehicle selections followed by resource-shortage stops for Slurred Speech and Ineffective Breathing. An intercepted browser fixture reproduces the same .211 failure.

The exact unnumbered Any vehicle wording, including supported singular/plural and Required variants, now produces a one-vehicle requirement. Selection and final coverage use the existing exact normal Ambulance type 5 matcher. An explicit current native Any vehicle warning is retained when Toolkit's live table omits it, together with companion numbered native demands, so an ambulance cannot satisfy a mixed shortage on its own. Duplicate sources collapse through the existing requirement reader. Unknown unnumbered vehicle warnings remain blocking.

Twenty isolated browser checks exercise the packaged parser, full Mission Update reader, vehicle matcher and final ready-state check. They reproduce .211's failure, verify one normal ambulance, exclude RRV/HEMS-only selections and disabled candidates, cover an empty Toolkit live table and numbered Any vehicle counts, and preserve staffing/unknown-warning blocks and companion fire requirements. No live account dispatch was performed; live confirmation remains necessary after installing this candidate. Personal queue priority, memory/ownership cleanup and Alliance Auto safeguards are preserved.

## v3-0-43-211-choose-upgrades-first

**Choose upgrades before selecting stations · 3.0.43.211**

Building upgrades now supports choosing the requested work before a full station scan. Filter by dispatch centre, building type or name, then use Load upgrade choices to read one example per matching building type. These dropdowns include owned and blocked options as scan intentions; the example does not establish availability or price at other stations. Choose extensions, specialisations or a target level, then click Scan and select needed.

The scan uses manually checked buildings, or all filtered matches if none are checked. Each station is read separately. Stations with eligible requested work are selected; work already built or under construction and options with unmet game prerequisites are excluded, with reasons beside each row. A station needing only some of the requested choices remains selected for those eligible choices. A station whose read fails remains selected for attention and prevents a purchase until resolved or explicitly deselected. No scan or selection action spends credits.

Changing requested bulk work requires another scan before review when automatic selection is in use. Re-scanning retains the original scope so previously excluded stations can be reconsidered. Editing a station checkbox starts a new manual scope. Review re-reads the selected stations and preserves individual row overrides, the editable credit budget, native price checks and durable no-resend checkpoints. No live game purchases or store publication were performed for this candidate.

## v3-0-43-210-upgrade-response-verification

**Verify purchases before interpreting page warnings · 3.0.43.210**

A station page returned after a successful purchase also contains the inactive Building Complex tab. Its standing max-level prerequisite warnings were incorrectly treated as a rejection of the requested specialisation, stopping the batch even though construction had started. Live read-only inspection of Bangor confirmed Foam Specialization construction at level zero; Check uncertain result verified the existing purchase without sending it again.

After a successful HTTP response, Building upgrades now reads the station afresh and verifies the requested level or construction before interpreting page warnings. A verified result is recorded and the batch continues. When the result cannot be verified, only general purchase warnings and warnings relevant to the requested action are considered; standing Building Complex and unrelated-tab warnings are excluded. Genuine failures and unverified results still pause without automatic retry.

Regression fixtures reproduce the hidden Building Complex warnings on successful specialisation, level and extension responses, including a batch with rising specialisation prices. They also cover a genuine purchase failure and a response with no new construction, preserving the no-resend checkpoint path and the .209 credit budget. No new real purchases or store publication were performed for this candidate.

## v3-0-43-209-specialisation-pricing

**Continue specialisation batches as game prices rise · 3.0.43.209**

Building upgrades no longer stops after the first specialisation solely because the game's next specialisation price has increased. Each selected specialisation is re-read before purchase and uses its currently offered credit price, provided it remains available at the reviewed native route and fits inside the run's maximum credit budget. Level and extension prices must still match their review.

Review distinguishes the current quoted total from the maximum allowed spend. It suggests the quoted total plus a 50% allowance on the specialisation subtotal only. The allowance is editable before Run and is a spending limit, not a forecast of the game's pricing formula. Unused allowance is not spent. A budget below the quoted total cannot start a run. Every action checks the remaining allowance before saving its purchase checkpoint; reaching the limit stops before another purchase.

The checkpoint records the latest offered price used for each verified purchase. Completed upgrades remain verified if a later price reaches the limit. Review refreshes the remaining choices, excluding construction already started, so a new run can continue with a revised limit. Price-limit and availability stops require a new review. Uncertain purchases still pause the batch and are never resent automatically.

The pricing regressions use intercepted browser fixtures with account-wide specialisation price increases, an exceeded budget, an edited budget, unavailable options, decreasing prices and unconfirmed results. They preserve the .208 scan/review tests and existing Auto Mode/Alliance Auto behaviour. No real game purchases or store publication were performed for this candidate.

## v3-0-43-208-building-upgrades-fix

**Fix building upgrade scans and bulk review · 3.0.43.208**

Corrects the native expansion-link interpretation that blocked scans at new level-zero stations and stations above level one. The game binds its credit link to the target level minus one; it is not the number of levels to add. The planner reads and validates the actual offered link and price.

A failed level quote no longer hides that building's extensions or specialisations. A failed station read is shown beside the affected building, while the remaining selected buildings continue loading. Reading again or clicking Review retries failed reads. Existing row choices and bulk checkbox selections survive refreshes. Review now reads the selected buildings and applies the selected bulk choices automatically, so the extra Apply button is optional. Individual row changes override bulk choices until that bulk control is changed again.

The reviewed credit total and purchase button appear above the table, alongside scan progress and actionable failures. Unavailable bulk choices are listed with building-specific reasons and excluded from the total. An unread selected building blocks the purchase button until it is read successfully or deselected. A missing level quote blocks a requested maximum-level upgrade while leaving independently verified extension and specialisation options usable.

Native controls were inspected read-only in the Fife Fire area. Intercepted browser tests cover new stations, level three, maximum level 24, mixed batches, retries and selection retention; no real account purchases were made for this fix. Credit-only purchases, fresh preflight checks, durable checkpoints and no automatic retry on an uncertain result remain in place. This candidate has not been published to a browser store.

## v3-0-43-207-building-upgrades

**Review and run building upgrades · 3.0.43.207**

Nexus Tools > Buildings includes an on-demand Building upgrades planner. Filter by dispatch centre (including all centres or unassigned buildings) and building type, search names or IDs, and select individual buildings or all filtered matches. Read native game pages to show the current level, maximum currently available level and exact price of each target level. Choose extensions and specialisations in checkbox dropdowns, individually or in bulk, and review the total credit cost before running.

The planner uses only the game's offered credit actions; disabled prerequisites and existing construction are shown but cannot be purchased again. It starts construction and does not complete it instantly or switch an existing specialisation. MissionChief permits one active specialisation per building. Changes in price or availability stop the run for a new review. A durable checkpoint precedes each purchase; an uncertain result stops the batch and can be checked without resending. Closing Tools stops after the in-flight result has been checked and releases its loaded lists. Building deletion and upgrades share a per-origin browser lock.

Source and browser fixtures are verified separately from real account spending. This candidate has not been submitted to a browser store.

## v3-0-43-206-alliance-auto

**Alliance Auto alongside personal Auto Mode · 3.0.43.206**

An optional background queue sends one chosen support unit per eligible shared mission without waiting for your personal backlog. Enable it in Nexus Tools > Settings > Alliance support; it starts off. Uses the Alliance missions vehicle and value filters, keeps confirmed support history, and pauses on an unconfirmed dispatch.

## v3-0-43-206-upgrade-priority

**Return to missions with missing requirements first · 3.0.43.206**

Personal Auto Mode handles transport requests, then missions with missing requirements, then fresh missions. Missing-requirement missions use older mission IDs first. Changed requirements release an old shortage skip; an unchanged shortage retains its retry cooldown.

## v3-0-43-206-closed-frame-memory

**Release closed mission frames · 3.0.43.206**

Mission ownership records are created in the top window and released when their mission frame closes. Queued reporting data is copied into the top window, so it does not retain a closed mission frame.

## v3-0-43-205-update-notes

**See what changed after an update · 3.0.43.205**

A one-time update notice shows the changes since your previous version. Reopen recent notes in Nexus Tools → Overview. Each change links to its GitHub entry.

## v3-0-43-204-automatic-station-checks

**Automatic station checks across all services · 3.0.43.204**

Checks up to 30 staffed stations or vehicle bases per minute, with a shared allowance across game tabs. Older unchecked stations are prioritised; slow responses can reduce the rate.

## v3-0-43-203-check-a-station

**Check an individual station · 3.0.43.203**

The profile-menu Check a station button accepts an exact station name or ID when you want a fresh check of one location.

## v3-0-43-202-fresh-station-evidence

**Use fresh station evidence between tabs · 3.0.43.202**

Inventory exports reload saved station evidence before syncing, so an older tab does not keep sending its stale cached copy.

## v3-0-43-201-sar-requirements

**Read the complete SAR vehicle requirement · 3.0.43.201**

Mission Update and Auto Mode recognise “Operational Support Vans, Trailers or Personal SAR Vehicles”, prefer Operational Support Vans by default, and can use eligible alternatives.

## v3-0-43-200-multi-pc-sign-in

**Discord sign-in on multiple PCs · 3.0.43.200**

Packaged releases keep a stable extension ID, allowing the configured Nexus account service to recognise sign-in from another PC. Use the same Discord account for your saved profile.

## v3-0-43-192-account-sync

**Personnel register and account sync · 3.0.43.192**

Optional Discord sign-in connects supported settings, saved profiles and personnel-register records across browsers. MissionChief player profiles remain separate, and the local register remains available offline.

## Maintaining future releases

Add a versioned entry to the packaged `nexus-update-notes-data.mjs` and this document together. Keep existing anchors stable. Entries use numeric four-part version comparison; skipped releases are included. The extension reads bundled text, never remote executable code. The seen-version key is local to each installation and is deliberately excluded from account sync.
