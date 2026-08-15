#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function extractFunction(name, nextFunctionName) {
  const startMarker = `function ${name}(`;
  const functionStart = source.indexOf(startMarker);
  assert.notEqual(functionStart, -1, `Missing function: ${name}`);
  const start = source.slice(functionStart - 6, functionStart) === 'async '
    ? functionStart - 6
    : functionStart;

  const end = [
    source.indexOf(`\n\n    function ${nextFunctionName}(`, start),
    source.indexOf(`\n\n    async function ${nextFunctionName}(`, start)
  ]
    .filter(index => index >= 0)
    .sort((left, right) => left - right)[0] ?? -1;
  assert.notEqual(end, -1, `Missing function after ${name}: ${nextFunctionName}`);
  return source.slice(start, end);
}

assert.ok(source.includes('// @version      1.0.122'));
assert.ok(source.includes("const STATION_VERSION = '1.3.22';"));

const parserFactory = vm.runInNewContext(`(
  function () {
    ${extractFunction('normalizeStationAddressText', 'normalizeCoordinates')}
    ${extractFunction('extractStationArea', 'formatStationArea')}
    return { normalizeStationAddressText, extractStationArea };
  }
)`);

const { normalizeStationAddressText, extractStationArea } = parserFactory();

const liveMoveAddress =
  'Ladywalk, KY10 3EX Anstruther Easter Anstruther';
assert.equal(normalizeStationAddressText(liveMoveAddress), liveMoveAddress);
assert.deepEqual(
  JSON.parse(JSON.stringify(extractStationArea(liveMoveAddress))),
  {
    postcode: 'KY10 3EX',
    afterPostcode: 'Anstruther Easter Anstruther',
    area: 'Anstruther'
  },
  'The exact Move Building value from the live failure must resolve to its post town'
);

assert.equal(
  extractStationArea(
    'Ladywalk, KY10 3EX Anstruther Easter Anstruther Scotland'
  ).area,
  'Anstruther',
  'An unseparated country suffix must not prevent repeated-post-town recovery'
);

assert.equal(
  extractStationArea(
    'Main Street, FK9 4LA Lower Town Bridge of Allan Bridge of Allan'
  ).area,
  'Bridge of Allan',
  'The longest repeated terminal post town must be retained'
);

for (const [address, expectedArea] of [
  ['High Street, EH30 9XX South Queensferry', 'South Queensferry'],
  ['Market Street, KY16 9AA St Andrews', 'St Andrews'],
  ['The Square, PH26 3HG Grantown-on-Spey', 'Grantown-on-Spey']
]) {
  assert.equal(
    extractStationArea(address).area,
    expectedArea,
    `Ordinary multi-word post town must remain intact: ${expectedArea}`
  );
}

const resolveFactory = vm.runInNewContext(`(
  function ({
    getStationCoordinates,
    fetchMissionChiefReverseAddress,
    fetchStationMoveAddress,
    stationDebug
  }) {
    ${extractFunction('resolveStationAddress', 'fetchStationMoveAddress')}
    return resolveStationAddress;
  }
)`);

let moveReadCount = 0;
const reverseFirstResolver = resolveFactory({
  getStationCoordinates: async () => ({
    latitude: 56.223,
    longitude: -2.702,
    source: 'MissionChief buildings data'
  }),
  fetchMissionChiefReverseAddress: async () => ({
    address: 'KY10 3EX, Anstruther Easter, Anstruther, Scotland'
  }),
  fetchStationMoveAddress: async () => {
    moveReadCount += 1;
    return {
      address: liveMoveAddress,
      source: 'Move building page (background read only)'
    };
  },
  stationDebug: () => {}
});

const reverseFirstResult = await reverseFirstResolver(
  { displayName: 'ANSTRUTHER EASTER ANSTRUTHER-FS1' },
  {}
);
assert.equal(
  reverseFirstResult.source,
  'MissionChief reverse address via MissionChief buildings data'
);
assert.equal(extractStationArea(reverseFirstResult.address).area, 'Anstruther');
assert.equal(
  moveReadCount,
  0,
  'The flattened Move Building value must not override a structured reverse address'
);

const moveFallbackResolver = resolveFactory({
  getStationCoordinates: async () => ({
    latitude: 56.223,
    longitude: -2.702,
    source: 'station page'
  }),
  fetchMissionChiefReverseAddress: async () => ({
    address: '',
    error: 'simulated reverse-address failure'
  }),
  fetchStationMoveAddress: async () => ({
    address: liveMoveAddress,
    source: 'Move building page (background read only)'
  }),
  stationDebug: () => {}
});

const moveFallbackResult = await moveFallbackResolver(
  { displayName: 'ANSTRUTHER EASTER ANSTRUTHER-FS1' },
  {}
);
assert.equal(moveFallbackResult.source, 'Move building page (background read only)');
assert.equal(
  extractStationArea(moveFallbackResult.address).area,
  'Anstruther',
  'The exact live Move Building value must remain safe when reverse lookup is unavailable'
);

console.log(
  'Station Naming reverse-address priority and flattened Move Building fallback contracts passed.'
);
