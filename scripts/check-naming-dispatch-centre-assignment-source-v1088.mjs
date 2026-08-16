#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
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
    if (quote) { if (escaped) { escaped = false; continue; } if (c === '\\') { escaped = true; continue; } if (c === quote) quote = ''; continue; }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(`Unterminated ${name}`);
}


const assignmentStart = source.indexOf('function getNamingStationRowBuildingId(');
const assignmentLoader = source.slice(
  assignmentStart,
  source.indexOf('function getNamingDispatchCentreId(buildingId)', assignmentStart)
);
expect(assignmentLoader.includes("'leitstelle_building_id'"), 'Station assignments must use leitstelle_building_id from station rows');
expect(assignmentLoader.includes('/^building_list_'), 'Station row building IDs must be resolved locally');
expect(!assignmentLoader.includes('stationFetchWithTimeout'), 'Station membership must not crawl building pages');

const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(listLoader.includes('collectNamingDispatchCentresFromStationRows()'), 'Centre list must use native type-7 station rows');
const rowParser = extractFunction('extractNamingDispatchCentresFromStationRows');
expect(rowParser.includes('building_type_id="7"'), 'Centre identity must come from native building_type_id=7 rows');
expect(rowParser.includes('search_attribute'), 'Centre labels must use native building row names');
expect(!listLoader.includes('stationFetchWithTimeout'), 'Centre list must not use a network fetch');
expect(!listLoader.includes('/building/buildings_json'), 'Centre list must not depend on buildings_json');
expect(!listLoader.includes('/leitstellenansicht'), 'Centre list must not fetch Stations view HTML');
expect(!listLoader.includes('/edit'), 'Centre list must not depend on a building edit page');
expect(!listLoader.includes('/profile/'), 'Centre list must not depend on a profile route');
expect(!source.includes('mc-personnel-dispatch-centre'), 'Personnel Assignment must remain outside Dispatch Centre filtering');
console.log('PASS: Station membership and Dispatch Centre names are both native-row authoritative.');
