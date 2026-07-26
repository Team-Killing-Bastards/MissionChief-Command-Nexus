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


def regex_replace_once(text: str, pattern: str, replacement: str, label: str, flags=0) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one regex match, found {count}')
    return updated


# Release metadata.
source = replace_once(source, '// @version      1.0.45', '// @version      1.0.46', 'userscript version')
source = source.replace('V10.6.109', 'V10.6.110')
source = replace_once(source, "const PERSONNEL_VERSION = '1.3.4';", "const PERSONNEL_VERSION = '1.3.5';", 'personnel version')

# 1. Remove Mission Ready Delay helper copy while preserving the 1000 ms default and control.
source = replace_once(
    source,
    '''            <div class="mf2026-small">\n                Default 1000ms. Auto Mode uses readiness checks and skips duplicate loading waits.\n            </div>\n''',
    '',
    'Mission Ready Delay helper copy',
)

# 2/3. Publish complete exact per-person profiles from every scanned vehicle assignment page.
source = replace_once(
    source,
    '''    function getPersonnelTrainingCombinationKey(trainingCodes) {\n''',
    '''    function getPersonnelAssignedTrainingProfiles(assignedPersonnel) {\n        return (Array.isArray(assignedPersonnel) ? assignedPersonnel : [])\n            .map(person => Array.from(new Set(\n                (Array.isArray(person?.trainingCodes) ? person.trainingCodes : [])\n                    .map(String)\n                    .filter(Boolean)\n            )).sort())\n            .filter(profile => Array.isArray(profile));\n    }\n\n    function getPersonnelTrainingCombinationKey(trainingCodes) {\n''',
    'assigned training profiles helper',
)

source = replace_once(
    source,
    '''            const assignedPersonnel = getPersonnelAssignedToVehicle(personnel, vehicle);\n            const vehicleId = String(vehicle.vehicleId);\n\n            registry.vehicles[vehicleId] = {\n''',
    '''            const vehicleId = String(vehicle.vehicleId);\n            const exactVehicleProfileScan =\n                String(source || '').startsWith('personnel-register-exact-');\n            const assignedPersonnel = exactVehicleProfileScan\n                ? (Array.isArray(personnel) ? personnel : []).filter(person => {\n                    return String(person?.assignedVehicleId || '') === vehicleId;\n                })\n                : getPersonnelAssignedToVehicle(personnel, vehicle);\n            const assignedTrainingProfiles =\n                getPersonnelAssignedTrainingProfiles(assignedPersonnel);\n\n            registry.vehicles[vehicleId] = {\n''',
    'exact register assigned personnel selection',
)

source = replace_once(
    source,
    '''                assignmentScanComplete: true,\n                personnelRowsSeen: Array.isArray(personnel) ? personnel.length : 0,\n                trainingCounts: countPersonnelTrainingCodes(assignedPersonnel),\n                trainingCombinationCounts: countPersonnelTrainingCombinations(assignedPersonnel),\n''',
    '''                assignmentScanComplete: true,\n                personnelRowsSeen: Number.isFinite(vehicle.assignmentPersonnelRowsSeen)\n                    ? Math.max(0, vehicle.assignmentPersonnelRowsSeen)\n                    : (Array.isArray(personnel) ? personnel.length : 0),\n                trainingCounts: countPersonnelTrainingCodes(assignedPersonnel),\n                trainingCombinationCounts: countPersonnelTrainingCombinations(assignedPersonnel),\n                assignedTrainingProfiles,\n                trainingProfilesComplete: exactVehicleProfileScan,\n''',
    'registry profile fields',
)

source = replace_once(
    source,
    '''                            verifiedVehicles.push(vehicle);\n                            exactVehiclePagesRead++;\n''',
    '''                            verifiedVehicles.push({\n                                ...vehicle,\n                                vehicleTypeId:\n                                    String(assignment.vehicleTypeId || vehicle.vehicleTypeId || ''),\n                                assignmentPersonnelRowsSeen:\n                                    assignment.rows.length\n                            });\n                            exactVehiclePagesRead++;\n''',
    'exact scanned vehicle evidence',
)

source = replace_once(
    source,
    "                        source: 'one-click-all-station-exact-register-scan',",
    "                        source: 'personnel-register-exact-all-vehicle-scan-v1',",
    'exact register source prefix',
)

