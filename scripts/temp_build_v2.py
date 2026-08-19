#!/usr/bin/env python3
from pathlib import Path

SCRIPT = Path('src/missionchief-command-nexus.user.js')
code = SCRIPT.read_text(encoding='utf-8')
forbidden = [
    'script.google.com',
    'script.googleusercontent.com',
    'Mission Analytics',
    'Sharing & Sync',
    'missionAnalytics',
    'MISSION_ANALYTICS',
    'activity recorder',
]
hits = [item for item in forbidden if item.lower() in code.lower()]
if hits:
    raise SystemExit('Clean v1.0.127 source unexpectedly contains logger signatures: ' + ', '.join(hits))

old = '// @version      1.0.127'
new = '// @version      2.0.0'
if code.count(old) != 1:
    raise SystemExit(f'Expected exactly one v1.0.127 metadata line, found {code.count(old)}')
SCRIPT.write_text(code.replace(old, new, 1), encoding='utf-8')

current_docs = [
    Path('README.md'),
    Path('src/README.md'),
    Path('docs/DEVELOPER_HANDOFF.md'),
    Path('docs/ARCHITECTURE.md'),
    Path('docs/ROADMAP.md'),
    Path('docs/MIGRATION.md'),
    Path('docs/README.md'),
]
for path in current_docs:
    text = path.read_text(encoding='utf-8')
    if '1.0.127' not in text:
        raise SystemExit(f'{path} does not contain expected current v1.0.127 baseline text')
    path.write_text(text.replace('1.0.127', '2.0.0'), encoding='utf-8')

readme = Path('README.md')
text = readme.read_text(encoding='utf-8')
marker = '**Current version:** `2.0.0`'
if marker not in text:
    raise SystemExit('README current version did not update to 2.0.0')
note = ('\n\n> **V2 clean baseline:** `2.0.0` deliberately resets production to the proven '
        '`1.0.127` operational code. Mission Analytics, Sharing & Sync, Google Apps Script '
        'uploading, external telemetry and the later `1.1.x` logger line are not part of V2.\n')
line_end = text.find('\n', text.index(marker))
readme.write_text(text[:line_end] + note + text[line_end:], encoding='utf-8')

changelog = Path('CHANGELOG.md')
text = changelog.read_text(encoding='utf-8')
anchor = '## [1.0.127] - 2026-08-16'
if text.count(anchor) != 1:
    raise SystemExit('Expected exactly one v1.0.127 changelog anchor')
section = '''## [2.0.0] - 2026-08-19

### Changed

- Reset the production line to the exact proven Command Nexus `1.0.127` operational baseline and promoted that code to the new major `2.0.0` release line.
- Deliberately abandoned the Mission Analytics / Sharing & Sync / Google Apps Script logger work introduced after `1.0.127`. V2 contains no external analytics uploader, logger outbox, activity recorder, hard-coded Apps Script endpoint or logger backend integration.
- Preserved Mission Finder `V10.6.164`, Resource Administration `V4.2.8`, Unit Naming `3.3.27`, Station Naming `1.3.22` and Personnel Assignment `1.3.12` from the proven rollback baseline.

### Safety

- Added a permanent `check-no-external-logger-v200.mjs` regression so the abandoned logger stack cannot silently return to the canonical userscript or repository integration paths.
- Historical `1.1.x` commits, tags and releases remain historical records only; they are not part of the V2 production source.

'''
changelog.write_text(text.replace(anchor, section + anchor, 1), encoding='utf-8')

regression = Path('scripts/check-no-external-logger-v200.mjs')
regression.write_text("""#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scriptPath = path.join(root, 'src', 'missionchief-command-nexus.user.js');
const code = fs.readFileSync(scriptPath, 'utf8');
const forbiddenSourceSignatures = [
  'script.google.com',
  'script.googleusercontent.com',
  'Mission Analytics',
  'Sharing & Sync',
  'missionAnalytics',
  'MISSION_ANALYTICS',
  'activity recorder',
];
const sourceHits = forbiddenSourceSignatures.filter((signature) =>
  code.toLowerCase().includes(signature.toLowerCase())
);
if (sourceHits.length) {
  throw new Error(`Command Nexus must not contain the abandoned external logger stack: ${sourceHits.join(', ')}`);
}
for (const relative of ['integrations/google-apps-script', 'integrations/google-app-script']) {
  if (fs.existsSync(path.join(root, relative))) {
    throw new Error(`Command Nexus must not restore logger backend integration path: ${relative}`);
  }
}
console.log('External logger exclusion check passed.');
""", encoding='utf-8')
