from pathlib import Path

SOURCE = Path('src/missionchief-command-nexus.user.js')
source = SOURCE.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


source = replace_once(source, '// @version      1.0.84', '// @version      1.0.85', 'Command Nexus version')
source = replace_once(source, "const UNIT_VERSION = '3.3.9';", "const UNIT_VERSION = '3.3.10';", 'Unit Naming version')
source = replace_once(source, "const STATION_VERSION = '1.3.3';", "const STATION_VERSION = '1.3.4';", 'Station Naming version')

source = replace_once(
    source,
    "        activeControllers: new Set()\n    };\n\n    const PERSONNEL_STATE = {",
    "        activeControllers: new Set()\n    };\n\n"
    "    const NAMING_DISPATCH_CENTRE_ALL = 'ALL';\n"
    "    const NAMING_DISPATCH_CENTRE_UNASSIGNED = '__UNASSIGNED__';\n"
    "    const NAMING_DISPATCH_CENTRE_STATE = {\n"
    "        loadPromise: null,\n"
    "        loaded: false,\n"
    "        byBuildingId: new Map(),\n"
    "        labelsById: new Map()\n"
    "    };\n\n"
    "    const PERSONNEL_STATE = {",
    'Dispatch Centre shared state',
)

source = replace_once(
    source,
    "        STATION_STATE.buildingCoordinateCache.clear();\n"
    "        STATION_STATE.buildingDataPromise = null;\n"
    "        PERSONNEL_STATE.reports = [];",
    "        STATION_STATE.buildingCoordinateCache.clear();\n"
    "        STATION_STATE.buildingDataPromise = null;\n"
    "        NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();\n"
    "        NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();\n"
    "        NAMING_DISPATCH_CENTRE_STATE.loadPromise = null;\n"
    "        NAMING_DISPATCH_CENTRE_STATE.loaded = false;\n"
    "        PERSONNEL_STATE.reports = [];",
    'Dispatch Centre lifecycle cleanup',
)

