# Nexus extension changelog

Selected recent extension changes. Each linked entry is bundled with its release. The update notice shows entries newer than the version previously installed in this browser.

3.0.43.206 is a prepared release candidate; this record does not mean it has been published to a browser store.

## v3-0-43-232-empty-mission-closure

**Finish verified empty patient missions without relying on a success flash · 3.0.43.232**

The first native Cancel All Units response no longer has to contain the exact temporary “Cancel All” success message before Nexus can finish cleanup. After a successful same-route response, a separate fresh read must identify the exact mission through its native form and prove that no patients, assigned units, actual transport links, other requirements or visible errors remain. Only then may Nexus send the one remaining native cancellation. A second action is also allowed when the empty mission remains without a transport warning; an empty table alone is no longer reported as completed.

Cleanup succeeds only after a fresh exact-route read confirms the mission has gone (404) or returns the native completion page. Two cancellation attempts remain the hard limit for that mission in this game tab's session, including across worker replacement. A saved successful first response allows the last step to continue after restart, with all fresh checks repeated. A legacy .231 first-attempt record requires a fresh explicit zero count. New uncertain/failed requests and missions already sent both steps are only checked for closure; they cannot replay cancellation. Storage failures prevent an unremembered action.

The supplied .230 export proves a successful HTTP response and a fresh empty result followed by rejection of the first-response confirmation. It does not retain the response body, so the exact markup difference is unproven. Browser fixtures reproduce the old missing-flash failure and exercise successful closure, restart continuation, changed patients/units/ownership, errors, wrong mission forms and the two-step limit. The original live stuck mission has already gone; this candidate has not yet been verified closing a new live zero-patient mission.

Normal mission selection, vehicle quantities, trained-staff requirements, dispatch checks, station crew assignment and worker recovery are unchanged. No network request or timer is added to normal missions. Local candidate; no browser-store submission.

## v3-0-43-231-patient-cleanup-recovery

**Continue other missions when an empty patient mission cannot be closed · 3.0.43.231**

An unverified Cancel All Units result on a zero-patient mission now defers that mission and releases the stopped worker so other personal missions and eligible transports can continue. The handoff requires the current mission document, its matching automatic stop and a stopped Auto control; stale signals, manual Stop, active selection, transport activity and matching or unreadable dispatch claims cannot authorise recovery. The same handoff works when cleanup finishes before startup confirmation.

Before sending a native cancellation, Nexus saves a small guard in this game tab's session storage. Worker replacement, page refresh and a queue recheck cannot repeat an uncertain cancellation. Subsequent attempts only read the mission to check for closure. A verified completion or exact-route 404 clears the guard. Unresolved records do not expire into a new cancellation, are capped at 200, and a storage failure blocks the action rather than sending an unremembered request. The existing second cancellation remains available only within the original verified two-step cleanup, after explicit first-action confirmation and a fresh empty result.

Compact response evidence records HTTP status, success-flash recognition, patient-state classification and remaining-unit counts without saving response HTML. Unit quantities, alternatives, trained-crew requirements, final dispatch checks, the .229 station crew fix and .230 initial-load recovery are retained. Normal missions gain no network request or timer; the new guard lookup is a small local session read.

The supplied .230 export shows Smoke Inhalation (caused by "Hotel fire (major)") receiving HTTP 200 for Cancel All Units at 18:24:46 UTC, followed by an unverified result and a stopped inner Auto loop at 18:24:47 UTC. The outer controller retained run intent until the 18:31:43 export. It does not contain the response body, so rejection by the game versus different confirmation markup is unproven. Isolated regression tests reproduce this stop and check queue/transport continuation and cancellation guards; this is not live-game or endurance verification. Local candidate; no store submission.

## v3-0-43-230-worker-load-recovery

**Recover an initial mission page load without stopping the queue · 3.0.43.230**

