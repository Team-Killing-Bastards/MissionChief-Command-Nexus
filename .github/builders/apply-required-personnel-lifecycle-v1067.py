#!/usr/bin/env python3
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE_PATH = ROOT / 'src/missionchief-command-nexus.user.js'
README_PATH = ROOT / 'README.md'
SOURCE_README_PATH = ROOT / 'src/README.md'
CHANGELOG_PATH = ROOT / 'CHANGELOG.md'
SCRIPTS_DIR = ROOT / 'scripts'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one anchor, found {count}')
    return text.replace(old, new, 1)


def extract_named_function(text: str, signature: str) -> str:
    start = text.find(signature)
    if start < 0:
        raise RuntimeError(f'Unable to find {signature}')

    body_start = text.find('{', start + len(signature))
    if body_start < 0:
        raise RuntimeError(f'Unable to find body for {signature}')

    depth = 0
    quote = ''
    escaped = False
    index = body_start

    while index < len(text):
        character = text[index]
        next_character = text[index + 1] if index + 1 < len(text) else ''

        if quote:
            if escaped:
                escaped = False
            elif character == '\\':
                escaped = True
            elif character == quote:
                quote = ''
            index += 1
            continue

        if character in ('"', "'", '`'):
            quote = character
            index += 1
            continue

        if character == '/' and next_character == '/':
            line_end = text.find('\n', index + 2)
            index = len(text) if line_end < 0 else line_end + 1
            continue

        if character == '/' and next_character == '*':
            comment_end = text.find('*/', index + 2)
            if comment_end < 0:
                raise RuntimeError(f'Unterminated block comment in {signature}')
            index = comment_end + 2
            continue

        if character == '{':
            depth += 1
        elif character == '}':
            depth -= 1
            if depth == 0:
                return text[start:index + 1]

        index += 1

    raise RuntimeError(f'Unterminated function {signature}')


source = SOURCE_PATH.read_text(encoding='utf-8')
source = replace_once(
    source,
    '// @version      1.0.66',
    '// @version      1.0.67',
    'userscript version',
)

engine_count = source.count('V10.6.129')
if engine_count < 1:
    raise RuntimeError('Mission Finder V10.6.129 anchor was not found')
source = source.replace('V10.6.129', 'V10.6.130')

mount_pattern = re.compile(
    r'(        wrapper\.appendChild\(loadPanel\);\r?\n'
    r'        wrapper\.appendChild\(trainedPanel\);\r?\n'
    r'        document\.body\.appendChild\(wrapper\);\r?\n)'
    r'(\r?\n        function syncVehicleLoadCollapseState\(\) \{)'
)
mount_matches = list(mount_pattern.finditer(source))
if len(mount_matches) != 1:
    raise RuntimeError(
        'mission panel mount lifecycle: expected exactly one anchor, '
        f'found {len(mount_matches)}'
    )
source = mount_pattern.sub(
    r'\1\n        scheduleMissionRequiredPersonnelPreload(0);\n\2',
    source,
    count=1,
)

renderer = extract_named_function(
    source,
    '    function renderSelectedTrainedPersonnelPanel()',
)
if 'scheduleMissionRequiredPersonnelPreload(' in renderer:
    raise RuntimeError('Trained-personnel renderer must not start preload work')
if 'getPreloadedMissionTrainedPersonnelRequirements()' not in renderer:
    raise RuntimeError('Required Personnel panel model is missing from renderer')

mount_start = source.index('        wrapper.appendChild(loadPanel);')
mount_end = source.index(
    '        function syncVehicleLoadCollapseState() {',
    mount_start,
)
mount_lifecycle = source[mount_start:mount_end]
if 'document.body.appendChild(wrapper);' not in mount_lifecycle:
    raise RuntimeError('Mission panel mount was not found')
if 'scheduleMissionRequiredPersonnelPreload(0);' not in mount_lifecycle:
    raise RuntimeError('Mission panel mount does not start Required Personnel preload')
if mount_lifecycle.index('scheduleMissionRequiredPersonnelPreload(0);') < mount_lifecycle.index('document.body.appendChild(wrapper);'):
    raise RuntimeError('Required Personnel preload must start after mission panels are mounted')

SOURCE_PATH.write_text(source, encoding='utf-8')

readme = README_PATH.read_text(encoding='utf-8')
readme = replace_once(
    readme,
    '**Current version:** `1.0.66` · **Mission Finder engine:** `V10.6.129`',
    '**Current version:** `1.0.67` · **Mission Finder engine:** `V10.6.130`',
    'README production version',
)
README_PATH.write_text(readme, encoding='utf-8')

