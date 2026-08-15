#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

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

expect(source.includes('// @version      1.0.117'), 'Expected Command Nexus 1.0.104');
expect(source.includes(' * MODULE 2: MISSION FINDER V10.6.158'), 'Expected Mission Finder V10.6.153');

for (const token of [
  "'mf_high_risk_missing_person_ambulance_v1'",
  'mf-high-risk-missing-person-ambulance-toggle',
  'Always include 1 Ambulance in Unit Finder',
  "'mf_ambulance_officer_threshold_enabled_v1'",
  "'mf_ambulance_officer_threshold_v1'",
  'MF_AMBULANCE_OFFICER_THRESHOLD_DEFAULT = 5',
  'MF_AMBULANCE_OFFICER_THRESHOLD_MIN = 0',
  'MF_AMBULANCE_OFFICER_THRESHOLD_MAX = 99',
  'mf-ambulance-officer-threshold-toggle',
  'mf-ambulance-officer-threshold-input',
  'Automatically add 1 Ambulance Officer',
  'When required Ambulances exceed',
  'Example: 5 adds one Ambulance Officer when 6 or more Ambulances are required.',
  'MF_AMBULANCE_OFFICER_THRESHOLD_ENABLED_KEY',
  'MF_AMBULANCE_OFFICER_THRESHOLD_KEY',
  'renderVehicleLoadList();'
]) expect(source.includes(token), `Settings contract missing ${token}`);

const normaliser = extractFunction('normaliseConfiguredAmbulanceOfficerThreshold');
const normaliseContext = {
  MF_AMBULANCE_OFFICER_THRESHOLD_DEFAULT: 5,
  MF_AMBULANCE_OFFICER_THRESHOLD_MIN: 0,
  MF_AMBULANCE_OFFICER_THRESHOLD_MAX: 99,
  result: null
};
vm.runInNewContext(
  `${normaliser}\nresult = [` +
  `normaliseConfiguredAmbulanceOfficerThreshold(null),` +
  `normaliseConfiguredAmbulanceOfficerThreshold(''),` +
  `normaliseConfiguredAmbulanceOfficerThreshold('-4'),` +
  `normaliseConfiguredAmbulanceOfficerThreshold('0'),` +
  `normaliseConfiguredAmbulanceOfficerThreshold('6'),` +
  `normaliseConfiguredAmbulanceOfficerThreshold('120')` +
  `];`,
  normaliseContext
);
expect(JSON.stringify(normaliseContext.result) === JSON.stringify([5, 5, 0, 0, 6, 99]), `Threshold normalisation failed: ${JSON.stringify(normaliseContext.result)}`);

const officerMatcher = extractFunction('isAmbulanceOfficerRequirement');
const officerContext = { result: null };
vm.runInNewContext(
  `${officerMatcher}\nresult = {` +
  ` yes: ['Ambulance Officer', 'Ambulance Officers', 'Required Ambulance Officer', '2 Ambulance Officers'].map(value => isAmbulanceOfficerRequirement(value, value)),` +
  ` no: ['Ambulance', 'Ambulances', 'Ambulance Officer Training', 'Police Officer'].map(value => isAmbulanceOfficerRequirement(value, value))` +
  `};`,
  officerContext
);
expect(officerContext.result.yes.every(Boolean), `Officer alias rejected: ${JSON.stringify(officerContext.result.yes)}`);
expect(officerContext.result.no.every(value => value === false), `Non-officer alias captured: ${JSON.stringify(officerContext.result.no)}`);

const thresholdHelper = extractFunction('addConfiguredAmbulanceOfficerThresholdRequirement');
function buildThresholdHelper({ enabled, threshold, alreadySatisfied = false }) {
  return new Function(
    'mfAmbulanceOfficerThresholdEnabled',
    'mfAmbulanceOfficerThreshold',
    'normaliseConfiguredAmbulanceOfficerThreshold',
    'isAmbulanceTransportRequest',
    'isAmbulanceOfficerRequirement',
    'hasAmbulanceOfficerThresholdAlreadySatisfied',
    'resolveUnitName',
    `${thresholdHelper}; return addConfiguredAmbulanceOfficerThresholdRequirement;`
  )(
    enabled,
    threshold,
    value => Math.min(99, Math.max(0, Number.parseInt(String(value), 10) || 0)),
    (originalName, mappedName) => {
      const values = [originalName, mappedName].map(value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim());
      return values.some(value => value === 'ambulance' || value === 'ambulances' || value === 'ambulance x 01');
    },
    (originalName, mappedName) => [originalName, mappedName].some(value => /^(?:required\s+)?(?:\d+\s+)?ambulance officers?$/i.test(String(value || '').trim())),
    () => alreadySatisfied,
    value => value
  );
}

