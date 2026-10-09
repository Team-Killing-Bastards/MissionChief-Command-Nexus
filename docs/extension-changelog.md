# Nexus extension changelog

Selected recent extension changes. Each linked entry is bundled with its release. The update notice shows entries newer than the version previously installed in this browser.

3.0.43.206 is a prepared release candidate; this record does not mean it has been published to a browser store.

## v3-0-43-216-native-cancel-all-patient-cleanup

**Use the game's Cancel All Units action for empty medical missions · 3.0.43.216**

Fixes the missing mission-level action in .215. The user confirmed that pressing native Cancel All Units removes the reported medical missions even when they have no assigned units. The old cleanup returned individual vehicles and, with an empty unit list, advanced without sending any cancellation. The correction reads a fresh zero-patient mission and sends its exact native Cancel All Units link once, including when the assigned-unit count is zero. It uses the normal HTML request path and checks the mission again afterwards. Individual vehicle cancellation links are retained only as evidence that any assigned rows belong to cancellable own units; they are no longer called by this cleanup.

Scope remains personal UTI, Multiple Seizures and Smoke Inhalation missions, independent of the surplus-ambulance toggle. Explicit zero total patients, no patient cards (including hidden cards), no actual transport links, no other requirements and no unrelated visible warnings are required immediately before the action. Unknown/foreign units, missing or mismatched native Cancel All links, real patients, changed mission, lost execution ownership or manual stop block the request. Failed or uncertain cancellation is not retried automatically. Real transport requests still use the existing Worker B handoff.

Missing ownership capture now refreshes the existing read-only native evidence. If it still lacks an owner record, the exact native personal emergency card and mission link can provide positive ownership evidence, with a known current player. An explicit foreign owner, alliance event or planned mission vetoes that fallback. Ownership failures are recorded as blocked cleanup rather than being silent. Submitted and verified actions are logged separately. A fresh response with no assigned units confirms unit release; only an exact mission-route 404 is reported as the mission becoming unavailable. A successful HTTP response or an empty unit list is not reported as proof of mission closure.

Eighty-six intercepted Edge and controller checks reproduce .215 advancing without cancellation, then test native Cancel All with zero and two assigned units, stale transport banners, native ownership capture recovery and personal-list fallback. Patient/requirement safety, redirect and HTTP failures, uncertain outcomes, duplicate protection and Worker B handoff are retained. Startup-handoff, Any vehicle, queue priority, bounded memory, vehicle claims and Alliance safeguards are checked separately. No new permissions, extension identity or automatic scans. The .216 installed live Auto Mode path remains unverified; the user's manual result confirms which native action is needed. No store submission.

## v3-0-43-215-zero-patient-transport-cleanup

**Release units when a medical transport warning has no patients · 3.0.43.215**

Corrects .214 treating a leftover Transport is needed banner as an actual patient transport request before checking the total patient count. A live Multiple Seizures mission showed 0 Patient, no patient cards or transport links, and two ambulances on scene. Its prison-loading error was a hidden native placeholder, which the old check also read as active. Zero total patients now take priority when no actual patients, transport links, visible unrelated warnings or requirement rows remain. Hidden alert placeholders and hidden ancestors are excluded consistently from both active and freshly fetched documents; hidden patient cards still prevent cancellation.

For the existing UTI, Multiple Seizures and Smoke Inhalation cleanup scope, every cancellation still requires verified personal ownership, current execution ownership and a fresh zero-patient response. Only native assigned-vehicle cancellation links are used, with fresh reads between releases and afterwards. A real patient, real transport link, missing vehicles/personnel, an unknown warning, mission switch, manual stop or uncertain response prevents further cancellations. This is independent of the surplus-ambulance setting. If the game removes its patient counter after the last unit is released, a final read with no assigned units, cards, transport links or other demands verifies the release and allows advancing; that exception never authorises a first or additional cancellation.

An attended live check used MissionChief's native Cancel All Units action on Multiple Seizures #263665884 and verified that both assigned ambulances were removed. The game still showed its transport warning and kept the mission available. Unit release is verified; automatic game-side mission closure is not promised. The .215 extension was tested separately in intercepted fixtures and is not yet verified installed in the live browser.

Sixty isolated patient-tail checks reproduce .214's wrong branch with the observed markup, then verify zero-patient cleanup, counter removal after release, real transport preservation, hidden placeholders, visible error blocks, ownership and race safeguards. The twenty startup-handoff checks and previous Any vehicle, personal queue, memory and Alliance safeguards are retained. Compact initial/final patient evidence is included in cleanup diagnostics. No new permissions, extension identity, automatic scans or store submission.

## v3-0-43-214-startup-transport-handoff

**Handle an immediate transport stop during Auto Mode startup · 3.0.43.214**

The .213 patient-tail check can stop Multiple Seizures immediately while transport remains pending, before the controller observes a running Auto Mode button. The supplied live export shows that automatic stop followed by two start attempts and the misleading “V2 Auto Mode did not confirm that it started” error. This was a regression in .213's early-stop integration.

The worker supplies a document-local handoff signal. Before retrying startup, the controller accepts only the current worker document and mission, the specific patient-transport-pending signal created after the current start attempt, and its matching fresh automatic stop record. It then invokes the existing guarded recovery and Worker B handoff. Without a live radio request the one-advance deferral remains. Patient transport context can use this verified path; prisoner contexts, manual stops, stale records and unrelated failures cannot. Genuine unconfirmed startups retain their bounded retry and error behaviour.

Twenty controller checks reproduce the .213 failure and exercise the actual recovery path and rejection cases. Forty-one intercepted Edge patient-tail checks also exercise the signal creation. Existing ambulance coverage, cleanup, memory, priority and Alliance safeguards are retained. No live dispatch, transport or cancellation was performed; install .214 and verify the next game run before treating the runtime fix as confirmed.

## v3-0-43-213-patient-tail-recovery

**Keep patient transports separate from shortages and release verified empty medical missions · 3.0.43.213**

The .212 export shows UTI, Multiple Seizures and secondary Smoke Inhalation missions stopped with zero selected vehicles while their native warning still says “Transport is needed!”. These are not evidence of zero remaining patients. Transport-only medical missions now stop before unnecessary vehicle-list loading and hand live personal radio requests to the existing guarded Worker B path. If no live request is available, they are rechecked after one mission advance instead of the ordinary 20-advance zero-selection delay. Existing units stay assigned while transport remains pending. This does not guarantee that MissionChief accepts a transport request or supplies an available destination.

For these named patient-only missions, Auto Mode can return assigned units independently of the surplus-ambulance toggle, but only with confirmed personal ownership, an explicit zero total patient count, no patient cards or transport links, and no remaining native alerts or requirement rows. A fresh mission response is required before releasing a unit, between releases and afterwards. Only cancellation links supplied by the current native mission vehicle rows are used. Mission changes, missing/unknown evidence, new patients, foreign or unusable links, network failures and uncertain outcomes stop further releases. An exact-route 404 allows moving on without another cancellation; it is recorded as a mission no longer available, not a confirmed reward or completion. The next mission opens without recording another dispatch. A document may attempt cleanup only once.

Forty-one isolated checks cover patient-count distinctions, reported transport-only names, native cancellation and fresh verification, duplicate prevention, ownership, manual stop and mission-switch races, changed patients, failed or uncertain releases, disappearance after the last unit, and the actual controller handoff to Worker B. The .212 Any vehicle correction, personal priority, memory cleanup and Alliance Auto safeguards are retained. All test traffic is intercepted. Live MissionChief completion and transport acceptance remain unverified until the installed candidate is tested.

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
