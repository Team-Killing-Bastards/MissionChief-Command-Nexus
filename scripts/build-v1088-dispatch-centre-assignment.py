#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/missionchief-command-nexus.user.js"


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_block(text, start_marker, end_marker, new_block, label):
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f"{label}: start marker not found")
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f"{label}: end marker not found")
    return text[:start] + new_block.rstrip() + "\n\n" + text[end:]


source = SOURCE.read_text(encoding="utf-8")
source = replace_once(source, "// @version      1.0.87", "// @version      1.0.88", "Command Nexus version")
source = replace_once(source, "const UNIT_VERSION = '3.3.12';", "const UNIT_VERSION = '3.3.13';", "Unit Naming version")
source = replace_once(source, "const STATION_VERSION = '1.3.6';", "const STATION_VERSION = '1.3.7';", "Station Naming version")

assignment_block = r'''    function getNamingStationRowBuildingId(row) {
        if (!row) return '';
        const explicit =
            row.getAttribute?.('building_id') ||
            row.getAttribute?.('data-building-id') ||
            row.dataset?.buildingId ||
            '';
        if (explicit) return String(explicit);

        const rowId = String(row.id || '').match(/^building_list_(\d+)$/)?.[1] || '';
        if (rowId) return rowId;

        const nested =
            row.querySelector?.('[building_id]')?.getAttribute?.('building_id') ||
            row.querySelector?.('[data-building_id]')?.getAttribute?.('data-building_id') ||
            '';
        return nested ? String(nested) : '';
    }

    function getNamingStationRowDispatchCentreId(row) {
        if (!row) return '';
        const raw =
            row.getAttribute?.('leitstelle_building_id') ||
            row.getAttribute?.('data-leitstelle-building-id') ||
            row.dataset?.leitstelleBuildingId ||
            '';
        if (raw === '' || raw == null) return '';
        const numeric = Number(raw);
        if (Number.isFinite(numeric) && numeric <= 0) return '';
        return String(raw);
    }

    function refreshNamingDispatchCentreAssignmentsFromStationRows() {
        NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
        const rows = [
            ...document.querySelectorAll(
                '.building_list_li, .building_list, [leitstelle_building_id], [data-leitstelle-building-id]'
            )
        ];

        rows.forEach(row => {
            const buildingId = getNamingStationRowBuildingId(row);
            if (!buildingId) return;
            const dispatchCentreId = getNamingStationRowDispatchCentreId(row);
            if (!dispatchCentreId) return;
            NAMING_DISPATCH_CENTRE_STATE.byBuildingId.set(buildingId, dispatchCentreId);
        });

        NAMING_DISPATCH_CENTRE_STATE.loaded = true;
        return true;
    }

    async function loadNamingDispatchCentreData(force = false) {
        if (force) {
            NAMING_DISPATCH_CENTRE_STATE.loaded = false;
            NAMING_DISPATCH_CENTRE_STATE.loadPromise = null;
            NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
        }
        if (NAMING_DISPATCH_CENTRE_STATE.loaded) return true;
        if (NAMING_DISPATCH_CENTRE_STATE.loadPromise) {
            return NAMING_DISPATCH_CENTRE_STATE.loadPromise;
        }

        NAMING_DISPATCH_CENTRE_STATE.loadPromise = Promise.resolve()
            .then(() => refreshNamingDispatchCentreAssignmentsFromStationRows())
            .catch(error => {
                NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
                NAMING_DISPATCH_CENTRE_STATE.loaded = false;
                console.warn('[Command Nexus] Dispatch Centre station assignments unavailable:', error);
                return false;
            });

        const loaded = await NAMING_DISPATCH_CENTRE_STATE.loadPromise;
        if (!loaded) NAMING_DISPATCH_CENTRE_STATE.loadPromise = null;
        return loaded;
    }'''

source = replace_block(
    source,
    "    async function loadNamingDispatchCentreData(force = false) {",
    "    function getNamingDispatchCentreId(buildingId) {",
    assignment_block,
    "station-row Dispatch Centre assignment loader",
)

