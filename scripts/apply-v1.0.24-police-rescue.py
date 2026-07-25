from pathlib import Path
import re

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

rescue_helpers = r'''    function isRescueSupportRequirement(
        originalName,
        mappedName
    ) {
        const raw = normaliseVehicleText(originalName);
        const mapped = normaliseVehicleText(mappedName);

        return (
            /^(?:required\s+)?rescue\s+support\s+(?:units?|vehicles?)$/i.test(raw) ||
            /^(?:required\s+)?rescue\s+support\s+(?:units?|vehicles?)\s+or\s+rescue\s+pumps?$/i.test(raw) ||
            /^fire\s+engines?\s+or\s+rescue\s+support\s+vehicles?$/i.test(raw) ||
            /^fire\s+engines?,\s+rescue\s+support\s+vehicles?\s+or\s+aerial\s+appliance\s+trucks?$/i.test(raw) ||
            mapped === 'fire engine r/pump x 1'
        );
    }

    function isRescueSupportVehicleCheckbox(input) {
        if (!input) return false;

        const typeIdentifiers =
            getVehicleTypeIdentifiers(
                input
            );

        if (
            typeIdentifiers.includes('75') ||
            typeIdentifiers.includes('76')
        ) {
            return false;
        }

        return getExtendedVehicleValues(input).some(value => {
            const normalised = normaliseVehicleText(value);
            const displayed = normaliseSartecDisplayedName(value);

            if (
                /major\s+foam\s+tender|(?:^|\b)MFT(?:\b|$)|rapid\s+intervention\s+vehicle|(?:^|\b)RIV(?:\b|$)/i.test(
                    displayed
                )
            ) {
                return false;
            }

            return (
                normalised === 'fire engine' ||
                normalised === 'fire engines' ||
                normalised === 'pump' ||
                normalised === 'pumps' ||
                normalised === 'rescue pump' ||
                normalised === 'rescue pumps' ||
                normalised === 'rescue support unit' ||
                normalised === 'rescue support units' ||
                normalised === 'rescue support vehicle' ||
                normalised === 'rescue support vehicles' ||
                /^(?:R\/?PUMP|Rescue\s+Pump|Fire\s+Engine|Pump)\b/i.test(
                    displayed
                )
            );
        });
    }

'''
replace_once(
    '    function isMajorFoamTenderVehicleCheckbox(',
    rescue_helpers + '    function isMajorFoamTenderVehicleCheckbox(',
    'Rescue Support strict helpers',
)

all_matching_guard = r'''        if (
            isRescueSupportRequirement(
                originalName,
                mappedName
            )
        ) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => {
                    if (input.disabled) return false;
                    if (!includeChecked && input.checked) return false;
                    return isRescueSupportVehicleCheckbox(input);
                })
            );
        }

'''
replace_once(
    '''    function getAllMatchingVehicleCheckboxes(originalName, mappedName, includeChecked) {
        // BASU, Welfare and HazMat share the same selected exact type-39 Fire OSU.''',
    '''    function getAllMatchingVehicleCheckboxes(originalName, mappedName, includeChecked) {
''' + all_matching_guard + '''        // BASU, Welfare and HazMat share the same selected exact type-39 Fire OSU.''',
    'Rescue Support all-matching guard',
)

count_guard = r'''        if (
            isRescueSupportRequirement(
                originalName,
                mappedName
            )
        ) {
            return getVehicleCheckboxSnapshot().filter(input => {
                return (
                    input.checked &&
                    isRescueSupportVehicleCheckbox(input)
                );
            }).length;
        }

'''
replace_once(
    '''    function countSelectedMatchingVehicles(originalName, mappedName) {
        if (isFireOperationalSupportRequirement(originalName, mappedName)) {''',
    '''    function countSelectedMatchingVehicles(originalName, mappedName) {
''' + count_guard + '''        if (isFireOperationalSupportRequirement(originalName, mappedName)) {''',
    'Rescue Support selected-count guard',
)

find_guard = r'''        if (
            isRescueSupportRequirement(
                originalName,
                mappedName
            )
        ) {
            // Checkbox only: never use a broad AAO/ARR group button for this
            // requirement because those groups can dispatch an RIV or MFT.
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot(true).filter(input => {
                    return (
                        !input.disabled &&
                        !input.checked &&
                        isRescueSupportVehicleCheckbox(input)
                    );
                })
            )[0] || null;
        }

'''
replace_once(
    '''    function findUnitButton(mappedName, originalName) {
        if (isFireOperationalSupportRequirement(originalName, mappedName)) {''',
    '''    function findUnitButton(mappedName, originalName) {
''' + find_guard + '''        if (isFireOperationalSupportRequirement(originalName, mappedName)) {''',
    'Rescue Support strict fallback guard',
)

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

required_markers = [
    '// @version      1.0.24',
    'MODULE 2: MISSION FINDER V10.6.89',
    'function isRescueSupportRequirement(',
    'function isRescueSupportVehicleCheckbox(',
    "typeIdentifiers.includes('75')",
    "typeIdentifiers.includes('76')",
    'convertedFromPersonnelRequirement:',
    "getPoliceOfficerVehicleRequirement(\n                    'Police Officers'",
    "if (stillNeededText === '?')",
    'UNIT FINDER ARMED PERSONNEL',
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

- `Missing Personnel: N Police Officers` now always converts through the canonical two-officers-per-Police-Car rule using ceiling division: 1–2 officers select 1 ordinary IRV, 3–4 select 2, and 5 select 3.
- Hardened the dynamic Missing Personnel count parser so both number-first and name-first personnel wording retain their numeric values.
- Rescue Support Unit/Vehicle requirements now use a strict Rescue Pump/Fire Engine checkbox route and explicitly reject type-75 Major Foam Tenders and type-76 RIVs.
- Rescue Support retry and verification now count the same strict vehicle pool, preventing the final missing popup from changing the requirement into Major Foam Tender.

### Preserved

- Numeric and bounded-range `Still Needed` values remain authoritative; only a literal `?` falls back to `Required`.
- Existing ordinary-IRV specialist-training protection, exact trained-vehicle verification, Armed Traffic Car handling and the legitimate RIV-first/Major-Foam fallback requirement remain unchanged.

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

print('Prepared v1.0.24 Police Officer and Rescue Support fixes.')
