#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const starts = [
    source.indexOf(`async function ${name}(`),
    source.indexOf(`function ${name}(`),
  ].filter(value => value >= 0);
  assert.ok(starts.length, `${name} must exist`);
  const start = Math.min(...starts);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = brace; index < source.length; index += 1) {
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
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

const documentGraph = extractFunction('getNamingDispatchCentreStationRowDocuments');
assert.match(documentGraph, /while \(queue\.length && documents\.length < 32\)/,
  'naming authority must traverse a bounded recursive document graph');
assert.match(documentGraph, /frame\.contentDocument[\s\S]*frame\.contentWindow\?\.document/,
  'same-origin nested frame documents must be discoverable');
assert.doesNotMatch(documentGraph, /window\.opener|fetch\s*\(/,
  'naming authority must remain local-DOM only');

const overview = extractFunction('getStationOverviewEntries');
assert.match(overview, /getNamingDispatchCentreStationRowDocuments\(root\)/,
  'station inventory must use the same recursive document graph as centre membership');
assert.doesNotMatch(overview, /\n\s*root\.querySelectorAll\(/,
  'station inventory must not remain current-document-only');

for (const name of ['refreshStations', 'refreshStationNamingStations']) {
  const refresh = extractFunction(name);
  const paint = refresh.indexOf('await yieldNamingDispatchCentreRefreshPaint()');
  const assignments = refresh.indexOf('await loadNamingDispatchCentreData(true)');
  const entries = refresh.indexOf('const stationEntries = getStationOverviewEntries()');
  assert.ok(paint >= 0 && paint < assignments && assignments < entries,
    `${name} must rescan membership after one render boundary before reading stations`);
}

class FixtureDocument {
  constructor({ frames = [], links = [], rows = [] } = {}) {
    this.frames = frames;
    this.links = links;
    this.rows = rows;
  }
  querySelectorAll(selector) {
    if (selector === 'iframe') return this.frames;
    if (selector === 'station-links') return this.links;
    if (
      selector.includes('.building_list_li') ||
      selector.includes('[leitstelle_building_id]') ||
      selector.includes('[data-leitstelle-building-id]')
    ) return this.rows;
    return [];
  }
}

const stationRow = {
  id: 'building_list_3000001',
  dataset: {},
  attrs: {
    building_type_id: '18',
    leitstelle_building_id: '2638524',
  },
  getAttribute(name) { return this.attrs[name] ?? ''; },
  querySelector() { return null; },
};
const stationLink = {
  label: 'NESTED FIRE',
  buildingTypeId: 18,
  container: {},
  getAttribute(name) { return name === 'href' ? '/buildings/3000001' : ''; },
  closest() { return null; },
  matches() { return false; },
};

const deepDocument = new FixtureDocument({ links: [stationLink], rows: [stationRow] });
const middleDocument = new FixtureDocument();
const topDocument = new FixtureDocument();
const blockedFrame = {};
Object.defineProperty(blockedFrame, 'contentDocument', {
  get() { throw new Error('cross-origin'); },
});
middleDocument.frames.push({ contentDocument: deepDocument });
topDocument.frames.push({ contentDocument: middleDocument }, blockedFrame);
deepDocument.frames.push({ contentDocument: topDocument });

const context = vm.createContext({
  document: topDocument,
  window: { top: { document: topDocument } },
  Map,
  Set,
  String,
  Number,
  STATION_OVERVIEW_LINK_SELECTOR: 'station-links',
  NAMING_DISPATCH_CENTRE_STATE: { byBuildingId: new Map(), loaded: false },
  NAMING_DISPATCH_CENTRE_ALL: 'ALL',
  NAMING_DISPATCH_CENTRE_UNASSIGNED: '__UNASSIGNED__',
  NAMING_SERVICE_BY_BUILDING_TYPE_ID: { 18: 'FIRE' },
  normaliseStationOverviewHref(value) {
    return /^\/buildings\/\d+$/.test(String(value || '')) ? String(value) : '';
  },
  getStationOverviewContainer(link) { return link.container || null; },
  scoreStationOverviewLink() { return 1; },
  getBuildingIdFromHref(value) { return String(value).match(/\/buildings\/(\d+)/)?.[1] || ''; },
  readStationOverviewName(link) { return link.label || ''; },
  readStationBuildingTypeId(link) { return Number(link.buildingTypeId || 0); },
});

vm.runInContext(
  `${extractFunction('getNamingStationRowBuildingId')}\n` +
  `${extractFunction('getNamingStationRowDispatchCentreId')}\n` +
  `${documentGraph}\n` +
  `${extractFunction('refreshNamingDispatchCentreAssignmentsFromStationRows')}\n` +
  `${extractFunction('getNamingDispatchCentreId')}\n` +
  `${extractFunction('stationMatchesNamingDispatchCentre')}\n` +
  `${extractFunction('getNamingServiceForStation')}\n` +
  `${overview}\n` +
  `this.collectDocuments = getNamingDispatchCentreStationRowDocuments;\n` +
  `this.refreshAssignments = refreshNamingDispatchCentreAssignmentsFromStationRows;\n` +
  `this.readCentreId = getNamingDispatchCentreId;\n` +
  `this.matchesCentre = stationMatchesNamingDispatchCentre;\n` +
  `this.readService = getNamingServiceForStation;\n` +
  `this.readStations = getStationOverviewEntries;`,
  context
);

const documents = context.collectDocuments();
assert.equal(documents.length, 3, 'top, middle and deeply nested station documents must be collected once');
assert.equal(documents[2], deepDocument, 'the second-level Resource Administration document must be retained');

context.refreshAssignments();
assert.equal(context.readCentreId('3000001'), '2638524',
  'deep station membership must join to the selected Dispatch Centre');

const entries = context.readStations();
assert.equal(entries.length, 1, 'deep station inventory must remain visible to Unit and Station Naming');
assert.equal(entries[0].buildingId, '3000001');
assert.equal(entries[0].displayName, 'NESTED FIRE');

const station = {
  ...entries[0],
  dispatchCentreId: context.readCentreId(entries[0].buildingId),
  stationType: 'FIRE',
};
assert.equal(context.matchesCentre(station, '2638524'), true,
  'selected Dispatch Centre must expose the deeply nested station');
assert.equal(context.readService(station), 'FIRE',
  'the downstream Service stage must populate from the selected centre station');
assert.equal(context.matchesCentre(station, '__UNASSIGNED__'), false,
  'an assigned nested station must not fall into Unassigned/default');

console.log('PASS: nested same-origin station rows populate Dispatch Centre -> Service -> Station Type -> Start From.');
