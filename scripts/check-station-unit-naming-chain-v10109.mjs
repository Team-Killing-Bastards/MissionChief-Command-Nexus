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

const suffixByTypeId = vm.runInNewContext(
  `(${extractExpression(
    'const STATION_OFFICER_SUFFIX_BY_VEHICLE_TYPE_ID = ',
    '\n\n    // MissionChief\'s own building type IDs.'
  )})`
);

const vehicleInfo = vm.runInNewContext(
  `(${extractExpression(
    'const VEHICLE_INFO = ',
    '\n\n    const UNIT_CLASS_ALL = '
  )})`
);

const namingFactory = vm.runInNewContext(`(
  function (
    STATION_BUILDING_TYPE_INFO,
    STATION_OFFICER_SUFFIX_BY_VEHICLE_TYPE_ID,
    STATION_STATE
  ) {
    ${extractFunction('normalizeStationAddressText', 'normalizeCoordinates')}
    ${extractFunction('extractStationArea', 'formatStationArea')}
    ${extractFunction('formatStationArea', 'buildStationName')}
    ${extractFunction('buildStationName', 'getExistingStationSequence')}
    ${extractFunction('getExistingStationSequence', 'createStationNameSequenceRegistry')}
    ${extractFunction('createStationNameSequenceRegistry', 'reserveStationNameSequence')}
    ${extractFunction('reserveStationNameSequence', 'getBuildingIdFromHref')}
    return {
      normalizeStationAddressText,
      extractStationArea,
      formatStationArea,
      buildStationName,
      createStationNameSequenceRegistry,
      reserveStationNameSequence
    };
  }
)`);

const makeVehicleNameFactory = vm.runInNewContext(`(
  function (VEHICLE_INFO) {
    ${extractFunction('makeVehicleName', 'navigateUnitIframe')}
    return makeVehicleName;
  }
)`);

const stationState = { nameSequencesByBase: new Map() };
const {
  normalizeStationAddressText,
  extractStationArea,
  formatStationArea,
  buildStationName,
  createStationNameSequenceRegistry,
  reserveStationNameSequence
} = namingFactory(
  {
    0: { suffix: '-FS' },
    2: { suffix: '-AS' },
    22: { suffix: '' }
  },
  suffixByTypeId,
  stationState
);
const makeVehicleName = makeVehicleNameFactory(vehicleInfo);

const rawReverseAddress =
  '<span>KY10 3DF</span><br>Anstruther Easter<br />Anstruther<br>Scotland';
const normalizedAddress = normalizeStationAddressText(rawReverseAddress);
assert.equal(
  normalizedAddress,
  'KY10 3DF, Anstruther Easter, Anstruther, Scotland'
);

const parsedAddress = extractStationArea(normalizedAddress);
assert.equal(parsedAddress.postcode, 'KY10 3DF');
assert.equal(parsedAddress.area, 'Anstruther');

const formattedArea = formatStationArea(parsedAddress.area);
assert.equal(formattedArea, 'ANSTRUTHER');

const officerCases = [
  { vehicleTypeId: '20', vehicleType: 'OTL', suffix: '-OTL' },
  { vehicleTypeId: '3', vehicleType: 'Fire Officer', suffix: '-FO' },
  { vehicleTypeId: '34', vehicleType: 'Ambulance Officer', suffix: '-AO' }
];

stationState.nameSequencesByBase = createStationNameSequenceRegistry([
  { buildingId: '1', displayName: 'ANSTRUTHER-FO' },
  { buildingId: '2', displayName: 'ANSTRUTHER EASTER ANSTRUTHER-FO' },
  { buildingId: '3', displayName: 'KIRK-AO 2' },
  { buildingId: '4', displayName: 'ANSTRUTHER-FS1' }
]);

assert.equal(
  reserveStationNameSequence(
    formattedArea,
    '-FO',
    { buildingId: '1', displayName: 'ANSTRUTHER-FO' }
  ),
  '1',
  'The existing canonical unnumbered station must reserve sequence 1'
);

