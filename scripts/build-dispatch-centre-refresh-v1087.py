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
source = replace_once(source, "// @version      1.0.86", "// @version      1.0.87", "Command Nexus version")
source = replace_once(source, "const UNIT_VERSION = '3.3.11';", "const UNIT_VERSION = '3.3.12';", "Unit Naming version")
source = replace_once(source, "const STATION_VERSION = '1.3.5';", "const STATION_VERSION = '1.3.6';", "Station Naming version")

parser_block = r'''    function extractNamingDispatchCentresFromHtml(html) {
        const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
        const centres = new Map();
        const containers = [
            ...parsed.querySelectorAll(
                '.building_list_li, .building_list, [data-building-id], [building_id]'
            )
        ];

        const addFromContainer = container => {
            const anchors = [...container.querySelectorAll('a[href*="/buildings/"]')];
            const preferred = anchors.find(anchor =>
                Boolean(getNamingDispatchCentreIdFromHref(anchor.getAttribute('href') || ''))
            );
            if (!preferred) return;

            const id = getNamingDispatchCentreIdFromHref(preferred.getAttribute('href') || '');
            if (!id) return;

            const caption =
                container.querySelector('.building_list_caption .map_position_mover') ||
                container.querySelector('.building_list_caption a[href*="/buildings/"]') ||
                preferred;
            const label = cleanText(caption?.textContent || preferred.textContent || '');
            if (label && !centres.has(String(id))) centres.set(String(id), label);
        };

        containers.forEach(addFromContainer);

        // /leitstellenansicht is already the native Dispatch Centres view. If MissionChief
        // changes or removes its list wrapper classes, fall back to exact same-origin
        // /buildings/{id} anchors rather than treating the page as empty.
        if (!centres.size) {
            [...parsed.querySelectorAll('a[href*="/buildings/"]')].forEach(anchor => {
                const id = getNamingDispatchCentreIdFromHref(anchor.getAttribute('href') || '');
                if (!id) return;
                const label = cleanText(anchor.textContent || '');
                if (label && !centres.has(String(id))) centres.set(String(id), label);
            });
        }

        return centres;
    }'''

source = replace_block(
    source,
    "    function extractNamingDispatchCentresFromHtml(html) {",
    "    async function loadNamingDispatchCentreList(force = false) {",
    parser_block,
    "Dispatch Centre HTML parser",
)

filter_block = r'''    function populateNamingDispatchCentreFilter(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const previous = select.value || NAMING_DISPATCH_CENTRE_ALL;
        const centres = [...NAMING_DISPATCH_CENTRE_STATE.labelsById.entries()]
            .map(([id, label]) => ({ id: String(id), label: cleanText(label) || `Dispatch Centre ${id}` }))
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

        select.replaceChildren();
        const add = (value, label) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        };

        const available =
            NAMING_DISPATCH_CENTRE_STATE.listLoaded &&
            NAMING_DISPATCH_CENTRE_STATE.loaded &&
            centres.length > 0;

        if (!available) {
            add(NAMING_DISPATCH_CENTRE_ALL, 'Dispatch Centres unavailable — refresh');
            select.value = NAMING_DISPATCH_CENTRE_ALL;
            select.disabled = true;
            select.title = 'Dispatch Centre data unavailable. Use Refresh Dispatch Centres to retry.';
            return;
        }

        add(NAMING_DISPATCH_CENTRE_ALL, 'All dispatch centres');
        centres.forEach(({ id, label }) => add(id, label));
        add(NAMING_DISPATCH_CENTRE_UNASSIGNED, 'Unassigned / default');

        const values = new Set([...select.options].map(option => option.value));
        select.value = values.has(previous) ? previous : NAMING_DISPATCH_CENTRE_ALL;
        select.disabled = false;
        select.title = 'Choose a MissionChief Dispatch Centre first, then Station Type and Start From.';
    }'''

