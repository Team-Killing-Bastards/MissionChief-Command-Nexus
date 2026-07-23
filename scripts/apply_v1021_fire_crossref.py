from __future__ import annotations

import re
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def replace_section(
    text: str,
    start_token: str,
    end_token: str,
    transform,
    label: str,
) -> str:
    start = text.find(start_token)
    if start < 0:
        raise SystemExit(f"{label}: start token not found")
    end = text.find(end_token, start)
    if end < 0:
        raise SystemExit(f"{label}: end token not found")
    section = text[start:end]
    updated = transform(section)
    if updated == section:
        raise SystemExit(f"{label}: section was not changed")
    return text[:start] + updated + text[end:]


source_path = Path("src/missionchief-command-nexus.user.js")
source = source_path.read_text(encoding="utf-8")

source = replace_once(
    source,
    "// @version      1.0.20",
    "// @version      1.0.21",
    "userscript version",
)
source = replace_once(
    source,
    " * MODULE 2: MISSION FINDER V10.6.85",
    " * MODULE 2: MISSION FINDER V10.6.86",
    "Mission Finder version",
)

release_anchor = '    // V10.6.85: Fire cross-reference now maps the exact "Road Rail Unit"\n'
release_note = (
    "    // V10.6.86: Firefighters convert to Rescue Pumps at nine personnel\n"
    "    // per vehicle; Car Recovery maps to the existing Flatbed Recovery\n"
    "    // Vehicle; RIV-or-Major-Foam-Tender wording uses RIV first and only\n"
    "    // falls back to a Major Foam Tender when no eligible RIV is available.\n"
)
source = replace_once(
    source,
    release_anchor,
    release_note + release_anchor,
    "Mission Finder release note",
)

alias_anchor = '        "Road Rail Unit": "RRU",\n'
new_aliases = (
    '        "Firefighter": "Rescue Pump",\n'
    '        "Firefighters": "Rescue Pump",\n'
    '        "Required Firefighter": "Rescue Pump",\n'
    '        "Required Firefighters": "Rescue Pump",\n'
    '        "Car Recovery": "Flatbed Recovery Vehicle",\n'
    '        "Required Car Recovery": "Flatbed Recovery Vehicle",\n'
)
source = replace_once(
    source,
    alias_anchor,
    alias_anchor + new_aliases,
    "Fire and recovery aliases",
)

source = replace_once(
    source,
    '        "RIVs or Major Foam Tenders": "Major Foam Tender",\n',
    '        "RIVs or Major Foam Tenders": "RIV",\n',
    "existing plural RIV/MFT mapping",
)

riv_alias_anchor = '        "RIVs or Major Foam Tenders": "RIV",\n'
riv_aliases = (
    '        "RIV or Major Foam Tender": "RIV",\n'
    '        "Required RIV or Major Foam Tender": "RIV",\n'
    '        "Required RIVs or Major Foam Tenders": "RIV",\n'
)
source = replace_once(
    source,
    riv_alias_anchor,
    riv_alias_anchor + riv_aliases,
    "RIV/MFT aliases",
)

count_helper = r'''
    function normaliseVehicleRequirementCount(
        originalName,
        mappedName,
        amount
    ) {
        const required =
            Math.max(
                0,
                parseInt(
                    amount,
                    10
                ) || 0
            );

        const raw =
            String(
                originalName || ''
            )
                .replace(
                    /\s+/g,
                    ' '
                )
                .trim();

        if (
            /^(?:Required\s+)?Firefighters?$/i.test(
                raw
            ) &&
            normaliseVehicleText(
                mappedName
            ) ===
                'rescue pump'
        ) {
            return Math.ceil(
                required /
                9
            );
        }

        return required;
    }

'''
source = replace_once(
    source,
    "    function mergeRequirementRows(rows) {\n",
    count_helper + "    function mergeRequirementRows(rows) {\n",
    "Firefighter count helper",
)

current_count_block = '''            const amount =
                Math.max(
                    0,
                    parseInt(
                        row?.stillNeeded,
                        10
                    ) ||
                    0
                );

            if (amount <= 0) {
                return;
            }

            const mappedName =
                resolveUnitName(
                    row.unitName
                );
'''
converted_count_block = '''            const mappedName =
                resolveUnitName(
                    row.unitName
                );

            const amount =
                normaliseVehicleRequirementCount(
                    row.unitName,
                    mappedName,
                    row?.stillNeeded
                );

            if (amount <= 0) {
                return;
            }
'''
source = replace_once(
    source,
    current_count_block,
    converted_count_block,
    "Firefighter count application",
)

