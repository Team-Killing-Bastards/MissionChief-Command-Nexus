#!/usr/bin/env python3
from pathlib import Path
import re

SOURCE = Path('src/missionchief-command-nexus.user.js')
ROOT = Path('.diagnostics')
OUTPUT = ROOT / 'bulk-trained-register-context.txt'
source = SOURCE.read_text(encoding='utf-8')
lines = source.splitlines()

patterns = [
    r'Mission Ready Delay', r'mission ready delay', r'missionReady', r'MISSION_READY',
    r'Search Advisor', r'Search Advisors', r'search_and_rescue', r'Control Van',
    r'getSarPersonnelVehicleRequirement', r'getTrainedPersonnelRequirements',
    r'getTrainedPersonnelVehicleTarget', r'selectVehiclesForTrainedPersonnelRequirements',
    r'readPersonnelTrainingRegistry', r'Build Personnel Register', r'Build All Register',
    r'getPersonnelVehicleTypeIdFromRow', r'getPersonnelAmbulanceQueue',
    r'parseVehicleAssignmentPage', r'PERSONNEL_TARGET_VEHICLE_TYPE_ID',
    r'PERSONNEL_TRAINING_REGISTRY', r'personnel.*register', r'vehicle_type_id',
    r'#vehicle_table', r'assignmentHref', r'Car to tow', r'Cars to tow',
    r'Flatbed Recovery Vehicle', r'getCarsToTowVehicleRequirement', r'tow_trucks',
]
compiled = [re.compile(pattern, re.I) for pattern in patterns]


def merge_intervals(intervals):
    intervals = sorted(intervals)
    merged = []
    for start, end in intervals:
        if not merged or start > merged[-1][1] + 5:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return merged


def render_intervals(title, intervals):
    out = [title, f'SOURCE LINES: {len(lines)}', '']
    for block_index, (start, end) in enumerate(merge_intervals(intervals), 1):
        out.append(f'=== BLOCK {block_index}: source lines {start + 1}-{end} ===')
        for line_no in range(start, end):
            out.append(f'{line_no + 1:06d}: {lines[line_no]}')
        out.append('')
    return out


def keyword_intervals(keywords, radius=35):
    regexes = [re.compile(keyword, re.I) for keyword in keywords]
    intervals = []
    for index, line in enumerate(lines):
        if any(regex.search(line) for regex in regexes):
            intervals.append((max(0, index - radius), min(len(lines), index + radius + 1)))
    return intervals


def extract_top_level_function(name):
    pattern = re.compile(rf'^    (?:async\s+)?function\s+{re.escape(name)}\s*\(', re.M)
    match = pattern.search(source)
    if not match:
        return f'=== FUNCTION {name}: NOT FOUND ===\n'
    next_match = re.search(r'^    (?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(', source[match.end():], re.M)
    end = match.end() + next_match.start() if next_match else len(source)
    start_line = source.count('\n', 0, match.start()) + 1
    end_line = source.count('\n', 0, end) + 1
    return f'=== FUNCTION {name}: source lines {start_line}-{end_line} ===\n{source[match.start():end].rstrip()}\n'


def extract_named_constant(name):
    pattern = re.compile(rf'^    const\s+{re.escape(name)}\s*=', re.M)
    match = pattern.search(source)
    if not match:
        return f'=== CONSTANT {name}: NOT FOUND ===\n'
    next_match = re.search(r'^    (?:const|let|var|(?:async\s+)?function)\s+', source[match.end():], re.M)
    end = match.end() + next_match.start() if next_match else len(source)
    start_line = source.count('\n', 0, match.start()) + 1
    end_line = source.count('\n', 0, end) + 1
    return f'=== CONSTANT {name}: source lines {start_line}-{end_line} ===\n{source[match.start():end].rstrip()}\n'


intervals = keyword_intervals(patterns, radius=45)
out = render_intervals('BULK TRAINED REGISTER DIAGNOSTIC CONTEXT', intervals)
out.append('=== FUNCTION INVENTORY MATCHING PERSONNEL / TRAINING / SEARCH / READY / TOW ===')
for match in re.finditer(r'^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(', source, re.M):
    name = match.group(1)
    if re.search(r'personnel|training|search|advisor|ready|register|vehicle|tow|recovery', name, re.I):
        line_no = source.count('\n', 0, match.start()) + 1
        out.append(f'{line_no:06d}: {name}')
out.append('')
out.append('=== CONSTANT / KEYWORD COUNTS ===')
for pattern in patterns:
    out.append(f'{pattern}: {len(re.findall(pattern, source, re.I))}')

ROOT.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text('\n'.join(out) + '\n', encoding='utf-8')


def write_topic(filename, title, function_names, keywords, constants=()):
    topic = render_intervals(title, keyword_intervals(keywords, radius=30))
    topic.append('=== FULL CONSTANTS ===')
    topic.append('')
    for name in constants:
        topic.append(extract_named_constant(name))
    topic.append('=== FULL TOP-LEVEL FUNCTIONS ===')
    topic.append('')
    for name in function_names:
        topic.append(extract_top_level_function(name))
    (ROOT / filename).write_text('\n'.join(topic) + '\n', encoding='utf-8')


