from pathlib import Path
import re

SOURCE = Path('src/missionchief-command-nexus.user.js')


def function_span(text: str, name: str) -> tuple[int, int]:
    starts = [
        text.find(f'async function {name}('),
        text.find(f'function {name}('),
    ]
    starts = [value for value in starts if value >= 0]
    if not starts:
        raise SystemExit(f'Function not found: {name}')
    start = min(starts)
    brace = text.find('{', start)
    if brace < 0:
        raise SystemExit(f'Opening brace not found: {name}')
    depth = 0
    quote = ''
    escaped = False
    line_comment = False
    block_comment = False
    index = brace
    while index < len(text):
        char = text[index]
        nxt = text[index + 1] if index + 1 < len(text) else ''
        if line_comment:
            if char == '\n':
                line_comment = False
            index += 1
            continue
        if block_comment:
            if char == '*' and nxt == '/':
                block_comment = False
                index += 2
                continue
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
        if char in ("'", '"', '`'):
            quote = char
            index += 1
            continue
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return start, index + 1
        index += 1
    raise SystemExit(f'Function is unterminated: {name}')


def replace_function(text: str, name: str, replacement: str) -> str:
    start, end = function_span(text, name)
    return text[:start] + replacement.strip() + text[end:]


def replace_in_function(text: str, name: str, old: str, new: str) -> str:
    start, end = function_span(text, name)
    function = text[start:end]
    if function.count(old) != 1:
        raise SystemExit(f'{name}: expected exactly one refresh-order block')
    function = function.replace(old, new, 1)
    return text[:start] + function + text[end:]


def bump_patch(version: str) -> str:
    major, minor, patch = (int(value) for value in version.split('.'))
    return f'{major}.{minor}.{patch + 1}'


def bump_single_version(text: str, pattern: str, label: str) -> tuple[str, str, str]:
    matches = list(re.finditer(pattern, text))
    if len(matches) != 1:
        raise SystemExit(f'{label}: expected one version marker, found {len(matches)}')
    match = matches[0]
    old = match.group(1)
    new = bump_patch(old)
    updated = text[:match.start(1)] + new + text[match.end(1):]
    return updated, old, new


source = SOURCE.read_text(encoding='utf-8')
if source.count('3.0.36') < 3:
    raise SystemExit('Expected the v3.0.36 production source baseline.')
source = source.replace('3.0.36', '3.0.37')

source, resource_old, resource_new = bump_single_version(
    source,
    r'MODULE 1: UNIT, STATION & PERSONNEL TOOLS V(\d+(?:\.\d+){2})',
    'Resource Administration module',
)
source, unit_old, unit_new = bump_single_version(
    source,
    r"const UNIT_VERSION = '(\d+(?:\.\d+){2})';",
    'Unit Naming',
)
source, station_old, station_new = bump_single_version(
    source,
    r"const STATION_VERSION = '(\d+(?:\.\d+){2})';",
    'Station Naming',
)

source = replace_function(source, 'getNamingDispatchCentreStationRowDocuments', r'''
function getNamingDispatchCentreStationRowDocuments(root = document) {
        const documents = [];
        const queue = [];
        const queuedDocuments = new Set();
        const seenDocuments = new Set();
        const enqueue = candidate => {
            if (
                !candidate?.querySelectorAll ||
                seenDocuments.has(candidate) ||
                queuedDocuments.has(candidate)
            ) return;
            queuedDocuments.add(candidate);
            queue.push(candidate);
        };
        enqueue(root);
        if (root === document) {
            try { enqueue(window.top?.document); } catch (_) {}
        }
        while (queue.length && documents.length < 32) {
            const candidateDocument = queue.shift();
            queuedDocuments.delete(candidateDocument);
            if (!candidateDocument || seenDocuments.has(candidateDocument)) continue;
            seenDocuments.add(candidateDocument);
            documents.push(candidateDocument);
            try {
                candidateDocument.querySelectorAll('iframe').forEach(frame => {
                    try {
                        enqueue(
                            frame.contentDocument ||
                            frame.contentWindow?.document ||
                            null
                        );
                    } catch (_) {}
                });
            } catch (_) {}
        }
        return documents;
    }''')

