from pathlib import Path
from textwrap import dedent


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


source_path = Path("src/missionchief-command-nexus.user.js")
source = source_path.read_text(encoding="utf-8")
source = replace_once(
    source,
    "// @version      1.0.39",
    "// @version      1.0.40",
    "userscript version",
)
source = source.replace("V10.6.103", "V10.6.104")

old_matcher = dedent(
    '''
function isRoadRailUnitVehicleCheckbox(input) {
    if (!input) return false;
    const typeIdentifiers = getVehicleTypeIdentifiers(input);
    if (typeIdentifiers.length > 0) return typeIdentifiers.includes('107');

    return getExtendedVehicleValues(input).some(value => {
        const cleaned = normaliseVehicleText(value);
        return (
            cleaned === 'rru' ||
            cleaned === 'road rail unit' ||
            cleaned === 'road rail units'
        );
    });
}
'''
).lstrip("\n")
new_matcher = dedent(
    '''
function isRoadRailUnitVehicleCheckbox(input) {
    if (!input) return false;
    return getVehicleTypeIdentifiers(input).includes('107');
}
'''
).lstrip("\n")
source = replace_once(
    source,
    old_matcher,
    new_matcher,
    "Road Rail type-107 matcher",
)
source_path.write_text(source, encoding="utf-8")

for path in Path("scripts").glob("*.mjs"):
    text = path.read_text(encoding="utf-8")
    text = text.replace("// @version      1.0.39", "// @version      1.0.40")
    text = text.replace("v1.0.39 metadata", "v1.0.40 metadata")
    text = text.replace("V10.6.103", "V10.6.104")
    path.write_text(text, encoding="utf-8")

Path("scripts/check-road-rail-rru-mapping.mjs").write_text(
    dedent(
        r'''#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

for (const [token, label] of [
  ['// @version      1.0.40', 'v1.0.40 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.104', 'Mission Finder V10.6.104 header'],
  ['"Road Rail Unit": "Road Rail Unit",', 'singular canonical Road Rail alias'],
  ['"Road Rail Units": "Road Rail Unit",', 'plural canonical Road Rail alias'],
  ['function isRoadRailUnitRequirement(', 'strict Road Rail requirement detector'],
  ['function isRoadRailUnitVehicleCheckbox(', 'strict Road Rail checkbox matcher'],
  ["return getVehicleTypeIdentifiers(input).includes('107');", 'type-107-only matcher'],
  ['const roadRailOnly =', 'dedicated selector flag'],
  ['matches = isRoadRailUnitVehicleCheckbox(input);', 'dedicated selected-count verification'],
  ['"59": "Coastguard Rope Rescue Unit",', 'separate Coastguard type-59 mapping'],
  ['"107": "RRU",', 'Fire type-107 display mapping'],
]) {
  if (!source.includes(token)) fail(`Missing Road Rail RRU contract: ${label}`);
}

if (/"Road Rail Units?"\s*:\s*"RRU"/.test(source)) {
  fail('Road Rail aliases still use the ambiguous generic RRU route');
}

const matcherStart = source.indexOf('function isRoadRailUnitVehicleCheckbox(');
const matcherEnd = source.indexOf('function isCrvRequirement(', matcherStart);
const roadRailMatcher = source.slice(matcherStart, matcherEnd);

for (const forbidden of [
  'getExtendedVehicleValues',
  "cleaned === 'rru'",
  'road rail units',
  "includes('59')",
  'coastguard rope',
]) {
  if (roadRailMatcher.toLowerCase().includes(forbidden.toLowerCase())) {
    fail(`Road Rail matcher retains forbidden fallback: ${forbidden}`);
  }
}

console.log('Road Rail requirements use only exact Fire type-107; all RRU text fallback and Coastguard type-59 linkage are removed.');
'''
    ),
    encoding="utf-8",
)

readme = Path("README.md")
text = readme.read_text(encoding="utf-8")
text = replace_once(
    text,
    "**Current version:** `1.0.39`",
    "**Current version:** `1.0.40`",
    "README version",
)
text = replace_once(
    text,
    "**Mission Finder engine:** `V10.6.103`",
    "**Mission Finder engine:** `V10.6.104`",
    "README Mission Finder version",
)
readme.write_text(text, encoding="utf-8")

source_readme = Path("src/README.md")
text = source_readme.read_text(encoding="utf-8")
text = replace_once(
    text,
    "| Command Nexus version | `1.0.39` |",
    "| Command Nexus version | `1.0.40` |",
    "source README version",
)
text = replace_once(
    text,
    "| Mission Finder baseline | `V10.6.103` |",
    "| Mission Finder baseline | `V10.6.104` |",
    "source README Mission Finder version",
)
source_readme.write_text(text, encoding="utf-8")

changelog = Path("CHANGELOG.md")
text = changelog.read_text(encoding="utf-8")
marker = "## [1.0.39] - 2026-07-26"
if marker not in text:
    raise SystemExit("Unable to find v1.0.39 changelog marker")
entry = dedent(
    '''## [1.0.40] - 2026-07-26

### Fixed

- Removed the final text-based `RRU` fallback from Road Rail Unit dispatch matching.
- Road Rail Unit requirements now select and verify only checkboxes exposing exact MissionChief vehicle type `107`.
- Coastguard Rope Rescue Unit remains separate as vehicle type `59` and cannot satisfy a Fire Road Rail Unit requirement, even when renamed with an `RRU`-containing callsign.

### Changed engine baseline

- Mission Finder increased from `V10.6.103` to `V10.6.104`.

'''
)
changelog.write_text(text.replace(marker, entry + marker, 1), encoding="utf-8")