helper_block = r'''    function getNamingBuildingRecordId(building) {
        const raw = building?.id ?? building?.building_id ?? building?.buildingId ?? '';
        if (raw === '' || raw == null) return '';
        return String(raw);
    }

    function getNamingDispatchCentreIdFromRecord(building) {
        const raw =
            building?.leitstelle_building_id ??
            building?.leitstelleBuildingId ??
            building?.dispatch_center_id ??
            building?.dispatchCenterId ??
            building?.dispatch_centre_id ??
            building?.dispatchCentreId ??
            '';
        if (raw === '' || raw == null) return '';
        const numeric = Number(raw);
        if (Number.isFinite(numeric) && numeric <= 0) return '';
        return String(raw);
    }

    function getNamingBuildingRecordLabel(building, fallbackId = '') {
        return cleanText(
            building?.caption ??
            building?.name ??
            building?.building_name ??
            building?.buildingName ??
            ''
        ) || `Dispatch Centre ${fallbackId}`.trim();
    }

    async function loadNamingDispatchCentreData() {
        if (NAMING_DISPATCH_CENTRE_STATE.loaded) return true;
        if (NAMING_DISPATCH_CENTRE_STATE.loadPromise) {
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
                NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();

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
                    const centre = recordsById.get(dispatchCentreId);
                    NAMING_DISPATCH_CENTRE_STATE.labelsById.set(
                        dispatchCentreId,
                        getNamingBuildingRecordLabel(centre, dispatchCentreId)
                    );
                });

                NAMING_DISPATCH_CENTRE_STATE.loaded = true;
                return true;
            } catch (error) {
                NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
                NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
                NAMING_DISPATCH_CENTRE_STATE.loaded = false;
                console.warn('[Command Nexus] Dispatch Centre filter data unavailable:', error);
                return false;
            }
        })();

        const loaded = await NAMING_DISPATCH_CENTRE_STATE.loadPromise;
        if (!loaded) NAMING_DISPATCH_CENTRE_STATE.loadPromise = null;
        return loaded;
    }

    function getNamingDispatchCentreId(buildingId) {
        const key = String(buildingId || '');
        return key ? NAMING_DISPATCH_CENTRE_STATE.byBuildingId.get(key) || '' : '';
    }

    function stationMatchesNamingDispatchCentre(station, selectedDispatchCentre) {
        const selected = String(selectedDispatchCentre || NAMING_DISPATCH_CENTRE_ALL);
        if (selected === NAMING_DISPATCH_CENTRE_ALL) return true;
        if (selected === NAMING_DISPATCH_CENTRE_UNASSIGNED) {
            return !station?.dispatchCentreId;
        }
        return String(station?.dispatchCentreId || '') === selected;
    }

    function populateNamingDispatchCentreFilter(selectId, stations) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const previous = select.value || NAMING_DISPATCH_CENTRE_ALL;
        const centreIds = [...new Set(
            (stations || [])
                .map(station => String(station?.dispatchCentreId || ''))
                .filter(Boolean)
        )].sort((a, b) => {
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
        centreIds.forEach(dispatchCentreId => {
            addOption(
                dispatchCentreId,
                NAMING_DISPATCH_CENTRE_STATE.labelsById.get(dispatchCentreId) ||
                    `Dispatch Centre ${dispatchCentreId}`
            );
        });
        if (hasUnassigned) {
            addOption(NAMING_DISPATCH_CENTRE_UNASSIGNED, 'Unassigned / default');
        }

        const values = new Set([...select.options].map(option => option.value));
        select.value = values.has(previous) ? previous : NAMING_DISPATCH_CENTRE_ALL;
        select.disabled = !NAMING_DISPATCH_CENTRE_STATE.loaded;
        select.title = NAMING_DISPATCH_CENTRE_STATE.loaded
            ? 'Filter stations by their MissionChief Dispatch Centre assignment.'
            : 'Dispatch Centre data unavailable; using all stations.';
    }

'''
source = replace_once(source, '    function findStationOverviewEntry(href) {', helper_block + '    function findStationOverviewEntry(href) {', 'Dispatch Centre helpers')

source = replace_once(
    source,
    '''                    <select id="mc-namer-station-type">
                        ${Object.entries(STATION_TYPES).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}
                    </select>

                    <label style="margin-top:6px; display:block;"><b>Unit Class:</b></label>''',
    '''                    <select id="mc-namer-station-type">
                        ${Object.entries(STATION_TYPES).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}
                    </select>

                    <label style="margin-top:6px; display:block;"><b>Dispatch Centre:</b></label>
                    <select id="mc-namer-dispatch-centre" disabled>
                        <option value="ALL">All dispatch centres</option>
                    </select>

                    <label style="margin-top:6px; display:block;"><b>Unit Class:</b></label>''',
    'Unit Naming Dispatch Centre control',
)

source = replace_once(
    source,
    '''                    <select id="mc-station-type">
                        ${Object.entries(STATION_TYPES).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}
                    </select>

                    <label style="margin-top:6px; display:block;"><b>Mode:</b></label>''',
    '''                    <select id="mc-station-type">
                        ${Object.entries(STATION_TYPES).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}
                    </select>

                    <label style="margin-top:6px; display:block;"><b>Dispatch Centre:</b></label>
                    <select id="mc-station-dispatch-centre" disabled>
                        <option value="ALL">All dispatch centres</option>
                    </select>

                    <label style="margin-top:6px; display:block;"><b>Mode:</b></label>''',
    'Station Naming Dispatch Centre control',
)

source = replace_once(source, '            #mc-namer-startfrom,\n            #mc-namer-station-type,\n            #mc-namer-unit-class,', '            #mc-namer-startfrom,\n            #mc-namer-station-type,\n            #mc-namer-dispatch-centre,\n            #mc-namer-unit-class,', 'Unit selector styling')
source = replace_once(source, '            #mc-station-startfrom,\n            #mc-station-type,\n            #mc-station-mode,', '            #mc-station-startfrom,\n            #mc-station-type,\n            #mc-station-dispatch-centre,\n            #mc-station-mode,', 'Station selector styling')

