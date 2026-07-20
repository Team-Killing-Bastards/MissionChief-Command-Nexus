from pathlib import Path

SOURCE = Path("src/missionchief-command-nexus.user.js")
README = Path("README.md")
SRC_README = Path("src/README.md")
CHANGELOG = Path("CHANGELOG.md")

text = SOURCE.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)


def replace_count(old: str, new: str, expected: int, label: str) -> None:
    global text
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{label}: expected {expected} matches, found {count}")
    text = text.replace(old, new)


replace_once("// @version      1.0.4", "// @version      1.0.5", "userscript version")
replace_once("const PERSONNEL_VERSION = '1.2.7';", "const PERSONNEL_VERSION = '1.2.8';", "personnel version")
replace_once(
    "* MODULE 2: MISSION FINDER V10.6.71",
    "* MODULE 2: MISSION FINDER V10.6.72",
    "Mission Finder module version",
)

replace_once(
    """    // V10.6.71: Normal Police Car/Police Officer requirements now protect
    // exact-ID IRVs carrying specialist-trained staff, live-verify ordinary IRVs
    // before selection, and exclude known trained IRVs from ordinary attendance.
    // Auto Mode now waits for a complete, non-zero, ID-stable vehicle list with
    // no remaining load control or spinner before Unit Finder may select units.
""",
    """    // V10.6.71: Normal Police Car/Police Officer requirements now protect
    // exact-ID IRVs carrying specialist-trained staff, live-verify ordinary IRVs
    // before selection, and exclude known trained IRVs from ordinary attendance.
    // Auto Mode now waits for a complete, non-zero, ID-stable vehicle list with
    // no remaining load control or spinner before Unit Finder may select units.
    // V10.6.72: Exact assignment-page scans no longer require a permanent binding
    // before an untrained IRV may satisfy ordinary Police attendance. Police Medic
    // and Railway Police Officer requirements now use exact trained IRVs with two
    // qualified personnel, and ATV Carrier uses an authoritative type-30 matcher.
""",
    "Mission Finder release comment",
)

replace_once(
    """        action: 'preview',
        configuredUnitsRequired: 0,
""",
    """        action: 'preview',
        registerBuilding: false,
        configuredUnitsRequired: 0,
""",
    "personnel state register flag",
)

replace_once(
    """                    <button id="mc-personnel-refresh">Refresh Stations</button>
                    <button id="mc-personnel-start">Start</button>
""",
    """                    <button id="mc-personnel-refresh">Refresh Stations</button>
                    <button id="mc-personnel-build-register" title="Scan every Police, Aviation and EOD station and rebuild the exact vehicle training register without changing any personnel assignments.">Build Personnel Register</button>
                    <button id="mc-personnel-start">Start</button>
""",
    "personnel register button",
)

replace_once(
    """        document.querySelector('#mc-personnel-refresh').onclick = refreshPersonnelStations;
        document.querySelector('#mc-personnel-start').onclick = startPersonnelRun;
""",
    """        document.querySelector('#mc-personnel-refresh').onclick = refreshPersonnelStations;
        document.querySelector('#mc-personnel-build-register').onclick = buildPersonnelTrainingRegisterOneClick;
        document.querySelector('#mc-personnel-start').onclick = startPersonnelRun;
""",
    "personnel register event",
)

