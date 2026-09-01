from pathlib import Path
import hashlib
import json
import subprocess

SOURCE = Path('src/missionchief-command-nexus.user.js')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


source = SOURCE.read_text(encoding='utf-8')
if source.count('3.0.40') < 3:
    raise SystemExit('Expected the 3.0.40 production source baseline.')
if 'MISSION FINDER V10.6.177' not in source:
    raise SystemExit('Expected Mission Finder V10.6.177 baseline.')

source = source.replace('3.0.40', '3.0.41')
source = source.replace('10.6.177', '10.6.178')
source = replace_once(
    source,
    '"Airfield Firefighting Command Vehicle": "Airfield FF Command Vehicle", "ICCU or Ambulance Control Units or Airfield Firefighting Command Vehicles": "Airfield FF Command Vehicle"',
    '"Airfield Firefighting Command Vehicle": "Airfield FF Command Vehicle", "Airfield Firefighting Command Vehicles": "Airfield FF Command Vehicle", "ICCU or Ambulance Control Units or Airfield Firefighting Command Vehicles": "Airfield FF Command Vehicle"',
    'standalone plural Airfield Firefighting Command Vehicle mapping',
)
SOURCE.write_text(source, encoding='utf-8')

# Permanent executable regression for the exact Hot Brakes requirement wording.
Path('scripts/check-airfield-firefighting-command-vehicle-mapping-v106178.mjs').write_text(r'''#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const moduleStart = source.indexOf('MODULE 2: MISSION FINDER V10.6.178');
assert.ok(moduleStart >= 0, 'Mission Finder 10.6.178 must be present');
const marker = 'const crossReference = ';
const start = source.indexOf(marker, moduleStart);
assert.ok(start >= 0, 'crossReference map must be present');
const objectStart = start + marker.length;
const end = source.indexOf(';\n', objectStart);
assert.ok(end > objectStart, 'crossReference object must terminate');
const context = { result: null };
vm.runInNewContext(`result = (${source.slice(objectStart, end)})`, context);
const map = context.result;

assert.equal(
  map['Airfield Firefighting Command Vehicle'],
  'Airfield FF Command Vehicle',
  'singular standalone requirement must keep its canonical selector'
);
assert.equal(
  map['Airfield Firefighting Command Vehicles'],
  'Airfield FF Command Vehicle',
  'Hot Brakes plural standalone requirement must select the command vehicle'
);
assert.equal(
  map['Fire Officers or Airfield Firefighting Command Vehicles'],
  'Fire Officer',
  'the separate Fire Officer alternative must remain unchanged'
);
assert.equal(
  map['ICCU or Ambulance Control Units or Airfield Firefighting Command Vehicles'],
  'Airfield FF Command Vehicle',
  'the existing multi-role command-vehicle alternative must remain unchanged'
);

const normalised = new Map(Object.entries(map).map(([key, value]) => [
  String(key).replace(/\s+/g, ' ').trim().toLowerCase(), value,
]));
const diagnosticRequirement = 'Airfield Firefighting Command Vehicles';
assert.equal(
  normalised.get(diagnosticRequirement.toLowerCase()),
  'Airfield FF Command Vehicle',
  'the exact v3.0.40 diagnostic requirement must no longer pass through unmapped'
);
assert.notEqual(
  normalised.get(diagnosticRequirement.toLowerCase()),
  diagnosticRequirement,
  'the standalone plural requirement must not remain its own unmapped name'
);

console.log('PASS: standalone singular/plural Airfield Firefighting Command Vehicle requirements map to the canonical vehicle while the Fire Officer alternative remains separate.');
''', encoding='utf-8')

# Release notes and normal documentation references.
changelog = Path('CHANGELOG.md')
text = changelog.read_text(encoding='utf-8')
entry = """## [3.0.41] - 2026-09-01

### Fixed

- Map the standalone plural `Airfield Firefighting Command Vehicles` requirement used by **Hot Brakes - Code D** to the existing `Airfield FF Command Vehicle` selector.
- Preserve `Fire Officers or Airfield Firefighting Command Vehicles` as the separate Fire Officer alternative; the new mapping applies only when the command vehicle is explicitly required.
- Add an executable regression using the exact v3.0.40 diagnostic wording and bump Mission Finder from `V10.6.177` to `V10.6.178`.
- Increased the unified userscript version from `3.0.40` to `3.0.41`.

"""
if '## [3.0.41]' not in text:
    text = text.replace('## [Unreleased]\n\n', '## [Unreleased]\n\n' + entry, 1)
changelog.write_text(text, encoding='utf-8')

for filename in [
    'README.md', 'src/README.md', 'docs/ARCHITECTURE.md',
    'docs/DEVELOPER_HANDOFF.md', 'docs/MIGRATION.md',
    'docs/README.md', 'docs/ROADMAP.md',
]:
    path = Path(filename)
    data = path.read_text(encoding='utf-8')
    data = data.replace('3.0.40', '3.0.41')
    data = data.replace('10.6.177', '10.6.178')
    path.write_text(data, encoding='utf-8')