write_topic(
    'mission-ready-delay-context.txt',
    'MISSION READY DELAY CONTEXT',
    ['getMissionReadyDelay', 'waitForMissionReady'],
    [r'Mission Ready Delay', r'missionReady', r'MISSION_READY', r'mf-mission-ready', r'1000\s*ms'],
    ['DEFAULT_MISSION_READY_DELAY'],
)

write_topic(
    'search-advisor-context.txt',
    'SEARCH ADVISOR TRAINED DISPATCH CONTEXT',
    [
        'getSarPersonnelVehicleRequirement',
        'getSupportedTrainedPersonnelRequirementsFromText',
        'normalisePublicOrderTrainedRequirements',
        'normaliseOperationalRequirementRows',
        'getTrainingRequirementPersonnelTarget',
        'getTrainingRequirementRequiredCodes',
        'getTrainingRequirementEligibleTypeIds',
        'getTrainingRequirementVehicleCapacity',
        'getTrainingRequirementVehicleTypeId',
        'getTrainingRequirementQualifiedCount',
        'getTrainingRequirementNominalCapacity',
        'isCheckboxEligibleForTrainingRequirement',
        'getTrainedPersonnelVehicleTarget',
        'mergeTrainedPersonnelRequirements',
        'getRegistryTrainingQualifiedCount',
        'getTrainingCandidatePersonnelProfiles',
        'getTrainedCandidateMetrics',
        'selectVehiclesForTrainedPersonnelRequirements',
        'getSupportedMissingPersonnelRowsFromText',
        'prepareTrainedPersonnelRegistryForRows',
        'getRegistryEntryForMissionCheckbox',
        'isStrictLiveVerifiedTrainingEntry',
        'isAuthoritativeLivePoliceTrainingEntry',
    ],
    [
        r'"Search Advisor"', r'"Search Advisors"', r'Search Advisor',
        r'search_and_rescue', r'Control Van', r'SAR Commander',
        r'eligibleVehicleTypeIds', r'assignedTrainingProfiles',
        r'MF_TRAINED_PERSONNEL_PATTERNS', r'MF_PROTECTED_ORDINARY_IRV_TRAINING_CODES',
    ],
    [
        'crossReference',
        'MF_TRAINED_PERSONNEL_PATTERNS',
        'MF_PROTECTED_ORDINARY_IRV_TRAINING_CODES',
        'MF_TRAINED_VEHICLE_CAPACITY_BY_TYPE',
    ],
)

write_topic(
    'personnel-register-scan-context.txt',
    'PERSONNEL REGISTER ALL-VEHICLE SCAN CONTEXT',
    [
        'buildPersonnelTrainingRegisterOneClick',
        'startPersonnelRun',
        'processPersonnelQueue',
        'publishPersonnelVehicleTrainingRegistry',
        'countPersonnelTrainingCodes',
        'countPersonnelTrainingCombinations',
        'getPersonnelTrainingCombinationKey',
        'getPersonnelAssignmentIndex',
        'getPersonnelAssignedToVehicle',
        'processOnePersonnelStation',
        'getPersonnelVehicleTypeIdFromRow',
        'getPersonnelVehicleQueue',
        'selectPoliceRuleVehicles',
        'getPersonnelAmbulanceQueue',
        'parseTrainingCodes',
        'parseVehicleAssignmentPage',
        'normaliseImportedPersonnelTrainingRegistry',
    ],
    [
        r'Build All Register', r'Build Personnel', r'PERSONNEL_TARGET_VEHICLE_TYPE_ID',
        r'getPersonnelVehicleQueue', r'getPersonnelAmbulanceQueue',
        r'vehicle_type_id', r'assignmentHref', r'publishPersonnelVehicleTrainingRegistry',
        r'#vehicle_table', r'type-51', r"'51'", r'PSU',
        r'assignedTrainingProfiles', r'trainingProfilesComplete',
    ],
    [
        'PERSONNEL_TRAINING_REGISTRY_SCHEMA_VERSION',
        'PERSONNEL_TRAINING_REGISTRY_MAX_AGE_MS',
    ],
)

write_topic(
    'towing-recovery-context.txt',
    'CAR TO TOW / CARS TO TOW RECOVERY CONTEXT',
    [
        'getCarsToTowVehicleRequirement',
        'isFlatbedRecoveryVehicleRequirement',
        'isFlatbedRecoveryVehicleCheckbox',
        'getAllMatchingVehicleCheckboxes',
        'getMatchingVehicleCheckboxes',
        'countSelectedMatchingVehicles',
        'readMissionUpdateRows',
        'getGenericMissingVehicleRowsFromText',
        'getStructuredMissingVehicleRows',
    ],
    [
        r'Car to tow', r'Cars to tow', r'cars?\s+to\s+tow',
        r'Flatbed Recovery Vehicle', r'tow_trucks', r'vehicle type.?105', r"'105'",
    ],
    ['crossReference'],
)