register_builder = r"""
    async function buildPersonnelTrainingRegisterOneClick() {
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

        const stationTypes =
            new Set([
                'POLICE',
                'AIR',
                'EOD'
            ]);

        const stations =
            Array.from(
                document.querySelectorAll(
                    'a.lightbox-open.list-group-item.active[href^="/buildings/"]'
                )
            )
                .map((link, index) => {
                    const displayName =
                        cleanText(link.textContent);

                    const href =
                        link.getAttribute('href') ||
                        '';

                    const container =
                        link.closest(
                            '.building_list_li[building_type_id], .building_list[building_type_id]'
                        );

                    const rawTypeId =
                        container?.getAttribute(
                            'building_type_id'
                        ) ?? '';

                    const buildingTypeId =
                        rawTypeId === ''
                            ? null
                            : Number(rawTypeId);

                    const stationType =
                        STATION_BUILDING_TYPE_INFO[
                            buildingTypeId
                        ]?.stationType ||
                        detectStationType(
                            displayName
                        );

                    return {
                        index,
                        href,
                        buildingId:
                            getBuildingIdFromHref(
                                href
                            ),
                        displayName,
                        buildingTypeId,
                        stationType
                    };
                })
                .filter(station => {
                    return !!(
                        station.href &&
                        station.buildingId &&
                        stationTypes.has(
                            station.stationType
                        )
                    );
                });

        if (!stations.length) {
            personnelLog(
                'No Police, Police Aviation or EOD stations were found on the current station overview.',
                'error'
            );
            setPersonnelUiValue(
                'status',
                'No register stations found'
            );
            return;
        }

        const vehicleTypeIds =
            Array.from(
                new Set([
                    '8',
                    ...POLICE_ALL_RULES
                        .flatMap(rule => {
                            return (
                                Array.isArray(
                                    rule?.vehicleTypeIds
                                )
                                    ? rule.vehicleTypeIds
                                    : []
                            );
                        })
                        .map(String)
                ])
            );

        const button =
            document.querySelector(
                '#mc-personnel-build-register'
            );

        const previousAction =
            PERSONNEL_STATE.action;

        PERSONNEL_STATE.running = true;
        PERSONNEL_STATE.registerBuilding = true;
        PERSONNEL_STATE.paused = false;
        PERSONNEL_STATE.stopped = false;
        PERSONNEL_STATE.action = 'preview';
        PERSONNEL_STATE.activeController = null;
        PERSONNEL_STATE.lastRequestAt = 0;

        if (button) {
            button.disabled = true;
            button.textContent =
                'Building Register...';
        }

        document.querySelector(
            '#mc-personnel-pause'
        ).textContent = 'Pause';

        setPersonnelUiValue(
            'status',
            'Building personnel register'
        );

        setPersonnelUiValue(
            'progress',
            `0 / ${stations.length}`
        );

        setPersonnelUiValue(
            'vehicle',
            'None'
        );

        personnelLog(
            `One-click register build started for ${stations.length} Police, Aviation and EOD station(s). No personnel assignments will be changed.`,
            'info'
        );

        let completedStations = 0;
        let scannedVehicles = 0;
        let skippedStations = 0;
        let failedStations = 0;

        try {
            for (
                let stationIndex = 0;
                stationIndex < stations.length;
                stationIndex++
            ) {
                if (PERSONNEL_STATE.stopped) {
                    break;
                }

                await waitIfPersonnelPaused();

                if (PERSONNEL_STATE.stopped) {
                    break;
                }

                const station =
                    stations[stationIndex];

                setPersonnelUiValue(
                    'progress',
                    `${stationIndex + 1} / ${stations.length}`
                );

                setPersonnelUiValue(
                    'current',
                    station.displayName
                );

                setPersonnelUiValue(
                    'vehicle',
                    'Reading station vehicles'
                );

                setPersonnelUiValue(
                    'status',
                    'Scanning register station'
                );

                personnelLog(
                    `Register station ${stationIndex + 1}/${stations.length}: ${station.displayName}`,
                    'station'
                );

                try {
                    const stationPage =
                        await personnelFetchDocument(
                            station.href,
                            14000
                        );

                    const vehicles =
                        getPersonnelVehicleQueue(
                            stationPage.doc,
                            vehicleTypeIds
                        );

                    if (!vehicles.length) {
                        skippedStations++;
                        personnelLog(
                            'No mapped Police vehicles found at this station.',
                            'debug'
                        );
                        continue;
                    }

                    setPersonnelUiValue(
                        'vehicle',
                        vehicles[0].name ||
                            vehicles[0].vehicleId
                    );

                    const assignmentPage =
                        await personnelFetchDocument(
                            vehicles[0]
                                .assignmentHref,
                            14000
                        );

                    const assignment =
                        parseVehicleAssignmentPage(
                            assignmentPage.doc,
                            vehicles[0]
                                .vehicleId
                        );

                    const published =
                        publishPersonnelVehicleTrainingRegistry({
                            station,
                            vehicles,
                            personnel:
                                assignment.rows,
                            source:
                                'one-click-register-scan'
                        });

                    scannedVehicles +=
                        Number(published || 0);

                    completedStations++;

                    personnelLog(
                        `Register updated for ${published} vehicle(s).`,
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

            const saveResult =
                flushPersonnelTrainingRegistry(
                    false
                );

            const stopped =
                PERSONNEL_STATE.stopped;

            const summary = [
                'PERSONNEL TRAINING REGISTER BUILD',
                '',
                `Status: ${stopped ? 'STOPPED' : 'COMPLETE'}`,
                `Stations scanned: ${completedStations}`,
                `Stations without mapped vehicles: ${skippedStations}`,
                `Stations failed: ${failedStations}`,
                `Exact vehicles registered: ${scannedVehicles}`,
                `Registry retained: ${Number(saveResult?.retained || 0)}`,
                '',
                'No personnel assignments were changed.'
            ].join('\n');

            PERSONNEL_STATE.currentReport =
                summary;

            renderPersonnelReport(
                summary
            );

            setPersonnelUiValue(
                'completed',
                completedStations
            );

            setPersonnelUiValue(
                'vehicles',
                scannedVehicles
            );

            setPersonnelUiValue(
                'assigned',
                0
            );

            setPersonnelUiValue(
                'status',
                stopped
                    ? 'Register build stopped'
                    : 'Personnel register ready'
            );

            personnelLog(
                stopped
                    ? `Register build stopped after ${completedStations} station(s) and ${scannedVehicles} vehicle(s).`
                    : `Personnel register complete: ${completedStations} station(s), ${scannedVehicles} exact vehicle(s), no staffing changes.`,
                stopped
                    ? 'error'
                    : 'done'
            );
        } finally {
            flushPersonnelTrainingRegistry(
                true
            );

            PERSONNEL_STATE.running = false;
            PERSONNEL_STATE.registerBuilding = false;
            PERSONNEL_STATE.paused = false;
            PERSONNEL_STATE.action =
                previousAction;
            PERSONNEL_STATE.activeController =
                null;

            if (button) {
                button.disabled = false;
                button.textContent =
                    'Build Personnel Register';
            }

            document.querySelector(
                '#mc-personnel-pause'
            ).textContent = 'Pause';
        }
    }

"""

