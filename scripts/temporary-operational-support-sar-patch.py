#!/usr/bin/env python3
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def replace_in_segment(
    text: str,
    start_marker: str,
    end_marker: str,
    old: str,
    new: str,
    label: str,
) -> str:
    start = text.find(start_marker)
    if start < 0:
        raise SystemExit(f"{label}: start marker not found")
    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(f"{label}: end marker not found")
    body = text[start:end]
    count = body.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one scoped match, found {count}")
    return text[:start] + body.replace(old, new, 1) + text[end:]


source_path = Path("src/missionchief-command-nexus.user.js")
source = source_path.read_text(encoding="utf-8")
source = replace_once(source, "// @version      1.0.16", "// @version      1.0.17", "userscript version")
source = replace_once(
    source,
    " * MODULE 2: MISSION FINDER V10.6.80",
    " * MODULE 2: MISSION FINDER V10.6.81",
    "Mission Finder version",
)
source = replace_once(
    source,
    "    // V10.6.80: Critical Care Ambulances now require one trained person per vehicle.\n",
    "    // V10.6.81: Operational Support or SAR Vehicle requirements now select and\n"
    "    // verify the exact type-86 Operational Support Van. Fire type-39 Operational\n"
    "    // Support Units remain excluded from this SAR requirement.\n"
    "    // V10.6.80: Critical Care Ambulances now require one trained person per vehicle.\n",
    "Mission Finder release note",
)

alias_anchor = '        "Operational Support Vans": "Operational Support Van",\n'
aliases = (
    '        "Operational Support or SAR Vehicle": "Operational Support Van",\n'
    '        "Operational Support or SAR Vehicles": "Operational Support Van",\n'
    '        "Operational Support or SAR Vehicle x1": "Operational Support Van",\n'
    '        "Operational Support Van or SAR Vehicle": "Operational Support Van",\n'
    '        "Operational Support Vans or SAR Vehicles": "Operational Support Van",\n'
    '        "Operational Support Vehicle or SAR Vehicle": "Operational Support Van",\n'
    '        "Operational Support Vehicles or SAR Vehicles": "Operational Support Van",\n'
    '        "Operational Support or Personal SAR Vehicle": "Operational Support Van",\n'
    '        "Operational Support or Personal SAR Vehicles": "Operational Support Van",\n'
    '        "Required Operational Support or SAR Vehicle": "Operational Support Van",\n'
    '        "Required Operational Support or SAR Vehicles": "Operational Support Van",\n'
)
source = replace_once(source, alias_anchor, alias_anchor + aliases, "Operational Support aliases")

helper_marker = "    function getVehicleMatchCandidates(originalName, mappedName) {"
helper_code = r'''    function isOperationalSupportOrSarVehicleRequirement(
        originalName,
        mappedName
    ) {
        const raw = normaliseVehicleText(originalName);
        const mapped = normaliseVehicleText(mappedName);

        return (
            mapped === 'operational support van' ||
            raw === 'operational support van' ||
            raw === 'operational support vans' ||
            (
                !raw.includes('operational support unit') &&
                /\boperational support(?: vans?| vehicles?)?\b.*\bor\b.*\b(?:personal )?sar vehicles?\b/i.test(raw)
            )
        );
    }

    function isOperationalSupportVanCheckbox(input) {
        if (!input) return false;

        // MissionChief UK Operational Support Van type 86. This cannot collide
        // with the Fire Operational Support Unit, which is type 39.
        if (getVehicleTypeIdentifiers(input).includes('86')) {
            return true;
        }

        return getExtendedVehicleValues(input).some(value => {
            const cleaned = normaliseVehicleText(value);
            return (
                cleaned === 'operational support van' ||
                cleaned === 'operational support vans' ||
                cleaned === 'osv' ||
                cleaned === 'osvs'
            );
        });
    }

'''
source = replace_once(source, helper_marker, helper_code + helper_marker, "strict helper insertion")

dog_flag = '''        const dogSupportOnly =
            isDogSupportUnitRequirement(
                originalName,
                mappedName
            );

        const generic4x4Only ='''
dog_flag_with_operational = '''        const dogSupportOnly =
            isDogSupportUnitRequirement(
                originalName,
                mappedName
            );

        const operationalSupportOnly =
            isOperationalSupportOrSarVehicleRequirement(
                originalName,
                mappedName
            );

        const generic4x4Only ='''

