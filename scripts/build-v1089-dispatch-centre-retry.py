#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / 'src/missionchief-command-nexus.user.js'
WORKFLOW_PATH = ROOT / '.github/workflows/validate-userscript.yml'


def fail(message):
    raise RuntimeError(message)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def function_range(source, name):
    match = re.search(rf'(?:async\s+)?function\s+{re.escape(name)}\s*\(', source)
    if not match:
        fail(f'Unable to locate function {name}')
    index = source.find('{', match.start())
    if index < 0:
        fail(f'Unable to locate body for {name}')
    depth = 0
    quote = ''
    escaped = False
    line_comment = False
    block_comment = False
    while index < len(source):
        char = source[index]
        nxt = source[index + 1] if index + 1 < len(source) else ''
        if line_comment:
            if char == '\n':
                line_comment = False
            index += 1
            continue
        if block_comment:
            if char == '*' and nxt == '/':
                block_comment = False
                index += 2
            else:
                index += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == quote:
                quote = ''
            index += 1
            continue
        if char == '/' and nxt == '/':
            line_comment = True
            index += 2
            continue
        if char == '/' and nxt == '*':
            block_comment = True
            index += 2
            continue
        if char in ('"', "'", '`'):
            quote = char
            index += 1
            continue
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return match.start(), index + 1
        index += 1
    fail(f'Unterminated function {name}')


def replace_function(source, name, replacement):
    start, end = function_range(source, name)
    return source[:start] + replacement.rstrip() + source[end:]


source = SOURCE_PATH.read_text(encoding='utf-8')
source = replace_once(source, '// @version      1.0.88', '// @version      1.0.89', 'Command Nexus version')
source = replace_once(source, "const UNIT_VERSION = '3.3.13';", "const UNIT_VERSION = '3.3.14';", 'Unit Naming version')
source = replace_once(source, "const STATION_VERSION = '1.3.7';", "const STATION_VERSION = '1.3.8';", 'Station Naming version')

state_marker = '    const NAMING_DISPATCH_CENTRE_STATE = {'
state_start = source.find(state_marker)
if state_start < 0:
    fail('Dispatch Centre state marker missing')
state_end = source.find('    };', state_start)
if state_end < 0:
    fail('Dispatch Centre state end missing')
state_end += len('    };')
state_block = source[state_start:state_end]
if 'lastListError' in state_block or 'lastAssignmentError' in state_block:
    fail('v1.0.89 Dispatch Centre error state already present')
state_block = replace_once(
    state_block,
    '        labelsById: new Map()\n',
    "        labelsById: new Map(),\n        lastListError: '',\n        lastAssignmentError: ''\n",
    'Dispatch Centre state error fields',
)
source = source[:state_start] + state_block + source[state_end:]

assignment_loader = r'''    async function loadNamingDispatchCentreData(force = false) {
        if (force) {
            NAMING_DISPATCH_CENTRE_STATE.loaded = false;
            NAMING_DISPATCH_CENTRE_STATE.loadPromise = null;
            NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
            NAMING_DISPATCH_CENTRE_STATE.lastAssignmentError = '';
        }
        if (NAMING_DISPATCH_CENTRE_STATE.loaded) return true;
        if (NAMING_DISPATCH_CENTRE_STATE.loadPromise) {
            return NAMING_DISPATCH_CENTRE_STATE.loadPromise;
        }

        NAMING_DISPATCH_CENTRE_STATE.loadPromise = Promise.resolve()
            .then(() => {
                const loaded = refreshNamingDispatchCentreAssignmentsFromStationRows();
                NAMING_DISPATCH_CENTRE_STATE.lastAssignmentError = '';
                return loaded;
            })
            .catch(error => {
                NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
                NAMING_DISPATCH_CENTRE_STATE.loaded = false;
                NAMING_DISPATCH_CENTRE_STATE.lastAssignmentError = cleanText(
                    error?.message || String(error)
                );
                console.warn('[Command Nexus] Dispatch Centre station assignments unavailable:', error);
                return false;
            });

        const loaded = await NAMING_DISPATCH_CENTRE_STATE.loadPromise;
        if (!loaded) NAMING_DISPATCH_CENTRE_STATE.loadPromise = null;
        return loaded;
    }'''
