# Nexus extension changelog

Selected recent extension changes. Each linked entry is bundled with its release. The update notice shows entries newer than the version previously installed in this browser.

3.0.43.206 is a prepared release candidate; this record does not mean it has been published to a browser store.

## v3-0-43-281-home-response-build-recovery

**Recover existing Home Response locations and keep other towns buildable · Realism 1.4.2 · 3.0.43.281**

An unresolved earlier building attempt no longer cancels the entire review and disables Build for every town. Review identifies the affected town, marks it Held and leaves it out of the price and completion count. Other reviewed towns can proceed. A fresh review checks held towns again; all-held reviews keep Build disabled and clearly report why. Storage, connection and other global failures still stop the review rather than being reported as successful checks.

Before holding a pending build, Nexus looks for the existing Home Response location. It can reuse a unique exact match, a new location at the recorded position whose name changed, or a suitably named location in the same town whose position differs. It verifies that the location is empty or has the selected vehicle type, saves its current identity and quotes only remaining vehicle/naming work. A matching existing location is reusable even if it appears in an older before-list. Multiple plausible empty locations and wrong-role fleets remain held; no earlier building request is replayed. Saved positions remain usable on subsequent reviews and when finishing interrupted naming.

Existing matching roles remain unticked, FO/AO/OTL remain separate, and held towns retain their manual selection for later rechecking. Review preserves the three-check concurrency limit and shared fleet reads. Tests cover lost checkpoint confirmation after a successful building purchase, changed names/positions, repeated review, missing and ambiguous locations, batch continuation, UI counts and purchase/name recovery. No live account changes, new permissions, Auto Mode changes or store submission.

## v3-0-43-280-home-response-existing-towns

**Untick towns with an existing matching Home Response vehicle · Realism 1.4.1 · 3.0.43.280**

Review now verifies existing vehicles before rejecting an earlier saved position. If a Home Response location associated with the same town already has the chosen vehicle type, that town is unticked for this role, quoted at zero cost and skipped without a new purchase or rename. A saved station ID at its recorded position provides the town association; otherwise a matching town or generated role name must be within 2 km of the town centre. Actual vehicle type is checked, so an FO does not exclude OTL or AO. Unrelated names, distant namesakes and other building types do not count.

Automatic exclusions are separate from the saved manual town selections. Changing vehicle type restores those selections for a fresh review; named regions and drawn boundaries use the same check. A matching vehicle appearing after review is checked before purchase and skipped. All-matching reviews disable Build. Historical checkpoints are retained, and interrupted purchases/naming at the same verified site keep their recovery checks. New purchases still receive the shared Renamer name. An earlier position without a verified matching vehicle remains held for review.

Review reuses each station fleet within its scan and retains at most three concurrent station checks. There are no new background scans, permissions, geographic data changes, Auto Mode or Alliance changes. Tests use isolated game responses; no live purchases, installation or store submission were made.

## v3-0-43-279-home-response-recovery-multiple-areas

**Faster Home Response review, safe reconnect and multiple areas · Realism 1.4.0 · 3.0.43.279**

Named councils/counties now support searchable checkboxes for several areas in one run. The combined search uses shared spacing and unique towns; saved selections survive reopening. Single-region and drawn-area plans remain usable. The same town and role retain the same identity and position regardless of search method: existing matching FO locations are recognised, while OTL can be added beside them. Completed reviewed rows are skipped by Build. A renamed, untracked Home Response location at the same position is held for review instead of creating a duplicate.

A lost town-state read is retried once automatically. If a progress-save reply is lost, Nexus reads back the saved checkpoint before continuing, without resending the write. Unverified saves stop before further purchases. A reloaded/disabled extension now produces a specific page-reload message rather than waiting for the generic timeout. No game purchase retry was added.

Town progress now saves one record at a time after a verified migration of existing history. Review reads each existing fleet once and checks at most three stations concurrently; purchases remain sequential with current game checks and readback verification. A 12-station isolated comparison reduced fleet reads from 24 to 12 and history reads from 13 to one. Tests cover dropped replies between towns, lost save acknowledgements, exactly one building/vehicle/name per town, repeat-run skips, legacy migration and partial failure, multiple regions and map drawing. Auto Mode, Alliance, geographic data and shared vehicle naming rules are unchanged. No live purchases or store submission were made.

## v3-0-43-278-home-response-areas

**Choose Home Response regions and draw boundaries · Realism 1.3.0 · 3.0.43.278**

Home Response towns now offers three search areas: the visible map rectangle, a named council/county, or a boundary drawn by clicking points on the map. UK named regions search the whole chosen area using town coordinates checked against ONS December 2025 council/county boundaries (20m generalised, coastline-clipped). These memberships are precomputed in the package. Incorrect GeoNames region labels cannot admit UK towns across the boundary; the Scottish Borders check specifically excludes Horncliffe as well as Dumfries, Ayr, Carlisle and Berwick-upon-Tweed. Ireland and island regions use the existing GeoNames administrative records. Towns without confirmed region membership remain available through map/drawn searches.

Custom boundaries include only town centres inside the drawn shape, with Undo, Finish, Cancel and Escape controls. Crossed or invalid outlines cannot be used. Area filtering happens before population preference and 5/10/15-mile spacing, so a large town outside the chosen area cannot displace an eligible town inside it. The area and exact selected towns are saved together for later FO, AO, OTL and other roles. Panning and role changes do not rescan. Changing area invalidates the old review and requires Find towns before building; cancelling a redraw restores the previous selection. Older saved plans and purchase checkpoints remain usable.

No recurring background work, geographic requests or new extension permissions. Tests cover actual Scottish Borders inclusions/exclusions, concave/invalid outlines, storage and bridge persistence, real Leaflet mouse clicks, cleanup on close/cancel, and the existing purchase/naming safeguards. Auto Mode, Alliance, vehicle naming and purchase execution remain unchanged. No live game purchases, installation or store submission were performed.

## v3-0-43-277-home-response-vehicle-names

**Automatically name Home Response vehicles · Realism 1.2.0 · Namer 1.3.4 · 3.0.43.277**

After verifying a Home Response vehicle purchase, Nexus now names the vehicle using the same icons, codes, base-name cleanup and numbering as the Renamer. The two tools share one formatter. Matching Home Response role suffixes are not duplicated: `KIRKCALDY-FO` produces `🧑‍🚒 KIRKCALDY-FO-1`. Existing codes and icons are retained, with explicit General Practitioner and Community Midwife rules added for those Home Response choices.

Review shows the proposed names. Existing matching vehicles in selected towns can be named without buying replacements, with zero purchase cost. Already-correct names are left alone, and a vehicle or name changed after review requires another review. The name save sends only caption and native save metadata, preserving personnel settings.

Verified purchases remain recorded separately from naming. Interrupted runs can finish naming their existing vehicle. An uncertain naming save is read back without resending; a fresh review can retry naming only. Stop still verifies the current request before preventing later actions. Tests cover all supported roles, existing Renamer compatibility, wrong forms, changed names, storage failures, stop/resume and lost responses. The Home Response button visibility fix, saved towns and spacing remain; Auto Mode and Alliance are unchanged. No live purchases or renames were performed.