source = replace_once(
    source,
    '''            vehicles[vehicleId] = {\n''',
    '''            const assignedTrainingProfiles = Array.isArray(rawEntry.assignedTrainingProfiles)\n                ? rawEntry.assignedTrainingProfiles.slice(0, 250).map(profile => {\n                    return Array.from(new Set(\n                        (Array.isArray(profile) ? profile : [])\n                            .slice(0, 80)\n                            .map(value => String(value || '').slice(0, 120))\n                            .filter(Boolean)\n                    )).sort();\n                })\n                : [];\n            vehicles[vehicleId] = {\n''',
    'imported register profile normalisation',
)

source = replace_once(
    source,
    '''                trainingCounts: normalisePersonnelTrainingRegistryCountMap(rawEntry.trainingCounts),\n                trainingCombinationCounts: normalisePersonnelTrainingRegistryCountMap(rawEntry.trainingCombinationCounts),\n                updatedAt: safeTimestamp(rawEntry.updatedAt),\n''',
    '''                trainingCounts: normalisePersonnelTrainingRegistryCountMap(rawEntry.trainingCounts),\n                trainingCombinationCounts: normalisePersonnelTrainingRegistryCountMap(rawEntry.trainingCombinationCounts),\n                assignedTrainingProfiles,\n                trainingProfilesComplete:\n                    rawEntry.trainingProfilesComplete === true &&\n                    Array.isArray(rawEntry.assignedTrainingProfiles),\n                updatedAt: safeTimestamp(rawEntry.updatedAt),\n''',
    'imported register complete profiles',
)

# Allow exact all-vehicle register scans to act as authoritative assigned-person evidence.
source = replace_once(
    source,
    '''    const MF_STRICT_TRAINING_SOURCE_PREFIX =\n        'mission-finder-live-strict-';\n''',
    '''    const MF_STRICT_TRAINING_SOURCE_PREFIX =\n        'mission-finder-live-strict-';\n    const MF_EXACT_REGISTER_TRAINING_SOURCE_PREFIX =\n        'personnel-register-exact-';\n    const MF_EXACT_REGISTER_TRAINING_MAX_AGE_MS =\n        180 * 24 * 60 * 60 * 1000;\n''',
    'Mission Finder exact register trust constants',
)

source = regex_replace_once(
    source,
    r'''    function isAuthoritativeLivePoliceTrainingEntry\(\n        registryEntry\n    \) \{\n        return !!\(\n            isStrictLiveVerifiedTrainingEntry\(\n                registryEntry\n            \) &&\n            registryEntry\n                \.assignmentScanComplete ===\n                true &&\n            registryEntry\n                \.trainingProfilesComplete ===\n                true &&\n            Array\.isArray\(\n                registryEntry\.assignedTrainingProfiles\n            \)\n        \);\n    \}''',
    '''    function isAuthoritativeLivePoliceTrainingEntry(\n        registryEntry\n    ) {\n        if (!registryEntry) return false;\n\n        const source =\n            String(registryEntry.source || '');\n        const updatedAt =\n            Number(registryEntry.updatedAt || 0);\n        const exactRegisterEntry = !!(\n            source.startsWith(\n                MF_EXACT_REGISTER_TRAINING_SOURCE_PREFIX\n            ) &&\n            updatedAt > 0 &&\n            Date.now() - updatedAt <=\n                MF_EXACT_REGISTER_TRAINING_MAX_AGE_MS\n        );\n\n        return !!(\n            (\n                isStrictLiveVerifiedTrainingEntry(\n                    registryEntry\n                ) ||\n                exactRegisterEntry\n            ) &&\n            registryEntry.assignmentScanComplete === true &&\n            registryEntry.trainingProfilesComplete === true &&\n            Array.isArray(\n                registryEntry.assignedTrainingProfiles\n            )\n        );\n    }''',
    'authoritative all-vehicle training entry',
)

# Search Advisor becomes a trained-person requirement, not a Control Van alias.
source, removed_cross_refs = re.subn(
    r'^\s*"(?:Required\s+)?Search Advisor(?:s)?":\s*"Control Van",\s*\n',
    '',
    source,
    flags=re.M | re.I,
)
if removed_cross_refs < 2:
    raise SystemExit(f'Search Advisor Control Van cross-reference: expected at least 2 removals, found {removed_cross_refs}')