list_block = r'''    function extractNamingDispatchCentresFromBuildingEditHtml(html) {
        const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
        const select =
            parsed.querySelector('#building_leitstelle_building_id') ||
            parsed.querySelector('select[name="building[leitstelle_building_id]"]');
        const centres = new Map();
        if (!select) return centres;

        [...select.querySelectorAll('option[value]')].forEach(option => {
            const id = String(option.getAttribute('value') || '').trim();
            const label = cleanText(option.textContent || '');
            if (!id || !label) return;
            centres.set(id, label);
        });
        return centres;
    }

    function getNamingDispatchCentreSeedBuildingId() {
        const stateBuildingId = [
            ...(STATE.stations || []),
            ...(STATION_STATE.stations || [])
        ].map(station => String(station?.buildingId || '')).find(Boolean);
        if (stateBuildingId) return stateBuildingId;

        const rows = [
            ...document.querySelectorAll('.building_list_li, .building_list')
        ];
        const preferred = rows.find(row => {
            const buildingId = getNamingStationRowBuildingId(row);
            if (!buildingId) return false;
            const typeId = String(row.getAttribute?.('building_type_id') || '');
            return typeId !== '7';
        }) || rows.find(row => Boolean(getNamingStationRowBuildingId(row)));

        return getNamingStationRowBuildingId(preferred);
    }

    async function loadNamingDispatchCentreList(force = false) {
        if (force) {
            NAMING_DISPATCH_CENTRE_STATE.listLoaded = false;
            NAMING_DISPATCH_CENTRE_STATE.listPromise = null;
            NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
        }
        if (NAMING_DISPATCH_CENTRE_STATE.listLoaded) return true;
        if (NAMING_DISPATCH_CENTRE_STATE.listPromise) return NAMING_DISPATCH_CENTRE_STATE.listPromise;

        NAMING_DISPATCH_CENTRE_STATE.listPromise = (async () => {
            try {
                const seedBuildingId = getNamingDispatchCentreSeedBuildingId();
                if (!seedBuildingId) {
                    throw new Error('No station building is available to read Dispatch Centre assignments');
                }

                const response = await stationFetchWithTimeout(
                    `/buildings/${seedBuildingId}/edit`,
                    { credentials: 'same-origin', cache: 'no-store' },
                    15000
                );
                if (!response.ok) {
                    throw new Error(`Building edit page returned HTTP ${response.status}`);
                }

                const centres = extractNamingDispatchCentresFromBuildingEditHtml(await response.text());
                if (!centres.size) {
                    throw new Error('Assigned Dispatch Center selector did not expose any Dispatch Centres');
                }

                NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
                centres.forEach((label, id) =>
                    NAMING_DISPATCH_CENTRE_STATE.labelsById.set(String(id), label)
                );
                NAMING_DISPATCH_CENTRE_STATE.listLoaded = true;
                return true;
            } catch (error) {
                NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
                NAMING_DISPATCH_CENTRE_STATE.listLoaded = false;
                console.warn('[Command Nexus] Dispatch Centre list unavailable:', error);
                return false;
            }
        })();

        const loaded = await NAMING_DISPATCH_CENTRE_STATE.listPromise;
        if (!loaded) NAMING_DISPATCH_CENTRE_STATE.listPromise = null;
        return loaded;
    }'''

source = replace_block(
    source,
    "    function extractNamingDispatchCentresFromHtml(html) {",
    "    function populateNamingDispatchCentreFilter(selectId) {",
    list_block,
    "building-edit Dispatch Centre list loader",
)

SOURCE.write_text(source, encoding="utf-8")

# Keep every version-aware permanent check aligned with the current production baseline.
for check_path in sorted((ROOT / "scripts").glob("check-*.mjs")):
    check = check_path.read_text(encoding="utf-8")
    check = check.replace("// @version      1.0.87", "// @version      1.0.88")
    check = check.replace("const UNIT_VERSION = '3.3.12';", "const UNIT_VERSION = '3.3.13';")
    check = check.replace("const STATION_VERSION = '1.3.6';", "const STATION_VERSION = '1.3.7';")
    check_path.write_text(check, encoding="utf-8")