source = replace_function(source, 'loadNamingDispatchCentreData', assignment_loader)

seed_helpers = r'''    const NAMING_DISPATCH_CENTRE_SEED_TYPE_IDS = new Set([
        '0', '18',
        '2', '20',
        '6', '19',
        '5', '13',
        '27', '28', '30',
        '33', '34', '35'
    ]);

    function isNamingDispatchCentreSeedStationTypeId(typeId) {
        return NAMING_DISPATCH_CENTRE_SEED_TYPE_IDS.has(String(typeId ?? ''));
    }

    function getNamingDispatchCentreSeedBuildingIds(limit = 3) {
        const maxCandidates = Math.max(1, Math.min(3, Number(limit) || 3));
        const candidates = [];
        const seen = new Set();
        const addCandidate = buildingId => {
            const id = String(buildingId || '').trim();
            if (!id || seen.has(id) || candidates.length >= maxCandidates) return;
            seen.add(id);
            candidates.push(id);
        };

        const rows = [
            ...document.querySelectorAll('.building_list_li, .building_list')
        ];

        // Prefer an ordinary station that MissionChief explicitly says is assigned to a
        // Dispatch Centre. The real Stations view can contain unassigned Home Response
        // rows before normal stations, so the first building in the list is not a safe seed.
        rows.forEach(row => {
            if (candidates.length >= maxCandidates) return;
            const buildingId = getNamingStationRowBuildingId(row);
            const dispatchCentreId = getNamingStationRowDispatchCentreId(row);
            const typeId = String(row.getAttribute?.('building_type_id') || '');
            if (
                !buildingId ||
                !dispatchCentreId ||
                !isNamingDispatchCentreSeedStationTypeId(typeId)
            ) {
                return;
            }
            addCandidate(buildingId);
        });

        // State can already contain authoritative station/centre joins after Refresh
        // Stations. Use it only for assigned stations and never blindly take the first row.
        [
            ...(STATE.stations || []),
            ...(STATION_STATE.stations || [])
        ].forEach(station => {
            if (candidates.length >= maxCandidates) return;
            if (!station?.buildingId || !station?.dispatchCentreId) return;
            const typeId = String(station?.buildingTypeId ?? '');
            if (typeId && !isNamingDispatchCentreSeedStationTypeId(typeId)) return;
            addCandidate(station.buildingId);
        });

        // Bounded last-resort fallback: still require a real Dispatch Centre assignment.
        // This is deliberately capped and is not a per-building crawl.
        if (!candidates.length) {
            rows.forEach(row => {
                if (candidates.length >= maxCandidates) return;
                const buildingId = getNamingStationRowBuildingId(row);
                const dispatchCentreId = getNamingStationRowDispatchCentreId(row);
                if (buildingId && dispatchCentreId) addCandidate(buildingId);
            });
        }

        return candidates;
    }'''
source = replace_function(source, 'getNamingDispatchCentreSeedBuildingId', seed_helpers)

list_loader = r'''    async function loadNamingDispatchCentreList(force = false) {
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
                const seedBuildingIds = getNamingDispatchCentreSeedBuildingIds(3);
                if (!seedBuildingIds.length) {
                    throw new Error(
                        'No assigned ordinary station is available to read Dispatch Centre assignments'
                    );
                }

                let lastSeedError = null;

                for (const seedBuildingId of seedBuildingIds) {
                    try {
                        const response = await stationFetchWithTimeout(
                            `/buildings/${seedBuildingId}/edit`,
                            { credentials: 'same-origin', cache: 'no-store' },
                            15000
                        );
                        if (!response.ok) {
                            throw new Error(
                                `Building ${seedBuildingId} edit page returned HTTP ${response.status}`
                            );
                        }

                        const centres = extractNamingDispatchCentresFromBuildingEditHtml(
                            await response.text()
                        );
                        if (!centres.size) {
                            throw new Error(
                                `Building ${seedBuildingId} edit page did not expose Assigned Dispatch Center`
                            );
                        }

                        NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
                        centres.forEach((label, id) =>
                            NAMING_DISPATCH_CENTRE_STATE.labelsById.set(String(id), label)
                        );
                        NAMING_DISPATCH_CENTRE_STATE.listLoaded = true;
                        NAMING_DISPATCH_CENTRE_STATE.lastListError = '';
                        return true;
                    } catch (error) {
                        lastSeedError = error;
                        console.warn(
                            `[Command Nexus] Dispatch Centre seed ${seedBuildingId} failed:`,
                            error
                        );
                    }
                }

                throw lastSeedError || new Error('Assigned Dispatch Center selector unavailable');
            } catch (error) {
                NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
                NAMING_DISPATCH_CENTRE_STATE.listLoaded = false;
                NAMING_DISPATCH_CENTRE_STATE.lastListError = cleanText(
                    error?.message || String(error)
                );
                console.warn('[Command Nexus] Dispatch Centre list unavailable:', error);
                return false;
            }
        })();

        const loaded = await NAMING_DISPATCH_CENTRE_STATE.listPromise;
        if (!loaded) NAMING_DISPATCH_CENTRE_STATE.listPromise = null;
        return loaded;
    }'''