## v3-0-43-276-home-response-button

**Visible Home Response launcher · Realism 1.1.1 · 3.0.43.276**

The Home Response towns button now spans the Realism Map panel beneath the location types, with a teal background, white bold text, spacing and a visible keyboard-focus outline. Its previous style applied only inside the location-type grid, leaving this button with a pale default background and unreadable inherited text. Town selections, spacing, purchases, Auto Mode and Alliance behaviour are unchanged.

## v3-0-43-275-home-response-towns

**Saved Home Response town plans · Realism 1.1.0 · 3.0.43.275**

Realism Map now has a Home Response towns panel. Choose 5, 10 or 15 miles of minimum straight-line spacing, find settlements in the visible map area, and tick the towns and villages you want. Larger mapped settlements are preferred before filling rural gaps. The plan is saved for the signed-in game player in this browser. Switching from Fire Officer to Ambulance Officer, OTL or another supported Home Response role keeps the selected towns. Find towns explicitly replaces the saved list; panning does not.

Related roles use fixed nearby positions on a 20-metre grid, with readable town-and-role names. Choose a dispatch centre for each run, review the building plus vehicle credit total, then build. Home Response locations are created empty by the game, so Nexus verifies the new location before purchasing its selected vehicle. Already-completed matching roles cost nothing; verified empty locations can resume with only the missing vehicle. An existing Home Response location is required to read initial vehicle-market prices. Buying the vehicle does not train or assign specialist personnel.

Purchases use native credit controls and saved checkpoints. Failed saves prevent submission; lost responses are checked without resending. Unknown outcomes remain held across reloads, and another review can recognise a subsequently verified result. Stop and close prevent later actions after the current request is checked. Tests cover saved selection, actual mile spacing, co-location, role-specific duplicates, missing vehicles, concurrent building tools, storage errors, price increases and lost responses. No live purchases were made. Auto Mode, Alliance, the personnel register and the existing real-life site builder remain unchanged.

## v3-0-43-274-building-upgrades-and-all-cells

**Simpler mass upgrades and all remaining prison cells · Buildings 1.3.0 · 3.0.43.274**

Building upgrades now has three stages: choose stations, choose upgrades, then review and run. Review combines the previous scan, apply and review actions, selects eligible stations and excludes already-completed or unavailable upgrades. Individual station selections and overrides remain in an optional expandable section. Extension-only reviews no longer fetch the station level market, and each eligible station is scanned once per review.

Additional cell has an **All remaining cells** option, with **One additional cell** available instead. The review uses the native Prison cell `Owned x / maximum` counter and existing construction timers, includes every remaining purchase in the cost, and follows the next native credit link after each verified cell. It does not guess extension IDs or spend coins. Construction and queue times still apply. Unknown capacity, changed prices or changed prerequisites require another review.

Uncertain purchases now hold only the affected station. The record survives later batches, so a previous ambulance-station level attempt cannot block unrelated police-cell upgrades. Fresh read-only checks can release a hold when the target level or construction is confirmed. Every purchase is checkpointed before submission; a lost response receives at most two verification reads without resending the purchase. Unconfirmed costs remain reserved within that run's credit budget. Failed checkpoint writes stop submissions. Stop and closing the panel prevent later actions while the current submission is verified.

Read-only live inspection confirmed THORNHILL-AS1 remained level 0 after its unresolved level-19 attempt, and NEWTOWNHAMILTON-PS1 exposed two queued cells followed by a new Additional cell purchase link. These observations do not establish why the earlier level request failed. Isolated browser tests cover native cell queues, budget limits, old and new uncertain outcomes, lost responses, locks and stop/disposal. No live purchases were made for this release. Auto Mode, Alliance, staffing, hospital/cell sharing and their permissions are unchanged.

## v3-0-43-273-cell-sharing-verification

**Recognise shared police cells and finish their selected tax · Buildings 1.2.1 · 3.0.43.273**

Fixed a false batch stop after enabling police-cell sharing. The game changes the cell control from “Share the cell with your alliance” to “Do not share the cell with the alliance”. The .272 check accepted only “your alliance”, so sharing could succeed but verification failed before the chosen tax was applied. The parser now recognises both exact variants while retaining the native action, ownership and tax checks.

When Share + tax is selected, a fresh review of an already-shared cell continues to the chosen tax without toggling sharing again. A facility is reported complete only after its requested changes are verified. Already matching facilities are skipped normally. Unknown labels include the game’s control text in the error so future variations can be diagnosed. No new requests, retries or background work were added; Auto Mode and Alliance Auto are unchanged.

CARDENDEN-PS1 was inspected read-only and confirmed shared with Free tax after the reported stop. Its exact native controls reproduce the .272 failure and pass in .273; intercepted browser tests verify the full share-and-tax and partial-run recovery paths. No live account settings were changed during this fix.

## v3-0-43-272-hospital-cell-sharing

**Bulk hospital and police-cell sharing and tax · Buildings 1.2.0 · 3.0.43.272**

Nexus Tools → Buildings now includes Hospitals & police cells. Load owned facilities, filter by dispatch centre, facility type, name or current sharing state, and select individual facilities or all matching results across pages. Choose alliance sharing On, Off or Leave unchanged and tax Free (0%) through 50% in 10% steps. Review shows the proposed changes and excludes facilities already matching or without usable native controls. Police stations with no built cells are excluded.

Sharing and tax are applied sequentially using the game's freshly offered controls. Tax-only updates leave unshared facilities out; choose sharing On to share a facility and set its tax together. Each change is read back from the building before being reported as verified. An uncertain toggle is never automatically repeated. Stop or closing Tools finishes verification of an already submitted action, then prevents subsequent changes. The batch uses the existing building-operation lock.

The panel has no background scans and renders at most 100 rows at a time. Hospital and unshared police/custody controls were inspected read-only; mutation, failure and full Tools integration tests use intercepted fixtures, not live account changes. Shared-cell tax uses the same validated native-link pattern and remains subject to the controls actually offered by the game. Auto Mode, Alliance Auto, dispatch safeguards, crew selection, register and sync are retained from .271.

## v3-0-43-271-loading-dispatch-handoff

**Confirm completed vehicle pages and protect dispatch handoffs · Auto Mode 1.0.9 · 3.0.43.271**

A native final vehicle page containing no additional rows can now finish when its exact request returned successfully, the list is stable, and no loading or further-page control remains. A completed response whose DOM update was delayed gets one bounded final settle check without another request. Unchanged controls, failed responses and unverified rows still cannot pass. Vehicle quantities, trained-personnel selection, partial-list fallback and final dispatch checks are unchanged.

Successful guarded Auto Mode clicks now notify the owned controller immediately, so a status message lost during navigation cannot leave the dispatch watchdog unarmed. A parsed, owned replacement mission may hand off its inherited claim without waiting for unrelated page resources. Existing claims, pending navigation, transport ownership, Stop and the no-repeat recovery path remain protected. Recovery never submits another dispatch.

