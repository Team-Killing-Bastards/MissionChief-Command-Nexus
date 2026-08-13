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

const stationTypeInfo = vm.runInNewContext(
  `(${extractExpression(
    'const STATION_BUILDING_TYPE_INFO = ',
    '\n\n    const NAMING_SERVICES = '
  )})`
);
const serviceByType = vm.runInNewContext(
  extractExpression(
    'const NAMING_SERVICE_BY_BUILDING_TYPE_ID = Object.freeze(',
    '\n\n    const STATE = '
  )
);
const buildStationName = vm.runInNewContext(`(
  function () {
    ${extractFunction('buildStationName', 'getExistingStationSequence')}
    ${extractFunction('getExistingStationSequence', 'getBuildingIdFromHref')}
    return buildStationName;
  }
)()`);

assert.deepEqual(
  { ...stationTypeInfo[22] },
  {
    stationType: 'AMBULANCE',
    suffix: '-AO',
    label: 'Ambulance officer station',
    preserveSequence: false
  }
);
assert.equal(serviceByType[22], 'AMBULANCE');
assert.equal(
  buildStationName(
    'KIRK',
    stationTypeInfo[22].suffix,
    'KIRK-AO1',
    stationTypeInfo[22].preserveSequence !== false
  ),
  'KIRK-AO'
);
assert.equal(
  buildStationName('KIRK', '-AS', 'KIRK-AS3'),
  'KIRK-AS3',
  'Other station types must continue preserving their sequence'
);

console.log(
  'Ambulance Officer station type 22 naming contract passed.'
);