source = regex_replace_once(
    source,
    r'''            \{\n                pattern:\n                    /\^search\\s\+advisor\(\?:s\)\?\$/i,\n                personnelLabel:\n                    'Search Advisor',\n                unitName:\n                    'Control Van',\n                personnelPerVehicle:\n                    1\n            \},\n''',
    '',
    'Search Advisor SAR vehicle conversion removal',
)

source = replace_once(
    source,
    '''            {\n                code:\n                    'armed_response_personnel',\n''',
    '''            {\n                code:\n                    'search_and_rescue',\n                label:\n                    'Search Advisor',\n                patterns: [\n                    /(\\d+)\\s*(?:x\\s*)?Search\\s+Advisor(?:s)?/gi,\n                    /Search\\s+Advisor(?:s)?\\s*(?:x\\s*)?(\\d+)/gi\n                ]\n            },\n            {\n                code:\n                    'armed_response_personnel',\n''',
    'Search Advisor trained pattern',
)

source = replace_once(
    source,
    '''        const armedResponseRequired =\n            findRequired('armed_response_personnel');\n\n        const normalised =\n''',
    '''        const armedResponseRequired =\n            findRequired('armed_response_personnel');\n\n        const searchAdvisorRequired =\n            findRequired('search_and_rescue');\n\n        const normalised =\n''',
    'Search Advisor normalisation count',
)

source = replace_once(
    source,
    '''                    requirement.code !==\n                        'armed_response_personnel'\n''',
    '''                    requirement.code !==\n                        'armed_response_personnel' &&\n                    requirement.code !==\n                        'search_and_rescue'\n''',
    'Search Advisor raw requirement removal',
)

source = replace_once(
    source,
    '''            requiredTrainingCodes = [code],\n            psuCompatible = false\n        }) => {\n''',
    '''            requiredTrainingCodes = [code],\n            psuCompatible = false,\n            registryAnyVehicle = false,\n            trainedOnly = false\n        }) => {\n''',
    'trained requirement options',
)

source = replace_once(
    source,
    '''            const provisional = {\n''',
    '''            const configuredVehicleCapacities =\n                Object.values(vehicleCapacityByType)\n                    .map(value => Math.max(1, parseInt(value, 10) || 1));\n\n            const provisional = {\n''',
    'configured trained capacities',
)

source = regex_replace_once(
    source,
    r'''                personnelPerVehicle:\n                    Math\.max\(\n                        \.\.\.Object\.values\(\n                            vehicleCapacityByType\n                        \)\.map\(value => \{\n                            return Math\.max\(\n                                1,\n                                parseInt\(value, 10\) \|\| 1\n                            \);\n                        \}\)\n                    \),''',
    '''                personnelPerVehicle:\n                    configuredVehicleCapacities.length\n                        ? Math.max(...configuredVehicleCapacities)\n                        : 1,''',
    'empty-capacity trained requirement handling',
)

source = replace_once(
    source,
    '''                psuCompatible:\n                    Boolean(psuCompatible)\n            };\n''',
    '''                psuCompatible:\n                    Boolean(psuCompatible),\n                registryAnyVehicle:\n                    Boolean(registryAnyVehicle),\n                trainedOnly:\n                    Boolean(trainedOnly)\n            };\n''',
    'trained requirement flags',
)

source = replace_once(
    source,
    '''        if (armedResponseRequired > 0) {\n            addTrainedVehicleRequirement({\n                code:\n                    'armed_response_atc',\n''',
    '''        addTrainedVehicleRequirement({\n            code:\n                'search_and_rescue',\n            label:\n                'Search Advisor Trained Assigned Vehicle',\n            personnelRequired:\n                searchAdvisorRequired,\n            requirementType:\n                'search_advisor_trained_vehicle',\n            eligibleVehicleTypeIds: [],\n            vehicleCapacityByType: {},\n            preferredVehicleTypeIds: [],\n            requiredTrainingCodes: [\n                'search_and_rescue'\n            ],\n            registryAnyVehicle:\n                true,\n            trainedOnly:\n                true\n        });\n\n        if (armedResponseRequired > 0) {\n            addTrainedVehicleRequirement({\n                code:\n                    'armed_response_atc',\n''',
    'Search Advisor any-vehicle requirement',
)

