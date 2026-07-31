#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE_PATH = ROOT / 'src/missionchief-command-nexus.user.js'
README_PATH = ROOT / 'README.md'
CHANGELOG_PATH = ROOT / 'CHANGELOG.md'
SCRIPTS_DIR = ROOT / 'scripts'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old, new, 1)


def replace_regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    matches = list(re.finditer(pattern, text, flags=re.MULTILINE))
    if len(matches) != 1:
        raise RuntimeError(f'{label}: expected exactly one regex anchor, found {len(matches)}')
    return re.sub(pattern, replacement, text, count=1, flags=re.MULTILINE)


source = SOURCE_PATH.read_text(encoding='utf-8')
source = replace_once(
    source,
    '// @version      1.0.65',
    '// @version      1.0.66',
    'userscript version',
)

engine_count = source.count('V10.6.128')
if engine_count < 1:
    raise RuntimeError('Mission Finder V10.6.128 anchor was not found')
source = source.replace('V10.6.128', 'V10.6.129')

source = replace_regex_once(
    source,
    r'(    function renderSelectedTrainedPersonnelPanel\(\) \{\n)'
    r'[ \t\r\n]*scheduleMissionRequiredPersonnelPreload\(\s*0\s*\);[ \t\r\n]*',
    r'\1',
    'recursive trained-personnel preload trigger',
)

source = replace_regex_once(
    source,
    r'        const preloadRequirements\s*=\s*'
    r'getPreloadedMissionTrainedPersonnelRequirements\(\);',
    "        let preloadRequirements = [];\n\n"
    "        try {\n"
    "            preloadRequirements =\n"
    "                getPreloadedMissionTrainedPersonnelRequirements();\n"
    "        } catch (error) {\n"
    "            if (mfDebugEnabled) {\n"
    "                debugLog(\n"
    "                    'MISSION PERSONNEL PRELOAD',\n"
    "                    `panel cache read failed: ${error?.message || error}`\n"
    "                );\n"
    "            }\n"
    "        }",
    'trained-personnel preload cache read',
)

renderer_start = source.index('    function renderSelectedTrainedPersonnelPanel() {')
renderer_end = source.index('\n\n    function renderVehicleLoadListNow() {', renderer_start)
if renderer_start < 0 or renderer_end < 0:
    raise RuntimeError('Unable to isolate trained-personnel renderer after patch')
renderer = source[renderer_start:renderer_end]
if 'scheduleMissionRequiredPersonnelPreload(' in renderer:
    raise RuntimeError('Trained-personnel renderer still starts preload work')
if 'getSelectedTrainedPersonnelPanelModel()' not in renderer:
    raise RuntimeError('Legacy selected-trained-personnel model was removed')
if 'panel cache read failed' not in renderer:
    raise RuntimeError('Preload cache isolation guard was not installed')

SOURCE_PATH.write_text(source, encoding='utf-8')

readme = README_PATH.read_text(encoding='utf-8')
readme = replace_once(
    readme,
    '**Current version:** `1.0.65` · **Mission Finder engine:** `V10.6.128`',
    '**Current version:** `1.0.66` · **Mission Finder engine:** `V10.6.129`',
    'README production version',
)
README_PATH.write_text(readme, encoding='utf-8')

changelog = CHANGELOG_PATH.read_text(encoding='utf-8')
release_anchor = '\n\n## [1.0.65] - 2026-07-31\n'
release_notes = """

## [1.0.66] - 2026-07-31

### Fixed

- Restored the selected trained-personnel display after Unit Finder by separating its renderer from the mission requirement preload scheduler.
- Removed the render-to-preload recursion introduced in `1.0.65`, so a panel refresh can no longer start another requirement fetch and render cycle.
- Isolated preload-cache failures from the existing selected-vehicle Personnel Register display; preloading can fail without hiding selected trained staff.
- Kept mission-load `Required Personnel` preloading in the mission lifecycle and retained reuse of the mission-bound requirement snapshot during Unit Finder.

### Changed engine baseline

- Mission Finder increased from `V10.6.128` to `V10.6.129`.
- Personnel Assignment remains `1.3.8`.
"""
if release_anchor not in changelog:
    raise RuntimeError('CHANGELOG 1.0.65 anchor was not found')
changelog = changelog.replace(release_anchor, release_notes + release_anchor, 1)
CHANGELOG_PATH.write_text(changelog, encoding='utf-8')

changed_scripts = 0
for path in sorted(SCRIPTS_DIR.glob('*.mjs')):
    text = path.read_text(encoding='utf-8')
    updated = text.replace('1.0.65', '1.0.66').replace('V10.6.128', 'V10.6.129')
    if updated != text:
        path.write_text(updated, encoding='utf-8')
        changed_scripts += 1

preload_test = SCRIPTS_DIR / 'check-mission-definition-personnel-preload.mjs'
text = preload_test.read_text(encoding='utf-8')
text = replace_once(
    text,
    "for (const token of [\n"
    "  'scheduleMissionRequiredPersonnelPreload(0)',\n"
    "  'getPreloadedMissionTrainedPersonnelRequirements()',",
    "for (const token of [\n"
    "  'getPreloadedMissionTrainedPersonnelRequirements()',",
    'preload regression renderer token',
)
text = replace_once(
    text,
    "  if (!panel.includes(token)) fail(`Trained-personnel panel missing ${token}`);\n"
    "}\n\nconst fixture = `",
    "  if (!panel.includes(token)) fail(`Trained-personnel panel missing ${token}`);\n"
    "}\n"
    "if (panel.includes('scheduleMissionRequiredPersonnelPreload(')) {\n"
    "  fail('Trained-personnel rendering must not start another preload cycle');\n"
    "}\n"
    "if (!panel.includes('panel cache read failed')) {\n"
    "  fail('Trained-personnel rendering must isolate preload-cache failures');\n"
    "}\n\nconst fixture = `",
    'preload regression isolation assertions',
)
preload_test.write_text(text, encoding='utf-8')

panel_test = SCRIPTS_DIR / 'check-trained-personnel-panel.mjs'
text = panel_test.read_text(encoding='utf-8')
text = replace_once(
    text,
    "expect(!renderer.includes('personnelName'), 'Panel must not invent or expose unavailable personnel names');",
    "expect(!renderer.includes('personnelName'), 'Panel must not invent or expose unavailable personnel names');\n"
    "expect(!renderer.includes('scheduleMissionRequiredPersonnelPreload('), 'Panel rendering must never schedule requirement preload work');\n"
    "expect(renderer.includes('panel cache read failed'), 'Preload-cache failures must not suppress selected trained staff');",
    'selected trained-personnel isolation assertions',
)
panel_test.write_text(text, encoding='utf-8')

print(
    f'Applied Command Nexus 1.0.66 / Mission Finder V10.6.129 render isolation; '
    f'updated {changed_scripts} version-aware regression scripts.'
)
