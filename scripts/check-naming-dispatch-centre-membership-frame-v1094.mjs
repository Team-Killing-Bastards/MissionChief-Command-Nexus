#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const asyncMarker = `async function ${name}(`;
  const syncMarker = `function ${name}(`;
  const asyncStart = source.indexOf(asyncMarker);
  const start = asyncStart >= 0 ? asyncStart : source.indexOf(syncMarker);
  if (start < 0) fail(`Unable to find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false;
  for (let i = brace; i < source.length; i += 1) {
    const c = source[i], n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(`Unterminated ${name}`);
}

class Row {
  constructor(id, buildingTypeId, dispatchCentreId) {
    this.id = `building_list_${id}`;
    this.attrs = {
      building_type_id: String(buildingTypeId),
      leitstelle_building_id: dispatchCentreId == null ? 'null' : String(dispatchCentreId)
    };
    this.dataset = {};
  }
  getAttribute(name) { return this.attrs[name] ?? ''; }
  querySelector() { return null; }
}

class FixtureDocument {
  constructor(rows = [], frames = []) {
    this.rows = rows;
    this.frames = frames;
  }
  querySelectorAll(selector) {
    if (selector === 'iframe') return this.frames;
    if (
      selector.includes('.building_list_li') ||
      selector.includes('[leitstelle_building_id]') ||
      selector.includes('[data-leitstelle-building-id]')
    ) return this.rows;
    return [];
  }
}

expect(source.includes('// @version      1.0.114'), 'Expected Command Nexus 1.0.94');
expect(source.includes("const UNIT_VERSION = '3.3.24';"), 'Expected Unit Naming 3.3.19');
expect(source.includes("const STATION_VERSION = '1.3.19';"), 'Expected Station Naming 1.3.13');

// The live failure is specifically cross-document: the naming UI can live in the
// top Stations host while the native building rows carrying leitstelle_building_id
// live in the same-origin Resource Administration child frame.
const niFireA = new Row('3000001', 18, '2638524');
const niFireB = new Row('3000002', 0, '2638524');
const niAmbulance = new Row('3000003', 20, '2638525');
const genuinelyUnassigned = new Row('3000004', 18, null);
const niFireDispatchCentre = new Row('2638524', 7, null);
const resourceAdministrationDocument = new FixtureDocument([
  niFireA,
  niFireB,
  niAmbulance,
  genuinelyUnassigned,
  niFireDispatchCentre
]);
const resourceFrame = { contentDocument: resourceAdministrationDocument };
const topDocument = new FixtureDocument([], [resourceFrame]);

const context = {
  document: topDocument,
  window: { top: { document: topDocument } },
  NAMING_DISPATCH_CENTRE_STATE: {
    byBuildingId: new Map(),
    loaded: false
  },
  NAMING_DISPATCH_CENTRE_ALL: 'ALL',
  NAMING_DISPATCH_CENTRE_UNASSIGNED: '__UNASSIGNED__',
  NAMING_SERVICE_BY_BUILDING_TYPE_ID: {
    0: 'FIRE', 18: 'FIRE', 2: 'AMBULANCE', 20: 'AMBULANCE', 5: 'AMBULANCE',
    6: 'POLICE', 19: 'POLICE', 13: 'POLICE', 35: 'POLICE',
    27: 'SAR', 28: 'SAR', 30: 'SAR', 33: 'SAR', 34: 'RECOVERY'
  },
  Map, Set, String, Number, result: null
};

vm.runInNewContext(
  `${extractFunction('getNamingStationRowBuildingId')}\n` +
  `${extractFunction('getNamingStationRowDispatchCentreId')}\n` +
  `${extractFunction('getNamingDispatchCentreStationRowDocuments')}\n` +
  `${extractFunction('refreshNamingDispatchCentreAssignmentsFromStationRows')}\n` +
  `${extractFunction('getNamingDispatchCentreId')}\n` +
  `${extractFunction('stationMatchesNamingDispatchCentre')}\n` +
  `${extractFunction('getNamingServiceForStation')}\n` +
  `refreshNamingDispatchCentreAssignmentsFromStationRows();\n` +
  `result = {
    assignments: [...NAMING_DISPATCH_CENTRE_STATE.byBuildingId.entries()],
    ids: ['3000001','3000002','3000003','3000004'].map(getNamingDispatchCentreId)
  };`,
  context
);

const assignments = new Map(context.result.assignments);
expect(assignments.get('3000001') === '2638524', 'First NI Fire station must join to NI Fire Dispatch');
expect(assignments.get('3000002') === '2638524', 'Second NI Fire station must join to NI Fire Dispatch');
expect(assignments.get('3000003') === '2638525', 'NI Ambulance station must join to NI Ambulance Dispatch');
expect(!assignments.has('3000004'), 'Literal null station must remain genuinely unassigned');
expect(!assignments.has('2638524'), 'Dispatch Centre row itself must not create a station assignment');
expect(JSON.stringify(context.result.ids) === JSON.stringify(['2638524','2638524','2638525','']), `Unexpected membership IDs: ${JSON.stringify(context.result.ids)}`);

context.stations = [
  { buildingId:'3000001', buildingTypeId:18, stationType:'FIRE', dispatchCentreId:context.result.ids[0] },
  { buildingId:'3000002', buildingTypeId:0, stationType:'FIRE', dispatchCentreId:context.result.ids[1] },
  { buildingId:'3000003', buildingTypeId:20, stationType:'AMBULANCE', dispatchCentreId:context.result.ids[2] },
  { buildingId:'3000004', buildingTypeId:18, stationType:'FIRE', dispatchCentreId:context.result.ids[3] }
];
vm.runInNewContext(
  `result = {
    niFire: stations.filter(station => stationMatchesNamingDispatchCentre(station, '2638524')),
    unassigned: stations.filter(station => stationMatchesNamingDispatchCentre(station, '__UNASSIGNED__'))
  };`,
  context
);
expect(context.result.niFire.length === 2, `NI Fire Dispatch must expose exactly two fixture stations, got ${context.result.niFire.length}`);
expect(context.result.niFire.every(station => context.getNamingServiceForStation ? true : true), 'NI Fire station subset missing');

// Re-enter the production service helper directly so the selected centre is proven
// to produce the downstream Service stage rather than falling into Unassigned/default.
context.scoped = context.result.niFire;
vm.runInNewContext(`result = [...new Set(scoped.map(getNamingServiceForStation))];`, context);
expect(JSON.stringify(context.result) === JSON.stringify(['FIRE']), `NI Fire Dispatch must expose Fire & Rescue service, got ${JSON.stringify(context.result)}`);

context.stations = context.stations || [];
vm.runInNewContext(
  `result = stations.filter(station => stationMatchesNamingDispatchCentre(station, '__UNASSIGNED__'));`,
  context
);
expect(context.result.length === 1 && context.result[0].buildingId === '3000004', 'Only literal-null station may appear under Unassigned/default');

const assignmentLoader = extractFunction('refreshNamingDispatchCentreAssignmentsFromStationRows');
expect(assignmentLoader.includes('getNamingDispatchCentreStationRowDocuments()'), 'Membership loader must use the same cross-frame document collection as centre discovery');
expect(!assignmentLoader.includes('...document.querySelectorAll('), 'Membership loader must not be restricted to the current document');

console.log('PASS: v1.0.94 joins frame-hosted station leitstelle_building_id assignments to Dispatch Centre, Service and Unassigned filtering.');
