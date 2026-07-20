from pathlib import Path

SOURCE = Path('src/missionchief-command-nexus.user.js')
README = Path('README.md')
SRC_README = Path('src/README.md')
CHANGELOG = Path('CHANGELOG.md')

source = SOURCE.read_text(encoding='utf-8')


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

replace_once('// @version      1.0.8', '// @version      1.0.9', 'userscript version')
replace_once("V10.6.74", "V10.6.75", 'Mission Finder version')
source = source.replace('v10674', 'v10675')

new_normaliser = r'''    function normalisePublicOrderTrainedRequirements(
        requirements
    ) {
        const source =
            Array.isArray(requirements)
                ? requirements
                : [];

        const findRequired = code => {
            const item = source.find(
                requirement => requirement.code === code
            );

            return Math.max(
                0,
                parseInt(item?.required, 10) || 0
            );
        };

        const level1Required =
            findRequired('level_1_public_order');

        const level2Required =
            findRequired('level_2_public_order');

        const policeSergeantRequired =
            findRequired('police_sergeant');

        const policeInspectorRequired =
            findRequired('police_inspector');

        const policeMedicRequired =
            findRequired('police_medic');

        const railwayPoliceRequired =
            findRequired('railway_police');

        const armedResponseRequired =
            findRequired('armed_response_personnel');

        const normalised =
            source.filter(requirement => {
                return (
                    requirement.code !==
                        'level_1_public_order' &&
                    requirement.code !==
                        'level_2_public_order' &&
                    requirement.code !==
                        'police_sergeant' &&
                    requirement.code !==
                        'police_inspector' &&
                    requirement.code !==
                        'police_medic' &&
                    requirement.code !==
                        'railway_police' &&
                    requirement.code !==
                        'armed_response_personnel'
                );
            });

        const addStrictTrainedIrvRequirement =
            (
                code,
                label,
                personnelRequired
            ) => {
                if (personnelRequired <= 0) {
                    return;
                }

                const requiredVehicles =
                    Math.ceil(
                        personnelRequired /
                        2
                    );

                normalised.push({
                    code:
                        `${code}_vehicle`,
                    label:
                        `${label} Trained Police IRV`,
                    requirementType:
                        'police_trained_irv_vehicle',
                    required:
                        requiredVehicles,
                    personnelRequired,
                    personnelPerVehicle:
                        2,
                    requiredTrainingCodes: [
                        code
                    ],
                    eligibleVehicleTypeIds: [
                        '8'
                    ]
                });
            };

        // Public Order levels and Sergeant are independent mission profiles.
        // Each exact IRV needs two personnel holding the specific requested
        // profile. A person with multiple profiles is counted for every code
        // they actually hold, but unrelated profiles are never prerequisites.
        addStrictTrainedIrvRequirement(
            'level_1_public_order',
            'Level 1 Public Order',
            level1Required
        );

        addStrictTrainedIrvRequirement(
            'level_2_public_order',
            'Level 2 Public Order',
            level2Required
        );

        addStrictTrainedIrvRequirement(
            'police_sergeant',
            'Police Sergeant',
            policeSergeantRequired
        );

        if (
            policeInspectorRequired > 0
        ) {
            const requiredInspectorVehicles =
                Math.ceil(
                    policeInspectorRequired /
                    2
                );

            normalised.push({
                code:
                    'police_inspector_vehicle',
                label:
                    'Police Inspector Trained Police IRV',
                requirementType:
                    'police_inspector_vehicle',
                required:
                    requiredInspectorVehicles,
                inspectorsRequired:
                    policeInspectorRequired,
                personnelPerVehicle:
                    2,
                requiredTrainingCodes: [
                    'police_inspector'
                ],
                eligibleVehicleTypeIds: [
                    '8'
                ]
            });
        }

        addStrictTrainedIrvRequirement(
            'police_medic',
            'Police Medic',
            policeMedicRequired
        );

        addStrictTrainedIrvRequirement(
            'railway_police',
            'Railway Police Officer',
            railwayPoliceRequired
        );

        if (armedResponseRequired > 0) {
            const requiredArmedTrafficCars = Math.ceil(
                armedResponseRequired / 2
            );

            normalised.push({
                code: 'armed_response_atc_vehicle',
                label: 'Armed Response Personnel in Armed Traffic Cars',
                requirementType: 'armed_response_atc_vehicle',
                required: requiredArmedTrafficCars,
                personnelRequired: armedResponseRequired,
                personnelPerVehicle: 2,
                requiredTrainingCodes: [
                    'traffic_police',
                    'swat'
                ],
                eligibleVehicleTypeIds: [
                    '25'
                ]
            });
        }

        return normalised;
    }

'''
replace_between(
    '    function normalisePublicOrderTrainedRequirements(',
    '    function isStrictLiveVerifiedTrainingEntry(',
    new_normaliser,
    'trained requirement normaliser',
)