fallback_helpers = r'''
    function isRivOrMajorFoamTenderRequirement(
        originalName,
        mappedName
    ) {
        const raw =
            String(
                originalName || ''
            )
                .replace(
                    /\s+/g,
                    ' '
                )
                .trim();

        const mapped =
            normaliseVehicleText(
                mappedName
            );

        return (
            /^(?:Required\s+)?RIVs?\s+or\s+Major\s+Foam\s+Tenders?$/i.test(
                raw
            ) ||
            mapped ===
                'riv or major foam tender' ||
            mapped ===
                'rivs or major foam tenders'
        );
    }

    function isMajorFoamTenderVehicleCheckbox(
        input
    ) {
        if (!input) return false;

        if (
            getVehicleTypeIdentifiers(
                input
            ).includes(
                '75'
            )
        ) {
            return true;
        }

        return getCheckboxVehicleValues(
            input
        ).some(value => {
            return (
                value ===
                    'major foam tender' ||
                value ===
                    'major foam tenders' ||
                value ===
                    'mft'
            );
        });
    }

'''
source = replace_once(
    source,
    "    function isRivRequirement(\n",
    fallback_helpers + "    function isRivRequirement(\n",
    "RIV/MFT fallback helpers",
)


def update_get_all(section: str) -> str:
    flag_pattern = re.compile(
        r"(\n\s*const rivTypeOnly\s*=\s*isRivRequirement\(\s*originalName,\s*mappedName\s*\);\n)",
        re.S,
    )
    section, count = flag_pattern.subn(
        r"\1\n        const rivOrMajorFoamTenderPreferred =\n"
        r"            isRivOrMajorFoamTenderRequirement(\n"
        r"                originalName,\n"
        r"                mappedName\n"
        r"            );\n",
        section,
        count=1,
    )
    if count != 1:
        raise SystemExit(
            "getAllMatchingVehicleCheckboxes: rivTypeOnly flag not found"
        )

    branch = r'''
        if (
            rivOrMajorFoamTenderPreferred
        ) {
            const eligible =
                getVehicleCheckboxSnapshot().filter(input => {
                    if (input.disabled) {
                        return false;
                    }

                    if (
                        !includeChecked &&
                        input.checked
                    ) {
                        return false;
                    }

                    return (
                        isRivVehicleCheckbox(
                            input
                        ) ||
                        isMajorFoamTenderVehicleCheckbox(
                            input
                        )
                    );
                });

            const rivMatches =
                sortVehicleCheckboxesByBestArrival(
                    eligible.filter(
                        isRivVehicleCheckbox
                    )
                );

            if (
                rivMatches.length >
                0
            ) {
                return rivMatches;
            }

            return sortVehicleCheckboxesByBestArrival(
                eligible.filter(
                    isMajorFoamTenderVehicleCheckbox
                )
            );
        }

'''
    for anchor in (
        "        if (atvCarrierOnly) {\n",
        "        if (dogSupportOnly) {\n",
        "        if (iccuPreferred) {\n",
    ):
        if anchor in section:
            return section.replace(anchor, branch + anchor, 1)

    raise SystemExit(
        "getAllMatchingVehicleCheckboxes: branch insertion anchor not found"
    )


source = replace_section(
    source,
    "    function getAllMatchingVehicleCheckboxes(",
    "    function getMatchingVehicleCheckboxes(",
    update_get_all,
    "getAllMatchingVehicleCheckboxes",
)


def update_count_selected(section: str) -> str:
    flag_pattern = re.compile(
        r"(\n\s*const rivTypeOnly\s*=\s*isRivRequirement\(\s*originalName,\s*mappedName\s*\);\n)",
        re.S,
    )
    section, count = flag_pattern.subn(
        r"\1\n        const rivOrMajorFoamTenderPreferred =\n"
        r"            isRivOrMajorFoamTenderRequirement(\n"
        r"                originalName,\n"
        r"                mappedName\n"
        r"            );\n",
        section,
        count=1,
    )
    if count != 1:
        raise SystemExit(
            "countSelectedMatchingVehicles: rivTypeOnly flag not found"
        )

    special_count = r'''
        if (
            rivOrMajorFoamTenderPreferred
        ) {
            const selected =
                getVehicleCheckboxSnapshot().filter(
                    input =>
                        input.checked
                );

            const selectedRivs =
                selected.filter(
                    isRivVehicleCheckbox
                ).length;

            if (
                selectedRivs >
                0
            ) {
                return selectedRivs;
            }

            return selected.filter(
                isMajorFoamTenderVehicleCheckbox
            ).length;
        }

'''
    anchor = "        let count = 0;\n"
    if anchor not in section:
        raise SystemExit(
            "countSelectedMatchingVehicles: count anchor not found"
        )
    return section.replace(anchor, special_count + anchor, 1)


source = replace_section(
    source,
    "    function countSelectedMatchingVehicles(",
    "    function refreshVehicleRequirementCounters(",
    update_count_selected,
    "countSelectedMatchingVehicles",
)

