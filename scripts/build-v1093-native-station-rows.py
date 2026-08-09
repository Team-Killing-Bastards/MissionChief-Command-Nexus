#!/usr/bin/env python3
from pathlib import Path

ROOT = Path('.')
SOURCE = ROOT / 'src/missionchief-command-nexus.user.js'


def js_function_range(text: str, name: str):
    starts = []
    for marker in (f'    async function {name}(', f'    function {name}('):
        at = text.find(marker)
        if at >= 0:
            starts.append(at)
    if not starts:
        raise SystemExit(f'Unable to find function {name}')
    start = min(starts)
    brace = text.find('{', start)
    if brace < 0:
        raise SystemExit(f'Unable to find opening brace for {name}')

    depth = 0
    quote = ''
    escaped = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(text):
        c = text[i]
        n = text[i + 1] if i + 1 < len(text) else ''
        if line_comment:
            if c == '\n':
                line_comment = False
            i += 1
            continue
        if block_comment:
            if c == '*' and n == '/':
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escaped:
                escaped = False
                i += 1
                continue
            if c == '\\':
                escaped = True
                i += 1
                continue
            if c == quote:
                quote = ''
            i += 1
            continue
        if c == '/' and n == '/':
            line_comment = True
            i += 2
            continue
        if c == '/' and n == '*':
            block_comment = True
            i += 2
            continue
        if c in ("'", '"', '`'):
            quote = c
            i += 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                while end < len(text) and text[end] in ' \t':
                    end += 1
                if end < len(text) and text[end] == '\r':
                    end += 1
                if end < len(text) and text[end] == '\n':
                    end += 1
                return start, end
        i += 1
    raise SystemExit(f'Unterminated function {name}')


def remove_js_function(text: str, name: str):
    start, end = js_function_range(text, name)
    return text[:start] + text[end:]


source = SOURCE.read_text()
for required in (
    '// @version      1.0.92',
    "const UNIT_VERSION = '3.3.17';",
    "const STATION_VERSION = '1.3.11';",
    'async function loadNamingDispatchCentreList(force = false)',
    'loadNamingDispatchCentresFromRenderedProfile',
):
    if required not in source:
        raise SystemExit(f'Expected v1.0.92 baseline text missing: {required}')

source = source.replace('// @version      1.0.92', '// @version      1.0.93', 1)
source = source.replace("const UNIT_VERSION = '3.3.17';", "const UNIT_VERSION = '3.3.18';", 1)
source = source.replace("const STATION_VERSION = '1.3.11';", "const STATION_VERSION = '1.3.12';", 1)

# Remove the failed profile/LSSMV4 acquisition architecture completely.
for function_name in (
    'getNamingOwnProfilePathFromHref',
    'resolveNamingOwnProfilePath',
    'extractNamingDispatchCentresFromProfileDocument',
    'extractNamingDispatchCentresFromProfileHtml',
    'loadNamingDispatchCentresFromRenderedProfile',
):
    source = remove_js_function(source, function_name)

