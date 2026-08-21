#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

const fail = message => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};

const expect = (condition, message) => {
  if (!condition) fail(message);
};

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Unable to find ${name}`);
  const parametersStart = source.indexOf('(', start);
  let parameterDepth = 0;
  let parametersEnd = -1;

  for (let index = parametersStart; index < source.length; index += 1) {
    if (source[index] === '(') parameterDepth += 1;
    if (source[index] === ')' && --parameterDepth === 0) {
      parametersEnd = index;
      break;
    }
  }

  if (parametersEnd < 0) fail(`Unterminated parameters for ${name}`);
  const brace = source.indexOf('{', parametersEnd);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let regex = false;
  let regexClass = false;

  for (let index = brace; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (regex) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '[') regexClass = true;
      else if (character === ']') regexClass = false;
      else if (character === '/' && !regexClass) regex = false;
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (
      character === '/' &&
      /[=(,:;!&|?{}\[\]\n]/.test(source[index - 1] || '\n')
    ) {
      regex = true;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) {
      return source.slice(start, index + 1);
    }
  }

  fail(`Unterminated ${name}`);
}

for (const alias of [
  'Any vehicle',
  'Any vehicles',
  'Required Any vehicle',
  'Required Any vehicles',
]) {
  expect(
    source.includes(`"${alias}": "Ambulance"`),
    `Missing Any vehicle cross-reference alias: ${alias}`
  );
}

const isAnyVehicleRequirementName = vm.runInNewContext(
  `(${extractFunction('isAnyVehicleRequirementName')})`
);

for (const accepted of [
  'Any vehicle',
  'Any vehicles',
  'Required Any vehicle',
  'required any vehicles',
]) {
  expect(
    isAnyVehicleRequirementName(accepted) === true,
    `Exact Any vehicle wording was rejected: ${accepted}`
  );
}

for (const rejected of [
  'Ambulance',
  'Any fire vehicle',
  'Vehicle',
  'Any vehicle or helicopter',
  'Police vehicles',
]) {
  expect(
    isAnyVehicleRequirementName(rejected) === false,
    `Unrelated wording entered the Any vehicle route: ${rejected}`
  );
}

const normaliseMissionUpgradeAnyVehicleRequirement = vm.runInNewContext(
  `(${extractFunction('normaliseMissionUpgradeAnyVehicleRequirement')})`,
  { isAnyVehicleRequirementName }
);

expect(
  JSON.stringify(normaliseMissionUpgradeAnyVehicleRequirement('Any vehicle', 1)) ===
    JSON.stringify({
      unitName: 'Any vehicle',
      mappedName: 'Ambulance',
      stillNeeded: 1,
      reportedStillNeeded: 1,
    }),
  'Mission Upgrade Any vehicle did not normalise to one Ambulance'
);
expect(
  normaliseMissionUpgradeAnyVehicleRequirement('Any vehicles', 4).stillNeeded === 1,
  'Mission Upgrade Any vehicle must remain capped at one Ambulance'
);
expect(
  normaliseMissionUpgradeAnyVehicleRequirement('Ambulance', 1) === null,
  'Ordinary Ambulance demand must not be rewritten as an upgrade Any vehicle row'
);

const getVehicleTypeIdentifiers = input => input.typeIds || [];
const isNormalAmbulanceVehicleCheckbox = vm.runInNewContext(
  `(${extractFunction('isNormalAmbulanceVehicleCheckbox')})`,
  {
    getVehicleTypeIdentifiers,
    MF_NORMAL_AMBULANCE_TYPE_ID: '5',
  }
);

expect(
  isNormalAmbulanceVehicleCheckbox({ typeIds: ['5'] }) === true,
  'Exact normal Ambulance type 5 was rejected'
);
for (const excludedType of ['9', '34', '31', '33', '0', '8']) {
  expect(
    isNormalAmbulanceVehicleCheckbox({ typeIds: [excludedType] }) === false,
    `Non-normal-Ambulance type ${excludedType} entered the Any vehicle pool`
  );
}

const allMatching = extractFunction('getAllMatchingVehicleCheckboxes');
expect(
  allMatching.includes('isAnyVehicleAmbulanceRequirement(originalName, mappedName)'),
  'Shared selector is missing the Any vehicle Ambulance route'
);
expect(
  allMatching.includes('isNormalAmbulanceVehicleCheckbox(input)'),
  'Shared selector does not use the exact type-5 matcher'
);
expect(
  allMatching.indexOf('isAnyVehicleAmbulanceRequirement(originalName, mappedName)') <
    allMatching.indexOf('getVehicleMatchCandidates(originalName, mappedName)'),
  'Any vehicle must be resolved before generic text matching'
);

const selectedCounter = extractFunction('countSelectedMatchingVehicles');
expect(
  selectedCounter.includes('isAnyVehicleAmbulanceRequirement(originalName, mappedName)'),
  'Selected-unit verification is missing the Any vehicle route'
);
expect(
  selectedCounter.includes('isNormalAmbulanceVehicleCheckbox(input)'),
  'Selected-unit verification is not pinned to exact type 5'
);

const missionUpdate = extractFunction('readMissionUpdateRows');
for (const token of [
  'normaliseMissionUpgradeAnyVehicleRequirement(',
  'missionUpgradeAnyVehicleAmbulance: true',
  'reportedAnyVehicleStillNeeded:',
  'exactVehicleTypeId:',
]) {
  expect(
    missionUpdate.includes(token),
    `Mission Update route is missing ${token}`
  );
}

console.log(
  'PASS: Mission Upgrade exact Any vehicle wording selects and verifies one exact normal Ambulance type 5; HEMS, Ambulance Officer and every other type remain excluded.'
);
