#!/usr/bin/env python3
from pathlib import Path
import base64
import gzip
import subprocess

PATCH_GZIP_B64 = "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"

ROOT = Path('.')
PATCH = ROOT / '.github/builders/mission-dashboard-v1069.patch'
PATCH.write_bytes(gzip.decompress(base64.b64decode(PATCH_GZIP_B64)))
subprocess.run(['git', 'apply', str(PATCH)], check=True)
PATCH.unlink()

for path in [ROOT / 'README.md', ROOT / 'src/README.md', *sorted((ROOT / 'scripts').glob('*.mjs'))]:
    text = path.read_text(encoding='utf-8')
    text = text.replace('1.0.68', '1.0.69').replace('V10.6.131', 'V10.6.132')
    path.write_text(text, encoding='utf-8')

changelog = ROOT / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
section = '''## [1.0.69] - 2026-07-31

### Redesigned

- Replaced the three legacy floating mission surfaces with the integrated MissionChief Nexus dashboard approved for Mission Control.
- Added a slim Mission, Settings and Diagnostics side-tab rail while preserving all existing operational control IDs and handlers.
- Moved Control Window Position, Mission Ready Delay and V10 Queue Restart into Settings.
- Moved Export Diagnostics into Diagnostics and added a persistent Event Scanner switch controlling the real mission-event collectible collector.
- Added the live footer `MissionChief Nexus V1.0.69 · MIT · Martblyth`.

### Safety

- Vehicle Load List, trained-personnel coverage, Required Personnel preload, Unit Finder, Mission Update, Auto Mode and dispatch logic remain on their established execution paths.
- iPhone/iOS mission surfaces retain their existing compact lifecycle while desktop receives the integrated dashboard presentation.
- Added permanent dashboard ownership, collector-gate and footer regression coverage.

### Changed engine baseline

- Mission Finder increased from `V10.6.131` to `V10.6.132`.
- Personnel Assignment remains `1.3.8`.


'''
anchor = '## [1.0.68]'
if section not in text:
    index = text.index(anchor)
    text = text[:index] + section + text[index:]
changelog.write_text(text, encoding='utf-8')

test = r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (value, message) => { if (!value) fail(message); };

function extractFunction(name) {
  const match = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  if (!match) fail(`Unable to find ${name}`);
  const start = match.index;
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
    if (character === '"' || character === "'" || character === '`') { quote = character; continue; }
    if (character === '/' && next === '/') { const end = source.indexOf('\n', index + 2); index = end < 0 ? source.length : end; continue; }
    if (character === '/' && next === '*') { const end = source.indexOf('*/', index + 2); if (end < 0) fail(`Unclosed comment in ${name}`); index = end + 1; continue; }
    if (character === '{') depth += 1;
    if (character === '}') { depth -= 1; if (depth === 0) return source.slice(start, index + 1); }
  }
  fail(`Unable to extract ${name}`);
}

expect(source.includes('// @version      1.0.69'), 'Command Nexus 1.0.69 metadata missing');
expect(source.includes('MISSION FINDER V10.6.132'), 'Mission Finder V10.6.132 header missing');
const panel = extractFunction('createControlPanel');
const startScanner = extractFunction('startMissionEventCollectibleCollector');
const styles = extractFunction('injectStyles');

for (const token of [
  "dashboardRail.id = 'mf-dashboard-rail'",
  'data-mf-dashboard-tab="mission"',
  'data-mf-dashboard-tab="settings"',
  'data-mf-dashboard-tab="diagnostics"',
  "settingsPane.id = 'mf-dashboard-settings-pane'",
  "diagnosticsPane.id = 'mf-dashboard-diagnostics-pane'",
  'settingsPane.appendChild(advancedBody)',
  'diagnosticsPane.appendChild(diagnosticsBtn)',
  "eventScannerBox.id = 'mf-event-scanner-box'",
  "MF_EVENT_SCANNER_ENABLED_KEY",
  'startMissionEventCollectibleCollector()',
  'stopMissionEventCollectibleCollector()',
  'MissionChief Nexus V${dashboardVersion} · MIT · Martblyth',
]) expect(panel.includes(token) || source.includes(token), `Dashboard contract missing ${token}`);

expect(startScanner.includes('!mfEventScannerEnabled'), 'Event collector must obey the user Event Scanner switch');
expect(styles.includes('mf-dashboard-utility-open'), 'Integrated dashboard layout CSS missing');
expect(styles.includes('#mf-dashboard-footer'), 'Dashboard footer CSS missing');

const primaryStart = panel.indexOf("primaryActions.className");
const primaryEnd = panel.indexOf('controlBody.appendChild(primaryActions)', primaryStart);
const primaryBlock = panel.slice(primaryStart, primaryEnd);
expect(!primaryBlock.includes('primaryActions.appendChild(diagnosticsBtn);\n        controlBody'), 'Diagnostics must not remain an unconditional Mission Control action');
expect(panel.indexOf('settingsPane.appendChild(advancedBody)') < panel.indexOf('const unitFinderBtn'), 'Settings ownership must be established before action creation');
expect(panel.includes('wrapper.appendChild(loadPanel);\n        wrapper.appendChild(trainedPanel);\n        document.body.appendChild(wrapper);\n\n        scheduleMissionRequiredPersonnelPreload(0);'), 'Required Personnel preload lifecycle must remain intact');

console.log('Mission dashboard V10.6.132 ownership and lifecycle checks passed.');
'''
(ROOT / 'scripts/check-mission-dashboard-v1069.mjs').write_text(test, encoding='utf-8')

workflow = ROOT / '.github/workflows/validate-userscript.yml'
workflow_text = workflow.read_text(encoding='utf-8')
path_line = "      - 'scripts/check-mission-dashboard-v1069.mjs'\n"
first_anchor = "      - 'scripts/check-unit-finder-diagnostic-export.mjs'\n"
if workflow_text.count(path_line) < 2:
    workflow_text = workflow_text.replace(first_anchor, first_anchor + path_line)
step_anchor = "      - name: Validate Unit Finder diagnostic export\n        run: node scripts/check-unit-finder-diagnostic-export.mjs\n"
step = "\n      - name: Validate integrated MissionChief Nexus dashboard\n        run: node scripts/check-mission-dashboard-v1069.mjs\n"
if step not in workflow_text:
    workflow_text = workflow_text.replace(step_anchor, step_anchor + step)
workflow.write_text(workflow_text, encoding='utf-8')

print('Applied MissionChief Nexus dashboard release 1.0.69 / V10.6.132.')