source = replace_once(
    source,
    '''        const maximumCapacity =\n            getTrainingRequirementVehicleCapacity(\n                requirement,\n                vehicleTypeId\n            );\n''',
    '''        if (requirement?.registryAnyVehicle === true) {\n            if (\n                !isAuthoritativeLivePoliceTrainingEntry(\n                    registryEntry\n                )\n            ) {\n                return 0;\n            }\n\n            return Math.max(\n                0,\n                Array.isArray(\n                    registryEntry.assignedTrainingProfiles\n                )\n                    ? registryEntry.assignedTrainingProfiles.length\n                    : parseInt(\n                        registryEntry.assignedPersonnelCount,\n                        10\n                    ) || 0\n            );\n        }\n\n        const maximumCapacity =\n            getTrainingRequirementVehicleCapacity(\n                requirement,\n                vehicleTypeId\n            );\n''',
    'any-vehicle actual assigned capacity',
)

source = regex_replace_once(
    source,
    r'''    function isCheckboxEligibleForTrainingRequirement\(\n        checkbox,\n        requirement,\n        registryEntry = null\n    \) \{\n        return !!getTrainingRequirementVehicleTypeId\(\n            requirement,\n            checkbox,\n            registryEntry\n        \);\n    \}''',
    '''    function isCheckboxEligibleForTrainingRequirement(\n        checkbox,\n        requirement,\n        registryEntry = null\n    ) {\n        const vehicleTypeId =\n            getTrainingRequirementVehicleTypeId(\n                requirement,\n                checkbox,\n                registryEntry\n            );\n\n        if (!vehicleTypeId) return false;\n\n        if (requirement?.registryAnyVehicle === true) {\n            return !!(\n                isAuthoritativeLivePoliceTrainingEntry(\n                    registryEntry\n                ) &&\n                getRegistryTrainingQualifiedCount(\n                    requirement,\n                    registryEntry\n                ) > 0\n            );\n        }\n\n        return true;\n    }''',
    'Search Advisor trained-only eligibility',
)

# Helper for live/supplied Search Advisor rows.
source = replace_once(
    source,
    '''    function getMissingPersonnelSegment(\n''',
    '''    function getSearchAdvisorTrainedVehicleRequirement(\n        requirementName,\n        personnelAmount\n    ) {\n        const cleanedName =\n            cleanRequirementName(requirementName);\n\n        if (!/^search\\s+advisor(?:s)?$/i.test(cleanedName)) {\n            return null;\n        }\n\n        const amountMatch = String(personnelAmount ?? '')\n            .replace(/,/g, '')\n            .match(/\\d+/);\n        const personnelRequired = amountMatch\n            ? Math.max(0, parseInt(amountMatch[0], 10) || 0)\n            : 0;\n\n        if (personnelRequired <= 0) return null;\n\n        return normalisePublicOrderTrainedRequirements([{\n            code: 'search_and_rescue',\n            label: 'Search Advisor',\n            required: personnelRequired\n        }]).find(requirement => {\n            return requirement.code ===\n                'search_and_rescue_vehicle';\n        }) || null;\n    }\n\n    function getMissingPersonnelSegment(\n''',
    'Search Advisor trained row helper',
)

source = replace_once(
    source,
    '''            const sarConversion =\n                getSarPersonnelVehicleRequirement(\n                    row.unitName,\n                    row.stillNeeded\n                );\n''',
    '''            const searchAdvisorRequirement =\n                getSearchAdvisorTrainedVehicleRequirement(\n                    row.unitName,\n                    row.stillNeeded\n                );\n\n            if (searchAdvisorRequirement) {\n                return {\n                    ...row,\n                    unitName:\n                        MF_TRAINED_PERSONNEL_ROW_NAME,\n                    stillNeeded:\n                        getTrainedPersonnelVehicleTarget([\n                            searchAdvisorRequirement\n                        ]),\n                    isTrainedPersonnelRequirement:\n                        true,\n                    personnelTrainingRequirements: [\n                        searchAdvisorRequirement\n                    ],\n                    convertedFromPersonnelRequirement:\n                        true\n                };\n            }\n\n            const sarConversion =\n                getSarPersonnelVehicleRequirement(\n                    row.unitName,\n                    row.stillNeeded\n                );\n''',
    'supplied Search Advisor trained normalisation',
)

