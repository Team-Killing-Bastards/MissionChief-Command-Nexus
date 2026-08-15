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
    vehicleTypeId: '13',
    vehicleType: 'Armed Response Vehicle',
    code: 'ARV',
    icon: '🚔🎯'
  },
  {
    vehicleTypeId: '19',
    vehicleType: 'Joint Response Unit',
    code: 'JRU',
    icon: '🚔🚑'
  },
  {
    vehicleTypeId: '24',
    vehicleType: 'Traffic Car',
    code: 'TC',
    icon: '🚔🚗'
  },
  {
    vehicleTypeId: '52',
    vehicleType: 'Firearms Personnel Carrier',
    code: 'FPC',
    icon: '🚔🛡️'
  }
];

const policeOptions = getOptions('POLICE');
const allOptions = getOptions('ALL');

for (const expected of expectedClasses) {
  assert.equal(
    typeIdToVehicleType[expected.vehicleTypeId],
    expected.vehicleType,
    `Type ${expected.vehicleTypeId} must retain its verified MissionChief label`
  );
  assert.equal(
    vehicleInfo[expected.vehicleType]?.code,
    expected.code,
    `${expected.vehicleType} must retain the approved ${expected.code} code`
  );
  assert.equal(
    vehicleInfo[expected.vehicleType]?.icon,
    expected.icon,
    `${expected.vehicleType} must retain its distinct ${expected.icon} icon`
  );

  const policeOption = policeOptions.find(
    option => option.vehicleTypeId === expected.vehicleTypeId
  );
  assert.ok(
    policeOption,
    `${expected.vehicleType} must appear in the Police class selector`
  );
  assert.equal(policeOption.vehicleType, expected.vehicleType);
  assert.match(policeOption.label, new RegExp(`\\(${expected.code}\\)$`));

  const allOption = allOptions.find(
    option => option.vehicleTypeId === expected.vehicleTypeId
  );
  assert.ok(
    allOption,
    `${expected.vehicleType} must appear in the All classes selector`
  );

  const generatedName = makeVehicleName(
    { callsignBase: 'Fife-PS' },
    expected.vehicleType,
    1
  );
  assert.ok(generatedName, `${expected.vehicleType} must have a naming rule`);
  assert.ok(
    generatedName.startsWith(`${expected.icon} `),
    `${expected.vehicleType} generated an unexpected icon: ${generatedName}`
  );
  assert.ok(
    generatedName.endsWith(`Fife-PS-${expected.code}-1`),
    `${expected.vehicleType} generated an unexpected callsign: ${generatedName}`
  );
}

assert.match(source, /^\/\/ @version\s+1\.0\.122$/m);
assert.match(source, /const UNIT_VERSION = '3\.3\.27';/);
assert.match(source, /MODULE 2: MISSION FINDER V10\.6\.160/);

console.log(
  'Issue #295 Police Unit Naming identity, classification and callsign contracts passed.'
);
