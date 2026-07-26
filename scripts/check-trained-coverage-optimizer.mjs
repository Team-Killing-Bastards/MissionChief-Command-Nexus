#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const SOURCE_PATH = 'src/missionchief-command-nexus.user.js';
const source = await readFile(SOURCE_PATH, 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(text, label) {
  if (!source.includes(text)) {
    fail(`Missing trained-coverage contract: ${label}`);
  }
}

function extractFunction(name) {
  const signature = `    function ${name}(`;
  const start = source.indexOf(signature);
  if (start < 0) fail(`Unable to find ${name}`);

  const bodyStart = source.indexOf('{', start);
  if (bodyStart < 0) fail(`Unable to find ${name} body`);

  let depth = 0;
  let quote = '';
  let escaped = false;
  let templateExpressionDepth = 0;

  for (let index = bodyStart; index < source.length; index++) {
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
      if (quote === '`' && character === '$' && next === '{') {
        templateExpressionDepth += 1;
        index += 1;
        depth += 1;
        continue;
      }
      if (character === quote && templateExpressionDepth === 0) {
        quote = '';
      }
      if (quote === '`' && character === '}' && templateExpressionDepth > 0) {
        templateExpressionDepth -= 1;
      }
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
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  fail(`Unable to extract ${name}`);
}

requireText('// @version      1.0.36', 'v1.0.36 metadata');
requireText(' * MODULE 2: MISSION FINDER V10.6.101', 'V10.6.101 header');
requireText("const MF_PSU_COMPATIBLE_TRAINING_CODES =", 'PSU-compatible course list');
requireText("'51': 9", 'type-51 PSU capacity nine');
requireText("'8': 2", 'type-8 IRV capacity two');
requireText("eligibleVehicleTypeIds: [\n                    '51',\n                    '8'", 'Public Order PSU plus IRV eligibility');
requireText('psuCompatible:\n                    true', 'PSU-compatible requirement flag');
requireText('getTrainingRequirementQualifiedCount(', 'generic qualified-count helper');
requireText('assignedTrainingProfiles', 'per-person training profiles');
requireText('trainingProfilesComplete', 'authoritative profile scan marker');
requireText('applyTrainingCandidateCoverage(', 'profile-aware coverage allocator');
requireText('combinationCounts[combinationKey]', 'multi-course combination count');
requireText('capacityRemaining:', 'separate nominal vehicle-capacity vector');
requireText('runSelectionPhase(true);', 'trained coverage phase');
requireText('runSelectionPhase(false);', 'correct-type fallback phase');
requireText('vehicleCoverageSatisfied', 'vehicle coverage result');
requireText('trainingSatisfied', 'training coverage result');
requireText('formatTrainedPersonnelShortfall(', 'training shortfall reporter');
requireText('compatible units were still selected and can be sent', 'non-blocking shortfall notice');
requireText('if (trainedVehicleMissing.length > 0)', 'vehicle-capacity blocking gate');
requireText("requirementType:\n                    'police_inspector_vehicle'", 'Inspector exact profile');
requireText("eligibleVehicleTypeIds: [\n                    '25'", 'Armed Response exact type-25 profile');
requireText("label:\n                'Railway Police Officer Trained Police IRV'", 'Railway exact IRV profile');

const runtime = Function(
  `"use strict";\n` +
  `const MF_TRAINED_VEHICLE_CAPACITY_BY_TYPE = Object.freeze({'51': 9, '8': 2, '25': 2});\n` +
  extractFunction('getTrainingRequirementPersonnelTarget') + '\n' +
  extractFunction('getTrainingRequirementEligibleTypeIds') + '\n' +
  extractFunction('getTrainingRequirementVehicleCapacity') + '\n' +
  extractFunction('getPreferredTrainedVehicleCountForRequirement') + '\n' +
  extractFunction('getTrainedVehicleSelectionScore') + '\n' +
  `return {getPreferredTrainedVehicleCountForRequirement, getTrainedVehicleSelectionScore};`
)();

function publicOrderRequirement(personnelRequired) {
  return {
    personnelRequired,
    personnelPerVehicle: 9,
    eligibleVehicleTypeIds: ['51', '8'],
    vehicleCapacityByType: {'51': 9, '8': 2},
  };
}

const planCases = new Map([
  [1, 1],
  [2, 1],
  [3, 2],
  [4, 2],
  [5, 1],
  [8, 1],
  [9, 1],
  [10, 2],
  [12, 3],
  [18, 2],
]);

for (const [personnel, expectedVehicles] of planCases) {
  const actual = runtime.getPreferredTrainedVehicleCountForRequirement(
    publicOrderRequirement(personnel)
  );
  if (actual !== expectedVehicles) {
    fail(`Public Order plan ${personnel} expected ${expectedVehicles}, found ${actual}`);
  }
}

const score = (metrics, trainedPhase = true) =>
  runtime.getTrainedVehicleSelectionScore(metrics, trainedPhase);

const irvForThree = score({
  eligible: true,
  trainedUseful: 2,
  capacityUseful: 2,
  coveredCategories: 1,
  overshoot: 0,
  isPsu: false,
});
const psuForThree = score({
  eligible: true,
  trainedUseful: 3,
  capacityUseful: 3,
  coveredCategories: 1,
  overshoot: 6,
  isPsu: true,
});
if (irvForThree <= psuForThree) {
  fail('A three-person remainder must prefer IRVs over an oversized second PSU');
}

const irvForFive = score({
  eligible: true,
  trainedUseful: 2,
  capacityUseful: 2,
  coveredCategories: 1,
  overshoot: 0,
  isPsu: false,
});
const psuForFive = score({
  eligible: true,
  trainedUseful: 5,
  capacityUseful: 5,
  coveredCategories: 1,
  overshoot: 4,
  isPsu: true,
});
if (psuForFive <= irvForFive) {
  fail('A useful five-person block must prefer one PSU over multiple IRVs');
}

const multiTrainedPsu = score({
  eligible: true,
  trainedUseful: 9,
  capacityUseful: 9,
  coveredCategories: 3,
  overshoot: 6,
  isPsu: true,
});
const multiTrainedIrv = score({
  eligible: true,
  trainedUseful: 6,
  capacityUseful: 6,
  coveredCategories: 3,
  overshoot: 0,
  isPsu: false,
});
if (multiTrainedPsu <= multiTrainedIrv) {
  fail('A PSU covering several simultaneous courses must outrank one IRV');
}

const fallbackScore = score({
  eligible: true,
  trainedUseful: 0,
  capacityUseful: 2,
  coveredCategories: 0,
  overshoot: 0,
  isPsu: false,
}, false);
if (!Number.isFinite(fallbackScore)) {
  fail('Correct-type untrained fallback vehicles must remain selectable');
}

const trainedOnlyScore = score({
  eligible: true,
  trainedUseful: 0,
  capacityUseful: 2,
  coveredCategories: 0,
  overshoot: 0,
  isPsu: false,
}, true);
if (trainedOnlyScore !== Number.NEGATIVE_INFINITY) {
  fail('Untrained vehicles must not enter the trained-coverage phase');
}

const allocationRuntime = Function(
  `"use strict";\n` +
  `function getTrainingRequirementRequiredCodes(requirement) { return requirement.requiredTrainingCodes || [requirement.code]; }\n` +
  `function getTrainingRequirementVehicleTypeId(requirement, checkbox) { return (requirement.eligibleVehicleTypeIds || []).includes(checkbox.typeId) ? checkbox.typeId : ''; }\n` +
  `function isCheckboxEligibleForTrainingRequirement(checkbox, requirement) { return !!getTrainingRequirementVehicleTypeId(requirement, checkbox); }\n` +
  `function getTrainingCandidatePersonnelProfiles(_requirements, checkbox) { return checkbox.profiles; }\n` +
  extractFunction('doesTrainingProfileSatisfyRequirement') + '\n' +
  extractFunction('applyTrainingCandidateCoverage') + '\n' +
  `return {applyTrainingCandidateCoverage};`
)();

function remainingRequirement(code, amount) {
  return {
    code,
    label: code,
    requiredTrainingCodes: [code],
    eligibleVehicleTypeIds: ['8', '51'],
    remaining: amount,
    capacityRemaining: amount,
  };
}

const fullyMultiTrained = allocationRuntime.applyTrainingCandidateCoverage(
  [
    remainingRequirement('level_1_public_order', 2),
    remainingRequirement('level_2_public_order', 2),
    remainingRequirement('police_sergeant', 2),
  ],
  {
    typeId: '8',
    profiles: [
      ['level_1_public_order', 'level_2_public_order', 'police_sergeant'],
      ['level_1_public_order', 'level_2_public_order', 'police_sergeant'],
    ],
  },
  null
);
if (fullyMultiTrained.remaining.some(item => item.remaining !== 0 || item.capacityRemaining !== 0)) {
  fail('Two fully multi-trained IRV staff must cover all three two-person requirements without extra vehicles');
}

const separatelyTrained = allocationRuntime.applyTrainingCandidateCoverage(
  [
    remainingRequirement('level_1_public_order', 2),
    remainingRequirement('level_2_public_order', 2),
    remainingRequirement('police_sergeant', 2),
  ],
  {
    typeId: '8',
    profiles: [
      ['level_1_public_order'],
      ['level_2_public_order'],
    ],
  },
  null
);
const separateByCode = new Map(separatelyTrained.remaining.map(item => [item.code, item]));
if (
  separateByCode.get('level_1_public_order').remaining !== 1 ||
  separateByCode.get('level_2_public_order').remaining !== 1 ||
  separateByCode.get('police_sergeant').capacityRemaining !== 2
) {
  fail('Singly trained staff must cover only their own courses and must not be multiplied as untrained spare seats');
}

const partiallyTrained = allocationRuntime.applyTrainingCandidateCoverage(
  [remainingRequirement('level_1_public_order', 2)],
  {
    typeId: '8',
    profiles: [
      ['level_1_public_order'],
      [],
    ],
  },
  null
).remaining[0];
if (partiallyTrained.remaining !== 1 || partiallyTrained.capacityRemaining !== 0) {
  fail('One trained plus one untrained IRV member must send the IRV, cover two seats, and report one trained-person shortfall');
}

const untrainedFallback = allocationRuntime.applyTrainingCandidateCoverage(
  [remainingRequirement('level_1_public_order', 3)],
  {
    typeId: '8',
    profiles: [[], []],
  },
  null
).remaining[0];
if (untrainedFallback.remaining !== 3 || untrainedFallback.capacityRemaining !== 1) {
  fail('An untrained IRV must reduce only nominal capacity and preserve the complete training shortfall');
}

console.log('Trained coverage optimiser checks passed.');
