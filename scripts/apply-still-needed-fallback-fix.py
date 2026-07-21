import re
from pathlib import Path

SOURCE_PATH = Path('src/missionchief-command-nexus.user.js')
CHANGELOG_PATH = Path('CHANGELOG.md')
README_PATH = Path('README.md')
SRC_README_PATH = Path('src/README.md')

source = SOURCE_PATH.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    source = source.replace(old, new, 1)


def regex_replace_once(pattern: str, replacement: str, label: str) -> None:
    global source
    source, count = re.subn(
        pattern,
        lambda _match: replacement,
        source,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one regex match, found {count}')


replace_once(
    '// @version      1.0.12',
    '// @version      1.0.13',
    'userscript version',
)

if 'V10.6.78' not in source:
    raise SystemExit('Mission Finder V10.6.78 marker missing')
source = source.replace('V10.6.78', 'V10.6.79')

new_helper = '''    function getLiveRequirementDispatchTarget(
        parsedRow
    ) {
        const required = Math.max(
            0,
            parseInt(
                parsedRow?.required,
                10
            ) || 0
        );

        const reportedStillNeeded = Math.max(
            0,
            parseInt(
                parsedRow?.stillNeeded,
                10
            ) || 0
        );

        const stillNeededText = String(
            parsedRow?.stillNeededText ?? ''
        )
            .replace(/\\s+/g, ' ')
            .trim();

        // The live shortage remains authoritative whenever MissionChief gives
        // a number or bounded range. Only a literal unknown "?" falls back to
        // the Required total. The selection layer still subtracts matching
        // vehicles already selected before it clicks any additional units.
        if (stillNeededText === '?') {
            return required > 0
                ? required
                : reportedStillNeeded;
        }

        if (stillNeededText) {
            return reportedStillNeeded;
        }

        // Defensive fallback for a legacy or partial live row where the
        // Still Needed cell is absent rather than explicitly zero.
        return required > 0
            ? required
            : reportedStillNeeded;
    }

    function readLiveMissionRequirementRow('''

regex_replace_once(
    r'''    function getLiveRequirementDispatchTarget\(\n        parsedRow\n    \) \{.*?\n    \}\n\n    function readLiveMissionRequirementRow\(''',
    new_helper,
    'live requirement dispatch target helper',
)

replace_once(
    '''                            `using-required-target=${liveDispatchTarget} | ` +
                            `panel-still=${parsed.stillNeeded}`''',
    '''                            `using-update-target=${liveDispatchTarget} | ` +
                            `target-source=${parsed.stillNeededText === '?' ? 'required-fallback' : 'still-needed'} | ` +
                            `panel-still=${parsed.stillNeeded}`''',
    'live row target debug output',
)

regex_replace_once(
    r'''                            dispatchTargetSource:\n                                parsed\.required > 0\n                                    \? 'required'\n                                    : 'reported-still-needed' ''',
    '''                            dispatchTargetSource:
                                parsed.stillNeededText === '?'
                                    ? 'required-fallback-for-unknown'
                                    : (
                                        parsed.stillNeededText
                                            ? 'reported-still-needed'
                                            : 'required-fallback-for-missing-cell'
                                    ) ''',
    'dispatch target source metadata',
)

required_markers = [
    '// @version      1.0.13',
    'MODULE 2: MISSION FINDER V10.6.79',
    "if (stillNeededText === '?')",
    "? 'required-fallback-for-unknown'",
    'needed -\n                    selectedBefore',
    'UNIT FINDER ARMED PERSONNEL',
    "requirementType: 'armed_response_atc_vehicle'",
]
for marker in required_markers:
    if marker not in source:
        raise SystemExit(f'missing final source marker: {marker}')

SOURCE_PATH.write_text(source, encoding='utf-8', newline='\n')

changelog = CHANGELOG_PATH.read_text(encoding='utf-8')
release_heading = '## [1.0.12] - 2026-07-21'
if release_heading not in changelog:
    raise SystemExit('1.0.12 changelog heading missing')
entry = '''## [1.0.13] - 2026-07-21

### Fixed

- Mission Update/Upgrade now uses a numeric `Still Needed` value as the dispatch shortage instead of replacing it with the full `Required` total.
- A bounded `Still Needed` range such as `0-3` continues to use its upper bound.
- A literal `Still Needed` value of `?` now falls back to the row's `Required` value.
- Existing matching selections are still deducted before additional vehicles are selected.

### Preserved

- The v1.0.12 Armed Personnel to exact type-25 Armed Traffic Car route remains enabled, including Roads Policing plus Firearms live verification and the two-person-first/one-person-fallback policy.

### Changed

- Mission Finder increased from `V10.6.78` to `V10.6.79`.

'''
if '## [1.0.13] - 2026-07-21' not in changelog:
    changelog = changelog.replace(release_heading, entry + release_heading, 1)
CHANGELOG_PATH.write_text(changelog, encoding='utf-8', newline='\n')

for path in (README_PATH, SRC_README_PATH):
    text = path.read_text(encoding='utf-8')
    text = text.replace('1.0.12', '1.0.13')
    text = text.replace('V10.6.78', 'V10.6.79')
    path.write_text(text, encoding='utf-8', newline='\n')

print('Applied v1.0.13 Still Needed / Required fallback correction.')