replace_once(
    "    function startPersonnelRun() {\n",
    register_builder + "    function startPersonnelRun() {\n",
    "one-click personnel register builder",
)

replace_once(
    """        "ATV Carrier": "ATV Carrier",
""",
    """        "ATV Carrier": "ATV Carrier",
        "ATV Carriers": "ATV Carrier",
        "ATC Carrier": "ATV Carrier",
        "ATC Carriers": "ATV Carrier",
""",
    "ATV cross references",
)

atv_helpers = r"""
    function isAtvCarrierRequirement(
        originalName,
        mappedName
    ) {
        const raw =
            normaliseVehicleText(
                originalName
            );

        const mapped =
            normaliseVehicleText(
                mappedName
            );

        return (
            raw === 'atv carrier' ||
            raw === 'atv carriers' ||
            raw === 'atc carrier' ||
            raw === 'atc carriers' ||
            mapped === 'atv carrier' ||
            mapped === 'atv carriers' ||
            mapped === 'atc carrier' ||
            mapped === 'atc carriers'
        );
    }

    function isAtvCarrierCheckbox(
        input
    ) {
        if (!input) return false;

        // MissionChief UK ATV Carrier / ATV vehicle type.
        if (
            getVehicleTypeIdentifiers(
                input
            ).includes('30')
        ) {
            return true;
        }

        return getExtendedVehicleValues(
            input
        ).some(value => {
            const cleaned =
                normaliseVehicleText(
                    value
                );

            return (
                cleaned === 'atv' ||
                cleaned === 'atv carrier' ||
                cleaned === 'atv carriers' ||
                cleaned === 'atc carrier' ||
                cleaned === 'atc carriers'
            );
        });
    }

"""

