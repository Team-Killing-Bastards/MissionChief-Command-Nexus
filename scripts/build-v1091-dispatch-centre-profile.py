#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path('.')
SOURCE = ROOT / 'src/missionchief-command-nexus.user.js'


def require(text, needle, label):
    if needle not in text:
        raise SystemExit(f'Missing {label}: {needle!r}')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'Expected exactly one {label}, found {count}')
    return text.replace(old, new, 1)


source = SOURCE.read_text()
require(source, '// @version      1.0.90', '1.0.90 metadata')
require(source, "const UNIT_VERSION = '3.3.15';", 'Unit Naming 3.3.15')
require(source, "const STATION_VERSION = '1.3.9';", 'Station Naming 1.3.9')

source = replace_once(source, '// @version      1.0.90', '// @version      1.0.91', 'metadata version')
source = replace_once(source, "const UNIT_VERSION = '3.3.15';", "const UNIT_VERSION = '3.3.16';", 'Unit Naming version')
source = replace_once(source, "const STATION_VERSION = '1.3.9';", "const STATION_VERSION = '1.3.10';", 'Station Naming version')

# Add the explicit broad Service layer before operational state. Building type IDs are
# MissionChief's existing authority; stationType is only a fallback for unsupported IDs.
state_marker = '    const STATE = {\n'
require(source, state_marker, 'STATE marker')
service_block = '''    const NAMING_SERVICES = Object.freeze({
        ALL: 'All services',
        FIRE: 'Fire & Rescue',
        AMBULANCE: 'Ambulance',
        POLICE: 'Police',
        SAR: 'Search & Rescue / Coastguard',
        RECOVERY: 'Recovery',
        OTHER: 'Other'
    });

    const NAMING_SERVICE_BY_BUILDING_TYPE_ID = Object.freeze({
        0: 'FIRE',
        18: 'FIRE',
        2: 'AMBULANCE',
        20: 'AMBULANCE',
        5: 'AMBULANCE',
        6: 'POLICE',
        19: 'POLICE',
        13: 'POLICE',
        35: 'POLICE',
        27: 'SAR',
        28: 'SAR',
        30: 'SAR',
        33: 'SAR',
        34: 'RECOVERY'
    });

'''
source = source.replace(state_marker, service_block + state_marker, 1)

# Replace the complete seed/edit-page centre-name architecture with direct own-profile
# discovery. Keep getNamingDispatchCentreIdFromHref immediately above this boundary.
old_start = source.index('    function extractNamingDispatchCentresFromBuildingEditHtml(html) {')
old_end = source.index('    function populateNamingDispatchCentreFilter(selectId) {', old_start)
if old_start < 0 or old_end < 0:
    raise SystemExit('Unable to locate old Dispatch Centre list-loader block')