const freshPatientRowsHelper = extractFunction(
  'buildFreshAmbulanceOfficerThresholdAdditionalRows'
);
const buildFreshPatientRows = new Function(
  'isAmbulanceTransportRequest',
  'resolveUnitName',
  `${freshPatientRowsHelper}; return buildFreshAmbulanceOfficerThresholdAdditionalRows;`
)(
  (originalName, mappedName) => {
    const values = [originalName, mappedName].map(value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim());
    return values.some(value => value === 'ambulance' || value === 'ambulances' || value === 'ambulance x 01');
  },
  value => value
);

const freshBadgeOnlyRows = buildFreshPatientRows([], 6);
expect(freshBadgeOnlyRows.length === 1, 'A fresh patient badge total must create one threshold-only Ambulance row');
expect(freshBadgeOnlyRows[0].unitName === 'Ambulance x 01', 'Fresh patient badge demand must use the ordinary Ambulance identity');
expect(freshBadgeOnlyRows[0].stillNeeded === 6, 'Fresh patient badge demand must preserve the calculated Ambulance total');
expect(freshBadgeOnlyRows[0].configuredFreshPatientAmbulanceTotal === true, 'Fresh patient badge threshold row must be diagnostic');

const freshBadgeTrigger = buildThresholdHelper({ enabled: true, threshold: 5 })(
  [],
  freshBadgeOnlyRows
);
expect(freshBadgeTrigger.some(row => row.configuredAmbulanceOfficerThreshold === true), 'Six fresh patient-badge Ambulances must trigger one Officer at threshold five');

const freshBadgeEqual = buildThresholdHelper({ enabled: true, threshold: 5 })(
  [],
  buildFreshPatientRows([], 5)
);
expect(!freshBadgeEqual.some(row => row.configuredAmbulanceOfficerThreshold), 'Five fresh patient-badge Ambulances must not trigger at threshold five');

const mergedFreshPatientRows = buildFreshPatientRows([
  { unitName: 'Ambulance', stillNeeded: 2 },
  { unitName: 'Critical Care', stillNeeded: 1 },
  { unitName: 'Ambulance Officer', stillNeeded: 1 }
], 6);
expect(mergedFreshPatientRows.filter(row => row.unitName === 'Ambulance x 01').length === 1, 'Patient badge and explicit Ambulance rows must collapse to one threshold total');
expect(mergedFreshPatientRows.find(row => row.unitName === 'Ambulance x 01')?.stillNeeded === 6, 'Fresh patient threshold must use the larger badge total without double-counting explicit demand');
expect(mergedFreshPatientRows.some(row => row.unitName === 'Critical Care'), 'Non-Ambulance patient requirements must be preserved');
expect(mergedFreshPatientRows.some(row => row.unitName === 'Ambulance Officer'), 'Explicit patient Ambulance Officer demand must be preserved for duplicate prevention');

const largerExplicitPatientRows = buildFreshPatientRows([
  { unitName: 'Ambulances', stillNeeded: 7 }
], 6);
expect(largerExplicitPatientRows[0].stillNeeded === 7, 'A larger explicit patient Ambulance total must outrank the badge total');

const base = [{ unitName: 'Police Car', stillNeeded: 2 }];
const disabled = buildThresholdHelper({ enabled: false, threshold: 5 })([
  ...base,
  { unitName: 'Ambulance', stillNeeded: 8 }
]);
expect(disabled.length === 2, 'Disabled setting must not add an Ambulance Officer');

const exact = buildThresholdHelper({ enabled: true, threshold: 5 })([
  ...base,
  { unitName: 'Ambulance', stillNeeded: 5 }
]);
expect(!exact.some(row => row.configuredAmbulanceOfficerThreshold), 'Exactly X Ambulances must not trigger a more-than-X rule');

const over = buildThresholdHelper({ enabled: true, threshold: 5 })([
  ...base,
  { unitName: 'Ambulance', stillNeeded: 6 }
]);
const configured = over.filter(row => row.configuredAmbulanceOfficerThreshold === true);
expect(configured.length === 1, 'More than X Ambulances must add exactly one configured Officer');
expect(configured[0].unitName === 'Ambulance Officer' && configured[0].stillNeeded === 1, 'Configured row must request one Ambulance Officer');
expect(configured[0].configuredAmbulanceCount === 6 && configured[0].configuredAmbulanceThreshold === 5, 'Configured diagnostics must record count and threshold');

