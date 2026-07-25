from __future__ import annotations

from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


def replace_function(
    text: str,
    signature: str,
    next_signature: str,
    replacement: str,
    label: str,
) -> str:
    start = text.find(signature)
    if start < 0:
        raise SystemExit(f"{label}: start not found")
    end = text.find(next_signature, start + len(signature))
    if end < 0:
        raise SystemExit(f"{label}: end not found")
    return text[:start] + replacement.rstrip() + "\n\n" + text[end:]


source_path = Path("src/missionchief-command-nexus.user.js")
source = source_path.read_text(encoding="utf-8")

source = replace_once(
    source,
    "// @version      1.0.23",
    "// @version      1.0.24",
    "userscript version",
)
source = replace_once(
    source,
    " * MODULE 2: MISSION FINDER V10.6.88",
    " * MODULE 2: MISSION FINDER V10.6.89",
    "Mission Finder version",
)
source = replace_once(
    source,
    "    // V10.6.88: visible seasonal mission collectibles, including the\n",
    "    // V10.6.89: normal Police Car requirements prefer verified ordinary\n"
    "    // type-8 IRVs, then unknown/stale IRVs, and use specialist-trained IRVs\n"
    "    // only as a final fallback. Any selected type-8 IRV counts toward generic\n"
    "    // Police attendance, while named trained-personnel requirements remain\n"
    "    // exact and live-verified. Missing Personnel: Police Officers remains\n"
    "    // actionable even when the Live Mission Requirements panel is present.\n"
    "    // V10.6.88: visible seasonal mission collectibles, including the\n",
    "Mission Finder release note",
)
source = replace_once(
    source,
    "    // V10.6.71: ordinary Police attendance must preserve specialist IRVs.\n"
    "    // Exact vehicle IDs carrying any protected Police qualification are never\n"
    "    // used to satisfy a normal Police Car / Police Officer requirement.\n",
    "    // V10.6.89: ordinary Police attendance preserves specialist IRVs by\n"
    "    // preference rather than by an absolute block. Verified ordinary type-8\n"
    "    // IRVs are selected first, unknown/stale IRVs second, and known specialist\n"
    "    // IRVs only when the normal pool cannot satisfy the mission requirement.\n",
    "ordinary Police protection comment",
)

source = replace_once(
    source,
    r"""        const pattern =
            new RegExp(
                `(?:\\b(\\d+)\\s*(?:x\\s*)?${namePatternSource}\\b|\\b${namePatternSource}\\b\\s*(?:x\\s*)?(\\d+))`,
                'gi'
            );
""",
    r"""        const pattern =
            new RegExp(
                `(?:\\b(\\d+)\\s*(?:x\\s*)?${namePatternSource}\\b|\\b${namePatternSource}\\b\\s*(?::|=|-)?\\s*(?:x\\s*)?(\\d+))`,
                'gi'
            );
""",
    "Missing Personnel count separators",
)

police_conversion_index = source.find(
    "    function getPoliceOfficerVehicleRequirement("
)
if police_conversion_index < 0:
    raise SystemExit("Police Officer conversion function was not found")

cleaned_anchor = r"""        const cleaned = String(requirementName || '')
            .replace(/\s+/g, ' ')
            .trim();
"""
cleaned_index = source.find(cleaned_anchor, police_conversion_index)
if cleaned_index < 0:
    raise SystemExit("Police Officer conversion name-cleaning anchor was not found")
source = (
    source[:cleaned_index]
    + r"""        const cleaned = String(requirementName || '')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/^Missing\s+Personnel\s*:\s*/i, '')
            .trim();
"""
    + source[cleaned_index + len(cleaned_anchor) :]
)

