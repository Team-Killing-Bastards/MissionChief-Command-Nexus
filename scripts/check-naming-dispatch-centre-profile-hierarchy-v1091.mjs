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

class Anchor {
  constructor(href, text) { this.href = href; this.textContent = text; }
  getAttribute(name) { return name === 'href' ? this.href : ''; }
}
class Panel {
  constructor(anchors) { this.anchors = anchors; }
  querySelectorAll(selector) { return selector === 'a[href]' ? this.anchors : []; }
}
class ProfileDoc {
  constructor() {
    this.panels = [
      new Panel([]),
      new Panel([new Anchor('/buildings/2634040', ' LODON DISPATCH ')]),
      new Panel([new Anchor('/buildings/2638525', 'NI Ambulance Dispatch')]),
      new Panel([new Anchor('/buildings/2638524', 'NI Fire Dispatch')]),
      new Panel([new Anchor('/buildings/2638571', 'NI Hospitals')]),
      new Panel([new Anchor('/buildings/2632635', 'NI Police Dispatch')]),
      new Panel([new Anchor('/buildings/2638564', 'North England Dispatch')]),
      new Panel([new Anchor('/buildings/1859041', 'Scotlands Dispatch')]),
      new Panel([new Anchor('/buildings/1859041/edit', 'Nested action')]),
      new Panel([new Anchor('https://example.invalid/buildings/999', 'Cross origin')])
    ];
  }
  querySelectorAll(selector) { return selector === '.profile-dispatchcenter' ? this.panels : []; }
}
class DOMParserFixture { parseFromString() { return new ProfileDoc(); } }

expect(source.includes('// @version      1.0.91'), 'Expected Command Nexus 1.0.91');
expect(source.includes("const UNIT_VERSION = '3.3.16';"), 'Expected Unit Naming 3.3.16');
expect(source.includes("const STATION_VERSION = '1.3.10';"), 'Expected Station Naming 1.3.10');
expect(source.includes('id="mc-namer-service"'), 'Unit Naming Service selector missing');
expect(source.includes('id="mc-station-service"'), 'Station Naming Service selector missing');

const profileContext = {
  DOMParser: DOMParserFixture,
  URL,
  location: { origin: 'https://www.missionchief.co.uk' },
  cleanText: value => String(value || '').replace(/\s+/g, ' ').trim(),
  Map, String,
  result: null
};
vm.runInNewContext(
  `${extractFunction('getNamingDispatchCentreIdFromHref')}\n` +
  `${extractFunction('extractNamingDispatchCentresFromProfileHtml')}\n` +
  `result = extractNamingDispatchCentresFromProfileHtml('<fixture>');`,
  profileContext
);
const centres = new Map(profileContext.result);
expect(centres.size === 7, `Expected seven real profile Dispatch Centres, got ${centres.size}`);
expect(centres.get('2634040') === 'LODON DISPATCH', 'LODON DISPATCH missing from profile parser');
expect(centres.get('1859041') === 'Scotlands Dispatch', 'Scotlands Dispatch missing from profile parser');
expect(!centres.has('999'), 'Cross-origin building link must be rejected');

const pathContext = {
  URL,
  location: { origin: 'https://www.missionchief.co.uk' },
  window: {},
  document: {
    querySelector: selector => selector === '#navbar_profile_link[href]'
      ? new Anchor('/profile/419938', 'Profile')
      : null
  },
  result: null
};
pathContext.window.top = { document: pathContext.document };
vm.runInNewContext(
  `${extractFunction('getNamingOwnProfilePathFromHref')}\n` +
  `${extractFunction('resolveNamingOwnProfilePath')}\n` +
  `result = resolveNamingOwnProfilePath();`,
  pathContext
);
expect(pathContext.result === '/profile/419938', `Expected own navbar profile route, got ${pathContext.result}`);

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
expect(listLoader.includes('resolveNamingOwnProfilePath()'), 'Profile route must drive centre list loading');
expect(!listLoader.includes('/leitstellenansicht'), 'Stations view must not drive centre discovery');
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

console.log('PASS: v1.0.91 uses profile Dispatch Centres then Service, Station Type and Start From with row-authoritative membership.');
