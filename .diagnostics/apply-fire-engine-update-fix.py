#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path('.')
SOURCE_PATH = ROOT / 'src/missionchief-command-nexus.user.js'
source = SOURCE_PATH.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def update_function(text: str, name: str, transform):
    marker = f'    function {name}('
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'Function not found: {name}')
    next_start = text.find('\n    function ', start + len(marker))
    if next_start < 0:
        raise SystemExit(f'Unable to locate end of function: {name}')
    body = text[start:next_start]
    updated = transform(body)
    if updated == body:
        raise SystemExit(f'Function was not changed: {name}')
    return text[:start] + updated + text[next_start:]


source = replace_once(source, '// @version      1.0.43', '// @version      1.0.44', 'userscript version')
source = source.replace('V10.6.107', 'V10.6.108')

normalise_anchor = '''    function normaliseVehicleText(value) {
        return String(value || '')
            .replace(/&amp;/g, '&')
            .replace(/\\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

'''

fire_helpers = '''    const MF_FIRE_ENGINE_TYPE_IDS = new Set([
        '0',
        '16',
        '17'
    ]);

    const MF_FIRE_ENGINE_REQUIREMENT_NAMES = new Set([
        'pump',
        'pumps',
        'required pump',
        'required pumps',
        'fire engine',
        'fire engines',
        'required fire engine',
        'required fire engines',
        'fire engine r/pump x 1'
    ]);

    function isFireEngineRequirement(
        originalName,
        mappedName
    ) {
        const raw = normaliseVehicleText(originalName);
        const mapped = normaliseVehicleText(mappedName);

        return (
            MF_FIRE_ENGINE_REQUIREMENT_NAMES.has(raw) ||
            (
                mapped === 'fire engine r/pump x 1' &&
                (
                    raw.includes('fire engine') ||
                    raw === 'pump' ||
                    raw === 'pumps' ||
                    raw === 'required pump' ||
                    raw === 'required pumps'
                )
            )
        );
    }

    function isFireEngineVehicleCheckbox(input) {
        if (!input) return false;

        // MissionChief UK pump-capable Fire Engine types only:
        // type 0 Water Ladder, type 16 Rescue Pump and type 17 CARP.
        // There is deliberately no name, callsign or substring fallback here.
        return getVehicleTypeIdentifiers(input).some(
            typeId => MF_FIRE_ENGINE_TYPE_IDS.has(typeId)
        );
    }

'''

if normalise_anchor not in source:
    raise SystemExit('normaliseVehicleText insertion anchor not found')
source = source.replace(normalise_anchor, normalise_anchor + fire_helpers, 1)


def patch_get_all(body: str) -> str:
    needle = '        const candidates = getVehicleMatchCandidates(originalName, mappedName);\n'
    insert = '''        if (isFireEngineRequirement(originalName, mappedName)) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => {
                    if (input.disabled) return false;
                    if (!includeChecked && input.checked) return false;
                    return isFireEngineVehicleCheckbox(input);
                })
            );
        }

'''
    if body.count(needle) != 1:
        raise SystemExit(f'getAllMatchingVehicleCheckboxes candidate anchor count={body.count(needle)}')
    return body.replace(needle, insert + needle, 1)


source = update_function(source, 'getAllMatchingVehicleCheckboxes', patch_get_all)


def patch_count(body: str) -> str:
    needle = '        const candidates = getVehicleMatchCandidates(originalName, mappedName);\n'
    insert = '''        if (isFireEngineRequirement(originalName, mappedName)) {
            return getVehicleCheckboxSnapshot().filter(input => (
                input.checked &&
                isFireEngineVehicleCheckbox(input)
            )).length;
        }

'''
    if body.count(needle) != 1:
        raise SystemExit(f'countSelectedMatchingVehicles candidate anchor count={body.count(needle)}')
    return body.replace(needle, insert + needle, 1)


source = update_function(source, 'countSelectedMatchingVehicles', patch_count)


def patch_find(body: str) -> str:
    needle = '''        const requestedName =
            originalName ||
            mappedName;
'''
    insert = '''        if (isFireEngineRequirement(originalName, mappedName)) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => (
                    !input.disabled &&
                    !input.checked &&
                    isFireEngineVehicleCheckbox(input)
                ))
            )[0] || null;
        }

'''
    if body.count(needle) != 1:
        raise SystemExit(f'findUnitButton requestedName anchor count={body.count(needle)}')
    return body.replace(needle, insert + needle, 1)