source = replace_block(
    source,
    "    function populateNamingDispatchCentreFilter(selectId) {",
    "    function getStationsForNamingDispatchCentre(stations, dispatchSelectId) {",
    filter_block,
    "Dispatch Centre selector population",
)

refresh_block = r'''    async function refreshNamingDispatchCentres(force = true) {
        const buttons = [
            document.getElementById('mc-namer-refresh-dispatch-centres'),
            document.getElementById('mc-station-refresh-dispatch-centres')
        ].filter(Boolean);

        buttons.forEach(button => {
            button.disabled = true;
            button.textContent = 'Refreshing…';
            button.title = 'Loading Dispatch Centres from MissionChief.';
        });

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
            console.warn('[Command Nexus] Dispatch Centre refresh failed:', error);
            return false;
        } finally {
            buttons.forEach(button => {
                button.disabled = false;
                button.textContent = ready ? 'Refresh Dispatch Centres' : 'Retry Dispatch Centres';
                button.title = ready
                    ? `Loaded ${centreCount} Dispatch Centre${centreCount === 1 ? '' : 's'} from MissionChief.`
                    : 'Dispatch Centre data could not be loaded. Click to retry.';
            });
        }
    }'''

source = replace_block(
    source,
    "    async function refreshNamingDispatchCentres(force = true) {",
    "    function handleUnitDispatchCentreChange() {",
    refresh_block,
    "Dispatch Centre refresh handler",
)

SOURCE.write_text(source, encoding="utf-8")

for check_path in sorted((ROOT / "scripts").glob("check-*.mjs")):
    check = check_path.read_text(encoding="utf-8")
    check = check.replace("// @version      1.0.86", "// @version      1.0.87")
    check = check.replace("const UNIT_VERSION = '3.3.11';", "const UNIT_VERSION = '3.3.12';")
    check = check.replace("const STATION_VERSION = '1.3.5';", "const STATION_VERSION = '1.3.6';")
    check_path.write_text(check, encoding="utf-8")

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

class FixtureAnchor {
  constructor(href, text, className, row = null) {
    this.hrefValue = href;
    this.textContent = text;
    this.className = className;
    this.row = row;
  }
  getAttribute(name) {
    if (name === 'href') return this.hrefValue;
    if (name === 'class') return this.className;
    return '';
  }
  closest() { return this.row; }
}

class FixtureRow {
  constructor(html) {
    this.anchors = [];
    const anchorPattern = /<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(anchorPattern)) {
      const attrs = `${match[1]} ${match[3]}`;
      const className = attrs.match(/\bclass=["']([^"']*)["']/i)?.[1] || '';
      const text = match[4].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      this.anchors.push(new FixtureAnchor(match[2], text, className, this));
    }
  }
  querySelectorAll(selector) {
    if (selector.includes('a[href*="/buildings/"]')) return this.anchors.filter(anchor => anchor.hrefValue.includes('/buildings/'));
    return [];
  }
  querySelector(selector) {
    if (selector.includes('.map_position_mover')) {
      return this.anchors.find(anchor => anchor.className.split(/\s+/).includes('map_position_mover') && anchor.hrefValue.includes('/buildings/')) || null;
    }
    if (selector.includes('a[href*="/buildings/"]')) return this.anchors.find(anchor => anchor.hrefValue.includes('/buildings/')) || null;
    return null;
  }
}

class FixtureDocument {
  constructor(html) {
    this.rows = [];
    const rowPattern = /<li\b[^>]*class=["'][^"']*\bbuilding_list_li\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
    for (const match of html.matchAll(rowPattern)) this.rows.push(new FixtureRow(match[1]));
    this.allAnchors = [];
    const anchorPattern = /<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(anchorPattern)) {
      const attrs = `${match[1]} ${match[3]}`;
      const className = attrs.match(/\bclass=["']([^"']*)["']/i)?.[1] || '';
      const text = match[4].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      this.allAnchors.push(new FixtureAnchor(match[2], text, className, null));
    }
  }
  querySelectorAll(selector) {
    if (selector.includes('.building_list_li') && !selector.includes('a[href')) return this.rows;
    if (selector === 'a[href*="/buildings/"]') return this.allAnchors.filter(anchor => anchor.hrefValue.includes('/buildings/'));
    return [];
  }
}

