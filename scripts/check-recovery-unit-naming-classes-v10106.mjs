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

const expectedClasses = [
  {
    vehicleTypeId: '105',
    vehicleType: 'Recovery Vehicle',
    code: 'FRV',
    icon: '🛻'
  },
  {
    vehicleTypeId: '106',
    vehicleType: 'HGV Recovery Vehicle',
    code: 'HGV',
    icon: '🚛'
  }
];

const recoveryOptions = getOptions('RECOVERY');
const allOptions = getOptions('ALL');

for (const expected of expectedClasses) {
  assert.equal(
    typeIdToVehicleType[expected.vehicleTypeId],
    expected.vehicleType,
    `Type ${expected.vehicleTypeId} must use its live MissionChief label`
  );
  assert.equal(
    vehicleInfo[expected.vehicleType]?.code,
    expected.code,
    `${expected.vehicleType} must use ${expected.code}`
  );
  assert.equal(
    vehicleInfo[expected.vehicleType]?.icon,
    expected.icon,
    `${expected.vehicleType} must use ${expected.icon}`
  );

  const recoveryOption = recoveryOptions.find(
    option => option.vehicleTypeId === expected.vehicleTypeId
  );
  assert.ok(
    recoveryOption,
    `${expected.vehicleType} must appear in the Recovery class selector`
  );
  assert.equal(recoveryOption.vehicleType, expected.vehicleType);
  assert.match(recoveryOption.label, new RegExp(`\\(${expected.code}\\)$`));

  const allOption = allOptions.find(
    option => option.vehicleTypeId === expected.vehicleTypeId
  );
  assert.ok(
    allOption,
    `${expected.vehicleType} must appear in the All classes selector`
  );

  const generatedName = makeVehicleName(
    { callsignBase: 'GLEN-RECOVERY' },
    expected.vehicleType,
    1
  );
  assert.equal(
    generatedName,
    `${expected.icon} GLEN-RECOVERY-${expected.code}-1`,
    `${expected.vehicleType} generated an unexpected callsign`
  );
}

assert.notEqual(
  expectedClasses[0].icon,
  expectedClasses[1].icon,
  'Recovery and HGV Recovery must remain visually distinct'
);

assert.equal(
  makeVehicleName(
    { callsignBase: 'GLEN-RECOVERY' },
    'Flatbed Recovery Vehicle',
    6
  ),
  '🛻 GLEN-RECOVERY-FRV-6',
  'The existing Flatbed Recovery naming alias must remain compatible'
);

console.log(
  'Recovery Unit Naming identity, class selector and callsign contracts passed.'
);