profile_loader_block = '''    function getNamingOwnProfilePathFromHref(href) {
        if (!href) return '';
        try {
            const url = new URL(String(href), location.origin);
            if (url.origin !== location.origin) return '';
            const match = url.pathname.match(/^\\/profile\\/(\\d+)\\/?$/);
            return match ? `/profile/${match[1]}` : '';
        } catch (_) {
            return '';
        }
    }

    function resolveNamingOwnProfilePath() {
        const documents = [document];
        try {
            const topDocument = window.top?.document;
            if (topDocument && topDocument !== document) documents.push(topDocument);
        } catch (_) {}

        for (const candidateDocument of documents) {
            const profileLink = candidateDocument.querySelector?.('#navbar_profile_link[href]');
            const path = getNamingOwnProfilePathFromHref(
                profileLink?.getAttribute?.('href') || ''
            );
            if (path) return path;
        }

        const views = [window];
        try {
            if (window.top && window.top !== window) views.push(window.top);
        } catch (_) {}

        for (const view of views) {
            try {
                const userId = Number(view?.user_id);
                if (Number.isInteger(userId) && userId > 0) return `/profile/${userId}`;
            } catch (_) {}
        }

        throw new Error('Unable to resolve the signed-in MissionChief profile');
    }

    function extractNamingDispatchCentresFromProfileHtml(html) {
        const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
        const centres = new Map();

        parsed.querySelectorAll('.profile-dispatchcenter').forEach(panel => {
            for (const anchor of panel.querySelectorAll('a[href]')) {
                const id = getNamingDispatchCentreIdFromHref(
                    anchor.getAttribute('href'),
                    false
                );
                const label = cleanText(anchor.textContent || '');
                if (!id || !label) continue;
                centres.set(String(id), label);
                break;
            }
        });

        return centres;
    }

    async function loadNamingDispatchCentreList(force = false) {
        if (force) {
            NAMING_DISPATCH_CENTRE_STATE.listLoaded = false;
            NAMING_DISPATCH_CENTRE_STATE.listPromise = null;
            NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
            NAMING_DISPATCH_CENTRE_STATE.lastListError = '';
        }
        if (NAMING_DISPATCH_CENTRE_STATE.listLoaded) return true;
        if (NAMING_DISPATCH_CENTRE_STATE.listPromise) return NAMING_DISPATCH_CENTRE_STATE.listPromise;

        NAMING_DISPATCH_CENTRE_STATE.listPromise = (async () => {
            try {
                const profilePath = resolveNamingOwnProfilePath();
                const response = await stationFetchWithTimeout(
                    profilePath,
                    { credentials: 'same-origin', cache: 'no-store' },
                    15000
                );
                if (!response.ok) {
                    throw new Error(`Profile returned HTTP ${response.status} while loading Dispatch Centres`);
                }

                const centres = extractNamingDispatchCentresFromProfileHtml(
                    await response.text()
                );
                if (!centres.size) {
                    throw new Error('Profile did not expose any Dispatch Centre panels');
                }

                NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
                centres.forEach((label, id) =>
                    NAMING_DISPATCH_CENTRE_STATE.labelsById.set(String(id), label)
                );
                NAMING_DISPATCH_CENTRE_STATE.listLoaded = true;
                NAMING_DISPATCH_CENTRE_STATE.lastListError = '';
                return true;
            } catch (error) {
                NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
                NAMING_DISPATCH_CENTRE_STATE.listLoaded = false;
                NAMING_DISPATCH_CENTRE_STATE.lastListError = cleanText(
                    error?.message || String(error)
                );
                console.warn('[Command Nexus] Dispatch Centre profile list unavailable:', error);
                return false;
            }
        })();

        const loaded = await NAMING_DISPATCH_CENTRE_STATE.listPromise;
        if (!loaded) NAMING_DISPATCH_CENTRE_STATE.listPromise = null;
        return loaded;
    }

    function getNamingServiceForStation(station) {
        const buildingTypeId = String(station?.buildingTypeId ?? '');
        const direct = NAMING_SERVICE_BY_BUILDING_TYPE_ID[buildingTypeId];
        if (direct) return direct;

        switch (String(station?.stationType || '')) {
            case 'FIRE':
            case 'AIRFIELD':
                return 'FIRE';
            case 'AMBULANCE':
                return 'AMBULANCE';
            case 'POLICE':
            case 'EOD':
                return 'POLICE';
            case 'RNLI':
            case 'COASTGUARD':
            case 'SAR':
                return 'SAR';
            case 'RECOVERY':
                return 'RECOVERY';
            default:
                return 'OTHER';
        }
    }

    function stationMatchesNamingService(station, selectedService) {
        const selected = String(selectedService || 'ALL');
        return selected === 'ALL' || getNamingServiceForStation(station) === selected;
    }

'''
source = source[:old_start] + profile_loader_block + source[old_end:]

# Centre list availability is independent from station-membership loading. This is the key
# hierarchy correction: centres show first even before a station list has been refreshed.
source = replace_once(
    source,
    '''        const available =
            NAMING_DISPATCH_CENTRE_STATE.listLoaded &&
            NAMING_DISPATCH_CENTRE_STATE.loaded &&
            centres.length > 0;
''',
    '''        const available =
            NAMING_DISPATCH_CENTRE_STATE.listLoaded &&
            centres.length > 0;
''',
    'Dispatch Centre dropdown availability gate'
)
source = source.replace(
    "select.title = 'Choose a MissionChief Dispatch Centre first, then Station Type and Start From.';",
    "select.title = 'Choose a MissionChief Dispatch Centre first, then Service, Station Type and Start From.';"
)

