#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source_path = ROOT / 'src/missionchief-command-nexus.user.js'
source = source_path.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


source = replace_once(source, '// @version      1.0.99', '// @version      1.0.100', 'userscript version')
source = replace_once(source, ' * MODULE 2: MISSION FINDER V10.6.148', ' * MODULE 2: MISSION FINDER V10.6.149', 'Mission Finder version')

old_drone_set = '''    const MF_POLICE_DRONE_REQUIREMENT_NAMES = new Set([
        'police drone',
        'police drones',
        'required police drone',
        'required police drones',
        'drone vehicle(police station)',
        'drone vehicle (police station)',
        'drone vehicle police station'
    ]);'''
new_drone_set = '''    const MF_POLICE_DRONE_REQUIREMENT_NAMES = new Set([
        'police drone',
        'police drones',
        'required police drone',
        'required police drones',
        'require drone',
        'require drones',
        'required drone',
        'required drones',
        'requires drone',
        'requires drones',
        'drone vehicle(police station)',
        'drone vehicle (police station)',
        'drone vehicle police station'
    ]);'''
source = replace_once(source, old_drone_set, new_drone_set, 'Police Drone requirement aliases')

old_crossref = '''        "Required Police Helicopters or Drones": "Police Helicopter",
        "Police Drone": "Police Helicopter",
        "Police Drones": "Police Helicopter",'''
new_crossref = '''        "Required Police Helicopters or Drones": "Police Helicopter",
        "Require Drone": "Police Helicopter",
        "Require Drones": "Police Helicopter",
        "Required Drone": "Police Helicopter",
        "Required Drones": "Police Helicopter",
        "Requires Drone": "Police Helicopter",
        "Requires Drones": "Police Helicopter",
        "Police Drone": "Police Helicopter",
        "Police Drones": "Police Helicopter",'''
source = replace_once(source, old_crossref, new_crossref, 'Police Drone cross-reference aliases')
source_path.write_text(source, encoding='utf-8')

# Keep permanent regression metadata pinned to the production candidate.
for path in (ROOT / 'scripts').glob('check-*.mjs'):
    text = path.read_text(encoding='utf-8')
    text = text.replace('// @version      1.0.99', '// @version      1.0.100')
    text = text.replace('MISSION FINDER V10.6.148', 'MISSION FINDER V10.6.149')
    text = text.replace('Mission Finder V10.6.148', 'Mission Finder V10.6.149')
    text = text.replace('Expected Command Nexus 1.0.99', 'Expected Command Nexus 1.0.100')
    text = text.replace('Expected Mission Finder V10.6.148', 'Expected Mission Finder V10.6.149')
    path.write_text(text, encoding='utf-8')

regression_path = ROOT / 'scripts/check-police-drone-requirement-v10100.mjs'
regression_path.write_text(r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Unable to find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false, regex = false, regexClass = false;
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
    if (regex) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === '[') regexClass = true;
      if (c === ']') regexClass = false;
      if (c === '/' && !regexClass) regex = false;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '/' && /[=(,:;!&|?{}\[\]\n]/.test(source[i - 1] || '\n')) { regex = true; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(`Unterminated ${name}`);
}

expect(source.includes('// @version      1.0.100'), 'Expected Command Nexus 1.0.100');
expect(source.includes(' * MODULE 2: MISSION FINDER V10.6.149'), 'Expected Mission Finder V10.6.149');

const setMarker = 'const MF_POLICE_DRONE_REQUIREMENT_NAMES = new Set([';
const setStart = source.indexOf(setMarker);
const setEnd = source.indexOf(']);', setStart);
expect(setStart >= 0 && setEnd > setStart, 'Police Drone requirement-name set missing');
const droneSet = source.slice(setStart, setEnd + 3);
for (const alias of ['require drone', 'require drones', 'required drone', 'required drones', 'requires drone', 'requires drones']) {
  expect(droneSet.includes(`'${alias}'`), `Missing reported Police Drone requirement alias: ${alias}`);
}
expect(!/\n\s*'drone',/.test(droneSet), 'Bare Drone must not become a broad cross-service alias');
expect(!/\n\s*'drones',/.test(droneSet), 'Bare Drones must not become a broad cross-service alias');

for (const alias of ['Require Drone', 'Require Drones', 'Required Drone', 'Required Drones', 'Requires Drone', 'Requires Drones']) {
  expect(source.includes(`"${alias}": "Police Helicopter"`), `Missing cross-reference alias: ${alias}`);
}

