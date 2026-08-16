#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const evidence = await readFile('docs/evidence/issue-17-medical-training-profiles.md', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Unable to find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = brace; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  fail(`Unterminated ${name}`);
}

function sliceBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) fail(`Unable to find ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) fail(`Unable to find ${endMarker}`);
  return source.slice(start, end);
}

const makeRuleSource = sliceBetween(
  'const makePoliceRule =',
  'const POLICE_TRAINING_LABELS'
);
const medicalDeclarations = sliceBetween(
  'const MEDICAL_RULES =',
  'const POLICE_ALL_RULES'
);
const context = { result: null };
vm.runInNewContext(
  `${makeRuleSource}\n${medicalDeclarations}\nresult = { rules: MEDICAL_RULES, all: MEDICAL_ALL_RULES, buildings: MEDICAL_PROFILE_BUILDING_TYPE_IDS };`,
  context
);

const rules = JSON.parse(JSON.stringify(context.result.rules));
const allRules = JSON.parse(JSON.stringify(context.result.all));
const buildings = JSON.parse(JSON.stringify(context.result.buildings));

const expectedRules = {
  ambulanceOfficer: { ids: ['34'], target: 1, training: ['ems_mobile_command'] },
  hart: { ids: ['27', '28', '30'], target: 2, training: ['hazard_response_ems'] },
  tacticalCommand: { ids: ['31'], target: 2, training: ['elw2_ems'] },
  sort: { ids: ['32', '33'], target: 2, training: ['special_operation_response'] },
  midwifery: { ids: ['95'], target: 2, training: ['midwife'] },
  specialistParamedic: { ids: ['96'], target: 2, training: ['paramedic_advanced'] },
  criticalCare: { ids: ['5'], target: 1, training: ['critical_care'] }
};

for (const [key, expected] of Object.entries(expectedRules)) {
  const rule = rules[key];
  expect(rule, `Missing Medical rule ${key}`);
  expect(
    JSON.stringify(rule.vehicleTypeIds) === JSON.stringify(expected.ids),
    `${key} vehicle-type mapping changed: ${JSON.stringify(rule.vehicleTypeIds)}`
  );
  expect(rule.target === expected.target, `${key} target must remain ${expected.target}`);
  expect(
    JSON.stringify(rule.trainingAll) === JSON.stringify(expected.training),
    `${key} training mapping changed: ${JSON.stringify(rule.trainingAll)}`
  );
}

expect(
  JSON.stringify(allRules.map(rule => rule.id)) === JSON.stringify([
    'medical_ambulance_officer',
    'medical_hart',
    'medical_tactical_command',
    'medical_sort',
    'medical_midwifery',
    'medical_specialist_paramedic',
    'medical_critical_care'
  ]),
  'Run all Medical must keep every specialist ahead of Critical Care'
);

expect(
  JSON.stringify(buildings) === JSON.stringify({
    ambulanceOfficer: ['2', '20', '22', '25'],
    hart: ['25'],
    tacticalCommand: ['2', '20', '21', '25'],
    sort: ['2', '20', '21', '25'],
    midwifery: ['2', '20', '21', '22', '32'],
    specialistParamedic: ['2', '20', '21', '22', '32'],
    all: ['2', '20', '21', '22', '25', '32']
  }),
  'Medical specialist building scopes changed'
);

const medicalProfiles = sliceBetween('        medical: {', '        fire: {');
for (const profileId of [
  'ambulance_officer',
  'hart',
  'midwifery',
  'sort',
  'specialist_paramedic',
  'tactical_command'
]) {
  expect(medicalProfiles.includes(`'${profileId}'`), `Missing Medical profile ${profileId}`);
}
expect(!medicalProfiles.includes('live: false'), 'No completed Medical profile may remain preview-only');
expect(
  medicalProfiles.includes("engine: 'personnel-rules'") &&
    medicalProfiles.includes('rules: MEDICAL_ALL_RULES') &&
    medicalProfiles.includes('batch: true'),
  'Run all Medical must be a live rules-engine batch'
);

const dispatchFunction = extractFunction('processOnePersonnelStation');
expect(
  dispatchFunction.includes("profile?.engine === 'personnel-rules'") &&
    dispatchFunction.includes('processOnePoliceStation(station, profile)'),
  'Medical profiles must route through the verified shared assignment engine'
);

const stationScopeFunction = extractFunction('refreshPersonnelStations');
expect(
  stationScopeFunction.includes('allowedBuildingTypeIds.has(String(station.buildingTypeId))'),
  'Medical specialist scans must accept exact eligible building types'
);

const assignmentEngine = extractFunction('processOnePoliceStation');
for (const token of [
  "PERSONNEL_STATE.action === 'preview'",
  'submitPersonnelAssignment(candidate)',
  '!rule.vehicleTypeIds.includes(liveAssignment.vehicleTypeId)',
  'verification.rows',
  'Final ${serviceLabel} station verification',
  'afterActionVerified',
  'trainingShortfall',
  'assignmentShortfall: stationAssignmentShortfall'
]) {
  expect(assignmentEngine.includes(token), `Shared Medical assignment contract missing: ${token}`);
}

const shortfallFunction = extractFunction('calculatePersonnelQualificationShortfall');
const shortfallContext = {
  personnelMatchesRule: (person, rule) =>
    rule.trainingAll.every(code => person.trainingCodes.includes(code))
};
const retainedShortfallContext = {
  rules,
  result: null,
  personnelMatchesRule: shortfallContext.personnelMatchesRule
};
vm.runInNewContext(
  `${shortfallFunction}\nresult = calculatePersonnelQualificationShortfall(
    [
      { personnelId: 'a', trainingCodes: ['hazard_response_ems'] },
      { personnelId: 'b', trainingCodes: ['hazard_response_ems'] },
      { personnelId: 'c', trainingCodes: ['hazard_response_ems'] }
    ],
    [rules.hart, rules.hart, rules.hart, rules.hart]
  );`,
  retainedShortfallContext
);
expect(
  retainedShortfallContext.result === 1,
  'Quantity greater than one must report the exact independent training shortfall'
);

for (const token of [
  '`30` | ATV Carrier | 2 / 2',
  '`31` | Ambulance Control Unit | 2 / 2',
  'ATV Carrier is HART',
  'Ambulance Control Unit is Tactical Command',
  'Training shortfall and assignment shortfall remain separate report fields'
]) {
  expect(evidence.includes(token), `Issue-17 evidence missing: ${token}`);
}

console.log('PASS: all Medical Personnel Assignment profiles use exact current vehicle/training/building mappings, support multi-seat quantities, preview/live execution and fresh final verification, and report training separately from assignment shortfall.');