This is a local candidate. Fixture and isolated-browser tests are recorded with the package; consistent live sub-20-second dispatch has not been established. Normal fast loads gain no extra requests or deliberate waits. Includes .270 station staffing controls.

## v3-0-43-270-building-staffing

**Station staffing targets and automatic hiring · Buildings 1.1.0 · 3.0.43.270**

Nexus Tools → Buildings now includes Staffing targets & automatic hiring. Load the list, filter by dispatch centre, service or individual station type, and select one or all matching stations. Optional filters find zero targets, stations below target, or automatic hiring switched off. Set a desired personnel target, choose automatic hiring On or Off, or leave either setting unchanged. Review shows the exact changes, stations already matching and unavailable settings before Apply.

Targets use the game's dedicated target-only form, preserving station names, dispatch-centre assignments and other settings. Automatic hiring uses the native recruitment controls exposed by the station or dispatch centre. It follows the game's Premium availability and recruitment schedule; it does not buy recruits or spend coins. Turning automatic hiring off leaves any timed campaign alone. Enabling hiring requires a positive effective target.

Reads and changes run sequentially with request timeouts. A dispatch-centre hiring list is read once per operation, including its native pagination, and only 100 station rows are rendered at a time. Opening the section performs no scan; loading the list reads one building snapshot. Each requested change is checked again before submission and verified afterwards. Stop or closing Tools prevents later changes while allowing an already submitted action to be verified. Uncertain results stop the batch without repeating the action.

Native target and hiring controls were inspected read-only in MissionChief. Isolated browser tests cover save verification, existing matching settings, Premium/control unavailability, pagination, changed settings, partial results, failed requests, stop behavior and a 3,009-station account. No live staffing changes were performed. Auto Mode, Alliance, Training, personnel-register and sync logic are retained from .269; no new permissions or VPS update are required.

## v3-0-43-269-transport-fairness-loading

**Share time between mission dispatch and transport · Auto Mode 1.0.8 / Transports 1.0.1 · 3.0.43.269**

Worker B now handles at most two consecutive personal transport requests, or yields after the current request when its batch has used eight seconds, if enough actionable missions are waiting. Existing per-request completion, timeout and retry verification remain in charge; the batch limit does not interrupt a destination submission. Worker A receives a protected turn until a native mission advance or classified skip. Reopening its page does not consume that turn. Unrelated newly arriving transports cannot immediately replace it. Exact transports belonging to the current mission can still be handled, and B continues draining requests while the mission queue is below its existing minimum.

For current live mission requirements with patient demand or an unquantified live table, Auto Mode can pass a stable loaded vehicle pool to the existing Unit Finder before loading the entire fleet. This is a selection attempt, not permission to dispatch. An incomplete vehicle or trained-personnel selection retains the full-list retry, followed by the unchanged final dispatch checks. Fresh-mission coverage proofs, requirement quantities, crew authority, dispatch claims and native transport actions are unchanged.

The reported .267 run had an 11-minute 23-second gap between normal dispatches, with 27 B starts and seven reopens of the waiting Leaf vacuum mission. A simulated persistent transport queue reproduces the old starvation and confirms all 30 requests receive turns with no repeated worker start. Across 972 focused checks, existing transport-start, cleanup, loading, coverage and fallback cases pass. The covered live-update fixture avoids five additional pages, reducing simulated loading from 20 seconds to 0.5 seconds. This is not a live throughput measurement: full-list searches, incomplete crew evidence and server delays can still take longer than 20 seconds.

Includes .268's untrained-staff Training default. No VPS update or new permissions are required. No live game actions were performed by the tests; source and package remain local until separately published.

## v3-0-43-268-training-untrained-default

**Select untrained staff by default · Training 1.3.1 · 3.0.43.268**

With Use already trained unticked, Training now selects only staff with no completed qualifications. Previously it preferred fewer qualifications but could fill places with already-trained people. The full station roster and course personnel list are both checked, so a qualification in another service cannot be mistaken for no training.

If too few untrained staff are available, the review shows the shortfall; it does not fill the remaining places with trained people. Manual choices follow the same eligibility rule, and staff who gain another qualification after review are rejected at the existing pre-enrolment recheck. Unknown training records, staff already on courses, unavailable people and away/mission crews remain excluded.

Use already trained remains an explicit choice for people with the selected starting qualification. Top up continues to count existing qualified staff and confirmed trainees toward the target. Station filters, all suitable owned academies and the .267 transport-start recovery fix are retained. No extra staff scan or background work is added.

148 isolated Training checks passed, including exact enrolment IDs, other-service qualifications, insufficient untrained staff, changed qualifications before submission and the existing filter/verification cases. No live course was started. Source and package remain local until separately published.

## v3-0-43-267-transport-start-recovery

**Recover an early transport stop with prisoner controls · Auto Mode 1.0.7 · 3.0.43.267**

Fixes the .266 startup hard stop where the worker acknowledged pending transport but the controller saw prisoner controls. The early-stop check accepted patient observations only, ignored the deliberate handoff and exhausted its Start retries. Patient and prisoner observations now use the existing recovery path when a fresh current-document signal matches the recorded automatic stop.

Recovery requires a connected matching mission worker, stopped control and no same-mission or unreadable dispatch claim. Active selection, post-dispatch protection and an active transport worker still block the handoff. A live personal radio request goes to Worker B; otherwise the mission receives the existing one-advance deferral and the queue continues. No dispatch, cancellation, relaxed staffing check or normal-path delay is added.

Includes .266 Training station filters. 372 focused source/browser and existing patient-cleanup checks passed, reproducing the .266 failure and verifying recovery without extra dispatch or cancellation. All traffic in browser tests was intercepted. Source/package are local; no live game run, GitHub publication or store submission is implied.

## v3-0-43-266-training-station-types

**Filter Training by station type or service · Training 1.3.0 · 3.0.43.266**

Nexus Tools → Training adds a Station type dropdown beside Dispatch centre. Select All medical stations, All fire stations, All police stations, All coastal & rescue stations, or an individual station type. Medical includes standard/small ambulance stations, HART bases, home response locations, medical helicopter stations, hospitals, urgent treatment centres and GP surgeries. Building types come from the loaded inventory; station names are not used to infer service.

The list, Select all matching and trained-count reads combine the chosen type with dispatch centre, course admission and station-name search. Changing dispatch centre or station type clears previous station/manual staff selections and the reviewed plan, cancels the old count queue and uses cached counts where available. A clear empty state explains when the filters and course have no matching stations.

Training still scans all owned suitable academies, including those outside the selected dispatch centre. Existing per-person availability, qualification, mission-status, top-up, checkpoint, verification and no-replay checks are retained. There is no new background scan, permission or VPS requirement.

The existing 67 Training checks and 49 filter checks passed using simulated game responses, including filtered enrolment IDs, cancelled count queues and desktop/mobile layouts. Auto Mode, Alliance, crew authority and register/sync behaviour remain unchanged. This is a local package; no live training, GitHub publication or store submission is implied.

