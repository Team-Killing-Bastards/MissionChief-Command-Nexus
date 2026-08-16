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

for (const alias of [
  'Aerial Appliance Truck or Rescue Stairs',
  'Aerial Appliance Trucks or Rescue Stairs',
  'Required Aerial Appliance Truck or Rescue Stairs',
  'Required Aerial Appliance Trucks or Rescue Stairs',
]) {
  expect(
    source.includes(`"${alias}": "Rescue Stairs"`),
    `Cross-reference alias is missing: ${alias}`
  );
}

const isAerialApplianceOrRescueStairsRequirement = vm.runInNewContext(
  `(${extractFunction('isAerialApplianceOrRescueStairsRequirement')})`
);

for (const alias of [
  'Aerial Appliance Truck or Rescue Stairs',
  'Aerial Appliance Trucks or Rescue Stairs',
  'Required Aerial Appliance Truck or Rescue Stairs',
  'Required Aerial Appliance Trucks or Rescue Stairs',
]) {
  expect(
    isAerialApplianceOrRescueStairsRequirement(alias) === true,
    `Ordered Rescue Stairs/CARP wording was not recognised: ${alias}`
  );
}

for (const unrelatedRequirement of [
  'Aerial Appliance Truck',
  'Aerial Appliance Trucks',
  'Rescue Stairs',
  'Fire Engines or RIVs',
]) {
  expect(
    isAerialApplianceOrRescueStairsRequirement(unrelatedRequirement) === false,
    `Unrelated requirement entered the Rescue Stairs/CARP route: ${unrelatedRequirement}`
  );
}

const getVehicleTypeIdentifiers = input => input.typeIds || [];

const isRescueStairsVehicleCheckbox = vm.runInNewContext(
  `(${extractFunction('isRescueStairsVehicleCheckbox')})`,
  { getVehicleTypeIdentifiers }
);

const isCarpVehicleCheckbox = vm.runInNewContext(
  `(${extractFunction('isCarpVehicleCheckbox')})`,
  { getVehicleTypeIdentifiers }
);

expect(
  isRescueStairsVehicleCheckbox({ typeIds: ['78'] }) === true,
  'Exact MissionChief type-78 Rescue Stairs was rejected'
);
expect(
  isCarpVehicleCheckbox({ typeIds: ['17'] }) === true,
  'Exact MissionChief type-17 CARP was rejected'
);

for (const excludedType of ['0', '16', '17', '75', '76', '79']) {
  expect(
    isRescueStairsVehicleCheckbox({ typeIds: [excludedType] }) === false,
    `Non-Rescue-Stairs type ${excludedType} entered the preferred pool`
  );
}

for (const excludedType of ['0', '16', '75', '76', '78', '79']) {
  expect(
    isCarpVehicleCheckbox({ typeIds: [excludedType] }) === false,
    `Non-CARP type ${excludedType} entered the fallback pool`
  );
}

const rescueStairsLater = {
  id: 'rescue-stairs-later',
  typeIds: ['78'],
  arrival: 40,
  checked: false,
  disabled: false,
};
const rescueStairsSooner = {
  id: 'rescue-stairs-sooner',
  typeIds: ['78'],
  arrival: 30,
  checked: false,
  disabled: false,
};
const carpSoonest = {
  id: 'carp-soonest',
  typeIds: ['17'],
  arrival: 1,
  checked: false,
  disabled: false,
};
const carpNext = {
  id: 'carp-next',
  typeIds: ['17'],
  arrival: 2,
  checked: false,
  disabled: false,
};
const rescuePump = {
  id: 'rescue-pump',
  typeIds: ['16'],
  arrival: 0,
  checked: false,
  disabled: false,
};
const checkedRescueStairs = {
  id: 'checked-rescue-stairs',
  typeIds: ['78'],
  arrival: 20,
  checked: true,
  disabled: false,
};
const disabledCarp = {
  id: 'disabled-carp',
  typeIds: ['17'],
  arrival: 0,
  checked: false,
  disabled: true,
};

const candidates = [
  carpNext,
  rescueStairsLater,
  rescuePump,
  carpSoonest,
  rescueStairsSooner,
  checkedRescueStairs,
  disabledCarp,
];

const getAerialApplianceOrRescueStairsVehicleCheckboxes = vm.runInNewContext(
  `(${extractFunction('getAerialApplianceOrRescueStairsVehicleCheckboxes')})`,
  {
    getVehicleCheckboxSnapshot: () => candidates,
    isRescueStairsVehicleCheckbox,
    isCarpVehicleCheckbox,
    sortVehicleCheckboxesByBestArrival: inputs =>
      inputs.slice().sort((left, right) => left.arrival - right.arrival),
  }
);

const ordered = getAerialApplianceOrRescueStairsVehicleCheckboxes(false);
expect(
  ordered.map(vehicle => vehicle.id).join(',') ===
    'rescue-stairs-sooner,rescue-stairs-later,carp-soonest,carp-next',
  'Candidate order must exhaust Rescue Stairs first and then expose CARPs as the remainder pool'
);
expect(
  ordered.slice(0, 3).map(vehicle => vehicle.id).join(',') ===
    'rescue-stairs-sooner,rescue-stairs-later,carp-soonest',
  'A requirement for three must use two available Rescue Stairs and top up exactly one CARP'
);
expect(
  ordered[0] === rescueStairsSooner,
  'A quicker CARP must not displace an available Rescue Stairs vehicle'
);

const orderedIncludingChecked =
  getAerialApplianceOrRescueStairsVehicleCheckboxes(true);
expect(
  orderedIncludingChecked[0] === checkedRescueStairs,
  'Selected-unit verification must retain checked Rescue Stairs in the preferred pool'
);
expect(
  !orderedIncludingChecked.includes(disabledCarp),
  'Disabled unchecked CARPs must remain unavailable'
);

const allMatching = extractFunction('getAllMatchingVehicleCheckboxes');
for (const token of [
  'isAerialApplianceOrRescueStairsRequirement(',
  'getAerialApplianceOrRescueStairsVehicleCheckboxes(',
  'RESCUE STAIRS CARP PRIORITY',
]) {
  expect(
    allMatching.includes(token),
    `Shared vehicle selector is missing the ordered priority contract: ${token}`
  );
}

const selectedCounter = extractFunction('countSelectedMatchingVehicles');
for (const token of [
  'aerialApplianceOrRescueStairsPreferred',
  'isRescueStairsVehicleCheckbox(',
  'isCarpVehicleCheckbox(',
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
  selector.includes(
    'isAerialApplianceOrRescueStairsRequirement(originalName)'
  ),
  'Ordered Rescue Stairs/CARP selection must block generic quick-select fallback'
);

console.log(
  'PASS: Aerial Appliance Truck(s) or Rescue Stairs uses exact type-78 Rescue Stairs first, tops up only the remainder with exact type-17 CARPs, counts both toward the row, and excludes every other vehicle type.'
);