v1085 = r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

// Legacy v1.0.85 safety coverage retained and revalidated for v1.0.88.
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const requireText = (text, label = text) => { if (!source.includes(text)) fail(`Missing naming Dispatch Centre contract: ${label}`); };

for (const [text, label] of [
  ['// @version      1.0.88', 'Command Nexus 1.0.88 metadata'],
  ["const UNIT_VERSION = '3.3.13';", 'Unit Naming 3.3.13'],
  ["const STATION_VERSION = '1.3.7';", 'Station Naming 1.3.7'],
  ['id="mc-namer-dispatch-centre" disabled', 'Unit Naming Dispatch Centre select'],
  ['id="mc-station-dispatch-centre" disabled', 'Station Naming Dispatch Centre select'],
  ["const NAMING_DISPATCH_CENTRE_ALL = 'ALL';", 'All Dispatch Centres default'],
  ["const NAMING_DISPATCH_CENTRE_UNASSIGNED = '__UNASSIGNED__';", 'unassigned Dispatch Centre option'],
  ["getAttribute?.('leitstelle_building_id')", 'authoritative station-row Dispatch Centre relationship'],
  ['function refreshNamingDispatchCentreAssignmentsFromStationRows(', 'station-row assignment refresh'],
  ['function stationMatchesNamingDispatchCentre(', 'shared Dispatch Centre predicate'],
  ['function populateNamingDispatchCentreFilter(', 'shared Dispatch Centre selector population'],
  ['function handleUnitDispatchCentreChange(', 'Unit Naming centre-first change handler'],
  ['function handleStationDispatchCentreChange(', 'Station Naming centre-first change handler'],
  ["'All dispatch centres'", 'All Dispatch Centres option label'],
  ["'Unassigned / default'", 'unassigned option label'],
]) requireText(text, label);

if ((source.match(/dispatchCentreId: getNamingDispatchCentreId\(entry\.buildingId\)/g) || []).length < 2) {
  fail('Both Unit Naming and Station Naming must map the Dispatch Centre relationship.');
}
if ((source.match(/loadNamingDispatchCentreData\(false\)/g) || []).length < 2) {
  fail('Both naming tools must refresh authoritative station-to-centre assignments.');
}
if (source.includes('mc-personnel-dispatch-centre')) {
  fail('Dispatch Centre filtering must not affect Personnel Assignment.');
}
if (!workflow.includes('scripts/check-naming-dispatch-centre-filter-v1085.mjs')) {
  fail('Naming Dispatch Centre regression is not registered in Validate userscript.');
}
console.log('Legacy Unit/Station Naming Dispatch Centre safety contracts passed under v1.0.88.');
'''
(ROOT / "scripts/check-naming-dispatch-centre-filter-v1085.mjs").write_text(v1085, encoding="utf-8")

v1086 = r'''import { readFile } from 'node:fs/promises';

// Permanent v1.0.86 regression for the Dispatch Centre-first naming cascade.
// Revalidated against the current v1.0.88 production baseline.
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

expect(source.includes('// @version      1.0.88'), 'Expected Command Nexus 1.0.88');
expect(source.includes("const UNIT_VERSION = '3.3.13';"), 'Expected Unit Naming 3.3.13');
expect(source.includes("const STATION_VERSION = '1.3.7';"), 'Expected Station Naming 1.3.7');
expect(source.includes('extractNamingDispatchCentresFromBuildingEditHtml'), 'Building-edit Dispatch Centre parser missing');
expect(source.includes('`/buildings/${seedBuildingId}/edit`'), 'Dispatch Centre names must come from the building assignment selector');
expect(source.includes("getAttribute?.('leitstelle_building_id')"), 'Station relationship must come from station-row leitstelle_building_id');
expect(source.includes('function loadNamingDispatchCentreList('), 'Independent Dispatch Centre list loader missing');
expect(source.includes('function populateNamingStationTypeFilter('), 'Centre-scoped Station Type filter missing');
expect(source.includes('Refresh Dispatch Centres'), 'Dedicated Dispatch Centre refresh control missing');

