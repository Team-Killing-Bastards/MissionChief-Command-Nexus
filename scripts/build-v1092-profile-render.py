#!/usr/bin/env python3
from pathlib import Path
import re

SOURCE = Path('src/missionchief-command-nexus.user.js')
source = SOURCE.read_text()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def function_span(text, name):
    marker = f'function {name}('
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'Unable to find {name}')
    brace = text.find('{', start)
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
            elif c == '\\':
                escaped = True
            elif c == quote:
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
                return start, i + 1
        i += 1
    raise SystemExit(f'Unterminated {name}')


source = replace_once(source, '// @version      1.0.91', '// @version      1.0.92', 'Command Nexus version')
source = replace_once(source, "const UNIT_VERSION = '3.3.16';", "const UNIT_VERSION = '3.3.17';", 'Unit Naming version')
source = replace_once(source, "const STATION_VERSION = '1.3.10';", "const STATION_VERSION = '1.3.11';", 'Station Naming version')

parser_start, parser_end = function_span(source, 'extractNamingDispatchCentresFromProfileHtml')
parser_replacement = r'''function extractNamingDispatchCentresFromProfileDocument(parsed) {
        const centres = new Map();
        if (!parsed?.querySelectorAll) return centres;

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

    function extractNamingDispatchCentresFromProfileHtml(html) {
        const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html');
        return extractNamingDispatchCentresFromProfileDocument(parsed);
    }'''
source = source[:parser_start] + parser_replacement + source[parser_end:]

loader_marker = '    async function loadNamingDispatchCentreList(force = false) {'
loader_index = source.find(loader_marker)
if loader_index < 0:
    raise SystemExit('Unable to find loadNamingDispatchCentreList')

render_loader = r'''    async function loadNamingDispatchCentresFromRenderedProfile(profilePath, timeoutMs = 15000) {
        const host = document.body || document.documentElement;
        if (!host) throw new Error('MissionChief document is not ready to render the profile');

        const iframe = document.createElement('iframe');
        iframe.src = profilePath;
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        iframe.style.position = 'fixed';
        iframe.style.left = '-10000px';
        iframe.style.top = '-10000px';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.style.border = '0';

        host.appendChild(iframe);
        const started = Date.now();

        try {
            while (Date.now() - started < timeoutMs) {
                try {
                    const profileDocument = iframe.contentDocument;
                    const centres = extractNamingDispatchCentresFromProfileDocument(profileDocument);
                    if (centres.size) return centres;
                } catch (_) {
                    // Same-origin MissionChief profile navigation can briefly swap documents.
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            throw new Error(
                `Rendered profile did not expose any Dispatch Centre panels within ${timeoutMs}ms`
            );
        } finally {
            iframe.remove();
        }
    }

'''
source = source[:loader_index] + render_loader + source[loader_index:]

loader_start, loader_end = function_span(source, 'loadNamingDispatchCentreList')
loader = source[loader_start:loader_end]
old_acquisition = r'''                const profilePath = resolveNamingOwnProfilePath();
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
                );'''
new_acquisition = r'''                const profilePath = resolveNamingOwnProfilePath();
                const centres = await loadNamingDispatchCentresFromRenderedProfile(profilePath);'''
if old_acquisition not in loader:
    raise SystemExit('Profile fetch acquisition block not found exactly')
loader = loader.replace(old_acquisition, new_acquisition, 1)
source = source[:loader_start] + loader + source[loader_end:]

SOURCE.write_text(source)

# Rebase current-version expectations in permanent regressions without rewriting history text.
for path in Path('scripts').glob('check-*.mjs'):
    text = path.read_text()
    text = text.replace('// @version      1.0.91', '// @version      1.0.92')
    text = text.replace("const UNIT_VERSION = '3.3.16';", "const UNIT_VERSION = '3.3.17';")
    text = text.replace("const STATION_VERSION = '1.3.10';", "const STATION_VERSION = '1.3.11';")
    path.write_text(text)

