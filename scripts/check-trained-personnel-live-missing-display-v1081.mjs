#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(name) {
  const pattern = new RegExp(
    `^\\s*(?:async\\s+)?function\\s+${name}\\s*\\(`,
    'm'
  );
  const match = source.match(pattern);
  if (!match || match.index == null) fail(`Unable to find ${name}`);
  const start = match.index;
  const signatureEnd = source.indexOf(') {', start);
  if (signatureEnd < 0) fail(`Unable to find ${name} body`);
  const bodyStart = signatureEnd + 2;
  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '/' && next === '/') {
      const lineEnd = source.indexOf('\n', index + 2);
      index = lineEnd < 0 ? source.length : lineEnd;
      continue;
    }
    if (character === '/' && next === '*') {
      const blockEnd = source.indexOf('*/', index + 2);
      if (blockEnd < 0) fail(`Unclosed comment in ${name}`);
      index = blockEnd + 1;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  fail(`Unable to extract ${name}`);
}

expect(source.includes('// @version      1.0.111'), 'Expected Command Nexus 1.0.81');
expect(source.includes(' * MODULE 2: MISSION FINDER V10.6.153'), 'Expected Mission Finder V10.6.141');

const helper = extractFunction(
  'getLiveMissionTrainedPersonnelRequirementsForDisplay'
);
for (const token of [
  'hasMissionVehiclesOnSceneForTrainedPersonnelAuthority()',
  'readMissionUpdateRows({ silent: true })',
  'normaliseOperationalRequirementRows(',
  'row?.isTrainedPersonnelRequirement === true',
  'row?.personnelTrainingRequirements',
  'requirement?.personnelRequired ??',
  'requirement?.required',
  'getSelectedTrainingDisplayLabel(code)',
  'missing > existing.missing'
]) {
  expect(helper.includes(token), `Live shortage helper missing ${token}`);
}
for (const forbidden of [
  'fetch(',
  'setInterval(',
  'MutationObserver',
  'scheduleMissionRequiredPersonnelPreload('
]) {
  expect(!helper.includes(forbidden), `Live shortage helper must not use ${forbidden}`);
}

const mutationFlush = extractFunction('flushMissionFinderMutationWork');
for (const token of [
  'const shouldRefreshTrainedPersonnelPanel =',
  'flags.missionContextChanged',
  'flags.vehicleListChanged',
  'flags.patientChanged',
  'missionPage &&',
  'wrapper &&',
  'invalidateLiveTrainedPersonnelDisplayCache();',
  'scheduleTrainedPersonnelPanelRefresh();'
]) {
  expect(mutationFlush.includes(token), `Mutation refresh path missing ${token}`);
}
expect(
  mutationFlush.indexOf('invalidateMissionContextCaches();') <
    mutationFlush.indexOf('invalidateLiveTrainedPersonnelDisplayCache();'),
  'Live mission caches must be invalidated before the panel rereads current shortages'
);
expect(
  !mutationFlush.includes('renderSelectedTrainedPersonnelPanel();'),
  'Mutation flush must not synchronously rebuild the trained-personnel DOM'
);
expect(
  !mutationFlush.includes('new MutationObserver'),
  'The live panel refresh must reuse the existing observer'
);

const scheduledRefresh = extractFunction(
  'scheduleTrainedPersonnelPanelRefresh'
);
for (const token of [
  'if (mfTrainedPersonnelMutationRefreshTimer) return;',
  'mfTrainedPersonnelMutationRefreshTimer = setTimeout(',
  'mfTrainedPersonnelMutationRefreshTimer = null;',
  'renderSelectedTrainedPersonnelPanel();',
  'MF_TRAINED_PERSONNEL_MUTATION_REFRESH_DELAY_MS'
]) {
  expect(
    scheduledRefresh.includes(token),
    `Scheduled trained-personnel refresh missing ${token}`
  );
}

const panel = extractFunction('renderSelectedTrainedPersonnelPanel');
for (const token of [
  'let liveMissingPersonnel = [];',
  'getLiveMissionTrainedPersonnelRequirementsForDisplay()',
  'const liveMissingTotal =',
  'current missing course',
  'trained personnel still missing',
  'Current Missing Personnel',
  '${requirement.missing} missing',
  'current live shortage',
  'requiredMarkup +',
  'liveMissingMarkup +',
  'selectedMarkup'
]) {
  expect(panel.includes(token), `Panel live-shortage display missing ${token}`);
}
expect(
  !panel.includes('requirement.missing -'),
  'MissionChief live shortage must not be reduced by selected checkboxes again'
);
expect(
  panel.includes('getSelectedTrainedPersonnelPanelModel()'),
  'Selected-vehicle training evidence must remain visible'
);
for (const forbidden of [
  'fetch(',
  'setInterval(',
  'MutationObserver',
  'scheduleMissionRequiredPersonnelPreload('
]) {
  expect(!panel.includes(forbidden), `Panel rendering must not use ${forbidden}`);
}

const helperRuntime = Function(
  `"use strict";\n` +
  `function hasMissionVehiclesOnSceneForTrainedPersonnelAuthority() { return true; }\n` +
  `function getCurrentMissionIdForQueueRestart() { return 'test-mission'; }\n` +
  `const MF_LIVE_TRAINED_PERSONNEL_DISPLAY_CACHE_MS = 1500;\n` +
  `let mfLiveTrainedPersonnelDisplayCache = {missionId:'',expiresAt:0,rows:[]};\n` +
  `function invalidateLiveTrainedPersonnelDisplayCache() { mfLiveTrainedPersonnelDisplayCache = {missionId:'',expiresAt:0,rows:[]}; }\n` +
  `function readMissionUpdateRows() { return [{isTrainedPersonnelRequirement:true, personnelTrainingRequirements:[` +
    `{code:'police_medic',required:4},` +
    `{code:'police_sergeant',required:2},` +
    `{code:'police_medic',required:3}` +
  `]}]; }\n` +
  `function normaliseOperationalRequirementRows(rows) { return rows; }\n` +
  `function getSelectedTrainingDisplayLabel(code) { return code; }\n` +
  `const mfDebugEnabled = false;\n` +
  `function debugLog() {}\n` +
  helper + '\n' +
  `return { getLiveMissionTrainedPersonnelRequirementsForDisplay };`
)();
const rows = helperRuntime
  .getLiveMissionTrainedPersonnelRequirementsForDisplay();
const byCode = new Map(rows.map(row => [row.code, row.missing]));
expect(byCode.get('police_medic') === 4, 'Live duplicate course must retain the maximum current shortage');
expect(byCode.get('police_sergeant') === 2, 'Live Police Sergeant shortage was not preserved');

console.log('Live trained-personnel missing display checks passed.');
