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


def replace_between(start_marker: str, end_marker: str, replacement: str, label: str) -> None:
    global source
    start = source.find(start_marker)
    if start < 0:
        raise SystemExit(f'{label}: start marker not found')
    end = source.find(end_marker, start)
    if end < 0:
        raise SystemExit(f'{label}: end marker not found')
    if source.find(start_marker, start + 1) >= 0:
        raise SystemExit(f'{label}: duplicate start marker found')
    source = source[:start] + replacement + source[end:]


replace_once('// @version      1.0.23', '// @version      1.0.24', 'userscript version')

mission_version_count = source.count('V10.6.88')
if mission_version_count < 1:
    raise SystemExit('Mission Finder V10.6.88 marker missing')
source = source.replace('V10.6.88', 'V10.6.89')

# Build the dynamic RegExp through explicit string concatenation so word,
# digit and whitespace escapes survive JavaScript string parsing unchanged.
new_count_function = r'''    function getNamedPersonnelCount(
        personnelSegment,
        namePatternSource
    ) {
        const segment =
            String(
                personnelSegment ||
                ''
            );

        if (
            !segment ||
            !namePatternSource
        ) {
            return 0;
        }

        const patternSource =
            '(?:\\b(\\d+)\\s*(?:x\\s*)?' +
            namePatternSource +
            '\\b|\\b' +
            namePatternSource +
            '\\b\\s*(?:x\\s*)?(\\d+))';

        const pattern =
            new RegExp(
                patternSource,
                'gi'
            );

        let maximum = 0;
        let match;

        while (
            (
                match =
                    pattern.exec(
                        segment
                    )
            )
        ) {
            maximum =
                Math.max(
                    maximum,
                    parseInt(
                        match[1] ||
                        match[2],
                        10
                    ) ||
                    0
                );
        }

        return maximum;
    }

'''
replace_between(
    '    function getNamedPersonnelCount(',
    '    function shouldSkipLiveRequirement(',
    new_count_function,
    'Missing Personnel count parser',
)

# Make the alert path use the same canonical two-officers-per-car helper used by
# live table and shared operational row normalisation.
police_block_start = '''        // Police Cars normally carry 2 Police Officers.
        const policeOfficersNeeded ='''
police_block_end = '''        // Coastguard Mud Rescue Units carry 5 Mud Rescue Operators each.'''
new_police_block = r'''        // Police Cars normally carry 2 Police Officers.
        const policeOfficersNeeded =
            getNamedPersonnelCount(
                personnelSegment,
                'police\\s+officer(?:s)?'
            );

        if (policeOfficersNeeded > 0) {
            const conversion =
                getPoliceOfficerVehicleRequirement(
                    'Police Officers',
                    policeOfficersNeeded
                );

            if (conversion) {
                rows.push({
                    unitName:
                        conversion.unitName,
                    stillNeeded:
                        conversion.stillNeeded,
                    personnelRequirement:
                        `${conversion.personnelRequired} Police Officer${conversion.personnelRequired === 1 ? '' : 's'}`,
                    personnelPerVehicle:
                        conversion.personnelPerVehicle,
                    convertedFromPersonnelRequirement:
                        true
                });

                if (
                    mfDebugEnabled &&
                    !silent
                ) {
                    debugLog(
                        'UPDATE PERSONNEL',
                        `${conversion.personnelRequired} Police Officer${conversion.personnelRequired === 1 ? '' : 's'} -> select ${conversion.unitName} x${conversion.stillNeeded} (${conversion.personnelPerVehicle} personnel per vehicle)`
                    );
                }
            }
        }

'''
replace_between(
    police_block_start,
    police_block_end,
    new_police_block + police_block_end,
    'Police Officer Missing Personnel conversion',
)

# These current-main contracts must remain present. The release does not replace
# the established type-83 Rescue Support selector with a broad Fire Engine rule.
required_markers = [
    '// @version      1.0.24',
    'MODULE 2: MISSION FINDER V10.6.89',
    "getPoliceOfficerVehicleRequirement(\n                    'Police Officers'",
    'convertedFromPersonnelRequirement:',
    "if (stillNeededText === '?')",
    'UNIT FINDER ARMED PERSONNEL',
    'Rescue Support Vehicle',
    "includes('83')",
]
for marker in required_markers:
    if marker not in source:
        raise SystemExit(f'missing final source marker: {marker}')

SOURCE_PATH.write_text(source, encoding='utf-8', newline='\n')

changelog = CHANGELOG_PATH.read_text(encoding='utf-8')
release_heading = '## [1.0.23] - 2026-07-24'
if release_heading not in changelog:
    raise SystemExit('1.0.23 changelog heading missing')
entry = '''## [1.0.24] - 2026-07-25

### Fixed

- `Missing Personnel: N Police Officers` now always passes through the canonical two-officers-per-Police-Car conversion using ceiling division: 1–2 officers select 1 ordinary IRV, 3–4 select 2, and 5 select 3.
- Hardened the dynamic Missing Personnel count parser so number-first (`5 Police Officers`) and name-first (`Police Officers x5`) wording preserve the same numeric demand.

### Verified and preserved

- Numeric and bounded-range `Still Needed` values remain authoritative; only a literal `?` or absent cell falls back to `Required`.
- The established exact type-83 Rescue Support Vehicle selector remains isolated from type-75 Major Foam Tenders and type-76 RIVs during initial selection, selected counting, fallback and retry verification.
- Armed Traffic Car trained-personnel selection and legitimate explicit RIV-first/Major-Foam fallback requirements remain unchanged.

### Changed

- Mission Finder increased from `V10.6.88` to `V10.6.89`.

'''
if '## [1.0.24] - 2026-07-25' not in changelog:
    changelog = changelog.replace(release_heading, entry + release_heading, 1)
CHANGELOG_PATH.write_text(changelog, encoding='utf-8', newline='\n')

readme = README_PATH.read_text(encoding='utf-8')
readme = readme.replace('**Current version:** `1.0.23`', '**Current version:** `1.0.24`')
readme = readme.replace('**Mission Finder engine:** `V10.6.88`', '**Mission Finder engine:** `V10.6.89`')
README_PATH.write_text(readme, encoding='utf-8', newline='\n')

src_readme = SRC_README_PATH.read_text(encoding='utf-8')
src_readme = src_readme.replace('| Command Nexus version | `1.0.23` |', '| Command Nexus version | `1.0.24` |')
src_readme = src_readme.replace('| Mission Finder baseline | `V10.6.88` |', '| Mission Finder baseline | `V10.6.89` |')
SRC_README_PATH.write_text(src_readme, encoding='utf-8', newline='\n')

print('Prepared v1.0.24 Police Officer alert hardening.')