## v3-0-43-265-replace-cloud-register

**Replace the cloud personnel register from this PC · Personnel Register 1.2.0 / Discord & sync 1.1.0 · 3.0.43.265**

Nexus Tools → Personnel Register adds a separate Replace cloud register action. Review the Discord account, MissionChief player, local count and cloud count, then confirm. It uses the entire saved local register across dispatch centres, removes cloud-only vehicle records and preserves original crew verification dates. Settings and saved profiles are excluded.

Replacement is atomic on the account service and read back before Nexus reports it verified. A saved operation receipt lets Review / check replacement recover a lost upload response without automatically sending another replacement. Changed local data or cloud revision requires a fresh review. Failed transactions keep the prior data.

A register generation prevents older copies from repopulating deleted cloud records. Other browsers receive the whole replacement when Nexus is idle and sync runs, preserving genuinely concurrent newer crew evidence. Use .265 or newer on all receiving PCs. Older clients are refused sync for a replaced player profile until upgraded. The matching VPS account-service update is required; existing profiles that have not been replaced retain normal sync compatibility.

No new polling, Auto Mode selection, crew-authority or dispatch behaviour is added. Isolated server, browser, account-message and installer checks passed, including 6,000 vehicle records, cloud-only removal, unchanged settings/profiles, account isolation, lost response recovery and rollback. Source and packages are local; the VPS and browser stores have not been updated.

## v3-0-43-264-register-scan-work

**Reduce repeated work during full register scans · Personnel Register 1.1.5 · 3.0.43.264**

Manual register scans commit only changed vehicle records, in groups of at most 100, instead of merging and rereading the whole register after each station. Pending updates survive failed commits; newer records, deletion markers and account isolation retain the existing database checks.

A bounded fleet precheck avoids buildings with neither owned vehicles nor saved vehicle records. Previously saved stations still receive native checks before obsolete records are removed. Invalid or failed prechecks fall back to all selected buildings. Full verify retains exact assignment-page checks; Quick refresh retains its strict evidence reuse rules. Read concurrency, pacing, server backoff, pause and cancellation are unchanged.

The register shows elapsed time, read count and avoided empty buildings, updates vehicle progress during a station, and supports the database's 30,000-record loaded-register limit. Includes the .263 bulk-profile, .262 Auto Mode and .261 HART naming fixes. Isolated browser/database checks passed; no live account scan or game changes were performed.

## v3-0-43-263-profile-vehicle-status

**Continue bulk profiles through normal vehicle movements · Profiles 1.2.3 · 3.0.43.263**

Bulk station-profile approval no longer treats a vehicle's status, mission assignment or target changing as a change to the owned fleet. The review still fixes vehicle identities/types, the selected profile and crew targets, purchase quantities, level target and offer capacities. Current credit-price changes retain the .259 behaviour. Away vehicles count as owned, so dispatching them does not cause replacement purchases.

Only vehicles listed for removal in the original review remain eligible for removal. A listed vehicle that departs is left alone; an unlisted vehicle returning cannot be added to the removal list automatically. This restriction is applied when the station worker starts and again under the mutation lock. Existing per-vehicle availability checks still run immediately before deletion, naming and crew work.

Genuine review differences now identify the field: added/removed vehicle IDs or changed types, profile/crew targets, station level, required vehicle quantities, or vehicle offers/capacities. Single-station quick buy retains its strict state and price checks. No requests, polling or automatic purchases are added.

Isolated browser checks reproduce the old status-only rejection and verify exact purchase counts, no changes to away units, unchanged removal consent across both reviews, actual fleet changes, price changes, cancellation, locks and uncertain-outcome protection. No live station changes were made. Includes the .262 Auto Mode correction and .261 HART renamer fix.

## v3-0-43-262-restored-dispatch-handoff

**Resume an idle replacement document after dispatch · Auto Mode 1.0.6 · 3.0.43.262**

Corrects a missed condition in .260: a replacement mission document with an inherited dispatch guard deliberately has an idle selection loop, so it cannot meet the running-loop confirmation required by the new fast handoff. That left ordinary dispatch reloads waiting for the older progress watchdog. The controller now uses its existing read-only active-owner and inherited-claim proof at this boundary. It requires the complete current replacement document, rejects in-flight claims, pending work and stops, and moves on without releasing the guard or sending twice.

These recovered handoffs now count toward queue advances and reach the existing safe memory-recycle boundary. A single saved last-claim key suppresses repeated immediate counting. Dispatch totals and mission completion are not incremented by the handoff. Shortage cooldowns advance as work proceeds, and actual unit/personnel requirements remain unchanged.

Duplicate-send deferrals are explained separately from unit shortages, including retained entries from earlier versions. The normal startup status `Auto Mode restored after mission load` is no longer presented as the reason for a failed selection. An uncertain submitted mission retains a later fresh-check path. Includes the .261 HART renamer fix.

The regression uses actual startup confirmation and loop-state functions rather than assuming the replacement worker is confirmed. Browser fixtures verify one native submission and one next-mission load with an idle inherited claim. Scope checks retain quantity, trained-staff, vehicle-loading and native dispatch gates. Live sustained throughput remains to be verified.

## v3-0-43-261-hart-station-naming

**Recognise HART bases in Renamer · Namer 1.3.3 · 3.0.43.261**

HART bases (building type 25) now use an explicit station-naming rule instead of being skipped as unsupported. They appear under the Ambulance service and a separate HART station-type option. Names use the existing verified town/village, uppercase `-HART` suffix and sequence, for example `TOOME-HART1`. Existing numbering and names already matching the generated result retain their normal treatment.

The existing nearest-place fallback, preview, fresh station pre-check, sequential processing and native save verification remain in place. No naming requests run until Renamer is used. Auto Mode, Alliance, crew assignment and profile purchases retain the .260 implementation. Live game renames have not been performed for this release.

## v3-0-43-260-dispatch-handoff-shortages

**Continue ordinary dispatch handoffs and space repeated shortages · Auto Mode 1.0.5 · 3.0.43.260**

When native Dispatch returns to the same mission, the controller now recognises an idle, completed replacement document for ordinary dispatches as well as final-queue dispatches. It checks the active owner and unchanged claim, respects pending selection, crew validation, transport and navigation, and moves on without another dispatch click. The existing duplicate-dispatch latch remains intact. A still-actionable mission stays eligible for a later fresh check rather than being marked complete.

Repeated identical, specifically recorded resource, personnel and Coastguard shortages now use 20, then 40, then at most 80 mission advances before another attempt. A ten-minute deadline prevents an otherwise quiet queue from keeping them deferred indefinitely. Changed shortage quantities or live missing requirements reset the spacing; a changed upgrade requirement releases the skip immediately, including after a controller recycle. Ambiguous failures, loading errors, transports, cleanup reviews and dispatch claims retain their separate policies.