class FixtureDOMParser { parseFromString(html) { return new FixtureDocument(html); } }

const getIdSource = extractFunction('getNamingDispatchCentreIdFromHref');
const parserSource = extractFunction('extractNamingDispatchCentresFromHtml');

expect(source.includes('// @version      1.0.87'), 'Expected Command Nexus 1.0.87');
expect(source.includes("const UNIT_VERSION = '3.3.12';"), 'Expected Unit Naming 3.3.12');
expect(source.includes("const STATION_VERSION = '1.3.6';"), 'Expected Station Naming 1.3.6');
expect(!parserSource.includes('building_type_id="7"'), 'Parser must not depend on building_type_id=7 wrappers');
expect(parserSource.includes("parsed.querySelectorAll('a[href*=\\\"/buildings/\\\"]')") || parserSource.includes("parsed.querySelectorAll('a[href*=\"/buildings/\"]')"), 'Exact-link fallback missing');

function runParser(fixture) {
  const context = {
    DOMParser: FixtureDOMParser,
    URL,
    location: { origin: 'https://www.missionchief.co.uk' },
    cleanText: value => String(value || '').replace(/\s+/g, ' ').trim(),
    fixture,
    result: null,
    Map,
    String,
    Boolean
  };
  vm.runInNewContext(`${getIdSource}\n${parserSource}\nresult = extractNamingDispatchCentresFromHtml(fixture);`, context);
  return new Map(context.result);
}

const nativeFixture = `
<ul id="building_list">
  <li class="building_list_li" building_id="41001">
    <div class="building_list_caption">
      <a href="/buildings/41001/edit">Edit</a>
      <a class="map_position_mover" href="/buildings/41001">Edinburgh Control</a>
    </div>
  </li>
  <li class="building_list_li" data-building-id="41002">
    <div class="building_list_caption">
      <a class="map_position_mover" href="https://www.missionchief.co.uk/buildings/41002/">Glasgow Control</a>
    </div>
  </li>
</ul>
<nav><a href="/buildings/99999">Unrelated navigation building</a></nav>
`;
const nativeCentres = runParser(nativeFixture);
expect(nativeCentres.size === 2, `Expected two native Dispatch Centres, got ${nativeCentres.size}`);
expect(nativeCentres.get('41001') === 'Edinburgh Control', 'First Dispatch Centre label was not parsed');
expect(nativeCentres.get('41002') === 'Glasgow Control', 'Second Dispatch Centre label was not parsed');
expect(!nativeCentres.has('99999'), 'Scoped parser must ignore unrelated page-level building links');

const wrapperlessFixture = `
<a href="/buildings/52001">Fallback Control</a>
<a href="/buildings/52001/edit">Edit</a>
<a href="https://example.invalid/buildings/52002">Wrong origin</a>
`;
const fallbackCentres = runParser(wrapperlessFixture);
expect(fallbackCentres.size === 1, `Expected one fallback Dispatch Centre, got ${fallbackCentres.size}`);
expect(fallbackCentres.get('52001') === 'Fallback Control', 'Wrapperless exact-link fallback failed');

