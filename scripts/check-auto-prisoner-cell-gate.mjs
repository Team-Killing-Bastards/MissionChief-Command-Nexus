#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

// This contract runs on the final branch after current main has been recorded.
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

for (const [token, label] of [
  ['// @version      1.0.41', 'v1.0.41 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.105', 'Mission Finder V10.6.105 header'],
  ['the prisoners should be placed in a cell', 'normalised prisoner alert contract'],
  ['a.btn.btn-success[data-prison-id][href*="/gefangener/"]', 'green prison destination selector'],
  ['function getActivePrisonerCellSelectionContext(', 'prisoner alert context detector'],
  ['function getFirstAvailablePrisonCellDestination(', 'first active destination selector'],
  ['function handleAutoPrisonerCellBeforeUnitFinder(', 'Auto Mode prisoner gate'],
  ['await handleAutoPrisonerCellBeforeUnitFinder();', 'Auto Mode gate invocation'],
  ['realClickForQueueRestart(destination);', 'single native destination click'],
  ['MF_AUTO_PRISONER_CELL_HANDOFF_KEY', 'duplicate-click session guard'],
  ["if (getActivePrisonerCellSelectionContext()) return true;", 'queue/transport ownership block'],
]) {
  if (!source.includes(token)) fail(`Missing Auto prisoner-cell contract: ${label}`);
}

const runStart = source.indexOf('async function runAutoModeLoop()');
const gateCall = source.indexOf('await handleAutoPrisonerCellBeforeUnitFinder();', runStart);
const updateWait = source.indexOf('await waitForMissionUpdateBeforeUnitFinder(', runStart);
const vehicleLoad = source.indexOf('await ensureVehicleListLoaded({', runStart);
const unitFinder = source.indexOf('handleCombinedLogic({', runStart);

if (runStart < 0 || gateCall < 0 || updateWait < 0 || vehicleLoad < 0 || unitFinder < 0) {
  fail('Unable to locate the complete Auto Mode ordering contract');
}

if (!(gateCall < updateWait && gateCall < vehicleLoad && gateCall < unitFinder)) {
  fail('Prisoner cell gate must run before Mission Update wait, vehicle loading and Unit Finder');
}

const selectorStart = source.indexOf('function getFirstAvailablePrisonCellDestination(');
const selectorEnd = source.indexOf('function readAutoPrisonerCellHandoffState(', selectorStart);
const selectorBody = source.slice(selectorStart, selectorEnd);

for (const forbidden of [
  'entlassen',
  'btn-danger',
  'release prisoners',
]) {
  if (selectorBody.toLowerCase().includes(forbidden)) {
    fail(`Prison destination selector contains forbidden release path: ${forbidden}`);
  }
}

for (const required of [
  'btn-success',
  'data-prison-id',
  '/gefangener/',
  'free|available',
  'return link;',
]) {
  if (!selectorBody.toLowerCase().includes(required.toLowerCase())) {
    fail(`Prison destination selector is missing: ${required}`);
  }
}

const gateStart = source.indexOf('async function handleAutoPrisonerCellBeforeUnitFinder(');
const gateEnd = source.indexOf('function mfIsPoliceOrPrisonerTransportActive(', gateStart);
const gateBody = source.slice(gateStart, gateEnd);

if (!gateBody.includes("return 'clicked';") || !gateBody.includes("return 'waiting';") || !gateBody.includes("return 'stuck';")) {
  fail('Prisoner gate must expose clicked, waiting and stuck outcomes');
}

if (!source.includes("prisonerCellGate === 'stuck'")) {
  fail('Auto Mode must stop safely when the prisoner handoff cannot complete');
}

console.log('Auto Mode handles the first active prisoner-cell destination before Unit Finder and never releases prisoners.');