source = replace_once(source, "        document.querySelector('#mc-namer-station-type').onchange = handleUnitStationTypeChange;", "        document.querySelector('#mc-namer-station-type').onchange = handleUnitStationTypeChange;\n        document.querySelector('#mc-namer-dispatch-centre').onchange = populateStartDropdown;", 'Unit filter event')
source = replace_once(source, "        document.querySelector('#mc-station-type').onchange = populateStationNamingStartDropdown;", "        document.querySelector('#mc-station-type').onchange = populateStationNamingStartDropdown;\n        document.querySelector('#mc-station-dispatch-centre').onchange = populateStationNamingStartDropdown;", 'Station filter event')

source = replace_once(source, '    function refreshStationNamingStations() {', '    async function refreshStationNamingStations() {', 'Station refresh async')
source = replace_once(source, '        const stationEntries = getStationOverviewEntries();\n\n        STATION_STATE.stations = stationEntries', '        const stationEntries = getStationOverviewEntries();\n        await loadNamingDispatchCentreData();\n\n        STATION_STATE.stations = stationEntries', 'Station refresh Dispatch Centre load')
source = replace_once(source, '                    buildingTypeId: entry.buildingTypeId,\n                    stationType: typeInfo.stationType,', '                    buildingTypeId: entry.buildingTypeId,\n                    dispatchCentreId: getNamingDispatchCentreId(entry.buildingId),\n                    stationType: typeInfo.stationType,', 'Station relationship mapping')
source = replace_once(source, "        populateStationNamingStartDropdown();\n        setStationUiValue('status', 'Ready');", "        populateNamingDispatchCentreFilter(\n            'mc-station-dispatch-centre',\n            STATION_STATE.stations\n        );\n        populateStationNamingStartDropdown();\n        setStationUiValue('status', 'Ready');", 'Station filter population')
source = replace_once(
    source,
    "        const selectedType = document.querySelector('#mc-station-type')?.value || 'ALL';\n\n        STATION_STATE.filteredStations = STATION_STATE.stations.filter(station => {\n            return selectedType === 'ALL' || station.stationType === selectedType;\n        });",
    "        const selectedType = document.querySelector('#mc-station-type')?.value || 'ALL';\n        const selectedDispatchCentre =\n            document.querySelector('#mc-station-dispatch-centre')?.value ||\n            NAMING_DISPATCH_CENTRE_ALL;\n\n        STATION_STATE.filteredStations = STATION_STATE.stations.filter(station => {\n            const stationTypeMatches =\n                selectedType === 'ALL' || station.stationType === selectedType;\n            return stationTypeMatches && stationMatchesNamingDispatchCentre(\n                station,\n                selectedDispatchCentre\n            );\n        });",
    'Station combined filters',
)

source = replace_once(source, '    function refreshStations() {', '    async function refreshStations() {', 'Unit refresh async')
source = replace_once(source, '        const stationEntries = getStationOverviewEntries();\n\n        STATE.stations = stationEntries.map((entry, index) => ({', '        const stationEntries = getStationOverviewEntries();\n        await loadNamingDispatchCentreData();\n\n        STATE.stations = stationEntries.map((entry, index) => ({', 'Unit refresh Dispatch Centre load')
source = replace_once(source, '            href: entry.href,\n            displayName: entry.displayName,\n            callsignBase: createCallsignBase(entry.displayName),', '            href: entry.href,\n            buildingId: entry.buildingId,\n            displayName: entry.displayName,\n            dispatchCentreId: getNamingDispatchCentreId(entry.buildingId),\n            callsignBase: createCallsignBase(entry.displayName),', 'Unit relationship mapping')
source = replace_once(source, "        populateStartDropdown();\n\n        setStatus('Ready');", "        populateNamingDispatchCentreFilter(\n            'mc-namer-dispatch-centre',\n            STATE.stations\n        );\n        populateStartDropdown();\n\n        setStatus('Ready');", 'Unit filter population')
source = replace_once(
    source,
    "        const selectedType = document.querySelector('#mc-namer-station-type')?.value || 'ALL';\n\n        STATE.filteredStations = STATE.stations.filter(station => {\n            return selectedType === 'ALL' || station.stationType === selectedType;\n        });",
    "        const selectedType = document.querySelector('#mc-namer-station-type')?.value || 'ALL';\n        const selectedDispatchCentre =\n            document.querySelector('#mc-namer-dispatch-centre')?.value ||\n            NAMING_DISPATCH_CENTRE_ALL;\n\n        STATE.filteredStations = STATE.stations.filter(station => {\n            const stationTypeMatches =\n                selectedType === 'ALL' || station.stationType === selectedType;\n            return stationTypeMatches && stationMatchesNamingDispatchCentre(\n                station,\n                selectedDispatchCentre\n            );\n        });",
    'Unit combined filters',
)