replace_once(
    "    function isDogSupportUnitRequirement(\n",
    atv_helpers + "    function isDogSupportUnitRequirement(\n",
    "ATV helper functions",
)

replace_once(
    """        if (lowerMapped === 'police car' || lowerRaw.includes('police car')) {
            add('Police Car');
            add('Police Cars');
        }

""",
    """        if (lowerMapped === 'police car' || lowerRaw.includes('police car')) {
            add('Police Car');
            add('Police Cars');
        }

        if (
            isAtvCarrierRequirement(
                originalName,
                mappedName
            )
        ) {
            add('ATV');
            add('ATV Carrier');
            add('ATV Carriers');
            add('ATC Carrier');
            add('ATC Carriers');
        }

""",
    "ATV candidate aliases",
)

replace_once(
    """        const dogSupportOnly =
            isDogSupportUnitRequirement(
                originalName,
                mappedName
            );

""",
    """        const atvCarrierOnly =
            isAtvCarrierRequirement(
                originalName,
                mappedName
            );

        const dogSupportOnly =
            isDogSupportUnitRequirement(
                originalName,
                mappedName
            );

""",
    "ATV getAll flag",
)

replace_once(
    """        if (dogSupportOnly) {
            return sortVehicleCheckboxesByBestArrival(
""",
    """        if (atvCarrierOnly) {
            return sortVehicleCheckboxesByBestArrival(
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

                    return isAtvCarrierCheckbox(
                        input
                    );
                })
            );
        }

        if (dogSupportOnly) {
            return sortVehicleCheckboxesByBestArrival(
""",
    "ATV getAll matcher",
)

replace_once(
    """        const policeCarOnly = isPoliceCarRequirement(originalName, mappedName);
        const dogSupportOnly = isDogSupportUnitRequirement(originalName, mappedName);
""",
    """        const policeCarOnly = isPoliceCarRequirement(originalName, mappedName);
        const atvCarrierOnly = isAtvCarrierRequirement(originalName, mappedName);
        const dogSupportOnly = isDogSupportUnitRequirement(originalName, mappedName);
""",
    "ATV count flag",
)

replace_once(
    """            if (dogSupportOnly) {
                matches = isDogSupportUnitCheckbox(
                    input
                );
""",
    """            if (atvCarrierOnly) {
                matches = isAtvCarrierCheckbox(
                    input
                );
            } else if (dogSupportOnly) {
                matches = isDogSupportUnitCheckbox(
                    input
                );
""",
    "ATV selected matcher",
)

replace_once(
    """            {
                code:
                    'police_medic',
                label:
                    'Police Medic',
                patterns: [
                    /(\d+)\s*(?:x\s*)?Police\s+Medic(?:s)?/gi
                ]
            }
        ]);
""",
    """            {
                code:
                    'police_medic',
                label:
                    'Police Medic',
                patterns: [
                    /(\d+)\s*(?:x\s*)?Police\s+Medic(?:s)?/gi,
                    /Police\s+Medic(?:s)?\s*(?:x\s*)?(\d+)/gi
                ]
            },
            {
                code:
                    'railway_police',
                label:
                    'Railway Police Officer',
                patterns: [
                    /(\d+)\s*(?:x\s*)?Railway\s+Police\s+Officer(?:s)?/gi,
                    /Railway\s+Police\s+Officer(?:s)?\s*(?:x\s*)?(\d+)/gi
                ]
            }
        ]);
""",
    "Police Medic and Railway text patterns",
)

