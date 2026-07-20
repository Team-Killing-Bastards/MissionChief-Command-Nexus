from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / 'src' / 'missionchief-command-nexus.user.js'
CHANGELOG_PATH = ROOT / 'CHANGELOG.md'
README_PATH = ROOT / 'README.md'
SRC_README_PATH = ROOT / 'src' / 'README.md'

source = SOURCE_PATH.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    source = source.replace(old, new, 1)


def replace_count(old: str, new: str, expected: int, label: str) -> None:
    global source
    count = source.count(old)
    if count != expected:
        raise SystemExit(f'{label}: expected {expected} matches, found {count}')
    source = source.replace(old, new)


def sub_once(pattern: str, replacement: str, label: str, flags: int = 0) -> None:
    global source
    source, count = re.subn(pattern, lambda _match: replacement, source, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one regex match, found {count}')


# ---------------------------------------------------------------------------
# Release metadata and medical Critical Care target (issue #42)
# ---------------------------------------------------------------------------
replace_once('// @version      1.0.5', '// @version      1.0.6', 'userscript version')
replace_once("const PERSONNEL_VERSION = '1.2.8';", "const PERSONNEL_VERSION = '1.2.9';", 'personnel version')
replace_once('const PERSONNEL_TARGET_PER_VEHICLE = 2;', 'const PERSONNEL_TARGET_PER_VEHICLE = 1;', 'Critical Care target')
replace_once(
    "requirement: '2 Critical Care-trained staff per Ambulance',",
    "requirement: '1 Critical Care-trained staff per Ambulance',",
    'Critical Care profile requirement text',
)
replace_once(
    "policy: 'LIVE ENGINE: Critical Care is used only for normal Ambulances. Existing assignments are preserved and vehicles are safely topped up to 2 trained staff.',",
    "policy: 'LIVE ENGINE: Critical Care is used only for normal Ambulances. Existing assignments are preserved and vehicles are safely topped up to 1 trained staff.',",
    'Critical Care profile policy text',
)
replace_once(
    ' * MODULE 2: MISSION FINDER V10.6.72',
    ' * MODULE 2: MISSION FINDER V10.6.73',
    'Mission Finder module heading',
)
replace_once(
    "    // V10.6.72: Exact assignment-page scans no longer require a permanent binding\n"
    "    // before an untrained IRV may satisfy ordinary Police attendance. Police Medic\n"
    "    // and Railway Police Officer requirements now use exact trained IRVs with two\n"
    "    // qualified personnel, and ATV Carrier uses an authoritative type-30 matcher.\n",
    "    // V10.6.72: Exact assignment-page scans no longer require a permanent binding\n"
    "    // before an untrained IRV may satisfy ordinary Police attendance. Police Medic\n"
    "    // and Railway Police Officer requirements now use exact trained IRVs with two\n"
    "    // qualified personnel, and ATV Carrier uses an authoritative type-30 matcher.\n"
    "    // V10.6.73: Critical Care Ambulances now require one trained person per vehicle.\n"
    "    // Armed Response personnel use exact type-25 ATCs with two officers who each hold\n"
    "    // both Roads Policing and Firearms. Police Officer and Seagoing Vessel upgrade\n"
    "    // rows now use shared strict conversions across Unit Finder, Update and Auto.\n",
    'Mission Finder release note',
)

# ---------------------------------------------------------------------------
# Shared Personnel Register: all vehicle types and exact assigned staff
# ---------------------------------------------------------------------------
replace_once(
    "        const allowed = new Set((allowedTypeIds || []).map(String));\n"
    "        const seen = new Set();",
    "        const allowed = new Set((allowedTypeIds || []).map(String));\n"
    "        const allowAllVehicleTypes = allowed.size === 0;\n"
    "        const seen = new Set();",
    'all vehicle type queue switch',
)
replace_once(
    "            if (!allowed.has(vehicleTypeId)) continue;",
    "            if (!allowAllVehicleTypes && !allowed.has(vehicleTypeId)) continue;",
    'all vehicle type queue filter',
)

combination_helpers = r'''
    function getPersonnelTrainingCombinationKey(trainingCodes) {
        return Array.from(
            new Set(
                (Array.isArray(trainingCodes) ? trainingCodes : [])
                    .map(String)
                    .filter(Boolean)
            )
        )
            .sort()
            .join('+');
    }

    function countPersonnelTrainingCombinations(assignedPersonnel) {
        const combinations = [
            ['traffic_police', 'swat']
        ];
        const counts = {};

        combinations.forEach(requiredCodes => {
            const key = getPersonnelTrainingCombinationKey(requiredCodes);
            counts[key] = (
                Array.isArray(assignedPersonnel)
                    ? assignedPersonnel
                    : []
            ).filter(person => {
                const trainingSet = new Set(
                    Array.isArray(person?.trainingCodes)
                        ? person.trainingCodes.map(String)
                        : []
                );
                return requiredCodes.every(code => trainingSet.has(code));
            }).length;
        });

        return counts;
    }

'''
replace_once(
    "    function publishPersonnelVehicleTrainingRegistry({\n",
    combination_helpers + "    function publishPersonnelVehicleTrainingRegistry({\n",
    'personnel training combination helpers',
)
replace_once(
    "        personnel,\n        source = 'scan'\n    }) {",
    "        personnel,\n        source = 'scan',\n        pruneMissingVehicles = true\n    }) {",
    'registry publisher options',
)
replace_once(
    "        Object.entries(registry.vehicles).forEach(([vehicleId, entry]) => {\n"
    "            if (String(entry?.stationHref || '') !== String(station?.href || '')) return;\n"
    "            if (!processedTypeIds.has(String(entry?.vehicleTypeId || ''))) return;\n"
    "            if (!currentVehicleIds.has(String(vehicleId))) delete registry.vehicles[vehicleId];\n"
    "        });",
    "        if (pruneMissingVehicles) {\n"
    "            Object.entries(registry.vehicles).forEach(([vehicleId, entry]) => {\n"
    "                if (String(entry?.stationHref || '') !== String(station?.href || '')) return;\n"
    "                if (!processedTypeIds.has(String(entry?.vehicleTypeId || ''))) return;\n"
    "                if (!currentVehicleIds.has(String(vehicleId))) delete registry.vehicles[vehicleId];\n"
    "            });\n"
    "        }",
    'safe registry pruning option',
)
replace_once(
    "                assignedPersonnelCount: assignedPersonnel.length,\n"
    "                trainingCounts: countPersonnelTrainingCodes(assignedPersonnel),\n"
    "                updatedAt: now,",
    "                assignedPersonnelCount: assignedPersonnel.length,\n"
    "                assignmentScanComplete: true,\n"
    "                personnelRowsSeen: Array.isArray(personnel) ? personnel.length : 0,\n"
    "                trainingCounts: countPersonnelTrainingCodes(assignedPersonnel),\n"
    "                trainingCombinationCounts: countPersonnelTrainingCombinations(assignedPersonnel),\n"
    "                updatedAt: now,",
    'registry exact assigned training snapshot',
)

replace_once(
    "                const assignedHere = classes.includes('btn-assigned');",
    "                const actionText = cleanText(\n"
    "                    actionLink?.innerText ||\n"
    "                    actionLink?.textContent ||\n"
    "                    actionLink?.value ||\n"
    "                    ''\n"
    "                );\n"
    "                const assignedHere =\n"
    "                    classes.includes('btn-assigned') ||\n"
    "                    /remove\\s+binding/i.test(actionText);",
    'assignment Remove binding recognition',
)

register_builder = r'''    async function buildPersonnelTrainingRegisterOneClick() {
        if (STATE.running || STATION_STATE.running) {
            personnelLog(
                'A naming tool is currently running. Stop it before building the Personnel Register.',
                'error'
            );
            setPersonnelUiValue('status', 'Blocked by naming tool');
            return;
        }

        if (PERSONNEL_STATE.running) {
            personnelLog(
                'Personnel Assignment or a register build is already running.',
                'debug'
            );
            return;
        }

        const stations =
            Array.from(
                document.querySelectorAll(
                    'a.lightbox-open.list-group-item.active[href^="/buildings/"]'
                )
            )
                .map((link, index) => {
                    const displayName = cleanText(link.textContent);
                    const href = link.getAttribute('href') || '';
                    const container = link.closest(
                        '.building_list_li[building_type_id], .building_list[building_type_id]'
                    );
                    const rawTypeId = container?.getAttribute('building_type_id') ?? '';
                    const buildingTypeId = rawTypeId === '' ? null : Number(rawTypeId);
                    const stationType =
                        STATION_BUILDING_TYPE_INFO[buildingTypeId]?.stationType ||
                        detectStationType(displayName);

                    return {
                        index,
                        href,
                        buildingId: getBuildingIdFromHref(href),
                        displayName,
                        buildingTypeId,
                        stationType
                    };
                })
                .filter(station => station.href && station.buildingId);

        if (!stations.length) {
            personnelLog(
                'No stations were found on the current station overview.',
                'error'
            );
            setPersonnelUiValue('status', 'No stations found');
            return;
        }

        const button = document.querySelector('#mc-personnel-build-register');
        const previousAction = PERSONNEL_STATE.action;

        PERSONNEL_STATE.running = true;
        PERSONNEL_STATE.registerBuilding = true;
        PERSONNEL_STATE.paused = false;
        PERSONNEL_STATE.stopped = false;
        PERSONNEL_STATE.action = 'preview';
        PERSONNEL_STATE.activeController = null;
        PERSONNEL_STATE.lastRequestAt = 0;

        if (button) {
            button.disabled = true;
            button.textContent = 'Building Register...';
        }

        document.querySelector('#mc-personnel-pause').textContent = 'Pause';
        setPersonnelUiValue('status', 'Building all-station personnel register');
        setPersonnelUiValue('progress', `0 / ${stations.length}`);
        setPersonnelUiValue('vehicle', 'None');

        personnelLog(
            `One-click register build started for all ${stations.length} station(s). Every discovered vehicle is read from its own assignment page. No personnel assignments will be changed.`,
            'info'
        );

        let completedStations = 0;
        let scannedVehicles = 0;
        let exactVehiclePagesRead = 0;
        let skippedStations = 0;
        let failedStations = 0;
        let failedVehicles = 0;

        try {
            for (let stationIndex = 0; stationIndex < stations.length; stationIndex++) {
                if (PERSONNEL_STATE.stopped) break;
                await waitIfPersonnelPaused();
                if (PERSONNEL_STATE.stopped) break;

                const station = stations[stationIndex];
                setPersonnelUiValue('progress', `${stationIndex + 1} / ${stations.length}`);
                setPersonnelUiValue('current', station.displayName);
                setPersonnelUiValue('vehicle', 'Reading station vehicles');
                setPersonnelUiValue('status', 'Scanning station vehicle table');
                personnelLog(
                    `Register station ${stationIndex + 1}/${stations.length}: ${station.displayName}`,
                    'station'
                );

                try {
                    const stationPage = await personnelFetchDocument(station.href, 14000);
                    const vehicles = getPersonnelVehicleQueue(stationPage.doc, []);

                    if (!vehicles.length) {
                        skippedStations++;
                        personnelLog('No vehicles found at this station.', 'debug');
                        continue;
                    }

                    const mergedPersonnel = new Map();
                    const verifiedVehicles = [];

                    for (let vehicleIndex = 0; vehicleIndex < vehicles.length; vehicleIndex++) {
                        if (PERSONNEL_STATE.stopped) break;
                        await waitIfPersonnelPaused();
                        if (PERSONNEL_STATE.stopped) break;

                        const vehicle = vehicles[vehicleIndex];
                        setPersonnelUiValue(
                            'vehicle',
                            `${vehicle.name || vehicle.vehicleId} (${vehicleIndex + 1}/${vehicles.length})`
                        );
                        setPersonnelUiValue('status', 'Reading exact vehicle assignments');

                        try {
                            const assignmentPage = await personnelFetchDocument(
                                vehicle.assignmentHref,
                                14000
                            );

                            if (!assignmentPage.doc.querySelector('#personal_table')) {
                                throw new Error('Personnel table was not present on the assignment page.');
                            }

                            const assignment = parseVehicleAssignmentPage(
                                assignmentPage.doc,
                                vehicle.vehicleId
                            );

                            assignment.rows.forEach(person => {
                                const personnelId = String(person?.personnelId || '');
                                if (!personnelId) return;

                                const existing = mergedPersonnel.get(personnelId);
                                const newHasExactBinding = Boolean(person.assignedVehicleId);
                                const existingHasExactBinding = Boolean(existing?.assignedVehicleId);

                                if (
                                    !existing ||
                                    (person.assignedHere && !existing.assignedHere) ||
                                    (newHasExactBinding && !existingHasExactBinding)
                                ) {
                                    mergedPersonnel.set(personnelId, person);
                                }
                            });

                            verifiedVehicles.push(vehicle);
                            exactVehiclePagesRead++;
                        } catch (error) {
                            failedVehicles++;
                            personnelLog(
                                `Exact vehicle scan failed for ${vehicle.name || vehicle.vehicleId}: ${error?.message || error}`,
                                'error'
                            );
                        }
                    }

                    if (!verifiedVehicles.length) {
                        failedStations++;
                        personnelLog(
                            'No exact vehicle assignment page could be verified at this station.',
                            'error'
                        );
                        continue;
                    }

                    const published = publishPersonnelVehicleTrainingRegistry({
                        station,
                        vehicles: verifiedVehicles,
                        personnel: Array.from(mergedPersonnel.values()),
                        source: 'one-click-all-station-exact-register-scan',
                        pruneMissingVehicles: false
                    });

                    scannedVehicles += Number(published || 0);
                    completedStations++;
                    personnelLog(
                        `Register updated for ${published} exact vehicle(s); assigned training was read from ${verifiedVehicles.length} vehicle page(s).`,
                        'done'
                    );
                } catch (error) {
                    failedStations++;
                    personnelLog(
                        `Register scan failed at ${station.displayName}: ${error?.message || error}`,
                        'error'
                    );
                }
            }

            const saveResult = flushPersonnelTrainingRegistry(false);
            const stopped = PERSONNEL_STATE.stopped;
            const summary = [
                'PERSONNEL TRAINING REGISTER BUILD',
                '',
                `Status: ${stopped ? 'STOPPED' : 'COMPLETE'}`,
                `All station types considered: ${stations.length}`,
                `Stations scanned: ${completedStations}`,
                `Stations without vehicles: ${skippedStations}`,
                `Stations failed: ${failedStations}`,
                `Exact vehicle pages read: ${exactVehiclePagesRead}`,
                `Exact vehicles registered: ${scannedVehicles}`,
                `Vehicle pages failed: ${failedVehicles}`,
                `Registry retained: ${Number(saveResult?.retained || 0)}`,
                '',
                'Only personnel already assigned to each exact vehicle were recorded.',
                'No personnel assignments were changed.'
            ].join('\n');

            PERSONNEL_STATE.currentReport = summary;
            renderPersonnelReport(summary);
            setPersonnelUiValue('completed', completedStations);
            setPersonnelUiValue('vehicles', scannedVehicles);
            setPersonnelUiValue('assigned', 0);
            setPersonnelUiValue(
                'status',
                stopped ? 'Register build stopped' : 'All-station personnel register ready'
            );

            personnelLog(
                stopped
                    ? `Register build stopped after ${completedStations} station(s) and ${scannedVehicles} exact vehicle(s).`
                    : `Personnel register complete: ${completedStations} station(s), ${scannedVehicles} exact vehicle(s), no staffing changes.`,
                stopped ? 'error' : 'done'
            );
        } finally {
            flushPersonnelTrainingRegistry(true);
            PERSONNEL_STATE.running = false;
            PERSONNEL_STATE.registerBuilding = false;
            PERSONNEL_STATE.paused = false;
            PERSONNEL_STATE.action = previousAction;
            PERSONNEL_STATE.activeController = null;

            if (button) {
                button.disabled = false;
                button.textContent = 'Build Personnel Register';
            }

            document.querySelector('#mc-personnel-pause').textContent = 'Pause';
        }
    }

'''
sub_once(
    r"    async function buildPersonnelTrainingRegisterOneClick\(\) \{.*?\n    \}\n\n    function startPersonnelRun\(\) \{",
    register_builder + "    function startPersonnelRun() {",
    'all-station exact register builder',
    re.S,
)

# ---------------------------------------------------------------------------
# Armed Response / dual-trained Armed Traffic Car support (issue #30)
# ---------------------------------------------------------------------------
armed_pattern = r'''            },
            {
                code:
                    'armed_response_personnel',
                label:
                    'Armed Response Personnel',
                patterns: [
                    /(\d+)\s*(?:x\s*)?(?:Required\s+)?Armed\s+Response\s+Personnel(?:\s*\(\s*In\s+Armed\s+Vehicles\s*\))?/gi,
                    /(?:Required\s+)?Armed\s+Response\s+Personnel(?:\s*\(\s*In\s+Armed\s+Vehicles\s*\))?\s*(?:x\s*)?(\d+)/gi
                ]
'''
replace_once(
    "            {\n                code:\n                    'railway_police',\n                label:\n                    'Railway Police Officer',\n                patterns: [\n                    /(\\d+)\\s*(?:x\\s*)?Railway\\s+Police\\s+Officer(?:s)?/gi,\n                    /Railway\\s+Police\\s+Officer(?:s)?\\s*(?:x\\s*)?(\\d+)/gi\n                ]\n            }\n        ]);",
    "            {\n                code:\n                    'railway_police',\n                label:\n                    'Railway Police Officer',\n                patterns: [\n                    /(\\d+)\\s*(?:x\\s*)?Railway\\s+Police\\s+Officer(?:s)?/gi,\n                    /Railway\\s+Police\\s+Officer(?:s)?\\s*(?:x\\s*)?(\\d+)/gi\n                ]\n" + armed_pattern + "            }\n        ]);",
    'Armed Response text patterns',
)

armed_name_helper = r'''
    function isArmedResponsePersonnelRequirementName(value) {
        const cleaned = String(value || '')
            .replace(/\s+/g, ' ')
            .trim();

        return /^(?:Required\s+)?Armed\s+Response\s+Personnel(?:\s*\(\s*In\s+Armed\s+Vehicles\s*\))?$/i
            .test(cleaned);
    }

'''
replace_once(
    "    function getSupportedTrainedPersonnelRequirementsFromText(\n",
    armed_name_helper + "    function getSupportedTrainedPersonnelRequirementsFromText(\n",
    'Armed Response requirement name helper',
)
replace_once(
    "        const railwayPoliceRequired =\n            findRequired('railway_police');",
    "        const railwayPoliceRequired =\n            findRequired('railway_police');\n\n"
    "        const armedResponseRequired =\n            findRequired('armed_response_personnel');",
    'Armed Response normalised count',
)
replace_once(
    "                    requirement.code !==\n                        'police_medic' &&\n"
    "                    requirement.code !==\n                        'railway_police'",
    "                    requirement.code !==\n                        'police_medic' &&\n"
    "                    requirement.code !==\n                        'railway_police' &&\n"
    "                    requirement.code !==\n                        'armed_response_personnel'",
    'remove Armed Response raw personnel row',
)
armed_normalisation = r'''
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

'''
replace_once(
    "        return normalised;\n    }\n\n\n    function isStrictLiveVerifiedTrainingEntry(",
    armed_normalisation + "        return normalised;\n    }\n\n\n    function isStrictLiveVerifiedTrainingEntry(",
    'Armed Response ATC normalisation',
)

mission_combination_helper = r'''
    function getMissionTrainingCombinationKey(trainingCodes) {
        return Array.from(
            new Set(
                (Array.isArray(trainingCodes) ? trainingCodes : [])
                    .map(String)
                    .filter(Boolean)
            )
        )
            .sort()
            .join('+');
    }

'''
replace_once(
    "    function getTrainingRequirementContribution(\n",
    mission_combination_helper + "    function getTrainingRequirementContribution(\n",
    'Mission Finder training combination helper',
)
replace_once(
    "        const trainingCounts =\n            registryEntry.trainingCounts &&\n"
    "            typeof registryEntry.trainingCounts ===\n                'object'\n"
    "                ? registryEntry.trainingCounts\n                : {};\n\n"
    "        const allowedTypes =",
    "        const trainingCounts =\n            registryEntry.trainingCounts &&\n"
    "            typeof registryEntry.trainingCounts ===\n                'object'\n"
    "                ? registryEntry.trainingCounts\n                : {};\n\n"
    "        const trainingCombinationCounts =\n            registryEntry.trainingCombinationCounts &&\n"
    "            typeof registryEntry.trainingCombinationCounts === 'object'\n"
    "                ? registryEntry.trainingCombinationCounts\n                : {};\n\n"
    "        const allowedTypes =",
    'training combination counts in contribution',
)
armed_contribution = r'''
        if (
            requirement.requirementType ===
                'armed_response_atc_vehicle'
        ) {
            if (
                !isAuthoritativeLivePoliceTrainingEntry(
                    registryEntry
                )
            ) {
                return 0;
            }

            const combinationKey =
                getMissionTrainingCombinationKey(
                    requirement.requiredTrainingCodes
                );

            const qualifiedDualTrainedCount =
                parseInt(
                    trainingCombinationCounts[combinationKey],
                    10
                ) || 0;

            return qualifiedDualTrainedCount >= 2
                ? 1
                : 0;
        }

'''
replace_once(
    "        if (\n            requirement.requirementType ===\n                'police_inspector_vehicle'\n        ) {",
    armed_contribution + "        if (\n            requirement.requirementType ===\n                'police_inspector_vehicle'\n        ) {",
    'Armed Response contribution rule',
)

armed_format = r'''
                if (
                    requirement.requirementType ===
                    'armed_response_atc_vehicle'
                ) {
                    return (
                        `${requirement.label} x${requirement.required} ` +
                        `(${requirement.personnelRequired} required; ` +
                        `2 personnel who each hold Roads Policing + Firearms on every exact type-25 ATC)`
                    );
                }

'''
replace_once(
    "                if (\n                    requirement\n                        .requirementType ===\n                    'public_order_combined_vehicle'\n                ) {",
    armed_format + "                if (\n                    requirement\n                        .requirementType ===\n                    'public_order_combined_vehicle'\n                ) {",
    'Armed Response requirement formatting',
)

# Live exact assignment parser: record people who hold both qualifications.
replace_once(
    "        const trainingCounts = {};\n        let assignedPersonnelCount = 0;",
    "        const trainingCounts = {};\n"
    "        const trainingCombinationCounts = {};\n"
    "        let assignedPersonnelCount = 0;",
    'live training combination accumulator',
)
replace_once(
    "            rowCodes.forEach(code => {\n"
    "                trainingCounts[code] =\n"
    "                    Number(\n"
    "                        trainingCounts[code] ||\n"
    "                        0\n"
    "                    ) + 1;\n"
    "            });",
    "            rowCodes.forEach(code => {\n"
    "                trainingCounts[code] =\n"
    "                    Number(\n"
    "                        trainingCounts[code] ||\n"
    "                        0\n"
    "                    ) + 1;\n"
    "            });\n\n"
    "            const roadsFirearmsKey =\n"
    "                getMissionTrainingCombinationKey([\n"
    "                    'traffic_police',\n"
    "                    'swat'\n"
    "                ]);\n\n"
    "            if (\n"
    "                rowCodes.has('traffic_police') &&\n"
    "                rowCodes.has('swat')\n"
    "            ) {\n"
    "                trainingCombinationCounts[roadsFirearmsKey] =\n"
    "                    Number(\n"
    "                        trainingCombinationCounts[roadsFirearmsKey] ||\n"
    "                        0\n"
    "                    ) + 1;\n"
    "            }",
    'live dual-trained personnel count',
)
replace_once(
    "            vehicleId: currentId,\n            trainingCounts,\n            assignedPersonnelCount,",
    "            vehicleId: currentId,\n"
    "            trainingCounts,\n"
    "            trainingCombinationCounts,\n"
    "            assignedPersonnelCount,",
    'live combination return',
)

# Registry hint scoring for dual-trained ATCs.
replace_once(
    "        const entryTypeId =\n            String(\n                registryEntry.vehicleTypeId ||\n                ''\n            );",
    "        const trainingCombinationCounts =\n"
    "            registryEntry.trainingCombinationCounts &&\n"
    "            typeof registryEntry.trainingCombinationCounts === 'object'\n"
    "                ? registryEntry.trainingCombinationCounts\n"
    "                : {};\n\n"
    "        const entryTypeId =\n            String(\n                registryEntry.vehicleTypeId ||\n                ''\n            );",
    'combination counts in registry hints',
)
armed_hint = r'''
            if (
                requirement?.requirementType ===
                    'armed_response_atc_vehicle'
            ) {
                const combinationKey =
                    getMissionTrainingCombinationKey(
                        requirement.requiredTrainingCodes
                    );

                const qualifiedDualTrainedCount =
                    parseInt(
                        trainingCombinationCounts[combinationKey],
                        10
                    ) || 0;

                if (qualifiedDualTrainedCount >= 2) {
                    return score + 1000 + qualifiedDualTrainedCount;
                }
            }

'''
replace_once(
    "            if (\n                requirement?.requirementType ===\n                    'police_inspector_vehicle'\n            ) {",
    armed_hint + "            if (\n                requirement?.requirementType ===\n                    'police_inspector_vehicle'\n            ) {",
    'Armed Response registry hint',
)

# Preserve combination counts whenever an exact assignment page is cached.
replace_count(
    "                        ...parsed.trainingCounts\n                    },\n                    updatedAt:",
    "                        ...parsed.trainingCounts\n                    },\n"
    "                    trainingCombinationCounts: {\n"
    "                        ...(\n"
    "                            existing.trainingCombinationCounts &&\n"
    "                            typeof existing.trainingCombinationCounts === 'object'\n"
    "                                ? existing.trainingCombinationCounts\n"
    "                                : {}\n"
    "                        ),\n"
    "                        ...parsed.trainingCombinationCounts\n"
    "                    },\n"
    "                    updatedAt:",
    1,
    'strict IRV combination cache',
)
replace_count(
    "                        ...result.parsed.trainingCounts\n                    },\n                    updatedAt:",
    "                        ...result.parsed.trainingCounts\n                    },\n"
    "                    trainingCombinationCounts: {\n"
    "                        ...(\n"
    "                            existing.trainingCombinationCounts &&\n"
    "                            typeof existing.trainingCombinationCounts === 'object'\n"
    "                                ? existing.trainingCombinationCounts\n"
    "                                : {}\n"
    "                        ),\n"
    "                        ...result.parsed.trainingCombinationCounts\n"
    "                    },\n"
    "                    updatedAt:",
    1,
    'ordinary IRV combination cache',
)

# Exact type-25 Armed Traffic Car matching.
armed_vehicle_helper = r'''
    function isArmedTrafficCarVehicleCheckbox(input) {
        if (!input) return false;

        if (getVehicleTypeIdentifiers(input).includes('25')) {
            return true;
        }

        return getExtendedVehicleValues(input).some(value => {
            const cleaned = normaliseVehicleText(value);
            return (
                cleaned === 'armed traffic car' ||
                cleaned === 'armed traffic cars' ||
                cleaned === 'police atc' ||
                cleaned === 'police atcs' ||
                cleaned === 'atc' ||
                cleaned === 'atcs'
            );
        });
    }

'''
replace_once(
    "    function isAtvCarrierRequirement(\n",
    armed_vehicle_helper + "    function isAtvCarrierRequirement(\n",
    'Armed Traffic Car checkbox matcher',
)

armed_refresh = r'''
    async function refreshArmedResponseRegistryFromLiveVehicles(
        requirements,
        source = 'UPDATE'
    ) {
        const armedRequirements = (
            Array.isArray(requirements) ? requirements : []
        ).filter(requirement => {
            return requirement?.requirementType ===
                'armed_response_atc_vehicle';
        });

        if (!armedRequirements.length) {
            return {
                refreshed: false,
                pagesRead: 0,
                qualifyingVehicles: 0
            };
        }

        let registry = readPersonnelTrainingRegistry();
        if (!registry.vehicles) registry.vehicles = {};

        const candidates = sortVehicleCheckboxesByBestArrival(
            getVehicleCheckboxSnapshot().filter(checkbox => {
                return (
                    (!checkbox.disabled || checkbox.checked) &&
                    isArmedTrafficCarVehicleCheckbox(checkbox) &&
                    !!getMissionVehicleId(checkbox)
                );
            })
        );

        const orderedCandidates = orderStrictPoliceTrainingCandidates(
            candidates,
            armedRequirements,
            registry
        );
        const verifiedIds = new Set();
        const now = Date.now();

        orderedCandidates.forEach(checkbox => {
            const vehicleId = getMissionVehicleId(checkbox);
            const entry = registry.vehicles?.[vehicleId];
            const cachedAt = Number(
                mfLiveTrainingVerifyCache.get(vehicleId) || 0
            );

            if (
                vehicleId &&
                String(entry?.vehicleTypeId || '') === '25' &&
                isAuthoritativeLivePoliceTrainingEntry(entry) &&
                now - cachedAt <= MF_LIVE_TRAINING_VERIFY_CACHE_MS
            ) {
                verifiedIds.add(vehicleId);
            }
        });

        const requirementsSatisfiedByVerified = () => {
            const verifiedCheckboxes = orderedCandidates.filter(checkbox => {
                return verifiedIds.has(getMissionVehicleId(checkbox));
            });

            return getRemainingTrainedPersonnelRequirements(
                armedRequirements,
                verifiedCheckboxes,
                registry
            ).every(requirement => requirement.remaining <= 0);
        };

        if (requirementsSatisfiedByVerified()) {
            return {
                refreshed: false,
                pagesRead: 0,
                qualifyingVehicles: verifiedIds.size
            };
        }

        const unverified = orderedCandidates.filter(checkbox => {
            const vehicleId = getMissionVehicleId(checkbox);
            return vehicleId && !verifiedIds.has(vehicleId);
        });

        const hinted = unverified.filter(checkbox => {
            const entry = getRegistryEntryForMissionCheckbox(
                checkbox,
                registry
            ).entry;
            return getUnverifiedRegistryTrainingHintScore(
                armedRequirements,
                entry
            ) > 0;
        });
        const hintedSet = new Set(hinted);
        const pagesToRead = [
            ...hinted,
            ...unverified.filter(checkbox => !hintedSet.has(checkbox))
        ].slice(0, MF_LIVE_TRAINING_VERIFY_MAX_PAGES);

        let pagesRead = 0;
        let changed = false;

        for (
            let offset = 0;
            offset < pagesToRead.length;
            offset += MF_LIVE_TRAINING_VERIFY_BATCH_SIZE
        ) {
            const batch = pagesToRead.slice(
                offset,
                offset + MF_LIVE_TRAINING_VERIFY_BATCH_SIZE
            );

            const results = await Promise.all(
                batch.map(async checkbox => {
                    const vehicleId = getMissionVehicleId(checkbox);
                    try {
                        const response = await fetch(
                            `/vehicles/${vehicleId}/zuweisung`,
                            {
                                credentials: 'include',
                                cache: 'no-store',
                                headers: {
                                    Accept: 'text/html,application/xhtml+xml'
                                }
                            }
                        );
                        if (!response.ok) return null;
                        return {
                            checkbox,
                            vehicleId,
                            parsed: parseLivePoliceTrainingAssignments(
                                await response.text(),
                                vehicleId
                            )
                        };
                    } catch (_error) {
                        return null;
                    }
                })
            );

            results
                .filter(result => result?.parsed?.assignmentScanComplete)
                .forEach(result => {
                    const existing = registry.vehicles?.[result.vehicleId] || {};
                    registry.vehicles[result.vehicleId] = {
                        ...existing,
                        vehicleId: result.vehicleId,
                        vehicleName:
                            existing.vehicleName ||
                            getVehicleDebugName(result.checkbox),
                        vehicleTypeId: '25',
                        assignedPersonnelCount:
                            result.parsed.assignedPersonnelCount,
                        assignmentScanComplete:
                            result.parsed.assignmentScanComplete,
                        personnelRowsSeen:
                            result.parsed.personnelRowsSeen,
                        trainingCounts: {
                            ...(
                                existing.trainingCounts &&
                                typeof existing.trainingCounts === 'object'
                                    ? existing.trainingCounts
                                    : {}
                            ),
                            ...result.parsed.trainingCounts
                        },
                        trainingCombinationCounts: {
                            ...(
                                existing.trainingCombinationCounts &&
                                typeof existing.trainingCombinationCounts === 'object'
                                    ? existing.trainingCombinationCounts
                                    : {}
                            ),
                            ...result.parsed.trainingCombinationCounts
                        },
                        updatedAt: Date.now(),
                        source:
                            `${MF_STRICT_TRAINING_SOURCE_PREFIX}armed-response-${String(source || 'update').toLowerCase()}-v10673`
                    };

                    mfLiveTrainingVerifyCache.set(
                        result.vehicleId,
                        Date.now()
                    );
                    verifiedIds.add(result.vehicleId);
                    pagesRead += 1;
                    changed = true;
                });

            if (changed) savePersonnelTrainingRegistry(registry);
            if (requirementsSatisfiedByVerified()) break;
        }

        return {
            refreshed: changed,
            pagesRead,
            qualifyingVehicles: verifiedIds.size
        };
    }

'''
replace_once(
    "    function getOrdinaryPoliceVehicleRequirementCount(\n",
    armed_refresh + "    function getOrdinaryPoliceVehicleRequirementCount(\n",
    'live Armed Response verifier',
)

sub_once(
    r"    async function prepareTrainedPersonnelRegistryForRows\(\n        rows,\n        source = 'UPDATE'\n    \) \{.*?\n    \}\n\n    async function preparePoliceVehicleSafetyForRows\(",
    r'''    async function prepareTrainedPersonnelRegistryForRows(
        rows,
        source = 'UPDATE'
    ) {
        const requirements = [];

        (Array.isArray(rows) ? rows : []).forEach(row => {
            if (!row?.isTrainedPersonnelRequirement) return;
            (row.personnelTrainingRequirements || []).forEach(requirement => {
                requirements.push(requirement);
            });
        });

        const irvRequirements = requirements.filter(requirement => {
            return requirement?.requirementType !==
                'armed_response_atc_vehicle';
        });

        const armedResponseRequirements = requirements.filter(requirement => {
            return requirement?.requirementType ===
                'armed_response_atc_vehicle';
        });

        const irv = await refreshPoliceInspectorRegistryFromLiveVehicles(
            irvRequirements,
            source
        );
        const armedResponse = await refreshArmedResponseRegistryFromLiveVehicles(
            armedResponseRequirements,
            source
        );

        return {
            irv,
            armedResponse
        };
    }

    async function preparePoliceVehicleSafetyForRows(''',
    'prepare both IRV and Armed Response registries',
    re.S,
)

# ---------------------------------------------------------------------------
# Mission Update table recognition for Armed Response
# ---------------------------------------------------------------------------
replace_once(
    "        let tableRailwayPoliceRequired =\n            0;",
    "        let tableRailwayPoliceRequired =\n            0;\n\n"
    "        let tableArmedResponseRequired =\n            0;",
    'Armed Response update-table state',
)
armed_table_capture = r'''
                if (
                    isArmedResponsePersonnelRequirementName(
                        cleanedName
                    )
                ) {
                    tableArmedResponseRequired = Math.max(
                        tableArmedResponseRequired,
                        needed
                    );

                    if (mfDebugEnabled && !silent) {
                        debugLog(
                            'ARMED RESPONSE TABLE COLLAPSE',
                            `Armed Response Personnel x${needed} captured from ${source}; selecting exact type-25 ATCs with 2 officers who each hold traffic_police + swat.`
                        );
                    }

                    return;
                }

'''
replace_once(
    "                missingRows.push({\n                    unitName:\n                        cleanedName,",
    armed_table_capture + "                missingRows.push({\n                    unitName:\n                        cleanedName,",
    'Armed Response live-table conversion',
)
replace_once(
    "            tableRailwayPoliceRequired >\n                0\n        ) {",
    "            tableRailwayPoliceRequired >\n                0 ||\n"
    "            tableArmedResponseRequired >\n                0\n        ) {",
    'Armed Response table merge condition',
)
replace_once(
    "                    {\n                        code:\n                            'railway_police',\n"
    "                        label:\n                            'Railway Police Officer',\n"
    "                        required:\n                            tableRailwayPoliceRequired\n"
    "                    }\n                ])",
    "                    {\n                        code:\n                            'railway_police',\n"
    "                        label:\n                            'Railway Police Officer',\n"
    "                        required:\n                            tableRailwayPoliceRequired\n"
    "                    },\n"
    "                    {\n                        code:\n                            'armed_response_personnel',\n"
    "                        label:\n                            'Armed Response Personnel',\n"
    "                        required:\n                            tableArmedResponseRequired\n"
    "                    }\n                ])",
    'Armed Response table requirement object',
)

# ---------------------------------------------------------------------------
# Police Officer upgrade conversion shared by Unit Finder, Update and Auto
# ---------------------------------------------------------------------------
police_officer_helpers = r'''
    function getPoliceOfficerVehicleRequirement(
        requirementName,
        personnelRequired
    ) {
        const cleaned = String(requirementName || '')
            .replace(/\s+/g, ' ')
            .trim();
        const required = Math.max(
            0,
            parseInt(personnelRequired, 10) || 0
        );

        if (
            required <= 0 ||
            !/^(?:Required\s+)?Police\s+Officer(?:s)?$/i.test(cleaned)
        ) {
            return null;
        }

        return {
            unitName: 'Police Car',
            stillNeeded: Math.ceil(required / 2),
            personnelRequired: required,
            personnelPerVehicle: 2
        };
    }

    function normaliseOperationalRequirementRows(rows) {
        return (Array.isArray(rows) ? rows : []).map(row => {
            if (!row || row.isTrainedPersonnelRequirement) return row;

            const conversion = getPoliceOfficerVehicleRequirement(
                row.unitName,
                row.stillNeeded
            );

            if (!conversion) return row;

            return {
                ...row,
                unitName: conversion.unitName,
                stillNeeded: conversion.stillNeeded,
                personnelRequirement:
                    `${conversion.personnelRequired} Police Officer${conversion.personnelRequired === 1 ? '' : 's'}`,
                personnelPerVehicle: conversion.personnelPerVehicle,
                convertedFromPersonnelRequirement: true
            };
        });
    }

'''
replace_once(
    "    function getSupportedMissingPersonnelRowsFromText(\n",
    police_officer_helpers + "    function getSupportedMissingPersonnelRowsFromText(\n",
    'shared Police Officer vehicle conversion',
)
replace_once(
    "    async function processRequirementRows(requirementRows, sourceLabel) {\n"
    "        let missingUnits = [];\n"
    "        const trainedPersonnelMissing = [];\n\n"
    "        updateStatusBox(`Processing ${sourceLabel} requirements...`);",
    "    async function processRequirementRows(requirementRows, sourceLabel) {\n"
    "        let missingUnits = [];\n"
    "        const trainedPersonnelMissing = [];\n\n"
    "        requirementRows = normaliseOperationalRequirementRows(\n"
    "            requirementRows\n"
    "        );\n\n"
    "        updateStatusBox(`Processing ${sourceLabel} requirements...`);",
    'normalise Police Officers before safety and selection',
)

# ---------------------------------------------------------------------------
# Strict Seagoing Vessel -> ALB/ABL selection and reconciliation
# ---------------------------------------------------------------------------
seagoing_helpers = r'''
    function isSeagoingVesselRequirement(originalName, mappedName) {
        const raw = normaliseVehicleText(originalName);
        const mapped = normaliseVehicleText(mappedName);
        const names = new Set([
            'seagoing vessel',
            'seagoing vessels',
            'required seagoing vessel',
            'required seagoing vessels',
            'alb',
            'albs',
            'abl',
            'abls',
            'all weather lifeboat',
            'all weather lifeboats',
            'all-weather lifeboat',
            'all-weather lifeboats'
        ]);
        return names.has(raw) || names.has(mapped);
    }

    function isSeagoingVesselCheckbox(input) {
        if (!input) return false;

        const accepted = new Set([
            'alb',
            'albs',
            'abl',
            'abls',
            'all weather lifeboat',
            'all weather lifeboats',
            'all-weather lifeboat',
            'all-weather lifeboats',
            'seagoing vessel',
            'seagoing vessels'
        ]);

        return getExtendedVehicleValues(input).some(value => {
            return accepted.has(normaliseVehicleText(value));
        });
    }

'''
replace_once(
    "    function isArmedTrafficCarVehicleCheckbox(input) {",
    seagoing_helpers + "    function isArmedTrafficCarVehicleCheckbox(input) {",
    'strict Seagoing Vessel helpers',
)
replace_once(
    "        const atvCarrierOnly =\n            isAtvCarrierRequirement(\n                originalName,\n                mappedName\n            );",
    "        const atvCarrierOnly =\n            isAtvCarrierRequirement(\n                originalName,\n                mappedName\n            );\n\n"
    "        const seagoingVesselOnly =\n            isSeagoingVesselRequirement(\n                originalName,\n                mappedName\n            );",
    'Seagoing matcher declaration',
)
seagoing_all_branch = r'''
        if (seagoingVesselOnly) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => {
                    if (input.disabled) return false;
                    if (!includeChecked && input.checked) return false;
                    return isSeagoingVesselCheckbox(input);
                })
            );
        }

'''
replace_once(
    "        if (atvCarrierOnly) {\n",
    seagoing_all_branch + "        if (atvCarrierOnly) {\n",
    'Seagoing strict selection branch',
)
replace_once(
    "        const atvCarrierOnly = isAtvCarrierRequirement(originalName, mappedName);",
    "        const atvCarrierOnly = isAtvCarrierRequirement(originalName, mappedName);\n"
    "        const seagoingVesselOnly = isSeagoingVesselRequirement(originalName, mappedName);",
    'Seagoing count declaration',
)
replace_once(
    "            if (atvCarrierOnly) {\n"
    "                matches = isAtvCarrierCheckbox(\n"
    "                    input\n"
    "                );",
    "            if (seagoingVesselOnly) {\n"
    "                matches = isSeagoingVesselCheckbox(\n"
    "                    input\n"
    "                );\n"
    "            } else if (atvCarrierOnly) {\n"
    "                matches = isAtvCarrierCheckbox(\n"
    "                    input\n"
    "                );",
    'Seagoing selected-count reconciliation',
)
seagoing_find_branch = r'''
        if (
            isSeagoingVesselRequirement(
                requestedName,
                mappedName
            )
        ) {
            return getVehicleCheckboxSnapshot(true).find(input => {
                return (
                    !input.disabled &&
                    !input.checked &&
                    isSeagoingVesselCheckbox(input)
                );
            }) || null;
        }

'''
replace_once(
    "        if (\n            isDogSupportUnitRequirement(\n",
    seagoing_find_branch + "        if (\n            isDogSupportUnitRequirement(\n",
    'Seagoing strict fallback selector',
)

# Update strict source suffixes to the new Mission Finder baseline.
source = source.replace('-v10672`', '-v10673`')

SOURCE_PATH.write_text(source, encoding='utf-8', newline='\n')

# ---------------------------------------------------------------------------
# Release documentation
# ---------------------------------------------------------------------------
readme = README_PATH.read_text(encoding='utf-8')
if readme.count('**Current version:** `1.0.5`') != 1:
    raise SystemExit('README current version anchor changed')
readme = readme.replace('**Current version:** `1.0.5`', '**Current version:** `1.0.6`', 1)
README_PATH.write_text(readme, encoding='utf-8', newline='\n')

src_readme = SRC_README_PATH.read_text(encoding='utf-8')
for old, new, label in [
    ('| Command Nexus version | `1.0.5` |', '| Command Nexus version | `1.0.6` |', 'source README Command Nexus'),
    ('| Mission Finder baseline | `V10.6.72` |', '| Mission Finder baseline | `V10.6.73` |', 'source README Mission Finder'),
]:
    if src_readme.count(old) != 1:
        raise SystemExit(f'{label} anchor changed')
    src_readme = src_readme.replace(old, new, 1)
SRC_README_PATH.write_text(src_readme, encoding='utf-8', newline='\n')

changelog = CHANGELOG_PATH.read_text(encoding='utf-8')
anchor = '## [1.0.5] - 2026-07-20\n'
if changelog.count(anchor) != 1:
    raise SystemExit('CHANGELOG v1.0.5 anchor changed')
release_notes = '''## [1.0.6] - 2026-07-20

### Added

- Added exact Armed Response mission matching for `Required Armed Response Personnel (In Armed Vehicles)`, using type-25 Armed Traffic Cars with two personnel who each hold both Roads Policing and Firearms.
- Expanded the one-click Personnel Register builder to every station type and every discovered vehicle, reading each vehicle's own assignment page before recording trained personnel.
- Added strict Seagoing Vessel matching for ALB/ABL and All-weather Lifeboat display variants.

### Changed

- Changed the Medical Critical Care assignment target from two trained personnel to one trained person per normal Ambulance, including Preview, Live, target planning, shortfall and reporting calculations.
- Police Officer mission-upgrade rows now convert at two officers per normal Police IRV before Unit Finder, Mission Update or Auto Mode selects vehicles.
- Mission Finder baseline increased from `V10.6.72` to `V10.6.73`; Personnel Assignment increased from `1.2.8` to `1.2.9`.

### Fixed

- Fixed issue #42 by stopping the Personnel Assignment Tool from planning or assigning a second unnecessary Critical Care-trained person to each Ambulance.
- Fixed issue #30 by restoring Armed Response Personnel selection through dual-trained Armed Traffic Cars without excluding officers who also hold Firearms training.
- Fixed live upgrade rows such as `Police Officers x8` selecting eight IRVs instead of four.
- Fixed Seagoing Vessel upgrade rows falling through generic text matching instead of selecting an exact ALB/ABL vehicle.
- Fixed the register builder copying a single vehicle-page snapshot across a station instead of recording exact vehicle assignments.

'''
changelog = changelog.replace(anchor, release_notes + anchor, 1)
CHANGELOG_PATH.write_text(changelog, encoding='utf-8', newline='\n')

print('v1.0.6 deterministic patch applied successfully')
