from pathlib import Path

source_path = Path('src/missionchief-command-nexus.user.js')
source = source_path.read_text(encoding='utf-8')
finder = "    function findExactFirstApproachTransportButton() {\n"

if 'function mfIsExactPatientTransportAnchor(' not in source:
    helper = r'''    function mfIsExactPatientTransportAnchor(element) {
        if (!element || String(element.tagName || '').toLowerCase() !== 'a') return false;
        const href = String(element.getAttribute?.('href') || '').trim();
        const className = String(element.className || '');
        if (!/(?:^|\s)btn-success(?:\s|$)/.test(className)) return false;
        if (!/^\/vehicles\/\d+\/patient\/\d+\/?(?:[?#].*)?$/.test(href)) return false;
        if (element.getAttribute?.('aria-disabled') === 'true') return false;
        if (element.classList?.contains?.('disabled')) return false;
        return true;
    }

    function mfFindExactPatientTransportAnchor(root = document) {
        const candidates = Array.from(root?.querySelectorAll?.('a.btn-success[href*="/patient/"]') || []);
        for (const candidate of candidates) {
            if (!mfIsExactPatientTransportAnchor(candidate)) continue;
            try { if (!isElementVisible(candidate)) continue; } catch (error) { continue; }
            return candidate;
        }
        return null;
    }

'''
    if source.count(finder) != 1:
        raise SystemExit('Exact transport finder anchor mismatch')
    source = source.replace(finder, helper + finder, 1)

old = finder + "        const deepButton = mfFindAnyVisibleApproachButtonDeep();\n"
new = finder + "        const exactPatientAnchor = mfFindExactPatientTransportAnchor(document);\n\n        if (exactPatientAnchor) return exactPatientAnchor;\n\n        const deepButton = mfFindAnyVisibleApproachButtonDeep();\n"
if old in source:
    source = source.replace(old, new, 1)
elif new not in source:
    raise SystemExit('Normal transport path patch failed')

old = "    function mfBruteFindFirstApproachButton() {\n        // This helper already performs the deep transport-scope lookup, so do\n"
new = "    function mfBruteFindFirstApproachButton() {\n        const exactPatientAnchor = mfFindExactPatientTransportAnchor(document);\n\n        if (exactPatientAnchor) return exactPatientAnchor;\n\n        // This helper already performs the deep transport-scope lookup, so do\n"
if old in source:
    source = source.replace(old, new, 1)
elif new not in source:
    raise SystemExit('Brute transport path patch failed')

source = source.replace('// @version      1.0.51', '// @version      1.0.52', 1)
source = source.replace(' * MODULE 2: MISSION FINDER V10.6.114', ' * MODULE 2: MISSION FINDER V10.6.115', 1)
source_path.write_text(source, encoding='utf-8')

for path in Path('scripts').glob('check-*.mjs'):
    text = path.read_text(encoding='utf-8').replace('// @version      1.0.51', '// @version      1.0.52').replace('V10.6.114', 'V10.6.115')
    path.write_text(text, encoding='utf-8')

path = Path('README.md')
path.write_text(path.read_text(encoding='utf-8').replace('**Current version:** `1.0.51` · **Mission Finder engine:** `V10.6.114`', '**Current version:** `1.0.52` · **Mission Finder engine:** `V10.6.115`'), encoding='utf-8')
path = Path('src/README.md')
path.write_text(path.read_text(encoding='utf-8').replace('| Command Nexus version | `1.0.51` |', '| Command Nexus version | `1.0.52` |').replace('| Mission Finder baseline | `V10.6.114` |', '| Mission Finder baseline | `V10.6.115` |'), encoding='utf-8')

path = Path('CHANGELOG.md')
text = path.read_text(encoding='utf-8')
if '## [1.0.52] - 2026-07-28' not in text:
    section = '''## [1.0.52] - 2026-07-28

### Fixed

- Restored Auto Mode patient transport clicking for MissionChief's current green **Transport Patient** anchor with an exact `/vehicles/{vehicle}/patient/{hospital}` route.
- The exact visible enabled patient route is checked before both legacy **Approach** paths; unrelated green links remain excluded.

### Changed engine baseline

- Mission Finder increased from `V10.6.114` to `V10.6.115`.
- Personnel Assignment remains `1.3.7`.

'''
    index = text.find('## [1.0.51]')
    if index < 0:
        raise SystemExit('v1.0.51 changelog section missing')
    path.write_text(text[:index] + section + text[index:], encoding='utf-8')

Path('scripts/check-auto-patient-transport-anchor.mjs').write_text(r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
for (const token of ['// @version      1.0.52', 'MISSION FINDER V10.6.115', 'function mfIsExactPatientTransportAnchor(', 'function mfFindExactPatientTransportAnchor(', 'a.btn-success[href*="/patient/"]', '/^\\/vehicles\\/\\d+\\/patient\\/\\d+\\/?(?:[?#].*)?$/']) if (!source.includes(token)) fail(`missing ${token}`);
if ((source.match(/const exactPatientAnchor = mfFindExactPatientTransportAnchor\(document\);/g) || []).length < 2) fail('both transport paths must use exact patient anchor');
const route = /^\/vehicles\/\d+\/patient\/\d+\/?(?:[?#].*)?$/;
if (!route.test('/vehicles/5033562/patient/1862688')) fail('supplied current route rejected');
if (route.test('/missions/5033562/patient/1862688') || route.test('/vehicles/5033562/gefangener/1862688')) fail('unrelated route accepted');
console.log('Auto Mode patient transport anchor checks passed.');
''', encoding='utf-8')

for path in [Path('.diagnostics/auto-patient-transport-v1052.md'), Path('.diagnostics/auto-patient-transport-v1052-branch.md'), Path('.github/workflows/inspect-auto-patient-transport-once.yml'), Path('.github/workflows/build-auto-patient-transport-v1052.yml'), Path('scripts/apply-auto-patient-transport-v1052.py')]:
    if path.exists():
        path.unlink()
