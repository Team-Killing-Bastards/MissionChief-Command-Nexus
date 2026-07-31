#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function sliceBetween(startToken, endToken, label) {
  const start = source.indexOf(startToken);
  if (start < 0) fail(`Missing ${label} start`);
  const end = source.indexOf(endToken, start);
  if (end < 0) fail(`Missing ${label} end`);
  return source.slice(start, end);
}

expect(source.includes('// @version      1.0.66'), 'Expected Command Nexus 1.0.61');
expect(source.includes(' * MODULE 2: MISSION FINDER V10.6.129'), 'Expected Mission Finder V10.6.124');

const helperSource = sliceBetween(
  '    function shouldRunPostSelectionMissionUpdate(selectionRunState) {',
  '\n\n    async function runAutoModeLoop() {',
  'single-pass helper'
);
const shouldRunPostSelectionMissionUpdate = Function(
  `${helperSource}\nreturn shouldRunPostSelectionMissionUpdate;`
)();

expect(
  shouldRunPostSelectionMissionUpdate({ usedCurrentMissionUpdateAuthority: true }) === false,
  'A cycle already handled by Mission Update must not run the post-selection update pass'
);
expect(
  shouldRunPostSelectionMissionUpdate({ usedCurrentMissionUpdateAuthority: false }) === true,
  'A fresh Unit Finder cycle must retain the late Mission Update check'
);
expect(
  shouldRunPostSelectionMissionUpdate(null) === true,
  'Missing route state must fail open to the fresh-mission safety check'
);

const combined = sliceBetween(
  '    async function handleCombinedLogic(options = {}) {',
  '\n    function getActiveMissionInfoForAllySteal()',
  'handleCombinedLogic'
);
for (const token of [
  'const selectionRunState =',
  'selectionRunState.usedCurrentMissionUpdateAuthority = false',
  'selectionRunState.usedCurrentMissionUpdateAuthority =\n                useCurrentMissionUpdateAuthority',
  "currentUpdateRows,\n                        'CURRENT MISSING REQUIREMENTS'",
  'handleUnitFinderPatientRequirements()',
]) {
  expect(combined.includes(token), `Unit Finder route receipt missing ${token}`);
}

const autoLoop = sliceBetween(
  '    async function runAutoModeLoop() {',
  '\n    function suspendMissionFinderRuntimeForPageHide(',
  'runAutoModeLoop'
);
for (const token of [
  'const autoSelectionRunState =',
  'usedCurrentMissionUpdateAuthority:\n                    hasEarlyCurrentMissionUpdateAuthority',
  'selectionRunState: autoSelectionRunState',
  'shouldRunPostSelectionMissionUpdate(\n                        autoSelectionRunState',
  'AUTO MISSION UPDATE SINGLE PASS',
  'duplicate post-selection processing was suppressed',
]) {
  expect(autoLoop.includes(token), `Auto Mode single-pass guard missing ${token}`);
}

const guardIndex = autoLoop.indexOf('shouldRunPostSelectionMissionUpdate(');
const postReadIndex = autoLoop.indexOf('const postUnitFinderUpdateRows =');
const postSelectionIndex = autoLoop.indexOf('handleMissionUpdateUnits(\n                                false,\n                                postUnitFinderExplicitMissingRows');
expect(guardIndex >= 0, 'Missing single-pass guard');
expect(postReadIndex > guardIndex, 'Post-selection update read is not inside the fresh-mission guard');
expect(postSelectionIndex > postReadIndex, 'Post-selection unit selection is not inside the guarded update block');
expect(
  (autoLoop.match(/const postUnitFinderUpdateRows =/g) || []).length === 1,
  'Auto Mode contains more than one post-selection Mission Update read'
);
expect(
  (autoLoop.match(/postUnitFinderExplicitMissingRows/g) || []).length >= 4,
  'Fresh-mission late update handling was accidentally removed'
);

const updateHandler = sliceBetween(
  '    function handleMissionUpdateUnits(showAlerts, suppliedRows = null, options = {}) {',
  '\n    async function autoHandleMissionUpdateAfterDispatch()',
  'handleMissionUpdateUnits'
);
for (const token of [
  'isTrainedPersonnelRequirement',
  'selectVehiclesForTrainedPersonnelRequirements(',
  "'UPDATE'",
  'personnelTrainingRequirements',
]) {
  expect(updateHandler.includes(token), `Trained-personnel Mission Update path regressed: ${token}`);
}

const updateReader = sliceBetween(
  '    function readMissionUpdateRows(options = {}) {',
  '\n    function getMissionUpdateFirstPassKey()',
  'readMissionUpdateRows'
);
for (const token of [
  "source === 'missing-on-mission-table'",
  "source === 'data-raw-html-missing-vehicles'",
  'candidateAuthority > existingAuthority',
  'amount > existing.stillNeeded',
]) {
  expect(source.includes(token) || updateReader.includes(token), `Mission Update dedupe/authority contract missing ${token}`);
}

console.log('Mission Update single-pass regression passed: existing-mission shortages and trained personnel are selected once, while fresh missions retain the late shortage check.');
