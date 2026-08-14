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

class DispatchCentreControl {
  constructor(id, label) {
    this.attrs = { leitstelle: id };
    this.textContent = label;
  }
  getAttribute(name) { return this.attrs[name] ?? ''; }
}

class StationRow {
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

class PopoutDocument {
  constructor(controls, rows) {
    this.controls = controls;
    this.rows = rows;
  }
  querySelectorAll(selector) {
    if (selector === 'iframe') return [];
    if (selector === '.leitstelle_selection[leitstelle]') return this.controls;
    if (selector.includes('building_type_id="7"')) {
      return this.rows.filter(row => row.getAttribute('building_type_id') === '7');
    }
    if (
      selector.includes('.building_list_li') ||
      selector.includes('[leitstelle_building_id]') ||
      selector.includes('[data-leitstelle-building-id]')
    ) return this.rows;
    return [];
  }
}

expect(source.includes('// @version      1.0.112'), 'Expected Command Nexus 1.0.112');
expect(source.includes("const UNIT_VERSION = '3.3.24';"), 'Expected Unit Naming 3.3.24');
expect(source.includes("const STATION_VERSION = '1.3.19';"), 'Expected Station Naming 1.3.19');

// Exact standalone /leitstellenansicht shape from the supplied live HTML: the
// navbar has Dispatch Centre ID/name controls, station cards have membership,
// and there are deliberately no type-7 building cards.
const controls = [
  new DispatchCentreControl('2645996', 'Fife Fire Dispatch'),
  new DispatchCentreControl('2638525', 'NI Ambulance Dispatch'),
  new DispatchCentreControl('2638524', 'NI Fire Dispatch')
];
const rows = [
  new StationRow('3000001', 0, '2645996'),
  new StationRow('3000002', 2, '2638525'),
  new StationRow('3000003', 0, '2638524'),
  new StationRow('3000004', 22, null)
];
const document = new PopoutDocument(controls, rows);
const windowObject = { document };
windowObject.top = windowObject;

const context = {
  document,
  window: windowObject,
  location: { origin: 'https://www.missionchief.co.uk' },
  cleanText: value => String(value || '').replace(/\s+/g, ' ').trim(),
  NAMING_DISPATCH_CENTRE_STATE: {
    byBuildingId: new Map(),
    labelsById: new Map(),
    loadPromise: null,
    loaded: false,
    listPromise: null,
    listLoaded: false,
    lastAssignmentError: '',
    lastListError: ''
  },
  NAMING_DISPATCH_CENTRE_ALL: 'ALL',
  NAMING_DISPATCH_CENTRE_UNASSIGNED: '__UNASSIGNED__',
  NAMING_SERVICE_BY_BUILDING_TYPE_ID: {
    0: 'FIRE', 18: 'FIRE', 2: 'AMBULANCE', 20: 'AMBULANCE', 5: 'AMBULANCE',
    6: 'POLICE', 19: 'POLICE', 13: 'POLICE', 35: 'POLICE',
    27: 'SAR', 28: 'SAR', 30: 'SAR', 33: 'SAR', 34: 'RECOVERY'
  },
  URL,
  Promise,
  Map,
  Set,
  String,
  Number,
  console,
  resultPromise: null,
  result: null
};

vm.runInNewContext(
  `${extractFunction('getNamingStationRowBuildingId')}\n` +
  `${extractFunction('getNamingStationRowDispatchCentreId')}\n` +
  `${extractFunction('getNamingDispatchCentreIdFromHref')}\n` +
  `${extractFunction('extractNamingDispatchCentresFromStationRows')}\n` +
  `${extractFunction('extractNamingDispatchCentresFromStationControls')}\n` +
  `${extractFunction('getNamingDispatchCentreStationRowDocuments')}\n` +
  `${extractFunction('collectNamingDispatchCentresFromStationRows')}\n` +
  `${extractFunction('refreshNamingDispatchCentreAssignmentsFromStationRows')}\n` +
  `${extractFunction('loadNamingDispatchCentreList')}\n` +
  `${extractFunction('loadNamingDispatchCentreData')}\n` +
  `${extractFunction('getNamingDispatchCentreId')}\n` +
  `${extractFunction('stationMatchesNamingDispatchCentre')}\n` +
  `${extractFunction('getNamingServiceForStation')}\n` +
  `resultPromise = Promise.all([
    loadNamingDispatchCentreList(true),
    loadNamingDispatchCentreData(true)
  ]).then(([listLoaded, assignmentsLoaded]) => {
    const stations = [
      { buildingId:'3000001', buildingTypeId:0, dispatchCentreId:getNamingDispatchCentreId('3000001') },
      { buildingId:'3000002', buildingTypeId:2, dispatchCentreId:getNamingDispatchCentreId('3000002') },
      { buildingId:'3000003', buildingTypeId:0, dispatchCentreId:getNamingDispatchCentreId('3000003') },
      { buildingId:'3000004', buildingTypeId:22, dispatchCentreId:getNamingDispatchCentreId('3000004') }
    ];
    return {
      listLoaded,
      assignmentsLoaded,
      centres:[...NAMING_DISPATCH_CENTRE_STATE.labelsById.entries()],
      assignments:[...NAMING_DISPATCH_CENTRE_STATE.byBuildingId.entries()],
      niFire:stations.filter(station => stationMatchesNamingDispatchCentre(station, '2638524')),
      unassigned:stations.filter(station => stationMatchesNamingDispatchCentre(station, '__UNASSIGNED__'))
    };
  });`,
  context
);

const result = await context.resultPromise;
const centres = new Map(result.centres);
const assignments = new Map(result.assignments);

expect(result.listLoaded, 'Standalone popout Dispatch Centre names must load');
expect(result.assignmentsLoaded, 'Standalone popout station assignments must load');
expect(centres.size === 3, `Expected three popout Dispatch Centres, got ${centres.size}`);
expect(centres.get('2645996') === 'Fife Fire Dispatch', 'Fife Fire Dispatch navbar control missing');
expect(centres.get('2638525') === 'NI Ambulance Dispatch', 'NI Ambulance Dispatch navbar control missing');
expect(centres.get('2638524') === 'NI Fire Dispatch', 'NI Fire Dispatch navbar control missing');
expect(assignments.get('3000001') === '2645996', 'Fife Fire station membership missing');
expect(assignments.get('3000002') === '2638525', 'NI Ambulance station membership missing');
expect(assignments.get('3000003') === '2638524', 'NI Fire station membership missing');
expect(!assignments.has('3000004'), 'Unassigned response location must remain unassigned');
expect(result.niFire.length === 1 && result.niFire[0].buildingId === '3000003', 'Unit/Station Naming must filter NI Fire correctly');
expect(result.unassigned.length === 1 && result.unassigned[0].buildingId === '3000004', 'Unit/Station Naming must retain the unassigned group');

const controlsParser = extractFunction('extractNamingDispatchCentresFromStationControls');
expect(controlsParser.includes(".leitstelle_selection[leitstelle]"), 'Standalone popout navbar selector missing');
expect(controlsParser.includes("getAttribute?.('leitstelle')"), 'Standalone popout Dispatch Centre ID authority missing');
expect(!controlsParser.includes('window.opener'), 'Popout must use its own complete native DOM without coupling to the opener');

console.log('PASS: v1.0.112 restores Unit and Station Naming Dispatch Centre loading in a standalone /leitstellenansicht window.');