source = replace_once(
    source,
    '''        let tableArmedResponseRequired =\n            0;\n''',
    '''        let tableArmedResponseRequired =\n            0;\n\n        let tableSearchAdvisorRequired =\n            0;\n''',
    'Search Advisor table accumulator',
)

source = replace_once(
    source,
    '''                const sarPersonnelConversion =\n                    getSarPersonnelVehicleRequirement(\n                        cleanedName,\n                        needed\n                    );\n''',
    '''                const searchAdvisorRequirement =\n                    getSearchAdvisorTrainedVehicleRequirement(\n                        cleanedName,\n                        needed\n                    );\n\n                if (searchAdvisorRequirement) {\n                    tableSearchAdvisorRequired =\n                        Math.max(\n                            tableSearchAdvisorRequired,\n                            needed\n                        );\n\n                    if (mfDebugEnabled && !silent) {\n                        debugLog(\n                            'SEARCH ADVISOR TABLE COLLAPSE',\n                            `Search Advisor x${needed} captured from ${source}; selecting any exact registered vehicle carrying search_and_rescue-trained assigned staff.`\n                        );\n                    }\n\n                    return;\n                }\n\n                const sarPersonnelConversion =\n                    getSarPersonnelVehicleRequirement(\n                        cleanedName,\n                        needed\n                    );\n''',
    'Search Advisor live table capture',
)

source = replace_once(
    source,
    '''            tableArmedResponseRequired >\n                0\n''',
    '''            tableArmedResponseRequired >\n                0 ||\n            tableSearchAdvisorRequired >\n                0\n''',
    'Search Advisor trained table condition',
)

source = replace_once(
    source,
    '''                    {\n                        code:\n                            'armed_response_personnel',\n''',
    '''                    {\n                        code:\n                            'search_and_rescue',\n                        label:\n                            'Search Advisor',\n                        required:\n                            tableSearchAdvisorRequired\n                    },\n                    {\n                        code:\n                            'armed_response_personnel',\n''',
    'Search Advisor table trained row',
)

source = source.replace(
    '// Search Advisors = 1 per exact type-85 Control Van',
    '// Search Advisors = verified search_and_rescue-trained staff on any exact registered assigned vehicle',
)
source = source.replace(
    '// V10.6.94: each Search Advisor requirement uses one exact type-85 Control\n    // Van. Search Technicians remain',
    '// V10.6.110: Search Advisor requirements use verified assigned training\n    // profiles on any exact registered vehicle. Search Technicians remain',
)

# 4. Make singular/plural towing use exact type-105 recovery vehicles.
source = replace_once(
    source,
    '''    function getVehicleMatchCandidates(originalName, mappedName) {\n''',
    '''    function isFlatbedRecoveryVehicleRequirement(\n        originalName,\n        mappedName\n    ) {\n        return [originalName, mappedName].some(value => {\n            const cleaned =\n                normaliseVehicleText(value);\n\n            return !!(\n                isCarsToTowRequirementName(value) ||\n                cleaned === 'flatbed recovery vehicle' ||\n                cleaned === 'flatbed recovery vehicles' ||\n                cleaned === 'car recovery' ||\n                cleaned === 'required car recovery'\n            );\n        });\n    }\n\n    function isFlatbedRecoveryVehicleCheckbox(input) {\n        if (!input) return false;\n        return getVehicleTypeIdentifiers(input)\n            .includes('105');\n    }\n\n    function getVehicleMatchCandidates(originalName, mappedName) {\n''',
    'type-105 recovery matcher functions',
)

source = replace_once(
    source,
    '''        const roadRailOnly =\n            isRoadRailUnitRequirement(\n                originalName,\n                mappedName\n            );\n''',
    '''        const roadRailOnly =\n            isRoadRailUnitRequirement(\n                originalName,\n                mappedName\n            );\n\n        const flatbedRecoveryOnly =\n            isFlatbedRecoveryVehicleRequirement(\n                originalName,\n                mappedName\n            );\n''',
    'recovery exact selector flag',
)