source = replace_function(source, 'getStationOverviewEntries', r'''
function getStationOverviewEntries(root = document) {
        const groups = new Map();
        getNamingDispatchCentreStationRowDocuments(root).forEach(candidateDocument => {
            candidateDocument.querySelectorAll(STATION_OVERVIEW_LINK_SELECTOR).forEach(link => {
                if (link.closest?.('#mc-namer-panel')) return;
                const href = normaliseStationOverviewHref(link.getAttribute?.('href'));
                if (!href) return;
                const container = getStationOverviewContainer(link);
                if (!container && !link.matches?.('.lightbox-open.list-group-item.active')) return;
                const candidates = groups.get(href) || [];
                candidates.push({ link, container });
                groups.set(href, candidates);
            });
        });
        return [...groups.entries()].map(([href, candidates], index) => {
            candidates.sort((a, b) =>
                scoreStationOverviewLink(b.link, href) -
                scoreStationOverviewLink(a.link, href)
            );
            const selected = candidates[0];
            const container = selected.container || getStationOverviewContainer(selected.link);
            return {
                index,
                href,
                buildingId: getBuildingIdFromHref(href),
                displayName: readStationOverviewName(selected.link, container, href),
                buildingTypeId: readStationBuildingTypeId(selected.link, container),
                link: selected.link,
                container
            };
        });
    }''')

old_refresh_order = '''const stationEntries = getStationOverviewEntries();
        await Promise.all([
            loadNamingDispatchCentreList(false),
            loadNamingDispatchCentreData(true)
        ]);'''
new_refresh_order = '''await loadNamingDispatchCentreList(false);
        await yieldNamingDispatchCentreRefreshPaint();
        await loadNamingDispatchCentreData(true);
        const stationEntries = getStationOverviewEntries();'''
source = replace_in_function(
    source,
    'refreshStations',
    old_refresh_order,
    new_refresh_order,
)
source = replace_in_function(
    source,
    'refreshStationNamingStations',
    old_refresh_order,
    new_refresh_order,
)

SOURCE.write_text(source, encoding='utf-8')

