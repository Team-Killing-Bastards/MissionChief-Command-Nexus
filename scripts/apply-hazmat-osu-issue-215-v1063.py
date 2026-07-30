#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src' / 'missionchief-command-nexus.user.js'
source = SOURCE.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


source = replace_once(
    source,
    '// @version      1.0.62',
    '// @version      1.0.63',
    'userscript version'
)
source = replace_once(
    source,
    ' * MODULE 2: MISSION FINDER V10.6.125',
    ' * MODULE 2: MISSION FINDER V10.6.126',
    'Mission Finder version'
)

alias_anchor = '''        "Hazmat Unit": "OSU",
        "Hazmat Units": "OSU",
        "HazMat Unit or CBRN Vehicle": "OSU",
'''
alias_replacement = '''        "Hazmat Unit": "OSU",
        "Hazmat Units": "OSU",
        "Required HazMat": "OSU",
        "Required Hazmat": "OSU",
        "Required HazMat Unit": "OSU",
        "Required HazMat Units": "OSU",
        "Required Hazmat Unit": "OSU",
        "Required Hazmat Units": "OSU",
        "Required HazMat Unit x1": "OSU",
        "Required HazMat Units x1": "OSU",
        "Required Hazmat Unit x1": "OSU",
        "Required Hazmat Units x1": "OSU",
        "HazMat Unit or CBRN Vehicle": "OSU",
'''
source = replace_once(
    source,
    alias_anchor,
    alias_replacement,
    'HazMat required-caption aliases'
)

helper_anchor = '''    function isFireOperationalSupportRequirement(originalName, mappedName) {
        const raw = normaliseVehicleText(originalName);
        const mapped = normaliseVehicleText(mappedName);
        return mapped === 'osu' || mapped === 'operational support unit' ||
            /\\b(?:basus?|breathing apparatus support (?:units?|vehicles?)|welfare(?: units?| vehicles?)?|hazmat(?: units?)?|cbrn vehicles?|fire operational support units?)\\b/i.test(raw);
    }

    function isFireOperationalSupportUnitCheckbox(input) {
        if (!input) return false;
        const ids = getVehicleTypeIdentifiers(input);
        if (ids.length > 0) return ids.includes('39');
'''
helper_replacement = '''    const MF_FIRE_OPERATIONAL_SUPPORT_TYPE_ID = '39';

    const MF_HAZMAT_OSU_REQUIREMENT_NAMES = new Set([
        'hazmat',
        'hazmat unit',
        'hazmat units',
        'required hazmat',
        'required hazmat unit',
        'required hazmat units',
        'hazmat unit or cbrn vehicle',
        'hazmat units or cbrn vehicles',
        'required hazmat unit or cbrn vehicle',
        'required hazmat units or cbrn vehicles'
    ]);

    function isHazMatOsuRequirement(originalName, mappedName) {
        const raw = normaliseVehicleText(originalName)
            .replace(/\\s+x\\s*1$/i, '')
            .trim();
        const mapped = normaliseVehicleText(mappedName);

        return (
            MF_HAZMAT_OSU_REQUIREMENT_NAMES.has(raw) ||
            (
                (mapped === 'osu' || mapped === 'operational support unit') &&
                /\\bhazmat\\b/i.test(raw)
            )
        );
    }

    function isFireOperationalSupportRequirement(originalName, mappedName) {
        const raw = normaliseVehicleText(originalName);
        const mapped = normaliseVehicleText(mappedName);
        return isHazMatOsuRequirement(originalName, mappedName) ||
            mapped === 'osu' || mapped === 'operational support unit' ||
            /\\b(?:basus?|breathing apparatus support (?:units?|vehicles?)|welfare(?: units?| vehicles?)?|cbrn vehicles?|fire operational support units?)\\b/i.test(raw);
    }

    function isFireOperationalSupportUnitCheckbox(input) {
        if (!input) return false;
        const ids = getVehicleTypeIdentifiers(input);
        if (ids.length > 0) {
            return ids.includes(
                MF_FIRE_OPERATIONAL_SUPPORT_TYPE_ID
            );
        }
'''
source = replace_once(
    source,
    helper_anchor,
    helper_replacement,
    'exact HazMat OSU helpers'
)

strict_anchor = '''        const strictVehicleTypeOnly = !!(
            isAmbulanceTransportRequest(originalName, mappedName) ||
            isFireEngineRequirement(originalName, mappedName) ||
            isFlatbedRecoveryVehicleRequirement(originalName, mappedName)
        );
'''
strict_replacement = '''        const strictVehicleTypeOnly = !!(
            isAmbulanceTransportRequest(originalName, mappedName) ||
            isFireEngineRequirement(originalName, mappedName) ||
            isFlatbedRecoveryVehicleRequirement(originalName, mappedName) ||
            isFireOperationalSupportRequirement(originalName, mappedName)
        );
'''
source = replace_once(
    source,
    strict_anchor,
    strict_replacement,
    'OSU strict no-fallback selection'
)

# Release documentation.
changelog = ROOT / 'CHANGELOG.md'
changelog_text = changelog.read_text(encoding='utf-8')
entry = '''## [1.0.63] - 2026-07-31

### Fixed

- Fixed Issue #215 by mapping singular, plural and `Required` HazMat-unit captions directly to the Fire Operational Support Unit.
- HazMat-unit requirements now accept only exact MissionChief vehicle type `39` OSUs; type `7` HazMat Units, type `86` Operational Support Vans and other support vehicles cannot satisfy the requirement.
- OSU requirements are now strict no-fallback selections in Unit Finder, Mission Update/Upgrade and Auto Mode while preserving exact quantities and counting already selected OSUs.

### Changed engine baseline

- Mission Finder increased from `V10.6.125` to `V10.6.126`.
- Personnel Assignment remains `1.3.7`.

'''
if '## [1.0.63]' not in changelog_text:
    changelog_text = changelog_text.replace(
        '## [1.0.62]',
        entry + '## [1.0.62]',
        1
    )
changelog.write_text(changelog_text, encoding='utf-8')

for path in [ROOT / 'README.md', ROOT / 'src' / 'README.md']:
    text = path.read_text(encoding='utf-8')
    text = text.replace('`1.0.62`', '`1.0.63`')
    text = text.replace('`V10.6.125`', '`V10.6.126`')
    path.write_text(text, encoding='utf-8')

# Keep version-sensitive permanent checks aligned with the new release.
for path in (ROOT / 'scripts').glob('*.mjs'):
    text = path.read_text(encoding='utf-8')
    updated = text.replace('// @version      1.0.62', '// @version      1.0.63')
    updated = updated.replace('MISSION FINDER V10.6.125', 'MISSION FINDER V10.6.126')
    updated = updated.replace(' * MODULE 2: MISSION FINDER V10.6.125', ' * MODULE 2: MISSION FINDER V10.6.126')
    if updated != text:
        path.write_text(updated, encoding='utf-8')

SOURCE.write_text(source, encoding='utf-8')
print('Applied v1.0.63 Issue #215 HazMat-to-OSU correction.')