trained_name_helpers = r"""
    function isPoliceMedicPersonnelRequirementName(
        value
    ) {
        const cleaned =
            String(
                value ||
                ''
            )
                .replace(
                    /\s+/g,
                    ' '
                )
                .trim();

        return /^(?:Required\s+)?Police\s+Medic(?:s)?$/i
            .test(
                cleaned
            );
    }

    function isRailwayPolicePersonnelRequirementName(
        value
    ) {
        const cleaned =
            String(
                value ||
                ''
            )
                .replace(
                    /\s+/g,
                    ' '
                )
                .trim();

        return /^(?:Required\s+)?Railway\s+Police\s+Officer(?:s)?$/i
            .test(
                cleaned
            );
    }

"""

replace_once(
    "    function getSupportedTrainedPersonnelRequirementsFromText(\n",
    trained_name_helpers + "    function getSupportedTrainedPersonnelRequirementsFromText(\n",
    "Police Medic and Railway name helpers",
)

replace_once(
    """        const policeInspectorRequired =
            findRequired('police_inspector');

        const activePublicOrderTrainingCodes = [];
""",
    """        const policeInspectorRequired =
            findRequired('police_inspector');

        const policeMedicRequired =
            findRequired('police_medic');

        const railwayPoliceRequired =
            findRequired('railway_police');

        const activePublicOrderTrainingCodes = [];
""",
    "trained counts",
)

replace_once(
    """                    requirement.code !==
                        'police_inspector'
                );
""",
    """                    requirement.code !==
                        'police_inspector' &&
                    requirement.code !==
                        'police_medic' &&
                    requirement.code !==
                        'railway_police'
                );
""",
    "remove strict individual codes from generic requirements",
)

strict_irv_normalisation = r"""
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

"""

replace_once(
    """        return normalised;
    }


    function isStrictLiveVerifiedTrainingEntry(
""",
    strict_irv_normalisation + """        return normalised;
    }


    function isStrictLiveVerifiedTrainingEntry(
""",
    "strict medic and railway IRV normalisation",
)

authoritative_helper = r"""
    function isAuthoritativeLivePoliceTrainingEntry(
        registryEntry
    ) {
        return !!(
            isStrictLiveVerifiedTrainingEntry(
                registryEntry
            ) &&
            registryEntry
                .assignmentScanComplete ===
                true
        );
    }


"""

replace_once(
    "    function getProtectedOrdinaryIrvTrainingCount(\n",
    authoritative_helper + "    function getProtectedOrdinaryIrvTrainingCount(\n",
    "authoritative assignment scan helper",
)

replace_once(
    """            (!vehicleTypeId || vehicleTypeId === '8') &&
            isStrictLiveVerifiedTrainingEntry(registryEntry) &&
            Number(registryEntry.assignedPersonnelCount || 0) > 0 &&
            getProtectedOrdinaryIrvTrainingCount(
""",
    """            (!vehicleTypeId || vehicleTypeId === '8') &&
            isAuthoritativeLivePoliceTrainingEntry(registryEntry) &&
            getProtectedOrdinaryIrvTrainingCount(
""",
    "ordinary IRV no-binding regression",
)

replace_once(
    """        const trainingCounts = {};
        let assignedPersonnelCount = 0;

        const detectedVehicleTypeId =
""",
    """        const trainingCounts = {};
        let assignedPersonnelCount = 0;

        const personnelTable =
            doc.querySelector(
                '#personal_table'
            );

        const personnelRows =
            personnelTable
                ? Array.from(
                    personnelTable.querySelectorAll(
                        'tbody tr[data-filterable-by], tbody tr'
                    )
                )
                : [];

        const detectedVehicleTypeId =
""",
    "assignment page evidence",
)

replace_once(
    """        Array.from(
            doc.querySelectorAll(
                '#personal_table tbody tr[data-filterable-by], #personal_table tbody tr'
            )
        ).forEach(row => {
""",
    """        personnelRows.forEach(row => {
""",
    "assignment parser rows",
)

