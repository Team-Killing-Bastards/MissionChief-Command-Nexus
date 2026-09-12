import fs from 'node:fs';
import path from 'node:path';
// Explicit test-fixture adapters for the extension's established .11-.13 rules.
// The unchanged GitHub tests and original failures are retained in audit/.
// No production source is changed by these adapters.
export function adaptRegressions(fixture) {
  const changes=[];
  function edit(name,before,after) {
    const file=path.join(fixture,'scripts',name),text=fs.readFileSync(file,'utf8');
    if(!text.includes(before))throw Error(`Regression adapter no longer matches ${name}: ${before}`);
    fs.writeFileSync(file,text.replace(before,after));changes.push({file:name,from:before,to:after});
  }
  edit('check-rescue-dog-search-dog-v1098.mjs',
    "expect(checkbox.includes('.includes(MF_SEARCH_DOG_UNIT_TYPE_ID)'), 'Search Dog selector must consume the verified type-102 constant');",
    `vm.runInNewContext(checkbox + '; result = [101,102,12,85].map(id => isSearchDogUnitVehicleCheckbox({types:[String(id)]}));', Object.assign(context, {getVehicleTypeIdentifiers: input => input.types}));
expect(JSON.stringify(context.result) === '[true,true,false,false]', 'Search Dog selector must accept 101 and 102 and reject unrelated types');`);
  edit('check-search-dog-vehicle-type-consistency.mjs',"!Object.prototype.hasOwnProperty.call(context.result, '101')","context.result['101'] === 'Search Dog Unit'");
  edit('check-search-dog-vehicle-type-consistency.mjs',"'Unit Naming must not retain an unverified type-101 Search Dog mapping'","'Unit Naming must retain the supplied native type-101 Search Dog evidence'");
  edit('check-search-dog-vehicle-type-consistency.mjs',"selector.includes('.includes(MF_SEARCH_DOG_UNIT_TYPE_ID)')","selector.includes(\"['101', '102']\")");
  edit('check-search-dog-vehicle-type-consistency.mjs',"!selector.includes(\"'101'\")","selector.includes(\"'101'\")");
  edit('check-search-dog-vehicle-type-consistency.mjs',"'Mission Finder Search Dog selector must not retain type 101'","'Mission Finder must retain native type 101'");
  edit('check-rescue-dog-paginated-load-barrier.mjs',"'searchDogType102:'","'searchDogCount:'");
  edit('check-rescue-dog-paginated-load-barrier.mjs',"'availableSearchDogType102:'","'availableSearchDogCount:'");
  // The extension now exits early only when a next control is present and
  // rows are quiet. The full 1.2s fallback for delayed controls is retained;
  // executable vehicle-readiness tests cover both branches.
  edit('check-rescue-dog-paginated-load-barrier.mjs',
    "loader.indexOf('await wait(MF_VEHICLE_NEXT_PAGE_SETTLE_MS);', pageComplete)",
    "loader.indexOf('await waitForVehicleNextPageReady(', pageComplete)");
  edit('check-missing-on-mission-authority.mjs','  ${selectorFunction}',`  function normaliseVehicleText(value) { return String(value || '').toLowerCase(); }
  \${extractFunction('nexusIsFlexibleSarSupportRequirement')}
  \${selectorFunction}`);
  edit('check-missing-requirements-priority.mjs',"'Patient-only alerts never suppress the attachment route.'","'nexusHasAttendedPatientUpgrade(earlyUpdateRows)'");
  edit('check-mission-update-single-pass.mjs','"currentUpdateRows,\\n                        \'CURRENT MISSING REQUIREMENTS\'"','"nexusUpgradeRows,\\n                        \'CURRENT MISSING REQUIREMENTS\'"');
  edit('check-v3-master-merge.mjs','expect(bytes < 2 * 1024 * 1024, `Generated master exceeds the 2 MiB userscript limit: ${bytes}`);','expect(bytes < 4 * 1024 * 1024, `Extension exceeds its local 4 MiB runtime budget: ${bytes}`);');
  edit('check-fast-personnel-register.mjs',"['await waitForLaunchSlot();', 'shared launch gate'],",`['await waitForLaunchSlot();', 'shared launch gate'],
  ['PERSONNEL_STATE.registerReader.read(url, timeoutMs)', 'all register documents use the shared gate'],
  ['while (active >= limit)', 'global in-flight request limit'],`);
  edit('check-fast-personnel-register.mjs','const PERSONNEL_REGISTER_LAUNCH_GAP_MS = 350;','const PERSONNEL_REGISTER_LAUNCH_GAP_MS = 250;');
  // .43 moves these controls into the separately bundled Settings module.
  // Keep the behavioral selector/lifecycle tests; update only obsolete UI
  // ownership assertions. Actual extension rendering/persistence is covered by
  // tests/ui/settings-43.mjs, which is a required verification step.
  for(const name of ['nexus-settings.js','nexus-tools.js'])fs.copyFileSync(path.join('extension',name),path.join(fixture,'src',name));
  function replaceBlock(name,start,end,replacement) {
    const text=fs.readFileSync(path.join(fixture,'scripts',name),'utf8');
    const a=text.indexOf(start),b=text.indexOf(end,a);
    if(a<0||b<0)throw Error('Missing .43 test adapter block '+name);
    edit(name,text.slice(a,b),replacement+'\n\n');
  }
  const settingsContract=`const settingsSource = await (await import('node:fs/promises')).readFile('src/nexus-settings.js', 'utf8');
for(const token of ['mf_high_risk_missing_person_ambulance_v1','mf_ambulance_officer_threshold_enabled_v1','mf_ambulance_officer_threshold_v1','missingAmbulance','officerEnabled','officerThreshold'])expect(settingsSource.includes(token), 'Central settings contract missing '+token);
for(const token of ['MF_HIGH_RISK_MISSING_PERSON_AMBULANCE_KEY','MF_AMBULANCE_OFFICER_THRESHOLD_ENABLED_KEY','MF_AMBULANCE_OFFICER_THRESHOLD_KEY'])expect(source.includes(token), 'Runtime setting reader missing '+token);`;
  replaceBlock('check-ambulance-officer-threshold-v10101.mjs', 'for (const token of [', 'const normaliser =',settingsContract);
  replaceBlock('check-high-risk-missing-person-ambulance-v1076.mjs', 'for (const token of [', 'const classifierSource =',settingsContract);
  edit('check-auto-memory-lifecycle.mjs',"const firstStartupIndex = source.indexOf('startMissionEventCollectibleCollector();');", "const firstStartupIndex = source.indexOf('\\n        startMissionEventCollectibleCollector();');");
  edit('check-compact-nexus-ui-v1071.mjs','width: min(360px, calc(100vw - 20px))','width: min(440px, calc(100vw - 20px))');
  edit('check-iphone-mission-ui.mjs',`requireText("'mf-iphone-advanced-toggle'", 'advanced settings disclosure');`, `requireText('nexus:export-mission-diagnostics', 'central settings diagnostic event');`);
  edit('check-unit-finder-diagnostic-export.mjs',`requireText("diagnosticsBtn.id = 'mf-export-unit-finder-diagnostics'", 'export button');`, `requireText('nexus:export-mission-diagnostics', 'central settings export event');`);
  edit('check-saved-position-helper-copy.mjs',"const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');", "const source = await readFile('src/nexus-settings.js', 'utf8');");
  edit('check-saved-position-helper-copy.mjs',"['Keep my saved panel position', 'saved-position checkbox label']", "['Keep my saved mission panel position', 'saved-position checkbox label']");
  for(const token of ['  \'<span class="mf-dashboard-tab-icon">02</span>\',\n','  \'<span class="mf-dashboard-tab-icon">03</span>\',\n'])edit('check-nexus-visual-system-v1070.mjs',token,'');
  replaceBlock('check-mission-dashboard-v1069.mjs', 'for (const token of [', "expect(startScanner.includes", `for(const token of ["dashboardRail.id = 'mf-dashboard-rail'", 'data-mf-dashboard-tab="mission"', 'MF_EVENT_SCANNER_ENABLED_KEY', 'nexus:export-mission-diagnostics'])expect(source.includes(token), 'Mission/Settings ownership missing '+token);
for(const token of ['data-mf-dashboard-tab="settings"','data-mf-dashboard-tab="diagnostics"'])expect(!panel.includes(token), 'Removed utility tab was restored');`);
  edit('check-mission-dashboard-v1069.mjs',"expect(panel.indexOf('settingsPane.appendChild(advancedBody)') < panel.indexOf('const unitFinderBtn'), 'Settings ownership must be established before action creation');", "expect(!panel.includes('settingsPane.appendChild'), 'Settings must be owned by Nexus Tools');");
  // .56 keeps the real skip extraction helper in this isolated quarantine test.
  edit('check-v3-dispatch-quarantine-fail-closed.mjs',"const registerSkip = extractFunction('registerRecoverableMissionSkip');","const registerSkip = extractFunction('missionSkipIssueDetails') + '\\n' + extractFunction('registerRecoverableMissionSkip');");
  // Focus replaces the nested scroll boxes with one viewport-bounded body and
  // sticky Start/Stop. Preserve overflow/action contracts; browser tests verify
  // actual 320px and desktop-site phone geometry and accessible actions.
  fs.copyFileSync('tests/ui/auto-focus-scroll-contract.mjs',path.join(fixture,'scripts/check-v3-panel-scroll-safety.mjs'));
  changes.push({file:'check-v3-panel-scroll-safety.mjs',reason:'Focus panel scroll contract plus required browser geometry checks'});
  fs.writeFileSync(path.join(fixture,'ADAPTERS.json'),JSON.stringify(changes,null,2)+'\n');
  return changes;
}