source_readme = SOURCE_README_PATH.read_text(encoding='utf-8')
source_readme = replace_once(
    source_readme,
    '| Command Nexus version | `1.0.66` |',
    '| Command Nexus version | `1.0.67` |',
    'source README Command Nexus version',
)
source_readme = replace_once(
    source_readme,
    '| Mission Finder baseline | `V10.6.129` |',
    '| Mission Finder baseline | `V10.6.130` |',
    'source README Mission Finder version',
)
SOURCE_README_PATH.write_text(source_readme, encoding='utf-8')

changelog = CHANGELOG_PATH.read_text(encoding='utf-8')
release_anchor = '\n\n## [1.0.66] - 2026-07-31\n'
release_notes = """

## [1.0.67] - 2026-07-31

### Fixed

- Restored automatic mission-load preloading for the trained `Required Personnel` row.
- Moved the preload trigger out of the trained-personnel renderer and into the mission-panel mount lifecycle, preventing recursion while still loading requirements before Unit Finder runs.
- The trained-personnel panel now starts with requirement coverage such as `0 / 2` and refreshes to `2 / 2` when matching trained units are selected.
- Added a regression contract requiring the mission UI lifecycle to start preloading while permanently forbidding the renderer from doing so.

### Changed engine baseline

- Mission Finder increased from `V10.6.129` to `V10.6.130`.
- Personnel Assignment remains `1.3.8`.
"""
if release_anchor not in changelog:
    raise RuntimeError('CHANGELOG 1.0.66 anchor was not found')
changelog = changelog.replace(release_anchor, release_notes + release_anchor, 1)
CHANGELOG_PATH.write_text(changelog, encoding='utf-8')

changed_scripts = 0
for path in sorted(SCRIPTS_DIR.glob('*.mjs')):
    text = path.read_text(encoding='utf-8')
    updated = text.replace('1.0.66', '1.0.67').replace('V10.6.129', 'V10.6.130')
    if updated != text:
        path.write_text(updated, encoding='utf-8')
        changed_scripts += 1

preload_test = SCRIPTS_DIR / 'check-mission-definition-personnel-preload.mjs'
text = preload_test.read_text(encoding='utf-8')
assertion_anchor = (
    "if (!panel.includes('panel cache read failed')) {\n"
    "  fail('Trained-personnel rendering must isolate preload-cache failures');\n"
    "}\n\n"
    "const fixture = `"
)
lifecycle_assertions = (
    "if (!panel.includes('panel cache read failed')) {\n"
    "  fail('Trained-personnel rendering must isolate preload-cache failures');\n"
    "}\n\n"
    "const mountStart = source.indexOf('        wrapper.appendChild(loadPanel);');\n"
    "const mountEnd = source.indexOf(\n"
    "  '        function syncVehicleLoadCollapseState() {',\n"
    "  mountStart\n"
    ");\n"
    "if (mountStart < 0 || mountEnd < 0) {\n"
    "  fail('Unable to isolate the mission-panel mount lifecycle');\n"
    "}\n"
    "const mountLifecycle = source.slice(mountStart, mountEnd);\n"
    "for (const token of [\n"
    "  'wrapper.appendChild(trainedPanel);',\n"
    "  'document.body.appendChild(wrapper);',\n"
    "  'scheduleMissionRequiredPersonnelPreload(0);',\n"
    "]) {\n"
    "  if (!mountLifecycle.includes(token)) {\n"
    "    fail(`Mission-panel mount lifecycle missing ${token}`);\n"
    "  }\n"
    "}\n"
    "if (\n"
    "  mountLifecycle.indexOf('scheduleMissionRequiredPersonnelPreload(0);') <\n"
    "  mountLifecycle.indexOf('document.body.appendChild(wrapper);')\n"
    ") {\n"
    "  fail('Required Personnel preload must start after the mission panels mount');\n"
    "}\n\n"
    "const fixture = `"
)
text = replace_once(
    text,
    assertion_anchor,
    lifecycle_assertions,
    'mission-panel lifecycle preload assertions',
)
preload_test.write_text(text, encoding='utf-8')

print(
    f'Applied Command Nexus 1.0.67 / Mission Finder V10.6.130 lifecycle preload fix; '
    f'updated {changed_scripts} version-aware regression scripts.'
)