const refreshSource = extractFunction('refreshNamingDispatchCentres');
expect(refreshSource.includes("'Refreshing…'"), 'Refresh action must expose a loading state');
expect(refreshSource.includes("'Retry Dispatch Centres'"), 'Refresh failure must expose a retry state');
expect(refreshSource.includes('listLoaded && assignmentsLoaded && centreCount > 0'), 'Refresh must require both centre names and assignments');
const populateSource = extractFunction('populateNamingDispatchCentreFilter');
expect(populateSource.includes("'Dispatch Centres unavailable — refresh'"), 'Disabled selector must explain the refresh failure');
expect(populateSource.includes('NAMING_DISPATCH_CENTRE_STATE.listLoaded'), 'Selector must require native list readiness');
expect(populateSource.includes('NAMING_DISPATCH_CENTRE_STATE.loaded'), 'Selector must require assignment readiness');
expect(workflow.includes('scripts/check-naming-dispatch-centre-refresh-v1087.mjs'), 'v1.0.87 refresh regression must be registered in Validate userscript');
console.log('PASS: Dispatch Centre refresh parser, fallback and visible failure states are covered.');
'''
(ROOT / "scripts/check-naming-dispatch-centre-refresh-v1087.mjs").write_text(regression, encoding="utf-8")

workflow_path = ROOT / ".github/workflows/validate-userscript.yml"
workflow = workflow_path.read_text(encoding="utf-8")
path_needle = "      - 'scripts/check-naming-dispatch-centre-first-v1086.mjs'\n"
if workflow.count(path_needle) != 2:
    raise RuntimeError(f"validate path registration: expected two v1086 path entries, found {workflow.count(path_needle)}")
workflow = workflow.replace(path_needle, path_needle + "      - 'scripts/check-naming-dispatch-centre-refresh-v1087.mjs'\n")
step_needle = """      - name: Validate Dispatch Centre-first naming flow
        run: node scripts/check-naming-dispatch-centre-first-v1086.mjs
"""
if workflow.count(step_needle) != 1:
    raise RuntimeError("validate step registration marker not found exactly once")
workflow = workflow.replace(step_needle, step_needle + """
      - name: Validate Dispatch Centre refresh parser and retry state
        run: node scripts/check-naming-dispatch-centre-refresh-v1087.mjs
""", 1)
workflow_path.write_text(workflow, encoding="utf-8")

readme_path = ROOT / "README.md"
readme = readme_path.read_text(encoding="utf-8")
readme = replace_once(readme, "**Current version:** `1.0.86`", "**Current version:** `1.0.87`", "README current version")
readme_path.write_text(readme, encoding="utf-8")

src_readme_path = ROOT / "src/README.md"
src_readme = src_readme_path.read_text(encoding="utf-8")
src_readme = replace_once(src_readme, "| Command Nexus version | `1.0.86` |", "| Command Nexus version | `1.0.87` |", "src README current version")
src_readme_path.write_text(src_readme, encoding="utf-8")

changelog_path = ROOT / "CHANGELOG.md"
changelog = changelog_path.read_text(encoding="utf-8")
marker = "The project uses Semantic Versioning for the unified userscript release line.\n\n"
if changelog.count(marker) != 1:
    raise RuntimeError("CHANGELOG insertion marker not found exactly once")
entry = """## [1.0.87] - 2026-08-09

### Fixed

- **Refresh Dispatch Centres** now parses the native `/leitstellenansicht` list without requiring MissionChief to expose `building_type_id=\"7\"` on each list wrapper.
- Dispatch Centre discovery first uses MissionChief's building-list containers and falls back to exact same-origin `/buildings/{id}` links if wrapper markup changes.
- Unit Naming and Station Naming now show **Refreshing…** while the list is loading and **Retry Dispatch Centres** when either centre discovery or station-to-centre assignment data fails.
- A failed load now leaves a clear **Dispatch Centres unavailable — refresh** placeholder instead of a disabled **All dispatch centres** selector that appears to do nothing.
- Station membership remains authoritative through `/building/buildings_json` and `leitstelle_building_id`.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-refresh-v1087.mjs`, which executes the production parser against Dispatch Centre HTML fixtures without `building_type_id=\"7\"`, verifies wrapperless fallback behaviour, rejects nested/cross-origin links and protects the visible refresh/retry states.

### Changed resource baselines

- Command Nexus increased from `1.0.86` to `1.0.87`.
- Unit Naming increased from `3.3.11` to `3.3.12`.
- Station Naming increased from `1.3.5` to `1.3.6`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

"""
changelog = changelog.replace(marker, marker + entry, 1)
changelog_path.write_text(changelog, encoding="utf-8")

Path(__file__).unlink()