source = replace_function(source, 'loadNamingDispatchCentreList', list_loader)

refresh_helpers_and_function = r'''    const NAMING_DISPATCH_CENTRE_REFRESH_LISTENER_KEY =
        '__MC_NAMING_DISPATCH_CENTRE_REFRESH_V1089__';

    function getNamingDispatchCentreRefreshFailureReason() {
        const reasons = [
            NAMING_DISPATCH_CENTRE_STATE.lastListError,
            NAMING_DISPATCH_CENTRE_STATE.lastAssignmentError
        ].map(reason => cleanText(reason || '')).filter(Boolean);
        return [...new Set(reasons)].join(' | ') ||
            'Dispatch Centre data could not be loaded.';
    }

    function reportNamingDispatchCentreRefreshFailure(reason) {
        const message = `Dispatch Centre refresh failed: ${reason}`;
        if (typeof log === 'function' && document.getElementById('mc-namer-log')) {
            log(message, 'error');
        }
        if (
            typeof stationLog === 'function' &&
            document.getElementById('mc-station-log')
        ) {
            stationLog(message, 'error');
        }
    }

    function yieldNamingDispatchCentreRefreshPaint() {
        return new Promise(resolve => {
            const view = document.defaultView || window;
            view.setTimeout(resolve, 40);
        });
    }

    function installNamingDispatchCentreRefreshListener() {
        if (document[NAMING_DISPATCH_CENTRE_REFRESH_LISTENER_KEY]) return;
        document[NAMING_DISPATCH_CENTRE_REFRESH_LISTENER_KEY] = true;

        // Delegate from the stable document rather than binding only the first panel nodes.
        // MissionChief may replace popup content while the Resource Administration host lives.
        document.addEventListener('click', event => {
            const button = event.target?.closest?.(
                '#mc-namer-refresh-dispatch-centres, #mc-station-refresh-dispatch-centres'
            );
            if (!button || button.ownerDocument !== document) return;
            event.preventDefault();
            if (button.disabled) return;
            void refreshNamingDispatchCentres(true);
        });
    }

    async function refreshNamingDispatchCentres(force = true) {
        const buttons = [
            document.getElementById('mc-namer-refresh-dispatch-centres'),
            document.getElementById('mc-station-refresh-dispatch-centres')
        ].filter(Boolean);

        buttons.forEach(button => {
            button.disabled = true;
            button.textContent = 'Refreshing…';
            button.title = 'Loading Dispatch Centres from MissionChief.';
            button.dataset.dispatchCentreRefreshState = 'loading';
            button.setAttribute('aria-busy', 'true');
        });

        // Give the browser a real paint opportunity before any synchronous failure path
        // can return the label straight to Retry Dispatch Centres.
        await yieldNamingDispatchCentreRefreshPaint();

        let listLoaded = false;
        let assignmentsLoaded = false;
        let ready = false;
        let centreCount = 0;

        try {
            [listLoaded, assignmentsLoaded] = await Promise.all([
                loadNamingDispatchCentreList(force),
                loadNamingDispatchCentreData(force)
            ]);

            populateNamingDispatchCentreFilter('mc-namer-dispatch-centre');
            populateNamingDispatchCentreFilter('mc-station-dispatch-centre');
            populateNamingStationTypeFilter(
                'mc-namer-station-type',
                'mc-namer-dispatch-centre',
                STATE.stations
            );
            populateNamingStationTypeFilter(
                'mc-station-type',
                'mc-station-dispatch-centre',
                STATION_STATE.stations
            );
            populateStartDropdown();
            populateStationNamingStartDropdown();

            centreCount = NAMING_DISPATCH_CENTRE_STATE.labelsById.size;
            ready = Boolean(listLoaded && assignmentsLoaded && centreCount > 0);
            return ready;
        } catch (error) {
            NAMING_DISPATCH_CENTRE_STATE.lastListError =
                NAMING_DISPATCH_CENTRE_STATE.lastListError ||
                cleanText(error?.message || String(error));
            console.warn('[Command Nexus] Dispatch Centre refresh failed:', error);
            return false;
        } finally {
            const failureReason = getNamingDispatchCentreRefreshFailureReason();
            if (!ready) reportNamingDispatchCentreRefreshFailure(failureReason);

            buttons.forEach(button => {
                button.disabled = false;
                button.removeAttribute('aria-busy');
                button.dataset.dispatchCentreRefreshState = ready ? 'ready' : 'error';
                button.textContent = ready
                    ? 'Refresh Dispatch Centres'
                    : 'Retry Dispatch Centres';
                button.title = ready
                    ? `Loaded ${centreCount} Dispatch Centre${centreCount === 1 ? '' : 's'} from MissionChief.`
                    : `Retry Dispatch Centres. ${failureReason}`;
            });
        }
    }'''
