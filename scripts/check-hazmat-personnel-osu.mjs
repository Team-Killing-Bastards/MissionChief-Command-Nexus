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

function requireText(text, label) {
  expect(source.includes(text), `Missing HazMat personnel contract: ${label}`);
}

function extractFunction(name) {
  const signature = `    function ${name}(`;
  const start = source.indexOf(signature);
  if (start < 0) fail(`Unable to find ${name}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character === quote) quote = '';
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

requireText('// @version      1.0.121', 'Command Nexus 1.0.64 metadata');
requireText("const PERSONNEL_VERSION = '1.3.10';", 'Personnel Assignment 1.3.8');
requireText(' * MODULE 2: MISSION FINDER V10.6.159', 'Mission Finder V10.6.127');
requireText("code:\n                    'gw_gefahrgut',\n                label:\n                    'HazMat Unit'", 'HazMat trained-personnel pattern');
requireText("requirementType:\n                'fire_hazmat_osu_trained_vehicle'", 'dedicated HazMat trained OSU route');
requireText("eligibleVehicleTypeIds: [\n                '39'", 'exact type-39 OSU eligibility');
requireText("vehicleCapacityByType: {\n                '39': 6", 'six staff per OSU mission capacity');
requireText("requiredTrainingCodes: [\n                'gw_gefahrgut'", 'HazMat training-code requirement');
requireText("vehicleTypeIds: ['39'], vehicleLabel: 'Operational Support Unit', target: 6", 'six-person Personnel Assignment target');
requireText('6 HazMat-trained personnel per OSU', 'six-person profile description');
requireText("const MF_FIRE_OPERATIONAL_SUPPORT_TYPE_ID = '39';", 'exact OSU type constant');
requireText('type-7 HazMat Units', 'known type-7 exclusion');
requireText('type-86 SAR Operational Support Vans', 'known type-86 exclusion');

const patternStart = source.indexOf('const MF_TRAINED_PERSONNEL_PATTERNS =');
const patternEnd = source.indexOf('\n\n    let mfKeepPanelPosition', patternStart);
expect(patternStart >= 0 && patternEnd > patternStart, 'Unable to extract trained-personnel patterns');
const patterns = source.slice(patternStart, patternEnd);

const runtime = Function(
  '"use strict";\n' +
  "const MF_TRAINED_VEHICLE_CAPACITY_BY_TYPE = Object.freeze({'51': 9, '8': 2, '25': 2, '39': 6});\n" +
  patterns + '\n' +
  extractFunction('getTrainingRequirementPersonnelTarget') + '\n' +
  extractFunction('getTrainingRequirementEligibleTypeIds') + '\n' +
  extractFunction('getTrainingRequirementVehicleCapacity') + '\n' +
  extractFunction('getPreferredTrainedVehicleCountForRequirement') + '\n' +
  extractFunction('normalisePublicOrderTrainedRequirements') + '\n' +
  extractFunction('getTrainedPersonnelRequirementsFromFreeText') + '\n' +
  extractFunction('getSupportedTrainedPersonnelRequirementsFromText') + '\n' +
  'return {getTrainedPersonnelRequirementsFromFreeText, getSupportedTrainedPersonnelRequirementsFromText, getPreferredTrainedVehicleCountForRequirement};'
)();

function oneHazMatRequirement(text, liveOnly = true) {
  const result = liveOnly
    ? runtime.getSupportedTrainedPersonnelRequirementsFromText(text)
    : runtime.getTrainedPersonnelRequirementsFromFreeText(text);
  expect(result.length === 1, `${text} should produce exactly one trained requirement, found ${result.length}`);
  return result[0];
}

const four = oneHazMatRequirement('Missing Personnel: 4x HazMat Unit');
expect(four.code === 'gw_gefahrgut_vehicle', `Expected gw_gefahrgut_vehicle, found ${four.code}`);
expect(four.personnelRequired === 4, `Expected four missing trained staff, found ${four.personnelRequired}`);
expect(four.required === 1, `Four HazMat-trained staff must require one OSU, found ${four.required}`);
expect(four.personnelPerVehicle === 6, `Expected six personnel per OSU, found ${four.personnelPerVehicle}`);
expect(JSON.stringify(four.eligibleVehicleTypeIds) === JSON.stringify(['39']), 'HazMat personnel must accept only exact type 39');
expect(JSON.stringify(four.preferredVehicleTypeIds) === JSON.stringify(['39']), 'HazMat personnel must prefer only exact type 39');
expect(four.vehicleCapacityByType['39'] === 6, 'Type-39 OSU capacity must be six');
expect(!four.eligibleVehicleTypeIds.includes('7'), 'Type-7 HazMat Unit must not satisfy HazMat personnel demand');
expect(!four.eligibleVehicleTypeIds.includes('86'), 'Type-86 Operational Support Van must not satisfy HazMat personnel demand');
expect(JSON.stringify(four.requiredTrainingCodes) === JSON.stringify(['gw_gefahrgut']), 'HazMat OSU must carry gw_gefahrgut-trained staff');

for (const [personnel, expectedOsus] of [[1, 1], [4, 1], [6, 1], [7, 2], [12, 2], [13, 3]]) {
  const requirement = oneHazMatRequirement(`Missing Personnel: ${personnel}x HazMat Units`);
  expect(requirement.personnelRequired === personnel, `Expected ${personnel} trained staff`);
  expect(requirement.required === expectedOsus, `${personnel} HazMat staff should require ${expectedOsus} OSU(s), found ${requirement.required}`);
  expect(
    runtime.getPreferredTrainedVehicleCountForRequirement(requirement) === expectedOsus,
    `Preferred OSU plan for ${personnel} staff is incorrect`
  );
}

const reverse = oneHazMatRequirement('Missing Personnel: HazMat Unit x4');
expect(reverse.personnelRequired === 4 && reverse.required === 1, 'Reverse quantity wording must retain the 4-to-1 conversion');

const missionDefinition = oneHazMatRequirement('Required Personnel: 4x HazMat Unit', false);
expect(missionDefinition.personnelRequired === 4 && missionDefinition.required === 1, 'Required Personnel row must use the same six-per-OSU trained route');

expect(
  runtime.getSupportedTrainedPersonnelRequirementsFromText('Missing Vehicles: 4x HazMat Unit').length === 0,
  'Ordinary Missing Vehicles text must not enter the trained-personnel route'
);
expect(
  source.includes('"HazMat Unit": "OSU"') && source.includes('"HazMat Units": "OSU"'),
  'Ordinary HazMat vehicle aliases must remain available as a separate exact-quantity route'
);
expect(
  source.includes('isFireOperationalSupportUnitCheckbox(input)'),
  'Ordinary and personnel OSU routes must retain exact type-39 checkbox matching'
);

console.log('HazMat personnel regression passed: 4 missing gw_gefahrgut-trained staff select one exact type-39 OSU at six personnel per vehicle, while ordinary HazMat vehicle quantities remain separate.');
