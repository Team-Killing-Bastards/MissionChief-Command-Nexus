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

class Link {
  constructor(href) { this.href = href; }
  getAttribute(name) { return name === 'href' ? this.href : ''; }
}
class TextNode {
  constructor(text) { this.textContent = text; }
}
class Row {
  constructor({ id, type = '7', name = '', href = '', mapText = '' }) {
    this.id = id;
    this.attrs = { building_type_id: type, search_attribute: name };
    this.href = href;
    this.mapText = mapText;
  }
  getAttribute(name) { return this.attrs[name] ?? ''; }
  querySelector(selector) {
    if (selector === 'a[href^="/buildings/"]') return this.href ? new Link(this.href) : null;
    if (selector === '.building_list_caption .map_position_mover' || selector === '.map_position_mover') {
      return this.mapText ? new TextNode(this.mapText) : null;
    }
    return null;
  }
}
class Root {
  constructor(rows) { this.rows = rows; }
  querySelectorAll(selector) {
    if (!selector.includes('building_type_id="7"')) return [];
    return this.rows.filter(row => row.getAttribute('building_type_id') === '7');
  }
}

expect(source.includes('// @version      1.0.114'), 'Expected Command Nexus 1.0.93');
expect(source.includes("const UNIT_VERSION = '3.3.24';"), 'Expected Unit Naming 3.3.18');
expect(source.includes("const STATION_VERSION = '1.3.19';"), 'Expected Station Naming 1.3.12');

const root = new Root([
  new Row({ id:'building_list_2634040', name:'LODON DISPATCH', href:'/buildings/2634040' }),
  new Row({ id:'building_list_2638525', name:'NI Ambulance Dispatch', href:'/buildings/2638525' }),
  new Row({ id:'building_list_2638524', name:'NI Fire Dispatch', href:'/buildings/2638524' }),
  new Row({ id:'building_list_2638571', name:'NI Hospitals', href:'/buildings/2638571' }),
  new Row({ id:'building_list_2632635', name:'NI Police Dispatch', href:'/buildings/2632635' }),
  new Row({ id:'building_list_2638564', name:'North England Dispatch', href:'/buildings/2638564' }),
  new Row({ id:'building_list_1859041', name:'Scotlands Dispatch', href:'/buildings/1859041' }),
  new Row({ id:'building_list_1856316', type:'0', name:'CADHAM GLENROTHES-FS1', href:'/buildings/1856316' }),
  new Row({ id:'building_list_999', name:'Mismatched centre', href:'/buildings/1000' }),
  new Row({ id:'bad', name:'Cross origin', href:'https://example.invalid/buildings/9999' }),
  new Row({ id:'building_list_777', name:'', href:'/buildings/777', mapText:'' })
]);
const context = {
  URL,
  location: { origin: 'https://www.missionchief.co.uk' },
  cleanText: value => String(value || '').replace(/\s+/g, ' ').trim(),
  Map, String, root, result: null
};
vm.runInNewContext(
  `${extractFunction('getNamingDispatchCentreIdFromHref')}\n` +
  `${extractFunction('extractNamingDispatchCentresFromStationRows')}\n` +
  `result = extractNamingDispatchCentresFromStationRows(root);`,
  context
);
const centres = new Map(context.result);
expect(centres.size === 7, `Expected exactly seven native Dispatch Centres, got ${centres.size}`);
expect(centres.get('2634040') === 'LODON DISPATCH', 'LODON DISPATCH missing from native row parser');
expect(centres.get('2638525') === 'NI Ambulance Dispatch', 'NI Ambulance Dispatch missing');
expect(centres.get('2638524') === 'NI Fire Dispatch', 'NI Fire Dispatch missing');
expect(centres.get('2638571') === 'NI Hospitals', 'NI Hospitals missing');
expect(centres.get('2632635') === 'NI Police Dispatch', 'NI Police Dispatch missing');
expect(centres.get('2638564') === 'North England Dispatch', 'North England Dispatch missing');
expect(centres.get('1859041') === 'Scotlands Dispatch', 'Scotlands Dispatch missing');
expect(!centres.has('1856316'), 'Ordinary station row must not become a Dispatch Centre');
expect(!centres.has('999') && !centres.has('1000'), 'Mismatched native centre row/link must fail closed');
expect(!centres.has('777'), 'Unnamed type-7 row must not become a selectable centre');

const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(listLoader.includes('collectNamingDispatchCentresFromStationRows()'), 'Centre list must read native type-7 station rows');
expect(!listLoader.includes('/profile/'), 'Centre list must not load a profile route');
expect(!listLoader.includes('loadNamingDispatchCentresFromRenderedProfile'), 'Centre list must not use the failed rendered-profile loader');
expect(!listLoader.includes('stationFetchWithTimeout'), 'Centre list must not require a network fetch');
expect(source.includes('.building_list_li[building_type_id="7"]'), 'Native type-7 Dispatch Centre selector missing');
expect(source.includes("getAttribute?.('leitstelle_building_id')"), 'Station membership must remain row-authoritative');
expect(!source.includes('.profile-dispatchcenter'), 'LSSMV4 profile panel selector must be absent from naming centre discovery');
expect(!source.includes('resolveNamingOwnProfilePath'), 'Profile route resolver must be absent from naming centre discovery');
expect(!source.includes('loadNamingDispatchCentresFromRenderedProfile'), 'Hidden profile renderer must be removed');
expect(source.includes('function getNamingDispatchCentreStationRowDocuments('), 'Cross-frame native station-row document collector missing');

console.log('PASS: v1.0.93 discovers Dispatch Centres from native type-7 building rows and keeps row-level membership authority.');
