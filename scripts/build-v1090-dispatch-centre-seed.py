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
require(source, '// @version      1.0.89', '1.0.89 metadata')
require(source, "const UNIT_VERSION = '3.3.14';", 'Unit Naming 3.3.14')
require(source, "const STATION_VERSION = '1.3.8';", 'Station Naming 1.3.8')

source = replace_once(source, '// @version      1.0.89', '// @version      1.0.90', 'metadata version')
source = replace_once(source, "const UNIT_VERSION = '3.3.14';", "const UNIT_VERSION = '3.3.15';", 'Unit Naming version')
source = replace_once(source, "const STATION_VERSION = '1.3.8';", "const STATION_VERSION = '1.3.9';", 'Station Naming version')

old_dispatch_fn = '''    function getNamingStationRowDispatchCentreId(row) {
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
'''
new_dispatch_fn = '''    function getNamingStationRowDispatchCentreId(row) {
        if (!row) return '';
        const raw =
            row.getAttribute?.('leitstelle_building_id') ||
            row.getAttribute?.('data-leitstelle-building-id') ||
            row.dataset?.leitstelleBuildingId ||
            '';
        if (raw === '' || raw == null) return '';

        const normalized = String(raw).trim();
        if (!normalized || /^(?:null|undefined|false)$/i.test(normalized)) return '';

        const numeric = Number(normalized);
        if (Number.isFinite(numeric) && numeric <= 0) return '';
        return normalized;
    }
'''
source = replace_once(source, old_dispatch_fn, new_dispatch_fn, 'Dispatch Centre null-normalisation function')

seed_start = source.index('    function getNamingDispatchCentreSeedBuildingIds(limit = 3) {')
seed_end = source.index('    async function loadNamingDispatchCentreList(force = false) {', seed_start)
if seed_start < 0 or seed_end < 0:
    raise SystemExit('Unable to locate Dispatch Centre seed/list loader boundary')

seed_block = '''    function getNamingDispatchCentreSeedBuildingIdsFromRows(rows, limit = 3) {
        const maxCandidates = Math.max(1, Math.min(3, Number(limit) || 3));
        const candidates = [];
        const seen = new Set();
        const sourceRows = [...(rows || [])];
        const addCandidate = buildingId => {
            const id = String(buildingId || '').trim();
            if (!id || seen.has(id) || candidates.length >= maxCandidates) return;
            seen.add(id);
            candidates.push(id);
        };

        // Prefer ordinary stations that already carry a real assignment, but assignment
        // is NOT a prerequisite for reading the native Assigned Dispatch Center selector.
        sourceRows.forEach(row => {
            if (candidates.length >= maxCandidates) return;
            const typeId = String(row.getAttribute?.('building_type_id') || '');
            if (!isNamingDispatchCentreSeedStationTypeId(typeId)) return;
            if (!getNamingStationRowDispatchCentreId(row)) return;
            addCandidate(getNamingStationRowBuildingId(row));
        });

        // Critical v1.0.90 fallback: an unassigned ordinary station edit page still exposes
        // the complete Assigned Dispatch Center selector, so it is a valid name-list seed.
        sourceRows.forEach(row => {
            if (candidates.length >= maxCandidates) return;
            const typeId = String(row.getAttribute?.('building_type_id') || '');
            if (!isNamingDispatchCentreSeedStationTypeId(typeId)) return;
            addCandidate(getNamingStationRowBuildingId(row));
        });

        // Last-resort local fallback only when no ordinary station row is represented.
        // Never use a Dispatch Centre building itself as an edit-page seed.
        if (!candidates.length) {
            sourceRows.forEach(row => {
                if (candidates.length >= maxCandidates) return;
                const typeId = String(row.getAttribute?.('building_type_id') || '');
                if (typeId === '7') return;
                addCandidate(getNamingStationRowBuildingId(row));
            });
        }

        return candidates;
    }

    function getNamingDispatchCentreSeedBuildingIds(limit = 3) {
        const maxCandidates = Math.max(1, Math.min(3, Number(limit) || 3));
        const rows = [
            ...document.querySelectorAll('.building_list_li, .building_list')
        ];
        const candidates = getNamingDispatchCentreSeedBuildingIdsFromRows(rows, maxCandidates);
        if (candidates.length >= maxCandidates) return candidates;

        const seen = new Set(candidates);
        const addCandidate = buildingId => {
            const id = String(buildingId || '').trim();
            if (!id || seen.has(id) || candidates.length >= maxCandidates) return;
            seen.add(id);
            candidates.push(id);
        };
        const stations = [
            ...(STATE.stations || []),
            ...(STATION_STATE.stations || [])
        ];

        stations.forEach(station => {
            if (candidates.length >= maxCandidates) return;
            const typeId = String(station?.buildingTypeId ?? '');
            if (typeId && !isNamingDispatchCentreSeedStationTypeId(typeId)) return;
            if (!station?.dispatchCentreId) return;
            addCandidate(station?.buildingId);
        });
        stations.forEach(station => {
            if (candidates.length >= maxCandidates) return;
            const typeId = String(station?.buildingTypeId ?? '');
            if (typeId && !isNamingDispatchCentreSeedStationTypeId(typeId)) return;
            addCandidate(station?.buildingId);
        });

        return candidates;
    }

    function extractNamingDispatchCentreSeedBuildingIdsFromHtml(html, limit = 3) {
        const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
        const rows = [
            ...parsed.querySelectorAll('.building_list_li, .building_list')
        ];
        return getNamingDispatchCentreSeedBuildingIdsFromRows(rows, limit);
    }

    async function loadNamingDispatchCentreSeedBuildingIds(limit = 3) {
        const localSeeds = getNamingDispatchCentreSeedBuildingIds(limit);
        if (localSeeds.length) return localSeeds;

        // The native Stations view is only a bounded building-ID discovery fallback here.
        // Dispatch Centre ID/name authority remains the edit-page assignment selector.
        const response = await stationFetchWithTimeout(
            '/leitstellenansicht',
            { credentials: 'same-origin', cache: 'no-store' },
            15000
        );
        if (!response.ok) {
            throw new Error(`Stations view returned HTTP ${response.status} while finding a seed station`);
        }

        const fetchedSeeds = extractNamingDispatchCentreSeedBuildingIdsFromHtml(
            await response.text(),
            limit
        );
        if (!fetchedSeeds.length) {
            throw new Error('Stations view did not expose a usable station building for Dispatch Centre discovery');
        }
        return fetchedSeeds;
    }

'''
source = source[:seed_start] + seed_block + source[seed_end:]