The initial Worker A frame's 30-second loading deadline no longer automatically ends the whole run when its canonical mission page has not started. A proven pre-dispatch load gets one fresh worker, followed by a timed mission deferral if loading fails again. Other missions and eligible personal transport can continue. A deferred page becomes eligible after one minute, increasing to at most five minutes on repeated failures, without requiring successful mission advances. The existing low-supply pause still requires two actionable missions.

An operational mission whose frame load event was delayed is adopted in place through the normal ownership and startup path. Active selection, an issued start, selected vehicles, an unreadable or matching dispatch claim, action routes, login/cross-origin pages and transport workers cannot authorise a fresh load retry. Previous dispatch claims remain intact, obsolete callbacks cannot remove replacement workers, and manual Stop prevents recovery. No normal loading limit is increased, and healthy missions gain no additional timer, scan or request. Unit quantities, vehicle alternatives, trained personnel and final dispatch checks are unchanged. The station Assign crew fix from .229 is included.

The supplied .228 export records the initial load of Large public disturbance at 15:48:37.895 UTC followed by the fatal timeout at 15:49:08.096 UTC. It does not establish the network or browser cause of the missing load. Production-function tests reproduce the old fatal path; isolated Edge tests cover a stalled initial request, repeat failure and queue continuation, delayed load-event adoption and manual Stop. These are not live dispatch or endurance verification. No store submission.

## v3-0-43-229-station-crew

**Show verified crew progress and bound station assignment waits · 3.0.43.229**

Station Assign crew shows each binding as soon as a fresh game read verifies it. It saves the register once per checked vehicle, including a stopped partial fill, instead of holding the next person behind a full-register save after every assignment. The writer submits only the changed vehicle and verifies the committed record while preserving other vehicles and newer evidence.

Game reads, assignment responses and register waits have a 15-second deadline with a specific stage message. After an interrupted assignment response, Nexus reads the native assignment page; it never blindly repeats the binding toggle. An unverified outcome stops further assignments until the station is refreshed. Training, current bindings, capacity, station identity and status-6 exclusions remain checked. Auto Mode selection and dispatch are unchanged.

Isolated Edge tests reproduce the old zero-progress hang with a successful first binding and a never-settling register save. They verify complete and partial fills, multiple vehicles, Stop, response/body timeouts, register failures and preservation of other records. A live read of Dromore confirmed two bound trained people out of six seats; the original hanging document was not accessible, so its exact waiting step is not established. No store submission.

## v3-0-43-228-shortage-wait

**Continue sooner after a verified unit shortage · 3.0.43.228**

The final Unit Finder message “No vehicles were dispatched” now qualifies for the existing three-second recovery window when it is the current, recorded stop from the confirmed active mission document. Previously this wording fell through to the twelve-second window, including repeated shortage visits. A running control, incomplete selection, stale or detached document, mismatched stop record or existing dispatch claim prevents the shortcut. Proof is checked again during the wait; if it changes, the ordinary recovery window starts again.

One bounded fresh search, transport priority and the existing skip cooldown remain. Vehicle quantities, complete-list fallback, trained-personnel checks, alternative vehicle order and duplicate-dispatch safeguards are unchanged. Healthy missions gain no new wait, scan or request. This shortens confirmed failure handling; it does not establish that a reported shortage is genuine or guarantee a particular hourly dispatch rate.

## v3-0-43-227-auto-recovery

**Continue after dispatch reloads and recover vehicle loading · 3.0.43.227**

When a final Dispatch reloads the same mission before its delayed queue callback, the replacement document can now resume the queue handoff. It must be the confirmed active worker, fully loaded, with that mission's unexpired dispatch claim created before the document. Active selection, startup, transport, shared dispatch transitions, changed ownership and explicit Stop block the shortcut. The existing dispatch claim is retained; no Dispatch is replayed. Personal transport receives priority, otherwise the next mission opens or the existing low-queue automatic resume takes over. An actionable submitted mission keeps its existing deferral rather than being treated as a confirmed success. Same-document in-flight requests retain their existing recovery safeguards.