replace_once(
    """            if (/\\bPolice\\s+Inspector\\b/i.test(rowText)) {
                rowCodes.add('police_inspector');
            }

            rowCodes.forEach(code => {
""",
    """            if (/\\bPolice\\s+Inspector\\b/i.test(rowText)) {
                rowCodes.add('police_inspector');
            }

            if (
                /\\bRailway\\s+Police\\s+Officer\\b/i.test(
                    rowText
                ) ||
                /\\bRailway\\s+Policing\\b/i.test(
                    rowText
                )
            ) {
                rowCodes.add('railway_police');
            }

            rowCodes.forEach(code => {
""",
    "Railway assignment text detection",
)

replace_once(
    """            assignedPersonnelCount,
            detectedVehicleTypeId,
            document: doc
""",
    """            assignedPersonnelCount,
            assignmentScanComplete:
                Boolean(personnelTable),
            personnelRowsSeen:
                personnelRows.length,
            detectedVehicleTypeId,
            document: doc
""",
    "assignment parser evidence return",
)

replace_count(
    "isStrictLiveVerifiedTrainingEntry(entry) &&",
    "isAuthoritativeLivePoliceTrainingEntry(entry) &&",
    2,
    "fresh exact training cache checks",
)

replace_once(
    """                return !isStrictLiveVerifiedTrainingEntry(
                    registryMatch.entry
                );
""",
    """                return !isAuthoritativeLivePoliceTrainingEntry(
                    registryMatch.entry
                );
""",
    "checked ordinary verification",
)

replace_count(
    "results.filter(Boolean).forEach(result => {",
    "results.filter(result => result?.parsed?.assignmentScanComplete).forEach(result => {",
    2,
    "reject incomplete assignment page parses",
)

replace_once(
    """                    assignedPersonnelCount:
                        parsed.assignedPersonnelCount,
                    trainingCounts: {
""",
    """                    assignedPersonnelCount:
                        parsed.assignedPersonnelCount,
                    assignmentScanComplete:
                        parsed.assignmentScanComplete,
                    personnelRowsSeen:
                        parsed.personnelRowsSeen,
                    trainingCounts: {
""",
    "strict trained registry evidence",
)

replace_once(
    """                    assignedPersonnelCount:
                        result.parsed.assignedPersonnelCount,
                    trainingCounts: {
""",
    """                    assignedPersonnelCount:
                        result.parsed.assignedPersonnelCount,
                    assignmentScanComplete:
                        result.parsed.assignmentScanComplete,
                    personnelRowsSeen:
                        result.parsed.personnelRowsSeen,
                    trainingCounts: {
""",
    "ordinary registry evidence",
)

text = text.replace("-v10669`", "-v10672`")
text = text.replace("-v10670`", "-v10672`")

replace_count(
    "!isStrictLiveVerifiedTrainingEntry(\n                    registryEntry\n                )",
    "!isAuthoritativeLivePoliceTrainingEntry(\n                    registryEntry\n                )",
    2,
    "strict trained contribution evidence",
)

strict_contribution = r"""
        if (
            requirement.requirementType ===
                'police_trained_irv_vehicle'
        ) {
            if (
                !isAuthoritativeLivePoliceTrainingEntry(
                    registryEntry
                )
            ) {
                return 0;
            }

            const requiredCodes =
                Array.isArray(
                    requirement.requiredTrainingCodes
                )
                    ? requirement.requiredTrainingCodes
                    : [];

            if (requiredCodes.length !== 1) {
                return 0;
            }

            const qualifiedCount =
                parseInt(
                    trainingCounts[
                        requiredCodes[0]
                    ],
                    10
                ) || 0;

            return qualifiedCount >= 2
                ? 1
                : 0;
        }

"""

replace_once(
    """        if (
            requirement.requirementType ===
                'public_order_combined_vehicle'
        ) {
""",
    strict_contribution + """        if (
            requirement.requirementType ===
                'public_order_combined_vehicle'
        ) {
""",
    "strict medic and railway contribution",
)

strict_hint = r"""
            if (
                requirement?.requirementType ===
                    'police_trained_irv_vehicle'
            ) {
                const requiredCodes =
                    Array.isArray(
                        requirement.requiredTrainingCodes
                    )
                        ? requirement.requiredTrainingCodes
                        : [];

                if (
                    requiredCodes.length === 1 &&
                    (
                        parseInt(
                            trainingCounts[
                                requiredCodes[0]
                            ],
                            10
                        ) || 0
                    ) >= 2
                ) {
                    return score + 1000;
                }
            }

"""

