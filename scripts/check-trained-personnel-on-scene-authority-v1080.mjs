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

expect(
  source.includes('// @version      1.0.80'),
  'Expected Command Nexus 1.0.80'
);
expect(
  source.includes(' * MODULE 2: MISSION FINDER V10.6.140'),
  'Expected Mission Finder V10.6.140'
);

const rowClassifier = extractFunction(
  'isMissionDefinitionRequiredPersonnelRequirementRow'
);
for (const token of [
  'missionDefinitionRequiredPersonnel',
  "'mission-definition-required-personnel'"
]) {
  expect(
    rowClassifier.includes(token),
    `Static Required Personnel classifier missing ${token}`
  );
}

const sceneDetector = extractFunction(
  'hasMissionVehiclesOnSceneForTrainedPersonnelAuthority'
);
for (const token of [
  'getMissionAccessibleDocuments()',
  '#mission_vehicle_at_mission tbody tr[id^="vehicle_row"]',
  '#mission_vehicle_at_mission tr[id^="vehicle_row"]',
  'candidateDocument.querySelector('
]) {
  expect(
    sceneDetector.includes(token),
    `On-scene detector missing ${token}`
  );
}
expect(
  !sceneDetector.includes('#mission_vehicle_driving'),
  'En-route vehicles must not suppress the initial course requirements'
);

const sceneFilter = extractFunction(
  'filterMissionDefinitionRequiredPersonnelForScene'
);
for (const token of [
  'vehiclesOnScene =',
  'hasMissionVehiclesOnSceneForTrainedPersonnelAuthority()',
  'if (!vehiclesOnScene)',
  'isMissionDefinitionRequiredPersonnelRequirementRow('
]) {
  expect(sceneFilter.includes(token), `Scene filter missing ${token}`);
}

const preload = extractFunction(
  'getPreloadedMissionTrainedPersonnelRequirements'
);
const preloadSceneIndex = preload.indexOf(
  'hasMissionVehiclesOnSceneForTrainedPersonnelAuthority()'
);
const preloadCacheIndex = preload.indexOf(
  'getMissionRequirementPreloadState()'
);
expect(
  preloadSceneIndex >= 0 &&
  preloadCacheIndex > preloadSceneIndex &&
  preload.includes('return [];'),
  'Panel preload must stop before reading static Required Personnel when vehicles are on scene'
);

const process = extractFunction('processRequirementRows');
for (const token of [
  'const missionVehiclesOnSceneForTrainedPersonnel =',
  'filterMissionDefinitionRequiredPersonnelForScene(',
  'requirementRowCountBeforeSceneAuthority',
  "'TRAINED PERSONNEL LIVE AUTHORITY'",
  'hasExplicitCurrentMissingRequirementRows(',
  'isMissionDefinitionRequiredPersonnelRequirementRow',
  'requirementRows = readMissionUpdateRows();'
]) {
  expect(process.includes(token), `Initial authority path missing ${token}`);
}
expect(
  process.indexOf('filterMissionDefinitionRequiredPersonnelForScene(') <
    process.indexOf('hasExplicitCurrentMissingRequirementRows('),
  'Static personnel rows must be filtered before the live authority decision'
);
expect(
  process.includes('!suppliedHasMissionDefinitionPersonnel'),
  'No-vehicle static personnel authority must remain available'
);

const panel = extractFunction('renderSelectedTrainedPersonnelPanel');
for (const token of [
  'missionVehiclesOnSceneForTrainedPersonnel',
  'hasMissionVehiclesOnSceneForTrainedPersonnelAuthority()',
  'Vehicles are on scene. Live personnel and course shortages are authoritative.',
  'Mission Required Personnel is shown only before the first vehicle arrives on scene.'
]) {
  expect(panel.includes(token), `Trained Personnel panel missing ${token}`);
}
expect(
  !panel.includes('scheduleMissionRequiredPersonnelPreload('),
  'Panel rendering must remain side-effect free'
);

const filterRuntime = Function(
  `"use strict";\n${rowClassifier}\n` +
  `function hasMissionVehiclesOnSceneForTrainedPersonnelAuthority() { return false; }\n` +
  `${sceneFilter}\n` +
  `return { filterMissionDefinitionRequiredPersonnelForScene };`
)();

const rows = [
  {
    id: 'static-course',
    missionDefinitionRequiredPersonnel: true,
    isTrainedPersonnelRequirement: true
  },
  {
    id: 'static-source',
    source: 'mission-definition-required-personnel'
  },
  {
    id: 'live-course',
    isTrainedPersonnelRequirement: true,
    updateSource: 'Missing Personnel'
  },
  { id: 'ordinary-vehicle' }
];
expect(
  filterRuntime
    .filterMissionDefinitionRequiredPersonnelForScene(rows, false)
    .length === 4,
  'All rows must remain before any vehicle is on scene'
);
const filtered = filterRuntime
  .filterMissionDefinitionRequiredPersonnelForScene(rows, true);
expect(
  filtered.map(row => row.id).join(',') ===
    'live-course,ordinary-vehicle',
  'Only mission-definition personnel/course rows should be removed on scene'
);

console.log(
  'Trained-personnel on-scene authority checks passed.'
);