source = replace_once(
    source,
    '''        if (crvOnly) {\n''',
    '''        if (flatbedRecoveryOnly) {\n            return sortVehicleCheckboxesByBestArrival(\n                getVehicleCheckboxSnapshot().filter(input => {\n                    if (input.disabled) return false;\n                    if (!includeChecked && input.checked) return false;\n                    return isFlatbedRecoveryVehicleCheckbox(input);\n                })\n            );\n        }\n\n        if (crvOnly) {\n''',
    'recovery exact unchecked selector',
)

# Add the same flag to the selected-count function (the shorter one-line declaration is unique there).
source = replace_once(
    source,
    '''        const roadRailOnly = isRoadRailUnitRequirement(originalName, mappedName);\n        const crvOnly = isCrvRequirement(originalName, mappedName);\n''',
    '''        const roadRailOnly = isRoadRailUnitRequirement(originalName, mappedName);\n        const flatbedRecoveryOnly =\n            isFlatbedRecoveryVehicleRequirement(originalName, mappedName);\n        const crvOnly = isCrvRequirement(originalName, mappedName);\n''',
    'recovery selected-count flag',
)

source = replace_once(
    source,
    '''            if (roadRailOnly) {\n                matches = isRoadRailUnitVehicleCheckbox(input);\n            } else if (crvOnly) {\n''',
    '''            if (roadRailOnly) {\n                matches = isRoadRailUnitVehicleCheckbox(input);\n            } else if (flatbedRecoveryOnly) {\n                matches = isFlatbedRecoveryVehicleCheckbox(input);\n            } else if (crvOnly) {\n''',
    'recovery exact selected verification',
)

source = replace_once(
    source,
    '''        if (\n            assigned < required &&\n            !detectAndLatchStaffingBlock(\n''',
    '''        const strictVehicleTypeOnly = !!(\n            isFireEngineRequirement(originalName, mappedName) ||\n            isFlatbedRecoveryVehicleRequirement(originalName, mappedName)\n        );\n\n        if (\n            assigned < required &&\n            !strictVehicleTypeOnly &&\n            !detectAndLatchStaffingBlock(\n''',
    'recovery quick-select fallback guard',
)

# Structured Missing Vehicles rows previously skipped towing wording entirely.
source = replace_once(
    source,
    '''                getGenericMissingVehicleRowsFromText(text).forEach(row => {\n                    const key = `${normaliseVehicleText(row.unitName)}|${row.stillNeeded}`;\n                    if (!deduped.has(key)) {\n                        deduped.set(key, {\n                            ...row,\n                            source: 'data-requirement-type-vehicles'\n                        });\n                    }\n                });\n''',
    '''                getGenericMissingVehicleRowsFromText(text).forEach(row => {\n                    const key = `${normaliseVehicleText(row.unitName)}|${row.stillNeeded}`;\n                    if (!deduped.has(key)) {\n                        deduped.set(key, {\n                            ...row,\n                            source: 'data-requirement-type-vehicles'\n                        });\n                    }\n                });\n\n                Array.from(text.matchAll(\n                    /(\\d+)\\s*(?:x\\s*)?car(?:s)?\\s+to\\s+tow/gi\n                )).forEach(match => {\n                    const towRequirement =\n                        getCarsToTowVehicleRequirement(\n                            match[0],\n                            match[1]\n                        );\n\n                    if (!towRequirement) return;\n\n                    const key =\n                        `flatbed recovery vehicle|${towRequirement.stillNeeded}`;\n                    if (!deduped.has(key)) {\n                        deduped.set(key, {\n                            unitName: towRequirement.unitName,\n                            stillNeeded: towRequirement.stillNeeded,\n                            towCarsRequired: towRequirement.carsRequired,\n                            source: 'data-requirement-type-vehicles'\n                        });\n                    }\n                });\n''',
    'structured towing requirement parser',
)

source = replace_once(
    source,
    '''                /(\\d+)\\s+car(?:s)?\\s+to\\s+tow/\n''',
    '''                /(\\d+)\\s*(?:x\\s*)?car(?:s)?\\s+to\\s+tow/\n''',
    'legacy towing regex',
)

SOURCE_PATH.write_text(source, encoding='utf-8')