source = replace_function(source, 'refreshNamingDispatchCentres', refresh_helpers_and_function)

source = replace_once(
    source,
    "            select.title = 'Dispatch Centre data unavailable. Use Refresh Dispatch Centres to retry.';",
    "            select.title = `Dispatch Centre data unavailable: ${getNamingDispatchCentreRefreshFailureReason()}`;",
    'selector failure title',
)

source = replace_once(
    source,
    "        document.querySelector('#mc-namer-refresh-dispatch-centres').onclick = () => refreshNamingDispatchCentres(true);",
    '        installNamingDispatchCentreRefreshListener();',
    'Unit Naming Dispatch Centre retry binding',
)
source = replace_once(
    source,
    "        document.querySelector('#mc-station-refresh-dispatch-centres').onclick = () => refreshNamingDispatchCentres(true);\n",
    '',
    'Station Naming Dispatch Centre retry binding',
)

source = replace_once(
    source,
    '<button id="mc-namer-refresh-dispatch-centres" type="button" style="margin-top:4px;">Refresh Dispatch Centres</button>',
    '<button id="mc-namer-refresh-dispatch-centres" type="button" style="margin-top:4px; cursor:pointer; pointer-events:auto; touch-action:manipulation;">Refresh Dispatch Centres</button>',
    'Unit Naming Dispatch Centre refresh button affordance',
)
source = replace_once(
    source,
    '<button id="mc-station-refresh-dispatch-centres" type="button" style="margin-top:4px;">Refresh Dispatch Centres</button>',
    '<button id="mc-station-refresh-dispatch-centres" type="button" style="margin-top:4px; cursor:pointer; pointer-events:auto; touch-action:manipulation;">Refresh Dispatch Centres</button>',
    'Station Naming Dispatch Centre refresh button affordance',
)

SOURCE_PATH.write_text(source, encoding='utf-8')

# Keep version-aware permanent checks aligned with the production candidate.
for check_path in sorted((ROOT / 'scripts').glob('check-*.mjs')):
    check = check_path.read_text(encoding='utf-8')
    check = check.replace('// @version      1.0.88', '// @version      1.0.89')
    check = check.replace("const UNIT_VERSION = '3.3.13';", "const UNIT_VERSION = '3.3.14';")
    check = check.replace("const STATION_VERSION = '1.3.7';", "const STATION_VERSION = '1.3.8';")
    check_path.write_text(check, encoding='utf-8')