const summed = buildThresholdHelper({ enabled: true, threshold: 5 })([
  { unitName: 'Ambulance', stillNeeded: 3 },
  { unitName: 'Ambulances', stillNeeded: 3 }
]);
expect(summed.some(row => row.configuredAmbulanceOfficerThreshold === true), 'Multiple Ambulance rows must be summed');

const combinedPatientDemand = buildThresholdHelper({ enabled: true, threshold: 5 })(
  [{ unitName: 'Ambulance', stillNeeded: 3 }],
  [{ unitName: 'Ambulance', stillNeeded: 3 }]
);
expect(combinedPatientDemand.some(row => row.configuredAmbulanceOfficerThreshold === true), 'Mission and patient Ambulance rows must be combined');
expect(combinedPatientDemand.find(row => row.configuredAmbulanceOfficerThreshold)?.configuredAmbulanceCount === 6, 'Combined diagnostic count must include patient Ambulance demand');

const existingOfficer = buildThresholdHelper({ enabled: true, threshold: 5 })([
  { unitName: 'Ambulance', stillNeeded: 7 },
  { unitName: 'Ambulance Officer', stillNeeded: 1 }
]);
expect(existingOfficer.filter(row => /Ambulance Officer/.test(row.unitName)).length === 1, 'Existing Ambulance Officer demand must prevent a duplicate');

const patientOfficer = buildThresholdHelper({ enabled: true, threshold: 5 })(
  [{ unitName: 'Ambulance', stillNeeded: 7 }],
  [{ unitName: 'Required Ambulance Officer', stillNeeded: 1 }]
);
expect(!patientOfficer.some(row => row.configuredAmbulanceOfficerThreshold === true), 'A patient Ambulance Officer requirement must prevent a duplicate configured Officer');

const alreadySatisfiedOfficer = buildThresholdHelper({
  enabled: true,
  threshold: 5,
  alreadySatisfied: true
})([
  { unitName: 'Ambulance', stillNeeded: 8 }
]);
expect(
  !alreadySatisfiedOfficer.some(row => row.configuredAmbulanceOfficerThreshold === true),
  'An Officer already selected or satisfying the live mission must prevent a duplicate configured Officer'
);

const zeroOfficer = buildThresholdHelper({ enabled: true, threshold: 0 })([
  { unitName: 'Ambulance', stillNeeded: 1 }
]);
expect(zeroOfficer.some(row => row.configuredAmbulanceOfficerThreshold === true), 'Threshold zero must allow an Officer for any positive Ambulance demand');

const wrapper = extractFunction('applyConfiguredFreshMissionVehicleRequirements');
expect(wrapper.includes('addConfiguredHighRiskMissingPersonAmbulanceRequirement('), 'Fresh-rule wrapper must preserve the high-risk Ambulance rule');
expect(wrapper.includes('addConfiguredAmbulanceOfficerThresholdRequirement('), 'Fresh-rule wrapper must apply the Ambulance Officer rule');
expect(wrapper.includes('additionalRows = []'), 'Fresh-rule wrapper must accept current patient demand');
expect(wrapper.includes('additionalRows\n        );'), 'Fresh-rule wrapper must forward patient rows to the threshold helper');
expect(wrapper.indexOf('addConfiguredAmbulanceOfficerThresholdRequirement(') < wrapper.indexOf('addConfiguredHighRiskMissingPersonAmbulanceRequirement('), 'Ambulance Officer must evaluate the final rows after the high-risk Ambulance rule');

const officerVehicleMatcher = extractFunction('isAmbulanceOfficerVehicleCheckbox');
for (const token of [
  "typeIds.includes('34')",
  'if (typeIds.length > 0)',
  "normalised === 'ambulance officer'"
]) expect(officerVehicleMatcher.includes(token), `Exact type-34 Ambulance Officer matcher missing ${token}`);

const buildOfficerVehicleMatcher = ({ typeIds = [], values = [] }) => new Function(
  'getVehicleTypeIdentifiers',
  'getExtendedVehicleValues',
  'normaliseVehicleText',
  `${officerVehicleMatcher}; return isAmbulanceOfficerVehicleCheckbox;`
)(
  () => typeIds,
  () => values,
  value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
);