Vehicle-list readiness failures now have their own recovery category. After a short confirmation, one fresh mission read is allowed only before dispatch; Unit Finder and the complete unit and trained-crew checks run again normally. A repeated loading failure is deferred with a one-minute cooldown, increasing to at most five minutes for repeated failures. It becomes eligible again without requiring successful mission advances, so a queue of loading failures cannot remain locked behind its own skip counters. The panel displays the timed retry and exports retain the specific loading reason, row and page counts.

Vehicle pagination and readiness requirements, partial-list coverage proof, full-list fallback, unit counts, exact vehicle alternatives, trained occupants, seat limits and final dispatch checks are unchanged. Healthy missions gain no deliberate wait, extra scan or network request. The prior background event collector is retained. Production-function and isolated browser tests reproduce the old blocked handoff and loading classification and verify automatic continuation, no duplicate dispatch, transport priority, cooldown expiry and unchanged coverage. These fixtures do not establish live-game throughput or unattended endurance. No browser-store submission.

## v3-0-43-226-background-event-items

**Collect native event items while background missions run · 3.0.43.226**

The event-item collector now runs independently of the heavy mission runtime. Main map pages can coordinate claims from Auto Mode's mission frames even when the game tab is not foreground. This repairs the gap where the map skipped the heavy runtime while mission frames were prevented from starting its collector.

Each document checks the game's existing event-item link when it is ready, with one delayed check on mission pages for content arriving just afterwards. There is no recurring scan, vehicle-table observer or extra fleet loading. Claim requests run separately from dispatch, one at a time, with a five-second timeout, a bounded waiting queue and bounded scalar history shared by the tab's frames. No mission document or DOM node is retained by that history. Closing a worker does not hold up its claim or dispatch. Duplicate and uncertain requests are not automatically replayed.

The existing Event Scanner setting remains enabled by default. Turning it off cancels waiting work and aborts the current claim. The run export includes enabled state, requests, HTTP acknowledgements, failures and timeouts. An HTTP acknowledgement is not proof of an increase in the event score. No game or browser can guarantee continued work while a tab is suspended or the browser is closed.

The previous recurring collector is removed. Unit selection, trained-personnel coverage, transport, recovery and dispatch guards are unchanged. Local intercepted browser tests cover hidden frames, missing and late items, duplicate frames, closed workers, slow/error/redirect responses, settings changes and bounded queues. Live event-score and throughput verification remain outstanding.

## v3-0-43-225-shortage-recovery

**Prefer OSUs with HazMat alternatives, and keep shortage recovery specific to the mission · 3.0.43.225**

Two unsuccessful recovery attempts could previously suppress fresh searches for other missions with the same name and shortage category for up to a week. A temporary lack of available vehicles is not evidence that later missions cannot be covered. Historical outcomes no longer veto another mission's recovery attempt.

HazMat/CBRN requirements prefer Operational Support Units (type 39), then HazMat Units (type 7), then CBRN Vehicles (type 32), filling only the remaining demand. Arrival time orders vehicles within each type. Existing single-type saved mappings for this capability cannot suppress its alternatives. A specifically named CBRN Vehicle requirement accepts OSUs and CBRN Vehicles, without assuming a HazMat-only vehicle is eligible.

HazMat rows stay separate from shared OSU rows: specialist alternatives do not count as Welfare or breathing-apparatus support. OSUs selected for either row can still cover their shared capabilities, avoiding redundant OSU selection.

The existing one-attempt record for each mission, transport priority, completed crew-search proof, trained-personnel checks, full coverage and duplicate-dispatch protection remain. There is no new polling, timer or network scan. The supplied .224 export identifies repeated HazMat/CBRN and armed-crew shortfalls, but does not retain enough candidate evidence to establish why the first selection failed. The reported manual successes used OSUs, so the new specialist fallback alone does not explain that discrepancy. Live resolution remains to be verified.

## v3-0-43-224-police-alternative-order

**ATC, then ARV, then Police Car for the combined vehicle requirement · 3.0.43.224**