source = update_function(source, 'findUnitButton', patch_find)

ui_marker = '    function updateAutoModeButton() {'
if source.count(ui_marker) != 1:
    raise SystemExit(f'updateAutoModeButton marker count={source.count(ui_marker)}')

ui_helper = '''    function removeAutoModeQueueHelperCopy() {
        const autoButton = Array.from(
            document.querySelectorAll('button')
        ).find(button => {
            const text = String(
                button.innerText ||
                button.textContent ||
                ''
            )
                .replace(/\\s+/g, ' ')
                .trim();

            return /^(?:Start|Stop)\\s+Auto\\s+Mode$/i.test(text);
        });

        const autoBox = autoButton?.closest?.('.mf2026-box');
        const checkbox = autoBox?.querySelector?.('input[type="checkbox"]');

        if (!autoBox || !checkbox) return;

        const helperCandidates = new Set([
            ...Array.from(
                autoBox.querySelectorAll(
                    '.mf2026-small, small, p'
                )
            ),
            ...Array.from(autoBox.children || [])
        ]);

        helperCandidates.forEach(element => {
            if (
                !element ||
                element === autoButton ||
                element.contains(autoButton) ||
                element.contains(checkbox) ||
                element.querySelector?.(
                    'button, input, select, textarea'
                )
            ) {
                return;
            }

            const text = String(
                element.innerText ||
                element.textContent ||
                ''
            )
                .replace(/\\s+/g, ' ')
                .trim();

            if (
                /unit finder/i.test(text) &&
                /mission update/i.test(text) &&
                /dispatch/i.test(text)
            ) {
                element.remove();
            }
        });
    }

'''
source = source.replace(ui_marker, ui_helper + ui_marker, 1)
source = replace_once(
    source,
    ui_marker + '\n',
    ui_marker + '''
        removeAutoModeQueueHelperCopy();
        setTimeout(
            removeAutoModeQueueHelperCopy,
            0
        );
''',
    'Auto Mode helper removal invocation'
)

SOURCE_PATH.write_text(source, encoding='utf-8')

# Keep current-version assertions aligned in existing JavaScript contract checks.
for path in sorted((ROOT / 'scripts').glob('*.mjs')):
    text = path.read_text(encoding='utf-8')
    updated = text.replace('1.0.43', '1.0.44').replace('V10.6.107', 'V10.6.108')
    if updated != text:
        path.write_text(updated, encoding='utf-8')