native_helpers = r'''    function extractNamingDispatchCentresFromStationRows(root = document) {
        const centres = new Map();
        if (!root?.querySelectorAll) return centres;

        root.querySelectorAll(
            '.building_list_li[building_type_id="7"], .building_list[building_type_id="7"]'
        ).forEach(row => {
            if (String(row.getAttribute?.('building_type_id') || '').trim() !== '7') return;

            const rowId = String(row.id || '').match(/^building_list_(\d+)$/)?.[1] || '';
            const detailsLink = row.querySelector?.('a[href^="/buildings/"]');
            const hrefId = String(getNamingDispatchCentreIdFromHref(
                detailsLink?.getAttribute?.('href') || '',
                false
            ) || '');

            // A native row ID and its exact Details link must agree when both exist.
            if (rowId && hrefId && rowId !== hrefId) return;
            const id = rowId || hrefId;
            if (!id) return;

            const label =
                cleanText(row.getAttribute?.('search_attribute') || '') ||
                cleanText(
                    row.querySelector?.('.building_list_caption .map_position_mover')?.textContent || ''
                ) ||
                cleanText(row.querySelector?.('.map_position_mover')?.textContent || '');
            if (!label) return;

            centres.set(String(id), label);
        });

        return centres;
    }

    function getNamingDispatchCentreStationRowDocuments() {
        const documents = [];
        const addDocument = candidate => {
            if (!candidate?.querySelectorAll || documents.includes(candidate)) return;
            documents.push(candidate);
        };
        const addFrameDocuments = candidateDocument => {
            try {
                candidateDocument?.querySelectorAll?.('iframe').forEach(frame => {
                    try {
                        addDocument(frame.contentDocument);
                    } catch (_) {}
                });
            } catch (_) {}
        };

        addDocument(document);
        addFrameDocuments(document);

        try {
            const topDocument = window.top?.document;
            addDocument(topDocument);
            addFrameDocuments(topDocument);
        } catch (_) {}

        return documents;
    }

    function collectNamingDispatchCentresFromStationRows() {
        const centres = new Map();
        getNamingDispatchCentreStationRowDocuments().forEach(candidateDocument => {
            extractNamingDispatchCentresFromStationRows(candidateDocument).forEach((label, id) => {
                centres.set(String(id), label);
            });
        });
        return centres;
    }

'''
marker = '    async function loadNamingDispatchCentreList(force = false) {'
insert_at = source.find(marker)
if insert_at < 0:
    raise SystemExit('Dispatch Centre list loader marker missing after profile cleanup')
source = source[:insert_at] + native_helpers + source[insert_at:]

old_acquisition = '''                const profilePath = resolveNamingOwnProfilePath();
                const centres = await loadNamingDispatchCentresFromRenderedProfile(profilePath);
                if (!centres.size) {
                    throw new Error('Profile did not expose any Dispatch Centre panels');
                }
'''
new_acquisition = '''                const centres = collectNamingDispatchCentresFromStationRows();
                if (!centres.size) {
                    throw new Error('Native station rows did not expose any Dispatch Centre buildings');
                }
'''
if old_acquisition not in source:
    raise SystemExit('Exact v1.0.92 profile acquisition block not found')
source = source.replace(old_acquisition, new_acquisition, 1)
source = source.replace(
    "console.warn('[Command Nexus] Dispatch Centre profile list unavailable:', error);",
    "console.warn('[Command Nexus] Dispatch Centre native row list unavailable:', error);",
    1
)

# Fail closed if any of the superseded profile acquisition machinery remains.
for forbidden in (
    'loadNamingDispatchCentresFromRenderedProfile',
    'extractNamingDispatchCentresFromProfileDocument',
    'extractNamingDispatchCentresFromProfileHtml',
    'resolveNamingOwnProfilePath',
    '.profile-dispatchcenter',
    'Rendered profile did not expose any Dispatch Centre panels',
):
    if forbidden in source:
        raise SystemExit(f'Superseded profile acquisition text remains: {forbidden}')

SOURCE.write_text(source)

# Rebaseline current-version assertions across permanent checks. Historical
# behaviour labels are intentionally left historical; only live baselines move.
for path in sorted((ROOT / 'scripts').glob('check-*.mjs')):
    text = path.read_text()
    text = text.replace('// @version      1.0.92', '// @version      1.0.93')
    text = text.replace("const UNIT_VERSION = '3.3.17';", "const UNIT_VERSION = '3.3.18';")
    text = text.replace("const STATION_VERSION = '1.3.11';", "const STATION_VERSION = '1.3.12';")
    text = text.replace('current Command Nexus 1.0.92', 'current Command Nexus 1.0.93')
    text = text.replace('Command Nexus 1.0.92', 'Command Nexus 1.0.93')
    text = text.replace('current Unit Naming 3.3.17', 'current Unit Naming 3.3.18')
    text = text.replace('Unit Naming 3.3.17', 'Unit Naming 3.3.18')
    text = text.replace('current Station Naming 1.3.11', 'current Station Naming 1.3.12')
    text = text.replace('Station Naming 1.3.11', 'Station Naming 1.3.12')
    path.write_text(text)

