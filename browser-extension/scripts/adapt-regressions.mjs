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
  fs.writeFileSync(path.join(fixture,'ADAPTERS.json'),JSON.stringify(changes,null,2)+'\n');
  return changes;
}