expect(buildOfficerVehicleMatcher({ typeIds: ['34'] })({}) === true, 'Exact MissionChief type 34 must match Ambulance Officer');
expect(buildOfficerVehicleMatcher({ typeIds: ['5'], values: ['Ambulance Officer'] })({}) === false, 'A known non-34 vehicle type must not match by label');
expect(buildOfficerVehicleMatcher({ values: ['Ambulance Officer'] })({}) === true, 'Exact-name fallback must work only when no type ID is exposed');
expect(buildOfficerVehicleMatcher({ values: ['Ambulance'] })({}) === false, 'Ordinary Ambulance must not satisfy the Officer matcher');

const satisfiedHelper = extractFunction('hasAmbulanceOfficerThresholdAlreadySatisfied');
function evaluateSatisfied({ selected = 0, live = false, tracked = false }) {
  return new Function(
    'getLocalMissionInstanceKey',
    'mfMissionUpdateRowsCache',
    'countSelectedMatchingVehicles',
    'vehicleLoadState',
    `${satisfiedHelper}; return hasAmbulanceOfficerThresholdAlreadySatisfied();`
  )(
    () => 'mission:299',
    { missionKey: 'mission:299', ambulanceOfficerSatisfied: live },
    () => selected,
    { ambulanceOfficer: tracked }
  );
}
expect(evaluateSatisfied({ selected: 1 }) === true, 'An already-selected Officer must satisfy the threshold');
expect(evaluateSatisfied({ live: true }) === true, 'A confirmed satisfied live Officer requirement must satisfy the threshold');
expect(evaluateSatisfied({ tracked: true }) === true, 'An Officer selected by an earlier mission pass must satisfy the threshold');
expect(evaluateSatisfied({}) === false, 'No selected, live or tracked Officer must leave the threshold actionable');

const allMatchingVehicles = extractFunction('getAllMatchingVehicleCheckboxes');
expect(allMatchingVehicles.includes('isAmbulanceOfficerVehicleCheckbox('), 'Unit Finder must use the exact type-34 Ambulance Officer matcher');

const selectedMatchingVehicles = extractFunction('countSelectedMatchingVehicles');
expect(selectedMatchingVehicles.includes('isAmbulanceOfficerVehicleCheckbox('), 'Selected-unit duplicate detection must use the exact type-34 matcher');

const preloaded = extractFunction('getPreloadedMissionVehicleRequirementsForDisplay');
expect(preloaded.includes('applyConfiguredFreshMissionVehicleRequirements('), 'Preloaded Vehicle Load must show the configured Officer row');
expect(preloaded.includes('cache.rows'), 'Preloaded Vehicle Load must retain mission rows');
expect(preloaded.includes('readUnitFinderPatientRequirementRows()'), 'Preloaded Vehicle Load must include current patient Ambulance demand');
expect(preloaded.includes('buildFreshAmbulanceOfficerThresholdAdditionalRows('), 'Preloaded Vehicle Load must include fresh patient badge Ambulance demand');
expect(preloaded.includes('findPatientCount()'), 'Preloaded Vehicle Load must read the current fresh patient total');
expect(preloaded.includes('hasCurrentMissionVehicleRequirementAuthorityForDisplay()'), 'Live shortage authority must continue to suppress static configured display');

const freshRuleMatch =
  /requirementRows\s*=\s*applyConfiguredFreshMissionVehicleRequirements\(\s*requirementRows\s*,\s*options\s*\.ambulanceOfficerThresholdAdditionalRows\s*\);/.exec(source);
expect(
  source.includes('includeConfiguredHighRiskMissingPersonAmbulance === true'),
  'Fresh Unit Finder configured-rule gate missing'
);
expect(
  freshRuleMatch,
  'Selection pipeline must apply the combined fresh-mission settings rules'
);
const freshRuleCallIndex = freshRuleMatch.index;
const normaliseIndex = source.lastIndexOf(
  'requirementRows = normaliseOperationalRequirementRows(',
  freshRuleCallIndex
);
expect(
  normaliseIndex >= 0 && normaliseIndex < freshRuleCallIndex,
  'Configured rules must run after requirement authority normalisation'
);
expect(source.includes("'HIGH-RISK MISSING PERSON AMBULANCE'"), 'High-risk debug contract missing');
expect(source.includes("'AMBULANCE OFFICER THRESHOLD'"), 'Ambulance Officer debug contract missing');