ordinary_helpers = r"""    function isOrdinaryPoliceIrvCheckboxEligible(
        checkbox,
        registry,
        options = {}
    ) {
        if (!isPoliceCarVehicleCheckbox(checkbox)) {
            return false;
        }

        const allowUnknown =
            options.allowUnknown === true;

        const allowProtected =
            options.allowProtected === true;

        const registryMatch =
            getRegistryEntryForMissionCheckbox(
                checkbox,
                registry
            );

        if (!registryMatch.entry) {
            return allowUnknown;
        }

        if (
            isKnownProtectedTrainedPoliceIrvEntry(
                registryMatch.entry
            )
        ) {
            return allowProtected;
        }

        if (
            isVerifiedOrdinaryPoliceIrvEntry(
                registryMatch.entry
            )
        ) {
            return true;
        }

        return allowUnknown;
    }

    function orderOrdinaryPoliceIrvCandidates(
        candidates,
        registry
    ) {
        const verifiedOrdinary = [];
        const unknownOrStale = [];
        const protectedFallback = [];

        (Array.isArray(candidates) ? candidates : [])
            .forEach(checkbox => {
                const registryMatch =
                    getRegistryEntryForMissionCheckbox(
                        checkbox,
                        registry
                    );

                if (
                    isKnownProtectedTrainedPoliceIrvEntry(
                        registryMatch.entry
                    )
                ) {
                    protectedFallback.push(checkbox);
                    return;
                }

                if (
                    isVerifiedOrdinaryPoliceIrvEntry(
                        registryMatch.entry
                    )
                ) {
                    verifiedOrdinary.push(checkbox);
                    return;
                }

                unknownOrStale.push(checkbox);
            });

        return [
            ...verifiedOrdinary,
            ...unknownOrStale,
            ...protectedFallback
        ];
    }
"""
source = replace_function(
    source,
    "    function isOrdinaryPoliceIrvCheckboxEligible(",
    "    function getMissionTrainingCombinationKey(",
    ordinary_helpers,
    "ordinary Police IRV helpers",
)

source = replace_once(
    source,
    """        if (policeCarOnly) {
            const registry =
                readPersonnelTrainingRegistry();

            const ordinaryCandidates =
                sortVehicleCheckboxesByBestArrival(
                    getVehicleCheckboxSnapshot().filter(input => {
                        if (input.disabled) return false;
                        if (!includeChecked && input.checked) return false;

                        return isOrdinaryPoliceIrvCheckboxEligible(
                            input,
                            registry,
                            { allowUnknown: false }
                        );
                    })
                );

            return orderOrdinaryPoliceIrvCandidates(
                ordinaryCandidates,
                registry
            );
        }
""",
    """        if (policeCarOnly) {
            const registry =
                readPersonnelTrainingRegistry();

            const policeCarCandidates =
                sortVehicleCheckboxesByBestArrival(
                    getVehicleCheckboxSnapshot().filter(input => {
                        if (input.disabled) return false;
                        if (!includeChecked && input.checked) return false;

                        return isOrdinaryPoliceIrvCheckboxEligible(
                            input,
                            registry,
                            {
                                allowUnknown: true,
                                allowProtected: true
                            }
                        );
                    })
                );

            return orderOrdinaryPoliceIrvCandidates(
                policeCarCandidates,
                registry
            );
        }
""",
    "generic Police Car candidate selection",
)
source = replace_once(
    source,
    """        const ordinaryPoliceRegistry =
            policeCarOnly
                ? readPersonnelTrainingRegistry()
                : null;


""",
    "",
    "unused generic Police registry allocation",
)
source = replace_once(
    source,
    """            } else if (policeCarOnly) {
                matches =
                    isOrdinaryPoliceIrvCheckboxEligible(
                        input,
                        ordinaryPoliceRegistry,
                        { allowUnknown: false }
                    );
""",
    """            } else if (policeCarOnly) {
                // Any selected exact type-8 IRV satisfies generic Police
                // attendance. Training data controls preference only; named
                // specialist requirements still use their strict selectors.
                matches = isPoliceCarVehicleCheckbox(input);
""",
    "generic Police selected counter",
)