# Keep a compact, sanitised evidence record rather than copying the raw export.
evidence_path = Path('docs/evidence/hot-brakes-airfield-command-v3.0.40-2026-09-01.md')
evidence_path.write_text('''# Hot Brakes standalone Airfield command mapping failure — v3.0.40

## Source

User-supplied Command Nexus `3.0.40` diagnostic exported on 1 September 2026 plus the MissionChief **Hot Brakes - Code D** requirement table screenshot.

## Confirmed evidence

Mission `259758977` exposed the standalone requirement `Airfield Firefighting Command Vehicles` with a required count of one. The diagnostic retained the same text as its `mappedName`, selected zero and recorded a shortfall of one. This proves the plural standalone wording missed the existing singular cross-reference rather than proving the account owned no valid vehicle.

The same mission definition also contains `Fire Officers or Airfield Firefighting Command Vehicles`. That combined alternative already maps to `Fire Officer` and must remain separate from the explicit command-vehicle requirement.

A later Hot Brakes mission stopped for `Police Inspector Trained Police IRV: 1 trained personnel short`. That is an independent fail-closed personnel issue and is not resolved by the command-vehicle alias.

## Correction

Command Nexus `3.0.41` / Mission Finder `10.6.178` maps both standalone singular and plural Airfield Firefighting Command Vehicle requirements to `Airfield FF Command Vehicle`, while preserving the Fire Officer alternative unchanged.

## Live acceptance

Open or process Hot Brakes - Code D and verify that the standalone command-vehicle row selects one eligible Airfield FF Command Vehicle. A genuine Police Inspector shortage may still block Dispatch independently.
''', encoding='utf-8')

evidence_index = Path('docs/evidence/README.md')
evidence_text = evidence_index.read_text(encoding='utf-8')
line = '- [Hot Brakes standalone Airfield command mapping failure — v3.0.40](hot-brakes-airfield-command-v3.0.40-2026-09-01.md)\n'
if line not in evidence_text:
    evidence_text = evidence_text.rstrip() + '\n' + line
evidence_index.write_text(evidence_text, encoding='utf-8')

# Candidate project state; public production remains 3.0.40 until the release job publishes 3.0.41.
state_path = Path('project-state.json')
state = json.loads(state_path.read_text(encoding='utf-8'))
source_bytes = SOURCE.stat().st_size
source_sha = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
state['lastUpdated'] = '2026-09-01'
state['canonical']['status'] = 'candidate'
state['canonical']['version'] = '3.0.41'
state['canonical']['sourceBytes'] = source_bytes
state['canonical']['sourceSha256'] = source_sha
state['canonical']['components']['missionFinder'] = '10.6.178'
evidence_id = 'RUN-2026-09-01-V3040-HOT-BRAKES'
if not any(item.get('id') == evidence_id for item in state['evidence']):
    state['evidence'].append({
        'id': evidence_id,
        'title': 'Hot Brakes standalone Airfield command mapping failure',
        'file': str(evidence_path),
        'kind': 'sanitised-summary',
        'supports': ['Airfield Firefighting Command Vehicle mapping'],
    })
for risk in state.get('knownRisks', []):
    if risk.get('id') == 'RISK-LIVE-001':
        risk['summary'] = 'The 3.0.41 standalone Airfield Firefighting Command Vehicle mapping requires live Hot Brakes validation.'
        risk['mitigation'] = 'Run Hot Brakes - Code D on 3.0.41 and confirm the explicit command-vehicle row selects an eligible Airfield FF Command Vehicle; treat any Police Inspector shortage separately.'
state['handover']['nextAction'] = 'Live-validate the 3.0.41 Hot Brakes Airfield command mapping, then begin GitHub issue #396 with the read-only runtime-retention audit.'
if str(evidence_path) not in state['handover']['readOrder']:
    state['handover']['readOrder'].insert(-1, str(evidence_path))
state_path.write_text(json.dumps(state, indent=2) + '\n', encoding='utf-8')
subprocess.run(['node', 'scripts/render-project-state.mjs'], check=True)

# Remove every one-use inspection/build artifact before validation and commit.
for path in Path('.').glob('.tmp-v3041-*.txt'):
    path.unlink()
Path('.github/workflows/_temporary-v3041-airfield-mapping-inspection.yml').unlink()
Path('scripts/_temporary-build-v3041-airfield-command-mapping.py').unlink()

print(f'Candidate userscript size: {source_bytes} bytes')
print(f'Candidate SHA-256: {source_sha}')
if source_bytes >= 2 * 1024 * 1024:
    raise SystemExit(f'Candidate exceeds the 2 MiB userscript ceiling: {source_bytes}')
