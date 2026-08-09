#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

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
    if (c === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  fail(`Unterminated ${name}`);
}

class FixtureRow {
  constructor(id, typeId, dispatchCentreId) {
    this.id = `building_list_${id}`;
    this.dataset = {};
    this.attrs = {
      building_type_id: String(typeId),
      leitstelle_building_id: dispatchCentreId == null ? 'null' : String(dispatchCentreId)
    };
  }
  getAttribute(name) { return this.attrs[name] ?? ''; }
  querySelector() { return null; }
}

expect(source.includes('// @version      1.0.89'), 'Expected Command Nexus 1.0.89');
expect(source.includes("const UNIT_VERSION = '3.3.14';"), 'Expected Unit Naming 3.3.14');
expect(source.includes("const STATION_VERSION = '1.3.8';"), 'Expected Station Naming 1.3.8');
expect(source.includes("'0', '18'"), 'Ordinary fire-station seed types missing');
expect(source.includes("'2', '20'"), 'Ordinary ambulance-station seed types missing');
expect(source.includes("'6', '19'"), 'Ordinary police-station seed types missing');

const rows = [
  new FixtureRow('1870621', '22', null),
  new FixtureRow('1859041', '7', null),
  new FixtureRow('1914809', '22', '1859041'),
  new FixtureRow('1856316', '0', '1859041'),
  new FixtureRow('1870510', '19', '1859041')
];
const context = {
  document: { querySelectorAll: () => rows },
  STATE: { stations: [] },
  STATION_STATE: { stations: [] },
  NAMING_DISPATCH_CENTRE_SEED_TYPE_IDS: new Set(['0','18','2','20','6','19','5','13','27','28','30','33','34','35']),
  Set,
  String,
  Number,
  Math,
  result: null
};
vm.runInNewContext(
  `${extractFunction('getNamingStationRowBuildingId')}\n` +
  `${extractFunction('getNamingStationRowDispatchCentreId')}\n` +
  `${extractFunction('isNamingDispatchCentreSeedStationTypeId')}\n` +
  `${extractFunction('getNamingDispatchCentreSeedBuildingIds')}\n` +
  `result = getNamingDispatchCentreSeedBuildingIds(3);`,
  context
);
const seeds = Array.from(context.result);
expect(seeds[0] === '1856316', `Expected assigned ordinary fire station first, got ${seeds[0] || 'none'}`);
expect(seeds[1] === '1870510', `Expected assigned ordinary police station second, got ${seeds[1] || 'none'}`);
expect(!seeds.includes('1870621'), 'Unassigned Home Response row must not become a seed');
expect(!seeds.includes('1859041'), 'Dispatch Centre building itself must not become a seed');
expect(!seeds.includes('1914809'), 'Assigned Home Response row must not outrank ordinary stations');

const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(listLoader.includes('getNamingDispatchCentreSeedBuildingIds(3)'), 'List loader must use bounded assigned-station seed candidates');
expect(listLoader.includes('for (const seedBuildingId of seedBuildingIds)'), 'List loader must retry bounded seed candidates');
expect(listLoader.includes('lastListError'), 'List loader must expose its failure reason');

const listener = extractFunction('installNamingDispatchCentreRefreshListener');
expect(listener.includes("document.addEventListener('click'"), 'Retry must use a delegated document click listener');
expect(listener.includes('#mc-namer-refresh-dispatch-centres, #mc-station-refresh-dispatch-centres'), 'Delegated listener must own both naming Retry buttons');
expect(listener.includes('refreshNamingDispatchCentres(true)'), 'Delegated Retry listener must force a refresh');
expect(!source.includes("querySelector('#mc-namer-refresh-dispatch-centres').onclick"), 'Fragile Unit direct Retry binding must be removed');
expect(!source.includes("querySelector('#mc-station-refresh-dispatch-centres').onclick"), 'Fragile Station direct Retry binding must be removed');

const refresh = extractFunction('refreshNamingDispatchCentres');
const paintAt = refresh.indexOf('await yieldNamingDispatchCentreRefreshPaint();');
const loadAt = refresh.indexOf('await Promise.all([');
expect(paintAt >= 0 && loadAt > paintAt, 'Refreshing state must paint before the loader can fail');
expect(refresh.includes("button.dataset.dispatchCentreRefreshState = 'loading'"), 'Retry must expose an explicit loading state');
expect(refresh.includes("button.disabled = false"), 'Retry must be re-enabled in the final state');
expect(refresh.includes('Retry Dispatch Centres. ${failureReason}'), 'Retry title must include the concrete failure reason');
expect(source.includes('pointer-events:auto; touch-action:manipulation;'), 'Retry buttons need explicit pointer/touch affordance');
expect(source.includes('lastAssignmentError'), 'Assignment failure reason state missing');
expect(!source.includes('mc-personnel-dispatch-centre'), 'Personnel Assignment must remain outside Dispatch Centre filtering');
expect(workflow.includes('scripts/check-naming-dispatch-centre-retry-v1089.mjs'), 'v1.0.89 Retry regression must be registered');

console.log('PASS: v1.0.89 keeps Retry Dispatch Centres clickable, visibly active and seeded from assigned ordinary stations.');