SOURCE.write_text(source, encoding='utf-8')

for path in sorted(Path('scripts').glob('check-*.mjs')):
    text = path.read_text(encoding='utf-8')
    text = text.replace('// @version      1.0.84', '// @version      1.0.85')
    text = text.replace("const UNIT_VERSION = '3.3.9';", "const UNIT_VERSION = '3.3.10';")
    text = text.replace("const STATION_VERSION = '1.3.3';", "const STATION_VERSION = '1.3.4';")
    path.write_text(text, encoding='utf-8')

regression = r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
function requireText(text, label = text) {
  if (!source.includes(text)) fail(`Missing naming Dispatch Centre contract: ${label}`);
}

for (const [text, label] of [
  ['// @version      1.0.85', 'Command Nexus 1.0.85 metadata'],
  ["const UNIT_VERSION = '3.3.10';", 'Unit Naming 3.3.10'],
  ["const STATION_VERSION = '1.3.4';", 'Station Naming 1.3.4'],
  ['id="mc-namer-dispatch-centre" disabled', 'Unit Naming Dispatch Centre select'],
  ['id="mc-station-dispatch-centre" disabled', 'Station Naming Dispatch Centre select'],
  ["const NAMING_DISPATCH_CENTRE_ALL = 'ALL';", 'All Dispatch Centres default'],
  ["const NAMING_DISPATCH_CENTRE_UNASSIGNED = '__UNASSIGNED__';", 'unassigned Dispatch Centre option'],
  ["stationFetchWithTimeout('/building/buildings_json'", 'authoritative MissionChief building dataset'],
  ['building?.leitstelle_building_id', 'authoritative Dispatch Centre relationship'],
  ['function stationMatchesNamingDispatchCentre(', 'shared Dispatch Centre predicate'],
  ['function populateNamingDispatchCentreFilter(', 'shared Dispatch Centre selector population'],
  ["document.querySelector('#mc-namer-dispatch-centre').onchange = populateStartDropdown;", 'Unit Naming filter change handler'],
  ["document.querySelector('#mc-station-dispatch-centre').onchange = populateStationNamingStartDropdown;", 'Station Naming filter change handler'],
  ["document.querySelector('#mc-namer-dispatch-centre')?.value", 'Unit Naming selected Dispatch Centre'],
  ["document.querySelector('#mc-station-dispatch-centre')?.value", 'Station Naming selected Dispatch Centre'],
  ["'All dispatch centres'", 'All Dispatch Centres option label'],
  ["'Unassigned / default'", 'unassigned option label'],
]) requireText(text, label);