check_path = ROOT / 'scripts/check-fire-engine-update-mapping.mjs'
check_path.write_text('''#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

for (const [token, label] of [
  ['// @version      1.0.44', 'v1.0.44 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.108', 'Mission Finder V10.6.108 header'],
  ['"Fire engines": "Fire Engine R/PUMP x 1"', 'plural Fire Engine alias'],
  ['MF_FIRE_ENGINE_TYPE_IDS', 'Fire Engine type set'],
  ['function isFireEngineRequirement(', 'Fire Engine requirement detector'],
  ['function isFireEngineVehicleCheckbox(', 'Fire Engine checkbox detector'],
  ['removeAutoModeQueueHelperCopy();', 'Auto Mode helper-copy cleanup call'],
]) {
  if (!source.includes(token)) fail(`Missing contract: ${label}`);
}

const typeSetStart = source.indexOf('const MF_FIRE_ENGINE_TYPE_IDS');
const typeSetEnd = source.indexOf(']);', typeSetStart);
const typeSet = source.slice(typeSetStart, typeSetEnd + 3);
for (const required of ["'0'", "'16'", "'17'"]) {
  if (!typeSet.includes(required)) fail(`Fire Engine type set is missing ${required}`);
}
if (typeSet.includes("'5'")) fail('Ambulance type 5 must never be owned by Fire Engine requirements');

const matcherStart = source.indexOf('function isFireEngineVehicleCheckbox(');
const matcherEnd = source.indexOf('\n    function ', matcherStart + 1);
const matcher = source.slice(matcherStart, matcherEnd);
for (const required of ['getVehicleTypeIdentifiers(input)', 'MF_FIRE_ENGINE_TYPE_IDS.has(typeId)']) {
  if (!matcher.includes(required)) fail(`Strict Fire Engine matcher is missing ${required}`);
}
for (const forbidden of ['getExtendedVehicleValues', 'vehicleValuesMatchCandidates', '.includes(candidate)', 'Ambulance']) {
  if (matcher.includes(forbidden)) fail(`Strict Fire Engine matcher contains forbidden fallback: ${forbidden}`);
}

for (const functionName of ['getAllMatchingVehicleCheckboxes', 'countSelectedMatchingVehicles', 'findUnitButton']) {
  const start = source.indexOf(`function ${functionName}(`);
  const end = source.indexOf('\n    function ', start + 1);
  const body = source.slice(start, end);
  if (!body.includes('isFireEngineRequirement(') || !body.includes('isFireEngineVehicleCheckbox(')) {
    fail(`${functionName} does not use the strict Fire Engine route`);
  }
}

const getAllStart = source.indexOf('function getAllMatchingVehicleCheckboxes(');
const getAllEnd = source.indexOf('\n    function ', getAllStart + 1);
const getAllBody = source.slice(getAllStart, getAllEnd);
if (!(getAllBody.indexOf('isFireEngineRequirement(') < getAllBody.indexOf('getVehicleMatchCandidates('))) {
  fail('Fire Engine selection must run before generic text matching');
}

const findStart = source.indexOf('function findUnitButton(');
const findEnd = source.indexOf('\n    function ', findStart + 1);
const findBody = source.slice(findStart, findEnd);
if (!(findBody.indexOf('isFireEngineRequirement(') < findBody.indexOf("queryVehicleSelectionElements('a[search_attribute]')"))) {
  fail('Fire Engine fallback must stop before generic quick-select anchors');
}

const uiStart = source.indexOf('function removeAutoModeQueueHelperCopy(');
const uiEnd = source.indexOf('\n    function updateAutoModeButton(', uiStart);
const uiBody = source.slice(uiStart, uiEnd);
for (const required of ['/unit finder/i', '/mission update/i', '/dispatch/i', "input[type=\"checkbox\"]", 'element.remove();']) {
  if (!uiBody.includes(required)) fail(`Auto Mode helper cleanup is missing ${required}`);
}

console.log('Fire Engine Update selection is restricted to pump-capable Fire types 0/16/17, excludes Ambulance type 5 and removes only the Auto Mode explanatory helper copy beneath the queue checkbox.');
''', encoding='utf-8')

readme = (ROOT / 'README.md').read_text(encoding='utf-8')
readme = replace_once(readme, '**Current version:** `1.0.43` · **Mission Finder engine:** `V10.6.107`', '**Current version:** `1.0.44` · **Mission Finder engine:** `V10.6.108`', 'README current version')
(ROOT / 'README.md').write_text(readme, encoding='utf-8')

src_readme = (ROOT / 'src/README.md').read_text(encoding='utf-8')
src_readme = replace_once(src_readme, '| Command Nexus version | `1.0.43` |', '| Command Nexus version | `1.0.44` |', 'src README Command Nexus version')
src_readme = replace_once(src_readme, '| Mission Finder baseline | `V10.6.107` |', '| Mission Finder baseline | `V10.6.108` |', 'src README Mission Finder version')
(ROOT / 'src/README.md').write_text(src_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## [1.0.44] - 2026-07-26

### Fixed

- `Missing Vehicles: 3 Fire engines` now uses an exact Fire Engine requirement route instead of the generic substring matcher that could select Ambulances.
- Fire Engine selection and selected-count verification accept only MissionChief UK pump-capable Fire vehicle types `0`, `16` and `17`; Ambulance type `5` is explicitly outside the route.
- The fallback selector can no longer use a generic `search_attribute` quick-select button for Fire Engine shortages.

### Interface

- Removed the explanatory helper sentence beneath the Auto Mode queue checkbox while retaining the checkbox, Start/Stop control and operational status display.

### Changed engine baseline

- Mission Finder increased from `V10.6.107` to `V10.6.108`.

'''
changelog = replace_once(changelog, '## [1.0.43] - 2026-07-26\n', entry + '## [1.0.43] - 2026-07-26\n', 'changelog insertion')
changelog_path.write_text(changelog, encoding='utf-8')

print('Prepared Command Nexus v1.0.44 Fire Engine Update fix and Auto Mode helper cleanup.')
