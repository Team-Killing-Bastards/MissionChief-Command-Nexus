#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const SOURCE_PATH = 'src/missionchief-command-nexus.user.js';
const source = await readFile(SOURCE_PATH, 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(name) {
  const signature = new RegExp(`^\\s*(?:async\\s+)?function ${name}\\(`, 'm');
  const match = signature.exec(source);
  if (!match) fail(`Unable to find ${name}`);

  const start = match.index;
  const bodyStart = source.indexOf('{', start);
  if (bodyStart < 0) fail(`Unable to find ${name} body`);

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

const typeEligibility = extractFunction(
  'isCheckboxVehicleTypeEligibleForTrainingRequirement'
);
const strictEligibility = extractFunction(
  'isCheckboxEligibleForTrainingRequirement'
);
const liveRefresh = extractFunction(
  'refreshPoliceInspectorRegistryFromLiveVehicles'
);

expect(
  strictEligibility.includes(
    'isCheckboxVehicleTypeEligibleForTrainingRequirement('
  ),
  'Strict selection must retain exact vehicle-type eligibility before checking evidence'
);
expect(
  strictEligibility.includes(
    '!isAuthoritativeLivePoliceTrainingEntry('
  ),
  'Final trained-personnel selection must remain fail-closed on unverified evidence'
);

const poolStart = liveRefresh.indexOf('const allCandidates =');
const poolEnd = liveRefresh.indexOf('const orderedCandidates =');
expect(poolStart >= 0 && poolEnd > poolStart, 'Unable to isolate live-verification candidate pool');
const candidatePool = liveRefresh.slice(poolStart, poolEnd);

expect(
  candidatePool.includes(
    'isCheckboxVehicleTypeEligibleForTrainingRequirement('
  ),
  'Live verification must admit exact compatible vehicle types before evidence exists'
);
expect(
  !candidatePool.includes('isCheckboxEligibleForTrainingRequirement('),
  'Live verification must not require the evidence that its own scan is responsible for creating'
);

const runtime = Function(
  `"use strict";\n` +
  `function getTrainingRequirementVehicleTypeId(requirement, checkbox, registryEntry) {\n` +
  `  const eligible = new Set((requirement?.eligibleVehicleTypeIds || []).map(String));\n` +
  `  const typeId = String(checkbox?.typeId || registryEntry?.vehicleTypeId || '');\n` +
  `  return typeId && eligible.has(typeId) ? typeId : '';\n` +
  `}\n` +
  `function isAuthoritativeLivePoliceTrainingEntry(entry) { return entry?.authoritative === true; }\n` +
  `function getRegistryTrainingQualifiedCount(_requirement, entry) { return Number(entry?.qualified || 0); }\n` +
  typeEligibility + '\n' +
  strictEligibility + '\n' +
  `return {\n` +
  `  preverify(entry, typeId = '51') {\n` +
  `    return isCheckboxVehicleTypeEligibleForTrainingRequirement(\n` +
  `      {typeId}, {eligibleVehicleTypeIds: ['51']}, entry\n` +
  `    );\n` +
  `  },\n` +
  `  select(entry, typeId = '51') {\n` +
  `    return isCheckboxEligibleForTrainingRequirement(\n` +
  `      {typeId}, {eligibleVehicleTypeIds: ['51']}, entry\n` +
  `    );\n` +
  `  }\n` +
  `};`
)();

expect(
  runtime.preverify(null) === true,
  'A correct type-51 vehicle with no register entry must enter live verification'
);
expect(
  runtime.preverify({authoritative: false, vehicleTypeId: '51'}) === true,
  'A stale type-51 register entry must enter live verification for refresh'
);
expect(
  runtime.select(null) === false,
  'Missing evidence must still fail final trained-personnel selection'
);
expect(
  runtime.select({authoritative: false, vehicleTypeId: '51'}) === false,
  'Stale evidence must still fail final trained-personnel selection'
);
expect(
  runtime.select({authoritative: true, vehicleTypeId: '51'}) === true,
  'Fresh complete evidence must remain eligible for final selection'
);
expect(
  runtime.preverify(null, '8') === false &&
    runtime.select({authoritative: true, vehicleTypeId: '8'}, '8') === false,
  'Wrong vehicle types must be rejected before verification and selection'
);

console.log(
  'Trained-personnel live-verification pool checks passed: missing and stale exact-type entries are refreshed before strict fail-closed selection.'
);