regression = r'''#!/usr/bin/env node
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
    if (c === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  fail(`Unterminated ${name}`);
}

class FixtureRow {
  constructor(id, typeId, dispatchCentreId) {
    this.id = `building_list_${id}`;
    this.dataset = {};
    this.attrs = {
      building_type_id: String(typeId),
      leitstelle_building_id: dispatchCentreId == null ? 'null' : String(dispatchCentreId)
    };
  }
  getAttribute(name) { return this.attrs[name] ?? ''; }
  querySelector() { return null; }
}

expect(source.includes('// @version      1.0.89'), 'Expected Command Nexus 1.0.89');
expect(source.includes("const UNIT_VERSION = '3.3.14';"), 'Expected Unit Naming 3.3.14');
expect(source.includes("const STATION_VERSION = '1.3.8';"), 'Expected Station Naming 1.3.8');
expect(source.includes("'0', '18'"), 'Ordinary fire-station seed types missing');
expect(source.includes("'2', '20'"), 'Ordinary ambulance-station seed types missing');
expect(source.includes("'6', '19'"), 'Ordinary police-station seed types missing');

const rows = [
  new FixtureRow('1870621', '22', null),
  new FixtureRow('1859041', '7', null),
  new FixtureRow('1914809', '22', '1859041'),
  new FixtureRow('1856316', '0', '1859041'),
  new FixtureRow('1870510', '19', '1859041')
];
const context = {
  document: { querySelectorAll: () => rows },
  STATE: { stations: [] },
  STATION_STATE: { stations: [] },
  NAMING_DISPATCH_CENTRE_SEED_TYPE_IDS: new Set(['0','18','2','20','6','19','5','13','27','28','30','33','34','35']),
  Set,
  String,
  Number,
  Math,
  result: null
};
vm.runInNewContext(
  `${extractFunction('getNamingStationRowBuildingId')}\n` +
  `${extractFunction('getNamingStationRowDispatchCentreId')}\n` +
  `${extractFunction('isNamingDispatchCentreSeedStationTypeId')}\n` +
  `${extractFunction('getNamingDispatchCentreSeedBuildingIds')}\n` +
  `result = getNamingDispatchCentreSeedBuildingIds(3);`,
  context
);
const seeds = Array.from(context.result);
expect(seeds[0] === '1856316', `Expected assigned ordinary fire station first, got ${seeds[0] || 'none'}`);
expect(seeds[1] === '1870510', `Expected assigned ordinary police station second, got ${seeds[1] || 'none'}`);
expect(!seeds.includes('1870621'), 'Unassigned Home Response row must not become a seed');
expect(!seeds.includes('1859041'), 'Dispatch Centre building itself must not become a seed');
expect(!seeds.includes('1914809'), 'Assigned Home Response row must not outrank ordinary stations');

const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(listLoader.includes('getNamingDispatchCentreSeedBuildingIds(3)'), 'List loader must use bounded assigned-station seed candidates');
expect(listLoader.includes('for (const seedBuildingId of seedBuildingIds)'), 'List loader must retry bounded seed candidates');
expect(listLoader.includes('lastListError'), 'List loader must expose its failure reason');

const listener = extractFunction('installNamingDispatchCentreRefreshListener');
expect(listener.includes("document.addEventListener('click'"), 'Retry must use a delegated document click listener');
expect(listener.includes('#mc-namer-refresh-dispatch-centres, #mc-station-refresh-dispatch-centres'), 'Delegated listener must own both naming Retry buttons');
expect(listener.includes('refreshNamingDispatchCentres(true)'), 'Delegated Retry listener must force a refresh');
expect(!source.includes("querySelector('#mc-namer-refresh-dispatch-centres').onclick"), 'Fragile Unit direct Retry binding must be removed');
expect(!source.includes("querySelector('#mc-station-refresh-dispatch-centres').onclick"), 'Fragile Station direct Retry binding must be removed');

const refresh = extractFunction('refreshNamingDispatchCentres');
const paintAt = refresh.indexOf('await yieldNamingDispatchCentreRefreshPaint();');
const loadAt = refresh.indexOf('await Promise.all([');
expect(paintAt >= 0 && loadAt > paintAt, 'Refreshing state must paint before the loader can fail');
expect(refresh.includes("button.dataset.dispatchCentreRefreshState = 'loading'"), 'Retry must expose an explicit loading state');
expect(refresh.includes("button.disabled = false"), 'Retry must be re-enabled in the final state');
expect(refresh.includes('Retry Dispatch Centres. ${failureReason}'), 'Retry title must include the concrete failure reason');
expect(source.includes('pointer-events:auto; touch-action:manipulation;'), 'Retry buttons need explicit pointer/touch affordance');
expect(source.includes('lastAssignmentError'), 'Assignment failure reason state missing');
expect(!source.includes('mc-personnel-dispatch-centre'), 'Personnel Assignment must remain outside Dispatch Centre filtering');
expect(workflow.includes('scripts/check-naming-dispatch-centre-retry-v1089.mjs'), 'v1.0.89 Retry regression must be registered');

console.log('PASS: v1.0.89 keeps Retry Dispatch Centres clickable, visibly active and seeded from assigned ordinary stations.');
'''
(ROOT / 'scripts/check-naming-dispatch-centre-retry-v1089.mjs').write_text(regression, encoding='utf-8')