# Align version references in permanent checks and docs.
for path in sorted((ROOT / 'scripts').glob('*.mjs')):
    text = path.read_text(encoding='utf-8')
    updated = (
        text.replace('1.0.45', '1.0.46')
            .replace('V10.6.109', 'V10.6.110')
            .replace("const PERSONNEL_VERSION = '1.3.4';", "const PERSONNEL_VERSION = '1.3.5';")
    )
    if path.name == 'check-open-issues-batch.mjs':
        updated = re.sub(
            r'''// #117 Search Advisor -> Control Van\.\nrequireText\('"Search Advisor": "Control Van"', 'Search Advisor cross-reference'\);\nrequireText\("unitName:\\n                    'Control Van'", 'Search Advisor conversion to Control Van'\);\nrequireText\("personnelPerVehicle:\\n                    1", 'one Control Van per Search Advisor requirement'\);\nrequireText\("return typeIdentifiers\.includes\('85'\)", 'exact type-85 Control Van matcher'\);''',
            '''// #117 was superseded by the later all-vehicle trained-staff rule.\nrequireText("code:\\n                    'search_and_rescue'", 'Search Advisor trained-person code');\nrequireText('registryAnyVehicle:', 'Search Advisor all-vehicle registry flag');\nrequireText("getRegistryTrainingQualifiedCount(", 'Search Advisor exact assigned-training evidence');\nif (source.includes('"Search Advisor": "Control Van"')) {\n  fail('Search Advisor must no longer be hard-mapped to Control Van');\n}''',
            updated,
        )
    if updated != text:
        path.write_text(updated, encoding='utf-8')

check_path = ROOT / 'scripts/check-bulk-trained-register-update.mjs'
check_path.write_text(
    '''#!/usr/bin/env node\n\nimport { readFile } from 'node:fs/promises';\n\nconst source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');\n\nfunction fail(message) {\n  console.error(`ERROR: ${message}`);\n  process.exit(1);\n}\n\nfunction requireText(token, label) {\n  if (!source.includes(token)) fail(`Missing bulk-update contract: ${label}`);\n}\n\nfor (const [token, label] of [\n  ['// @version      1.0.46', 'v1.0.46 metadata'],\n  [' * MODULE 2: MISSION FINDER V10.6.110', 'Mission Finder V10.6.110'],\n  ["const PERSONNEL_VERSION = '1.3.5';", 'Personnel v1.3.5'],\n  ['const DEFAULT_MISSION_READY_DELAY = 1000;', '1000 ms default retained'],\n  ['personnel-register-exact-all-vehicle-scan-v1', 'exact all-vehicle register source'],\n  ['assignedTrainingProfiles,', 'per-person assigned profiles'],\n  ['trainingProfilesComplete: exactVehicleProfileScan', 'complete profile marker'],\n  ['MF_EXACT_REGISTER_TRAINING_SOURCE_PREFIX', 'Mission Finder exact register trust'],\n  ["code:\\n                    'search_and_rescue'", 'Search Advisor trained parser'],\n  ['registryAnyVehicle:', 'Search Advisor any-vehicle flag'],\n  ['trainedOnly:', 'Search Advisor trained-only flag'],\n  ['getRegistryTrainingQualifiedCount(', 'verified assigned training count'],\n  ['function isFlatbedRecoveryVehicleRequirement(', 'recovery requirement classifier'],\n  ['function isFlatbedRecoveryVehicleCheckbox(input)', 'recovery checkbox matcher'],\n  [".includes('105')", 'exact type-105 recovery vehicle'],\n  ['flatbedRecoveryOnly', 'strict recovery selector path'],\n  ['strictVehicleTypeOnly', 'generic quick-select fallback blocked'],\n  ['data-requirement-type-vehicles', 'structured Missing Vehicles support'],\n]) requireText(token, label);\n\nfor (const forbidden of [\n  'Default 1000ms. Auto Mode uses readiness checks and skips duplicate loading waits.',\n  '"Search Advisor": "Control Van"',\n  '"Search Advisors": "Control Van"',\n]) {\n  if (source.includes(forbidden)) fail(`Forbidden legacy contract remains: ${forbidden}`);\n}\n\nconst towFunctionStart = source.indexOf('    function getCarsToTowVehicleRequirement(');\nconst towFunctionEnd = source.indexOf('    function ', towFunctionStart + 20);\nif (towFunctionStart < 0 || towFunctionEnd < 0) fail('Unable to extract towing conversion');\nconst towFunction = source.slice(towFunctionStart, towFunctionEnd);\nconst towing = Function(\n  'isCarsToTowRequirementName',\n  `"use strict";\\n${towFunction}\\nreturn getCarsToTowVehicleRequirement;`\n)(value => /^(?:Required\\s+)?(?:\\d+\\s+)?car(?:s)?\\s+to\\s+tow$/i.test(String(value || '').trim()));\n\nfor (const [label, cars, expectedVehicles] of [\n  ['Car to tow', 1, 1],\n  ['Cars to tow', 2, 1],\n  ['Cars to tow', 3, 2],\n]) {\n  const result = towing(label, cars);\n  if (!result || result.stillNeeded !== expectedVehicles) {\n    fail(`${label} ${cars} expected ${expectedVehicles} recovery vehicle(s)`);\n  }\n}\n\nconsole.log('Bulk update contracts passed: delay helper removed, all-vehicle exact personnel profiles trusted, Search Advisor uses trained assigned units, and singular/plural towing uses exact type-105 recovery vehicles.');\n''',
    encoding='utf-8',
)

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(
    readme,
    '**Current version:** `1.0.45` · **Mission Finder engine:** `V10.6.109`',
    '**Current version:** `1.0.46` · **Mission Finder engine:** `V10.6.110`',
    'README current version',
)
readme = readme.replace(
    '- SAR Commander demand converts to Control Van capability.\n',
    '- Search Advisor demand selects any exact registered vehicle carrying assigned `search_and_rescue`-trained staff; it is no longer tied to Control Vans.\n- SAR Commander demand converts to Control Van capability.\n',
)
readme = readme.replace(
    '- `Car Recovery` maps to the existing Flatbed Recovery Vehicle.\n',
    '- `Car Recovery`, `Car to tow`, and `Cars to tow` use exact type-105 Flatbed Recovery Vehicles.\n',
)
readme_path.write_text(readme, encoding='utf-8')