combined_contribution_start = '''        if (
            requirement.requirementType ===
                'public_order_combined_vehicle'
        ) {'''
combined_contribution_end = '''        return (
            parseInt(
                trainingCounts['''
replace_between(
    combined_contribution_start,
    combined_contribution_end,
    '',
    'combined contribution branch',
)

combined_format_start = '''                if (
                    requirement
                        .requirementType ===
                    'public_order_combined_vehicle'
                ) {'''
combined_format_end = '''                if (
                    requirement
                        .requirementType ===
                    'police_inspector_vehicle'
                ) {'''
replace_between(
    combined_format_start,
    combined_format_end,
    combined_format_end,
    'combined display branch',
)

replace_once(
    "                requirement?.requirementType ===\n                    'police_inspector_vehicle' ||\n                requirement?.requirementType ===\n                    'public_order_combined_vehicle' ||\n                requirement?.requirementType ===\n                    'police_trained_irv_vehicle'",
    "                requirement?.requirementType ===\n                    'police_inspector_vehicle' ||\n                requirement?.requirementType ===\n                    'police_trained_irv_vehicle'",
    'strict requirement predicate',
)

if 'public_order_combined_vehicle' in source:
    raise SystemExit('Combined Public Order requirement remains in generated source')

for code in (
    'level_1_public_order',
    'level_2_public_order',
    'police_sergeant',
    'police_medic',
    'railway_police',
):
    if source.count(f"        addStrictTrainedIrvRequirement(\n            '{code}',") != 1:
        raise SystemExit(f'Independent trained IRV rule missing or duplicated: {code}')

SOURCE.write_text(source, encoding='utf-8', newline='\n')

readme = README.read_text(encoding='utf-8')
if readme.count('**Current version:** `1.0.8`') != 1:
    raise SystemExit('README current version anchor changed')
README.write_text(
    readme.replace('**Current version:** `1.0.8`', '**Current version:** `1.0.9`', 1),
    encoding='utf-8',
    newline='\n',
)

src_readme = SRC_README.read_text(encoding='utf-8')
if src_readme.count('| Command Nexus version | `1.0.8` |') != 1:
    raise SystemExit('Source README version anchor changed')
SRC_README.write_text(
    src_readme.replace('| Command Nexus version | `1.0.8` |', '| Command Nexus version | `1.0.9` |', 1),
    encoding='utf-8',
    newline='\n',
)

changelog = CHANGELOG.read_text(encoding='utf-8')
anchor = '## [1.0.8] - 2026-07-20'
if changelog.count(anchor) != 1:
    raise SystemExit('CHANGELOG 1.0.8 anchor changed')
entry = '''## [1.0.9] - 2026-07-20

### Fixed

- Fixed urgent issue #57: Level 1 Public Order, Level 2 Public Order and Police Sergeant requirements are now matched independently instead of being collapsed into one mandatory combined profile bundle.
- Sergeant-only, Level 1-only, Level 2-only and Police Medic-only personnel now qualify for missions requesting their exact training profile.
- Multi-trained personnel continue to qualify for every requested profile they actually hold without unrelated training becoming a prerequisite.
- Preserved exact type-8 IRV verification, two trained personnel per selected IRV, capacity controls and genuine missing-training shortfall warnings across Unit Finder, Mission Update and Auto Mode.

### Changed

- Mission Finder increased from `V10.6.74` to `V10.6.75`.

'''
CHANGELOG.write_text(
    changelog.replace(anchor, entry + anchor, 1),
    encoding='utf-8',
    newline='\n',
)

print('Prepared v1.0.9 urgent issue 57 fix')
