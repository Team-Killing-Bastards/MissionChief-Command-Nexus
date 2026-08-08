#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
function requireText(text, label = text) {
  if (!source.includes(text)) fail(`Missing naming Dispatch Centre contract: ${label}`);
}

for (const [text, label] of [
  ['// @version      1.0.85', 'Command Nexus 1.0.85 metadata'],
  ["const UNIT_VERSION = '3.3.10';", 'Unit Naming 3.3.10'],
  ["const STATION_VERSION = '1.3.4';", 'Station Naming 1.3.4'],
  ['id="mc-namer-dispatch-centre" disabled', 'Unit Naming Dispatch Centre select'],
  ['id="mc-station-dispatch-centre" disabled', 'Station Naming Dispatch Centre select'],
  ["const NAMING_DISPATCH_CENTRE_ALL = 'ALL';", 'All Dispatch Centres default'],
  ["const NAMING_DISPATCH_CENTRE_UNASSIGNED = '__UNASSIGNED__';", 'unassigned Dispatch Centre option'],
  ["stationFetchWithTimeout('/building/buildings_json'", 'authoritative MissionChief building dataset'],
  ['building?.leitstelle_building_id', 'authoritative Dispatch Centre relationship'],
  ['function stationMatchesNamingDispatchCentre(', 'shared Dispatch Centre predicate'],
  ['function populateNamingDispatchCentreFilter(', 'shared Dispatch Centre selector population'],
  ["document.querySelector('#mc-namer-dispatch-centre').onchange = populateStartDropdown;", 'Unit Naming filter change handler'],
  ["document.querySelector('#mc-station-dispatch-centre').onchange = populateStationNamingStartDropdown;", 'Station Naming filter change handler'],
  ["document.querySelector('#mc-namer-dispatch-centre')?.value", 'Unit Naming selected Dispatch Centre'],
  ["document.querySelector('#mc-station-dispatch-centre')?.value", 'Station Naming selected Dispatch Centre'],
  ["'All dispatch centres'", 'All Dispatch Centres option label'],
  ["'Unassigned / default'", 'unassigned option label'],
]) requireText(text, label);

if ((source.match(/dispatchCentreId: getNamingDispatchCentreId\(entry\.buildingId\)/g) || []).length < 2) {
  fail('Both Unit Naming and Station Naming must map the Dispatch Centre relationship.');
}
if ((source.match(/await loadNamingDispatchCentreData\(\);/g) || []).length < 2) {
  fail('Both naming tools must load Dispatch Centre data on Refresh Stations.');
}
if (source.includes('mc-personnel-dispatch-centre')) {
  fail('Dispatch Centre filtering must not affect Personnel Assignment.');
}
if (!workflow.includes('scripts/check-naming-dispatch-centre-filter-v1085.mjs')) {
  fail('Naming Dispatch Centre regression is not registered in Validate userscript.');
}
console.log('Unit Naming and Station Naming Dispatch Centre filter contracts passed.');