workflow = WORKFLOW_PATH.read_text(encoding='utf-8')
path_line = "      - 'scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs'\n"
if workflow.count(path_line) != 2:
    fail(f'Expected two v1.0.88 naming path registrations, found {workflow.count(path_line)}')
workflow = workflow.replace(
    path_line,
    path_line + "      - 'scripts/check-naming-dispatch-centre-retry-v1089.mjs'\n"
)
step = (
    '      - name: Validate Dispatch Centre assignment-selector source\n'
    '        run: node scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs\n'
)
workflow = replace_once(
    workflow,
    step,
    step + (
        '\n      - name: Validate resilient Dispatch Centre Retry action\n'
        '        run: node scripts/check-naming-dispatch-centre-retry-v1089.mjs\n'
    ),
    'v1.0.89 validation workflow step',
)
WORKFLOW_PATH.write_text(workflow, encoding='utf-8')

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(readme, '**Current version:** `1.0.88`', '**Current version:** `1.0.89`', 'README current version')
readme_path.write_text(readme, encoding='utf-8')

src_readme_path = ROOT / 'src/README.md'
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = replace_once(src_readme, '| Command Nexus version | `1.0.88` |', '| Command Nexus version | `1.0.89` |', 'src README current version')
src_readme_path.write_text(src_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
marker = 'The project uses Semantic Versioning for the unified userscript release line.\n\n'
if changelog.count(marker) != 1:
    fail('CHANGELOG insertion marker not found exactly once')
entry = '''## [1.0.89] - 2026-08-09

### Fixed

- **Retry Dispatch Centres** now uses one delegated document-level click owner, so the action remains live even if MissionChief replaces the Resource Administration panel DOM after the original mount.
- Dispatch Centre discovery no longer trusts the first arbitrary building as its edit-page seed. It prefers ordinary fire, ambulance, police and other supported station rows that carry a real `leitstelle_building_id` assignment.
- The edit-page lookup is bounded to at most three assigned station candidates and stops on the first page that exposes MissionChief's **Assigned Dispatch Center** selector. This is a retry fallback, not a per-building crawl.
- The button now holds a visible **Refreshing…** state before loading starts, records an explicit loading/error state, and exposes the concrete loader failure in the button tooltip and naming logs instead of appearing inert.
- Unit Naming and Station Naming keep the existing Dispatch Centre → Station Type → Start From cascade and authoritative station-row `leitstelle_building_id` membership.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-retry-v1089.mjs`, which executes the production seed selector against a fixture with early unassigned Home Response rows, a Dispatch Centre row and later assigned ordinary stations; it also protects delegated Retry ownership, visible loading state, failure diagnostics and pointer/touch affordance.

### Changed resource baselines

- Command Nexus increased from `1.0.88` to `1.0.89`.
- Unit Naming increased from `3.3.13` to `3.3.14`.
- Station Naming increased from `1.3.7` to `1.3.8`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

'''
changelog_path.write_text(changelog.replace(marker, marker + entry, 1), encoding='utf-8')

print('Built Command Nexus 1.0.89 Dispatch Centre Retry candidate.')