ordinary_refresh = r"""    async function refreshOrdinaryPoliceRegistryFromLiveVehicles(
        rows,
        source = 'UPDATE'
    ) {
        const ordinaryVehiclesRequired =
            getOrdinaryPoliceVehicleRequirementCount(
                rows
            );

        if (ordinaryVehiclesRequired <= 0) {
            return {
                refreshed: false,
                pagesRead: 0,
                verifiedOrdinaryVehicles: 0,
                unknownOrStaleVehicles: 0,
                protectedFallbackVehicles: 0,
                availablePoliceCars: 0,
                required: 0
            };
        }

        const registry =
            readPersonnelTrainingRegistry();

        const candidates =
            sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(checkbox => {
                    return !!(
                        (!checkbox.disabled || checkbox.checked) &&
                        isPoliceCarVehicleCheckbox(checkbox)
                    );
                })
            );

        let verifiedOrdinaryVehicles = 0;
        let unknownOrStaleVehicles = 0;
        let protectedFallbackVehicles = 0;

        candidates.forEach(checkbox => {
            const registryMatch =
                getRegistryEntryForMissionCheckbox(
                    checkbox,
                    registry
                );

            if (
                isKnownProtectedTrainedPoliceIrvEntry(
                    registryMatch.entry
                )
            ) {
                protectedFallbackVehicles += 1;
                return;
            }

            if (
                isVerifiedOrdinaryPoliceIrvEntry(
                    registryMatch.entry
                )
            ) {
                verifiedOrdinaryVehicles += 1;
                return;
            }

            unknownOrStaleVehicles += 1;
        });

        // Generic Police attendance does not require a qualification check.
        // The registry is therefore an ordering hint only. Avoid reading every
        // /zuweisung page before selection: ordinary vehicles remain first,
        // unknown/stale vehicles remain usable, and known specialists are a
        // final fallback when no normal pool can satisfy the mission.
        if (mfDebugEnabled) {
            debugLog(
                'POLICE CAR POOL',
                `${source} | required=${ordinaryVehiclesRequired} | ordinary=${verifiedOrdinaryVehicles} | unknown/stale=${unknownOrStaleVehicles} | specialist fallback=${protectedFallbackVehicles} | total=${candidates.length}`
            );
        }

        return {
            refreshed: false,
            pagesRead: 0,
            verifiedOrdinaryVehicles,
            unknownOrStaleVehicles,
            protectedFallbackVehicles,
            availablePoliceCars:
                candidates.length,
            required:
                ordinaryVehiclesRequired
        };
    }
"""
source = replace_function(
    source,
    "    async function refreshOrdinaryPoliceRegistryFromLiveVehicles(",
    "    async function prepareTrainedPersonnelRegistryForRows(",
    ordinary_refresh,
    "generic Police registry preparation",
)

source = replace_once(
    source,
    """        const pageTextBlocks =
            hasLiveRequirementsPanel
                ? []
                : getActiveMissionProblemTextBlocks(
                    missionUpdateRoots
                );
""",
    """        const activeMissionProblemTextBlocks =
            getActiveMissionProblemTextBlocks(
                missionUpdateRoots
            );

        const pageTextBlocks =
            hasLiveRequirementsPanel
                ? []
                : activeMissionProblemTextBlocks;

        // The live requirements table is authoritative for vehicle rows, but
        // MissionChief can expose Missing Personnel only in the current visible
        // alert. Keep that alert actionable without re-enabling legacy Missing
        // Vehicles parsing or accepting hidden/previous mission content.
        const personnelTextBlocks =
            activeMissionProblemTextBlocks.filter(text => {
                return /Missing\s+Personnel\s*:/i.test(text);
            });
""",
    "active Missing Personnel alert collection",
)
source = replace_once(
    source,
    """        pageTextBlocks.forEach(text => {
            if (!/Missing Personnel:/i.test(text)) return;

            mergeTrainedPersonnelRequirements(
""",
    """        personnelTextBlocks.forEach(text => {
            mergeTrainedPersonnelRequirements(
""",
    "Missing Personnel processing source",
)

source_path.write_text(source, encoding="utf-8", newline="\n")