src_readme_path = ROOT / 'src/README.md'
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = replace_once(src_readme, '| Command Nexus version | `1.0.45` |', '| Command Nexus version | `1.0.46` |', 'src README version')
src_readme = replace_once(src_readme, '| Mission Finder baseline | `V10.6.109` |', '| Mission Finder baseline | `V10.6.110` |', 'src README Mission Finder')
src_readme_path.write_text(src_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## [1.0.46] - 2026-07-26\n\n### Changed\n\n- Removed the explanatory copy beneath Mission Ready Delay while retaining its control and 1000 ms default.\n- Build All Register now publishes complete per-person training profiles for every exact vehicle assignment page across all vehicle types.\n- Mission Finder trusts fresh exact all-vehicle register scans and can find specialist trained staff on any assigned unit.\n- Search Advisor demand now selects exact registered vehicles carrying assigned `search_and_rescue`-trained staff instead of hard-mapping to Control Vans.\n- `Car to tow` and `Cars to tow` now route through exact type-105 Flatbed Recovery Vehicles, including structured Missing Vehicles alerts.\n\n### Changed engine baseline\n\n- Mission Finder increased from `V10.6.109` to `V10.6.110`.\n- Personnel Assignment increased from `1.3.4` to `1.3.5`.\n\n'''
changelog = replace_once(changelog, '## [1.0.45] - 2026-07-26\n', entry + '## [1.0.45] - 2026-07-26\n', 'changelog anchor')
changelog_path.write_text(changelog, encoding='utf-8')

workflow_path = ROOT / '.github/workflows/validate-userscript.yml'
workflow = workflow_path.read_text(encoding='utf-8')
if "scripts/check-bulk-trained-register-update.mjs" not in workflow:
    workflow = workflow.replace(
        "      - 'scripts/check-fire-engine-update-mapping.mjs'\n",
        "      - 'scripts/check-fire-engine-update-mapping.mjs'\n      - 'scripts/check-bulk-trained-register-update.mjs'\n",
    )
    workflow = workflow.replace(
        "      - name: Validate saved-position helper copy removal\n        run: node scripts/check-saved-position-helper-copy.mjs\n",
        "      - name: Validate saved-position helper copy removal\n        run: node scripts/check-saved-position-helper-copy.mjs\n\n      - name: Validate bulk trained-register, Search Advisor and recovery update\n        run: node scripts/check-bulk-trained-register-update.mjs\n",
    )
workflow_path.write_text(workflow, encoding='utf-8')