source = replace_in_segment(
    source,
    "    function getAllMatchingVehicleCheckboxes(originalName, mappedName, includeChecked) {",
    "    function getMatchingVehicleCheckboxes(originalName, mappedName) {",
    dog_flag,
    dog_flag_with_operational,
    "selection strict flag",
)
strict_selection = '''        if (operationalSupportOnly) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => {
                    if (input.disabled) return false;
                    if (!includeChecked && input.checked) return false;
                    return isOperationalSupportVanCheckbox(input);
                })
            );
        }

'''
source = replace_in_segment(
    source,
    "    function getAllMatchingVehicleCheckboxes(originalName, mappedName, includeChecked) {",
    "    function getMatchingVehicleCheckboxes(originalName, mappedName) {",
    "        if (iccuPreferred) {",
    strict_selection + "        if (iccuPreferred) {",
    "selection type-86 route",
)

source = replace_in_segment(
    source,
    "    function countSelectedMatchingVehicles(originalName, mappedName) {",
    "    function refreshVehicleRequirementCounters() {",
    dog_flag,
    dog_flag_with_operational,
    "verification strict flag",
)
source = replace_in_segment(
    source,
    "    function countSelectedMatchingVehicles(originalName, mappedName) {",
    "    function refreshVehicleRequirementCounters() {",
    '''            } else if (dogSupportOnly) {
                matches = isDogSupportUnitCheckbox(
                    input
                );
            } else if (iccuPreferred) {''',
    '''            } else if (dogSupportOnly) {
                matches = isDogSupportUnitCheckbox(
                    input
                );
            } else if (operationalSupportOnly) {
                matches = isOperationalSupportVanCheckbox(input);
            } else if (iccuPreferred) {''',
    "verification type-86 route",
)

direct_route = '''        if (
            isOperationalSupportOrSarVehicleRequirement(
                requestedName,
                mappedName
            )
        ) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => (
                    !input.disabled &&
                    !input.checked &&
                    isOperationalSupportVanCheckbox(input)
                ))
            )[0] || null;
        }

'''
source = replace_in_segment(
    source,
    "    function findUnitButton(mappedName, originalName) {",
    "    async function clickUnitButton",
    '''        if (
            isIccuOrAmbulanceControlRequirement(''',
    direct_route + '''        if (
            isIccuOrAmbulanceControlRequirement(''',
    "direct type-86 fallback",
)
source_path.write_text(source, encoding="utf-8", newline="\n")

changelog_path = Path("CHANGELOG.md")
changelog = changelog_path.read_text(encoding="utf-8")
release_notes = '''## [1.0.17] - 2026-07-22

### Fixed

- Restored the `Operational Support or SAR Vehicle` requirement mapping to `Operational Support Van`.
- Unit Finder, Mission Update/Upgrade and final selected-unit verification now use the exact MissionChief type-86 Operational Support Van.
- Fire Operational Support Units using type 39 are explicitly excluded from satisfying the SAR requirement.
- Added current, legacy, singular, plural, `Required` and `x1` wording aliases for the same requirement.

### Changed

- Mission Finder increased from `V10.6.80` to `V10.6.81`.

'''
changelog = replace_once(
    changelog,
    "## [1.0.16] - 2026-07-22",
    release_notes + "## [1.0.16] - 2026-07-22",
    "changelog release section",
)
changelog_path.write_text(changelog, encoding="utf-8", newline="\n")

readme_path = Path("README.md")
readme = readme_path.read_text(encoding="utf-8")
readme = replace_once(
    readme,
    "**Current version:** `1.0.16` · **Mission Finder engine:** `V10.6.80`",
    "**Current version:** `1.0.17` · **Mission Finder engine:** `V10.6.81`",
    "README baseline",
)
readme = replace_once(
    readme,
    "[**v1.0.16**](#current-v1016-behaviour)",
    "[**v1.0.17**](#current-v1017-behaviour)",
    "README navigation",
)
readme = replace_once(
    readme,
    "## Current v1.0.16 behaviour",
    "## Current v1.0.17 behaviour",
    "README behaviour heading",
)
readme = replace_once(
    readme,
    "- SAR Commander demand converts to Control Van capability.\n",
    "- SAR Commander demand converts to Control Van capability.\n"
    "- `Operational Support or SAR Vehicle` selects and verifies the exact type-86 Operational Support Van.\n",
    "README behaviour bullet",
)
readme_path.write_text(readme, encoding="utf-8", newline="\n")

source_readme_path = Path("src/README.md")
source_readme = source_readme_path.read_text(encoding="utf-8")
source_readme = replace_once(
    source_readme,
    "| Command Nexus version | `1.0.16` |",
    "| Command Nexus version | `1.0.17` |",
    "source README version",
)
source_readme = replace_once(
    source_readme,
    "| Mission Finder baseline | `V10.6.80` |",
    "| Mission Finder baseline | `V10.6.81` |",
    "source README Mission Finder",
)
source_readme_path.write_text(source_readme, encoding="utf-8", newline="\n")

print("Operational Support SAR patch applied.")
