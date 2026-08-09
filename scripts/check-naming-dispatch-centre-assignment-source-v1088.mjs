#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Historical v1.0.88 authority regression, revalidated against the v1.0.89 baseline.
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Unable to find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1];
    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && n === '/') { blockComment = false; i += 1; }
      continue;
    }
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
    if (c === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  fail(`Unterminated ${name}`);
}

class FixtureOption {
  constructor(value, text) { this.value = value; this.textContent = text; }
  getAttribute(name) { return name === 'value' ? this.value : ''; }
}
class FixtureSelect {
  constructor(html) {
    this.options = [];
    const optionPattern = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi;
    for (const match of html.matchAll(optionPattern)) {
      const value = match[1].match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? '';
      const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      this.options.push(new FixtureOption(value, text));
    }
  }
  querySelectorAll(selector) { return selector === 'option[value]' ? this.options : []; }
}
class FixtureDocument {
  constructor(html) {
    const match = html.match(/<select\b[^>]*(?:id=["']building_leitstelle_building_id["']|name=["']building\[leitstelle_building_id\]["'])[^>]*>([\s\S]*?)<\/select>/i);
    this.select = match ? new FixtureSelect(match[1]) : null;
  }
  querySelector(selector) {
    if (selector === '#building_leitstelle_building_id') return this.select;
    if (selector === 'select[name="building[leitstelle_building_id]"]') return this.select;
    return null;
  }
}
class FixtureDOMParser { parseFromString(html) { return new FixtureDocument(html); } }

expect(source.includes('// @version      1.0.90'), 'Expected Command Nexus 1.0.89');
expect(source.includes("const UNIT_VERSION = '3.3.15';"), 'Expected Unit Naming 3.3.14');
expect(source.includes("const STATION_VERSION = '1.3.9';"), 'Expected Station Naming 1.3.8');

const parserSource = extractFunction('extractNamingDispatchCentresFromBuildingEditHtml');
const context = {
  DOMParser: FixtureDOMParser,
  cleanText: value => String(value || '').replace(/\s+/g, ' ').trim(),
  Map,
  String,
  fixture: `
    <select id="building_leitstelle_building_id" name="building[leitstelle_building_id]">
      <option value=""></option>
      <option value="2634040">LODON DISPATCH</option>
      <option value="2638525">NI Ambulance Dispatch</option>
      <option value="2638524">NI Fire Dispatch</option>
      <option value="2638571">NI Hospitals</option>
      <option value="2632635">NI Police Dispatch</option>
      <option value="2638564">North England Dispatch</option>
      <option selected="selected" value="1859041">Scotlands Dispatch</option>
    </select>
  `,
  result: null
};
vm.runInNewContext(`${parserSource}\nresult = extractNamingDispatchCentresFromBuildingEditHtml(fixture);`, context);
const centres = new Map(context.result);
expect(centres.size === 7, `Expected seven Dispatch Centres from supplied assignment selector, got ${centres.size}`);
expect(!centres.has(''), 'Blank unassigned option must not become a Dispatch Centre');
expect(centres.get('2634040') === 'LODON DISPATCH', 'LODON DISPATCH ID/name pair not parsed');
expect(centres.get('1859041') === 'Scotlands Dispatch', 'Scotlands Dispatch ID/name pair not parsed');

const listStart = source.indexOf('async function loadNamingDispatchCentreList(');
const listLoader = source.slice(
  listStart,
  source.indexOf('function populateNamingDispatchCentreFilter(', listStart)
);
expect(listLoader.includes('`/buildings/${seedBuildingId}/edit`'), 'Centre list must be read from one building edit page');
expect(listLoader.includes('extractNamingDispatchCentresFromBuildingEditHtml'), 'Centre list must use the assignment selector parser');
expect(!listLoader.includes('/leitstellenansicht'), 'Centre list must not depend on /leitstellenansicht');
expect(!listLoader.includes('/building/buildings_json'), 'Centre list must not depend on buildings_json');

const assignmentStart = source.indexOf('function getNamingStationRowBuildingId(');
const assignmentLoader = source.slice(
  assignmentStart,
  source.indexOf('function getNamingDispatchCentreId(buildingId)', assignmentStart)
);
expect(assignmentLoader.includes("'leitstelle_building_id'"), 'Station assignments must use leitstelle_building_id from station rows');
expect(assignmentLoader.includes('/^building_list_'), 'Station row building IDs must be resolved without a per-building fetch');
expect(!assignmentLoader.includes('stationFetchWithTimeout'), 'Station assignment refresh must be local and must not fetch every building');

const cascade = extractFunction('populateNamingStationTypeFilter');
expect(cascade.includes('getStationsForNamingDispatchCentre'), 'Station Type must be built from the selected Dispatch Centre subset');
const unitChange = extractFunction('handleUnitDispatchCentreChange');
const stationChange = extractFunction('handleStationDispatchCentreChange');
expect(unitChange.includes('populateNamingStationTypeFilter') && unitChange.includes('handleUnitStationTypeChange'), 'Unit Naming centre change must rebuild Station Type then Start From');
expect(stationChange.includes('populateNamingStationTypeFilter') && stationChange.includes('populateStationNamingStartDropdown'), 'Station Naming centre change must rebuild Station Type then Start From');

expect(!source.includes("stationFetchWithTimeout('/leitstellenansicht'"), 'Obsolete /leitstellenansicht centre source remains in production');
expect(!source.includes('mc-personnel-dispatch-centre'), 'Personnel Assignment must remain outside Dispatch Centre filtering');
expect(workflow.includes('scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs'), 'v1.0.88 source regression must be registered in Validate userscript');

console.log('PASS: v1.0.88 Dispatch Centre authority remains intact under the v1.0.89 baseline.');
