#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

// Preserve Dispatch Centre filter safety across later hierarchy changes.
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const requireText = (text, label = text) => { if (!source.includes(text)) fail(`Missing naming Dispatch Centre contract: ${label}`); };

for (const [text, label] of [
  ['id="mc-namer-dispatch-centre" disabled', 'Unit Naming Dispatch Centre select'],
  ['id="mc-station-dispatch-centre" disabled', 'Station Naming Dispatch Centre select'],
  ["const NAMING_DISPATCH_CENTRE_ALL = 'ALL';", 'All Dispatch Centres default'],
  ["const NAMING_DISPATCH_CENTRE_UNASSIGNED = '__UNASSIGNED__';", 'unassigned Dispatch Centre option'],
  ["getAttribute?.('leitstelle_building_id')", 'authoritative station-row Dispatch Centre relationship'],
  ['function refreshNamingDispatchCentreAssignmentsFromStationRows(', 'station-row assignment refresh'],
  ['function stationMatchesNamingDispatchCentre(', 'shared Dispatch Centre predicate'],
  ['function populateNamingDispatchCentreFilter(', 'shared Dispatch Centre selector population'],
  ['function handleUnitDispatchCentreChange(', 'Unit Naming centre-first change handler'],
  ['function handleStationDispatchCentreChange(', 'Station Naming centre-first change handler'],
  ["'All dispatch centres'", 'All Dispatch Centres option label'],
  ["'Unassigned / default'", 'unassigned option label'],
]) requireText(text, label);

if ((source.match(/dispatchCentreId: getNamingDispatchCentreId\(entry\.buildingId\)/g) || []).length < 2) {
  fail('Both Unit Naming and Station Naming must map the Dispatch Centre relationship.');
}
if ((source.match(/loadNamingDispatchCentreData\(true\)/g) || []).length < 2) {
  fail('Both naming tools must rescan authoritative station-to-centre assignments.');
}
if (source.includes('mc-personnel-dispatch-centre')) {
  fail('Dispatch Centre filtering must not affect Personnel Assignment.');
}
console.log('Unit and Station Naming Dispatch Centre safety contracts passed.');
