from pathlib import Path
import re

SOURCE_PATH = Path('src/missionchief-command-nexus.user.js')


def function_span(text: str, name: str):
    marker = f'function {name}('
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'Missing function {name}')
    param = text.find('(', start)
    depth = 0
    quote = None
    escaped = False
    body_start = None
    index = param
    while index < len(text):
        char = text[index]
        if quote:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == quote:
                quote = None
            index += 1
            continue
        if char in "'\"`":
            quote = char
        elif char == '(':
            depth += 1
        elif char == ')':
            depth -= 1
            if depth == 0:
                body_start = text.find('{', index)
                break
        index += 1
    if body_start is None:
        raise SystemExit(f'Missing body for {name}')

    depth = 0
    quote = None
    escaped = False
    index = body_start
    while index < len(text):
        char = text[index]
        next_char = text[index + 1] if index + 1 < len(text) else ''
        if quote:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == quote:
                quote = None
            index += 1
            continue
        if char in "'\"`":
            quote = char
        elif char == '/' and next_char == '/':
            line_end = text.find('\n', index + 2)
            index = len(text) if line_end < 0 else line_end
            continue
        elif char == '/' and next_char == '*':
            comment_end = text.find('*/', index + 2)
            if comment_end < 0:
                raise SystemExit(f'Unclosed comment in {name}')
            index = comment_end + 2
            continue
        elif char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return start, index + 1, body_start
        index += 1
    raise SystemExit(f'Unable to isolate {name}')


def replace_function(text: str, name: str, replacement: str):
    start, end, _ = function_span(text, name)
    return text[:start] + replacement.strip() + text[end:]


source = SOURCE_PATH.read_text(encoding='utf-8')

source, count = re.subn(
    r'(?m)^(//\s+@version\s+)1\.1\.2(\s*)$',
    r'\g<1>1.1.3\2',
    source,
    count=1,
)
if count != 1:
    raise SystemExit('Canonical userscript version marker was not updated')

if '10.7.0' not in source:
    raise SystemExit('Mission Finder 10.7.0 marker missing')
source = source.replace('10.7.0', '10.7.1')

