#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Preserve the hierarchy introduced in v1.0.91 while chaining the v1.0.92
// supersession guard, v1.0.93 native-row acquisition and v1.0.94 frame-scoped
// station-membership regression through the already-registered Validate gate.
await import('./check-naming-dispatch-centre-profile-render-v1092.mjs');
await import('./check-naming-dispatch-centre-membership-frame-v1094.mjs');
await import('./check-naming-dispatch-centre-auto-station-refresh-v1095.mjs');

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

expect(source.includes('// @version      1.0.119'), 'Expected current Command Nexus 1.0.94');
expect(source.includes("const UNIT_VERSION = '3.3.25';"), 'Expected current Unit Naming 3.3.19');
expect(source.includes("const STATION_VERSION = '1.3.20';"), 'Expected current Station Naming 1.3.13');
expect(source.includes('id="mc-namer-service"'), 'Unit Naming Service selector missing');
expect(source.includes('id="mc-station-service"'), 'Station Naming Service selector missing');

const serviceBlock = source.slice(
  source.indexOf('const NAMING_SERVICES ='),
  source.indexOf('const STATE =', source.indexOf('const NAMING_SERVICES ='))
);
const serviceContext = { result: null };
vm.runInNewContext(
  `${serviceBlock}\n${extractFunction('getNamingServiceForStation')}\n` +
  `result = [
    getNamingServiceForStation({buildingTypeId:0,stationType:'FIRE'}),
    getNamingServiceForStation({buildingTypeId:18,stationType:'FIRE'}),
    getNamingServiceForStation({buildingTypeId:2,stationType:'AMBULANCE'}),
    getNamingServiceForStation({buildingTypeId:20,stationType:'AMBULANCE'}),
    getNamingServiceForStation({buildingTypeId:5,stationType:'AIR'}),
    getNamingServiceForStation({buildingTypeId:6,stationType:'POLICE'}),
    getNamingServiceForStation({buildingTypeId:19,stationType:'POLICE'}),
    getNamingServiceForStation({buildingTypeId:13,stationType:'AIR'}),
    getNamingServiceForStation({buildingTypeId:35,stationType:'EOD'}),
    getNamingServiceForStation({buildingTypeId:27,stationType:'RNLI'}),
    getNamingServiceForStation({buildingTypeId:28,stationType:'COASTGUARD'}),
    getNamingServiceForStation({buildingTypeId:30,stationType:'COASTGUARD'}),
    getNamingServiceForStation({buildingTypeId:33,stationType:'SAR'}),
    getNamingServiceForStation({buildingTypeId:34,stationType:'RECOVERY'})
  ];`,
  serviceContext
);
expect(JSON.stringify(serviceContext.result) === JSON.stringify([
  'FIRE','FIRE','AMBULANCE','AMBULANCE','AMBULANCE',
  'POLICE','POLICE','POLICE','POLICE','SAR','SAR','SAR','SAR','RECOVERY'
]), `Unexpected Service grouping: ${JSON.stringify(serviceContext.result)}`);

const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(listLoader.includes('collectNamingDispatchCentresFromStationRows()'), 'Native station rows must drive Dispatch Centre list loading');
expect(!listLoader.includes('/profile/'), 'Profile route must not drive centre discovery');
expect(!listLoader.includes('/leitstellenansicht'), 'Network Stations view must not drive centre discovery');
expect(!listLoader.includes('/edit'), 'Building edit pages must not drive centre discovery');
expect(!source.includes('function loadNamingDispatchCentreSeedBuildingIds('), 'Old seed loader remains');
expect(!source.includes('getNamingDispatchCentreSeedBuildingIds'), 'Old seed chooser remains');

const typeFilter = extractFunction('populateNamingStationTypeFilter');
expect(typeFilter.includes('getStationsForNamingService'), 'Station Type must be derived after centre + service');
const unitStart = extractFunction('populateStartDropdown');
const stationStart = extractFunction('populateStationNamingStartDropdown');
expect(unitStart.includes('stationMatchesNamingService'), 'Unit Start From must respect selected Service');
expect(stationStart.includes('stationMatchesNamingService'), 'Station Start From must respect selected Service');
expect(source.includes("querySelector('#mc-namer-service').onchange = handleUnitNamingServiceChange"), 'Unit Service change handler missing');
expect(source.includes("querySelector('#mc-station-service').onchange = handleStationNamingServiceChange"), 'Station Service change handler missing');
expect(!source.includes('mc-personnel-dispatch-centre'), 'Personnel Assignment must remain outside centre filtering');

console.log('PASS: Dispatch Centre -> Service -> Station Type -> Start From hierarchy is preserved under v1.0.94 native-row centre and membership authority.');
