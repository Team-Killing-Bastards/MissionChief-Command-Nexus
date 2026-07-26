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


source = replace_once(
    source,
    '// @version      1.0.44',
    '// @version      1.0.45',
    'userscript version',
)
source = source.replace('V10.6.108', 'V10.6.109')

label = 'Keep my saved panel position'
helper = 'Off = centre on every mission. On = remember where you drag it.'

if label not in source:
    raise SystemExit('Saved-position checkbox label was not found')

helper_count = source.count(helper)
if helper_count != 1:
    raise SystemExit(
        f'Saved-position helper text: expected exactly one match, found {helper_count}'
    )

# Prefer removing the whole helper-only HTML line. If MissionChief UI markup is
# later reformatted, fall back to deleting only the sentence while preserving
# the checkbox, its label and its saved-position storage behaviour.
lines = source.splitlines(keepends=True)
matching_lines = [index for index, line in enumerate(lines) if helper in line]

if len(matching_lines) == 1:
    index = matching_lines[0]
    original_line = lines[index]
    stripped = original_line.strip()
    helper_only_element = re.fullmatch(
        r'<(?P<tag>div|p|small|span)\b[^>]*>\s*'
        + re.escape(helper)
        + r'\s*</(?P=tag)>',
        stripped,
        flags=re.IGNORECASE,
    )
    if helper_only_element:
        del lines[index]
    else:
        replacement = original_line.replace(helper, '', 1)
        newline = '\n' if replacement.endswith('\n') else ''
        body = replacement[:-1] if newline else replacement
        body = body.rstrip(' \t')
        lines[index] = body + newline if body.strip() else newline
    source = ''.join(lines)
else:
    source = source.replace(helper, '', 1)

if helper in source:
    raise SystemExit('Saved-position helper text remains after removal')
if label not in source:
    raise SystemExit('Saved-position checkbox label was removed unexpectedly')

SOURCE_PATH.write_text(source, encoding='utf-8')

# Keep version assertions aligned in the existing contract checks.
for path in sorted((ROOT / 'scripts').glob('*.mjs')):
    text = path.read_text(encoding='utf-8')
    updated = text.replace('1.0.44', '1.0.45').replace('V10.6.108', 'V10.6.109')
    if updated != text:
        path.write_text(updated, encoding='utf-8')

check_path = ROOT / 'scripts/check-saved-position-helper-copy.mjs'
check_path.write_text(
    '''#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

for (const [token, label] of [
  ['// @version      1.0.45', 'v1.0.45 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.109', 'Mission Finder V10.6.109 header'],
  ['Keep my saved panel position', 'saved-position checkbox label'],
]) {
  if (!source.includes(token)) fail(`Missing saved-position contract: ${label}`);
}

const forbidden = 'Off = centre on every mission. On = remember where you drag it.';
if (source.includes(forbidden)) {
  fail('Saved-position explanatory helper text is still present');
}

console.log('The Keep my saved panel position checkbox remains available while its explanatory helper sentence is absent.');
''',
    encoding='utf-8',
)

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(
    readme,
    '**Current version:** `1.0.44` · **Mission Finder engine:** `V10.6.108`',
    '**Current version:** `1.0.45` · **Mission Finder engine:** `V10.6.109`',
    'README current version',
)
readme_path.write_text(readme, encoding='utf-8')

src_readme_path = ROOT / 'src/README.md'
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = replace_once(
    src_readme,
    '| Command Nexus version | `1.0.44` |',
    '| Command Nexus version | `1.0.45` |',
    'src README Command Nexus version',
)
src_readme = replace_once(
    src_readme,
    '| Mission Finder baseline | `V10.6.108` |',
    '| Mission Finder baseline | `V10.6.109` |',
    'src README Mission Finder version',
)
src_readme_path.write_text(src_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## [1.0.45] - 2026-07-26

### Changed

- Removed the explanatory sentence beneath `Keep my saved panel position` from the Mission Finder control panel.
- The checkbox, stored panel coordinates and centre-on-mission behaviour remain unchanged.

### Changed engine baseline

- Mission Finder increased from `V10.6.108` to `V10.6.109`.

'''
anchor = '## [1.0.44] - 2026-07-26\n'
changelog = replace_once(changelog, anchor, entry + anchor, 'changelog release anchor')
changelog_path.write_text(changelog, encoding='utf-8')