for (const testCase of officerCases) {
  assert.equal(suffixByTypeId[testCase.vehicleTypeId], testCase.suffix);

  const expectedStationSequence = testCase.vehicleTypeId === '3' ? '2' : '1';

  const stationSequence = reserveStationNameSequence(
    formattedArea,
    testCase.suffix,
    {
      buildingId: testCase.vehicleTypeId === '3'
        ? '2'
        : `officer-${testCase.vehicleTypeId}`,
      displayName: `ANSTRUTHER EASTER ANSTRUTHER${testCase.suffix}`
    }
  );
  assert.equal(stationSequence, expectedStationSequence);

  const stationName = buildStationName(
    formattedArea,
    testCase.suffix,
    `ANSTRUTHER EASTER ANSTRUTHER${testCase.suffix}`,
    stationSequence
  );
  assert.equal(
    stationName,
    `ANSTRUTHER${testCase.suffix}${expectedStationSequence}`
  );

  const vehicleName = makeVehicleName(
    {
      buildingTypeId: 22,
      callsignBase: stationName
    },
    testCase.vehicleType,
    1
  );
  const expectedIcon = vehicleInfo[testCase.vehicleType].icon;
  assert.equal(
    vehicleName,
    `${expectedIcon} ANSTRUTHER${testCase.suffix}${expectedStationSequence}${testCase.suffix}-1`,
    `${testCase.vehicleType} must follow the complete numbered station name`
  );
}

const secondFireOfficerSequence = reserveStationNameSequence(
  formattedArea,
  '-FO',
  { buildingId: 'second-fo', displayName: 'ANSTRUTHER-FO' }
);
assert.equal(secondFireOfficerSequence, '3');
assert.equal(
  buildStationName(formattedArea, '-FO', 'ANSTRUTHER-FO', secondFireOfficerSequence),
  'ANSTRUTHER-FO3'
);

assert.equal(
  reserveStationNameSequence(
    'KIRK',
    '-AO',
    { buildingId: '3', displayName: 'KIRK-AO 2' }
  ),
  '2',
  'An existing station sequence must remain authoritative'
);

stationState.nameSequencesByBase = createStationNameSequenceRegistry([
  { buildingId: 'duplicate-a', displayName: 'GLEN-AO-1' },
  { buildingId: 'duplicate-b', displayName: 'GLEN-AO-1' }
]);
assert.equal(
  reserveStationNameSequence(
    'GLEN',
    '-AO',
    { buildingId: 'duplicate-a', displayName: 'GLEN-AO-1' }
  ),
  '1'
);
assert.equal(
  reserveStationNameSequence(
    'GLEN',
    '-AO',
    { buildingId: 'duplicate-b', displayName: 'GLEN-AO-1' }
  ),
  '2',
  'Duplicate existing station numbers must be separated deterministically'
);

assert.equal(
  makeVehicleName(
    { buildingTypeId: 22, callsignBase: 'ANSTRUTHER-FO1' },
    'Rescue Pump',
    1
  ),
  '🚒 ANSTRUTHER-FO1-RP-1',
  'Other vehicles at an officer response location must retain their own code'
);

assert.equal(
  makeVehicleName(
    { buildingTypeId: 0, callsignBase: 'ANSTRUTHER-FS1' },
    'Incident Command and Control Unit',
    1
  ),
  '🔥🚒🔥 ANSTRUTHER-FS1-ICCU-1',
  'Ordinary station and unit naming must remain unchanged'
);

const newlineAddress = normalizeStationAddressText(
  'KY10 3DF\nAnstruther Easter\nAnstruther\nScotland'
);
assert.equal(
  newlineAddress,
  'KY10 3DF, Anstruther Easter, Anstruther, Scotland'
);

console.log(
  'Numbered Station Naming and full station-name plus vehicle-type Unit Naming contracts passed.'
);