const unitCentre = source.indexOf('id="mc-namer-dispatch-centre"');
const unitType = source.indexOf('id="mc-namer-station-type"');
const unitStart = source.indexOf('id="mc-namer-startfrom"');
expect(unitCentre >= 0 && unitType > unitCentre && unitStart > unitType, 'Unit Naming must order Dispatch Centre -> Station Type -> Start From');

const stationCentre = source.indexOf('id="mc-station-dispatch-centre"');
const stationType = source.indexOf('id="mc-station-type"');
const stationStart = source.indexOf('id="mc-station-startfrom"');
expect(stationCentre >= 0 && stationType > stationCentre && stationStart > stationType, 'Station Naming must order Dispatch Centre -> Station Type -> Start From');

const p0 = source.indexOf('function populateNamingDispatchCentreFilter(');
const p1 = source.indexOf('function getStationsForNamingDispatchCentre(', p0);
const populate = source.slice(p0, p1);
expect(populate.includes('NAMING_DISPATCH_CENTRE_STATE.labelsById.entries()'), 'Centre selector must use independently loaded centre labels');
expect(!populate.includes('(stations || [])'), 'Centre selector must not infer centre labels from station names');
expect(source.includes("populateNamingStationTypeFilter('mc-namer-station-type', 'mc-namer-dispatch-centre', STATE.stations)"), 'Unit Station Type must cascade from Dispatch Centre');
expect(source.includes("populateNamingStationTypeFilter('mc-station-type', 'mc-station-dispatch-centre', STATION_STATE.stations)"), 'Station Station Type must cascade from Dispatch Centre');
expect(source.includes("add(NAMING_DISPATCH_CENTRE_ALL, 'All dispatch centres')"), 'All dispatch centres fallback missing');

console.log('PASS: Dispatch Centre -> Station Type -> Start From naming flow uses authoritative IDs.');
'''
(ROOT / "scripts/check-naming-dispatch-centre-first-v1086.mjs").write_text(v1086, encoding="utf-8")

v1087 = r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

expect(source.includes('// @version      1.0.88'), 'Expected Command Nexus 1.0.88');
expect(source.includes("const UNIT_VERSION = '3.3.13';"), 'Expected Unit Naming 3.3.13');
expect(source.includes("const STATION_VERSION = '1.3.7';"), 'Expected Station Naming 1.3.7');
expect(source.includes("'Refreshing…'"), 'Refresh action must expose a loading state');
expect(source.includes("'Retry Dispatch Centres'"), 'Refresh failure must expose a retry state');
expect(source.includes("'Dispatch Centres unavailable — refresh'"), 'Disabled selector must explain the refresh failure');
expect(source.includes('NAMING_DISPATCH_CENTRE_STATE.listLoaded'), 'Selector must require centre-list readiness');
expect(source.includes('NAMING_DISPATCH_CENTRE_STATE.loaded'), 'Selector must require station-assignment readiness');
expect(!source.includes("stationFetchWithTimeout('/leitstellenansicht'"), 'v1.0.87 /leitstellenansicht source must not return');
expect(workflow.includes('scripts/check-naming-dispatch-centre-refresh-v1087.mjs'), 'v1.0.87 refresh-state regression must remain registered');
console.log('PASS: Dispatch Centre refresh/retry states remain protected after the v1.0.88 source correction.');
'''
(ROOT / "scripts/check-naming-dispatch-centre-refresh-v1087.mjs").write_text(v1087, encoding="utf-8")