# Replace the old centre -> type helper with centre -> service -> type helpers.
helper_start = source.index('    function getStationsForNamingDispatchCentre(stations, dispatchSelectId) {')
helper_end = source.index('    const NAMING_DISPATCH_CENTRE_REFRESH_LISTENER_KEY', helper_start)
if helper_start < 0 or helper_end < 0:
    raise SystemExit('Unable to locate naming cascade helper block')
new_helpers = '''    function getStationsForNamingDispatchCentre(stations, dispatchSelectId) {
        const centre = document.getElementById(dispatchSelectId)?.value || NAMING_DISPATCH_CENTRE_ALL;
        return (stations || []).filter(station => stationMatchesNamingDispatchCentre(station, centre));
    }

    function getStationsForNamingService(stations, dispatchSelectId, serviceSelectId) {
        const service = document.getElementById(serviceSelectId)?.value || 'ALL';
        return getStationsForNamingDispatchCentre(stations, dispatchSelectId)
            .filter(station => stationMatchesNamingService(station, service));
    }

    function populateNamingServiceFilter(selectId, dispatchSelectId, stations) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const previous = select.value || 'ALL';
        const scoped = getStationsForNamingDispatchCentre(stations, dispatchSelectId);
        const services = new Set(scoped.map(getNamingServiceForStation).filter(Boolean));

        select.replaceChildren();
        const add = (value, label) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        };

        if (!(stations || []).length) {
            add('ALL', 'Refresh stations first');
            select.value = 'ALL';
            select.disabled = true;
            return;
        }
        if (!scoped.length) {
            add('ALL', 'No services in selected Dispatch Centre');
            select.value = 'ALL';
            select.disabled = true;
            return;
        }

        add('ALL', 'All services');
        Object.entries(NAMING_SERVICES).forEach(([key, label]) => {
            if (key === 'ALL' || !services.has(key)) return;
            add(key, label);
        });
        const values = new Set([...select.options].map(option => option.value));
        select.value = values.has(previous) ? previous : 'ALL';
        select.disabled = false;
    }

    function populateNamingStationTypeFilter(selectId, dispatchSelectId, serviceSelectId, stations) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const previous = select.value || 'ALL';
        const scoped = getStationsForNamingService(stations, dispatchSelectId, serviceSelectId);
        const types = new Set(scoped.map(station => station?.stationType).filter(Boolean));
        select.replaceChildren();
        const all = document.createElement('option');
        all.value = 'ALL';
        all.textContent = 'All station types';
        select.appendChild(all);
        Object.entries(STATION_TYPES).forEach(([key, label]) => {
            if (key === 'ALL') return;
            if ((stations || []).length && !types.has(key)) return;
            const option = document.createElement('option');
            option.value = key;
            option.textContent = label;
            select.appendChild(option);
        });
        const values = new Set([...select.options].map(option => option.value));
        select.value = values.has(previous) ? previous : 'ALL';
        select.disabled = !(stations || []).length || !scoped.length;
    }

'''
source = source[:helper_start] + new_helpers + source[helper_end:]

# Refresh cascade: profile centres first, station membership second, then service/type/start.
source = source.replace(
    '''            populateNamingStationTypeFilter(
                'mc-namer-station-type',
                'mc-namer-dispatch-centre',
                STATE.stations
            );
            populateNamingStationTypeFilter(
                'mc-station-type',
                'mc-station-dispatch-centre',
                STATION_STATE.stations
            );
''',
    '''            populateNamingServiceFilter(
                'mc-namer-service',
                'mc-namer-dispatch-centre',
                STATE.stations
            );
            populateNamingStationTypeFilter(
                'mc-namer-station-type',
                'mc-namer-dispatch-centre',
                'mc-namer-service',
                STATE.stations
            );
            populateNamingServiceFilter(
                'mc-station-service',
                'mc-station-dispatch-centre',
                STATION_STATE.stations
            );
            populateNamingStationTypeFilter(
                'mc-station-type',
                'mc-station-dispatch-centre',
                'mc-station-service',
                STATION_STATE.stations
            );
'''
)
source = replace_once(
    source,
    '            ready = Boolean(listLoaded && assignmentsLoaded && centreCount > 0);',
    '            ready = Boolean(listLoaded && centreCount > 0);',
    'Dispatch Centre refresh readiness'
)

# Replace change handlers with the full four-stage cascade.
handlers_start = source.index('    function handleUnitDispatchCentreChange() {')
handlers_end = source.index('    function findStationOverviewEntry(href) {', handlers_start)
if handlers_start < 0 or handlers_end < 0:
    raise SystemExit('Unable to locate Dispatch Centre change handlers')
