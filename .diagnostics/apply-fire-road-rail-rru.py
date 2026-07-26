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
    "// @version      1.0.38",
    "// @version      1.0.39",
    "userscript version",
)
source = source.replace("V10.6.102", "V10.6.103")

source = replace_once(
    source,
    '        "Road Rail Unit": "RRU",\n'
    '        "Road Rail Units": "RRU",\n',
    '        "Road Rail Unit": "Road Rail Unit",\n'
    '        "Road Rail Units": "Road Rail Unit",\n',
    "Road Rail canonical aliases",
)

helpers = dedent(r'''
    function isRoadRailUnitRequirement(originalName, mappedName) {
        const raw = normaliseVehicleText(originalName);
        const mapped = normaliseVehicleText(mappedName);
        const supported = new Set([
            'road rail unit',
            'road rail units',
            'required road rail unit',
            'required road rail units'
        ]);
        return supported.has(raw) || supported.has(mapped);
    }

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

''')
source = replace_once(
    source,
    "    function isCrvRequirement(originalName, mappedName) {",
    helpers + "    function isCrvRequirement(originalName, mappedName) {",
    "Road Rail strict helper insertion",
)

source = replace_once(
    source,
    "        const crvOnly =\n            isCrvRequirement(\n                originalName,\n                mappedName\n            );\n",
    "        const roadRailOnly =\n            isRoadRailUnitRequirement(\n                originalName,\n                mappedName\n            );\n\n"
    "        const crvOnly =\n            isCrvRequirement(\n                originalName,\n                mappedName\n            );\n",
    "Road Rail selector flag",
)

source = replace_once(
    source,
    "        if (crvOnly) {\n            return sortVehicleCheckboxesByBestArrival(\n",
    "        if (roadRailOnly) {\n"
    "            return sortVehicleCheckboxesByBestArrival(\n"
    "                getVehicleCheckboxSnapshot().filter(input => {\n"
    "                    if (input.disabled) return false;\n"
    "                    if (!includeChecked && input.checked) return false;\n"
    "                    return isRoadRailUnitVehicleCheckbox(input);\n"
    "                })\n"
    "            );\n"
    "        }\n\n"
    "        if (crvOnly) {\n            return sortVehicleCheckboxesByBestArrival(\n",
    "Road Rail exact selection branch",
)

source = replace_once(
    source,
    "        const crvOnly = isCrvRequirement(originalName, mappedName);\n",
    "        const roadRailOnly = isRoadRailUnitRequirement(originalName, mappedName);\n"
    "        const crvOnly = isCrvRequirement(originalName, mappedName);\n",
    "Road Rail count flag",
)

source = replace_once(
    source,
    "            if (crvOnly) {\n                matches = isCrvVehicleCheckbox(input);\n",
    "            if (roadRailOnly) {\n"
    "                matches = isRoadRailUnitVehicleCheckbox(input);\n"
    "            } else if (crvOnly) {\n"
    "                matches = isCrvVehicleCheckbox(input);\n",
    "Road Rail exact count branch",
)

source_path.write_text(source, encoding="utf-8")

for path in Path("scripts").glob("*.mjs"):
    text = path.read_text(encoding="utf-8")
    text = text.replace("// @version      1.0.38", "// @version      1.0.39")
    text = text.replace("v1.0.38 metadata", "v1.0.39 metadata")
    text = text.replace("V10.6.102", "V10.6.103")
    path.write_text(text, encoding="utf-8")

Path("scripts/check-road-rail-rru-mapping.mjs").write_text(
    dedent(r'''#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

for (const [token, label] of [
  ['// @version      1.0.39', 'v1.0.39 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.103', 'Mission Finder V10.6.103 header'],
  ['"Road Rail Unit": "Road Rail Unit",', 'singular canonical Road Rail alias'],
  ['"Road Rail Units": "Road Rail Unit",', 'plural canonical Road Rail alias'],
  ['function isRoadRailUnitRequirement(', 'strict Road Rail requirement detector'],
  ['function isRoadRailUnitVehicleCheckbox(', 'strict Road Rail checkbox matcher'],
  ["typeIdentifiers.includes('107')", 'exact type-107 matcher'],
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

const roadRailMatcher = source.slice(
  source.indexOf('function isRoadRailUnitVehicleCheckbox('),
  source.indexOf('function isCrvRequirement(')
);
if (roadRailMatcher.includes("includes('59')") || roadRailMatcher.includes('coastguard rope')) {
  fail('Road Rail matcher must never include Coastguard Rope Rescue type 59');
}

console.log('Road Rail requirements use exact Fire type-107 RRU and exclude Coastguard type-59 CRRU.');
'''),
    encoding="utf-8",
)

readme = Path("README.md")
text = readme.read_text(encoding="utf-8")
text = replace_once(text, "**Current version:** `1.0.38`", "**Current version:** `1.0.39`", "README version")
text = replace_once(text, "**Mission Finder engine:** `V10.6.102`", "**Mission Finder engine:** `V10.6.103`", "README engine")
readme.write_text(text, encoding="utf-8")

source_readme = Path("src/README.md")
text = source_readme.read_text(encoding="utf-8")
text = replace_once(text, "| Command Nexus version | `1.0.38` |", "| Command Nexus version | `1.0.39` |", "source README version")
text = replace_once(text, "| Mission Finder baseline | `V10.6.102` |", "| Mission Finder baseline | `V10.6.103` |", "source README engine")
source_readme.write_text(text, encoding="utf-8")

changelog = Path("CHANGELOG.md")
text = changelog.read_text(encoding="utf-8")
marker = "## [1.0.38] - 2026-07-26"
if marker not in text:
    raise SystemExit("Unable to find v1.0.38 changelog marker")
entry = dedent('''## [1.0.39] - 2026-07-26

### Fixed

- Separated the Fire Road Rail Unit from the Coastguard Rope Rescue Unit despite their shared RRU abbreviation.
- `Road Rail Unit` and `Road Rail Units` shortages now use a dedicated exact type-107 Fire matcher.
- Coastguard Rope Rescue Unit type 59 is explicitly excluded from the Road Rail route.

### Changed engine baseline

- Mission Finder increased from `V10.6.102` to `V10.6.103`.

''')
changelog.write_text(text.replace(marker, entry + marker, 1), encoding="utf-8")
