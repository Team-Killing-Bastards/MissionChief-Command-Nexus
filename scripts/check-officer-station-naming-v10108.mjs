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

const townOnlyMode = vm.runInNewContext(
  extractExpression(
    'const STATION_NAMING_MODE_TOWN_ONLY = ',
    '\n\n    // MissionChief\'s own building type IDs.'
  )
);

const buildingTypeInfo = vm.runInNewContext(`(
  function (STATION_NAMING_MODE_TOWN_ONLY) {
    return ${extractExpression(
      'const STATION_BUILDING_TYPE_INFO = ',
      '\n\n    const NAMING_SERVICES = '
    )};
  }
)`)(townOnlyMode);

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

assert.equal(townOnlyMode, 'TOWN_ONLY');
assert.equal(buildingTypeInfo[22]?.stationType, 'OTHER');
assert.equal(buildingTypeInfo[22]?.suffix, '');
assert.equal(buildingTypeInfo[22]?.namingMode, townOnlyMode);
assert.equal(buildingTypeInfo[22]?.label, 'Response location');

for (const currentName of [
  'KIRK-FO1',
  'KIRK-AO1',
  'KIRK-OTL1',
  'KIRK-DSU-1',
  'KIRK1'
]) {
  assert.equal(
    buildStationName('KIRK', '', currentName, '', townOnlyMode),
    'KIRK',
    `Building type 22 must remove role and sequence from ${currentName}`
  );
}

for (const [vehicleType, expectedCode] of [
  ['Fire Officer', 'FO'],
  ['Ambulance Officer', 'AO'],
  ['OTL', 'OTL'],
  ['DSU', 'DSU']
]) {
  const expectedIcon = vehicleInfo[vehicleType].icon;
  assert.equal(
    makeVehicleName(
      { buildingTypeId: 22, callsignBase: 'KIRK' },
      vehicleType,
      1
    ),
    `${expectedIcon} KIRK-${expectedCode}-1`,
    `${vehicleType} must own its role and unit sequence`
  );
}

assert.equal(
  buildStationName('KIRK', '-FS', 'KIRK-FS2'),
  'KIRK-FS2',
  'Ordinary station suffix and numbering must remain unchanged'
);

assert.doesNotMatch(source, /STATION_DYNAMIC_SUFFIX_OFFICER_VEHICLE/);
assert.doesNotMatch(source, /getStationOfficerVehicleTypeIds/);
assert.match(source, /const isTownOnly = station\.namingMode === STATION_NAMING_MODE_TOWN_ONLY/);
assert.match(source, /Unit Naming owns the vehicle role and unit sequence/);

console.log(
  'Building type 22 town-only Station Naming and FO, AO, OTL and DSU Unit Naming contracts passed.'
);