replace_once(
    """            if (
                requirement?.requirementType ===
                    'public_order_combined_vehicle'
            ) {
""",
    strict_hint + """            if (
                requirement?.requirementType ===
                    'public_order_combined_vehicle'
            ) {
""",
    "strict medic and railway registry hints",
)

replace_once(
    """                requirement?.requirementType ===
                    'public_order_combined_vehicle'
""",
    """                requirement?.requirementType ===
                    'public_order_combined_vehicle' ||
                requirement?.requirementType ===
                    'police_trained_irv_vehicle'
""",
    "strict requirement detection",
)

format_strict = r"""
                if (
                    requirement
                        .requirementType ===
                    'police_trained_irv_vehicle'
                ) {
                    return (
                        `${requirement.label} x${requirement.required} ` +
                        `(${requirement.personnelRequired} required; ` +
                        `2 ${requirement.requiredTrainingCodes?.[0] || 'trained'} personnel on each exact IRV)`
                    );
                }

"""

replace_once(
    """                return `${requirement.label} x${requirement.required}`;
""",
    format_strict + """                return `${requirement.label} x${requirement.required}`;
""",
    "strict trained requirement formatting",
)

replace_once(
    """        let tablePoliceInspectorRequired =
            0;

        // V10.6.45 patient-source authority guard.
""",
    """        let tablePoliceInspectorRequired =
            0;

        let tablePoliceMedicRequired =
            0;

        let tableRailwayPoliceRequired =
            0;

        // V10.6.45 patient-source authority guard.
""",
    "table medic and railway counters",
)

table_capture = r"""
                if (
                    isPoliceMedicPersonnelRequirementName(
                        cleanedName
                    )
                ) {
                    tablePoliceMedicRequired =
                        Math.max(
                            tablePoliceMedicRequired,
                            needed
                        );

                    if (
                        mfDebugEnabled &&
                        !silent
                    ) {
                        debugLog(
                            'POLICE MEDIC TABLE COLLAPSE',
                            `Police Medic x${needed} captured from ${source}; selecting exact IRVs live-verified with 2 police_medic-trained personnel.`
                        );
                    }

                    return;
                }

                if (
                    isRailwayPolicePersonnelRequirementName(
                        cleanedName
                    )
                ) {
                    tableRailwayPoliceRequired =
                        Math.max(
                            tableRailwayPoliceRequired,
                            needed
                        );

                    if (
                        mfDebugEnabled &&
                        !silent
                    ) {
                        debugLog(
                            'RAILWAY POLICE TABLE COLLAPSE',
                            `Railway Police Officer x${needed} captured from ${source}; selecting exact IRVs live-verified with 2 railway_police-trained personnel.`
                        );
                    }

                    return;
                }

"""

replace_once(
    """                missingRows.push({
                    unitName:
                        cleanedName,
""",
    table_capture + """                missingRows.push({
                    unitName:
                        cleanedName,
""",
    "capture table medic and railway",
)

replace_once(
    """            tablePoliceSergeantRequired >
                0 ||
            tablePoliceInspectorRequired >
                0
""",
    """            tablePoliceSergeantRequired >
                0 ||
            tablePoliceInspectorRequired >
                0 ||
            tablePoliceMedicRequired >
                0 ||
            tableRailwayPoliceRequired >
                0
""",
    "merge condition medic and railway",
)

replace_once(
    """                    {
                        code:
                            'police_inspector',
                        label:
                            'Police Inspector',
                        required:
                            tablePoliceInspectorRequired
                    }
""",
    """                    {
                        code:
                            'police_inspector',
                        label:
                            'Police Inspector',
                        required:
                            tablePoliceInspectorRequired
                    },
                    {
                        code:
                            'police_medic',
                        label:
                            'Police Medic',
                        required:
                            tablePoliceMedicRequired
                    },
                    {
                        code:
                            'railway_police',
                        label:
                            'Railway Police Officer',
                        required:
                            tableRailwayPoliceRequired
                    }
""",
    "table medic and railway requirements",
)