source = replace_once(
    source,
    'const seedBuildingIds = getNamingDispatchCentreSeedBuildingIds(3);',
    'const seedBuildingIds = await loadNamingDispatchCentreSeedBuildingIds(3);',
    'async seed loader call'
)
source = source.replace(
    'No assigned ordinary station is available to read Dispatch Centre assignments',
    'No station building is available to read Dispatch Centre assignments'
)
SOURCE.write_text(source)

# Advance current-version expectations without disturbing historical labels/messages.
for path in sorted((ROOT / 'scripts').glob('check-*.mjs')):
    text = path.read_text()
    text = text.replace('// @version      1.0.89', '// @version      1.0.90')
    text = text.replace("const UNIT_VERSION = '3.3.14';", "const UNIT_VERSION = '3.3.15';")
    text = text.replace("const STATION_VERSION = '1.3.8';", "const STATION_VERSION = '1.3.9';")
    path.write_text(text)

readme = (ROOT / 'README.md').read_text()
readme = replace_once(readme, '**Current version:** `1.0.89`', '**Current version:** `1.0.90`', 'README current version')
(ROOT / 'README.md').write_text(readme)

src_readme = (ROOT / 'src/README.md').read_text()
src_readme = replace_once(src_readme, '| Command Nexus version | `1.0.89` |', '| Command Nexus version | `1.0.90` |', 'src README current version')
src_readme = src_readme.replace(
    "Unit Naming and Station Naming use a Dispatch Centre-first cascade: the centre list is loaded independently from MissionChief's native Dispatch Centres view, Station Type is scoped to the selected centre, and Start From is then scoped to the selected centre and type. Station membership remains tied to MissionChief's `leitstelle_building_id` relationship.",
    "Unit Naming and Station Naming use a Dispatch Centre-first cascade: Dispatch Centre ID/name pairs come from MissionChief's native Assigned Dispatch Center selector on an ordinary station edit page; the seed station may be discovered from the current Stations DOM/state or, when those are not populated, from the native Stations view strictly as a building-ID fallback. Station Type is scoped to the selected centre, and Start From is then scoped to the selected centre and type. Station membership remains tied to MissionChief's `leitstelle_building_id` relationship, with literal `null` treated as unassigned."
)
(ROOT / 'src/README.md').write_text(src_readme)

changelog = (ROOT / 'CHANGELOG.md').read_text()
entry = '''## [1.0.90] - 2026-08-09

### Fixed

- Dispatch Centre name discovery no longer requires the seed station to already be assigned to a Dispatch Centre. Any ordinary station edit page may seed the native **Assigned Dispatch Center** selector.
- MissionChief's literal `leitstelle_building_id="null"` value is now normalized as genuinely unassigned rather than being treated as a Dispatch Centre ID.
- When the active Resource Administration document/state has no usable station rows yet, the loader performs one bounded `/leitstellenansicht` fetch only to discover up to three station building IDs, then still reads Dispatch Centre ID/name pairs from the edit-page assignment selector.
- The native Stations view remains a seed-discovery fallback only; it is not restored as Dispatch Centre name authority, and station-to-centre membership remains the row-level `leitstelle_building_id` relationship.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-unassigned-seed-v1090.mjs` covering literal `null`, an unassigned ordinary station as a valid edit-page seed, an empty live Resource Administration DOM, and native Stations HTML fallback without changing centre-name authority.

### Changed resource baselines

- Command Nexus increased from `1.0.89` to `1.0.90`.
- Unit Naming increased from `3.3.14` to `3.3.15`.
- Station Naming increased from `1.3.8` to `1.3.9`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

'''
marker = '## [1.0.89] - 2026-08-09\n'
require(changelog, marker, '1.0.89 changelog marker')
changelog = changelog.replace(marker, entry + marker, 1)
(ROOT / 'CHANGELOG.md').write_text(changelog)