v1088 = r'''#!/usr/bin/env node
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

expect(source.includes('// @version      1.0.88'), 'Expected Command Nexus 1.0.88');
expect(source.includes("const UNIT_VERSION = '3.3.13';"), 'Expected Unit Naming 3.3.13');
expect(source.includes("const STATION_VERSION = '1.3.7';"), 'Expected Station Naming 1.3.7');

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
expect(!source.includes("stationFetchWithTimeout('/building/buildings_json'"), 'Obsolete buildings_json assignment source remains in production naming flow');
expect(!source.includes('mc-personnel-dispatch-centre'), 'Personnel Assignment must remain outside Dispatch Centre filtering');
expect(workflow.includes('scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs'), 'v1.0.88 source regression must be registered in Validate userscript');

console.log('PASS: v1.0.88 uses the building assignment selector plus station-row leitstelle_building_id authority.');
'''
(ROOT / "scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs").write_text(v1088, encoding="utf-8")

workflow_path = ROOT / ".github/workflows/validate-userscript.yml"
workflow = workflow_path.read_text(encoding="utf-8")
path_needle = "      - 'scripts/check-naming-dispatch-centre-refresh-v1087.mjs'\n"
if workflow.count(path_needle) != 2:
    raise RuntimeError(f"validate path registration: expected two v1087 path entries, found {workflow.count(path_needle)}")
workflow = workflow.replace(path_needle, path_needle + "      - 'scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs'\n")
step_needle = '''      - name: Validate Dispatch Centre refresh parser and retry state
        run: node scripts/check-naming-dispatch-centre-refresh-v1087.mjs
'''
if workflow.count(step_needle) != 1:
    raise RuntimeError("validate v1087 step marker not found exactly once")
workflow = workflow.replace(step_needle, step_needle + '''
      - name: Validate Dispatch Centre assignment-selector source
        run: node scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs
''', 1)
workflow_path.write_text(workflow, encoding="utf-8")

readme_path = ROOT / "README.md"
readme = readme_path.read_text(encoding="utf-8")
readme = replace_once(readme, "**Current version:** `1.0.87`", "**Current version:** `1.0.88`", "README current version")
readme_path.write_text(readme, encoding="utf-8")

src_readme_path = ROOT / "src/README.md"
src_readme = src_readme_path.read_text(encoding="utf-8")
src_readme = replace_once(src_readme, "| Command Nexus version | `1.0.87` |", "| Command Nexus version | `1.0.88` |", "src README current version")
src_readme_path.write_text(src_readme, encoding="utf-8")

changelog_path = ROOT / "CHANGELOG.md"
changelog = changelog_path.read_text(encoding="utf-8")
marker = "The project uses Semantic Versioning for the unified userscript release line.\n\n"
if changelog.count(marker) != 1:
    raise RuntimeError("CHANGELOG insertion marker not found exactly once")
entry = '''## [1.0.88] - 2026-08-09

### Fixed

- Dispatch Centre names for Unit Naming and Station Naming now come from MissionChief's **Assigned Dispatch Center** selector on one ordinary building edit page (`#building_leitstelle_building_id`), which exposes the real Dispatch Centre ID/name pairs.
- Station-to-centre membership now comes directly from each Stations row's `leitstelle_building_id` attribute instead of a second buildings JSON lookup.
- Selecting a Dispatch Centre scopes the station set first; **Station Type** is rebuilt from that centre subset, then **Start From** is rebuilt from centre + type.
- The obsolete `/leitstellenansicht` Dispatch Centre-name parser is removed from the naming flow.
- Refresh/retry states from v1.0.87 remain unchanged.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs` using the supplied MissionChief assignment-selector fixture, including the real `LODON DISPATCH` and `Scotlands Dispatch` ID/name pairs.
- Rebased the v1.0.85-v1.0.87 naming regressions so they protect the filter/cascade/refresh UI without preserving the incorrect old source assumptions.

### Changed resource baselines

- Command Nexus increased from `1.0.87` to `1.0.88`.
- Unit Naming increased from `3.3.12` to `3.3.13`.
- Station Naming increased from `1.3.6` to `1.3.7`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

'''
changelog = changelog.replace(marker, marker + entry, 1)
changelog_path.write_text(changelog, encoding="utf-8")
