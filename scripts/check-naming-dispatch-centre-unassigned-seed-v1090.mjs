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
  constructor(dc) { this.dataset = {}; this.attrs = { leitstelle_building_id: dc }; }
  getAttribute(name) { return this.attrs[name] ?? ''; }
}
const context = { String, Number, row: new FixtureRow('null'), result: null };
vm.runInNewContext(`${extractFunction('getNamingStationRowDispatchCentreId')}
result = getNamingStationRowDispatchCentreId(row);`, context);
expect(context.result === '', `Literal null must remain unassigned, got ${context.result}`);
expect(!source.includes('function loadNamingDispatchCentreSeedBuildingIds('), 'Superseded station-seed loader must remain removed');
expect(!source.includes('function getNamingDispatchCentreSeedBuildingIds('), 'Superseded station-seed chooser must remain removed');
expect(!source.includes('extractNamingDispatchCentreSeedBuildingIdsFromHtml'), 'Superseded Stations seed parser must remain removed');
const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(!listLoader.includes('/leitstellenansicht'), 'Centre discovery must not fall back to Stations HTML');
expect(!listLoader.includes('/edit'), 'Centre discovery must not fall back to building edit pages');

console.log('PASS: Null assignment normalization remains protected and the failed station-seed architecture remains removed.');