Unit selection, required quantities, trained-personnel verification, final dispatch gates and native submission logic are unchanged. No extra background requests or polling timers are added. Includes the .259 bulk profile credit-price fix and .258 personnel/Alliance performance improvements. Local tests reproduce the old ten-second ordinary-handoff wait, verify one native submission across a real browser reload, and exercise 5,000 bounded shortage events. Live sustained throughput below 20 seconds per dispatch remains to be measured.

## v3-0-43-259-profile-credit-prices

**Continue bulk station profiles when credit prices change · Profiles 1.2.2 · 3.0.43.259**

Apply profiles to stations now treats the reviewed credit total as an estimate. A credit-price change alone no longer stops the batch or requires another review. Nexus reads the current native credit offer before each purchase, reports changed prices and records the verified purchase costs, including changes between successive vehicle purchases.

The selected profile, vehicle quantities, exact removals and level targets remain checked. Changed fleets or upgrade targets still require review; unreadable prices, unavailable purchases and unverified outcomes keep their existing protections. This applies to the bulk profile window; single-station profile and quick-buy price limits retain their previous behaviour.

Includes the .258 Auto Mode and Alliance improvements unchanged. Validation uses isolated browser fixtures; no live station purchases were made.

## v3-0-43-258-long-run-dispatch

**Reduce repeated work during long Auto Mode and Alliance runs · 3.0.43.258**

Saving a small set of verified crew records now reads only the affected vehicles and updates the local register after the database commits. It keeps newer records, deletion markers, player separation and cross-tab refreshes. Full register replacement and cloud reconciliation retain their existing paths.

Alliance vehicle loading reuses its list signature while the mission document is unchanged. Changes to rows, availability or loading controls trigger a fresh check, and the observer is removed on success, cancellation or failure. Alliance still searches the complete list and applies its existing closest-vehicle selection and dispatch checks.

Bounded performance records separate crew-page reading, parsing and saving, and show Alliance scan reuse. This release targets repeated work with large registers and vehicle lists; a sustained live run is still required to measure its effect on the late-run slowdown.

## v3-0-43-257-first-vehicle-page

**Check the initial vehicle list before paging · Auto Mode 1.0.3 · 3.0.43.257**

On a fresh mission with available vehicles, Auto Mode gives the existing requirements read up to two seconds to finish before the first extra vehicle request. A ready definition is checked immediately. If it arrives in time and the initial vehicles cover the demand, Unit Finder verifies those vehicles for dispatch. If the definition is delayed or coverage is insufficient, paging continues.

When a live shortage table appears before its quantities, Auto Mode rechecks the quantified shortages as pages arrive. Live patient and trained-personnel checks, stable vehicle rows, final selection and the full-search fallback remain in use. Exports record the initial wait and distinguish an unquantified table from a failed partial selection.

## v3-0-43-256-automode-watcher

**Reduce repeated Auto Mode checks on large missions · 3.0.43.256**

While a mission is open, Auto Mode reads its map card directly for assistance checks. It rules out healthy mission pages before searching for removed missions and watches new or edited text for airfield requirements. Routine diagnostic snapshots are sampled every two seconds. Export, stop and recovery still capture the worker immediately. Transport detection skips ordinary fleet links and keeps checking patient and prisoner destinations.

An already settled, growing vehicle list can pass its final check when the tab runs that callback late. The hard deadline, unit and crew checks and dispatch protections still apply. Performance counters now show how much time Auto Mode spends checking the worker.

## v3-0-43-255-vehicle-loading-and-crew-checks

**Large vehicle lists and trained-crew checks · 3.0.43.255**

If more selectable vehicles have appeared at the page deadline, Auto Mode allows one additional 1.2-second settling window on that request. The native page must finish and the rows must stabilise. A stalled request with no new rows keeps its original timeout.

Crew verification now consults the register for the qualifications still missing, checking scarce matches first. Complete exact assignment checks from the past ten minutes can supply the evidence directly. Older records guide live reads. If a suggested crew fails verification, the search continues. Auto Mode counts each selected vehicle once and checks assigned personnel, individual qualifications and seats before dispatch.

## v3-0-43-254-register-course-names

**Readable course and unit names in the register · Personnel 1.1.3 · 3.0.43.254**

All 42 catalogued qualifications have English labels in the saved overview. During an exact vehicle check, progress and failure messages identify the vehicle by callsign and type, including Operational Support Unit, Coastguard Rescue Vehicle and Rescue Pump with Compressed Air Foam.

## v3-0-43-253-register-qualification-display

**Show saved qualifications after Full Verify · Personnel 1.1.2 · 3.0.43.253**

Fixed a blank qualification overview when the station personnel reader was unavailable in the game tab. Opening the Personnel Register and selecting a dispatch centre now displays the saved training totals using a course catalogue bundled with the screen.

## v3-0-43-252-register-training-overview

**See registered crew by qualification · Personnel 1.1.1 · 3.0.43.252**

The Personnel Register shows how many assigned crew hold each qualification in the selected dispatch area. The overview reads saved, verified vehicle records and counts a crew member once per qualification. Changing area updates the totals immediately.

## v3-0-43-251-personnel-register-tab

**Build and refresh the personnel register on one screen · Personnel 1.1.0 · 3.0.43.251**

The Personnel Register tab sits beside Renamer in Nexus Tools. Choose a dispatch centre and use Build register, Quick refresh or Full verify. The tab shows saved vehicles, the last update, progress and results together, with pause, resume, stop and backup controls. It uses your existing register, and the all-centres option reads stations directly from the game’s building inventory.

## v3-0-43-250-tools-only-renamer

**Open the naming panel in Nexus Tools · Namer 1.3.2 · 3.0.43.250**

The dispatch-centre station overview now opens on its own, both as a separate page and inside the game. To rename stations or vehicles, open **Nexus Tools → Renamer**. Nexus creates the controls inside that tab when you open it.

## v3-0-43-249-station-renamer-load

**Reduce station-naming load after Start · Namer 1.3.1 · 3.0.43.249**

Station naming now pre-checks the selected stations once, prepares name sequences in small chunks and reuses checked building coordinates. It no longer rebuilds the entire visible station list after every saved name. Where coordinates are available, the extra full station-page download is avoided. Names are still saved one station at a time using the native form, and each result is verified.

Request deadlines now cover response-body downloads, with bounded response size and cancellation. A broken save response is verified without resending the save. Download Renamer diagnostics is available under Station Naming → More. Detailed timing capture remains off unless Debug is enabled; the download includes current progress and the latest failure. This is a small diagnostic report rather than a full heap dump. Auto Mode, Profiles, Training and personnel assignment are unchanged.

## v3-0-43-248-direct-renamer-and-profile-reasons

**Open Renamer directly and explain remaining profile work · Namer 1.3.0 · Profiles 1.2.1 · 3.0.43.248**

Nexus Tools → Renamer now starts its own naming controls and loads station and dispatch-centre choices directly from the game API. Opening the map or station-list page is no longer required. Existing naming links select the correct controls in place, including from station pages. Failed station loads clear old choices and show a loading error. No naming-inventory requests run on a normal page before opening the tool. Rename calculations, previews, native save verification and nearby-town fallback remain available.