check = r'''#!/usr/bin/env node
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
class EmptyProfileDoc {
  querySelectorAll(selector) { return selector === '.profile-dispatchcenter' ? [] : []; }
}
class RenderedProfileDoc {
  constructor() {
    this.panels = [
      new Panel([]),
      new Panel([new Anchor('/buildings/2634040', 'LODON DISPATCH')]),
      new Panel([new Anchor('/buildings/2638525', 'NI Ambulance Dispatch')]),
      new Panel([new Anchor('/buildings/2638524', 'NI Fire Dispatch')]),
      new Panel([new Anchor('/buildings/2638571', 'NI Hospitals')]),
      new Panel([new Anchor('/buildings/2632635', 'NI Police Dispatch')]),
      new Panel([new Anchor('/buildings/2638564', 'North England Dispatch')]),
      new Panel([new Anchor('/buildings/1859041', 'Scotlands Dispatch')])
    ];
  }
  querySelectorAll(selector) { return selector === '.profile-dispatchcenter' ? this.panels : []; }
}

const fakeIframe = {
  src: '',
  contentDocument: new EmptyProfileDoc(),
  style: {},
  removed: false,
  setAttribute() {},
  remove() { this.removed = true; }
};
const host = { appendChild(node) { expect(node === fakeIframe, 'Unexpected renderer node'); } };
const context = {
  URL,
  location: { origin: 'https://www.missionchief.co.uk' },
  cleanText: value => String(value || '').replace(/\s+/g, ' ').trim(),
  document: {
    body: host,
    documentElement: host,
    createElement: tag => {
      expect(tag === 'iframe', `Expected iframe renderer, got ${tag}`);
      return fakeIframe;
    }
  },
  Date,
  Promise,
  Map,
  String,
  setTimeout: callback => {
    fakeIframe.contentDocument = new RenderedProfileDoc();
    callback();
    return 1;
  },
  result: null
};

expect(source.includes('// @version      1.0.92'), 'Expected Command Nexus 1.0.92');
expect(source.includes("const UNIT_VERSION = '3.3.17';"), 'Expected Unit Naming 3.3.17');
expect(source.includes("const STATION_VERSION = '1.3.11';"), 'Expected Station Naming 1.3.11');

vm.runInNewContext(
  `${extractFunction('getNamingDispatchCentreIdFromHref')}\n` +
  `${extractFunction('extractNamingDispatchCentresFromProfileDocument')}\n` +
  `${extractFunction('loadNamingDispatchCentresFromRenderedProfile')}\n` +
  `result = loadNamingDispatchCentresFromRenderedProfile('/profile/419938', 1000);`,
  context
);
const centres = new Map(await context.result);
expect(centres.size === 7, `Expected seven centres after rendered DOM appears, got ${centres.size}`);
expect(centres.get('2634040') === 'LODON DISPATCH', 'LODON DISPATCH missing after rendered profile lifecycle');
expect(centres.get('1859041') === 'Scotlands Dispatch', 'Scotlands Dispatch missing after rendered profile lifecycle');
expect(fakeIframe.removed === true, 'Hidden profile renderer must always be removed after use');
expect(fakeIframe.src === '/profile/419938', `Renderer must load own profile path, got ${fakeIframe.src}`);

const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(listLoader.includes('await loadNamingDispatchCentresFromRenderedProfile(profilePath)'), 'Centre loader must wait for rendered profile DOM');
expect(!listLoader.includes('stationFetchWithTimeout'), 'Centre loader must not parse a static fetched profile shell');
expect(!listLoader.includes('response.text()'), 'Centre loader must not depend on raw profile HTML');
expect(source.includes("document.createElement('iframe')"), 'Rendered profile loader must use a same-origin iframe');
expect(source.includes("iframe.remove();"), 'Rendered profile loader cleanup missing');
expect(source.includes('extractNamingDispatchCentresFromProfileDocument'), 'Rendered DOM parser helper missing');
expect(workflow.includes('scripts/check-naming-dispatch-centre-profile-render-v1092.mjs'), 'v1.0.92 renderer regression must be permanently registered');

console.log('PASS: v1.0.92 waits for MissionChief/Vue to render the signed-in profile before reading Dispatch Centres.');
'''
Path('scripts/check-naming-dispatch-centre-profile-render-v1092.mjs').write_text(check)

