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

expect(source.includes('// @version      1.0.115'), 'Expected Command Nexus 1.0.95');
expect(source.includes("const UNIT_VERSION = '3.3.24';"), 'Expected Unit Naming 3.3.20');
expect(source.includes("const STATION_VERSION = '1.3.19';"), 'Expected Station Naming 1.3.16');

const unitHandler = extractFunction('handleUnitDispatchCentreChange');
const stationHandler = extractFunction('handleStationDispatchCentreChange');

expect(unitHandler.startsWith('async function handleUnitDispatchCentreChange('), 'Unit Dispatch Centre handler must be async');
expect((unitHandler.match(/await refreshStations\(\);/g) || []).length === 1, 'Unit Dispatch Centre change must invoke exactly one normal station refresh');
expect(!unitHandler.includes('populateNamingServiceFilter('), 'Unit handler must let refreshStations own the downstream cascade instead of duplicating it');

expect(stationHandler.startsWith('async function handleStationDispatchCentreChange('), 'Station Dispatch Centre handler must be async');
expect((stationHandler.match(/await refreshStationNamingStations\(\);/g) || []).length === 1, 'Station Dispatch Centre change must invoke exactly one normal station refresh');
expect(!stationHandler.includes('populateNamingServiceFilter('), 'Station handler must let refreshStationNamingStations own the downstream cascade instead of duplicating it');

const context = { unitCalls: 0, stationCalls: 0, result: null };
context.refreshStations = async () => { context.unitCalls += 1; };
context.refreshStationNamingStations = async () => { context.stationCalls += 1; };
vm.runInNewContext(`${unitHandler}\nresult = handleUnitDispatchCentreChange();`, context);
await context.result;
expect(context.unitCalls === 1, `Unit Dispatch Centre handler executed ${context.unitCalls} refreshes instead of one`);
vm.runInNewContext(`${stationHandler}\nresult = handleStationDispatchCentreChange();`, context);
await context.result;
expect(context.stationCalls === 1, `Station Dispatch Centre handler executed ${context.stationCalls} refreshes instead of one`);

const centreFilter = extractFunction('populateNamingDispatchCentreFilter');
expect(centreFilter.includes('const previous = select.value || NAMING_DISPATCH_CENTRE_ALL;'), 'Dispatch Centre filter must capture the selected centre before rebuilding options');
expect(centreFilter.includes('select.value = values.has(previous) ? previous : NAMING_DISPATCH_CENTRE_ALL;'), 'Dispatch Centre filter must restore the selected centre after a refresh');

const unitRefresh = extractFunction('refreshStations');
const unitCentreAt = unitRefresh.indexOf("populateNamingDispatchCentreFilter('mc-namer-dispatch-centre')");
const unitServiceAt = unitRefresh.indexOf("populateNamingServiceFilter('mc-namer-service'");
const unitTypeAt = unitRefresh.indexOf("populateNamingStationTypeFilter('mc-namer-station-type'");
const unitStartAt = unitRefresh.indexOf('populateStartDropdown();');
expect(unitCentreAt >= 0 && unitServiceAt > unitCentreAt && unitTypeAt > unitServiceAt && unitStartAt > unitTypeAt,
  'Unit refresh must rebuild Dispatch Centre -> Service -> Station Type -> Start From in order');

const stationRefresh = extractFunction('refreshStationNamingStations');
const stationCentreAt = stationRefresh.indexOf("populateNamingDispatchCentreFilter('mc-station-dispatch-centre')");
const stationServiceAt = stationRefresh.indexOf("populateNamingServiceFilter('mc-station-service'");
const stationTypeAt = stationRefresh.indexOf("populateNamingStationTypeFilter('mc-station-type'");
const stationStartAt = stationRefresh.indexOf('populateStationNamingStartDropdown();');
expect(stationCentreAt >= 0 && stationServiceAt > stationCentreAt && stationTypeAt > stationServiceAt && stationStartAt > stationTypeAt,
  'Station refresh must rebuild Dispatch Centre -> Service -> Station Type -> Start From in order');

expect(source.includes('Refresh Stations'), 'Manual Refresh Stations control must remain available as a fallback');
expect(source.includes("querySelector('#mc-namer-dispatch-centre').onchange = handleUnitDispatchCentreChange"), 'Unit Dispatch Centre onchange binding missing');
expect(source.includes("querySelector('#mc-station-dispatch-centre').onchange = handleStationDispatchCentreChange"), 'Station Dispatch Centre onchange binding missing');

console.log('PASS: v1.0.95 automatically refreshes the matching station list once per Dispatch Centre selection and preserves the selected centre through the normal hierarchy rebuild.');