const combined = extractFunction('handleCombinedLogic');
expect((combined.match(/includeConfiguredHighRiskMissingPersonAmbulance:/g) || []).length === 3, 'Fresh attachment, visible fallback and legacy fallback routes must keep the configured-rule opt-in');
expect((combined.match(/ambulanceOfficerThresholdAdditionalRows:/g) || []).length === 3, 'All fresh Unit Finder routes must pass patient demand to the threshold');
expect(combined.includes('buildFreshAmbulanceOfficerThresholdAdditionalRows('), 'Fresh Unit Finder must combine patient rows with the calculated patient badge total');
expect(combined.includes('patientRequirementResult.rows,'), 'Current explicit patient rows must feed the fresh threshold total');
expect(combined.includes('patientCount\n            );'), 'The calculated fresh patient count must feed the threshold total');
const currentMissingIndex = combined.indexOf("'CURRENT MISSING REQUIREMENTS'");
expect(currentMissingIndex >= 0, 'Current Missing Requirements route missing');
const currentMissingWindow = combined.slice(currentMissingIndex - 350, currentMissingIndex + 450);
expect(currentMissingWindow.includes('includeConfiguredAmbulanceOfficerThreshold:'), 'Unit Finder live-authority route must enable the Ambulance Officer threshold');
expect(!currentMissingWindow.includes('includeConfiguredHighRiskMissingPersonAmbulance'), 'Unit Finder live-authority route must not re-enable unrelated fresh-mission rules');
expect(!currentMissingWindow.includes('ambulanceOfficerThresholdAdditionalRows'), 'Unit Finder live-authority route must use only its authoritative live Ambulance rows');

const missionUpdate = extractFunction('handleMissionUpdateUnits');
expect(missionUpdate.includes('normaliseOperationalRequirementRows('), 'Mission Update must normalise its authoritative rows');
expect(missionUpdate.includes('addConfiguredAmbulanceOfficerThresholdRequirement('), 'Mission Update must apply the Ambulance Officer threshold');
expect(missionUpdate.indexOf('normaliseOperationalRequirementRows(') < missionUpdate.indexOf('addConfiguredAmbulanceOfficerThresholdRequirement('), 'Mission Update must apply the threshold after normalisation');
expect(missionUpdate.includes('vehicleLoadState.ambulanceOfficer =\n                    true;'), 'Mission Update must remember a selected Officer for later passes');

const processRows = extractFunction('processRequirementRows');
expect(processRows.includes('includeConfiguredAmbulanceOfficerThreshold === true'), 'Shared Unit Finder processing must support the live threshold option');
expect(processRows.includes('addConfiguredAmbulanceOfficerThresholdRequirement('), 'Shared Unit Finder processing must apply the threshold-only helper');
expect(processRows.includes('vehicleLoadState.ambulanceOfficer =\n                    true;'), 'Unit Finder must remember a selected Officer for later passes');

const latePatient = extractFunction('applyLatePatientCount');
expect(latePatient.startsWith('async function applyLatePatientCount('), 'Late fresh patient recovery must support the asynchronous shared selector');
expect(latePatient.includes('buildFreshAmbulanceOfficerThresholdAdditionalRows('), 'Late fresh patient recovery must feed its calculated Ambulance total to the threshold');
expect(latePatient.includes('includeConfiguredAmbulanceOfficerThreshold:'), 'Late fresh patient recovery must enable the Officer threshold');
expect(latePatient.includes('await processRequirementRows('), 'Late fresh patient recovery must select the configured Officer through the shared exact matcher');

const lateRecovery = extractFunction('recoverLateMissionRequirements');
expect((lateRecovery.match(/includeConfiguredHighRiskMissingPersonAmbulance:/g) || []).length === 3, 'Every late fresh mission fallback must retain the configured fresh rules');
expect((lateRecovery.match(/buildFreshAmbulanceOfficerThresholdAdditionalRows\(/g) || []).length === 3, 'Every late fresh mission fallback must pass fresh patient demand to the Officer threshold');

const autoModeStart = source.indexOf('async function runAutoModeLoop()');
const autoModeEnd = source.indexOf('function suspendMissionFinderRuntimeForPageHide(', autoModeStart);
const autoMode = source.slice(autoModeStart, autoModeEnd);
expect(autoMode.includes('handleCombinedLogic({'), 'Auto Mode must continue through the shared Unit Finder route');
expect(autoMode.includes('handleMissionUpdateUnits('), 'Auto Mode post-selection updates must continue through the fixed Mission Update route');

for (const token of [
  'ambulanceOfficerThresholdEnabled:',
  'ambulanceOfficerThreshold:',
  'alwaysSendAmbulanceToHighRiskMissingPerson:',
  'highRiskMissingPersonMission:'
]) expect(source.includes(token), `Diagnostic contract missing ${token}`);

console.log('PASS: issue #299 Ambulance Officer threshold works through fresh patient-badge Unit Finder, late fresh recovery, Auto Mode and Mission Update, selects exact type 34 and prevents duplicate Officers.');