For “Police Cars or Armed Response Vehicles (ARVs)”, Nexus now fills the requested total using Armed Traffic Cars (type 25) first, Armed Response Vehicles (type 13) next, and ordinary Police Cars (type 8) last. Arrival time still determines the order within each type. Partial fleets combine to meet the same total: for three required vehicles, two available ATCs and one ARV are enough; if no armed vehicles are available, three Police Cars can cover this vehicle requirement.

Exact type IDs drive both selection and selected-vehicle counts. Older single-type saved mappings for this combined wording cannot suppress its alternatives. Disabled or quarantined vehicles are excluded, existing selections are counted, and a pool smaller than the requirement remains a shortfall. Other saved rules and plain Police Car, Traffic Car and armed-personnel requirements are unchanged.

Separate trained-personnel coverage, per-person qualifications, seat limits, staffing blocks and duplicate-dispatch protections remain required. This change does not let ordinary Police Cars satisfy an armed-personnel requirement. The update adds no polling, network scans or background timers.

## v3-0-43-223-crew-check-throughput

**Reuse verified crews and avoid repeating completed shortage searches · 3.0.43.223**

Auto Mode reuses complete, account-scoped live crew evidence across mission loads within the existing ten-minute freshness limit. New checks save only changed vehicle records in one database commit per scan instead of saving the entire register after every six reads. Request concurrency stays at six, failed or incomplete reads remain unverified, and each request has an eight-second deadline. Parsed assignment documents are released after their scalar crew data is extracted.

The existing full-list final search remains. If it finishes with complete crew evidence and still cannot cover a trained-personnel requirement, the same stopped worker can use that result instead of reloading and repeating the mission once more. Changed requirements, vehicle availability or selection, register changes, unfinished loading, stale proof and a different worker document invalidate that shortcut. Uncertain reads and other resource shortages retain the existing recovery path. The temporary skip cooldown and transport priority remain.

The final unit and staffing coverage calculations, exact compatible vehicle types, per-person qualification combinations, seat limits and duplicate-dispatch protections are preserved. No nominal or untrained seat substitutes for qualified personnel. Local production-function and isolated Edge fixtures verify cold scans, fresh reuse, changed assignments, failed reads, database errors, account isolation and shortage recovery. These checks do not establish live sustained throughput; the target remains below twenty seconds per recorded dispatch, without sacrificing coverage. No browser-store submission.

## v3-0-43-222-idle-dispatch-handoff

**Move past idle restored dispatches sooner · 3.0.43.222**

A mission can reload with its previous dispatch claim still active. Auto Mode correctly avoids sending again, but the controller previously waited for its generic two-minute no-progress deadline before deferring that mission. It can now use the existing deferral after ten seconds of unchanged, confirmed inactivity in a later document. The claim must predate that document, the current worker must own the mission, and selection, register startup, queue navigation and transport must be inactive. Missing or unreadable evidence keeps the established recovery checks.

The same-document dispatch path is unchanged: an in-flight request cannot use this shortcut. The final dispatch claim is preserved, no Dispatch click is replayed, and the existing retry cooldown is retained. Vehicle coverage, trained personnel, transport, startup readiness and ordinary selection deadlines are unchanged. The proof is sampled by the existing watchdog, with no extra timer, network request or persistent write; retained evidence contains only controller-owned scalar values.

The supplied .221 run recorded 29 dispatches in 10m54s: about 160/hour, or 22.6 seconds per recorded dispatch. Two restored aircraft missions occupied about 4m32s combined before dispatch-claim deferral. The target is below 20 seconds on average (more than 180 dispatches/hour), ideally around 18 seconds / 200 per hour. The export does not prove server acceptance or complete mission coverage, and not all of that occupancy is removable waiting. Production-function and isolated Edge tests reproduce the old delay and verify the shorter guarded deferral. Sustained live throughput remains to be measured. No store submission.

## v3-0-43-221-auto-start-readiness

**Acknowledge register readiness when Auto Mode starts · 3.0.43.221**

