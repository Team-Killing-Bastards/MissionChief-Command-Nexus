from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'src/missionchief-command-nexus.user.js'
source = SRC.read_text(encoding='utf-8')


def require(cond, msg):
    if not cond:
        raise SystemExit(f'BUILD ERROR: {msg}')


def replace_once(text, old, new, label):
    count = text.count(old)
    require(count == 1, f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def replace_regex_once(text, pattern, repl, label, flags=re.S):
    out, count = re.subn(pattern, repl, text, count=1, flags=flags)
    require(count == 1, f'{label}: expected exactly one regex match, found {count}')
    return out


require('// @version      1.0.85' in source, 'expected production 1.0.85 source')
require("const UNIT_VERSION = '3.3.10';" in source, 'expected Unit Naming 3.3.10')
require("const STATION_VERSION = '1.3.4';" in source, 'expected Station Naming 1.3.4')
require('/building/buildings_json' in source, 'expected current building assignment source')
require('leitstelle_building_id' in source, 'expected authoritative station-to-centre relationship')

source = replace_once(source, '// @version      1.0.85', '// @version      1.0.86', 'userscript version')
source = replace_once(source, "const UNIT_VERSION = '3.3.10';", "const UNIT_VERSION = '3.3.11';", 'Unit Naming version')
source = replace_once(source, "const STATION_VERSION = '1.3.4';", "const STATION_VERSION = '1.3.5';", 'Station Naming version')

old_state = """    const NAMING_DISPATCH_CENTRE_STATE = {
        loadPromise: null,
        loaded: false,
        byBuildingId: new Map(),
        labelsById: new Map()
    };"""
new_state = """    const NAMING_DISPATCH_CENTRE_STATE = {
        loadPromise: null,
        directoryPromise: null,
        loaded: false,
        directoryLoaded: false,
        byBuildingId: new Map(),
        labelsById: new Map()
    };"""
source = replace_once(source, old_state, new_state, 'Dispatch Centre state')

old_reset = """        NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
        NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
        NAMING_DISPATCH_CENTRE_STATE.loadPromise = null;
        NAMING_DISPATCH_CENTRE_STATE.loaded = false;"""
new_reset = """        NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
        NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
        NAMING_DISPATCH_CENTRE_STATE.loadPromise = null;
        NAMING_DISPATCH_CENTRE_STATE.directoryPromise = null;
        NAMING_DISPATCH_CENTRE_STATE.loaded = false;
        NAMING_DISPATCH_CENTRE_STATE.directoryLoaded = false;"""
source = replace_once(source, old_reset, new_reset, 'Dispatch Centre cleanup state')

loader_block = r"    async function loadNamingDispatchCentreData\(\) \{.*?\n    \}\n\n    function getNamingDispatchCentreId\(buildingId\) \{"
loader_replacement = r'''    function extractNamingDispatchCentresFromDocument(doc) {
        const centres = new Map();
        if (!doc?.querySelectorAll) return centres;

        doc.querySelectorAll('a[href], [data-building-id]').forEach(element => {
            const href = String(element.getAttribute?.('href') || '');
            const dataId = String(element.getAttribute?.('data-building-id') || '');
            const match = href.match(/\/buildings\/(\d+)(?:[\/?#]|$)/);
            const dispatchCentreId = match?.[1] || (/^\d+$/.test(dataId) ? dataId : '');
            if (!dispatchCentreId) return;

            const label = cleanText(
                element.getAttribute?.('data-caption') ||
                element.getAttribute?.('title') ||
                element.textContent ||
                ''
            );
            if (!label) return;

            const existing = centres.get(dispatchCentreId) || '';
            if (!existing || label.length < existing.length) {
                centres.set(dispatchCentreId, label);
            }
        });

        return centres;
    }

    async function loadNamingDispatchCentreDirectory({ force = false } = {}) {
        if (!force && NAMING_DISPATCH_CENTRE_STATE.directoryLoaded) return true;
        if (!force && NAMING_DISPATCH_CENTRE_STATE.directoryPromise) {
            return NAMING_DISPATCH_CENTRE_STATE.directoryPromise;
        }

        NAMING_DISPATCH_CENTRE_STATE.directoryPromise = (async () => {
            try {
                const response = await stationFetchWithTimeout('/leitstellenansicht', {
                    credentials: 'same-origin',
                    cache: 'no-store'
                }, 15000);
                if (!response.ok) {
                    throw new Error(`Dispatch Centres returned HTTP ${response.status}`);
                }

                const html = await response.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const centres = extractNamingDispatchCentresFromDocument(doc);
                if (!centres.size) {
                    throw new Error('No Dispatch Centres were found in the native Dispatch Centres view');
                }

                NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
                centres.forEach((label, dispatchCentreId) => {
                    NAMING_DISPATCH_CENTRE_STATE.labelsById.set(dispatchCentreId, label);
                });
                NAMING_DISPATCH_CENTRE_STATE.directoryLoaded = true;
                return true;
            } catch (error) {
                NAMING_DISPATCH_CENTRE_STATE.directoryLoaded = false;
                console.warn('[Command Nexus] Native Dispatch Centre directory unavailable:', error);
                return false;
            } finally {
                NAMING_DISPATCH_CENTRE_STATE.directoryPromise = null;
            }
        })();

        return NAMING_DISPATCH_CENTRE_STATE.directoryPromise;
    }

    async function loadNamingDispatchCentreData({ force = false } = {}) {
        if (!force && NAMING_DISPATCH_CENTRE_STATE.loaded) return true;
        if (!force && NAMING_DISPATCH_CENTRE_STATE.loadPromise) {
            return NAMING_DISPATCH_CENTRE_STATE.loadPromise;
        }

        NAMING_DISPATCH_CENTRE_STATE.loadPromise = (async () => {
            try {
                const response = await stationFetchWithTimeout('/building/buildings_json', {
                    credentials: 'same-origin',
                    cache: 'no-store'
                }, 15000);
                if (!response.ok) {
                    throw new Error(`Buildings data returned HTTP ${response.status}`);
                }

                const records = extractBuildingRecords(await response.json());
                const recordsById = new Map();
                const requestedCentreIds = new Set();
                NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();

                records.forEach(building => {
                    const buildingId = getNamingBuildingRecordId(building);
                    if (!buildingId) return;
                    recordsById.set(buildingId, building);

                    const dispatchCentreId = getNamingDispatchCentreIdFromRecord(building);
                    if (!dispatchCentreId) return;
                    NAMING_DISPATCH_CENTRE_STATE.byBuildingId.set(buildingId, dispatchCentreId);
                    requestedCentreIds.add(dispatchCentreId);
                });

                requestedCentreIds.forEach(dispatchCentreId => {
                    if (NAMING_DISPATCH_CENTRE_STATE.labelsById.has(dispatchCentreId)) return;
                    NAMING_DISPATCH_CENTRE_STATE.labelsById.set(
                        dispatchCentreId,
                        getNamingBuildingRecordLabel(recordsById.get(dispatchCentreId), dispatchCentreId)
                    );
                });

                NAMING_DISPATCH_CENTRE_STATE.loaded = true;
                return true;
            } catch (error) {
                NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
                NAMING_DISPATCH_CENTRE_STATE.loaded = false;
                console.warn('[Command Nexus] Dispatch Centre assignment data unavailable:', error);
                return false;
            } finally {
                NAMING_DISPATCH_CENTRE_STATE.loadPromise = null;
            }
        })();

        return NAMING_DISPATCH_CENTRE_STATE.loadPromise;
    }

    function getNamingDispatchCentreId(buildingId) {'''
source = replace_regex_once(source, loader_block, loader_replacement, 'independent Dispatch Centre directory loader')

selector_block = r"    function populateNamingDispatchCentreFilter\(selectId, stations\) \{.*?\n    \}\n\n    function findStationOverviewEntry\(href\) \{"
selector_replacement = r'''    function populateNamingDispatchCentreFilter(selectId, stations) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const previous = select.value || NAMING_DISPATCH_CENTRE_ALL;
        const centreIds = new Set(NAMING_DISPATCH_CENTRE_STATE.labelsById.keys());
        (stations || []).forEach(station => {
            const dispatchCentreId = String(station?.dispatchCentreId || '');
            if (dispatchCentreId) centreIds.add(dispatchCentreId);
        });
        const sortedCentreIds = [...centreIds].sort((a, b) => {
            const labelA = NAMING_DISPATCH_CENTRE_STATE.labelsById.get(a) || a;
            const labelB = NAMING_DISPATCH_CENTRE_STATE.labelsById.get(b) || b;
            return labelA.localeCompare(labelB, undefined, { numeric: true });
        });
        const hasUnassigned =
            NAMING_DISPATCH_CENTRE_STATE.loaded &&
            (stations || []).some(station => !station?.dispatchCentreId);

        select.replaceChildren();
        const addOption = (value, label) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        };

        addOption(NAMING_DISPATCH_CENTRE_ALL, 'All dispatch centres');
        sortedCentreIds.forEach(dispatchCentreId => {
            addOption(
                dispatchCentreId,
                NAMING_DISPATCH_CENTRE_STATE.labelsById.get(dispatchCentreId) ||
                    `Dispatch Centre ${dispatchCentreId}`
            );
        });
        if (hasUnassigned) addOption(NAMING_DISPATCH_CENTRE_UNASSIGNED, 'Unassigned / default');

        const values = new Set([...select.options].map(option => option.value));
        select.value = values.has(previous) ? previous : NAMING_DISPATCH_CENTRE_ALL;
        select.disabled = sortedCentreIds.length === 0 && !hasUnassigned;
        select.title = sortedCentreIds.length || hasUnassigned
            ? 'Choose a MissionChief Dispatch Centre before narrowing by station type.'
            : 'No Dispatch Centres found yet. Use Refresh Dispatch Centres.';
    }

    function populateNamingStationTypeFilter(selectId, stations, dispatchSelectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const previous = select.value || 'ALL';
        const selectedDispatchCentre =
            document.getElementById(dispatchSelectId)?.value || NAMING_DISPATCH_CENTRE_ALL;
        const availableTypes = new Set(
            (stations || [])
                .filter(station => stationMatchesNamingDispatchCentre(station, selectedDispatchCentre))
                .map(station => station?.stationType)
                .filter(Boolean)
        );

        select.replaceChildren();
        const allOption = document.createElement('option');
        allOption.value = 'ALL';
        allOption.textContent = 'All station types';
        select.appendChild(allOption);
        Object.entries(STATION_TYPES).forEach(([stationType, label]) => {
            if (!availableTypes.has(stationType)) return;
            const option = document.createElement('option');
            option.value = stationType;
            option.textContent = label;
            select.appendChild(option);
        });
        const values = new Set([...select.options].map(option => option.value));
        select.value = values.has(previous) ? previous : 'ALL';
        select.disabled = availableTypes.size === 0;
    }

    function handleUnitNamingDispatchCentreChange() {
        populateNamingStationTypeFilter('mc-namer-station-type', STATE.stations, 'mc-namer-dispatch-centre');
        populateStartDropdown();
    }

    function handleStationNamingDispatchCentreChange() {
        populateNamingStationTypeFilter('mc-station-type', STATION_STATE.stations, 'mc-station-dispatch-centre');
        populateStationNamingStartDropdown();
    }

    async function refreshUnitNamingDispatchCentres() {
        setStatus('Refreshing Dispatch Centres...');
        await Promise.all([
            loadNamingDispatchCentreDirectory({ force: true }),
            loadNamingDispatchCentreData({ force: true })
        ]);
        STATE.stations.forEach(station => {
            station.dispatchCentreId = getNamingDispatchCentreId(station.buildingId);
        });
        populateNamingDispatchCentreFilter('mc-namer-dispatch-centre', STATE.stations);
        handleUnitNamingDispatchCentreChange();
        setStatus('Ready');
        log(`Dispatch Centres refreshed: ${NAMING_DISPATCH_CENTRE_STATE.labelsById.size}`, 'info');
    }

    async function refreshStationNamingDispatchCentres() {
        setStationUiValue('status', 'Refreshing Dispatch Centres...');
        await Promise.all([
            loadNamingDispatchCentreDirectory({ force: true }),
            loadNamingDispatchCentreData({ force: true })
        ]);
        STATION_STATE.stations.forEach(station => {
            station.dispatchCentreId = getNamingDispatchCentreId(station.buildingId);
        });
        populateNamingDispatchCentreFilter('mc-station-dispatch-centre', STATION_STATE.stations);
        handleStationNamingDispatchCentreChange();
        setStationUiValue('status', 'Ready');
        stationLog(`Dispatch Centres refreshed: ${NAMING_DISPATCH_CENTRE_STATE.labelsById.size}`, 'info');
    }

    function findStationOverviewEntry(href) {'''
source = replace_regex_once(source, selector_block, selector_replacement, 'centre-first filter helpers')

# The two station refresh routes now refresh both authoritative sources before building dependent controls.
source, load_count = re.subn(
    r"        await loadNamingDispatchCentreData\(\);",
    "        await Promise.all([\n            loadNamingDispatchCentreDirectory(),\n            loadNamingDispatchCentreData()\n        ]);",
    source
)
require(load_count == 2, f'expected two naming refresh data loads, found {load_count}')

# Populate the centre selector, then the dependent Station Type selector, then Start From.
unit_pop = """        populateNamingDispatchCentreFilter(
            'mc-namer-dispatch-centre',
            STATE.stations
        );
        populateStartDropdown();"""
unit_pop_new = """        populateNamingDispatchCentreFilter(
            'mc-namer-dispatch-centre',
            STATE.stations
        );
        populateNamingStationTypeFilter(
            'mc-namer-station-type',
            STATE.stations,
            'mc-namer-dispatch-centre'
        );
        populateStartDropdown();"""
source = replace_once(source, unit_pop, unit_pop_new, 'Unit Naming dependent filters')

station_pop = """        populateNamingDispatchCentreFilter(
            'mc-station-dispatch-centre',
            STATION_STATE.stations
        );
        populateStationNamingStartDropdown();"""
station_pop_new = """        populateNamingDispatchCentreFilter(
            'mc-station-dispatch-centre',
            STATION_STATE.stations
        );
        populateNamingStationTypeFilter(
            'mc-station-type',
            STATION_STATE.stations,
            'mc-station-dispatch-centre'
        );
        populateStationNamingStartDropdown();"""
source = replace_once(source, station_pop, station_pop_new, 'Station Naming dependent filters')

# Reorder Dispatch Centre -> Station Type -> Start From in each template, retaining each existing block verbatim.
def reorder_control_blocks(text, ids, refresh_button_id):
    blocks = []
    for control_id in ids:
        pattern = re.compile(
            r'(?P<block><label[^>]*>\s*<b>[^<]+:</b>\s*</label>\s*'
            + rf'<select id="{re.escape(control_id)}"[^>]*>.*?</select>)',
            re.S
        )
        match = pattern.search(text)
        require(match is not None, f'control block not found for {control_id}')
        blocks.append((control_id, match.start(), match.group('block')))
    require(len({item[1] for item in blocks}) == len(ids), f'duplicate control block positions for {ids}')
    earliest = min(blocks, key=lambda item: item[1])[0]
    marker = f'__V1086_ORDER_{ids[0]}__'
    for control_id, _pos, block in sorted(blocks, key=lambda item: item[1], reverse=True):
        replacement = marker if control_id == earliest else ''
        text = text[:text.rfind(block, 0, len(text))] + replacement + text[text.rfind(block, 0, len(text)) + len(block):]
    captured = {control_id: block for control_id, _pos, block in blocks}
    dispatch_block = captured[ids[0]] + (
        f'\n                    <button id="{refresh_button_id}" type="button" style="margin-top:6px;">Refresh Dispatch Centres</button>'
    )
    ordered = '\n\n                    '.join([dispatch_block, captured[ids[1]], captured[ids[2]]])
    require(marker in text, f'order marker missing for {ids}')
    return text.replace(marker, ordered, 1)

source = reorder_control_blocks(
    source,
    ['mc-namer-dispatch-centre', 'mc-namer-station-type', 'mc-namer-startfrom'],
    'mc-namer-refresh-dispatch-centres'
)
source = reorder_control_blocks(
    source,
    ['mc-station-dispatch-centre', 'mc-station-type', 'mc-station-startfrom'],
    'mc-station-refresh-dispatch-centres'
)

source = replace_once(
    source,
    "document.querySelector('#mc-namer-dispatch-centre').onchange = populateStartDropdown;",
    "document.querySelector('#mc-namer-dispatch-centre').onchange = handleUnitNamingDispatchCentreChange;\n        document.querySelector('#mc-namer-refresh-dispatch-centres').onclick = refreshUnitNamingDispatchCentres;",
    'Unit Naming centre handlers'
)
source = replace_once(
    source,
    "document.querySelector('#mc-station-dispatch-centre').onchange = populateStationNamingStartDropdown;",
    "document.querySelector('#mc-station-dispatch-centre').onchange = handleStationNamingDispatchCentreChange;\n        document.querySelector('#mc-station-refresh-dispatch-centres').onclick = refreshStationNamingDispatchCentres;",
    'Station Naming centre handlers'
)

# Extend the shared compact-select styling to the two new refresh controls only through existing button rules; no new visual system.

# Final structural assertions before writing.
for ids in [
    ('mc-namer-dispatch-centre', 'mc-namer-station-type', 'mc-namer-startfrom'),
    ('mc-station-dispatch-centre', 'mc-station-type', 'mc-station-startfrom')
]:
    positions = [source.index(f'id="{item}"') for item in ids]
    require(positions == sorted(positions), f'wrong centre/type/start order for {ids}: {positions}')

for token in [
    "stationFetchWithTimeout('/leitstellenansicht'",
    'new DOMParser().parseFromString',
    'function extractNamingDispatchCentresFromDocument(',
    'function loadNamingDispatchCentreDirectory(',
    "loadNamingDispatchCentreDirectory({ force: true })",
    'mc-namer-refresh-dispatch-centres',
    'mc-station-refresh-dispatch-centres',
    "const UNIT_VERSION = '3.3.11';",
    "const STATION_VERSION = '1.3.5';",
    'leitstelle_building_id'
]:
    require(token in source, f'missing required v1.0.86 token: {token}')

SRC.write_text(source, encoding='utf-8')

# Refresh version assertions in permanent regressions. Behaviour-specific messages remain historical by design.
for check in (ROOT / 'scripts').glob('check-*.mjs'):
    text = check.read_text(encoding='utf-8')
    new = text.replace('// @version      1.0.85', '// @version      1.0.86')
    if new != text:
        check.write_text(new, encoding='utf-8')

# Evolve the v1.0.85 regression where it asserted the old direct onchange wiring.
v1085 = ROOT / 'scripts/check-naming-dispatch-centre-filter-v1085.mjs'
if v1085.exists():
    text = v1085.read_text(encoding='utf-8')
    text = text.replace(
        "document.querySelector('#mc-namer-dispatch-centre').onchange = populateStartDropdown;",
        "document.querySelector('#mc-namer-dispatch-centre').onchange = handleUnitNamingDispatchCentreChange;"
    )
    text = text.replace(
        "document.querySelector('#mc-station-dispatch-centre').onchange = populateStationNamingStartDropdown;",
        "document.querySelector('#mc-station-dispatch-centre').onchange = handleStationNamingDispatchCentreChange;"
    )
    v1085.write_text(text, encoding='utf-8')

check1086 = ROOT / 'scripts/check-naming-dispatch-centre-first-v1086.mjs'
check1086.write_text(r'''import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

for (const token of [
  '// @version      1.0.86',
  "const UNIT_VERSION = '3.3.11';",
  "const STATION_VERSION = '1.3.5';",
  "stationFetchWithTimeout('/leitstellenansicht'",
  "stationFetchWithTimeout('/building/buildings_json'",
  'leitstelle_building_id',
  'function extractNamingDispatchCentresFromDocument(',
  'function loadNamingDispatchCentreDirectory(',
  'new DOMParser().parseFromString',
  'function populateNamingStationTypeFilter(',
  'function handleUnitNamingDispatchCentreChange(',
  'function handleStationNamingDispatchCentreChange(',
  'function refreshUnitNamingDispatchCentres(',
  'function refreshStationNamingDispatchCentres(',
  'mc-namer-refresh-dispatch-centres',
  'mc-station-refresh-dispatch-centres',
  'All dispatch centres',
  'Unassigned / default'
]) expect(source.includes(token), `missing ${token}`);

for (const ids of [
  ['mc-namer-dispatch-centre', 'mc-namer-station-type', 'mc-namer-startfrom'],
  ['mc-station-dispatch-centre', 'mc-station-type', 'mc-station-startfrom']
]) {
  const positions = ids.map(id => source.indexOf(`id="${id}"`));
  expect(positions.every(pos => pos >= 0), `missing naming controls: ${ids.join(', ')}`);
  expect(positions[0] < positions[1] && positions[1] < positions[2], `expected Dispatch Centre -> Station Type -> Start From for ${ids[0]}`);
}

expect(source.includes("document.querySelector('#mc-namer-dispatch-centre').onchange = handleUnitNamingDispatchCentreChange;"), 'Unit Naming centre-first onchange missing');
expect(source.includes("document.querySelector('#mc-station-dispatch-centre').onchange = handleStationNamingDispatchCentreChange;"), 'Station Naming centre-first onchange missing');
expect(source.includes("populateNamingStationTypeFilter('mc-namer-station-type', STATE.stations, 'mc-namer-dispatch-centre');\n        populateStartDropdown();"), 'Unit Naming must rebuild Station Type before Start From');
expect(source.includes("populateNamingStationTypeFilter('mc-station-type', STATION_STATE.stations, 'mc-station-dispatch-centre');\n        populateStationNamingStartDropdown();"), 'Station Naming must rebuild Station Type before Start From');
expect(source.includes('const centreIds = new Set(NAMING_DISPATCH_CENTRE_STATE.labelsById.keys());'), 'Dispatch Centre selector must start from independent native directory, not station-derived IDs only');

console.log('PASS: v1.0.86 naming uses independent Dispatch Centre directory and centre-first dependent filtering.');
''', encoding='utf-8')

# Documentation.
readme = ROOT / 'README.md'
text = readme.read_text(encoding='utf-8').replace('**Current version:** `1.0.85`', '**Current version:** `1.0.86`')
text = text.replace('- Dispatch Centre scoping for Unit Naming and Station Naming', '- Dispatch Centre-first scoping for Unit Naming and Station Naming, with an independent native Dispatch Centre refresh')
readme.write_text(text, encoding='utf-8')

src_readme = ROOT / 'src/README.md'
if src_readme.exists():
    text = src_readme.read_text(encoding='utf-8').replace('1.0.85', '1.0.86')
    src_readme.write_text(text, encoding='utf-8')

changelog = ROOT / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
entry = '''## [1.0.86] - 2026-08-08

### Fixed

- Unit Naming and Station Naming now load the Dispatch Centre list independently from MissionChief's native `/leitstellenansicht` view instead of relying on station assignment records to discover centre names.
- Naming controls now follow the required dependency order: **Dispatch Centre → Station Type → Start From**.
- Station Type options are rebuilt from stations inside the selected Dispatch Centre, and Start From is then rebuilt from the selected centre/type scope.
- Added **Refresh Dispatch Centres** controls to both naming tools while preserving the existing station refresh route.
- Station-to-centre filtering continues to use MissionChief's authoritative `leitstelle_building_id` relationship from `/building/buildings_json`.

### Changed resource baselines

- Command Nexus increased from `1.0.85` to `1.0.86`.
- Unit Naming increased from `3.3.10` to `3.3.11`.
- Station Naming increased from `1.3.4` to `1.3.5`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

'''
marker = '## [1.0.85] - 2026-08-08'
require(marker in text, 'CHANGELOG 1.0.85 marker missing')
text = text.replace(marker, entry + marker, 1)
changelog.write_text(text, encoding='utf-8')

print('v1.0.86 Dispatch Centre-first correction applied.')
