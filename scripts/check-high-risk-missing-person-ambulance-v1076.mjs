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
  const starts = markers
    .map(marker => source.indexOf(marker))
    .filter(index => index >= 0);

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

expect(source.includes('// @version      1.0.80'), 'Expected Command Nexus 1.0.79');
expect(source.includes('MISSION FINDER V10.6.140'), 'Expected Mission Finder V10.6.139');

for (const token of [
  "const MF_HIGH_RISK_MISSING_PERSON_AMBULANCE_KEY =",
  "'mf_high_risk_missing_person_ambulance_v1'",
  'let mfAlwaysSendAmbulanceToHighRiskMissingPerson =',
  "localStorage.getItem(\n            MF_HIGH_RISK_MISSING_PERSON_AMBULANCE_KEY\n        ) === 'true'",
  'mf-high-risk-missing-person-ambulance-box',
  'mf-high-risk-missing-person-ambulance-toggle',
  'Always include 1 Ambulance in Unit Finder',
  'Applies to High Risk and Very High Risk Missing Person missions.',
  'localStorage.setItem(\n                    MF_HIGH_RISK_MISSING_PERSON_AMBULANCE_KEY',
  'renderVehicleLoadList();'
]) {
  expect(source.includes(token), `Settings contract missing ${token}`);
}

const classifierSource = extractFunction('isConfiguredHighRiskMissingPersonMission');
for (const token of [
  "replace(/[^a-z0-9]+/g, ' ')",
  '/\\b(?:very\\s+)?high\\s+risk\\s+missing\\s+persons?\\b/'
]) {
  expect(classifierSource.includes(token), `Mission classifier missing ${token}`);
}

const classifyMission = new Function(
  'getCurrentMissionName',
  `${classifierSource}; return isConfiguredHighRiskMissingPersonMission;`
)(() => 'High Risk Missing Person');

for (const title of [
  'High Risk Missing Person',
  'Very High Risk Missing Person',
  'Very-high-risk missing person',
  'HIGH RISK MISSING PERSONS'
]) {
  expect(classifyMission(title) === true, `Expected target mission title: ${title}`);
}

for (const title of [
  'Medium Risk Missing Person',
  'Low Risk Missing Person',
  'High Risk Incident',
  'Missing Person',
  'Very High Building Fire'
]) {
  expect(classifyMission(title) === false, `Unexpected target mission title: ${title}`);
}

const addRequirementSource = extractFunction(
  'addConfiguredHighRiskMissingPersonAmbulanceRequirement'
);
for (const token of [
  '!mfAlwaysSendAmbulanceToHighRiskMissingPerson',
  '!isConfiguredHighRiskMissingPersonMission()',
  'isAmbulanceTransportRequest(',
  "unitName: 'Ambulance'",
  'stillNeeded: 1',
  "source:\n                    'settings-high-risk-missing-person-ambulance'",
  'configuredHighRiskMissingPersonAmbulance:\n                    true'
]) {
  expect(addRequirementSource.includes(token), `Requirement helper missing ${token}`);
}

function buildAddRequirement({ enabled, targetMission }) {
  return new Function(
    'mfAlwaysSendAmbulanceToHighRiskMissingPerson',
    'isConfiguredHighRiskMissingPersonMission',
    'isAmbulanceTransportRequest',
    'resolveUnitName',
    `${addRequirementSource}; return addConfiguredHighRiskMissingPersonAmbulanceRequirement;`
  )(
    enabled,
    () => targetMission,
    (originalName, mappedName) => {
      const values = [originalName, mappedName]
        .map(value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim());
      return values.some(value => value === 'ambulance' || value === 'ambulances' || value === 'ambulance x 01');
    },
    value => value
  );
}

const baseRows = [{ unitName: 'Police Car', stillNeeded: 3 }];

const disabledRows = buildAddRequirement({ enabled: false, targetMission: true })(baseRows);
expect(disabledRows.length === 1, 'Disabled setting must not add an Ambulance');
expect(disabledRows !== baseRows, 'Disabled helper must not return the mutable source array');

const nonTargetRows = buildAddRequirement({ enabled: true, targetMission: false })(baseRows);
expect(nonTargetRows.length === 1, 'Non-target mission must not add an Ambulance');

const addedRows = buildAddRequirement({ enabled: true, targetMission: true })(baseRows);
expect(addedRows.length === 2, 'Target mission must add exactly one requirement row');
const configuredRows = addedRows.filter(row => row.configuredHighRiskMissingPersonAmbulance === true);
expect(configuredRows.length === 1, 'Target mission must add one configured Ambulance marker');
expect(configuredRows[0].unitName === 'Ambulance' && configuredRows[0].stillNeeded === 1, 'Configured row must request Ambulance x1');