replace_once(
    """                'Required trained Police Inspector IRV is still missing.'
""",
    """                'A required trained Police IRV is still missing.'
""",
    "generic trained Police missing status",
)

SOURCE.write_text(text, encoding="utf-8")

readme = README.read_text(encoding="utf-8")
if readme.count("**Current version:** `1.0.4`") != 1:
    raise SystemExit("README current version anchor missing")
readme = readme.replace("**Current version:** `1.0.4`", "**Current version:** `1.0.5`", 1)
README.write_text(readme, encoding="utf-8")

src_readme = SRC_README.read_text(encoding="utf-8")
if src_readme.count("| Command Nexus version | `1.0.4` |") != 1:
    raise SystemExit("src README version anchor missing")
if src_readme.count("| Mission Finder baseline | `V10.6.71` |") != 1:
    raise SystemExit("src README Mission Finder anchor missing")
src_readme = src_readme.replace(
    "| Command Nexus version | `1.0.4` |",
    "| Command Nexus version | `1.0.5` |",
    1,
)
src_readme = src_readme.replace(
    "| Mission Finder baseline | `V10.6.71` |",
    "| Mission Finder baseline | `V10.6.72` |",
    1,
)
SRC_README.write_text(src_readme, encoding="utf-8")

changelog = CHANGELOG.read_text(encoding="utf-8")
release_notes = """## [1.0.5] - 2026-07-20

### Added

- Added a one-click **Build Personnel Register** action that scans Police, Police Aviation and EOD stations without changing staffing assignments or requiring profile, mode, action or start-point setup.
- Added exact trained-IRV mission selection for **Police Medic** and **Railway Police Officer**, using two correctly trained personnel per IRV.

### Changed

- Ordinary Police Car attendance now accepts a freshly verified exact IRV with zero protected specialist qualifications even when no personnel are permanently bound to that vehicle.
- Mission Finder baseline increased from `V10.6.71` to `V10.6.72`; Personnel Assignment increased from `1.2.7` to `1.2.8`.

### Fixed

- Fixed ordinary Police Cars being rejected by Unit Finder, Mission Update and Auto Mode solely because their assignment page reported zero permanent bindings.
- Fixed issue #16 by mapping Police Medic requirement rows and Missing Personnel text to exact IRVs containing two `police_medic`-trained personnel.
- Added Railway Police Officer parsing for both table and alert layouts, selecting exact type-8 IRVs containing two `railway_police`-trained personnel.
- Added an authoritative type-30 ATV Carrier matcher, including `ATV Carrier`, `ATV` and `ATC Carrier` display aliases without matching Police Armed Traffic Cars.
- Prevented incomplete or structurally invalid assignment-page scans from overwriting or authorising specialist-training decisions.

"""
anchor = "## [1.0.4] - 2026-07-20\n"
if changelog.count(anchor) != 1:
    raise SystemExit("CHANGELOG v1.0.4 anchor missing")
changelog = changelog.replace(anchor, release_notes + anchor, 1)
CHANGELOG.write_text(changelog, encoding="utf-8")

final_text = SOURCE.read_text(encoding="utf-8")
required_markers = [
    "// @version      1.0.5",
    "const PERSONNEL_VERSION = '1.2.8';",
    "MODULE 2: MISSION FINDER V10.6.72",
    "Build Personnel Register",
    "function buildPersonnelTrainingRegisterOneClick()",
    "function isAtvCarrierCheckbox(",
    "'police_trained_irv_vehicle'",
    "'railway_police'",
    "assignmentScanComplete",
]
for marker in required_markers:
    if marker not in final_text:
        raise SystemExit(f"Missing required marker after patch: {marker}")

print("Applied v1.0.5 Police, Personnel Register and ATV fixes.")