source_path.write_text(source, encoding="utf-8", newline="\n")

changelog_path = Path("CHANGELOG.md")
changelog = changelog_path.read_text(encoding="utf-8")
release = """## [1.0.21] - 2026-07-23

### Added

- Added `Firefighter`, `Firefighters` and `Required` aliases mapped to `Rescue Pump`.
- Added `Car Recovery` and `Required Car Recovery` aliases mapped to the existing `Flatbed Recovery Vehicle`.
- Added singular, plural and `Required` aliases for `RIV or Major Foam Tender`.

### Changed

- Firefighter personnel requirements now convert at 9 personnel per Rescue Pump: 1–9 → 1, 10–18 → 2, and so on.
- `RIV or Major Foam Tender` now selects eligible type-76 RIVs first and uses a type-75 Major Foam Tender only when no eligible RIV is available.
- Mission Finder increased from `V10.6.85` to `V10.6.86`.

"""
changelog = replace_once(
    changelog,
    "## [1.0.20] - 2026-07-23",
    release + "## [1.0.20] - 2026-07-23",
    "changelog release",
)
changelog_path.write_text(changelog, encoding="utf-8", newline="\n")

readme_path = Path("README.md")
readme = readme_path.read_text(encoding="utf-8")
readme = replace_once(
    readme,
    "**Current version:** `1.0.20` · **Mission Finder engine:** `V10.6.85`",
    "**Current version:** `1.0.21` · **Mission Finder engine:** `V10.6.86`",
    "README version",
)
readme = replace_once(
    readme,
    "[**v1.0.20**](#current-v1020-behaviour)",
    "[**v1.0.21**](#current-v1021-behaviour)",
    "README navigation",
)
readme = replace_once(
    readme,
    "## Current v1.0.20 behaviour",
    "## Current v1.0.21 behaviour",
    "README heading",
)
readme_anchor = "- `Road Rail Unit` requirements map to `RRU`.\n"
readme_bullets = (
    "- `Firefighters` requirements convert to Rescue Pumps at 9 personnel per vehicle.\n"
    "- `Car Recovery` maps to the existing Flatbed Recovery Vehicle.\n"
    "- `RIV or Major Foam Tender` uses RIV first and Major Foam Tender only when no RIV is available.\n"
)
readme = replace_once(
    readme,
    readme_anchor,
    readme_anchor + readme_bullets,
    "README cross-reference bullets",
)
readme_path.write_text(readme, encoding="utf-8", newline="\n")

source_readme_path = Path("src/README.md")
source_readme = source_readme_path.read_text(encoding="utf-8")
source_readme = replace_once(
    source_readme,
    "| Command Nexus version | `1.0.20` |",
    "| Command Nexus version | `1.0.21` |",
    "source README version",
)
source_readme = replace_once(
    source_readme,
    "| Mission Finder baseline | `V10.6.85` |",
    "| Mission Finder baseline | `V10.6.86` |",
    "source README Mission Finder",
)
source_readme_path.write_text(
    source_readme,
    encoding="utf-8",
    newline="\n",
)

expected_tokens = {
    "version": "// @version      1.0.21",
    "Mission Finder": " * MODULE 2: MISSION FINDER V10.6.86",
    "Firefighters alias": '        "Firefighters": "Rescue Pump",',
    "Car Recovery alias": '        "Car Recovery": "Flatbed Recovery Vehicle",',
    "RIV/MFT alias": '        "RIV or Major Foam Tender": "RIV",',
    "Firefighter conversion": "function normaliseVehicleRequirementCount(",
    "Firefighter conversion call": "normaliseVehicleRequirementCount(\n                    row.unitName,\n                    mappedName,\n                    row?.stillNeeded",
    "RIV/MFT requirement": "function isRivOrMajorFoamTenderRequirement(",
    "MFT exact matcher": "function isMajorFoamTenderVehicleCheckbox(",
}
missing = [
    name
    for name, token in expected_tokens.items()
    if token not in source
]
if missing:
    raise SystemExit(
        "Missing v1.0.21 contracts: " + ", ".join(missing)
    )

firefighter_expected = {
    1: 1,
    9: 1,
    10: 2,
    18: 2,
    19: 3,
    27: 3,
    28: 4,
}
firefighter_actual = {
    count: (count + 8) // 9
    for count in firefighter_expected
}
if firefighter_actual != firefighter_expected:
    raise SystemExit(
        "Firefighter 9-per-pump regression failed: "
        + repr(firefighter_actual)
    )

if '        "RIVs or Major Foam Tenders": "Major Foam Tender",' in source:
    raise SystemExit(
        "Legacy Major Foam Tender-first mapping is still present"
    )

print("v1.0.21 Fire cross-reference contracts passed.")
