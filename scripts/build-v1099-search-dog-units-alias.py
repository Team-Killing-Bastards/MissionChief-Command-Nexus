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


source = replace_once(source, '// @version      1.0.98', '// @version      1.0.99', 'userscript version')
source = replace_once(source, ' * MODULE 2: MISSION FINDER V10.6.147', ' * MODULE 2: MISSION FINDER V10.6.148', 'Mission Finder version')

old_matcher = "        return /^(?:Required\\s+)?(?:\\d+\\s+)?Rescue Dog(?:s)?$/i.test(cleaned);"
new_matcher = "        return /^(?:Required\\s+)?(?:\\d+\\s+)?(?:Rescue Dogs?|Search Dog Units?)$/i.test(cleaned);"
source = replace_once(source, old_matcher, new_matcher, 'Rescue/Search Dog requirement alias matcher')
source_path.write_text(source, encoding='utf-8')

# Keep permanent regression metadata pinned to the current production candidate.
for path in (ROOT / 'scripts').glob('check-*.mjs'):
    text = path.read_text(encoding='utf-8')
    text = text.replace('// @version      1.0.98', '// @version      1.0.99')
    text = text.replace('MISSION FINDER V10.6.147', 'MISSION FINDER V10.6.148')
    text = text.replace('Mission Finder V10.6.147', 'Mission Finder V10.6.148')
    text = text.replace('Expected Command Nexus 1.0.98', 'Expected Command Nexus 1.0.99')
    text = text.replace('Expected Mission Finder V10.6.147', 'Expected Mission Finder V10.6.148')
    path.write_text(text, encoding='utf-8')

regression_path = ROOT / 'scripts/check-rescue-dog-search-dog-v1098.mjs'
regression = regression_path.read_text(encoding='utf-8')
regression = replace_once(
    regression,
    "  ` yes: ['Rescue Dog', 'Rescue Dogs', '1 Rescue Dog', 'Required Rescue Dog', 'Required 2 Rescue Dogs'].map(isRescueDogRequirementName),` +",
    "  ` yes: ['Rescue Dog', 'Rescue Dogs', '1 Rescue Dog', 'Required Rescue Dog', 'Required 2 Rescue Dogs', 'Search Dog Unit', 'Search Dog Units', '2 Search Dog Units', 'Required Search Dog Unit', 'Required Search Dog Units', 'Required 2 Search Dog Units'].map(isRescueDogRequirementName),` +",
    'Search Dog Units regression aliases'
)
regression = replace_once(
    regression,
    "expect(classifier.includes('isRescueDogRequirementName(value)'), 'Search Dog classifier must consume only Rescue Dog requirement names');",
    "expect(classifier.includes('isRescueDogRequirementName(value)'), 'Search Dog classifier must consume the strict Rescue/Search Dog requirement-name matcher');",
    'Search Dog classifier regression message'
)
regression = replace_once(
    regression,
    "console.log('PASS: Rescue Dog requirements route only to exact Search Dog Unit type 101 across candidate selection, selected-unit verification and strict generic-fallback protection.');",
    "console.log('PASS: Rescue Dog and Search Dog Unit requirement aliases route only to exact Search Dog Unit type 101 across candidate selection, selected-unit verification and strict generic-fallback protection.');",
    'Search Dog regression pass message'
)
regression_path.write_text(regression, encoding='utf-8')

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(readme, '**Current version:** `1.0.98`', '**Current version:** `1.0.99`', 'README version')
readme = replace_once(readme, '**Mission Finder engine:** `V10.6.147`', '**Mission Finder engine:** `V10.6.148`', 'README Mission Finder')
readme_path.write_text(readme, encoding='utf-8')

src_readme_path = ROOT / 'src/README.md'
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = replace_once(src_readme, '| Command Nexus version | `1.0.98` |', '| Command Nexus version | `1.0.99` |', 'src README version')
src_readme = replace_once(src_readme, '| Mission Finder baseline | `V10.6.147` |', '| Mission Finder baseline | `V10.6.148` |', 'src README Mission Finder')
src_readme_path.write_text(src_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## [1.0.99] - 2026-08-11

### Fixed

- Extended the existing exact Search Dog Unit cross-reference so MissionChief requirement **Required Search Dog Units** follows the same strict rule as **Rescue Dog**.
- Supported Search Dog Unit wording now includes singular/plural, optional numeric quantities, and optional `Required` prefixes while continuing to select exact MissionChief vehicle type `101`.
- Police **Dog Support Unit (DSU)** demand remains separate and is not captured by the Search Dog matcher.
- Generic fallback remains blocked for this specialist requirement, so an unrelated vehicle cannot satisfy Search Dog Unit demand when no type `101` unit is available.

### Regression coverage

- Extended `scripts/check-rescue-dog-search-dog-v1098.mjs` with `Search Dog Unit`, `Search Dog Units`, counted variants, `Required Search Dog Unit`, the reported `Required Search Dog Units`, and counted `Required` variants.
- Existing negative coverage continues to reject Police Dog / Dog Support Unit wording and unrelated rescue or towing requirements.

### Changed engine baseline

- Command Nexus increased from `1.0.98` to `1.0.99`.
- Mission Finder increased from `V10.6.147` to `V10.6.148`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

'''
changelog = replace_once(changelog, '## [1.0.98] - 2026-08-10\n', entry + '## [1.0.98] - 2026-08-10\n', 'CHANGELOG insertion')
changelog_path.write_text(changelog, encoding='utf-8')

trigger = ROOT / 'scripts/.v1099-search-dog-units-build-trigger'
if trigger.exists():
    trigger.unlink()

print('Built Command Nexus 1.0.99 Search Dog Units alias candidate.')
