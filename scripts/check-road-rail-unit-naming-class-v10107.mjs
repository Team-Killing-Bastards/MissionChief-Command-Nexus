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

const typeIdToVehicleType = vm.runInNewContext(
  `(${extractExpression(
    'const TYPE_ID_TO_VEHICLE_TYPE = ',
    '\n\n    const VEHICLE_INFO = '
  )})`
);

const vehicleInfo = vm.runInNewContext(
  `(${extractExpression(
    'const VEHICLE_INFO = ',
    '\n\n    const UNIT_CLASS_ALL = '
  )})`
);

const typeIdsByStationType = vm.runInNewContext(
  extractExpression(
    'const UNIT_CLASS_TYPE_IDS_BY_STATION_TYPE = ',
    '\n\n    const STATION_TYPES = '
  )
);

const getOptionsFactory = vm.runInNewContext(`(
  function (
    TYPE_ID_TO_VEHICLE_TYPE,
    VEHICLE_INFO,
    UNIT_CLASS_TYPE_IDS_BY_STATION_TYPE
  ) {
    ${extractFunction(
      'getUnitClassOptionsForStationType',
      'getSelectedUnitClass'
    )}
    return getUnitClassOptionsForStationType;
  }
)`);

const makeVehicleNameFactory = vm.runInNewContext(`(
  function (VEHICLE_INFO) {
    ${extractFunction('makeVehicleName', 'getUnitClassOptionsForStationType')}
    return makeVehicleName;
  }
)`);

const getOptions = getOptionsFactory(
  typeIdToVehicleType,
  vehicleInfo,
  typeIdsByStationType
);
const makeVehicleName = makeVehicleNameFactory(vehicleInfo);

assert.equal(typeIdToVehicleType['107'], 'Road Rail Unit');
assert.equal(vehicleInfo['Road Rail Unit']?.code, 'RRU');
assert.equal(vehicleInfo['Road Rail Unit']?.icon, '🚒🚆');

for (const stationType of ['FIRE', 'ALL']) {
  const option = getOptions(stationType).find(
    item => item.vehicleTypeId === '107'
  );
  assert.ok(option, `Type 107 must appear under ${stationType}`);
  assert.equal(option.vehicleType, 'Road Rail Unit');
  assert.equal(option.label, '🚒🚆 Road Rail Unit (RRU)');
}

assert.equal(
  getOptions('AIRFIELD').some(item => item.vehicleTypeId === '107'),
  false,
  'Road Rail Unit must not remain classified as Airfield'
);

assert.equal(
  makeVehicleName(
    { callsignBase: 'GLEN-FS' },
    'Road Rail Unit',
    1
  ),
  '🚒🚆 GLEN-FS-RRU-1'
);

assert.match(source, /function isRoadRailUnitVehicleCheckbox\(/);
assert.match(
  source,
  /return getVehicleTypeIdentifiers\(input\)\.includes\('107'\);/
);

console.log(
  'Road Rail Unit Naming type-107 identity, Fire classification and callsign contracts passed.'
);