Auto Mode now acknowledges its asynchronous start, including the wait for the local personnel register. The controller allows that acknowledged wait up to a bounded deadline instead of issuing a second toggle after 2.5 seconds and stopping after another 2.5 seconds. Repeated requests share a single start. A ready register adds no deliberate delay. Managed workers receive a directed start request; the native button remains available for manual use.

Stop, worker removal, suspension, changed mission or lost ownership prevents a late register response from restarting selection. Register errors and a 30-second readiness timeout are reported explicitly; the controller also bounds a nonresponsive acknowledged start. Missing or invalid acknowledgements retain the existing bounded start checks. Exports retain startup phase and error after the worker is removed. Vehicle selection, coverage verification, transport handling and duplicate-dispatch claims are unchanged.

The supplied .220 export recorded 566 dispatches over 3 hours 51 minutes (about 147 per hour), then a startup confirmation failure after a full-page recycle on Investigate Flare. Its enabled Start control was present and there was no memory-pressure stop. That export did not capture register readiness or the start handler error, so it does not prove the underlying trigger. Production-function tests reproduce the old timeout and two pending continuations when readiness is delayed; the candidate fixes that demonstrated race. Installed long-run behavior still requires verification. No store submission.

## v3-0-43-220-auto-throughput

**Reduce unnecessary Auto Mode vehicle loading and repeat selection · 3.0.43.220**

Fresh missions with ordinary patients can now stop loading vehicle pages once the available pool covers the mission requirements, ambulances and configured Ambulance Officer / Mass Casualty Equipment support. The ambulance proof respects the existing per-mission limit, while support thresholds still use uncapped patient demand. The normal Unit Finder, final coverage checks and full-list fallback remain in place. Live patient alerts, attended missions, trained-personnel requirements and uncertain coverage retain the complete-list path. Diagnostics now identify which condition required that path.

The Auto Mode supervisor and loop check the existing dispatch claim before starting selection again on the same submitted mission. They leave the claim, native navigation, transport handling and controller recovery intact. This removes repeated loading and selection during a pending handoff without sending another dispatch.

The supplied .219 run recorded seven dispatches in 344 seconds, about 73 per hour, with 38 extra vehicle pages and approximately 147 seconds in vehicle loading. Deterministic regressions reproduce the old mixed-patient full-load path and supervisor restart, and verify the new coverage and claim guards. These are local fixture results, not proof of 150 dispatches per hour in the live game. Toolkit's share of the main-thread workload is not established by that export. No new permissions, extension identity, scanning or polling; no store submission.

## v3-0-43-219-background-control-startup

**Make Auto Mode controls ready without a screen repaint · 3.0.43.219**

Opening a mission centres and reveals its Nexus control panel synchronously. Previously, the panel and its Auto Mode button stayed hidden until two animation callbacks ran. Browsers can suspend those callbacks in an inactive tab, leaving the controller active but unable to find its control until the game tab becomes visible again. Startup no longer depends on those callbacks. Real hidden, disabled, disconnected and missing controls are still rejected; dispatch ownership and duplicate-dispatch checks are unchanged.

The held-animation regression reproduces the old blocked control and verifies the new control is immediately available at desktop and small-screen sizes. This fixes a confirmed code dependency, not every source of background slowdown: Edge can still throttle timers or put inactive tabs to sleep. Long-running background behavior in the user's installed game remains to be verified. The optional .218 diagnostic switch and bounded export are retained.

## v3-0-43-218-optional-startup-diagnostics

**Optional local startup diagnostic capture · 3.0.43.218**

Nexus Tools → Settings → Diagnostics adds Diagnostic capture, off by default. Save applies it while a run is active. Enable it before reproducing an Auto Mode startup error, then export Auto Mode diagnostics before Retry or refresh. Turn it off afterwards. Existing bounded evidence remains in this game tab's export until the page is refreshed; this per-browser capture setting is excluded from cloud settings sync.

