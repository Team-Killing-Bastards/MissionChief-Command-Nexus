from pathlib import Path
import re

SOURCE_PATH = Path('src/missionchief-command-nexus.user.js')
README_PATH = Path('README.md')
SRC_README_PATH = Path('src/README.md')
CHANGELOG_PATH = Path('CHANGELOG.md')

source = SOURCE_PATH.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    source = source.replace(old, new, 1)


replace_once(
    '// @version      1.0.6',
    '// @version      1.0.7',
    'userscript metadata version',
)

mission_version_count = source.count('V10.6.73')
if mission_version_count < 1:
    raise SystemExit('Mission Finder V10.6.73 baseline was not found')
source = source.replace('V10.6.73', 'V10.6.74')
source = source.replace('v10673', 'v10674')

range_helper = r'''    function parseMissionRequirementRangeUpperBound(
        value
    ) {
        const cleaned = String(
            value ?? ''
        )
            .replace(/\s+/g, ' ')
            .trim();

        const match = cleaned.match(
            /^(\d+)\s*(?:-|–|—|to)\s*(\d+)$/i
        );

        if (!match) {
            return null;
        }

        const lower = parseInt(match[1], 10);
        const upper = parseInt(match[2], 10);

        if (
            !Number.isFinite(lower) ||
            !Number.isFinite(upper)
        ) {
            return null;
        }

        return Math.max(
            0,
            lower,
            upper
        );
    }

'''

if 'function parseMissionRequirementRangeUpperBound(' in source:
    raise SystemExit('Live requirement range helper already exists')
replace_once(
    '    function getLiveRequirementCellText(\n',
    range_helper + '    function getLiveRequirementCellText(\n',
    'live requirement range helper insertion',
)

replace_once(
    "        const explicitStillNeeded =\n"
    "            parseMissionRequirementNumber(\n"
    "                stillNeededText\n"
    "            );",
    "        const explicitStillNeeded =\n"
    "            parseMissionRequirementNumber(\n"
    "                stillNeededText\n"
    "            );\n\n"
    "        const explicitStillNeededRange =\n"
    "            parseMissionRequirementRangeUpperBound(\n"
    "                stillNeededText\n"
    "            );",
    'live requirement range parsing',
)

replace_once(
    "            stillNeededText ===\n"
    "                '?';",
    "            stillNeededText ===\n"
    "                '?' ||\n"
    "            explicitStillNeededRange !==\n"
    "                null;",
    'live requirement range confirmation state',
)

replace_once(
    "        let stillNeeded =\n"
    "            explicitStillNeeded;",
    "        // A bounded unresolved value such as 0-3 is actionable. Use the\n"
    "        // upper bound so Mission Update covers the worst-case shortage,\n"
    "        // while a completely unknown naked '?' continues through the\n"
    "        // existing trusted-row safety rules below.\n"
    "        let stillNeeded =\n"
    "            explicitStillNeededRange !== null\n"
    "                ? explicitStillNeededRange\n"
    "                : explicitStillNeeded;",
    'live requirement actionable range selection',
)

SOURCE_PATH.write_text(source, encoding='utf-8', newline='\n')

readme = README_PATH.read_text(encoding='utf-8')
if readme.count('**Current version:** `1.0.6`') != 1:
    raise SystemExit('README current version anchor changed')
readme = readme.replace(
    '**Current version:** `1.0.6`',
    '**Current version:** `1.0.7`',
    1,
)
README_PATH.write_text(readme, encoding='utf-8', newline='\n')

src_readme = SRC_README_PATH.read_text(encoding='utf-8')
for old, new, label in [
    ('| Command Nexus version | `1.0.6` |', '| Command Nexus version | `1.0.7` |', 'source README Command Nexus'),
    ('| Mission Finder baseline | `V10.6.73` |', '| Mission Finder baseline | `V10.6.74` |', 'source README Mission Finder'),
]:
    if src_readme.count(old) != 1:
        raise SystemExit(f'{label} anchor changed')
    src_readme = src_readme.replace(old, new, 1)
SRC_README_PATH.write_text(src_readme, encoding='utf-8', newline='\n')

changelog = CHANGELOG_PATH.read_text(encoding='utf-8')
anchor = '## [1.0.6] - 2026-07-20'
if changelog.count(anchor) != 1:
    raise SystemExit('CHANGELOG 1.0.6 anchor changed')
entry = '''## [1.0.7] - 2026-07-20

### Fixed

- Fixed Mission Update treating bounded unresolved requirement ranges such as `0-3` and `0-1` as zero by reading only the first number.
- Mission Update now uses the upper bound of an explicit range, allowing Fire Engine, ICCU/ACU, Police Car, PRV and SRV shortages from the live panel to reach the normal selector.
- Kept the existing safety behaviour for a completely unknown naked `?`, so unsupported unresolved rows still cannot resend an entire original mission load.
- Applied the corrected live-range interpretation to manual Mission Update and the shared Auto Mode update path.

### Changed

- Mission Finder baseline increased from `V10.6.73` to `V10.6.74`.

'''
changelog = changelog.replace(anchor, entry + anchor, 1)
CHANGELOG_PATH.write_text(changelog, encoding='utf-8', newline='\n')

# Structural assertions against the generated source.
generated = SOURCE_PATH.read_text(encoding='utf-8')
for required_text in [
    '// @version      1.0.7',
    'V10.6.74',
    'function parseMissionRequirementRangeUpperBound(',
    'explicitStillNeededRange !== null',
    '? explicitStillNeededRange',
]:
    if required_text not in generated:
        raise SystemExit(f'Generated source is missing: {required_text}')

print('v1.0.7 live requirement range patch applied successfully')
