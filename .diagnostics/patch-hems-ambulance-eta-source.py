#!/usr/bin/env python3
from pathlib import Path
import re

SOURCE_PATH = Path('src/missionchief-command-nexus.user.js')
source = SOURCE_PATH.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def function_bounds(text, name):
    match = re.search(
        rf'^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(',
        text,
        re.M,
    )
    if not match:
        raise SystemExit(f'Function not found: {name}')
    next_match = re.search(
        r'^\s*(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(',
        text[match.end():],
        re.M,
    )
    if not next_match:
        raise SystemExit(f'Unable to find function boundary after {name}')
    end = match.end() + next_match.start()
    return match.start(), end


def replace_in_function(text, name, old, new, label):
    start, end = function_bounds(text, name)
    body = text[start:end]
    count = body.count(old)
    if count != 1:
        raise SystemExit(
            f'{label} in {name}: expected exactly one match, found {count}'
        )
    body = body.replace(old, new, 1)
    return text[:start] + body + text[end:]


def insert_after_function(text, name, addition):
    _, end = function_bounds(text, name)
    return text[:end] + '\n\n' + addition.rstrip() + '\n\n' + text[end:]


source = replace_once(
    source,
    '// @version      1.0.47',
    '// @version      1.0.48',
    'userscript version',
)
source = replace_once(
    source,
    ' * MODULE 2: MISSION FINDER V10.6.111',
    ' * MODULE 2: MISSION FINDER V10.6.112',
    'Mission Finder version',
)

source = insert_after_function(
    source,
    'isAirAmbulanceVehicleCheckbox',
    r'''    function isStandardAmbulanceEtaVehicleCheckbox(input) {
        if (!input) return false;

        // Ordinary patient/Ambulance demand may use either an exact road
        // Ambulance (type 5) or HEMS/Air Ambulance (type 9). The shared
        // arrival sorter then compares MissionChief ETA before distance.
        const typeIdentifiers = getVehicleTypeIdentifiers(input);
        return (
            typeIdentifiers.includes('5') ||
            typeIdentifiers.includes('9')
        );
    }''',
)

strict_declaration = (
    '        const strictExactOnly = '
    'isAmbulanceTransportRequest(originalName, mappedName);'
)
strict_with_standard = (
    strict_declaration +
    '\n        const standardAmbulanceEtaPreferred = strictExactOnly;'
)
source = replace_in_function(
    source,
    'getAllMatchingVehicleCheckboxes',
    strict_declaration,
    strict_with_standard,
    'standard Ambulance selector flag',
)

source = replace_in_function(
    source,
    'getAllMatchingVehicleCheckboxes',
    '        if (roadRailOnly) {',
    r'''        if (standardAmbulanceEtaPreferred) {
            const orderedAmbulanceMatches =
                sortVehicleCheckboxesByBestArrival(
                    getVehicleCheckboxSnapshot().filter(input => {
                        if (input.disabled) return false;
                        if (!includeChecked && input.checked) return false;
                        return isStandardAmbulanceEtaVehicleCheckbox(input);
                    })
                );

            if (mfDebugEnabled) {
                const roadCount = orderedAmbulanceMatches.filter(input =>
                    getVehicleTypeIdentifiers(input).includes('5')
                ).length;
                const hemsCount = orderedAmbulanceMatches.filter(input =>
                    getVehicleTypeIdentifiers(input).includes('9')
                ).length;
                debugLog(
                    'AMBULANCE ETA PRIORITY',
                    `${originalName} -> ${mappedName} | road=${roadCount} | HEMS=${hemsCount} | first=${orderedAmbulanceMatches[0] ? getVehicleDebugName(orderedAmbulanceMatches[0]) : 'none'}`
                );
            }

            return orderedAmbulanceMatches;
        }

        if (roadRailOnly) {''',
    'standard Ambulance ETA branch',
)

source = replace_in_function(
    source,
    'countSelectedMatchingVehicles',
    strict_declaration,
    strict_with_standard,
    'selected standard Ambulance flag',
)
source = replace_in_function(
    source,
    'countSelectedMatchingVehicles',
    '            if (roadRailOnly) {',
    r'''            if (standardAmbulanceEtaPreferred) {
                matches = isStandardAmbulanceEtaVehicleCheckbox(input);
            } else if (roadRailOnly) {''',
    'selected standard Ambulance counter',
)

source = replace_in_function(
    source,
    'findUnitButton',
    '        if (\n            isCrvRequirement(',
    r'''        if (
            isAmbulanceTransportRequest(
                requestedName,
                mappedName
            ) ||
            isCrvRequirement(''',
    'exact standard Ambulance fallback route',
)

source = replace_in_function(
    source,
    'selectVehicleUnits',
    r'''        const strictVehicleTypeOnly = !!(
            isFireEngineRequirement(originalName, mappedName) ||
            isFlatbedRecoveryVehicleRequirement(originalName, mappedName)
        );''',
    r'''        const strictVehicleTypeOnly = !!(
            isAmbulanceTransportRequest(originalName, mappedName) ||
            isFireEngineRequirement(originalName, mappedName) ||
            isFlatbedRecoveryVehicleRequirement(originalName, mappedName)
        );''',
    'standard Ambulance generic fallback block',
)

SOURCE_PATH.write_text(source, encoding='utf-8')