Bulk profiles now show the first exact reason a station needs attention, such as its missing vehicle count, crew shortfall, expected name or remaining level upgrade. What this profile checks lists the chosen targets, including the batch's maximum-level setting. Confirmed full matches are hidden; incomplete checks remain visible. Profile matching criteria, purchases, crew actions, Training and Auto Mode are unchanged.

## v3-0-43-247-profile-match-scan

**Hide matching stations in bulk profiles · Profiles 1.2.0 · 3.0.43.247**

Choosing a profile or dispatch centre now scans the matching stations and hides those whose vehicle setup, requested maximum level, naming and crew targets already match. Required training is checked against assigned personnel. Stations with missing changes, incomplete checks or unresolved earlier purchases stay visible with a reason. Show matching stations restores hidden rows; Scan profile matches refreshes the check. Scanning is read-only, limited to two concurrent stations, and stops when the window closes or its choices change. Selection and purchase review remain separate. The Personnel column and nearby-town naming fixes remain included.

**Nexus Tools → Renamer · Namer 1.2.0**

Station Naming and Unit Naming now live in the new Renamer tab, retaining their existing filters, preview, controls, logs and Personnel subtab. Direct station/vehicle naming links select the right tool on the game map. Existing station and dispatch-centre rename actions continue to work. Moving the controls does not change rename calculations or save verification. Closing Tools hides a running tool; its Stop button cancels the run.

## v3-0-43-246-profile-personnel-column

**Personnel totals in bulk profiles · Profiles 1.1.1 · 3.0.43.246**

Apply profiles to stations now displays Personnel beside each station name. This is the total staff count supplied by the building inventory, including personnel who are unavailable or assigned to missions. Zero is displayed as zero; unknown or invalid totals show an em dash. Reload profiles and stations to refresh the snapshot. The column reuses the existing inventory request and adds no staff scan. Profile execution, naming, Training and Auto Mode are unchanged. The .245 nearby-place naming update remains included.

## v3-0-43-245-nearby-place-naming

**Nearby town fallback for naming · Namer 1.1.0 · 3.0.43.245**

Station Naming previously skipped addresses without a UK postcode followed by a usable area, leaving generic building names unchanged. It now falls back to the nearest mapped town or village within 25 km of verified station coordinates. Home Response remains town-only; normal station type suffixes and sequences are retained. Preview displays the source and distance. Failed lookups and missing coordinates produce an explicit review message without saving a guessed name.

Unit Naming, the station vehicle renamer, dispatch-centre vehicle renamer and profile naming resolve generic home-station names and remove trailing opaque bracketed IDs before constructing unit captions. Existing descriptive names are retained. These vehicle actions do not rename the building itself. Profile naming failures are reported without removing existing names or bypassing the crew workflow.

The existing Realism API currently serves emergency-service locations rather than settlements. Nexus therefore bundles a compact GeoNames extract of 40,629 populated places across Britain, Ireland and nearby islands. It is loaded and spatially indexed in the extension background service only when a naming fallback is requested. There is no external geocoding request, recurring scan or additional host permission. GeoNames CC BY 4.0 attribution and extraction details are included. Mapped-place coverage is not a claim of exact municipal boundaries.

Tests cover actual station naming and native save verification, Unit Naming, station and dispatch-centre vehicle naming, the bulk-profile regression, invalid coordinates, address formats, cancellation and lookup failure. Auto Mode, Training and profile purchase behaviour are unchanged. No live game names were changed or VPS services deployed during validation. This entry does not establish publication.

## v3-0-43-244-profile-max-batch

**Maximum levels and bulk station profiles · Profiles 1.1.0 · 3.0.43.244**

Building profiles can save Upgrade station to maximum level before applying. The native maximum-level credit purchase is verified before missing profile vehicles are bought. Existing naming and suitable-crew assignment then run as before. Older profiles retain their previous level behaviour until the option is enabled.

Nexus Tools → Profiles → Apply to multiple stations opens a separate bulk window. Filter by dispatch centre or all centres, select individual or all matching stations, and review current/target levels, missing vehicles, exact permanent removals, naming, crew targets and total credit cost. Maximum-level upgrading defaults on for a bulk batch. Explicit approval is required before the reviewed purchases and removals begin.

Reviews use two station readers; execution uses one station frame at a time and the existing profile engine. Quotes and fleet state are checked again, unavailable maximum levels block instead of silently choosing a lower level, and a pending checkpoint protects unverified purchases from being repeated. Stop completes verification of the current action. No background schedule, Auto Mode change or Training change is added. Extensions and specialisations remain separate in Building upgrades.

Isolated Edge tests cover the packaged editor, execution engine, maximum-level ordering, price changes, lost responses, uncertain outcomes, locking, stop, dispatch filtering, saved options and layouts. Crew assignment code is unchanged; tests check the targets sent to it. No live game purchases were made. This entry does not establish GitHub or browser-store publication.

## v3-0-43-243-training-staff-choices

**Trained counts, manual staff choices and the Start storage fix · Training 1.2.0 · 3.0.43.243**

The station table now shows Trained beside Personnel. It counts completed qualifications in the selected course, including busy staff, and displays an explicit unknown/checking/error state until a complete roster is read. Choosing a course checks matching stations with two concurrent reads. Compact counts can serve subsequent course choices; Refresh trained counts reads again. These are display snapshots, with fresh eligibility checks still required when starting training.

Expand a station name to see its staff and manually select or unselect eligible people. Selections remain within the station's requested training amount and feed the reviewed plan and native enrolment payload. Away crews, currently training staff, already-qualified staff and people missing the selected starting qualification remain unavailable. Empty manual choices stay empty. Use automatic selection restores the default; changing course, dispatch centre, amount or qualification options clears old manual choices.

Start in .242 could fail with Access to storage is not allowed from this context: Training accessed protected extension storage directly from the game content script. Training now uses a narrow background message handler to read and save its bounded, player-scoped checkpoint. Existing pending records and the extension's private-storage restriction are retained. An uncertain course is still never replayed.

Auto Mode and other feature versions are unchanged. Isolated browser tests reproduce the old storage denial and exercise counts, manual selection, exact enrolment IDs, failures, recovery and layout. No live course was started during validation. This entry does not establish GitHub or store publication.

## v3-0-43-242-training-academy-batches

**Top up or add training across your academies · Training 1.1.0 · 3.0.43.242**

Choose a dispatch centre (or all), load the native course choices, select individual stations or all matching stations, then set the people per station. Top up reaches a trained total: target 10, already qualified 6 and confirmed on this course 2 means selecting 2 more. Add selects that many additional eligible people per station. Qualified staff count towards the top-up even when busy. Unknown ongoing training holds that station's top-up instead of risking extra enrolment.