const mode = extractFunction('getPoliceAirRequirementMode');
expect(mode.includes('MF_POLICE_DRONE_REQUIREMENT_NAMES.has(raw)'), 'Police-air mode must classify original Drone requirement wording');
expect(mode.includes('MF_POLICE_DRONE_REQUIREMENT_NAMES.has(mapped)'), 'Police-air mode must classify mapped Drone requirement wording');
expect(mode.includes("return 'drone';"), 'Police-air requirement must enter drone-only mode');

const checkbox = extractFunction('isPoliceDroneCheckbox');
expect(checkbox.includes(".includes('91')"), 'Police Drone requirement must select exact MissionChief vehicle type 91');
expect(checkbox.includes('drone vehicle (police station)'), 'Police Drone checkbox matcher must retain the Police Station vehicle wording');

expect(/policeAirMode\s*===\s*'drone'[\s\S]{0,700}eligible\.filter\([\s\S]{0,160}isPoliceDroneCheckbox/.test(source), 'Drone-only candidate selection must filter to Police Drone Vehicle checkboxes');
expect(source.includes('matches = isPoliceDroneCheckbox(input);'), 'Selected-unit verification must keep the exact Police Drone matcher');
expect(source.includes('// Flexible wording only: Drone first, Police Helicopter fallback.'), 'Flexible helicopter-or-drone fallback contract missing');

console.log('PASS: Require/Required/Requires Drone aliases enter the existing police drone-only route and select exact type 91 Police Drone Vehicle without creating a broad bare-Drone alias.');
''', encoding='utf-8')

# Chain the new permanent regression through the established recovery/Search-Dog gate.
rescue_path = ROOT / 'scripts/check-rescue-dog-search-dog-v1098.mjs'
rescue = rescue_path.read_text(encoding='utf-8')
rescue = replace_once(
    rescue,
    "import vm from 'node:vm';\n",
    "import vm from 'node:vm';\nawait import('./check-police-drone-requirement-v10100.mjs');\n",
    'Police Drone regression chain'
)
rescue_path.write_text(rescue, encoding='utf-8')

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(readme, '**Current version:** `1.0.99`', '**Current version:** `1.0.100`', 'README version')
readme = replace_once(readme, '**Mission Finder engine:** `V10.6.148`', '**Mission Finder engine:** `V10.6.149`', 'README Mission Finder')
readme_path.write_text(readme, encoding='utf-8')

src_readme_path = ROOT / 'src/README.md'
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = replace_once(src_readme, '| Command Nexus version | `1.0.99` |', '| Command Nexus version | `1.0.100` |', 'src README version')
src_readme = replace_once(src_readme, '| Mission Finder baseline | `V10.6.148` |', '| Mission Finder baseline | `V10.6.149` |', 'src README Mission Finder')
src_readme_path.write_text(src_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## [1.0.100] - 2026-08-11

### Fixed

- Added MissionChief Police requirement aliases **Require Drone**, **Requires Drone** and **Required Drone** (plus plural forms) to the existing Police Drone cross-reference.
- These requirement labels enter the established drone-only Police Air path and select exact MissionChief vehicle type `91`, **Police Drone Vehicle / Drone Vehicle (Police Station)**.
- Existing helicopter-only and explicit **Police Helicopter or Drone** flexible behavior remains unchanged.
- A bare **Drone** / **Drones** alias is deliberately not added, avoiding accidental capture of unrelated cross-service drone wording.

### Regression coverage

- Added `scripts/check-police-drone-requirement-v10100.mjs` to lock the reported aliases, exact type-91 selection, drone-only routing, selected-unit verification and the no-bare-Drone guard.
- Chained the new check through the existing Search Dog / recovery regression path so the permanent validation gate continues to cover it without adding another workflow step.

### Changed engine baseline

- Command Nexus increased from `1.0.99` to `1.0.100`.
- Mission Finder increased from `V10.6.148` to `V10.6.149`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

'''
changelog = replace_once(changelog, '## [1.0.99] - 2026-08-11\n', entry + '## [1.0.99] - 2026-08-11\n', 'CHANGELOG insertion')
changelog_path.write_text(changelog, encoding='utf-8')

print('Built Command Nexus 1.0.100 Police Drone requirement alias candidate.')