new_handlers = '''    function handleUnitDispatchCentreChange() {
        populateNamingServiceFilter('mc-namer-service', 'mc-namer-dispatch-centre', STATE.stations);
        populateNamingStationTypeFilter(
            'mc-namer-station-type',
            'mc-namer-dispatch-centre',
            'mc-namer-service',
            STATE.stations
        );
        handleUnitStationTypeChange();
    }

    function handleUnitNamingServiceChange() {
        populateNamingStationTypeFilter(
            'mc-namer-station-type',
            'mc-namer-dispatch-centre',
            'mc-namer-service',
            STATE.stations
        );
        handleUnitStationTypeChange();
    }

    function handleStationDispatchCentreChange() {
        populateNamingServiceFilter('mc-station-service', 'mc-station-dispatch-centre', STATION_STATE.stations);
        populateNamingStationTypeFilter(
            'mc-station-type',
            'mc-station-dispatch-centre',
            'mc-station-service',
            STATION_STATE.stations
        );
        populateStationNamingStartDropdown();
    }

    function handleStationNamingServiceChange() {
        populateNamingStationTypeFilter(
            'mc-station-type',
            'mc-station-dispatch-centre',
            'mc-station-service',
            STATION_STATE.stations
        );
        populateStationNamingStartDropdown();
    }

'''
source = source[:handlers_start] + new_handlers + source[handlers_end:]

# Add Service selectors to both naming panels.
unit_ui_old = '''                    <button id="mc-namer-refresh-dispatch-centres" type="button" style="margin-top:4px; cursor:pointer; pointer-events:auto; touch-action:manipulation;">Refresh Dispatch Centres</button>

                    <label style="margin-top:6px; display:block;"><b>Station Type:</b></label>
'''
unit_ui_new = '''                    <button id="mc-namer-refresh-dispatch-centres" type="button" style="margin-top:4px; cursor:pointer; pointer-events:auto; touch-action:manipulation;">Refresh Dispatch Centres</button>

                    <label style="margin-top:6px; display:block;"><b>Service:</b></label>
                    <select id="mc-namer-service" disabled>
                        <option value="ALL">Refresh stations first</option>
                    </select>

                    <label style="margin-top:6px; display:block;"><b>Station Type:</b></label>
'''
source = replace_once(source, unit_ui_old, unit_ui_new, 'Unit Naming Service UI')
station_ui_old = '''                    <button id="mc-station-refresh-dispatch-centres" type="button" style="margin-top:4px; cursor:pointer; pointer-events:auto; touch-action:manipulation;">Refresh Dispatch Centres</button>

                    <label style="margin-top:6px; display:block;"><b>Station Type:</b></label>
'''
station_ui_new = '''                    <button id="mc-station-refresh-dispatch-centres" type="button" style="margin-top:4px; cursor:pointer; pointer-events:auto; touch-action:manipulation;">Refresh Dispatch Centres</button>

                    <label style="margin-top:6px; display:block;"><b>Service:</b></label>
                    <select id="mc-station-service" disabled>
                        <option value="ALL">Refresh stations first</option>
                    </select>

                    <label style="margin-top:6px; display:block;"><b>Station Type:</b></label>
'''
source = replace_once(source, station_ui_old, station_ui_new, 'Station Naming Service UI')

# Bind Service changes between Dispatch Centre and Station Type.
source = replace_once(
    source,
    "        document.querySelector('#mc-namer-dispatch-centre').onchange = handleUnitDispatchCentreChange;\n        installNamingDispatchCentreRefreshListener();\n        document.querySelector('#mc-namer-station-type').onchange = handleUnitStationTypeChange;",
    "        document.querySelector('#mc-namer-dispatch-centre').onchange = handleUnitDispatchCentreChange;\n        installNamingDispatchCentreRefreshListener();\n        document.querySelector('#mc-namer-service').onchange = handleUnitNamingServiceChange;\n        document.querySelector('#mc-namer-station-type').onchange = handleUnitStationTypeChange;",
    'Unit Naming Service binding'
)
source = replace_once(
    source,
    "        document.querySelector('#mc-station-dispatch-centre').onchange = handleStationDispatchCentreChange;\n        document.querySelector('#mc-station-type').onchange = populateStationNamingStartDropdown;",
    "        document.querySelector('#mc-station-dispatch-centre').onchange = handleStationDispatchCentreChange;\n        document.querySelector('#mc-station-service').onchange = handleStationNamingServiceChange;\n        document.querySelector('#mc-station-type').onchange = populateStationNamingStartDropdown;",
    'Station Naming Service binding'
)

