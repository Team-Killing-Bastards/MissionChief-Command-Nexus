#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function extractFunction(name) {
  const asyncMarker = `async function ${name}(`;
  const syncMarker = `function ${name}(`;
  const asyncStart = source.indexOf(asyncMarker);
  const start = asyncStart >= 0 ? asyncStart : source.indexOf(syncMarker);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';

    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) {
      return source.slice(start, index + 1);
    }
  }

  assert.fail(`Unterminated function ${name}`);
}

class StationRow {
  constructor(id, buildingTypeId, dispatchCentreId) {
    this.id = `building_list_${id}`;
    this.attrs = {
      building_type_id: String(buildingTypeId),
      leitstelle_building_id:
        dispatchCentreId == null ? 'null' : String(dispatchCentreId)
    };
    this.dataset = {};
  }

  getAttribute(name) {
    return this.attrs[name] ?? '';
  }

  querySelector() {
    return null;
  }
}

class MutablePopoutDocument {
  constructor() {
    this.rows = [];
  }

  querySelectorAll(selector) {
    if (selector === 'iframe') return [];
    if (
      selector.includes('.building_list_li') ||
      selector.includes('[leitstelle_building_id]') ||
      selector.includes('[data-leitstelle-building-id]')
    ) {
      return this.rows;
    }
    return [];
  }
}

assert.ok(source.includes('// @version      1.0.121'));
assert.ok(source.includes("const UNIT_VERSION = '3.3.27';"));
assert.ok(source.includes("const STATION_VERSION = '1.3.22';"));

const document = new MutablePopoutDocument();
const windowObject = { document };
windowObject.top = windowObject;

const context = {
  document,
  window: windowObject,
  NAMING_DISPATCH_CENTRE_STATE: {
    byBuildingId: new Map(),
    loadPromise: null,
    loaded: false,
    lastAssignmentError: ''
  },
  NAMING_DISPATCH_CENTRE_ALL: 'ALL',
  NAMING_DISPATCH_CENTRE_UNASSIGNED: '__UNASSIGNED__',
  NAMING_SERVICE_BY_BUILDING_TYPE_ID: {
    0: 'FIRE',
    18: 'FIRE',
    2: 'AMBULANCE',
    20: 'AMBULANCE',
    5: 'AMBULANCE',
    6: 'POLICE',
    19: 'POLICE',
    13: 'POLICE',
    35: 'POLICE',
    27: 'SAR',
    28: 'SAR',
    30: 'SAR',
    33: 'SAR',
    34: 'RECOVERY'
  },
  cleanText: value => String(value || '').replace(/\s+/g, ' ').trim(),
  Promise,
  Map,
  Set,
  String,
  Number,
  console,
  resultPromise: null,
  result: null,
  stations: null
};

vm.runInNewContext(
  `${extractFunction('getNamingStationRowBuildingId')}\n` +
    `${extractFunction('getNamingStationRowDispatchCentreId')}\n` +
    `${extractFunction('getNamingDispatchCentreStationRowDocuments')}\n` +
    `${extractFunction('refreshNamingDispatchCentreAssignmentsFromStationRows')}\n` +
    `${extractFunction('loadNamingDispatchCentreData')}\n` +
    `${extractFunction('getNamingDispatchCentreId')}\n` +
    `${extractFunction('syncNamingStationDispatchCentreAssignments')}\n` +
    `${extractFunction('stationMatchesNamingDispatchCentre')}\n` +
    `${extractFunction('getNamingServiceForStation')}\n` +
    'resultPromise = loadNamingDispatchCentreData(false);',
  context
);

await context.resultPromise;
assert.equal(
  context.NAMING_DISPATCH_CENTRE_STATE.byBuildingId.size,
  0,
  'The fixture must reproduce the early empty membership snapshot'
);

document.rows = [
  new StationRow('3000001', 18, '2638524'),
  new StationRow('3000002', 0, '2638524'),
  new StationRow('3000003', 20, '2638525'),
  new StationRow('3000004', 18, null)
];

vm.runInNewContext(
  'resultPromise = loadNamingDispatchCentreData(false);',
  context
);
await context.resultPromise;
assert.equal(
  context.NAMING_DISPATCH_CENTRE_STATE.byBuildingId.size,
  0,
  'A non-forced read must demonstrate why the early cached snapshot was stale'
);

vm.runInNewContext(
  'resultPromise = loadNamingDispatchCentreData(true);',
  context
);
await context.resultPromise;

const assignments = context.NAMING_DISPATCH_CENTRE_STATE.byBuildingId;
assert.equal(assignments.get('3000001'), '2638524');
assert.equal(assignments.get('3000002'), '2638524');
assert.equal(assignments.get('3000003'), '2638525');
assert.equal(assignments.has('3000004'), false);

context.stations = [
  { buildingId: '3000001', buildingTypeId: 18, stationType: 'FIRE', dispatchCentreId: '' },
  { buildingId: '3000002', buildingTypeId: 0, stationType: 'FIRE', dispatchCentreId: '' },
  { buildingId: '3000003', buildingTypeId: 20, stationType: 'AMBULANCE', dispatchCentreId: '' },
  { buildingId: '3000004', buildingTypeId: 18, stationType: 'FIRE', dispatchCentreId: '' }
];

vm.runInNewContext(
  `syncNamingStationDispatchCentreAssignments(stations);
   result = {
     niFire: stations.filter(station =>
       stationMatchesNamingDispatchCentre(station, '2638524')
     ),
     services: [...new Set(
       stations
         .filter(station => stationMatchesNamingDispatchCentre(station, '2638524'))
         .map(getNamingServiceForStation)
     )],
     unassigned: stations.filter(station =>
       stationMatchesNamingDispatchCentre(station, '__UNASSIGNED__')
     )
   };`,
  context
);

assert.equal(
  JSON.stringify(context.result.niFire.map(station => station.buildingId)),
  JSON.stringify(['3000001', '3000002'])
);
assert.equal(
  JSON.stringify(context.result.services),
  JSON.stringify(['FIRE'])
);
assert.equal(
  JSON.stringify(context.result.unassigned.map(station => station.buildingId)),
  JSON.stringify(['3000004'])
);

for (const name of [
  'refreshStations',
  'refreshStationNamingStations'
]) {
  const refresh = extractFunction(name);
  assert.ok(
    refresh.includes('loadNamingDispatchCentreData(true)'),
    `${name} must rescan the current native membership rows`
  );
  assert.equal(
    refresh.includes('loadNamingDispatchCentreData(false)'),
    false,
    `${name} must not reuse an early standalone membership snapshot`
  );
}

const centreRefresh = extractFunction('refreshNamingDispatchCentres');
assert.ok(
  centreRefresh.includes(
    'syncNamingStationDispatchCentreAssignments(STATE.stations)'
  )
);
assert.ok(
  centreRefresh.includes(
    'syncNamingStationDispatchCentreAssignments(STATION_STATE.stations)'
  )
);

for (const block of [
  extractFunction('loadNamingDispatchCentreData'),
  extractFunction('syncNamingStationDispatchCentreAssignments'),
  extractFunction('refreshStations'),
  extractFunction('refreshStationNamingStations')
]) {
  assert.equal(block.includes('window.opener'), false);
  assert.equal(block.includes('fetch('), false);
  assert.equal(block.includes('window.open('), false);
  assert.equal(block.includes('.click('), false);
}

console.log(
  'Late-rendered standalone station memberships now rebuild Unit and Station Naming cascades.'
);