source, count = re.subn(
    r"(const\s+MF_MISSION_LOGGER_CLIENT_VERSION\s*=\s*)'1\.1\.2'",
    r"\g<1>'1.1.3'",
    source,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit('Mission logger client version marker was not updated')

journey_function = r'''
function readMissionLoggerUnitJourneyMetrics(row) {
    const empty = {
        estimatedDistanceKm: null,
        estimatedEtaSeconds: null
    };
    if (!row || typeof row.getAttribute !== 'function') {
        return empty;
    }

    const parseNumber = value => {
        if (value === null || value === undefined) return null;
        const cleaned = String(value)
            .trim()
            .replace(/\s+/g, '')
            .replace(',', '.');
        if (!cleaned || !/^-?\d+(?:\.\d+)?$/.test(cleaned)) {
            return null;
        }
        const number = Number(cleaned);
        return Number.isFinite(number) ? number : null;
    };

    const normaliseDistance = value => {
        const number = parseNumber(value);
        if (number === null || number < 0 || number > 5000) {
            return null;
        }
        return Math.round(number * 1000) / 1000;
    };

    const normaliseEta = value => {
        const number = parseNumber(value);
        if (
            number === null ||
            number < 0 ||
            number > 7 * 24 * 60 * 60
        ) {
            return null;
        }
        return Math.round(number);
    };

    const nodeHint = node => String([
        node?.id || '',
        node?.className || '',
        node?.getAttribute?.('data-column') || '',
        node?.getAttribute?.('aria-label') || ''
    ].join(' ')).toLowerCase();

    const parseDistanceText = text => {
        const value = String(text || '');
        const kilometres = value.match(
            /(-?\d+(?:[.,]\d+)?)\s*km\b/i
        );
        if (kilometres) {
            return normaliseDistance(kilometres[1]);
        }
        const metres = value.match(
            /(-?\d+(?:[.,]\d+)?)\s*m(?:etres?)?\b/i
        );
        if (!metres) return null;
        const number = parseNumber(metres[1]);
        return number === null
            ? null
            : normaliseDistance(number / 1000);
    };

    const parseEtaText = text => {
        const value = String(text || '').trim();
        const clock = value.match(
            /\b(\d{1,2}):(\d{2}):(\d{2})\b/
        );
        if (clock) {
            return normaliseEta(
                Number(clock[1]) * 3600 +
                Number(clock[2]) * 60 +
                Number(clock[3])
            );
        }

        const hours = value.match(
            /(\d+(?:[.,]\d+)?)\s*h(?:ours?)?\b/i
        );
        const minutes = value.match(
            /(\d+(?:[.,]\d+)?)\s*min(?:utes?)?\b/i
        );
        const seconds = value.match(
            /(\d+(?:[.,]\d+)?)\s*s(?:ec(?:onds?)?)?\b/i
        );
        if (!hours && !minutes && !seconds) return null;
        return normaliseEta(
            (parseNumber(hours?.[1]) || 0) * 3600 +
            (parseNumber(minutes?.[1]) || 0) * 60 +
            (parseNumber(seconds?.[1]) || 0)
        );
    };

    const nodes = [row];
    if (typeof row.querySelectorAll === 'function') {
        row.querySelectorAll([
            '[data-distance]',
            '[data-distance-km]',
            '[distance]',
            '[data-sortvalue]',
            '[data-sort-value]',
            '[sortvalue]',
            '[timevalue]',
            '[data-timevalue]',
            '[data-time]',
            '[data-eta]',
            '[data-eta-seconds]',
            'td',
            'span'
        ].join(',')).forEach(node => {
            if (node && !nodes.includes(node)) nodes.push(node);
        });
    }

    let distanceNode = null;
    let estimatedDistanceKm = null;
    for (const node of nodes) {
        for (const attribute of [
            'data-distance',
            'data-distance-km',
            'distance'
        ]) {
            const value = normaliseDistance(
                node.getAttribute?.(attribute)
            );
            if (value !== null) {
                distanceNode = node;
                estimatedDistanceKm = value;
                break;
            }
        }
        if (estimatedDistanceKm !== null) break;
    }

    if (estimatedDistanceKm === null) {
        for (const node of nodes) {
            const value = parseDistanceText(node.textContent);
            if (value !== null) {
                distanceNode = node;
                estimatedDistanceKm = value;
                break;
            }
        }
    }

    const etaAttributes = [
        'data-sortvalue',
        'data-sort-value',
        'sortvalue',
        'timevalue',
        'data-timevalue',
        'data-time',
        'data-eta',
        'data-eta-seconds'
    ];
    let estimatedEtaSeconds = null;

    if (distanceNode) {
        for (const attribute of etaAttributes) {
            estimatedEtaSeconds = normaliseEta(
                distanceNode.getAttribute?.(attribute)
            );
            if (estimatedEtaSeconds !== null) break;
        }
    }

    if (estimatedEtaSeconds === null) {
        for (const node of nodes) {
            const hasExplicitTime = [
                'timevalue',
                'data-timevalue',
                'data-time',
                'data-eta',
                'data-eta-seconds'
            ].some(attribute =>
                node.getAttribute?.(attribute) !== null
            );
            if (!hasExplicitTime) continue;
            for (const attribute of etaAttributes) {
                estimatedEtaSeconds = normaliseEta(
                    node.getAttribute?.(attribute)
                );
                if (estimatedEtaSeconds !== null) break;
            }
            if (estimatedEtaSeconds !== null) break;
        }
    }

    if (estimatedEtaSeconds === null) {
        const sortableNode = nodes.find(node => {
            const hinted = /(drive|arrival|distance|journey|route|travel|eta|time)/
                .test(nodeHint(node));
            if (!hinted) return false;
            return [
                'data-sortvalue',
                'data-sort-value',
                'sortvalue'
            ].some(attribute =>
                normaliseEta(node.getAttribute?.(attribute)) !== null
            );
        });
        if (sortableNode) {
            for (const attribute of [
                'data-sortvalue',
                'data-sort-value',
                'sortvalue'
            ]) {
                estimatedEtaSeconds = normaliseEta(
                    sortableNode.getAttribute?.(attribute)
                );
                if (estimatedEtaSeconds !== null) break;
            }
        }
    }

    if (estimatedEtaSeconds === null) {
        for (const node of nodes.slice(1).concat(nodes[0])) {
            estimatedEtaSeconds = parseEtaText(node.textContent);
            if (estimatedEtaSeconds !== null) break;
        }
    }

    return {
        estimatedDistanceKm,
        estimatedEtaSeconds
    };
}
'''
source = replace_function(
    source,
    'readMissionLoggerUnitJourneyMetrics',
    journey_function,
)

list_capture = r'''
let mfMissionLoggerMissionListObserver = null;
let mfMissionLoggerMissionListScanTimer = null;

function readMissionLoggerMissionListEntry(row) {
    if (!row || typeof row.querySelector !== 'function') {
        return null;
    }

    const excludedSelector = [
        '#mission_list_alliance',
        '#mission_list_alliance_event',
        '.mission_alliance',
        '.allianceMission',
        '.missionSideBarEntry--alliance',
        '[data-alliance-mission="true"]'
    ].join(',');
    if (
        typeof row.closest === 'function' &&
        row.closest(excludedSelector)
    ) {
        return null;
    }

    const link = row.matches?.('a[href*="/missions/"]')
        ? row
        : row.querySelector('a[href*="/missions/"]');
    const href = link?.getAttribute?.('href') || '';
    let url = null;
    try {
        url = new URL(href, location.origin);
    } catch (_error) {
        return null;
    }
    if (url.origin !== location.origin) return null;

    const urlMatch = url.pathname.match(
        /^\/missions\/(\d+)(?:\/|$)/
    );
    const rowIdMatch = String(row.id || '').match(
        /^mission_(\d+)$/
    );
    const missionId = String(
        row.getAttribute?.('data-mission-id') ||
        row.getAttribute?.('mission_id') ||
        urlMatch?.[1] ||
        rowIdMatch?.[1] ||
        ''
    ).trim();
    if (!/^\d+$/.test(missionId)) return null;

    const missionName = trimMissionLoggerText(
        row.getAttribute?.('data-mission-name') ||
        row.getAttribute?.('search_attribute') ||
        row.querySelector?.(
            '.mission_type, .mission-title, ' +
            '.missionSideBarEntrySearchable'
        )?.textContent ||
        link?.textContent ||
        '',
        240
    );
    const missionDefinitionId = String(
        row.getAttribute?.('mission_type_id') ||
        row.getAttribute?.('data-mission-type-id') ||
        ''
    ).trim();

    return {
        missionId,
        missionDefinitionId,
        missionName,
        missionUrl: new URL(
            `/missions/${encodeURIComponent(missionId)}`,
            location.origin
        ).href
    };
}

function getMissionLoggerOwnMissionListEntries() {
    const root = document.querySelector('#mission_list');
    if (!root) return [];

    const rows = Array.from(root.querySelectorAll([
        '.missionSideBarEntry',
        '[id^="mission_"]',
        '[data-mission-id]',
        '[mission_id]'
    ].join(',')));
    const missions = new Map();
    rows.forEach(row => {
        const mission = readMissionLoggerMissionListEntry(row);
        if (mission && !missions.has(mission.missionId)) {
            missions.set(mission.missionId, mission);
        }
    });
    return Array.from(missions.values());
}

function createMissionLoggerMissionListObservedEvent(mission) {
    const event = createMissionLoggerEvent(
        'mission-observed',
        { includeUnits: false }
    );
    event.missionId = mission.missionId;
    event.missionDefinitionId =
        mission.missionDefinitionId ||
        event.missionDefinitionId ||
        '';
    event.missionName =
        mission.missionName ||
        event.missionName ||
        '';
    event.missionUrl = mission.missionUrl;
    event.ownership = event.ownership || 'own';
    event.metadata = Object.assign(
        {},
        event.metadata && typeof event.metadata === 'object'
            ? event.metadata
            : {},
        {
            observationSource: 'mission-list-generated'
        }
    );
    return event;
}

function scanMissionLoggerMissionList() {
    if (
        !mfMissionLoggerEnabled ||
        !readMissionLoggerIdentity() ||
        window !== window.top
    ) {
        return false;
    }

    const missions = getMissionLoggerOwnMissionListEntries();
    if (missions.length === 0) return false;

    const now = Date.now();
    const registry = readMissionLoggerObservedRegistry();
    let changed = false;
    missions.forEach(mission => {
        const key = String(mission.missionId);
        if (
            now - Number(registry[key] || 0) <
            24 * 60 * 60 * 1000
        ) {
            return;
        }

        const queued = queueMissionLoggerEvent(
            createMissionLoggerMissionListObservedEvent(mission)
        );
        if (!queued) return;
        registry[key] = now;
        changed = true;
    });

    if (changed) {
        writeMissionLoggerObservedRegistry(registry);
        renderMissionLoggerStatus();
    }
    return changed;
}

function scheduleMissionLoggerMissionListScan() {
    if (mfMissionLoggerMissionListScanTimer) return;
    mfMissionLoggerMissionListScanTimer = setTimeout(() => {
        mfMissionLoggerMissionListScanTimer = null;
        scanMissionLoggerMissionList();
    }, 150);
}

function stopMissionLoggerMissionListCapture() {
    if (mfMissionLoggerMissionListObserver) {
        mfMissionLoggerMissionListObserver.disconnect();
        mfMissionLoggerMissionListObserver = null;
    }
    if (mfMissionLoggerMissionListScanTimer) {
        clearTimeout(mfMissionLoggerMissionListScanTimer);
        mfMissionLoggerMissionListScanTimer = null;
    }
}

function installMissionLoggerMissionListCapture() {
    if (
        !mfMissionLoggerEnabled ||
        !readMissionLoggerIdentity() ||
        window !== window.top ||
        mfMissionLoggerMissionListObserver
    ) {
        return false;
    }

    const target =
        document.querySelector('#mission_list') ||
        document.body;
    if (!target) return false;

    mfMissionLoggerMissionListObserver = new MutationObserver(
        mutations => {
            const relevant = mutations.some(mutation =>
                Array.from(mutation.addedNodes || []).some(node =>
                    node?.nodeType === 1 &&
                    (
                        node.matches?.(
                            '#mission_list, .missionSideBarEntry, ' +
                            '[id^="mission_"], [data-mission-id], ' +
                            '[mission_id]'
                        ) ||
                        node.querySelector?.(
                            'a[href*="/missions/"], ' +
                            '.missionSideBarEntry, [id^="mission_"]'
                        )
                    )
                )
            );
            if (relevant) {
                scheduleMissionLoggerMissionListScan();
            }
        }
    );
    mfMissionLoggerMissionListObserver.observe(target, {
        childList: true,
        subtree: true
    });
    scanMissionLoggerMissionList();
    return true;
}
'''
record_start, _, _ = function_span(
    source,
    'recordMissionLoggerObservedEvent',
)
source = (
    source[:record_start] +
    list_capture.strip() +
    '\n\n    ' +
    source[record_start:]
)

record_start, record_end, _ = function_span(
    source,
    'recordMissionLoggerObservedEvent',
)
record_body = source[record_start:record_end]
old_guard = re.compile(
    r"function recordMissionLoggerObservedEvent\(\) \{\s*"
    r"if \(\s*!mfMissionLoggerEnabled \|\|\s*"
    r"!readMissionLoggerIdentity\(\) \|\|\s*"
    r"!isMissionPage\(\)\s*\) \{\s*"
    r"return false;\s*\}",
    re.S,
)
new_guard = '''function recordMissionLoggerObservedEvent() {
        if (
            !mfMissionLoggerEnabled ||
            !readMissionLoggerIdentity()
        ) {
            return false;
        }
        if (!isMissionPage()) {
            installMissionLoggerMissionListCapture();
            return scanMissionLoggerMissionList();
        }'''
record_body, count = old_guard.subn(
    new_guard,
    record_body,
    count=1,
)
if count != 1:
    raise SystemExit('Unable to replace mission observed guard')
source = source[:record_start] + record_body + source[record_end:]

source = source.replace(
    'stopMissionLoggerSyncTimer();\n'
    '                    stopMissionLoggerCreditReconciliation();',
    'stopMissionLoggerSyncTimer();\n'
    '                    stopMissionLoggerCreditReconciliation();\n'
    '                    stopMissionLoggerMissionListCapture();',
)

disconnect_start, disconnect_end, _ = function_span(
    source,
    'disconnectMissionLoggerBrowser',
)
disconnect_body = source[disconnect_start:disconnect_end]
if 'stopMissionLoggerMissionListCapture();' not in disconnect_body:
    brace_offset = disconnect_body.find('{') + 1
    disconnect_body = (
        disconnect_body[:brace_offset] +
        '\n        stopMissionLoggerMissionListCapture();' +
        disconnect_body[brace_offset:]
    )
    source = (
        source[:disconnect_start] +
        disconnect_body +
        source[disconnect_end:]
    )

SOURCE_PATH.write_text(source, encoding='utf-8')

readme_path = Path('README.md')
readme = readme_path.read_text(encoding='utf-8')
readme = readme.replace(
    '**Current version:** `1.1.2`',
    '**Current version:** `1.1.3`',
    1,
)
readme = readme.replace(
    '**Mission Finder engine:** `V10.7.0`',
    '**Mission Finder engine:** `V10.7.1`',
    1,
)
readme = readme.replace(
    'records player-separated mission demand, dispatch snapshots, journey distance/ETA, timing and completion evidence',
    'records player-separated generated mission demand, dispatch snapshots, journey distance/ETA, timing and completion evidence',
)
readme_path.write_text(readme, encoding='utf-8')

for package_path in [Path('package.json'), Path('package-lock.json')]:
    if not package_path.exists():
        continue
    package_text = package_path.read_text(encoding='utf-8')
    count_limit = 1 if package_path.name == 'package.json' else 2
    package_text = re.sub(
        r'("version"\s*:\s*")1\.1\.2(")',
        r'\g<1>1.1.3\2',
        package_text,
        count=count_limit,
    )
    package_path.write_text(package_text, encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
section_start = changelog.find('## [Unreleased]')
next_section = changelog.find('\n## [1.1.2]', section_start)
if section_start < 0 or next_section < 0:
    raise SystemExit('Unexpected changelog structure')
replacement = '''## [Unreleased]

No changes have been queued after `1.1.3`.

## [1.1.3] - 2026-08-17

### Added

- Added automatic own-mission-list capture to the opt-in Mission Analytics Logger. Newly generated missions are queued as `mission-observed` as soon as MissionChief inserts them into `#mission_list`, without requiring the player or Auto Mode to open the mission first.
- Added an initial catch-up scan for active own missions not already in the browser's bounded observation registry, preserving missions generated while the paired browser was offline and preventing detail-page double counting.

### Fixed

- Fixed dispatch journey evidence capture when MissionChief stores distance and arrival metadata on a descendant journey cell rather than the selected vehicle row. Nexus now reads the native attribute node, accepts exact displayed kilometre/metre and duration text only as a bounded fallback, and still leaves missing evidence blank instead of estimating it.
- Preserved Google Sheets dashboard and analysis formula references during logger rebuilds by clearing source data cells instead of deleting referenced rows.
- Blocked duplicate active player display names and directs additional browsers to **Create another device pairing**, preventing ambiguous dashboard player filters.

### Security and compatibility

- Mission-list capture remains inside the existing explicit opt-in and paired-browser boundary, records only MissionChief's own mission ID, name, definition ID and URL, and excludes alliance/shared mission containers.
- The existing Apps Script endpoint, workbook, dashboard, player/device pairings, local queue and historical rows remain compatible. No new backend deployment is required for generated-mission or journey client capture; the separate `1.1.2-dashboard-guard-1` Apps Script maintenance deployment remains required to make manual rebuilds safe.
- Increased the unified userscript from `1.1.2` to `1.1.3` and Mission Finder from `V10.7.0` to `V10.7.1`. Other component versions remain unchanged.
'''
changelog = (
    changelog[:section_start] +
    replacement.rstrip() +
    '\n' +
    changelog[next_section:]
)
changelog_path.write_text(changelog, encoding='utf-8')

mission_list_test = r'''#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '/' && next === '/') {
      const end = source.indexOf('\n', index + 2);
      index = end < 0 ? source.length : end;
      continue;
    }
    if (character === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      assert.notEqual(end, -1, `Unclosed comment in ${name}`);
      index = end + 1;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unable to isolate ${name}`);
}

for (const name of [
  'readMissionLoggerMissionListEntry',
  'getMissionLoggerOwnMissionListEntries',
  'createMissionLoggerMissionListObservedEvent',
  'scanMissionLoggerMissionList',
  'installMissionLoggerMissionListCapture',
  'stopMissionLoggerMissionListCapture'
]) {
  extractFunction(name);
}

const installer = extractFunction(
  'installMissionLoggerMissionListCapture'
);
assert.match(installer, /MutationObserver/);
assert.match(installer, /#mission_list/);
assert.match(installer, /childList:\s*true/);
assert.match(installer, /subtree:\s*true/);

const scan = extractFunction('scanMissionLoggerMissionList');
assert.match(scan, /readMissionLoggerObservedRegistry\(\)/);
assert.match(scan, /24 \* 60 \* 60 \* 1000/);
assert.match(scan, /queueMissionLoggerEvent\(/);
assert.match(scan, /writeMissionLoggerObservedRegistry\(registry\)/);

const eventBuilder = extractFunction(
  'createMissionLoggerMissionListObservedEvent'
);
assert.match(eventBuilder, /'mission-observed'/);
assert.match(
  eventBuilder,
  /observationSource:\s*'mission-list-generated'/
);

const observed = extractFunction(
  'recordMissionLoggerObservedEvent'
);
assert.match(observed, /if \(!isMissionPage\(\)\)/);
assert.match(observed, /installMissionLoggerMissionListCapture\(\)/);
assert.match(observed, /scanMissionLoggerMissionList\(\)/);

const entrySource = extractFunction(
  'readMissionLoggerMissionListEntry'
);
const trimMissionLoggerText = (value, limit) =>
  String(value || '').trim().slice(0, limit);
const readEntry = Function(
  'trimMissionLoggerText',
  'location',
  `"use strict"; ${entrySource}; return readMissionLoggerMissionListEntry;`
)(
  trimMissionLoggerText,
  { origin: 'https://www.missionchief.co.uk' }
);

const link = {
  textContent: 'Shed fire',
  getAttribute(name) {
    return name === 'href' ? '/missions/123456' : null;
  }
};
const row = {
  id: 'mission_123456',
  className: 'missionSideBarEntry',
  textContent: 'Shed fire',
  matches() { return false; },
  closest() { return null; },
  querySelector(selector) {
    return selector.includes('a[href') ? link : null;
  },
  getAttribute(name) {
    if (name === 'mission_type_id') return '999';
    if (name === 'search_attribute') return 'Shed fire';
    return null;
  }
};
const parsed = readEntry(row);
assert.equal(parsed.missionId, '123456');
assert.equal(parsed.missionDefinitionId, '999');
assert.equal(parsed.missionName, 'Shed fire');
assert.equal(
  parsed.missionUrl,
  'https://www.missionchief.co.uk/missions/123456'
);

const allianceRow = {
  ...row,
  closest(selector) {
    return selector.includes('#mission_list_alliance') ? {} : null;
  }
};
assert.equal(readEntry(allianceRow), null);

console.log(
  'Mission list generation logger regression passed: own mission insertion, initial catch-up, shared observation de-duplication and alliance exclusion are locked.'
);
'''
Path('scripts/check-mission-list-generation-logger.mjs').write_text(
    mission_list_test,
    encoding='utf-8',
)

journey_test_path = Path('scripts/check-mission-journey-metrics.mjs')
journey_test = journey_test_path.read_text(encoding='utf-8')
insertion_marker = 'const missing = readMetrics(row({}));'
if insertion_marker not in journey_test:
    raise SystemExit('Journey test insertion marker missing')
nested_test = r'''
const nestedMetricNode = {
  id: 'vehicle_drive_123',
  className: 'building_list_vehicle_drive',
  textContent: 'Distance 12.75 km, arrival 00:04:30',
  getAttribute(name) {
    const values = {
      'data-distance': '12.75',
      'data-sortvalue': '270'
    };
    return Object.prototype.hasOwnProperty.call(values, name)
      ? values[name]
      : null;
  }
};
const nested = readMetrics({
  id: 'vehicle_row_123',
  className: 'vehicle_select_table_tr',
  textContent: '',
  getAttribute() { return null; },
  querySelectorAll() { return [nestedMetricNode]; }
});
expect(
  nested.estimatedDistanceKm === 12.75,
  'Distance must be read from the native descendant journey cell'
);
expect(
  nested.estimatedEtaSeconds === 270,
  'ETA must be read from the same native descendant journey cell'
);

const visibleMetricNode = {
  id: 'arrival_time_456',
  className: 'vehicle_arrival journey_distance',
  textContent: '18.4 km • 00:07:05',
  getAttribute() { return null; }
};
const visible = readMetrics({
  getAttribute() { return null; },
  querySelectorAll() { return [visibleMetricNode]; }
});
expect(
  visible.estimatedDistanceKm === 18.4,
  'Explicit native displayed kilometres must remain a bounded fallback'
);
expect(
  visible.estimatedEtaSeconds === 425,
  'Explicit native displayed duration must remain a bounded fallback'
);

const unrelatedSortNode = {
  id: 'vehicle_name_sort',
  className: 'vehicle_sortable',
  textContent: 'Vehicle 123',
  getAttribute(name) {
    return name === 'data-sortvalue' ? '123' : null;
  }
};
const unrelated = readMetrics({
  getAttribute() { return null; },
  querySelectorAll() {
    return [
      unrelatedSortNode,
      {
        ...unrelatedSortNode,
        id: 'vehicle_type_sort',
        getAttribute(name) {
          return name === 'data-sortvalue' ? '999' : null;
        }
      }
    ];
  }
});
expect(
  unrelated.estimatedEtaSeconds === null,
  'Ambiguous unrelated sortable cells must not be treated as ETA'
);

'''
journey_test = journey_test.replace(
    insertion_marker,
    nested_test + insertion_marker,
    1,
)
journey_test_path.write_text(journey_test, encoding='utf-8')