const existingAmbulanceRows = buildAddRequirement({ enabled: true, targetMission: true })([
  ...baseRows,
  { unitName: 'Ambulance', stillNeeded: 1 }
]);
expect(existingAmbulanceRows.length === 2, 'Existing Ambulance requirement must prevent a duplicate');
expect(existingAmbulanceRows.filter(row => row.unitName === 'Ambulance').length === 1, 'Existing Ambulance row must remain single');

const officerOnlyRows = buildAddRequirement({ enabled: true, targetMission: true })([
  ...baseRows,
  { unitName: 'Ambulance Officer', stillNeeded: 1 }
]);
expect(officerOnlyRows.some(row => row.configuredHighRiskMissingPersonAmbulance === true), 'Ambulance Officer must not satisfy the ordinary Ambulance rule');

const zeroAmbulanceRows = buildAddRequirement({ enabled: true, targetMission: true })([
  ...baseRows,
  { unitName: 'Ambulance', stillNeeded: 0 }
]);
expect(zeroAmbulanceRows.some(row => row.configuredHighRiskMissingPersonAmbulance === true), 'A zero-quantity Ambulance row must not suppress the configured minimum');

const preloadedDisplay = extractFunction('getPreloadedMissionVehicleRequirementsForDisplay');
expect(
  preloadedDisplay.includes('addConfiguredHighRiskMissingPersonAmbulanceRequirement(\n            cache.rows\n        )'),
  'Preloaded Vehicle Load display must include the configured Ambulance row'
);
expect(
  preloadedDisplay.includes('hasCurrentMissionVehicleRequirementAuthorityForDisplay()'),
  'Preloaded display must preserve current live shortage authority'
);

const processRows = extractFunction('processRequirementRows');
for (const token of [
  'options = {}',
  'includeConfiguredHighRiskMissingPersonAmbulance === true',
  'addConfiguredHighRiskMissingPersonAmbulanceRequirement(',
  "'HIGH-RISK MISSING PERSON AMBULANCE'"
]) {
  expect(processRows.includes(token), `Selection pipeline missing ${token}`);
}
expect(
  processRows.indexOf('normaliseOperationalRequirementRows(') <
    processRows.indexOf('addConfiguredHighRiskMissingPersonAmbulanceRequirement('),
  'Configured Ambulance must be added after requirement authority normalization'
);

const combined = extractFunction('handleCombinedLogic');
expect(
  (combined.match(/includeConfiguredHighRiskMissingPersonAmbulance:/g) || []).length === 3,
  'Fresh Unit Finder must opt in through attachment, visible fallback and legacy fallback routes'
);

const currentMissingIndex = combined.indexOf("'CURRENT MISSING REQUIREMENTS'");
expect(currentMissingIndex >= 0, 'Current Missing Requirements route missing');
const currentMissingWindow = combined.slice(currentMissingIndex - 220, currentMissingIndex + 220);
expect(
  !currentMissingWindow.includes('includeConfiguredHighRiskMissingPersonAmbulance'),
  'Current Missing Requirements must not re-add the configured Ambulance'
);

for (const sourceLabel of ["'MISSION HELP ATTACHMENT'", "'VISIBLE FALLBACK'"]) {
  const index = combined.indexOf(sourceLabel);
  expect(index >= 0, `Missing fresh source route ${sourceLabel}`);
  const window = combined.slice(index - 150, index + 350);
  expect(
    window.includes('includeConfiguredHighRiskMissingPersonAmbulance:'),
    `${sourceLabel} must enable the configured Ambulance rule`
  );
}

const processVehicles = extractFunction('processVehicles');
expect(processVehicles.includes('options = {}'), 'Legacy fallback must accept rule options');
expect(processVehicles.includes("'fallback vehicle list',\n            options"), 'Legacy fallback must pass rule options to processing');

expect(
  source.includes('alwaysSendAmbulanceToHighRiskMissingPerson:'),
  'Diagnostic export must include the setting state'
);
expect(
  source.includes('highRiskMissingPersonMission:'),
  'Diagnostic export must include the current mission classification'
);

for (const lockedContract of [
  '/* Attached Vehicle Load drawer V1.0.72. */',
  '/* Vehicle drawer top alignment and motion V1.0.73. */',
  'function hasCurrentMissionVehicleRequirementAuthorityForDisplay()',
  'function waitForMissionUpdateBeforeUnitFinder('
]) {
  expect(source.includes(lockedContract), `Locked contract changed: ${lockedContract}`);
}

console.log('High-risk Missing Person Ambulance setting checks passed.');