The additional startupDiagnostics section stores at most 200 scalar snapshots at lifecycle changes, before a clean retry, before an error and before worker removal. It records the Auto Mode button's actual presence, bounded labels, disabled/connected state, computed display/visibility/opacity, hidden ancestors, panel presence, worker generation/document serial, ownership, document visibility and the panel reveal callback stages. A mounted but hidden control can therefore be distinguished from a missing or disabled control and a different mission document. Records exclude credentials, full DOM, URL queries and network bodies; they are not uploaded.

Disabled capture returns before DOM/style inspection or snapshot construction. Enabled collection is event-driven, deduplicated and bounded, with no extra polling, capture timers or storage writes. Disabling removes capture-only lifecycle and visibility listeners. Two cheap configuration listeners remain to apply settings changes. Worker-removal evidence is copied into parent-owned scalar history before the worker is disposed; no worker Document, Window, frame or element references are retained in that history.

This is diagnostic instrumentation, not a claim that the reported .205 hidden-panel mechanism caused the user's failure or that a live-game startup defect is fixed. Dispatch decisions, qualification checks, ownership, duplicate-dispatch latches, cancellation logic and discovery timeouts are unchanged from .217. Validation uses isolated Edge fixtures for Settings, toggling, disabled overhead, retention, held/released original reveal callbacks, hidden/missing/disabled/wrong-mission controls, real worker-removal code and the existing full-runtime diagnostic export. Native window-state checks are recorded with their actual observed document visibility rather than assuming minimisation makes it hidden. No store submission.

## v3-0-43-217-verified-empty-transport-cleanup

**Complete empty transport missions and find CRV in rules · 3.0.43.217**

An attended native test of personal UTI #263753131 confirmed the reported two-action behaviour: with zero total patients, no assigned units and no actual transport links or other demands, the first Cancel All Units returned a native Cancel All success flash but left Transport is needed. Its total-patient counter disappeared. A second native Cancel All completed the mission, returning the exact positive completion page and changing its personal mission card to mission_deleted. This is native-game evidence; the installed .217 Auto Mode path remains unverified.

The cleanup now permits at most two native Cancel All actions. The second requires an explicitly confirmed first response and a fresh empty result with zero assigned units and only a stale transport banner. Real patients, hidden patient cards, transport links, other requirements, unrelated errors, changed mission, lost ownership or a manual stop prevent the second action. An uncertain request is never retried. If the stale warning still remains after two actions, Auto stops for inspection. Native completion pages and exact-route 404s are recognised on a fresh mission read; HTTP success and zero assigned units alone are not reported as mission closure. Diagnostics record both attempt numbers and the verified outcome.

Raw native HTML can initialise its patient counter through an inline script. Detached response parsing now reads only the literal total and untreated numbers, bound to the current mission form and mission ID, without executing scripts. Rendered totals take priority. Known native Cancel All and successful-dispatch flashes no longer block cleanup; unknown visible warnings still do. The user's zero-patient stale-transport rule now applies to verified personal emergency missions, while the existing real-transport Worker B handoff remains limited to its known patient mission cases. The surplus-ambulance toggle is independent.

Requirement rules can find type 57 Coastguard Rescue Vehicle using CRV, CRVs, its full name or its type ID. The dropdown shows the CRV alias. Existing CRV type matching and custom-rule precedence are preserved. Live inspection of the nearby South Queensferry vessel-aground mission #263757356 found a game-level conflict: its own requirements page requires one CRV while also listing Restricted Vehicle Types: Ocean, and its native list contains only boats and coastguard helicopters. Free Granton type-57 CRVs were absent and the native CRV AAO was unavailable. This release does not claim to fix that native restriction or manufacture unavailable vehicle rows. The earlier Canterbury range diagnosis applied to a different mission.

Validation uses intercepted Edge fixtures for the observed native two-action sequence, raw counters, success flashes, changing patients/units/requirements, unconfirmed responses and the hard two-action limit. CRV checks exercise the production requirement reader, native type selection, final coverage gate and the actual rules page search/save. Existing startup, Any vehicle, queue, memory, vehicle claims and Alliance checks are retained. No new permissions, extension identity or scans. No store submission.

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