# Station Naming station objects get service from exact building type + current stationType.
source = replace_once(
    source,
    '''                    stationType: typeInfo.stationType,
                    suffix: typeInfo.suffix,
                    typeLabel: typeInfo.label
''',
    '''                    stationType: typeInfo.stationType,
                    service: getNamingServiceForStation({
                        buildingTypeId: entry.buildingTypeId,
                        stationType: typeInfo.stationType
                    }),
                    suffix: typeInfo.suffix,
                    typeLabel: typeInfo.label
''',
    'Station Naming service record'
)
source = replace_once(
    source,
    "        populateNamingDispatchCentreFilter('mc-station-dispatch-centre');\n        populateNamingStationTypeFilter('mc-station-type', 'mc-station-dispatch-centre', STATION_STATE.stations);\n        populateStationNamingStartDropdown();",
    "        populateNamingDispatchCentreFilter('mc-station-dispatch-centre');\n        populateNamingServiceFilter('mc-station-service', 'mc-station-dispatch-centre', STATION_STATE.stations);\n        populateNamingStationTypeFilter('mc-station-type', 'mc-station-dispatch-centre', 'mc-station-service', STATION_STATE.stations);\n        populateStationNamingStartDropdown();",
    'Station Naming refresh cascade'
)

# Unit Naming station objects also retain exact building type and service.
unit_map_old = '''        STATE.stations = stationEntries.map((entry, index) => ({
            index,
            href: entry.href,
            buildingId: entry.buildingId,
            displayName: entry.displayName,
            dispatchCentreId: getNamingDispatchCentreId(entry.buildingId),
            callsignBase: createCallsignBase(entry.displayName),
            stationType:
                STATION_BUILDING_TYPE_INFO[entry.buildingTypeId]?.stationType ||
                detectStationType(entry.displayName)
        }));
'''
unit_map_new = '''        STATE.stations = stationEntries.map((entry, index) => {
            const stationType =
                STATION_BUILDING_TYPE_INFO[entry.buildingTypeId]?.stationType ||
                detectStationType(entry.displayName);
            return {
                index,
                href: entry.href,
                buildingId: entry.buildingId,
                displayName: entry.displayName,
                buildingTypeId: entry.buildingTypeId,
                dispatchCentreId: getNamingDispatchCentreId(entry.buildingId),
                callsignBase: createCallsignBase(entry.displayName),
                stationType,
                service: getNamingServiceForStation({
                    buildingTypeId: entry.buildingTypeId,
                    stationType
                })
            };
        });
'''
source = replace_once(source, unit_map_old, unit_map_new, 'Unit Naming station map')
source = replace_once(
    source,
    "        populateNamingDispatchCentreFilter('mc-namer-dispatch-centre');\n        populateNamingStationTypeFilter('mc-namer-station-type', 'mc-namer-dispatch-centre', STATE.stations);\n        populateStartDropdown();",
    "        populateNamingDispatchCentreFilter('mc-namer-dispatch-centre');\n        populateNamingServiceFilter('mc-namer-service', 'mc-namer-dispatch-centre', STATE.stations);\n        populateNamingStationTypeFilter('mc-namer-station-type', 'mc-namer-dispatch-centre', 'mc-namer-service', STATE.stations);\n        populateStartDropdown();",
    'Unit Naming refresh cascade'
)

