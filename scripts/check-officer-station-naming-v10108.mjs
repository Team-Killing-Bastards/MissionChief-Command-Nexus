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

const dynamicRule = vm.runInNewContext(
  extractExpression(
    'const STATION_DYNAMIC_SUFFIX_OFFICER_VEHICLE = ',
    '\n    const STATION_OFFICER_SUFFIX_BY_VEHICLE_TYPE_ID = '
  )
);

const suffixByTypeId = vm.runInNewContext(
  `(${extractExpression(
    'const STATION_OFFICER_SUFFIX_BY_VEHICLE_TYPE_ID = ',
    '\n\n    // MissionChief\'s own building type IDs.'
  )})`
);

const buildingTypeInfo = vm.runInNewContext(`(
  function (STATION_DYNAMIC_SUFFIX_OFFICER_VEHICLE) {
    return ${extractExpression(
      'const STATION_BUILDING_TYPE_INFO = ',
      '\n\n    const NAMING_SERVICES = '
    )};
  }
)`)(dynamicRule);

const resolveSuffixFactory = vm.runInNewContext(`(
  function (
    STATION_DYNAMIC_SUFFIX_OFFICER_VEHICLE,
    STATION_OFFICER_SUFFIX_BY_VEHICLE_TYPE_ID
  ) {
    ${extractFunction(
      'getStationOfficerVehicleTypeIds',
      'resolveStationNamingSuffix'
    )}
    ${extractFunction('resolveStationNamingSuffix', 'extractStationArea')}
    return resolveStationNamingSuffix;
  }
)`);

const namingFactory = vm.runInNewContext(`(
  function () {
    ${extractFunction('buildStationName', 'getExistingStationSequence')}
    ${extractFunction('getExistingStationSequence', 'getBuildingIdFromHref')}
    return buildStationName;
  }
)`);

const resolveSuffix = resolveSuffixFactory(dynamicRule, suffixByTypeId);
const buildStationName = namingFactory();

assert.equal(dynamicRule, 'OFFICER_VEHICLE');
assert.deepEqual(
  JSON.parse(JSON.stringify(suffixByTypeId)),
  { '3': '-FO', '20': '-OTL', '34': '-AO' }
);
assert.equal(buildingTypeInfo[22]?.stationType, 'OTHER');
assert.equal(buildingTypeInfo[22]?.suffix, '');
assert.equal(buildingTypeInfo[22]?.dynamicSuffixRule, dynamicRule);
assert.equal(buildingTypeInfo[22]?.label, 'Officer response location');

function fakeVehicleElement(vehicleTypeId, attribute = 'vehicle_type_id') {
  return {
    getAttribute(name) {
      return name === attribute ? vehicleTypeId : null;
    }
  };
}

function fakeStationDocument(elements) {
  return {
    querySelectorAll(selector) {
      assert.equal(
        selector,
        '#vehicle_table [vehicle_type_id], #vehicle_table [data-vehicle-type-id]'
      );
      return elements;
    }
  };
}

const dynamicStation = {
  buildingTypeId: 22,
  suffix: '',
  dynamicSuffixRule: dynamicRule
};

for (const [vehicleTypeId, suffix] of Object.entries(suffixByTypeId)) {
  const result = resolveSuffix(
    dynamicStation,
    fakeStationDocument([fakeVehicleElement(vehicleTypeId)])
  );
  assert.equal(result.suffix, suffix);
  assert.equal(result.vehicleTypeId, vehicleTypeId);
  assert.equal(result.error, '');
}

const dataAttributeResult = resolveSuffix(
  dynamicStation,
  fakeStationDocument([fakeVehicleElement('34', 'data-vehicle-type-id')])
);
assert.equal(dataAttributeResult.suffix, '-AO');

const duplicateTypeResult = resolveSuffix(
  dynamicStation,
  fakeStationDocument([
    fakeVehicleElement('20'),
    fakeVehicleElement('20')
  ])
);
assert.equal(duplicateTypeResult.suffix, '-OTL');

const unsupportedResult = resolveSuffix(
  dynamicStation,
  fakeStationDocument([fakeVehicleElement('5')])
);
assert.equal(unsupportedResult.suffix, '');
assert.match(unsupportedResult.error, /no supported officer vehicle/i);

const ambiguousResult = resolveSuffix(
  dynamicStation,
  fakeStationDocument([
    fakeVehicleElement('3'),
    fakeVehicleElement('34')
  ])
);
assert.equal(ambiguousResult.suffix, '');
assert.match(ambiguousResult.error, /multiple officer vehicle types \(3, 34\)/i);

const staticResult = resolveSuffix(
  { buildingTypeId: 0, suffix: '-FS', dynamicSuffixRule: '' },
  fakeStationDocument([])
);
assert.equal(staticResult.suffix, '-FS');

assert.equal(
  buildStationName('KIRK', '-AO', 'KIRK-AO1', false),
  'KIRK-AO'
);
assert.equal(
  buildStationName('KIRK', '-OTL', 'KIRK-AO1', false),
  'KIRK-OTL'
);
assert.equal(
  buildStationName('KIRK', '-FO', 'KIRK-AO1', false),
  'KIRK-FO'
);
assert.equal(
  buildStationName('KIRK', '-FS', 'KIRK-FS2'),
  'KIRK-FS2',
  'Existing static station numbering must remain unchanged'
);

assert.match(source, /if \(!station\.suffix && !station\.dynamicSuffixRule\)/);
assert.match(source, /const preserveSequence = !station\.dynamicSuffixRule;/);
assert.match(source, /vehicle_type_id=\$\{suffixResult\.vehicleTypeId\}/);

console.log(
  'Officer response location Station Naming contracts passed for exact type 20 OTL, type 3 FO and type 34 AO resolution.'
);
