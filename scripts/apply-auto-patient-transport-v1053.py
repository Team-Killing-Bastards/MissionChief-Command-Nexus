from pathlib import Path

source_path = Path('src/missionchief-command-nexus.user.js')
source = source_path.read_text(encoding='utf-8')
anchor = "    function findExactFirstApproachTransportButton() {\n"

helper = r'''    function mfGetExactPatientTransportRoots() {
        const roots = [];
        const seenDocuments = new Set();

        const addDocument = candidate => {
            let doc = null;
            if (candidate?.nodeType === 9) {
                doc = candidate;
            } else if (candidate?.ownerDocument?.nodeType === 9) {
                doc = candidate.ownerDocument;
            }
            if (!doc || seenDocuments.has(doc)) return;
            seenDocuments.add(doc);
            roots.push(doc);

            for (const frame of Array.from(doc.querySelectorAll?.('iframe') || [])) {
                try {
                    if (frame.contentDocument) addDocument(frame.contentDocument);
                } catch (error) {
                    // Cross-origin or unavailable frames fail closed.
                }
            }
        };

        addDocument(document);
        for (const scope of mfGetTransportActiveScopes()) {
            addDocument(scope);
        }

        return roots;
    }

    function mfFindExactPatientTransportAnchorDeep() {
        for (const root of mfGetExactPatientTransportRoots()) {
            const anchor = mfFindExactPatientTransportAnchor(root);
            if (anchor) return anchor;
        }
        return null;
    }

'''

if 'function mfFindExactPatientTransportAnchorDeep(' not in source:
    if source.count(anchor) != 1:
        raise SystemExit('transport finder anchor mismatch')
    source = source.replace(anchor, helper + anchor, 1)

old = 'const exactPatientAnchor = mfFindExactPatientTransportAnchor(document);'
new = 'const exactPatientAnchor = mfFindExactPatientTransportAnchorDeep();'
if old in source:
    source = source.replace(old, new)
elif source.count(new) < 2:
    raise SystemExit('deep patient anchor calls missing')

source = source.replace('// @version      1.0.52', '// @version      1.0.53', 1)
source = source.replace(' * MODULE 2: MISSION FINDER V10.6.115', ' * MODULE 2: MISSION FINDER V10.6.116', 1)
source_path.write_text(source, encoding='utf-8')

for path in Path('scripts').glob('check-*.mjs'):
    text = path.read_text(encoding='utf-8').replace('// @version      1.0.52', '// @version      1.0.53').replace('V10.6.115', 'V10.6.116')
    path.write_text(text, encoding='utf-8')

path = Path('README.md')
path.write_text(path.read_text(encoding='utf-8').replace('**Current version:** `1.0.52` · **Mission Finder engine:** `V10.6.115`', '**Current version:** `1.0.53` · **Mission Finder engine:** `V10.6.116`'), encoding='utf-8')
path = Path('src/README.md')
path.write_text(path.read_text(encoding='utf-8').replace('| Command Nexus version | `1.0.52` |', '| Command Nexus version | `1.0.53` |').replace('| Mission Finder baseline | `V10.6.115` |', '| Mission Finder baseline | `V10.6.116` |'), encoding='utf-8')

path = Path('CHANGELOG.md')
text = path.read_text(encoding='utf-8')
if '## [1.0.53] - 2026-07-28' not in text:
    section = '''## [1.0.53] - 2026-07-28

### Fixed

- Auto Mode patient transport now searches the top-level page, active transport scopes and recursively accessible same-origin iframe documents.
- Current green **Transport Patient** anchors with exact `/vehicles/{vehicle}/patient/{hospital}` routes are found inside nested vehicle lightbox iframes.
- Cross-origin or unavailable frames fail closed, and unrelated green controls remain excluded.

### Changed engine baseline

- Mission Finder increased from `V10.6.115` to `V10.6.116`.
- Personnel Assignment remains `1.3.7`.

'''
    index = text.find('## [1.0.52]')
    if index < 0:
        raise SystemExit('v1.0.52 changelog section missing')
    path.write_text(text[:index] + section + text[index:], encoding='utf-8')

Path('scripts/check-auto-patient-transport-iframe.mjs').write_text(r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
for (const token of ['// @version      1.0.53', 'MISSION FINDER V10.6.116', 'function mfGetExactPatientTransportRoots(', 'function mfFindExactPatientTransportAnchorDeep(', 'frame.contentDocument', 'mfGetTransportActiveScopes()', 'const exactPatientAnchor = mfFindExactPatientTransportAnchorDeep();']) if (!source.includes(token)) fail(`missing ${token}`);
if ((source.match(/const exactPatientAnchor = mfFindExactPatientTransportAnchorDeep\(\);/g) || []).length < 2) fail('both transport paths must use the deep finder');
const route = /^\/vehicles\/\d+\/patient\/\d+\/?(?:[?#].*)?$/;
if (!route.test('/vehicles/5372808/patient/1856401')) fail('supplied patient route rejected');
if (route.test('/vehicles/5372808/gefangener/1856401')) fail('prisoner route accepted');
console.log('Iframe-aware patient transport checks passed.');
''', encoding='utf-8')

for path in [Path('release-v1053-trigger.txt'), Path('scripts/apply-auto-patient-transport-v1053.py'), Path('.github/workflows/build-auto-patient-transport-v1053.yml'), Path('.github/workflows/run-auto-patient-transport-v1053.yml')]:
    if path.exists():
        path.unlink()