# Start From filtering now includes Service between centre and station type.
source = replace_once(
    source,
    '''        const selectedType = document.querySelector('#mc-station-type')?.value || 'ALL';
        const selectedDispatchCentre =
            document.querySelector('#mc-station-dispatch-centre')?.value ||
            NAMING_DISPATCH_CENTRE_ALL;

        STATION_STATE.filteredStations = STATION_STATE.stations.filter(station => {
            const stationTypeMatches =
                selectedType === 'ALL' || station.stationType === selectedType;
            return stationTypeMatches && stationMatchesNamingDispatchCentre(
                station,
                selectedDispatchCentre
            );
        });
''',
    '''        const selectedService = document.querySelector('#mc-station-service')?.value || 'ALL';
        const selectedType = document.querySelector('#mc-station-type')?.value || 'ALL';
        const selectedDispatchCentre =
            document.querySelector('#mc-station-dispatch-centre')?.value ||
            NAMING_DISPATCH_CENTRE_ALL;

        STATION_STATE.filteredStations = STATION_STATE.stations.filter(station => {
            const stationTypeMatches =
                selectedType === 'ALL' || station.stationType === selectedType;
            return stationTypeMatches &&
                stationMatchesNamingService(station, selectedService) &&
                stationMatchesNamingDispatchCentre(station, selectedDispatchCentre);
        });
''',
    'Station Naming Start From service filter'
)
source = replace_once(
    source,
    '''        const selectedType = document.querySelector('#mc-namer-station-type')?.value || 'ALL';
        const selectedDispatchCentre =
            document.querySelector('#mc-namer-dispatch-centre')?.value ||
            NAMING_DISPATCH_CENTRE_ALL;

        STATE.filteredStations = STATE.stations.filter(station => {
            const stationTypeMatches =
                selectedType === 'ALL' || station.stationType === selectedType;
            return stationTypeMatches && stationMatchesNamingDispatchCentre(
                station,
                selectedDispatchCentre
            );
        });
''',
    '''        const selectedService = document.querySelector('#mc-namer-service')?.value || 'ALL';
        const selectedType = document.querySelector('#mc-namer-station-type')?.value || 'ALL';
        const selectedDispatchCentre =
            document.querySelector('#mc-namer-dispatch-centre')?.value ||
            NAMING_DISPATCH_CENTRE_ALL;

        STATE.filteredStations = STATE.stations.filter(station => {
            const stationTypeMatches =
                selectedType === 'ALL' || station.stationType === selectedType;
            return stationTypeMatches &&
                stationMatchesNamingService(station, selectedService) &&
                stationMatchesNamingDispatchCentre(station, selectedDispatchCentre);
        });
''',
    'Unit Naming Start From service filter'
)

SOURCE.write_text(source)

# Advance current-version assertions across the permanent suite first.
for path in sorted((ROOT / 'scripts').glob('check-*.mjs')):
    text = path.read_text()
    text = text.replace('// @version      1.0.90', '// @version      1.0.91')
    text = text.replace("const UNIT_VERSION = '3.3.15';", "const UNIT_VERSION = '3.3.16';")
    text = text.replace("const STATION_VERSION = '1.3.9';", "const STATION_VERSION = '1.3.10';")
    path.write_text(text)

# Rewrite the three historical Dispatch Centre regressions so they preserve their real
# contracts without protecting the superseded seed/edit-page architecture.
common_extract = r'''function extractFunction(name) {
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
'''

v1088 = f'''#!/usr/bin/env node
import {{ readFile }} from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
const fail = message => {{ console.error(`ERROR: ${{message}}`); process.exit(1); }};
const expect = (condition, message) => {{ if (!condition) fail(message); }};

{common_extract}

expect(source.includes('// @version      1.0.91'), 'Expected current Command Nexus version');
expect(source.includes("const UNIT_VERSION = '3.3.16';"), 'Expected current Unit Naming version');
expect(source.includes("const STATION_VERSION = '1.3.10';"), 'Expected current Station Naming version');

const assignmentStart = source.indexOf('function getNamingStationRowBuildingId(');
const assignmentLoader = source.slice(
  assignmentStart,
  source.indexOf('function getNamingDispatchCentreId(buildingId)', assignmentStart)
);
expect(assignmentLoader.includes("'leitstelle_building_id'"), 'Station assignments must use leitstelle_building_id from station rows');
expect(assignmentLoader.includes('/^building_list_'), 'Station row building IDs must be resolved locally');
expect(!assignmentLoader.includes('stationFetchWithTimeout'), 'Station membership must not crawl building pages');

const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(listLoader.includes('resolveNamingOwnProfilePath()'), 'Centre list must resolve the signed-in profile');
expect(listLoader.includes('extractNamingDispatchCentresFromProfileHtml'), 'Centre list must use the profile Dispatch Centre parser');
expect(!listLoader.includes('/building/buildings_json'), 'Centre list must not depend on buildings_json');
expect(!listLoader.includes('/leitstellenansicht'), 'Centre list must not use Stations view as name authority');
expect(!listLoader.includes('/edit'), 'Centre list must not depend on a building edit page');
expect(!source.includes('mc-personnel-dispatch-centre'), 'Personnel Assignment must remain outside Dispatch Centre filtering');
expect(workflow.includes('scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs'), 'v1.0.88 authority regression must remain registered');

console.log('PASS: v1.0.88 station-membership authority is preserved while v1.0.91 moves centre names to the signed-in profile.');
'''
(ROOT / 'scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs').write_text(v1088)