regression_script = r'''#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const SOURCE_PATH = 'src/missionchief-command-nexus.user.js';
const source = await readFile(SOURCE_PATH, 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(text, label) {
  if (!source.includes(text)) {
    fail(`Missing Police IRV fallback contract: ${label}`);
  }
}

function extractBetween(startText, endText, label) {
  const start = source.indexOf(startText);
  if (start < 0) fail(`Unable to find ${label} start`);
  const end = source.indexOf(endText, start + startText.length);
  if (end < 0) fail(`Unable to find ${label} end`);
  return source.slice(start, end);
}

requireText('// @version      1.0.24', 'v1.0.24 metadata');
requireText(' * MODULE 2: MISSION FINDER V10.6.89', 'V10.6.89 module header');
requireText('allowUnknown: true', 'unknown or stale type-8 IRV fallback');
requireText('allowProtected: true', 'known specialist type-8 IRV final fallback');
requireText('protectedFallback.push(checkbox)', 'specialist fallback partition');
requireText(
  '...verifiedOrdinary,\n            ...unknownOrStale,\n            ...protectedFallback',
  'ordinary then unknown then specialist order'
);
requireText(
  'matches = isPoliceCarVehicleCheckbox(input);',
  'every selected exact Police Car / type-8 IRV counts for generic attendance'
);
requireText('const personnelTextBlocks =', 'current visible Missing Personnel alerts');
requireText(
  'personnelTextBlocks.forEach(text => {',
  'Missing Personnel processing remains active with the live panel'
);
requireText(
  '(?::|=|-)?\\\\s*(?:x\\\\s*)?(\\\\d+)',
  'Police Officer count parser accepts colon/equal/hyphen separators'
);
requireText(
  ".replace(/^Missing\\s+Personnel\\s*:\\s*/i, '')",
  'Missing Personnel prefix normalisation'
);

const ordinaryRefresh = extractBetween(
  '    async function refreshOrdinaryPoliceRegistryFromLiveVehicles(',
  '    async function prepareTrainedPersonnelRegistryForRows(',
  'ordinary Police registry preparation'
);
if (ordinaryRefresh.includes('await fetch(')) {
  fail('Generic Police Car preparation must not live-scan assignment pages');
}

const genericCounter = extractBetween(
  '    function countSelectedMatchingVehicles(',
  '    function refreshVehicleRequirementCounters(',
  'generic selected-vehicle counter'
);
if (genericCounter.includes('{ allowUnknown: false }')) {
  fail('Generic selected type-8 IRVs must not be rejected as unknown');
}

const strictRequirements = extractBetween(
  '    function normalisePublicOrderTrainedRequirements(',
  '    function isStrictLiveVerifiedTrainingEntry(',
  'strict trained Police requirements'
);
for (const requiredToken of [
  "requirementType:\n                        'police_trained_irv_vehicle'",
  "requirementType:\n                    'police_inspector_vehicle'",
  "eligibleVehicleTypeIds: [\n                        '8'"
]) {
  if (!strictRequirements.includes(requiredToken)) {
    fail(`Named trained Police IRV contract changed: ${requiredToken}`);
  }
}

console.log('Police IRV fallback and Missing Personnel regression checks passed.');
'''
Path("scripts/check-police-irv-fallback.mjs").write_text(
    regression_script,
    encoding="utf-8",
    newline="\n",
)

workflow_path = Path(".github/workflows/validate-userscript.yml")
workflow = workflow_path.read_text(encoding="utf-8")
workflow_path_anchor = (
    "      - 'scripts/check-runtime-hardening.mjs'\n"
    "      - '.github/workflows/validate-userscript.yml'"
)
workflow_path_replacement = (
    "      - 'scripts/check-runtime-hardening.mjs'\n"
    "      - 'scripts/check-police-irv-fallback.mjs'\n"
    "      - '.github/workflows/validate-userscript.yml'"
)
if workflow.count(workflow_path_anchor) != 2:
    raise SystemExit(
        "Police fallback workflow path trigger: expected 2 matches, found "
        f"{workflow.count(workflow_path_anchor)}"
    )