regression = Path('scripts/check-naming-dispatch-centre-recursive-frame-v3037.mjs')
regression.write_text(r'''#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const starts = [
    source.indexOf(`async function ${name}(`),
    source.indexOf(`function ${name}(`),
  ].filter(value => value >= 0);
  assert.ok(starts.length, `${name} must exist`);
  const start = Math.min(...starts);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = brace; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

assert.match(source, /@version\s+3\.0\.37/);
const documentGraph = extractFunction('getNamingDispatchCentreStationRowDocuments');
assert.match(documentGraph, /while \(queue\.length && documents\.length < 32\)/,
  'naming authority must traverse a bounded recursive document graph');
assert.match(documentGraph, /frame\.contentDocument[\s\S]*frame\.contentWindow\?\.document/,
  'same-origin nested frame documents must be discoverable');
assert.doesNotMatch(documentGraph, /window\.opener|fetch\s*\(/,
  'naming authority must remain local-DOM only');

const overview = extractFunction('getStationOverviewEntries');
assert.match(overview, /getNamingDispatchCentreStationRowDocuments\(root\)/,
  'station inventory must use the same recursive document graph as centre membership');
assert.doesNotMatch(overview, /\n\s*root\.querySelectorAll\(/,
  'station inventory must not remain current-document-only');

for (const name of ['refreshStations', 'refreshStationNamingStations']) {
  const refresh = extractFunction(name);
  const paint = refresh.indexOf('await yieldNamingDispatchCentreRefreshPaint()');
  const assignments = refresh.indexOf('await loadNamingDispatchCentreData(true)');
  const entries = refresh.indexOf('const stationEntries = getStationOverviewEntries()');
  assert.ok(paint >= 0 && paint < assignments && assignments < entries,
    `${name} must rescan membership after one render boundary before reading stations`);
}

class FixtureDocument {
  constructor({ frames = [], links = [], rows = [] } = {}) {
    this.frames = frames;
    this.links = links;
    this.rows = rows;
  }
  querySelectorAll(selector) {
    if (selector === 'iframe') return this.frames;
    if (selector === 'station-links') return this.links;
    if (
      selector.includes('.building_list_li') ||
      selector.includes('[leitstelle_building_id]') ||
      selector.includes('[data-leitstelle-building-id]')
    ) return this.rows;
    return [];
  }
}

const stationRow = {
  id: 'building_list_3000001',
  dataset: {},
  attrs: {
    building_type_id: '18',
    leitstelle_building_id: '2638524',
  },
  getAttribute(name) { return this.attrs[name] ?? ''; },
  querySelector() { return null; },
};
const stationLink = {
  label: 'NESTED FIRE',
  buildingTypeId: 18,
  container: {},
  getAttribute(name) { return name === 'href' ? '/buildings/3000001' : ''; },
  closest() { return null; },
  matches() { return false; },
};

const deepDocument = new FixtureDocument({ links: [stationLink], rows: [stationRow] });
const middleDocument = new FixtureDocument();
const topDocument = new FixtureDocument();
const blockedFrame = {};
Object.defineProperty(blockedFrame, 'contentDocument', {
  get() { throw new Error('cross-origin'); },
});
middleDocument.frames.push({ contentDocument: deepDocument });
topDocument.frames.push({ contentDocument: middleDocument }, blockedFrame);
deepDocument.frames.push({ contentDocument: topDocument });

const context = vm.createContext({
  document: topDocument,
  window: { top: { document: topDocument } },
  Map,
  Set,
  String,
  Number,
  STATION_OVERVIEW_LINK_SELECTOR: 'station-links',
  NAMING_DISPATCH_CENTRE_STATE: { byBuildingId: new Map(), loaded: false },
  NAMING_DISPATCH_CENTRE_ALL: 'ALL',
  NAMING_DISPATCH_CENTRE_UNASSIGNED: '__UNASSIGNED__',
  NAMING_SERVICE_BY_BUILDING_TYPE_ID: { 18: 'FIRE' },
  normaliseStationOverviewHref(value) {
    return /^\/buildings\/\d+$/.test(String(value || '')) ? String(value) : '';
  },
  getStationOverviewContainer(link) { return link.container || null; },
  scoreStationOverviewLink() { return 1; },
  getBuildingIdFromHref(value) { return String(value).match(/\/buildings\/(\d+)/)?.[1] || ''; },
  readStationOverviewName(link) { return link.label || ''; },
  readStationBuildingTypeId(link) { return Number(link.buildingTypeId || 0); },
});

vm.runInContext(
  `${extractFunction('getNamingStationRowBuildingId')}\n` +
  `${extractFunction('getNamingStationRowDispatchCentreId')}\n` +
  `${documentGraph}\n` +
  `${extractFunction('refreshNamingDispatchCentreAssignmentsFromStationRows')}\n` +
  `${extractFunction('getNamingDispatchCentreId')}\n` +
  `${extractFunction('stationMatchesNamingDispatchCentre')}\n` +
  `${extractFunction('getNamingServiceForStation')}\n` +
  `${overview}\n` +
  `this.collectDocuments = getNamingDispatchCentreStationRowDocuments;\n` +
  `this.refreshAssignments = refreshNamingDispatchCentreAssignmentsFromStationRows;\n` +
  `this.readCentreId = getNamingDispatchCentreId;\n` +
  `this.matchesCentre = stationMatchesNamingDispatchCentre;\n` +
  `this.readService = getNamingServiceForStation;\n` +
  `this.readStations = getStationOverviewEntries;`,
  context
);

const documents = context.collectDocuments();
assert.equal(documents.length, 3, 'top, middle and deeply nested station documents must be collected once');
assert.equal(documents[2], deepDocument, 'the second-level Resource Administration document must be retained');

context.refreshAssignments();
assert.equal(context.readCentreId('3000001'), '2638524',
  'deep station membership must join to the selected Dispatch Centre');

const entries = context.readStations();
assert.equal(entries.length, 1, 'deep station inventory must remain visible to Unit and Station Naming');
assert.equal(entries[0].buildingId, '3000001');
assert.equal(entries[0].displayName, 'NESTED FIRE');

const station = {
  ...entries[0],
  dispatchCentreId: context.readCentreId(entries[0].buildingId),
  stationType: 'FIRE',
};
assert.equal(context.matchesCentre(station, '2638524'), true,
  'selected Dispatch Centre must expose the deeply nested station');
assert.equal(context.readService(station), 'FIRE',
  'the downstream Service stage must populate from the selected centre station');
assert.equal(context.matchesCentre(station, '__UNASSIGNED__'), false,
  'an assigned nested station must not fall into Unassigned/default');

console.log('PASS: nested same-origin station rows populate Dispatch Centre -> Service -> Station Type -> Start From.');
''', encoding='utf-8')