v1089 = f'''#!/usr/bin/env node
import {{ readFile }} from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
const fail = message => {{ console.error(`ERROR: ${{message}}`); process.exit(1); }};
const expect = (condition, message) => {{ if (!condition) fail(message); }};

{common_extract}

expect(source.includes('// @version      1.0.91'), 'Expected current Command Nexus version');
const listener = extractFunction('installNamingDispatchCentreRefreshListener');
expect(listener.includes("document.addEventListener('click'"), 'Retry must use a delegated document click listener');
expect(listener.includes('#mc-namer-refresh-dispatch-centres, #mc-station-refresh-dispatch-centres'), 'Delegated listener must own both Retry buttons');
expect(listener.includes('refreshNamingDispatchCentres(true)'), 'Delegated Retry listener must force refresh');
expect(!source.includes("querySelector('#mc-namer-refresh-dispatch-centres').onclick"), 'Fragile Unit direct Retry binding must stay removed');
expect(!source.includes("querySelector('#mc-station-refresh-dispatch-centres').onclick"), 'Fragile Station direct Retry binding must stay removed');

const refresh = extractFunction('refreshNamingDispatchCentres');
const paintAt = refresh.indexOf('await yieldNamingDispatchCentreRefreshPaint();');
const loadAt = refresh.indexOf('await Promise.all([');
expect(paintAt >= 0 && loadAt > paintAt, 'Refreshing state must paint before loading');
expect(refresh.includes("button.dataset.dispatchCentreRefreshState = 'loading'"), 'Retry must expose loading state');
expect(refresh.includes('button.disabled = false'), 'Retry must re-enable after every attempt');
expect(refresh.includes('Retry Dispatch Centres. ${{failureReason}}'), 'Retry title must expose the failure reason');
expect(source.includes('pointer-events:auto; touch-action:manipulation;'), 'Retry buttons need pointer/touch affordance');
expect(workflow.includes('scripts/check-naming-dispatch-centre-retry-v1089.mjs'), 'v1.0.89 Retry regression must remain registered');

console.log('PASS: v1.0.89 delegated Retry/loading/error interaction remains protected under the v1.0.91 profile hierarchy.');
'''
(ROOT / 'scripts/check-naming-dispatch-centre-retry-v1089.mjs').write_text(v1089)

v1090 = f'''#!/usr/bin/env node
import {{ readFile }} from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => {{ console.error(`ERROR: ${{message}}`); process.exit(1); }};
const expect = (condition, message) => {{ if (!condition) fail(message); }};

{common_extract}

class FixtureRow {{
  constructor(dc) {{ this.dataset = {{}}; this.attrs = {{ leitstelle_building_id: dc }}; }}
  getAttribute(name) {{ return this.attrs[name] ?? ''; }}
}}
expect(source.includes('// @version      1.0.91'), 'Expected current Command Nexus version');
const context = {{ String, Number, row: new FixtureRow('null'), result: null }};
vm.runInNewContext(`${{extractFunction('getNamingStationRowDispatchCentreId')}}\nresult = getNamingStationRowDispatchCentreId(row);`, context);
expect(context.result === '', `Literal null must remain unassigned, got ${{context.result}}`);
expect(!source.includes('function loadNamingDispatchCentreSeedBuildingIds('), 'Superseded station-seed loader must be removed in v1.0.91');
expect(!source.includes('function getNamingDispatchCentreSeedBuildingIds('), 'Superseded station-seed chooser must be removed in v1.0.91');
expect(!source.includes('extractNamingDispatchCentreSeedBuildingIdsFromHtml'), 'Superseded Stations seed parser must be removed in v1.0.91');
const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(!listLoader.includes('/leitstellenansicht'), 'Centre discovery must not fall back to Stations HTML');
expect(!listLoader.includes('/edit'), 'Centre discovery must not fall back to building edit pages');

console.log('PASS: v1.0.90 null-normalisation remains protected and its failed seed architecture is removed by v1.0.91.');
'''
(ROOT / 'scripts/check-naming-dispatch-centre-unassigned-seed-v1090.mjs').write_text(v1090)

