#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
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

class FixtureRow {
  constructor(id, typeId, dc) {
    this.id = `building_list_${id}`;
    this.dataset = {};
    this.attrs = { building_type_id: String(typeId), leitstelle_building_id: dc };
  }
  getAttribute(name) { return this.attrs[name] ?? ''; }
  querySelector() { return null; }
}
class FixtureDocument {
  constructor(html) {
    this.rows = [];
    const rowPattern = /<(?:li|div)\b([^>]*\bclass=["'][^"']*\bbuilding_list\b[^"']*["'][^>]*)>/gi;
    for (const match of html.matchAll(rowPattern)) {
      const attrs = match[1];
      const id = attrs.match(/\bid=["']building_list_(\d+)["']/i)?.[1];
      const typeId = attrs.match(/\bbuilding_type_id=["']([^"']*)["']/i)?.[1] ?? '';
      const dc = attrs.match(/\bleitstelle_building_id=["']([^"']*)["']/i)?.[1] ?? '';
      if (id) this.rows.push(new FixtureRow(id, typeId, dc));
    }
  }
  querySelectorAll() { return this.rows; }
}
class FixtureDOMParser { parseFromString(html) { return new FixtureDocument(html); } }

expect(source.includes('// @version      1.0.90'), 'Expected Command Nexus 1.0.90');
expect(source.includes("const UNIT_VERSION = '3.3.15';"), 'Expected Unit Naming 3.3.15');
expect(source.includes("const STATION_VERSION = '1.3.9';"), 'Expected Station Naming 1.3.9');

const context = {
  DOMParser: FixtureDOMParser,
  document: { querySelectorAll: () => [] },
  STATE: { stations: [] },
  STATION_STATE: { stations: [] },
  NAMING_DISPATCH_CENTRE_SEED_TYPE_IDS: new Set(['0','18','2','20','6','19','5','13','27','28','30','33','34','35']),
  Set, String, Number, Math,
  result: null,
  row: new FixtureRow('2604780', '0', 'null'),
  fixture: `<li id="building_list_1859041" class="building_list building_list_li" building_type_id="7" leitstelle_building_id="null"></li>
            <li id="building_list_2604780" class="building_list building_list_li" building_type_id="0" leitstelle_building_id="null"></li>
            <li id="building_list_2598058" class="building_list building_list_li" building_type_id="22" leitstelle_building_id="1859041"></li>`
};
vm.runInNewContext(
  `${extractFunction('getNamingStationRowBuildingId')}\n` +
  `${extractFunction('getNamingStationRowDispatchCentreId')}\n` +
  `${extractFunction('isNamingDispatchCentreSeedStationTypeId')}\n` +
  `${extractFunction('getNamingDispatchCentreSeedBuildingIdsFromRows')}\n` +
  `${extractFunction('extractNamingDispatchCentreSeedBuildingIdsFromHtml')}\n` +
  `result = { dc: getNamingStationRowDispatchCentreId(row), seeds: extractNamingDispatchCentreSeedBuildingIdsFromHtml(fixture, 3) };`,
  context
);
expect(context.result.dc === '', `Literal null must normalize to unassigned, got ${context.result.dc}`);
const seeds = Array.from(context.result.seeds);
expect(seeds[0] === '2604780', `Unassigned ordinary station must be a valid seed, got ${seeds[0] || 'none'}`);
expect(!seeds.includes('1859041'), 'Dispatch Centre building itself must never be a seed');

const seedLoader = extractFunction('loadNamingDispatchCentreSeedBuildingIds');
expect(seedLoader.includes("'/leitstellenansicht'"), 'Empty live DOM must fall back to native Stations view for seed IDs');
expect(seedLoader.includes('extractNamingDispatchCentreSeedBuildingIdsFromHtml'), 'Fetched Stations HTML must be parsed only for seed building IDs');
const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(listLoader.includes('await loadNamingDispatchCentreSeedBuildingIds(3)'), 'Centre list loader must await resilient seed discovery');
expect(listLoader.includes('extractNamingDispatchCentresFromBuildingEditHtml'), 'Centre names must still come from building edit selector');
expect(!listLoader.includes("stationFetchWithTimeout('/leitstellenansicht'"), 'Centre list loader itself must not use Stations view as name authority');
expect(!source.includes('mc-personnel-dispatch-centre'), 'Personnel Assignment must remain outside Dispatch Centre filtering');

console.log('PASS: v1.0.90 accepts unassigned ordinary seed stations and falls back to Stations HTML only for building-ID discovery.');
