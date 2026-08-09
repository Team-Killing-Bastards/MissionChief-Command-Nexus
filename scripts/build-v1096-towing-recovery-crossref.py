#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src' / 'missionchief-command-nexus.user.js'


def require(text: str, token: str, label: str) -> None:
    if token not in text:
        raise SystemExit(f'ERROR: missing {label}: {token!r}')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'ERROR: expected exactly one {label}, found {count}')
    return text.replace(old, new, 1)


def replace_js_function(text: str, name: str, replacement: str) -> str:
    marker = f'function {name}('
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'ERROR: unable to find function {name}')
    brace = text.find('{', start)
    if brace < 0:
        raise SystemExit(f'ERROR: unable to find opening brace for {name}')

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
                i += 1
                continue
            if c == '\\':
                escaped = True
                i += 1
                continue
            if c == quote:
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
        if c in ('\'', '"', '`'):
            quote = c
            i += 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return text[:start] + replacement + text[i + 1:]
        i += 1
    raise SystemExit(f'ERROR: unterminated function {name}')


source = SOURCE.read_text(encoding='utf-8')
require(source, '// @version      1.0.95', 'Command Nexus 1.0.95 baseline')
require(source, 'MISSION FINDER V10.6.144', 'Mission Finder V10.6.144 baseline')
require(source, 'function isCarsToTowRequirementName(', 'towing alias matcher')
require(source, 'function isFlatbedRecoveryVehicleRequirement(', 'Flatbed Recovery requirement classifier')
require(source, 'function isFlatbedRecoveryVehicleCheckbox(input)', 'Flatbed Recovery checkbox matcher')
require(source, "getVehicleTypeIdentifiers(input)\n            .includes('105')", 'exact type-105 Recovery matcher')
require(source, 'function getCarsToTowVehicleRequirement(', 'towing quantity converter')

new_matcher = '''function isCarsToTowRequirementName(name) {
        // Historical helper name retained because the existing towing converter and
        // strict Flatbed Recovery selector both use it. Match explicit towing language
        // only: an ordinary "truck" requirement must never become Recovery demand.
        let key = normalise(name);
        key = key
            .replace(/^required\\s+/, '')
            .replace(/^\\d+\\s+/, '')
            .replace(/\\s+\\d+$/, '');

        if (
            /^(?:cars?|trucks?|lorr(?:y|ies)|vans?|vehicles?)\\s+(?:to\\s+tow|to\\s+be\\s+towed)$/.test(key)
        ) {
            return true;
        }

        return /^(?:tow|recovery)\\s+trucks?$/.test(key);
    }'''
source = replace_js_function(source, 'isCarsToTowRequirementName', new_matcher)
source = source.replace('// @version      1.0.95', '// @version      1.0.96', 1)
source = source.replace('V10.6.144', 'V10.6.145')
SOURCE.write_text(source, encoding='utf-8')

# Every permanent regression that pins the current release/engine baseline moves
# with this Mission Finder change. Historical labels are intentionally left alone.
for path in sorted((ROOT / 'scripts').glob('check-*.mjs')):
    text = path.read_text(encoding='utf-8')
    text = text.replace('// @version      1.0.95', '// @version      1.0.96')
    text = text.replace('V10.6.144', 'V10.6.145')
    path.write_text(text, encoding='utf-8')

bulk = ROOT / 'scripts' / 'check-bulk-trained-register-update.mjs'
bulk_text = bulk.read_text(encoding='utf-8')
chain = "await import('./check-towing-recovery-crossref-v1096.mjs');\n"
if chain not in bulk_text:
    anchor = "import { readFile } from 'node:fs/promises';\n"
    require(bulk_text, anchor, 'bulk regression import anchor')
    bulk_text = bulk_text.replace(anchor, anchor + chain, 1)
bulk_text = bulk_text.replace(
    'and singular/plural towing uses exact type-105 recovery vehicles.',
    'and explicit car/truck/lorry/van/vehicle towing aliases use exact type-105 recovery vehicles.'
)
bulk.write_text(bulk_text, encoding='utf-8')

readme = ROOT / 'README.md'
readme_text = readme.read_text(encoding='utf-8')
readme_text = replace_once(
    readme_text,
    '**Current version:** `1.0.95` · **Mission Finder engine:** `V10.6.144`',
    '**Current version:** `1.0.96` · **Mission Finder engine:** `V10.6.145`',
    'README current version line'
)
old_tow = '- `Car Recovery`, `Car to tow`, and `Cars to tow` use exact type-105 Flatbed Recovery Vehicles.'
new_tow = '- `Car Recovery` plus explicit car, truck, lorry, van or vehicle towing wording (for example `1 truck to tow`) uses exact type-105 Flatbed Recovery Vehicles.'
if old_tow in readme_text:
    readme_text = readme_text.replace(old_tow, new_tow, 1)
readme.write_text(readme_text, encoding='utf-8')

src_readme = ROOT / 'src' / 'README.md'
sr = src_readme.read_text(encoding='utf-8')
sr = sr.replace('| Command Nexus version | `1.0.95` |', '| Command Nexus version | `1.0.96` |', 1)
sr = sr.replace('| Mission Finder baseline | `V10.6.144` |', '| Mission Finder baseline | `V10.6.145` |', 1)
src_readme.write_text(sr, encoding='utf-8')

changelog = ROOT / 'CHANGELOG.md'
cl = changelog.read_text(encoding='utf-8')
marker = '## [1.0.95] - 2026-08-09\n'
require(cl, marker, '1.0.95 changelog marker')
section = '''## [1.0.96] - 2026-08-09

### Fixed

- Expanded the existing towing/recovery cross-reference so explicit road-vehicle towing wording such as `1 truck to tow`, `trucks to tow`, `lorry/lorries to tow`, `van/vans to tow`, `vehicle/vehicles to tow`, and `... to be towed` enters the established Recovery path.
- Added direct `Tow truck(s)` and `Recovery truck(s)` aliases to the same strict Recovery path.
- Preserved existing `Car to tow`, `Cars to tow`, `Car Recovery` and towing quantity conversion behavior.
- Recovery selection remains exact MissionChief vehicle type `105` (Flatbed Recovery Vehicle); generic vehicle quick-select fallback remains blocked for recognised recovery demand.
- Unrelated truck wording such as `1 truck`, `Fire truck`, `Heavy Rescue truck`, or `Trucks required` is deliberately not classified as towing demand.

### Regression coverage

- Added `scripts/check-towing-recovery-crossref-v1096.mjs`, including the reported `1 truck to tow` case, supported road-vehicle towing variants, unrelated-truck negative cases, the existing towing converter, strict recovery classification and exact type-105 selection.
- Chained the new regression through the already-registered bulk trained-register/recovery validation gate, avoiding a permanent workflow-definition change.

### Changed engine baseline

- Command Nexus increased from `1.0.95` to `1.0.96`.
- Mission Finder increased from `V10.6.144` to `V10.6.145`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

'''
cl = cl.replace(marker, section + marker, 1)
changelog.write_text(cl, encoding='utf-8')

print('Built Command Nexus 1.0.96 towing/recovery cross-reference candidate.')