hierarchy = Path('scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs')
hierarchy_text = hierarchy.read_text(encoding='utf-8')
import_line = "await import('./check-naming-dispatch-centre-recursive-frame-v3037.mjs');\n"
if import_line not in hierarchy_text:
    marker = "await import('./check-naming-dispatch-centre-membership-frame-v1094.mjs');\n"
    if marker not in hierarchy_text:
        raise SystemExit('Hierarchy regression import marker not found.')
    hierarchy_text = hierarchy_text.replace(marker, marker + import_line, 1)
    hierarchy.write_text(hierarchy_text, encoding='utf-8')

changelog = Path('CHANGELOG.md')
changelog_text = changelog.read_text(encoding='utf-8')
entry = '''\n## [3.0.37] - 2026-08-30\n\n### Fixed\n\n- Restored the Unit Naming and Station Naming cascade when Resource Administration station rows are hosted more than one same-origin frame below the naming workspace.\n- Centre discovery, station membership and station inventory now share one bounded recursive current/top/iframe document graph, preserving exact row-level `leitstelle_building_id` authority.\n- Dispatch Centre selection now crosses one render boundary, rescans current membership and only then rebuilds Service, Station Type and Start From.\n- Added a permanent nested-frame regression reproducing the rollback-era “Dispatch Centre selectable, downstream selectors empty” failure.\n- Increased the unified userscript version from `3.0.36` to `3.0.37`; Mission Finder remains `V10.6.177`.\n'''
marker = '## [Unreleased]\n'
if marker not in changelog_text:
    raise SystemExit('CHANGELOG Unreleased marker not found.')
if '## [3.0.37]' not in changelog_text:
    changelog_text = changelog_text.replace(marker, marker + entry, 1)
    changelog.write_text(changelog_text, encoding='utf-8')

for path in [
    Path('README.md'),
    Path('docs/ARCHITECTURE.md'),
    Path('docs/DEVELOPER_HANDOFF.md'),
    Path('docs/MIGRATION.md'),
    Path('docs/README.md'),
    Path('docs/ROADMAP.md'),
    Path('src/README.md'),
]:
    if not path.exists():
        continue
    text = path.read_text(encoding='utf-8')
    if '3.0.36' in text:
        path.write_text(text.replace('3.0.36', '3.0.37'), encoding='utf-8')

for path in Path('.').glob('.tmp-v3037-*'):
    path.unlink(missing_ok=True)
for path in [
    Path('.github/workflows/_temporary-v3037-naming-inspection.yml'),
    Path('.github/workflows/_temporary-v3037-naming-focus.yml'),
    Path('.github/workflows/_temporary-v3037-build.yml'),
    Path('scripts/_temporary-build-v3037-naming-cascade.py'),
]:
    path.unlink(missing_ok=True)

print('Built Command Nexus 3.0.37 naming cascade candidate')
print(f'Resource Administration: {resource_old} -> {resource_new}')
print(f'Unit Naming: {unit_old} -> {unit_new}')
print(f'Station Naming: {station_old} -> {station_new}')
print(f'Userscript size: {SOURCE.stat().st_size} bytes')