if ((source.match(/dispatchCentreId: getNamingDispatchCentreId\(entry\.buildingId\)/g) || []).length < 2) {
  fail('Both Unit Naming and Station Naming must map the Dispatch Centre relationship.');
}
if ((source.match(/await loadNamingDispatchCentreData\(\);/g) || []).length < 2) {
  fail('Both naming tools must load Dispatch Centre data on Refresh Stations.');
}
if (source.includes('mc-personnel-dispatch-centre')) {
  fail('Dispatch Centre filtering must not affect Personnel Assignment.');
}
if (!workflow.includes('scripts/check-naming-dispatch-centre-filter-v1085.mjs')) {
  fail('Naming Dispatch Centre regression is not registered in Validate userscript.');
}
console.log('Unit Naming and Station Naming Dispatch Centre filter contracts passed.');
'''
Path('scripts/check-naming-dispatch-centre-filter-v1085.mjs').write_text(regression, encoding='utf-8')

workflow_path = Path('.github/workflows/validate-userscript.yml')
workflow = workflow_path.read_text(encoding='utf-8')
marker = "      - 'scripts/check-personnel-assignment-ios-completeness-v1084.mjs'\n"
if workflow.count(marker) != 2:
    raise SystemExit(f'Validate workflow path marker count was {workflow.count(marker)}, expected 2')
workflow = workflow.replace(marker, marker + "      - 'scripts/check-naming-dispatch-centre-filter-v1085.mjs'\n")
step_marker = "      - name: Validate complete iOS Safari Personnel Assignment controls\n        run: node scripts/check-personnel-assignment-ios-completeness-v1084.mjs\n"
if workflow.count(step_marker) != 1:
    raise SystemExit('Unable to locate v1.0.84 validation step')
workflow = workflow.replace(step_marker, step_marker + "\n      - name: Validate Unit and Station Naming Dispatch Centre filters\n        run: node scripts/check-naming-dispatch-centre-filter-v1085.mjs\n", 1)
workflow = workflow.replace('complete iOS Personnel Assignment controls,', 'complete iOS Personnel Assignment controls, Unit/Station Naming Dispatch Centre filters,', 1)
workflow_path.write_text(workflow, encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
heading = '## [1.0.84] - 2026-08-05\n'
if heading not in changelog:
    raise SystemExit('Unable to locate v1.0.84 changelog heading')
section = '''## [1.0.85] - 2026-08-08

### Added

- Unit Naming and Station Naming now include a **Dispatch Centre** filter alongside the existing station-type filter.
- Dispatch Centre options come from MissionChief's authoritative `/building/buildings_json` building data and each station's `leitstelle_building_id` relationship rather than station-name guessing.
- **All dispatch centres** remains the default. When MissionChief reports stations with no Dispatch Centre assignment, **Unassigned / default** is available as an explicit filter.

### Safety and scope

- The filter only changes which stations enter the Unit Naming or Station Naming queue; established naming and save logic are unchanged.
- Personnel Assignment is not filtered by this control.
- If Dispatch Centre data cannot be loaded, the selector stays disabled and naming falls back to the existing all-stations behaviour.

### Changed resource baselines

- Unit Naming increased from `3.3.9` to `3.3.10`.
- Station Naming increased from `1.3.3` to `1.3.4`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.
- Command Nexus increased from `1.0.84` to `1.0.85`.

'''
changelog_path.write_text(changelog.replace(heading, section + heading, 1), encoding='utf-8')

readme_path = Path('README.md')
readme = readme_path.read_text(encoding='utf-8')
readme = readme.replace('**Current version:** `1.0.84` · **Mission Finder engine:** `V10.6.144`', '**Current version:** `1.0.85` · **Mission Finder engine:** `V10.6.144`', 1)
bullet = '- Station and vehicle naming\n'
if bullet not in readme:
    raise SystemExit('README naming bullet not found')
readme = readme.replace(bullet, bullet + '- Dispatch Centre scoping for Unit Naming and Station Naming\n', 1)
readme_path.write_text(readme, encoding='utf-8')

src_readme_path = Path('src/README.md')
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = src_readme.replace('| Command Nexus version | `1.0.84` |', '| Command Nexus version | `1.0.85` |', 1)
src_readme = src_readme.replace('| Mission Finder baseline | `V10.6.143` |', '| Mission Finder baseline | `V10.6.144` |', 1)
src_readme_path.write_text(src_readme, encoding='utf-8')
