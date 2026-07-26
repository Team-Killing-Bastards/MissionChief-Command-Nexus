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
    "// @version      1.0.37",
    "// @version      1.0.38",
    "userscript version",
)
source = replace_once(
    source,
    '        "Road Rail Unit": "RRU",\n',
    '        "Road Rail Unit": "RRU",\n'
    '        "Road Rail Units": "RRU",\n',
    "Road Rail Unit alias",
)
engine_count = source.count("V10.6.101")
if engine_count < 1:
    raise SystemExit("Mission Finder V10.6.101 marker was not found")
source = source.replace("V10.6.101", "V10.6.102")
source_path.write_text(source, encoding="utf-8")

for path in Path("scripts").glob("*.mjs"):
    text = path.read_text(encoding="utf-8")
    text = text.replace("// @version      1.0.37", "// @version      1.0.38")
    text = text.replace("v1.0.37 metadata", "v1.0.38 metadata")
    text = text.replace("V10.6.101", "V10.6.102")
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
  ['// @version      1.0.38', 'v1.0.38 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.102', 'Mission Finder V10.6.102 header'],
  ['"Road Rail Unit": "RRU",', 'singular Road Rail Unit alias'],
  ['"Road Rail Units": "RRU",', 'plural Road Rail Units alias'],
  ['"107": "RRU",', 'exact type-107 RRU vehicle mapping'],
]) {
  if (!source.includes(token)) fail(`Missing Road Rail RRU contract: ${label}`);
}

const pluralCount = (source.match(/"Road Rail Units"\s*:\s*"RRU"/g) || []).length;
if (pluralCount !== 1) {
  fail(`Expected one plural Road Rail Units alias; found ${pluralCount}`);
}

console.log('Road Rail Unit singular/plural aliases map to exact type-107 RRU.');
'''
    ),
    encoding="utf-8",
)

readme = Path("README.md")
text = readme.read_text(encoding="utf-8")
text = replace_once(
    text,
    "**Current version:** `1.0.37`",
    "**Current version:** `1.0.38`",
    "README version",
)
text = replace_once(
    text,
    "**Mission Finder engine:** `V10.6.101`",
    "**Mission Finder engine:** `V10.6.102`",
    "README engine",
)
readme.write_text(text, encoding="utf-8")

source_readme = Path("src/README.md")
text = source_readme.read_text(encoding="utf-8")
text = replace_once(
    text,
    "| Command Nexus version | `1.0.37` |",
    "| Command Nexus version | `1.0.38` |",
    "source README version",
)
text = replace_once(
    text,
    "| Mission Finder baseline | `V10.6.101` |",
    "| Mission Finder baseline | `V10.6.102` |",
    "source README engine",
)
source_readme.write_text(text, encoding="utf-8")

changelog = Path("CHANGELOG.md")
text = changelog.read_text(encoding="utf-8")
marker = "## [1.0.37] - 2026-07-26"
if marker not in text:
    raise SystemExit("Unable to find v1.0.37 changelog marker")
entry = dedent(
    '''## [1.0.38] - 2026-07-26

### Fixed

- `Missing Vehicles: 2 Road Rail Units` now maps the plural MissionChief wording to the established `RRU` route.
- Singular `Road Rail Unit` wording remains supported.
- The route remains restricted to the exact type-107 Road Rail Unit vehicle mapping.

### Changed engine baseline

- Mission Finder increased from `V10.6.101` to `V10.6.102`.

'''
)
changelog.write_text(text.replace(marker, entry + marker, 1), encoding="utf-8")

workflow = Path(".github/workflows/validate-userscript.yml")
text = workflow.read_text(encoding="utf-8")
path_token = "      - 'scripts/check-trained-coverage-optimizer.mjs'\n"
if text.count(path_token) != 2:
    raise SystemExit("Expected two trained-coverage workflow path entries")
text = text.replace(
    path_token,
    path_token + "      - 'scripts/check-road-rail-rru-mapping.mjs'\n",
)
step_token = dedent(
    '''      - name: Validate trained-personnel coverage optimiser contracts
        run: node scripts/check-trained-coverage-optimizer.mjs
'''
)
if text.count(step_token) != 1:
    raise SystemExit("Unable to find trained-coverage validation step")
text = text.replace(
    step_token,
    step_token
    + dedent(
        '''
      - name: Validate Road Rail Unit to RRU mapping
        run: node scripts/check-road-rail-rru-mapping.mjs
'''
    ),
    1,
)
workflow.write_text(text, encoding="utf-8")
