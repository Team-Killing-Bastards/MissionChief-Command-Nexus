#!/usr/bin/env node

// Guards the two-stage contract: prefer live cells first, then allow only the
// exact current-mission Release Prisoners fallback after normal Auto actions.

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

for (const [token, label] of [
  ['// @version      1.0.42', 'v1.0.42 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.106', 'Mission Finder V10.6.106 header'],
  ['the prisoners should be placed in a cell', 'normalised prisoner alert contract'],
  ['a.btn.btn-success[data-prison-id][href*="/gefangener/"]', 'green prison destination selector'],
  ['a.btn.btn-danger[data-method="post"][href*="/gefangene/entlassen"]', 'exact release fallback selector'],
  ['function handleAutoPrisonerCellBeforeUnitFinder(', 'early prisoner cell gate'],
  ['function handleAutoPrisonerReleaseAfterActions(', 'final prisoner release gate'],
  ['await handleAutoPrisonerCellBeforeUnitFinder();', 'early gate invocation'],
  ['await handleAutoPrisonerReleaseAfterActions();', 'final gate invocation'],
  ["return 'defer-release';", 'deferred final fallback outcome'],
  ['realClickForQueueRestart(releaseLink);', 'single native release click'],
  ['MF_AUTO_PRISONER_RELEASE_STATE_KEY', 'release duplicate-click guard'],
]) {
  if (!source.includes(token)) fail(`Missing Auto prisoner contract: ${label}`);
}

const runStart = source.indexOf('async function runAutoModeLoop()');
const earlyGateCall = source.indexOf('await handleAutoPrisonerCellBeforeUnitFinder();', runStart);
const updateWait = source.indexOf('await waitForMissionUpdateBeforeUnitFinder(', runStart);
const vehicleLoad = source.indexOf('await ensureVehicleListLoaded({', runStart);
const unitFinder = source.indexOf('handleCombinedLogic({', runStart);
const missionUpdate = source.indexOf('handleMissionUpdateUnits(', unitFinder);
const finalGateCall = source.indexOf('await handleAutoPrisonerReleaseAfterActions();', missionUpdate);
const problemAlert = source.indexOf('const visibleProblemAlert = getVisibleInlineProblemAlertText();', finalGateCall);

if ([runStart, earlyGateCall, updateWait, vehicleLoad, unitFinder, missionUpdate, finalGateCall, problemAlert].some(value => value < 0)) {
  fail('Unable to locate the complete Auto Mode prisoner ordering contract');
}

if (!(earlyGateCall < updateWait && earlyGateCall < vehicleLoad && earlyGateCall < unitFinder)) {
  fail('Cell destination handling must remain before Mission Update wait, vehicle loading and Unit Finder');
}

if (!(finalGateCall > unitFinder && finalGateCall > missionUpdate && finalGateCall < problemAlert)) {
  fail('Release Prisoners fallback must run after Unit Finder and Mission Update but before dispatch validation');
}

const selectorStart = source.indexOf('function getFirstAvailablePrisonCellDestination(');
const selectorEnd = source.indexOf('function readAutoPrisonerCellHandoffState(', selectorStart);
const selectorBody = source.slice(selectorStart, selectorEnd);

for (const forbidden of ['entlassen', 'btn-danger', 'release prisoners']) {
  if (selectorBody.toLowerCase().includes(forbidden)) {
    fail(`Early prison destination selector contains forbidden release path: ${forbidden}`);
  }
}

const releaseStart = source.indexOf('function getExactAutoReleasePrisonersLink(');
const releaseEnd = source.indexOf('function readAutoPrisonerReleaseState(', releaseStart);
const releaseSelector = source.slice(releaseStart, releaseEnd);

for (const required of [
  'btn-danger',
  'data-method="post"',
  '/gefangene/entlassen',
  "text !== 'release prisoners'",
  '`/missions/${missionId}/gefangene/entlassen`',
  'releaseUrl.origin !== window.location.origin',
]) {
  if (!releaseSelector.includes(required)) {
    fail(`Exact release selector is missing: ${required}`);
  }
}

const finalStart = source.indexOf('async function handleAutoPrisonerReleaseAfterActions(');
const finalEnd = source.indexOf('function mfIsPoliceOrPrisonerTransportActive(', finalStart);
const finalBody = source.slice(finalStart, finalEnd);
const availableCheck = finalBody.indexOf('getFirstAvailablePrisonCellDestination(context)');
const releaseLookup = finalBody.indexOf('getExactAutoReleasePrisonersLink(context)');

if (!(availableCheck >= 0 && releaseLookup > availableCheck)) {
  fail('Final fallback must re-check available cell destinations before locating Release Prisoners');
}

for (const outcome of ["return 'cell-available';", "return 'clicked';", "return 'waiting';", "return 'stuck';"]) {
  if (!finalBody.includes(outcome)) fail(`Final release gate is missing outcome: ${outcome}`);
}

if (!source.includes("prisonerReleaseResult === 'stuck'")) {
  fail('Auto Mode must stop safely when the exact release fallback cannot complete');
}

console.log('Auto Mode prefers active cells, finishes normal actions when none are available, then clicks only the exact current-mission Release Prisoners fallback before dispatch.');