regression = r'''#!/usr/bin/env node
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

class FixtureRow {
  constructor(id, typeId, dc) {
    this.id = `building_list_${id}`;
    this.dataset = {};
    this.attrs = { building_type_id: String(typeId), leitstelle_building_id: dc };
  }
  getAttribute(name) { return this.attrs[name] ?? ''; }
  querySelector() { return null; }
}
class FixtureDocument {
  constructor(html) {
    this.rows = [];
    const rowPattern = /<(?:li|div)\b([^>]*\bclass=["'][^"']*\bbuilding_list\b[^"']*["'][^>]*)>/gi;
    for (const match of html.matchAll(rowPattern)) {
      const attrs = match[1];
      const id = attrs.match(/\bid=["']building_list_(\d+)["']/i)?.[1];
      const typeId = attrs.match(/\bbuilding_type_id=["']([^"']*)["']/i)?.[1] ?? '';
      const dc = attrs.match(/\bleitstelle_building_id=["']([^"']*)["']/i)?.[1] ?? '';
      if (id) this.rows.push(new FixtureRow(id, typeId, dc));
    }
  }
  querySelectorAll() { return this.rows; }
}
class FixtureDOMParser { parseFromString(html) { return new FixtureDocument(html); } }

expect(source.includes('// @version      1.0.90'), 'Expected Command Nexus 1.0.90');
expect(source.includes("const UNIT_VERSION = '3.3.15';"), 'Expected Unit Naming 3.3.15');
expect(source.includes("const STATION_VERSION = '1.3.9';"), 'Expected Station Naming 1.3.9');

const context = {
  DOMParser: FixtureDOMParser,
  document: { querySelectorAll: () => [] },
  STATE: { stations: [] },
  STATION_STATE: { stations: [] },
  NAMING_DISPATCH_CENTRE_SEED_TYPE_IDS: new Set(['0','18','2','20','6','19','5','13','27','28','30','33','34','35']),
  Set, String, Number, Math,
  result: null,
  row: new FixtureRow('2604780', '0', 'null'),
  fixture: `<li id="building_list_1859041" class="building_list building_list_li" building_type_id="7" leitstelle_building_id="null"></li>
            <li id="building_list_2604780" class="building_list building_list_li" building_type_id="0" leitstelle_building_id="null"></li>
            <li id="building_list_2598058" class="building_list building_list_li" building_type_id="22" leitstelle_building_id="1859041"></li>`
};
vm.runInNewContext(
  `${extractFunction('getNamingStationRowBuildingId')}\n` +
  `${extractFunction('getNamingStationRowDispatchCentreId')}\n` +
  `${extractFunction('isNamingDispatchCentreSeedStationTypeId')}\n` +
  `${extractFunction('getNamingDispatchCentreSeedBuildingIdsFromRows')}\n` +
  `${extractFunction('extractNamingDispatchCentreSeedBuildingIdsFromHtml')}\n` +
  `result = { dc: getNamingStationRowDispatchCentreId(row), seeds: extractNamingDispatchCentreSeedBuildingIdsFromHtml(fixture, 3) };`,
  context
);
expect(context.result.dc === '', `Literal null must normalize to unassigned, got ${context.result.dc}`);
const seeds = Array.from(context.result.seeds);
expect(seeds[0] === '2604780', `Unassigned ordinary station must be a valid seed, got ${seeds[0] || 'none'}`);
expect(!seeds.includes('1859041'), 'Dispatch Centre building itself must never be a seed');

const seedLoader = extractFunction('loadNamingDispatchCentreSeedBuildingIds');
expect(seedLoader.includes("'/leitstellenansicht'"), 'Empty live DOM must fall back to native Stations view for seed IDs');
expect(seedLoader.includes('extractNamingDispatchCentreSeedBuildingIdsFromHtml'), 'Fetched Stations HTML must be parsed only for seed building IDs');
const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(listLoader.includes('await loadNamingDispatchCentreSeedBuildingIds(3)'), 'Centre list loader must await resilient seed discovery');
expect(listLoader.includes('extractNamingDispatchCentresFromBuildingEditHtml'), 'Centre names must still come from building edit selector');
expect(!listLoader.includes("stationFetchWithTimeout('/leitstellenansicht'"), 'Centre list loader itself must not use Stations view as name authority');
expect(!source.includes('mc-personnel-dispatch-centre'), 'Personnel Assignment must remain outside Dispatch Centre filtering');

console.log('PASS: v1.0.90 accepts unassigned ordinary seed stations and falls back to Stations HTML only for building-ID discovery.');
'''
(ROOT / 'scripts/check-naming-dispatch-centre-unassigned-seed-v1090.mjs').write_text(regression)

print('Built Command Nexus 1.0.90 Dispatch Centre seed candidate.')
