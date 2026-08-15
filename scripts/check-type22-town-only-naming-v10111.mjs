#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function extractExpression(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  const expressionStart = start + startMarker.length;
  const end = source.indexOf(endMarker, expressionStart);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);
  return source.slice(expressionStart, end).replace(/;\s*$/, '');
}

function extractFunction(name, nextFunctionName) {
  const startMarker = `function ${name}(`;
  const endMarker = `\n\n    function ${nextFunctionName}(`;
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing function: ${name}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing function after ${name}: ${nextFunctionName}`);
  return source.slice(start, end);
}

assert.ok(source.includes('// @version      1.0.120'));
assert.ok(source.includes("const STATION_VERSION = '1.3.21';"));

const townOnlyMode = vm.runInNewContext(
  extractExpression(
    'const STATION_NAMING_MODE_TOWN_ONLY = ',
    '\n\n    // MissionChief\'s own building type IDs.'
  )
);

const vehicleInfo = vm.runInNewContext(
  `(${extractExpression(
    'const VEHICLE_INFO = ',
    '\n\n    const UNIT_CLASS_ALL = '
  )})`
);

const buildStationName = vm.runInNewContext(`(
  function (STATION_NAMING_MODE_TOWN_ONLY) {
    ${extractFunction('buildStationName', 'getExistingStationSequence')}
    ${extractFunction('getExistingStationSequence', 'createStationNameSequenceRegistry')}
    return buildStationName;
  }
)`)(townOnlyMode);

const makeVehicleName = vm.runInNewContext(`(
  function (VEHICLE_INFO) {
    ${extractFunction('makeVehicleName', 'getUnitClassOptionsForStationType')}
    return makeVehicleName;
  }
)`)(vehicleInfo);

const stationName = buildStationName(
  'ABERDOUR',
  '',
  'ABERDOUR-FO1',
  '',
  townOnlyMode
);
assert.equal(
  stationName,
  'ABERDOUR',
  'The exact live station must contain neither FO nor a station sequence'
);

assert.equal(
  makeVehicleName(
    { buildingTypeId: 22, callsignBase: stationName },
    'Fire Officer',
    1
  ),
  '🧑‍🚒 ABERDOUR-FO-1',
  'The exact live Fire Officer must contain one FO role and one unit sequence'
);
assert.equal(
  makeVehicleName(
    { buildingTypeId: 22, callsignBase: stationName },
    'Fire Officer',
    2
  ),
  '🧑‍🚒 ABERDOUR-FO-2',
  'The number must be supplied by Unit Naming'
);

for (const [vehicleType, expected] of [
  ['Ambulance Officer', '🚑🎖️ ABERDOUR-AO-1'],
  ['OTL', '🚔 ABERDOUR-OTL-1'],
  ['DSU', '🚔🐕 ABERDOUR-DSU-1']
]) {
  assert.equal(
    makeVehicleName(
      { buildingTypeId: 22, callsignBase: stationName },
      vehicleType,
      1
    ),
    expected
  );
}

assert.match(source, /isTownOnly\s*\?\s*''\s*:\s*reserveStationNameSequence/);
assert.match(source, /Station sequence: none \(Unit Naming supplies the unit sequence\)/);

console.log(
  'Exact ABERDOUR type-22 town-only Station Naming and role/number Unit Naming regression passed.'
);