workflow = workflow.replace(
    workflow_path_anchor,
    workflow_path_replacement,
)
workflow = replace_once(
    workflow,
    "      - name: Validate runtime performance and lifecycle contracts\n        run: node scripts/check-runtime-hardening.mjs\n\n      - name: Require a version increase when code changes",
    "      - name: Validate runtime performance and lifecycle contracts\n        run: node scripts/check-runtime-hardening.mjs\n\n      - name: Validate normal Police IRV fallback contracts\n        run: node scripts/check-police-irv-fallback.mjs\n\n      - name: Require a version increase when code changes",
    "Police fallback validation step",
)
workflow_path.write_text(workflow, encoding="utf-8", newline="\n")

changelog_path = Path("CHANGELOG.md")
changelog = changelog_path.read_text(encoding="utf-8")
release_notes = """## [1.0.24] - 2026-07-25

### Fixed

- Restored normal type-8 Incident Response Vehicle / Police Car selection in both manual Unit Finder and Auto Mode.
- Generic Police attendance now prefers verified ordinary IRVs, then unknown or stale IRVs, and uses known specialist-trained IRVs only when the ordinary pool is insufficient.
- Any already selected exact type-8 IRV now counts toward a generic Police Car requirement, preventing trained IRVs from being ignored and duplicate cars from being requested.
- `Missing Personnel: Police Officers` remains actionable when the Live Mission Requirements panel is present and converts at two officers per Police Car, including `Police Officers: 3`-style wording.

### Safety and performance

- Named Police Inspector, Police Medic, Public Order, Railway Police and other trained-personnel requirements remain exact type-8, exact-vehicle-ID and live-assignment verified.
- Generic Police Car selection no longer scans multiple `/zuweisung` pages before choosing ordinary attendance; the training registry is used only to rank ordinary, unknown and specialist fallback candidates.
- Added permanent regression checks for ordinary-first ordering, specialist fallback, selected trained-IRV counting and live-panel Missing Personnel parsing.

### Changed

- Mission Finder increased from `V10.6.88` to `V10.6.89`.

"""
changelog = replace_once(
    changelog,
    "## [1.0.23] - 2026-07-24",
    release_notes + "## [1.0.23] - 2026-07-24",
    "v1.0.24 changelog section",
)
changelog_path.write_text(changelog, encoding="utf-8", newline="\n")

readme_path = Path("README.md")
readme = readme_path.read_text(encoding="utf-8")
readme = replace_once(
    readme,
    "**Current version:** `1.0.23` · **Mission Finder engine:** `V10.6.88`",
    "**Current version:** `1.0.24` · **Mission Finder engine:** `V10.6.89`",
    "README version",
)
readme = replace_once(
    readme,
    "- Ordinary Police attendance is protected from unnecessarily consuming specialist IRVs.\n"
    "- Police Officer upgrade rows convert at two officers per normal Police IRV.\n",
    "- Ordinary Police attendance prefers verified ordinary type-8 IRVs, then unknown or stale type-8 IRVs, and uses specialist-trained type-8 IRVs only when needed as a final fallback.\n"
    "- Any selected exact type-8 IRV counts toward generic Police Car attendance; named specialist requirements remain strict and live-verified.\n"
    "- Police Officer upgrade rows and visible `Missing Personnel` alerts convert at two officers per Police Car, including when the live requirements panel is present.\n",
    "README Police behaviour",
)
readme_path.write_text(readme, encoding="utf-8", newline="\n")

source_readme_path = Path("src/README.md")
source_readme = source_readme_path.read_text(encoding="utf-8")
source_readme = replace_once(
    source_readme,
    "| Command Nexus version | `1.0.23` |",
    "| Command Nexus version | `1.0.24` |",
    "source README version",
)
source_readme = replace_once(
    source_readme,
    "| Mission Finder baseline | `V10.6.88` |",
    "| Mission Finder baseline | `V10.6.89` |",
    "source README Mission Finder version",
)
source_readme = replace_once(
    source_readme,
    "- Run `node scripts/check-runtime-hardening.mjs`.\n",
    "- Run `node scripts/check-runtime-hardening.mjs`.\n"
    "- Run `node scripts/check-police-irv-fallback.mjs`.\n",
    "source README Police regression check",
)
source_readme_path.write_text(source_readme, encoding="utf-8", newline="\n")

print("Applied v1.0.24 normal Police IRV fallback and Missing Personnel fixes.")
