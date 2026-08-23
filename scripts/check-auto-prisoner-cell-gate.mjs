#!/usr/bin/env node

// Guards the prisoner contract: prefer a live usable cell, immediately run the
// exact current-mission Release Prisoners fallback when no usable cell remains,
// retain the final pre-dispatch recheck, then close the owned result lightbox.

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

for (const [token, label] of [
  ['[data-transport-request="true"][data-transport-request-type="prisoner"]', 'current structured prisoner request'],
  ['.prison-select[data-vehicle-id]', 'current vehicle cell selector'],
  ['the prisoners should be placed in a cell', 'normalised prisoner alert contract'],
  ['a.btn.btn-success[data-prison-id][href*="/gefangener/"]', 'green prison destination selector'],
  ['a.btn.btn-danger[data-method="post"][href*="/gefangene/entlassen"]', 'exact release fallback selector'],
  ['function handleAutoPrisonerCellBeforeUnitFinder(', 'early prisoner cell gate'],
  ['function handleAutoPrisonerReleaseAfterActions(', 'final prisoner release gate'],
  ['await handleAutoPrisonerCellBeforeUnitFinder();', 'early gate invocation'],
  ['await handleAutoPrisonerReleaseAfterActions();', 'final gate invocation'],
  ['Running the exact Release Prisoners fallback before Unit Finder.', 'immediate no-cell release handoff'],
  ['realClickForQueueRestart(releaseLink);', 'single native release click'],
  ['MF_AUTO_PRISONER_RELEASE_STATE_KEY', 'release duplicate-click guard'],
  ['MF_AUTO_PRISONER_RELEASE_RESULT_WAIT_MS', 'release result wait guard'],
  ['span.lightbox-close[title="Close"]', 'release-result close selector'],
  ['function captureAutoPrisonerReleaseOwnerContext(', 'pre-navigation Vue owner capture'],
  ['function getAutoPrisonerReleaseSuccessContext(', 'exact release-success resolver'],
  ['.alert.alert-success', 'released-prisoners success alert selector'],
  ['the prisoners were released', 'exact released-prisoners result text'],
  ['function getTopmostAutoPrisonerReleaseDismissContext(', 'topmost release-result close chooser'],
  ['function closeAutoPrisonerReleaseDismissAfterClick(', 'release-result dismiss handler'],
  ['function getAutoPrisonerReleaseOwnerContainer(', 'release iframe to parent modal owner'],
  ['function resolveAutoPrisonerReleaseDismissContext(', 'live Vue modal reacquisition'],
  ["getAttribute('data-modal')", 'stable Vue modal identity'],
  ['dismissContextBeforeClick', 'captured owner passed across release navigation'],
  ['await closeAutoPrisonerReleaseDismissAfterClick(', 'release dismiss invocation with owner context'],
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

const earlyStart = source.indexOf('async function handleAutoPrisonerCellBeforeUnitFinder(');
const earlyEnd = source.indexOf('function getAutoPrisonerReleaseOwnerContainer(', earlyStart);
const earlyBody = source.slice(earlyStart, earlyEnd);
const earlyNoDestination = earlyBody.indexOf('if (!destination) {');
const earlyReleaseCall = earlyBody.indexOf('await handleAutoPrisonerReleaseAfterActions();', earlyNoDestination);

if (!(earlyNoDestination >= 0 && earlyReleaseCall > earlyNoDestination)) {
  fail('No-cell prisoner handling must invoke the exact release fallback before Unit Finder');
}

if (earlyBody.includes("return 'defer-release';") || source.includes("prisonerCellGate === 'defer-release'")) {
  fail('No-cell prisoner handling must not defer release until after Unit Finder');
}

if (!(finalGateCall > unitFinder && finalGateCall > missionUpdate && finalGateCall < problemAlert)) {
  fail('The final Release Prisoners recheck must remain after Unit Finder and Mission Update but before dispatch validation');
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

const releaseClick = finalBody.indexOf('realClickForQueueRestart(releaseLink);');
const ownerCapture = finalBody.indexOf('captureAutoPrisonerReleaseOwnerContext(context)');
const dismissCall = finalBody.indexOf('await closeAutoPrisonerReleaseDismissAfterClick(');
const releaseReturn = finalBody.indexOf("return 'clicked';", dismissCall);

if (!(ownerCapture >= 0 && ownerCapture < releaseClick && dismissCall > releaseClick && releaseReturn > dismissCall)) {
  fail('Release Prisoners must capture its modal owner, click, close the owned result screen, then restart the Auto cycle');
}

const dismissStart = source.indexOf('async function closeAutoPrisonerReleaseDismissAfterClick(');
const dismissEnd = source.indexOf('function getExactAutoReleasePrisonersLink(', dismissStart);
const dismissBody = source.slice(dismissStart, dismissEnd);

for (const required of [
  'getAutoPrisonerReleaseSuccessContext(',
  "if (!successContext) return 'stuck';",
  'getTopmostAutoPrisonerReleaseDismissContext(',
  'realClickForQueueRestart(',
  'resolveAutoPrisonerReleaseDismissContext(',
  'current.closeButton',
  'current.overlay',
  'isAutoPrisonerReleaseDismissContextVisible(',
  "return 'closed';",
]) {
  if (!dismissBody.includes(required)) {
    fail(`Release-result dismiss handler is missing: ${required}`);
  }
}

const prisonerSuccessCheck = dismissBody.indexOf('getAutoPrisonerReleaseSuccessContext(');
const resultCloseLookup = dismissBody.indexOf('resolveAutoPrisonerReleaseDismissContext(dismissContext)');
const resultCloseClick = dismissBody.indexOf('realClickForQueueRestart(current.closeButton)');
const resultCloseVerify = dismissBody.indexOf('isAutoPrisonerReleaseDismissContextVisible(');

if (!(prisonerSuccessCheck >= 0 && resultCloseLookup > prisonerSuccessCheck && resultCloseClick > resultCloseLookup && resultCloseVerify > resultCloseClick)) {
  fail('Release result must confirm the exact success alert, reacquire the owned close span, click it and verify disappearance in that order');
}

const visibleContextsStart = source.indexOf('function getVisibleAutoPrisonerReleaseDismissContexts(');
const visibleContextsEnd = source.indexOf('function getTopmostAutoPrisonerReleaseDismissContext(', visibleContextsStart);
const visibleContextsBody = source.slice(visibleContextsStart, visibleContextsEnd);
for (const token of [
  '#modals-container .vm--container',
  'getAutoPrisonerReleaseOwnerContainer(',
  'getAutoPrisonerReleaseContainerKey(',
  'resolveAutoPrisonerReleaseDismissContext(',
]) {
  if (!visibleContextsBody.includes(token)) fail(`Prisoner close owner scoping is missing: ${token}`);
}

const visibilityStart = source.indexOf('function isAutoPrisonerReleaseDismissContextVisible(');
const visibilityEnd = source.indexOf('function closeAutoPrisonerReleaseDismissAfterClick(', visibilityStart);
const visibilityBody = source.slice(visibilityStart, visibilityEnd);
if (!visibilityBody.includes('resolveAutoPrisonerReleaseDismissContext(context)')) {
  fail('Close verification must reacquire the current Vue modal instead of trusting the old node');
}
if (visibilityBody.includes('context.modal.isConnected === false')) {
  fail('A disconnected old modal must not prove that its Vue replacement closed');
}

for (const token of [
  "['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']",
  'attempt === 3 && current.overlay',
  'getTopmostAutoPrisonerReleaseDismissContext(',
]) {
  if (!dismissBody.includes(token)) fail(`Scoped prisoner close retry is missing: ${token}`);
}

console.log('Auto Mode prefers active cells, completes the exact current-mission release fallback, follows the owning Vue vm--container/data-modal identity, reacquires replacement close spans and verifies the current lightbox is gone before restart.');