# Permanent v1.0.93 executable regression: real native row shape, all seven
# supplied centres, exact row/link agreement, type-7 gating, and source boundary.
v1093 = r'''#!/usr/bin/env node
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

expect(source.includes('// @version      1.0.93'), 'Expected Command Nexus 1.0.93');
expect(source.includes("const UNIT_VERSION = '3.3.18';"), 'Expected Unit Naming 3.3.18');
expect(source.includes("const STATION_VERSION = '1.3.12';"), 'Expected Station Naming 1.3.12');

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
'''
(ROOT / 'scripts/check-naming-dispatch-centre-native-station-rows-v1093.mjs').write_text(v1093)

v1092 = r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

// v1.0.92 proved that a plain hidden /profile iframe does not reproduce the
// LSSMV4/Vue profile modal + selected Buildings tab. Protect its removal and
// chain the replacement v1.0.93 native-row regression through the registered gate.
await import('./check-naming-dispatch-centre-native-station-rows-v1093.mjs');

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
const hierarchyCheck = await readFile('scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const asyncMarker = `async function ${name}(`;
  const syncMarker = `function ${name}(`;
  const asyncStart = source.indexOf(asyncMarker);
  const start = asyncStart >= 0 ? asyncStart : source.indexOf(syncMarker);
  if (start < 0) fail(`Unable to find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(`Unterminated ${name}`);
}

expect(source.includes('// @version      1.0.93'), 'Expected Command Nexus 1.0.93');
expect(source.includes("const UNIT_VERSION = '3.3.18';"), 'Expected Unit Naming 3.3.18');
expect(source.includes("const STATION_VERSION = '1.3.12';"), 'Expected Station Naming 1.3.12');
const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(listLoader.includes('collectNamingDispatchCentresFromStationRows()'), 'v1.0.93 replacement native-row source missing');
expect(!listLoader.includes('/profile/'), 'v1.0.92 profile route must not return');
expect(!source.includes('loadNamingDispatchCentresFromRenderedProfile'), 'v1.0.92 hidden profile renderer must stay removed');
expect(!source.includes('extractNamingDispatchCentresFromProfileDocument'), 'v1.0.92 profile DOM parser must stay removed');
expect(!source.includes('.profile-dispatchcenter'), 'LSSMV4 profile-only selector must stay removed');
expect(workflow.includes('scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs'), 'Registered hierarchy regression must remain in Validate userscript');
expect(hierarchyCheck.includes("check-naming-dispatch-centre-profile-render-v1092.mjs"), 'Registered hierarchy regression must continue chaining the v1.0.92 supersession guard');

console.log('PASS: failed v1.0.92 hidden-profile acquisition is permanently superseded by v1.0.93 native station rows.');
'''
(ROOT / 'scripts/check-naming-dispatch-centre-profile-render-v1092.mjs').write_text(v1092)

v1091 = r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Preserve the hierarchy introduced in v1.0.91 while chaining the v1.0.92
// supersession guard and the v1.0.93 native-row acquisition regression.
await import('./check-naming-dispatch-centre-profile-render-v1092.mjs');

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

expect(source.includes('// @version      1.0.93'), 'Expected current Command Nexus 1.0.93');
expect(source.includes("const UNIT_VERSION = '3.3.18';"), 'Expected current Unit Naming 3.3.18');
expect(source.includes("const STATION_VERSION = '1.3.12';"), 'Expected current Station Naming 1.3.12');
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

console.log('PASS: v1.0.91 Dispatch Centre -> Service -> Station Type -> Start From hierarchy is preserved under v1.0.93 native-row authority.');
'''
(ROOT / 'scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs').write_text(v1091)

v1088 = r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
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

expect(source.includes('// @version      1.0.93'), 'Expected current Command Nexus version');
expect(source.includes("const UNIT_VERSION = '3.3.18';"), 'Expected current Unit Naming version');
expect(source.includes("const STATION_VERSION = '1.3.12';"), 'Expected current Station Naming version');

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
expect(workflow.includes('scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs'), 'v1.0.88 authority regression must remain registered');

console.log('PASS: station membership and Dispatch Centre names are both native-row authoritative under v1.0.93.');
'''
(ROOT / 'scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs').write_text(v1088)

v1087 = r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

expect(source.includes('// @version      1.0.93'), 'Expected Command Nexus 1.0.93');
expect(source.includes("const UNIT_VERSION = '3.3.18';"), 'Expected Unit Naming 3.3.18');
expect(source.includes("const STATION_VERSION = '1.3.12';"), 'Expected Station Naming 1.3.12');
expect(source.includes("'Refreshing…'"), 'Refresh action must expose a loading state');
expect(source.includes("'Retry Dispatch Centres'"), 'Refresh failure must expose a retry state');
expect(source.includes("'Dispatch Centres unavailable — refresh'"), 'Disabled selector must explain centre-list failure');
expect(source.includes('NAMING_DISPATCH_CENTRE_STATE.listLoaded'), 'Selector must require centre-list readiness');

const p0 = source.indexOf('function populateNamingDispatchCentreFilter(');
const p1 = source.indexOf('function getStationsForNamingDispatchCentre(', p0);
const populate = source.slice(p0, p1);
expect(!populate.includes('NAMING_DISPATCH_CENTRE_STATE.loaded &&'), 'Station-assignment readiness must not block the first Dispatch Centre dropdown');

const listStart = source.indexOf('async function loadNamingDispatchCentreList(');
const listEnd = source.indexOf('function getNamingServiceForStation(', listStart);
const listLoader = source.slice(listStart, listEnd);
expect(listLoader.includes('collectNamingDispatchCentresFromStationRows()'), 'Refresh must load centres from native type-7 station rows');
expect(!listLoader.includes('/profile/'), 'Profile route must not return as centre-list authority');
expect(!listLoader.includes('/leitstellenansicht'), 'Fetched Stations view must not return as centre-list authority');
expect(!listLoader.includes('/edit'), 'Building edit page must not return as centre-list authority');
expect(workflow.includes('scripts/check-naming-dispatch-centre-refresh-v1087.mjs'), 'v1.0.87 refresh-state regression must remain registered');

console.log('PASS: v1.0.87 refresh/retry states remain protected while v1.0.93 uses native type-7 centre rows.');
'''
(ROOT / 'scripts/check-naming-dispatch-centre-refresh-v1087.mjs').write_text(v1087)

v1086 = r'''import { readFile } from 'node:fs/promises';

// Historical v1.0.86 centre-first regression, revalidated against the v1.0.93 hierarchy.
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

expect(source.includes('// @version      1.0.93'), 'Expected Command Nexus 1.0.93');
expect(source.includes("const UNIT_VERSION = '3.3.18';"), 'Expected Unit Naming 3.3.18');
expect(source.includes("const STATION_VERSION = '1.3.12';"), 'Expected Station Naming 1.3.12');
expect(source.includes('extractNamingDispatchCentresFromStationRows'), 'Native type-7 Dispatch Centre parser missing');
expect(source.includes("getAttribute?.('leitstelle_building_id')"), 'Station membership must remain row-authoritative');
expect(source.includes('function loadNamingDispatchCentreList('), 'Independent Dispatch Centre list loader missing');
expect(source.includes('function populateNamingServiceFilter('), 'Centre-scoped Service filter missing');
expect(source.includes('function populateNamingStationTypeFilter('), 'Service-scoped Station Type filter missing');
expect(source.includes('Refresh Dispatch Centres'), 'Dedicated Dispatch Centre refresh control missing');

const unitCentre = source.indexOf('id="mc-namer-dispatch-centre"');
const unitService = source.indexOf('id="mc-namer-service"');
const unitType = source.indexOf('id="mc-namer-station-type"');
const unitStart = source.indexOf('id="mc-namer-startfrom"');
expect(unitCentre >= 0 && unitService > unitCentre && unitType > unitService && unitStart > unitType,
  'Unit Naming must order Dispatch Centre -> Service -> Station Type -> Start From');
const stationCentre = source.indexOf('id="mc-station-dispatch-centre"');
const stationService = source.indexOf('id="mc-station-service"');
const stationType = source.indexOf('id="mc-station-type"');
const stationStart = source.indexOf('id="mc-station-startfrom"');
expect(stationCentre >= 0 && stationService > stationCentre && stationType > stationService && stationStart > stationType,
  'Station Naming must order Dispatch Centre -> Service -> Station Type -> Start From');

const p0 = source.indexOf('function populateNamingDispatchCentreFilter(');
const p1 = source.indexOf('function getStationsForNamingDispatchCentre(', p0);
const populate = source.slice(p0, p1);
expect(populate.includes('NAMING_DISPATCH_CENTRE_STATE.labelsById.entries()'), 'Centre selector must use independently loaded centre labels');
expect(!populate.includes('(stations || [])'), 'Centre selector must not infer centre labels from ordinary station names');
expect(source.includes("populateNamingStationTypeFilter('mc-namer-station-type', 'mc-namer-dispatch-centre', 'mc-namer-service', STATE.stations)"), 'Unit Station Type must cascade from centre + service');
expect(source.includes("populateNamingStationTypeFilter('mc-station-type', 'mc-station-dispatch-centre', 'mc-station-service', STATION_STATE.stations)"), 'Station Station Type must cascade from centre + service');
expect(source.includes("add(NAMING_DISPATCH_CENTRE_ALL, 'All dispatch centres')"), 'All dispatch centres fallback missing');

console.log('PASS: v1.0.86 centre-first authority is preserved as Dispatch Centre -> Service -> Station Type -> Start From.');
'''
(ROOT / 'scripts/check-naming-dispatch-centre-first-v1086.mjs').write_text(v1086)

# Release documentation.
changelog = (ROOT / 'CHANGELOG.md').read_text()
release = '''## [1.0.93] - 2026-08-09

### Fixed

- Fixed the live `Rendered profile did not expose any Dispatch Centre panels within 15000ms` failure in Unit Naming and Station Naming.
- v1.0.92 incorrectly assumed that loading `/profile/{id}` in a hidden iframe would reproduce the LSSMV4/Vue profile lightbox with its Buildings tab selected; live MissionChief does not expose those modal-only panels in that iframe.
- Dispatch Centre ID/name authority now comes directly from native Resource Administration building rows with `building_type_id="7"`.
- Station-to-centre membership remains directly authoritative from the same native row model's `leitstelle_building_id` attribute.
- Native row discovery checks the active document and same-origin frame documents, so the naming tools work whether Resource Administration owns the current frame or the top page.
- Removed profile route resolution, `.profile-dispatchcenter` parsing and the hidden profile renderer from Dispatch Centre naming discovery.
- Dispatch Centre → Service → Station Type → Start From, delegated Refresh/Retry ownership and Personnel Assignment isolation remain unchanged.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-native-station-rows-v1093.mjs`, executing the production row parser against all seven supplied Dispatch Centres plus ordinary, mismatched and invalid rows.
- Reworked the retained v1.0.86-v1.0.92 Dispatch Centre regressions so they preserve hierarchy, membership and Retry contracts while permanently rejecting the failed profile acquisition architecture.
- The already-registered hierarchy gate chains the v1.0.93 regression, so no new workflow-definition mutation is required.

### Changed resource baselines

- Command Nexus increased from `1.0.92` to `1.0.93`.
- Unit Naming increased from `3.3.17` to `3.3.18`.
- Station Naming increased from `1.3.11` to `1.3.12`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

'''
anchor = '## [1.0.92] - 2026-08-09\n'
if anchor not in changelog:
    raise SystemExit('CHANGELOG v1.0.92 anchor missing')
changelog = changelog.replace(anchor, release + anchor, 1)
(ROOT / 'CHANGELOG.md').write_text(changelog)

readme = (ROOT / 'README.md').read_text()
if '**Current version:** `1.0.92`' not in readme:
    raise SystemExit('README current version anchor missing')
readme = readme.replace('**Current version:** `1.0.92`', '**Current version:** `1.0.93`', 1)
(ROOT / 'README.md').write_text(readme)

src_readme = (ROOT / 'src/README.md').read_text()
if '| Command Nexus version | `1.0.92` |' not in src_readme:
    raise SystemExit('src/README current version anchor missing')
src_readme = src_readme.replace('| Command Nexus version | `1.0.92` |', '| Command Nexus version | `1.0.93` |', 1)
(ROOT / 'src/README.md').write_text(src_readme)

print('Built Command Nexus 1.0.93 native station-row Dispatch Centre candidate.')