The review scans every owned academy of the relevant service types, including academies outside the selected dispatch centre, and distributes selected people across free classrooms as needed. Each academy's station admissions are respected and each course uses the smallest supported room count. The native one-free-classroom form is supported. Personnel and classroom shortages remain visible before starting. Use already trained is still a strict qualification filter, and unavailable, away or mission-assigned staff remain excluded.

Before each course, Nexus rereads the academy, selected stations and vehicle availability. It saves a compact pending checkpoint in extension storage, submits the native form once and verifies every selected person through current qualification or identified ongoing-course evidence before continuing. An uncertain response stays recorded across reopening; Check previous result only reads and never repeats enrolment. A lost response that can be verified does not stop the remaining batch. Stop finishes checking the current submission before stopping.

The screen is on demand with at most two scan reads concurrently. Auto Mode, other feature versions and permissions are unchanged. Implementation is independent Nexus code; no Toolkit code or assets are included. Live native forms were inspected read-only, and isolated browser tests cover the workflow, capacity changes, lost responses, storage failure, cancellation and layout. No real course was started during validation. This entry does not establish GitHub or browser-store publication.

## v3-0-43-241-training-workstream

**Training 1.0.0 and independent feature versions · 3.0.43.241**

Nexus Tools > Schooling is now Training. Load dispatch centres and staffed stations, select individual stations or all matching stations, choose an academy and load its current courses. Enter the number of people per station and optionally enable Use already trained with a starting qualification. Level 2 Public Order, Sergeant, Medic and Inspector default to Level 1 Public Order; Firearms defaults to Roads Policing. These are selection preferences, not claims about mandatory game prerequisites. Other starting qualifications can be chosen from the academy’s courses.

The review shows selected names, qualifications, availability and shortfalls for every selected station. Staff already trained in the target course, people the native game does not offer for training, and staff with unknown assignments are excluded. Assigned staff require their exact vehicle to be at the same station and in status 2, without a mission or destination. Availability is read again before the one native course submission; a changed selection stops for another review. Classroom capacity is enforced without silently reducing selected counts. The native game confirmation opens in a separate tab, and no enrolment request is automatically repeated.

The Training module loads only on demand, reads at most two selected stations concurrently, cancels reads on close/tab change and releases loaded personnel. No recurring scans, new permissions or Auto Mode hooks are added. The existing running/alliance course page remains linked.

Tools Overview now lists independent feature versions, with separate workstream changelogs under `docs/workstreams`. Existing features start at a documented 1.0.0 baseline. The extension retains one overall package version. Some older features still share the main runtime; version tracking does not claim that all code has been physically separated. Training is a separate module. Auto Mode, naming, saved profiles and account sync are unchanged beyond package-version metadata.

Validation uses isolated browser fixtures based on the live native academy/personnel form. Real course creation and personnel enrolment have not been performed as part of the test.

## v3-0-43-240-profiles-loading

**Restore the Profiles view when its editor has not started · 3.0.43.240**

Nexus Tools previously hid the current view and called the building-profile editor without checking whether it had loaded. An absent editor caused an uncaught `mountEditor` error and an entirely blank Profiles page. The editor, catalogue, validation and storage dependencies now load together before Nexus Tools in one ordered content-script registration.

Top-level game pages can initialise the editors even if the window retains a Nexus worker-style name. Actual nested worker documents remain excluded. Building and staging editors mount independently; either editor failing now shows an explanation and a Retry button while the other stays usable. Retrying one section preserves entries in the other section, and opening Profiles resets the panel scroll position.

Saved profile storage and formats, Discord sync, profile application and purchasing are unchanged. Auto Mode and mission selection are unchanged. Browser fixtures reproduce the old blank-page failure and verify both editors, save/reopen behaviour, recovery, tab navigation, narrow-screen rendering and worker exclusion. The live .239 error was confirmed; installing .240 and verifying the corrected live view remains separate from those local checks.

## v3-0-43-239-airfield-command-matching

**Recognise renamed airfield command vehicles by their game type · 3.0.43.239**

The standalone Airfield Firefighting Command Vehicles requirement now matches exact game vehicle type 77. Previously its plural requirement and abbreviated built-in label could both miss the game's singular vehicle-type label when the player had renamed the unit. That false shortage kept selective loading searching additional pages and also affected ordinary selection and selected-vehicle counting.

The same exact-type match now serves loaded coverage, Unit Finder selection and selected counts, with earliest arrival first. Dedicated airfield demand remains type 77 only; ICCUs and Ambulance Control Units do not fill it. The separate three-way command alternative retains its existing order. Saved rules, disabled and quarantined units, execution ownership, requested quantities, patient limits, trained-staff verification and final dispatch checks retain their existing behaviour.

No wait, request or full-list timeout increase is added. Local tests reproduce the old mismatch using the native row layout and a renamed command vehicle, and check early stopping with command and ambulance demand together. The supplied .238 aircraft attempt also recorded expensive coverage checks and a page-progress timeout; this matching fix does not establish that all browser processing delays are resolved. Live aircraft dispatch and throughput require verification after installation.

## v3-0-43-238-progressing-large-missions

**Finish progressing large vehicle lists and recognise fresh trained totals · 3.0.43.238**

The .237 export showed healthy page requests being started after the overall loading budget had already expired, then abandoned almost immediately. Auto Mode now allows progressing full lists up to three minutes overall. The initial twenty-second budget is only renewed by confirmed page completion, and a stalled page keeps its fifteen-second limit. The loader also rechecks the overall deadline before starting another request. Fast and partial loads gain no deliberate delay, and expiry still prevents dispatch from an unverified list.

Fresh mission definitions always mark trained-personnel requirements as totals. The .237 early-stop guard mistakenly treated that mark alone as existing mission coverage and forced a full search. On fresh missions without units on scene or travelling, the loaded pool can now prove the entire trained total using complete assigned-crew records. Existing mission coverage, live shortage totals, incomplete records, required vehicle quantities, training combinations, physical capacity and final dispatch checks remain protected.

Diagnostics now measure time spent in the selective coverage check separately from vehicle-page network requests. This helps distinguish slow checks from slow responses; the export's browser freezes are not yet attributed to a specific component. Tests reproduce the fresh-total regression and a progressing load abandoned by the old overall deadline. These are local fixture results, not a claim of verified live throughput.

## v3-0-43-237-selective-trained-coverage

**Stop vehicle loading when verified trained crews cover the mission · 3.0.43.237**

Selective loading now accepts recognised trained-personnel requirements when the already-loaded vehicles have sufficient complete, authoritative assigned-crew records. It reuses the existing exact vehicle matching, training combinations and physical capacity rules. Duplicate vehicle IDs, disabled or preselected units, stale or incomplete evidence and changed vehicle types do not earn coverage. Unknown crew evidence, committed-unit totals, patient alerts and attended-mission uncertainty retain the full-search path.

This is a read-only loading proof. It uses one cached register read and adds no crew-page request, timer or selection click. Ordinary missions do not run the new crew proof. Unit Finder's existing live crew verification, required quantities and pre-dispatch checks are unchanged. If selection after an early stop cannot verify coverage, the existing full-list fallback still runs before any dispatch.