workflow_path = Path('.github/workflows/validate-userscript.yml')
workflow = workflow_path.read_text()
old_path = "      - 'scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs'\n"
new_path = old_path + "      - 'scripts/check-naming-dispatch-centre-profile-render-v1092.mjs'\n"
occurrences = workflow.count(old_path)
if occurrences < 2:
    raise SystemExit(f'Expected v1.0.91 workflow path in pull_request and push blocks, got {occurrences}')
workflow = workflow.replace(old_path, new_path)
old_step = "      - name: Validate rendered profile Dispatch Centre hierarchy\n        run: node scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs\n"
if old_step not in workflow:
    # tolerate the original label from the v1.0.91 registration
    old_step = "      - name: Validate profile Dispatch Centre hierarchy\n        run: node scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs\n"
if old_step not in workflow:
    raise SystemExit('Unable to locate v1.0.91 validation step')
new_step = old_step + "\n      - name: Validate rendered profile Dispatch Centre acquisition\n        run: node scripts/check-naming-dispatch-centre-profile-render-v1092.mjs\n"
workflow = workflow.replace(old_step, new_step, 1)
workflow_path.write_text(workflow)

changelog = Path('CHANGELOG.md').read_text()
marker = 'The project uses Semantic Versioning for the unified userscript release line.\n\n'
release = '''## [1.0.92] - 2026-08-09\n\n### Fixed\n\n- Fixed the live `Profile did not expose any Dispatch Centre panels` failure in Unit Naming and Station Naming.\n- The signed-in profile is now loaded in a hidden same-origin iframe so MissionChief/Vue can render `.profile-dispatchcenter` panels before Command Nexus reads them.\n- Raw `fetch('/profile/...')` HTML is no longer used as the Dispatch Centre source because the server response can be only the pre-render application shell.\n- The rendered profile frame is bounded to 15 seconds, hidden from interaction, and removed after success or failure.\n- Dispatch Centre → Service → Station Type → Start From, row-level `leitstelle_building_id` membership, delegated Retry ownership and Personnel Assignment isolation remain unchanged.\n\n### Regression coverage\n\n- Added `scripts/check-naming-dispatch-centre-profile-render-v1092.mjs`, which starts from an empty profile shell, simulates the rendered seven-centre DOM appearing, verifies centre extraction, and requires renderer cleanup.\n- The permanent workflow now runs the renderer regression for pull requests and main updates.\n\n### Changed resource baselines\n\n- Command Nexus increased from `1.0.91` to `1.0.92`.\n- Unit Naming increased from `3.3.16` to `3.3.17`.\n- Station Naming increased from `1.3.10` to `1.3.11`.\n- Mission Finder remains `V10.6.144`.\n- Personnel Assignment remains `1.3.9`.\n\n'''
if marker not in changelog:
    raise SystemExit('Changelog insertion marker missing')
changelog = changelog.replace(marker, marker + release, 1)
Path('CHANGELOG.md').write_text(changelog)

readme = Path('README.md').read_text()
readme = replace_once(readme, '**Current version:** `1.0.91`', '**Current version:** `1.0.92`', 'README current version')
Path('README.md').write_text(readme)

src_readme = Path('src/README.md').read_text()
src_readme = replace_once(src_readme, '| Command Nexus version | `1.0.91` |', '| Command Nexus version | `1.0.92` |', 'src README current version')
Path('src/README.md').write_text(src_readme)

print('Built Command Nexus 1.0.92 rendered-profile acquisition candidate.')
