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

const vehicleInfo = vm.runInNewContext(
  `(${extractExpression(
    'const VEHICLE_INFO = ',
    '\n\n    const UNIT_CLASS_ALL = '
  )})`
);

const stationState = { nameSequencesByBase: new Map() };
const namingFactory = vm.runInNewContext(`(
  function (STATION_NAMING_MODE_TOWN_ONLY, STATION_BUILDING_TYPE_INFO, STATION_STATE) {
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

const makeVehicleName = vm.runInNewContext(`(
  function (VEHICLE_INFO) {
    ${extractFunction('makeVehicleName', 'navigateUnitIframe')}
    return makeVehicleName;
  }
)`)(vehicleInfo);

const {
  normalizeStationAddressText,
  extractStationArea,
  formatStationArea,
  buildStationName,
  createStationNameSequenceRegistry,
  reserveStationNameSequence
} = namingFactory(
  townOnlyMode,
  {
    0: { suffix: '-FS' },
    2: { suffix: '-AS' },
    22: { suffix: '', namingMode: townOnlyMode }
  },
  stationState
);

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

const stationName = buildStationName(
  formattedArea,
  '',
  'ANSTRUTHER EASTER ANSTRUTHER-FO1',
  '',
  townOnlyMode
);
assert.equal(stationName, 'ANSTRUTHER');

for (const [vehicleType, code] of [
  ['Fire Officer', 'FO'],
  ['Ambulance Officer', 'AO'],
  ['OTL', 'OTL'],
  ['DSU', 'DSU']
]) {
  const expectedIcon = vehicleInfo[vehicleType].icon;
  assert.equal(
    makeVehicleName(
      { buildingTypeId: 22, callsignBase: stationName },
      vehicleType,
      1
    ),
    `${expectedIcon} ANSTRUTHER-${code}-1`
  );
}

stationState.nameSequencesByBase = createStationNameSequenceRegistry([
  { buildingId: '1', displayName: 'ANSTRUTHER-FS1' },
  { buildingId: '2', displayName: 'ANSTRUTHER-FS2' },
  {
    buildingId: '3',
    buildingTypeId: 22,
    displayName: 'ANSTRUTHER-FO1',
    namingMode: townOnlyMode
  }
]);

assert.equal(
  reserveStationNameSequence(
    formattedArea,
    '-FS',
    { buildingId: '1', displayName: 'ANSTRUTHER-FS1' }
  ),
  '1'
);
assert.equal(
  reserveStationNameSequence(
    formattedArea,
    '-FS',
    { buildingId: 'new-fire', displayName: 'ANSTRUTHER-FS' }
  ),
  '3',
  'Town-only response locations must not consume ordinary station sequences'
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

console.log(
  'Station address, type-22 town-only station and role-owned Unit Naming chain contracts passed.'
);