The three-way requirement “ICCU or Ambulance Control Units or Airfield Firefighting Command Vehicles” now accepts ICCU (15), Ambulance Control Unit (31) and Airfield Command (77), in that preference order with arrival ordering within each type. Previously its built-in mapping only searched for the airfield command vehicle. Explicit saved type overrides retain their existing precedence, and airfield-only requirements are not widened.

The .236 progressing-page deadlines and busy-button handling are retained. Tests cover trained coverage across pages, mixed qualifications, duplicate IDs, missing evidence, ordinary vehicle demand, command-vehicle alternatives, existing crew selection and ambulance priority. Local candidate; live mission fulfilment and throughput require a new run.

## v3-0-43-236-vehicle-loading-progress

**Let progressing vehicle lists finish before restarting a mission · 3.0.43.236**

Auto Mode previously abandoned the full vehicle list after a fixed 20-second loading budget, even when additional pages were still completing successfully. Large fleets could repeatedly load thousands of rows, stop before Unit Finder, and restart the same work without dispatching.

The initial budget stays at 20 seconds. Each confirmed page can renew a 15-second progress window, up to a firm 60-second loading limit. A page without confirmed progress still fails within its existing 15-second window. Fast missions gain no deliberate wait or additional page request. Existing partial-list coverage proof, required quantities, trained-personnel checks, final dispatch verification and recovery safeguards remain unchanged.

The loader also recognises the native Load more button's “Loading...” state and waits for an existing request instead of clicking that busy button again. Stop and lost ownership cancel the wait. Failed-load diagnostics now retain the actual row count and reason.

Validation reproduces the previous timeout and checks complete loading, already-busy controls, no-progress pages, the hard limit, cancellation, partial coverage, trained crews and Critical Care ambulance preference in local fixtures. This is a local candidate; live-game throughput and browser-store publication are not claimed.

## v3-0-43-235-critical-care-ambulances

**Prefer ambulances with Critical Care-trained crew · 3.0.43.235**

Ordinary ambulance selection now puts road ambulances with at least one verified assigned Critical Care-trained crew member first. If that group cannot fill the requested number, other eligible ambulances fill the remainder in the same pass. Quickest arrival stays first within each group, with distance breaking equal-arrival ties. The preference also applies to the Any vehicle ambulance fallback and saved rules selecting ordinary type-5 ambulances. HEMS remains eligible where it was before, in the fallback group for ordinary ambulance demand.

The preference uses exact vehicle IDs and complete saved assignment checks under the existing Critical Care register freshness policy. Missing, incomplete, expired or mismatched crew evidence does not earn priority but does not block ordinary ambulance dispatch. Explicit Critical Care, HEMS and Critical Care Transfer Ambulance requirements keep their existing eligibility rules. Requested quantities, ambulance limits, separate trained-personnel gates and duplicate-dispatch safeguards are unchanged.

The selector uses the existing cached personnel register once per ordering pass and adds one linear partition after the existing arrival sort. No staff-page scans, network requests, timer, polling or deliberate wait is added. Zero/one-candidate lists skip the register read. Verification covers mixed crews, shortage fallback, checked/disabled units, saved rules, register changes, dedicated medical requirements and selection timing in an isolated browser. Live-game throughput still requires a run with this version. This entry does not indicate browser-store publication.

## v3-0-43-234-alliance-batches

**Choose Alliance Auto value limits, batch size and fixed pauses · 3.0.43.234**

Alliance missions now has Minimum credits, Missions per batch and Pause (minutes) controls, also available in Nexus Tools > Settings > Alliance support. A minimum includes missions equal to the threshold and excludes lower or unknown values. Zero keeps the existing all-values behavior; the existing value-range, supported-mission, offshore and vehicle filters still apply. The minimum applies to the displayed list and manual selections as well as automatic support.

Alliance Auto starts with eligible missions, attempts up to the chosen batch size, then waits the chosen number of minutes after the batch finishes. The default is up to 10 missions followed by a 10-minute pause; the feature remains off by default. A partial batch or failed candidate still consumes its batch slot and the pause, instead of immediately replacing it with more work. The panel shows batch progress and the next scheduled batch time. Manual support remains available during the automatic pause.

A small saved timestamp and the existing exclusive alliance dispatch lock preserve the pause across refreshes and tabs in the same browser profile. The schedule is checked again inside that lock. Changing settings cannot extend the current batch beyond its original limit, and a reduced limit applies before the next mission. Stop still verifies a dispatch already sent before ending the queue; unconfirmed results retain their existing protection against repeat dispatch. The three preferences use the existing Discord settings sync, while running cadence stays local to each browser profile.

Personal Auto Mode, Worker B recovery, zero-patient closure, vehicle coverage and trained-crew logic are unchanged. Paused hidden alliance panels avoid repeated list/register refreshes from mission mutations. The scheduler uses one existing timer and no countdown polling or added background network request.

Validation uses isolated Edge fixtures with all requests intercepted, including minimum equality, unknown values, saved controls, batches and timed resumption, concurrent tabs, reloads, manual support, Stop, shortages, uncertain dispatches, in-flight preference changes and storage failure. Package scope checks retain personal runtime byte-for-byte apart from its version label. Live-game pacing and long-run throughput still require an attended run. Local candidate; no browser-store submission.

## v3-0-43-233-transport-worker-loading

**Recover Worker B loading without stopping Auto Mode · 3.0.43.233**

Worker B previously used the generic 30-second iframe loading deadline and stopped the entire controller when it expired. Its initial load now uses the existing 18-second transport side-pass budget. If the expected same-origin vehicle or transport document is already usable, Nexus adopts that document in place and gives the existing transport watcher its normal service window. A delayed load event does not recreate an already active destination page or submit transport again.

A genuinely unready canonical vehicle page is released and its exact personal Radio request is deferred. Other eligible transports are serviced first, then personal missions continue. The existing rescan and mission-boundary paths retry the request automatically from its canonical vehicle page after the cooldown; no completed mission or manual Retry is required. Recent repeated load failures back off from 30 seconds to a maximum of five minutes, using bounded existing transport history. The entry point also enforces the cooldown so late handoff callbacks cannot immediately reopen the failed request.

Recovery keeps run intent and existing transport/dispatch locks. It does not replay destination or release URLs. A cleared Radio request returns to normal work. A stale worker, manual Stop, wrong request identity, unexpected origin/login/vehicle, unreadable click state, or an unobservable in-flight action cannot authorise unsafe load recovery. Deferred transports are identified as deferred rather than reported as successfully transported.

Normal successful page loads gain no additional timer, network request, scan or deliberate delay. Vehicle quantities, alternatives, trained-staff and final dispatch checks are unchanged, as is the .232 empty-mission closure fix. Production-function and isolated Edge tests cover the old whole-run stop, continuation, timed retries with no mission supply, other pending transports, delayed events, an in-flight POST, late callbacks and manual Stop. All browser-test requests are intercepted. Live-game recovery and endurance remain unverified. Local candidate; no browser-store submission.

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
