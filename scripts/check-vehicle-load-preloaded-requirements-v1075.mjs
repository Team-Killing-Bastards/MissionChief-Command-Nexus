#!/usr/bin/env node
import fs from 'node:fs';

const source = fs.readFileSync('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(name) {
  const markers = [`function ${name}(`, `async function ${name}(`];
  const starts = markers.map(marker => source.indexOf(marker)).filter(index => index >= 0);
  if (starts.length === 0) fail(`Missing function ${name}`);
  const start = Math.min(...starts);
  const parameterStart = source.indexOf('(', start);
  let parameterDepth = 0;
  let bodyStart = -1;
  let quote = '';
  let escaped = false;

  for (let index = parameterStart; index < source.length; index += 1) {
    const character = source[index];
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
    if (character === '(') parameterDepth += 1;
    if (character === ')') {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        bodyStart = source.indexOf('{', index);
        break;
      }
    }
  }

  if (bodyStart < 0) fail(`Missing body for ${name}`);
  let depth = 0;
  quote = '';
  escaped = false;

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

expect(source.includes('// @version      1.0.88'), 'Expected Command Nexus 1.0.79');
expect(source.includes('MISSION FINDER V10.6.144'), 'Expected Mission Finder V10.6.139');

const authority = extractFunction('hasCurrentMissionVehicleRequirementAuthorityForDisplay');
for (const token of [
  'readMissionUpdateRows({',
  'silent: true',
  'getExplicitCurrentMissingRequirementRows(',
  'hasVisibleCurrentMissingOnMissionTable()'
]) {
  expect(authority.includes(token), `Display authority guard missing ${token}`);
}

const model = extractFunction('getPreloadedMissionVehicleRequirementsForDisplay');
for (const token of [
  'getMissionRequirementPreloadState()',
  "cache.status !== 'loaded'",
  'hasCurrentMissionVehicleRequirementAuthorityForDisplay()',
  'row.isTrainedPersonnelRequirement !== true',
  '!row.patientRequirementType',
  'row.isPatientAlertFallback !== true',
  'shouldIgnoreRequiredMinimumRequirement(',
  'resolveUnitName(originalName)',
  'countSelectedMatchingVehicles(',
  'preloaded: true'
]) {
  expect(model.includes(token), `Preloaded Vehicle Load model missing ${token}`);
}

const render = extractFunction('renderVehicleLoadListNow');
for (const token of [
  'getMissionRequirementPreloadState()',
  'getPreloadedMissionVehicleRequirementsForDisplay()',
  'vehicleLoadState.rows.length === 0',
  'const displayRows =',
  'displayRows.reduce(',
  "'Requirements loaded'",
  "'Covered'",
  'Loading mission vehicle requirements...',
  'displayRows.map(row =>'
]) {
  expect(render.includes(token), `Vehicle Load renderer missing ${token}`);
}
for (const forbidden of [
  'preloadMissionRequiredPersonnel(',
  'scheduleMissionRequiredPersonnelPreload(',
  'readLiveMissionRequirements(',
  'fetch('
]) {
  expect(!render.includes(forbidden), `Vehicle Load renderer must remain side-effect free: ${forbidden}`);
}

const preload = extractFunction('preloadMissionRequiredPersonnel');
expect(preload.includes('renderSelectedTrainedPersonnelPanel();'), 'Trained Personnel refresh missing after preload');
expect(preload.includes('renderVehicleLoadList();'), 'Vehicle Load refresh missing after preload');

const buildModel = new Function(
  'getMissionRequirementPreloadState',
  'hasCurrentMissionVehicleRequirementAuthorityForDisplay',
  'addConfiguredHighRiskMissingPersonAmbulanceRequirement',
  'shouldIgnoreRequiredMinimumRequirement',
  'resolveUnitName',
  'countSelectedMatchingVehicles',
  `${model}; return getPreloadedMissionVehicleRequirementsForDisplay;`
)(
  () => ({
    status: 'loaded',
    rows: [
      { unitName: 'Fire Engine', stillNeeded: 3 },
      {
        unitName: 'Required trained personnel',
        stillNeeded: 2,
        isTrainedPersonnelRequirement: true
      },
      {
        unitName: 'Ambulance',
        stillNeeded: 4,
        patientRequirementType: 'ambulance'
      }
    ]
  }),
  () => false,
  rows => rows,
  () => false,
  name => name === 'Fire Engine' ? 'Fire Engine R/PUMP x 1' : name,
  () => 2
);

const freshRows = buildModel();
expect(freshRows.length === 1, 'Fresh mission model must keep ordinary vehicles and exclude trained/patient rows');
expect(freshRows[0].originalName === 'Fire Engine', 'Fresh mission row name changed');
expect(freshRows[0].mappedName === 'Fire Engine R/PUMP x 1', 'Fresh mission mapping was not reused');
expect(freshRows[0].selected === 2 && freshRows[0].required === 3, 'Selected/required coverage must update from current checkboxes');
expect(freshRows[0].status === 'retrying', 'Partial preloaded coverage must remain pending/retrying');

const blockedModel = new Function(
  'getMissionRequirementPreloadState',
  'hasCurrentMissionVehicleRequirementAuthorityForDisplay',
  'addConfiguredHighRiskMissingPersonAmbulanceRequirement',
  'shouldIgnoreRequiredMinimumRequirement',
  'resolveUnitName',
  'countSelectedMatchingVehicles',
  `${model}; return getPreloadedMissionVehicleRequirementsForDisplay;`
)(
  () => ({ status: 'loaded', rows: [{ unitName: 'Fire Engine', stillNeeded: 3 }] }),
  () => true,
  rows => rows,
  () => false,
  value => value,
  () => 0
);
expect(blockedModel().length === 0, 'Established mission authority must suppress static preloaded totals');

expect(source.includes('/* Attached Vehicle Load drawer V1.0.72. */'), 'Vehicle drawer UI contract changed');
expect(source.includes('/* Vehicle drawer top alignment and motion V1.0.73. */'), 'Vehicle drawer motion contract changed');

console.log('Fresh-mission preloaded Vehicle Load requirements checks passed.');
