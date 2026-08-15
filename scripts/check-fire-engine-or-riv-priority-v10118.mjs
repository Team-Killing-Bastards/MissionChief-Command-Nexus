#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

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
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) fail(`Missing function ${name}`);

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

    if (
      character === '"' ||
      character === "'" ||
      character === '`'
    ) {
      quote = character;
      continue;
    }

    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) {
      return source.slice(start, index + 1);
    }
  }

  fail(`Unterminated function ${name}`);
}

expect(
  source.includes('"Fire Engines or RIVs": "RIV"'),
  'Fire Engines or RIVs cross-reference is missing'
);

const isFireEngineOrRivRequirement = vm.runInNewContext(
  `(${extractFunction('isFireEngineOrRivRequirement')})`
);

for (const alias of [
  'Fire Engine or RIV',
  'Fire Engines or RIVs',
  'Required Fire Engines or RIVs',
]) {
  expect(
    isFireEngineOrRivRequirement(alias) === true,
    `Flexible Fire Engine/RIV wording was not recognised: ${alias}`
  );
}

for (const strictRequirement of [
  'RIV',
  'RIVs',
  'RIV or Major Foam Tender',
  'Fire Engines',
]) {
  expect(
    isFireEngineOrRivRequirement(strictRequirement) === false,
    `Unrelated requirement entered the flexible Fire Engine/RIV route: ${strictRequirement}`
  );
}

const normaliseVehicleText = value => String(value || '')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const isRivRequirement = vm.runInNewContext(
  `(${extractFunction('isRivRequirement')})`,
  {
    isFireEngineOrRivRequirement,
    normaliseVehicleText,
  }
);

expect(
  isRivRequirement('RIVs', 'RIV') === true,
  'Strict RIV requirement no longer uses the RIV-only route'
);
expect(
  isRivRequirement('Fire Engines or RIVs', 'RIV') === false,
  'Flexible Fire Engines or RIVs wording must not remain RIV-only'
);

const getVehicleTypeIdentifiers = input => input.typeIds || [];
const getRivVehicleValues = input => input.values || [];
const normaliseSartecDisplayedName = value => String(value || '')
  .replace(/^[^A-Za-z0-9]+/, '')
  .trim();

const isRivVehicleCheckbox = vm.runInNewContext(
  `(${extractFunction('isRivVehicleCheckbox')})`,
  {
    getVehicleTypeIdentifiers,
    getRivVehicleValues,
    MF_RIV_EXACT_VEHICLE_TYPES: new Set([
      'riv',
      'rivs',
      'rapid intervention vehicle',
      'rapid intervention vehicles',
    ]),
    normaliseSartecDisplayedName,
  }
);

const isRescuePumpVehicleCheckbox = vm.runInNewContext(
  `(${extractFunction('isRescuePumpVehicleCheckbox')})`,
  { getVehicleTypeIdentifiers }
);

expect(
  isRivVehicleCheckbox({ typeIds: ['76'], values: [] }) === true,
  'Exact MissionChief type-76 RIV was rejected'
);
expect(
  isRivVehicleCheckbox({ typeIds: ['16'], values: ['RIV'] }) === false,
  'A known non-RIV vehicle must not pass from its display text'
);
expect(
  isRivVehicleCheckbox({ typeIds: [], values: ['RIV - AIRFIELD-1'] }) === true,
  'RIV display fallback must remain available when no numeric type ID exists'
);
expect(
  isRescuePumpVehicleCheckbox({ typeIds: ['16'] }) === true,
  'Exact MissionChief type-16 Rescue Pump was rejected'
);
for (const excludedType of ['0', '17', '75', '76']) {
  expect(
    isRescuePumpVehicleCheckbox({ typeIds: [excludedType] }) === false,
    `Non-Rescue-Pump type ${excludedType} entered the remainder pool`
  );
}

const rivLater = {
  id: 'riv-later',
  typeIds: ['76'],
  arrival: 40,
  checked: false,
  disabled: false,
};
const rivSooner = {
  id: 'riv-sooner',
  typeIds: ['76'],
  arrival: 30,
  checked: false,
  disabled: false,
};
const pumpSoonest = {
  id: 'pump-soonest',
  typeIds: ['16'],
  arrival: 1,
  checked: false,
  disabled: false,
};
const pumpNext = {
  id: 'pump-next',
  typeIds: ['16'],
  arrival: 2,
  checked: false,
  disabled: false,
};
const waterLadder = {
  id: 'water-ladder',
  typeIds: ['0'],
  arrival: 0,
  checked: false,
  disabled: false,
};

const candidates = [
  pumpNext,
  rivLater,
  waterLadder,
  pumpSoonest,
  rivSooner,
];

const getFireEngineOrRivVehicleCheckboxes = vm.runInNewContext(
  `(${extractFunction('getFireEngineOrRivVehicleCheckboxes')})`,
  {
    getVehicleCheckboxSnapshot: () => candidates,
    isRivVehicleCheckbox,
    isRescuePumpVehicleCheckbox,
    sortVehicleCheckboxesByBestArrival: inputs =>
      inputs.slice().sort((left, right) => left.arrival - right.arrival),
  }
);

const ordered = getFireEngineOrRivVehicleCheckboxes(false);
expect(
  ordered.map(vehicle => vehicle.id).join(',') ===
    'riv-sooner,riv-later,pump-soonest,pump-next',
  'Candidate order must exhaust RIVs first and then expose Rescue Pumps as the remainder pool'
);
expect(
  ordered.slice(0, 3).map(vehicle => vehicle.id).join(',') ===
    'riv-sooner,riv-later,pump-soonest',
  'A requirement for three must use two available RIVs and top up exactly one Rescue Pump'
);
expect(
  ordered.slice(0, 1)[0] === rivSooner,
  'A quicker Rescue Pump must not displace an available RIV'
);

const allMatching = extractFunction('getAllMatchingVehicleCheckboxes');
for (const token of [
  'isFireEngineOrRivRequirement(',
  'getFireEngineOrRivVehicleCheckboxes(',
  'RIV FIRE ENGINE PRIORITY',
]) {
  expect(
    allMatching.includes(token),
    `Shared vehicle selector is missing the flexible priority contract: ${token}`
  );
}

const selectedCounter = extractFunction('countSelectedMatchingVehicles');
for (const token of [
  'fireEngineOrRivPreferred',
  'isRivVehicleCheckbox(',
  'isRescuePumpVehicleCheckbox(',
]) {
  expect(
    selectedCounter.includes(token),
    `Selected-unit verification does not count the complete mixed pool: ${token}`
  );
}

const selector = extractFunction('selectVehicleUnits');
expect(
  selector.includes('checkboxes.slice(0, required)'),
  'Selection no longer caps the ordered mixed pool at the requested quantity'
);
expect(
  selector.includes('isFireEngineOrRivRequirement(originalName)'),
  'Flexible Fire Engine/RIV selection must block generic quick-select fallback'
);

console.log(
  'PASS: Fire Engines or RIVs uses exact type-76 RIVs first, tops up only the remainder with exact type-16 Rescue Pumps, counts both toward the row, and never substitutes Water Ladders or CARPs.'
);