# New v1.0.91 regression based on the supplied profile hierarchy and exact service IDs.
v1091 = r'''#!/usr/bin/env node
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
'''
(ROOT / 'scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs').write_text(v1091)

# Release documentation.
readme = (ROOT / 'README.md').read_text()
readme = replace_once(readme, '**Current version:** `1.0.90`', '**Current version:** `1.0.91`', 'README current version')
(ROOT / 'README.md').write_text(readme)

src_readme = (ROOT / 'src/README.md').read_text()
src_readme = replace_once(src_readme, '| Command Nexus version | `1.0.90` |', '| Command Nexus version | `1.0.91` |', 'src README current version')
src_readme = re.sub(
    r"Unit Naming and Station Naming use a Dispatch Centre-first cascade:.*?Station membership remains tied to MissionChief's `leitstelle_building_id` relationship, with literal `null` treated as unassigned\.",
    "Unit Naming and Station Naming use the live MissionChief hierarchy Dispatch Centre → Service → Station Type → Start From. Dispatch Centre ID/name pairs are parsed directly from the signed-in user's profile `.profile-dispatchcenter` panels resolved through the native navbar profile link. Station membership remains authoritative from each Stations row's `leitstelle_building_id`; Service is derived from MissionChief building type IDs, then Station Type and Start From are scoped progressively. The runtime no longer discovers arbitrary station seeds and no longer opens building edit pages to obtain the centre list.",
    src_readme,
    count=1,
    flags=re.S
)
(ROOT / 'src/README.md').write_text(src_readme)

changelog = (ROOT / 'CHANGELOG.md').read_text()
entry = '''## [1.0.91] - 2026-08-09

### Rebuilt

- Rebuilt Unit Naming and Station Naming around the live MissionChief hierarchy **Dispatch Centre → Service → Station Type → Start From**.
- Dispatch Centre ID/name pairs now come directly from the signed-in user's native profile `.profile-dispatchcenter` panels. The profile route is resolved from MissionChief's `#navbar_profile_link`, with the page `user_id` available only as a bounded fallback.
- The empty profile Dispatch Centre placeholder is ignored because it has no exact `/buildings/{id}` centre link.
- Dispatch Centre options become available as soon as the profile list loads; station-assignment loading no longer blocks the first dropdown.
- Station membership remains authoritative from row-level `leitstelle_building_id`, including literal `null` normalisation for unassigned buildings.
- Added a Service stage derived from MissionChief building type IDs so Air Ambulance stays Ambulance while Police Helicopter/EOD remain Police; RNLI, Coastguard and SAR are grouped under Search & Rescue / Coastguard.
- Station Type is rebuilt from the selected Dispatch Centre + Service subset, and Start From is rebuilt from Dispatch Centre + Service + Station Type.
- Removed the failed station-seed, `/leitstellenansicht` seed fallback and building-edit-page centre discovery runtime introduced during 1.0.88–1.0.90 troubleshooting.
- Preserved delegated Refresh/Retry ownership, visible Refreshing/error diagnostics and Personnel Assignment isolation.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs` using the supplied seven-centre profile fixture and exact service/building-type mappings.
- Reworked the v1.0.88–v1.0.90 Dispatch Centre regressions so they preserve station-membership, Retry and null-normalisation contracts without protecting the removed seed architecture.

### Changed resource baselines

- Command Nexus increased from `1.0.90` to `1.0.91`.
- Unit Naming increased from `3.3.15` to `3.3.16`.
- Station Naming increased from `1.3.9` to `1.3.10`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

'''
marker = '## [1.0.90] - 2026-08-09\n'
require(changelog, marker, '1.0.90 changelog marker')
changelog = changelog.replace(marker, entry + marker, 1)
(ROOT / 'CHANGELOG.md').write_text(changelog)

print('Built Command Nexus 1.0.91 profile hierarchy candidate.')
