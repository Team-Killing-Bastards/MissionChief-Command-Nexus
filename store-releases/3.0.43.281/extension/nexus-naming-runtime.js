/* Naming and personnel controls for the Renamer tab in Nexus Tools. */
(function () {
    'use strict';
    if (window !== window.top || window.__MC_NAMING_TOOLS_V428__) return;
    window.__MC_NAMING_TOOLS_V428__ = true;
    const UNIT_VERSION = '3.3.30';
    const STATION_VERSION = '1.3.24';
    const PERSONNEL_VERSION = '1.3.14';
    const PERSONNEL_TRAINING_CODE = 'critical_care';
    const PERSONNEL_TRAINING_LABEL = 'Critical Care';
    const PERSONNEL_TARGET_VEHICLE_TYPE_ID = '5';
    const PERSONNEL_TARGET_VEHICLE_LABEL = 'Ambulance';
    const PERSONNEL_TARGET_PER_VEHICLE = 1;
    const PERSONNEL_REQUEST_GAP_MS = 650;
    const PERSONNEL_STATION_GAP_MS = 900;
    const PERSONNEL_REGISTER_MAX_CONCURRENCY = 3;
    const PERSONNEL_REGISTER_LAUNCH_GAP_MS = 250;
    const PERSONNEL_REGISTER_REVERIFY_AGE_MS = 30 * 24 * 60 * 60 * 1000;
    const ACTIVE_TAB_STORAGE_KEY = 'mcNamingToolsActiveTab_v32';
    const COLLAPSED_STORAGE_KEY = 'mcNamingToolsCollapsed_v36';
    const PERSONNEL_STATION_REPORT_VISIBLE_KEY = 'mcPersonnelStationReportVisible_v407';
    const PERSONNEL_OVERALL_REPORT_VISIBLE_KEY = 'mcPersonnelOverallReportVisible_v407';
    const PERSONNEL_SERVICE_STORAGE_KEY = 'mcPersonnelService_v410';
    const PERSONNEL_PROFILE_STORAGE_KEY = 'mcPersonnelProfile_v410';
    const PERSONNEL_UNITS_REQUIRED_STORAGE_KEY = 'mcPersonnelUnitsRequired_v423';
    const PERSONNEL_TRAINING_REGISTRY_STORAGE_KEY =
        'mcPersonnelVehicleTrainingRegistry_v1';
    const PERSONNEL_TRAINING_REGISTRY_SCHEMA_VERSION = 1;
    const PERSONNEL_TRAINING_REGISTRY_EXPORT_FORMAT =
        'missionchief-personnel-training-register';
    const PERSONNEL_TRAINING_REGISTRY_EXPORT_VERSION = 1;
    const PERSONNEL_TRAINING_REGISTRY_IMPORT_MAX_BYTES = 10 * 1024 * 1024;
    const TOOL_LOG_MAX_LINES = 400;
    const TOOL_LOG_TRIM_BUFFER = 40;
    const PERSONNEL_TRAINING_REGISTRY_MAX_VEHICLES = 30000;
    const PERSONNEL_TRAINING_REGISTRY_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
    const PERSONNEL_TRAINING_REGISTRY_QUOTA_RETRY_MAX_VEHICLES = 2500;
    const PERSONNEL_TRAINING_REGISTRY_FLUSH_DELAY_MS = 1400;
    const PERSONNEL_TRAINING_REGISTRY_PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000;
    const TOOL_LIFECYCLE_CLEANUPS = new Set();
    const TOOL_LOG_SCROLL_FRAMES = new Map();
    const TOOL_UI_ELEMENT_CACHE = new Map();
    const PERSONNEL_ASSIGNMENT_INDEX_CACHE = new WeakMap();
    const PERSONNEL_TRAINING_SET_CACHE = new WeakMap();
    const PERSONNEL_VISIBLE_TRAINING_COUNTS_CACHE = new WeakMap();
    const PERSONNEL_REPORT_BLOCK_CACHE = new WeakMap();
    const PERSONNEL_STATION_LINK_BY_HREF = new Map();
    const PERSONNEL_START_OPTION_BY_HREF = new Map();
    const PERSONNEL_HIGHLIGHTED_STATION_LINKS = new Set();
    let TOOL_LIFECYCLE_CLEANED = false;
    let PERSONNEL_TRAINING_REGISTRY_CACHE = null;
    let PERSONNEL_TRAINING_REGISTRY_DIRTY = false;
    // A manual register scan commits only changed vehicle records, in bounded batches.
    let PERSONNEL_REGISTER_PENDING_IDS = null;
    let PERSONNEL_REGISTER_FLUSH_JOB = null;
    let PERSONNEL_TRAINING_REGISTRY_FLUSH_TIMER = null;
    let PERSONNEL_TRAINING_REGISTRY_PENDING_EVENT = null;
    let PERSONNEL_SHORTFALL_CACHE_SIZE = -1;
    let PERSONNEL_SHORTFALL_CACHE = [];
    const makePoliceRule = ({
        id,
        label,
        vehicleTypeIds,
        companionVehicleTypeIds = [],
        vehicleLabel,
        target,
        trainingAll,
        trainingLabel,
        preferWithout = [],
        sharedVehiclePool = false
    }) => Object.freeze({
        id,
        label,
        vehicleTypeIds: vehicleTypeIds.map(String),
        companionVehicleTypeIds: companionVehicleTypeIds.map(String),
        vehicleLabel,
        target: Number(target),
        trainingAll: trainingAll.map(String),
        trainingLabel,
        preferWithout: preferWithout.map(String),
        sharedVehiclePool: Boolean(sharedVehiclePool)
    });
    const PERSONNEL_TRAINING_LABELS =
        Object.freeze({
            level_1_public_order:
                'Level 1 Public Order',
            level_2_public_order:
                'Level 2 Public Order',
            police_sergeant:
                'Police Sergeant',
            police_medic:
                'Police Medic',
            police_inspector:
                'Police Inspector',
            traffic_police:
                'Roads Policing',
            swat:
                'Firearms',
            police_horse:
                'Mounted Officer',
            k9:
                'Dog Handler',
            drone:
                'Drone Operator',
            search_and_rescue:
                'Search Advisor',
            polizeihubschrauber:
                'Police Aviation',
            railway_police_command:
                'Mobile Operations Management',
            railway_police:
                'Railway Police Officer',
            bomb_disposal_command:
                'EOD Commander',
            bomb_disposal:
                'Bomb Disposal',
            bomb_disposal_diver:
                'Marine Bomb Disposal',
            elw2:
                'Level 1 Incident Commander Training',
            gw_gefahrgut:
                'HazMat Unit',
            railway_fire:
                'Railway Fire',
            arff:
                'Aircraft Rescue and Firefighting',
            coresponder:
                'Co-Responder',
            pump:
                'High Volume Pump',
            gw_wasserrettung:
                'Lifeguard',
            coastal_rescue_pilot:
                'Coastal Air Rescue Pilot',
            coastal_command:
                'Coastal Commander',
            coastal_mud_rescue:
                'Mud Rescue Operator',
            ocean_navigation:
                'Lifeboat Operator',
            gw_hoehenrettung:
                'Rope Rescue Operator',
            flood_equipment:
                'Flood First Responder',
            jetski:
                'Jet Ski Handling',
            hover_boat_elw:
                'Hovercraft Commander',
            search_and_rescue_command:
                'SAR Commander',
            rescue_dogs:
                'Search Dog Handler',
            mountain_cave_rescue:
                'Cave Rescue Specialist',
            critical_care:
                'Critical Care',
            hazard_response_ems:
                'HART Training',
            elw2_ems:
                'Tactical Command Course',
            special_operation_response:
                'SORT Training',
            ems_mobile_command:
                'Ambulance Officer',
            midwife:
                'Midwifery Training',
            paramedic_advanced:
                'Specialist Paramedic Training'
        });
    const POLICE_RULES = Object.freeze({ publicOrderLevel1: makePoliceRule({ id: 'police_public_order_level_1', label: 'Level 1 Public Order', vehicleTypeIds: [ '8' ], vehicleLabel: 'Incident Response Vehicle', target: 2, trainingAll: [ 'level_1_public_order' ], trainingLabel: 'Level 1 Public Order', sharedVehiclePool: true }), publicOrderLevel2: makePoliceRule({ id: 'police_public_order_level_2', label: 'Level 2 Public Order', vehicleTypeIds: [ '8' ], vehicleLabel: 'Incident Response Vehicle', target: 2, trainingAll: [ 'level_2_public_order' ], trainingLabel: 'Level 2 Public Order', sharedVehiclePool: true }), publicOrderSergeant: makePoliceRule({ id: 'police_public_order_sergeant', label: 'Police Sergeant', vehicleTypeIds: [ '8' ], vehicleLabel: 'Incident Response Vehicle', target: 2, trainingAll: [ 'police_sergeant' ], trainingLabel: 'Police Sergeant', sharedVehiclePool: true }), publicOrderMedic: makePoliceRule({ id: 'police_public_order_medic', label: 'Police Medic', vehicleTypeIds: [ '8' ], vehicleLabel: 'Incident Response Vehicle', target: 2, trainingAll: [ 'police_medic' ], trainingLabel: 'Police Medic', sharedVehiclePool: true }), publicOrderCombined: makePoliceRule({ id: 'police_public_order_combined', label: 'Public Order L1 + L2 + Sergeant + Police Medic', vehicleTypeIds: ['8'], vehicleLabel: 'Incident Response Vehicle', target: 2, trainingAll: ['level_1_public_order', 'level_2_public_order', 'police_sergeant', 'police_medic'], trainingLabel: 'Level 1 + Level 2 + Sergeant + Police Medic', sharedVehiclePool: true }), inspector: makePoliceRule({ id: 'police_inspector', label: 'Police Inspector', vehicleTypeIds: ['8'], vehicleLabel: 'Incident Response Vehicle', target: 2, trainingAll: ['police_inspector'], trainingLabel: 'Police Inspector', sharedVehiclePool: true }), roads: makePoliceRule({ id: 'police_roads_firearms', label: 'Roads Policing + Firearms', vehicleTypeIds: ['25'], vehicleLabel: 'Armed Traffic Car', target: 2, trainingAll: ['traffic_police', 'swat'], trainingLabel: 'Roads Policing + Firearms' }), firearms: makePoliceRule({ id: 'police_mrav_firearms', label: 'Firearms', vehicleTypeIds: ['56'], vehicleLabel: 'Multi-Role Armoured Vehicle', target: 6, trainingAll: ['swat'], trainingLabel: 'Firearms', preferWithout: ['traffic_police'] }), mounted: makePoliceRule({ id: 'police_mounted', label: 'Mounted Officers', vehicleTypeIds: ['55'], vehicleLabel: 'Mounted Unit', target: 1, trainingAll: ['police_horse'], trainingLabel: 'Mounted Officers' }), dog: makePoliceRule({ id: 'police_dog', label: 'Dog handling', vehicleTypeIds: ['12'], vehicleLabel: 'Dog Support Unit', target: 1, trainingAll: ['k9'], trainingLabel: 'Dog handling' }), searchAdvisor: makePoliceRule({ id: 'police_drone_search_advisor', label: 'Drone Operator + Police Search Advisor', vehicleTypeIds: ['91'], vehicleLabel: 'Police Drone Vehicle', target: 2, trainingAll: ['drone', 'search_and_rescue'], trainingLabel: 'Drone Operator + Police Search Advisor', sharedVehiclePool: true }), drone: makePoliceRule({ id: 'police_drone', label: 'Drone Operator', vehicleTypeIds: ['91'], vehicleLabel: 'Police Drone Vehicle', target: 2, trainingAll: ['drone'], trainingLabel: 'Drone Operator', preferWithout: ['search_and_rescue'], sharedVehiclePool: true }), aviation: makePoliceRule({ id: 'police_aviation', label: 'Police aviation', vehicleTypeIds: ['11'], vehicleLabel: 'Police Helicopter', target: 3, trainingAll: ['polizeihubschrauber'], trainingLabel: 'Police aviation' }), mobileOperations: makePoliceRule({ id: 'police_mobile_operations', label: 'Mobile Operations Management', vehicleTypeIds: ['108'], vehicleLabel: 'EIU', target: 2, trainingAll: ['railway_police_command'], trainingLabel: 'Mobile Operations Manager' }), railway: makePoliceRule({ id: 'police_railway', label: 'Railway Police Officer', vehicleTypeIds: ['8'], vehicleLabel: 'Railway Policing IRV', target: 2, trainingAll: ['railway_police'], trainingLabel: 'Railway Police Officer', preferWithout: ['railway_police_command'], sharedVehiclePool: true }), eodCommander: makePoliceRule({ id: 'police_eod_commander', label: 'EOD Commander', vehicleTypeIds: ['109'], vehicleLabel: 'EOD Commander Vehicle', target: 2, trainingAll: ['bomb_disposal_command'], trainingLabel: 'EOD Commander' }), eodResponse: makePoliceRule({ id: 'police_eod_response', label: 'Bomb Disposal', vehicleTypeIds: ['110'], vehicleLabel: 'EOD Response Vehicle', target: 4, trainingAll: ['bomb_disposal'], trainingLabel: 'Bomb Disposal', preferWithout: ['bomb_disposal_command'] }), eodMedium: makePoliceRule({ id: 'police_eod_medium', label: 'Bomb Disposal', vehicleTypeIds: ['111'], vehicleLabel: 'EOD Medium Equipment Van', target: 3, trainingAll: ['bomb_disposal'], trainingLabel: 'Bomb Disposal', preferWithout: ['bomb_disposal_command'] }), eodHeavy: makePoliceRule({ id: 'police_eod_heavy', label: 'Bomb Disposal', vehicleTypeIds: ['112'], vehicleLabel: 'EOD Heavy Equipment Vehicle', target: 2, trainingAll: ['bomb_disposal'], trainingLabel: 'Bomb Disposal', preferWithout: ['bomb_disposal_command'] }), marineResponse: makePoliceRule({ id: 'police_marine_eod_response', label: 'Marine Bomb Disposal', vehicleTypeIds: ['113'], vehicleLabel: 'Marine EOD Response Vehicle', target: 4, trainingAll: ['bomb_disposal_diver'], trainingLabel: 'Marine Bomb Disposal' }), marineEquipment: makePoliceRule({ id: 'police_marine_eod_equipment', label: 'Marine Bomb Disposal', vehicleTypeIds: ['114'], vehicleLabel: 'Marine EOD Equipment Van', target: 3, trainingAll: ['bomb_disposal_diver'], trainingLabel: 'Marine Bomb Disposal' }) }); const FIRE_RULES = Object.freeze({ arffFoam: makePoliceRule({ id: 'fire_arff_major_foam', label: 'Aircraft Rescue and Firefighting', vehicleTypeIds: ['75'], vehicleLabel: 'Major Foam Tender', target: 4, trainingAll: ['arff'], trainingLabel: 'ARFF' }), arffRiv: makePoliceRule({ id: 'fire_arff_riv', label: 'Aircraft Rescue and Firefighting', vehicleTypeIds: ['76'], vehicleLabel: 'RIV', target: 4, trainingAll: ['arff'], trainingLabel: 'ARFF' }), arffCommand: makePoliceRule({ id: 'fire_arff_command', label: 'Aircraft Rescue and Firefighting', vehicleTypeIds: ['77'], vehicleLabel: 'Airfield Firefighting Command Vehicle', target: 2, trainingAll: ['arff'], trainingLabel: 'ARFF' }), arffStairs: makePoliceRule({ id: 'fire_arff_rescue_stairs', label: 'Aircraft Rescue and Firefighting', vehicleTypeIds: ['78'], vehicleLabel: 'Rescue Stairs', target: 2, trainingAll: ['arff'], trainingLabel: 'ARFF' }), coResponder: makePoliceRule({ id: 'fire_co_responder', label: 'Co-Responder Training', vehicleTypeIds: ['18'], vehicleLabel: 'Co-Responder Vehicle', target: 1, trainingAll: ['coresponder'], trainingLabel: 'Co-Responder' }), drone: makePoliceRule({ id: 'fire_drone', label: 'Drone Operator Training', vehicleTypeIds: ['90'], vehicleLabel: 'Fire Station Drone Vehicle', target: 2, trainingAll: ['drone'], trainingLabel: 'Drone Operator' }), highVolumePump: makePoliceRule({ id: 'fire_high_volume_pump', label: 'High Volume Pump Training', vehicleTypeIds: ['40'], companionVehicleTypeIds: ['50'], vehicleLabel: 'Prime Mover linked to an HVP pod', target: 2, trainingAll: ['pump'], trainingLabel: 'High Volume Pump' }), lifeguard: makePoliceRule({ id: 'fire_lifeguard', label: 'Lifeguard Training', vehicleTypeIds: ['73'], companionVehicleTypeIds: ['74'], vehicleLabel: 'Light 4x4 linked to a Boat Trailer', target: 4, trainingAll: ['gw_wasserrettung'], trainingLabel: 'Lifeguard' }), incidentCommand: makePoliceRule({ id: 'fire_level_1_incident_command', label: 'Level 1 Incident Commander Training', vehicleTypeIds: ['15'], vehicleLabel: 'Incident Command and Control Unit', target: 3, trainingAll: ['elw2'], trainingLabel: 'Level 1 Incident Commander Training' }), hazmatOsu: makePoliceRule({ id: 'fire_hazmat_osu', label: 'HazMat Unit', vehicleTypeIds: ['39'], vehicleLabel: 'Operational Support Unit', target: 6, trainingAll: ['gw_gefahrgut'], trainingLabel: 'HazMat Unit' }), railway: makePoliceRule({ id: 'fire_railway', label: 'Railway Fire', vehicleTypeIds: ['107'], vehicleLabel: 'RRU', target: 2, trainingAll: ['railway_fire'], trainingLabel: 'Railway Fire' }) }); const FIRE_ALL_RULES = Object.freeze([ FIRE_RULES.arffCommand, FIRE_RULES.arffStairs, FIRE_RULES.arffFoam, FIRE_RULES.arffRiv, FIRE_RULES.highVolumePump, FIRE_RULES.coResponder, FIRE_RULES.drone, FIRE_RULES.lifeguard, FIRE_RULES.incidentCommand, FIRE_RULES.hazmatOsu, FIRE_RULES.railway ]); const SAR_RULES = Object.freeze({ lifeguardQuad: makePoliceRule({ id: 'sar_lifeguardQuad', label: 'Lifeguard Training', vehicleTypeIds: ['118'], vehicleLabel: 'Lifeguard Quadbike', target: 2, trainingAll: ['gw_wasserrettung'], trainingLabel: 'Lifeguard' }), lifeguardQuadJet: makePoliceRule({ id: 'sar_lifeguardQuad_jet', label: 'Jet Ski Handling', vehicleTypeIds: ['118'], companionVehicleTypeIds: ['70'], vehicleLabel: 'Lifeguard Quadbike linked to a Rescue Watercraft Trailer', target: 2, trainingAll: ['jetski', 'gw_wasserrettung'], trainingLabel: 'Jet Ski Handling + Lifeguard' }), lifeguard4x4: makePoliceRule({ id: 'sar_lifeguard4x4', label: 'Lifeguard Training', vehicleTypeIds: ['119'], vehicleLabel: 'Lifeguard 4x4', target: 4, trainingAll: ['gw_wasserrettung'], trainingLabel: 'Lifeguard' }), lifeguard4x4Jet: makePoliceRule({ id: 'sar_lifeguard4x4_jet', label: 'Jet Ski Handling', vehicleTypeIds: ['119'], companionVehicleTypeIds: ['70'], vehicleLabel: 'Lifeguard 4x4 linked to a Rescue Watercraft Trailer', target: 4, trainingAll: ['jetski', 'gw_wasserrettung'], trainingLabel: 'Jet Ski Handling + Lifeguard' }), caveRescue: makePoliceRule({ id: 'sar_cave_rescue', label: 'Cave Rescue Training', vehicleTypeIds: ['93', '99'], vehicleLabel: 'SAR or Mountain Rescue 4x4', target: 4, trainingAll: ['mountain_cave_rescue'], trainingLabel: 'Cave Rescue Specialist' }), coastalAir: makePoliceRule({ id: 'sar_coastal_air_rescue', label: 'Coastal Air Rescue Operations Training', vehicleTypeIds: ['64', '65'], vehicleLabel: 'Coastguard Rescue Helicopter', target: 4, trainingAll: ['coastal_rescue_pilot'], trainingLabel: 'Coastal Air Rescue Pilot' }), coastalCommand: makePoliceRule({ id: 'sar_coastal_command', label: 'Coastal Command Training', vehicleTypeIds: ['60'], vehicleLabel: 'Coastguard Commander', target: 5, trainingAll: ['coastal_command'], trainingLabel: 'Coastal Commander' }), searchAdvisor: makePoliceRule({ id: 'sar_search_advisor', label: 'Coastguard Search Advisor Training', vehicleTypeIds: ['86'], vehicleLabel: 'Operational Support Van', target: 3, trainingAll: ['search_and_rescue'], trainingLabel: 'Search Advisor' }), dogHandling: makePoliceRule({ id: 'sar_dog_handling', label: 'Dog handling', vehicleTypeIds: ['101', '102'], vehicleLabel: 'Search Dog Unit', target: 1, trainingAll: ['rescue_dogs'], trainingLabel: 'Search Dog Handler' }), drone: makePoliceRule({ id: 'sar_drone', label: 'Drone Operator Training', vehicleTypeIds: ['89'], vehicleLabel: 'SAR HQ Drone Vehicle', target: 2, trainingAll: ['drone'], trainingLabel: 'Drone Operator' }), floodCrv: makePoliceRule({ id: 'sar_flood_crv', label: 'Flood First Responder Training', vehicleTypeIds: ['57'], companionVehicleTypeIds: ['61'], vehicleLabel: 'CRV linked to a Flood Rescue Unit', target: 5, trainingAll: ['flood_equipment'], trainingLabel: 'Flood First Responder' }), floodMud: makePoliceRule({ id: 'sar_flood_mud', label: 'Flood First Responder Training', vehicleTypeIds: ['58'], companionVehicleTypeIds: ['61'], vehicleLabel: 'Mud Rescue Unit linked to a Flood Rescue Unit', target: 5, trainingAll: ['flood_equipment'], trainingLabel: 'Flood First Responder' }), floodRope: makePoliceRule({ id: 'sar_flood_rope', label: 'Flood First Responder Training', vehicleTypeIds: ['59'], companionVehicleTypeIds: ['61'], vehicleLabel: 'Rope Rescue Unit linked to a Flood Rescue Unit', target: 5, trainingAll: ['flood_equipment'], trainingLabel: 'Flood First Responder' }), floodCommander: makePoliceRule({ id: 'sar_flood_commander', label: 'Flood First Responder Training', vehicleTypeIds: ['60'], companionVehicleTypeIds: ['61'], vehicleLabel: 'Coastguard Commander linked to a Flood Rescue Unit', target: 5, trainingAll: ['flood_equipment'], trainingLabel: 'Flood First Responder' }), floodSupport: makePoliceRule({ id: 'sar_flood_support', label: 'Flood First Responder Training', vehicleTypeIds: ['63'], companionVehicleTypeIds: ['61'], vehicleLabel: 'Support Unit linked to a Flood Rescue Unit', target: 8, trainingAll: ['flood_equipment'], trainingLabel: 'Flood First Responder' }), floodLifeboat4x4: makePoliceRule({ id: 'sar_flood_lifeboat_4x4', label: 'Flood First Responder Training', vehicleTypeIds: ['66'], companionVehicleTypeIds: ['61'], vehicleLabel: '4x4 linked to a Flood Rescue Unit', target: 4, trainingAll: ['flood_equipment'], trainingLabel: 'Flood First Responder' }), floodControlVan: makePoliceRule({ id: 'sar_flood_control_van', label: 'Flood First Responder Training', vehicleTypeIds: ['85'], companionVehicleTypeIds: ['88'], vehicleLabel: 'Control Van linked to a SAR Flood Rescue Trailer', target: 3, trainingAll: ['flood_equipment'], trainingLabel: 'Flood First Responder' }), floodSupportVan: makePoliceRule({ id: 'sar_flood_support_van', label: 'Flood First Responder Training', vehicleTypeIds: ['86'], companionVehicleTypeIds: ['88'], vehicleLabel: 'Operational Support Van linked to a SAR Flood Rescue Trailer', target: 3, trainingAll: ['flood_equipment'], trainingLabel: 'Flood First Responder' }), floodDrone: makePoliceRule({ id: 'sar_flood_drone', label: 'Flood First Responder Training', vehicleTypeIds: ['89'], companionVehicleTypeIds: ['88'], vehicleLabel: 'Drone Vehicle linked to a SAR Flood Rescue Trailer', target: 2, trainingAll: ['flood_equipment'], trainingLabel: 'Flood First Responder' }), floodRrv: makePoliceRule({ id: 'sar_flood_rrv', label: 'Flood First Responder Training', vehicleTypeIds: ['94'], companionVehicleTypeIds: ['88'], vehicleLabel: 'SAR RRV linked to a SAR Flood Rescue Trailer', target: 1, trainingAll: ['flood_equipment'], trainingLabel: 'Flood First Responder' }), hovercraft: makePoliceRule({ id: 'sar_hovercraft', label: 'Hovercraft Commander Training', vehicleTypeIds: ['72'], companionVehicleTypeIds: ['71'], vehicleLabel: 'Hovercraft Transporter linked to a Hovercraft Trailer', target: 3, trainingAll: ['hover_boat_elw'], trainingLabel: 'Hovercraft Commander' }), jetSki: makePoliceRule({ id: 'sar_jet_ski', label: 'Jet Ski Handling', vehicleTypeIds: ['66'], companionVehicleTypeIds: ['70'], vehicleLabel: '4x4 linked to a Rescue Watercraft Trailer', target: 4, trainingAll: ['jetski'], trainingLabel: 'Jet Ski Handling' }), lifeboatIlb: makePoliceRule({ id: 'sar_lifeboat_ilb', label: 'Lifeboat Operations Training', vehicleTypeIds: ['68'], vehicleLabel: 'ILB', target: 4, trainingAll: ['ocean_navigation'], trainingLabel: 'Lifeboat Operator' }), lifeboatAlb: makePoliceRule({ id: 'sar_lifeboat_alb', label: 'Lifeboat Operations Training', vehicleTypeIds: ['69'], vehicleLabel: 'ALB', target: 7, trainingAll: ['ocean_navigation'], trainingLabel: 'Lifeboat Operator' }), lifeguard: makePoliceRule({ id: 'sar_lifeguard', label: 'Lifeguard Training', vehicleTypeIds: ['66'], companionVehicleTypeIds: ['67'], vehicleLabel: '4x4 linked to an Inland Rescue Boat', target: 4, trainingAll: ['gw_wasserrettung'], trainingLabel: 'Lifeguard' }), mudRescue: makePoliceRule({ id: 'sar_mud_rescue', label: 'Mud Rescue Training', vehicleTypeIds: ['58'], vehicleLabel: 'Coastguard Mud Rescue Unit', target: 5, trainingAll: ['coastal_mud_rescue'], trainingLabel: 'Mud Rescue Operator' }), ropeRescue: makePoliceRule({ id: 'sar_rope_rescue', label: 'Rope Rescue Training', vehicleTypeIds: ['59'], vehicleLabel: 'Coastguard Rope Rescue Unit', target: 5, trainingAll: ['gw_hoehenrettung'], trainingLabel: 'Rope Rescue Operator' }), searchManagement: makePoliceRule({ id: 'sar_search_management', label: 'Search Management Training', vehicleTypeIds: ['85', '100'], vehicleLabel: 'SAR or Mountain Rescue Control Van', target: 3, trainingAll: ['search_and_rescue_command'], trainingLabel: 'SAR Commander' }) }); const SAR_ALL_RULES = Object.freeze([ SAR_RULES.lifeguardQuad, SAR_RULES.lifeguard4x4, SAR_RULES.lifeguardQuadJet, SAR_RULES.lifeguard4x4Jet, SAR_RULES.coastalAir, SAR_RULES.coastalCommand, SAR_RULES.searchManagement, SAR_RULES.searchAdvisor, SAR_RULES.caveRescue, SAR_RULES.mudRescue, SAR_RULES.ropeRescue, SAR_RULES.floodCrv, SAR_RULES.floodMud, SAR_RULES.floodRope, SAR_RULES.floodCommander, SAR_RULES.floodSupport, SAR_RULES.floodLifeboat4x4, SAR_RULES.floodControlVan, SAR_RULES.floodSupportVan, SAR_RULES.floodDrone, SAR_RULES.floodRrv, SAR_RULES.hovercraft, SAR_RULES.jetSki, SAR_RULES.lifeboatIlb, SAR_RULES.lifeboatAlb, SAR_RULES.lifeguard, SAR_RULES.dogHandling, SAR_RULES.drone ]); const FIRE_PROFILE_BUILDING_TYPE_IDS = Object.freeze(['0', '18']); const SAR_PROFILE_BUILDING_TYPE_IDS = Object.freeze({ caveRescue: Object.freeze(['22', '31', '33']), coastalAir: Object.freeze(['30']), coastalCommand: Object.freeze(['22', '28']), searchAdvisor: Object.freeze(['31']), dogHandling: Object.freeze(['22', '31', '33']), drone: Object.freeze(['31']), flood: Object.freeze(['22', '27', '28', '31']), hovercraft: Object.freeze(['27']), jetSki: Object.freeze(['27', '37']), lifeboat: Object.freeze(['27']), lifeguard: Object.freeze(['27', '37']), mudRescue: Object.freeze(['28']), ropeRescue: Object.freeze(['28']), searchManagement: Object.freeze(['31', '33']), all: Object.freeze(['22', '27', '28', '30', '31', '33', '37']) }); const MEDICAL_RULES = Object.freeze({ ambulanceOfficer: makePoliceRule({ id: 'medical_ambulance_officer', label: 'Ambulance Officer', vehicleTypeIds: ['34'], vehicleLabel: 'Ambulance Officer vehicle', target: 1, trainingAll: ['ems_mobile_command'], trainingLabel: 'Ambulance Officer' }), hart: makePoliceRule({ id: 'medical_hart', label: 'HART Training', vehicleTypeIds: ['27', '28', '30'], vehicleLabel: 'PRV, SRV or ATV Carrier', target: 2, trainingAll: ['hazard_response_ems'], trainingLabel: 'HART Training' }), tacticalCommand: makePoliceRule({ id: 'medical_tactical_command', label: 'Tactical Command Course', vehicleTypeIds: ['31'], vehicleLabel: 'Ambulance Control Unit', target: 2, trainingAll: ['elw2_ems'], trainingLabel: 'Tactical Command Course' }), sort: makePoliceRule({ id: 'medical_sort', label: 'SORT Training', vehicleTypeIds: ['32', '33'], vehicleLabel: 'CBRN Vehicle or Mass Casualty Equipment', target: 2, trainingAll: ['special_operation_response'], trainingLabel: 'SORT Training' }), midwifery: makePoliceRule({ id: 'medical_midwifery', label: 'Midwifery Training', vehicleTypeIds: ['95'], vehicleLabel: 'Community Midwife vehicle', target: 2, trainingAll: ['midwife'], trainingLabel: 'Midwifery Training' }), specialistParamedic: makePoliceRule({ id: 'medical_specialist_paramedic', label: 'Specialist Paramedic Training', vehicleTypeIds: ['96'], vehicleLabel: 'Specialist Paramedic RRV', target: 2, trainingAll: ['paramedic_advanced'], trainingLabel: 'Specialist Paramedic Training' }), criticalCare: makePoliceRule({ id: 'medical_critical_care', label: 'Critical Care', vehicleTypeIds: ['5'], vehicleLabel: 'Ambulance', target: 1, trainingAll: ['critical_care'], trainingLabel: 'Critical Care' }) }); const MEDICAL_ALL_RULES = Object.freeze([ MEDICAL_RULES.ambulanceOfficer, MEDICAL_RULES.hart, MEDICAL_RULES.tacticalCommand, MEDICAL_RULES.sort, MEDICAL_RULES.midwifery, MEDICAL_RULES.specialistParamedic, MEDICAL_RULES.criticalCare ]); const MEDICAL_PROFILE_BUILDING_TYPE_IDS = Object.freeze({ ambulanceOfficer: Object.freeze(['2', '20', '22', '25']), hart: Object.freeze(['25']), tacticalCommand: Object.freeze(['2', '20', '21', '25']), sort: Object.freeze(['2', '20', '21', '25']), midwifery: Object.freeze(['2', '20', '21', '22', '32']), specialistParamedic: Object.freeze(['2', '20', '21', '22', '32']), all: Object.freeze(['2', '20', '21', '22', '25', '32']) }); const POLICE_ALL_RULES = Object.freeze([ POLICE_RULES.eodCommander, POLICE_RULES.searchAdvisor, POLICE_RULES.mobileOperations, POLICE_RULES.roads, POLICE_RULES.inspector, POLICE_RULES.railway, POLICE_RULES.publicOrderCombined, POLICE_RULES.aviation, POLICE_RULES.marineResponse, POLICE_RULES.marineEquipment, POLICE_RULES.eodResponse, POLICE_RULES.eodMedium, POLICE_RULES.eodHeavy, POLICE_RULES.firearms, POLICE_RULES.mounted, POLICE_RULES.dog, POLICE_RULES.drone ]); const livePoliceProfile = (id, label, vehicle, requirement, policy, rules, stationTypes = ['POLICE']) => ({ id, label, vehicle, requirement, policy, live: true, engine: 'police', stationTypes, rules }); const liveFireProfile = (id, label, vehicle, requirement, policy, rules) => ({ id, label, vehicle, requirement, policy, live: true, engine: 'personnel-rules', stationTypes: [], buildingTypeIds: FIRE_PROFILE_BUILDING_TYPE_IDS, rules }); const liveSarProfile = (id, label, vehicle, requirement, policy, rules, buildingTypeIds) => ({ id, label, vehicle, requirement, policy, live: true, engine: 'personnel-rules', stationTypes: [], buildingTypeIds, rules }); const liveMedicalProfile = ( id, label, vehicle, requirement, policy, rules, buildingTypeIds ) => ({ id, label, vehicle, requirement, policy, live: true, engine: 'personnel-rules', stationTypes: [], buildingTypeIds, rules }); const PERSONNEL_SERVICE_DEFINITIONS = {
        medical: { label: 'Medical', icon: '🚑', profiles: [ { id: 'critical_care', label: 'Critical Care', vehicle: 'Normal Ambulance', requirement: '1 Critical Care-trained staff per Ambulance', policy: 'LIVE ENGINE: Critical Care is used only for normal Ambulances. Existing assignments are preserved and vehicles are safely topped up to 1 trained staff.', live: true, engine: 'medical-critical-care', stationTypes: ['AMBULANCE'] }, liveMedicalProfile( 'ambulance_officer', 'Ambulance Officer', 'Ambulance Officer vehicle', '1 Ambulance Officer-trained member per vehicle', 'LIVE: fills each exact type-34 Ambulance Officer vehicle to 1/1 with ems_mobile_command-trained personnel.', [MEDICAL_RULES.ambulanceOfficer], MEDICAL_PROFILE_BUILDING_TYPE_IDS.ambulanceOfficer ), liveMedicalProfile( 'hart', 'HART Training', 'PRV / SRV / ATV Carrier', '2 HART-trained personnel per vehicle', 'LIVE: fills exact type-27 PRVs, type-28 SRVs and type-30 ATV Carriers to 2/2 with hazard_response_ems-trained personnel.', [MEDICAL_RULES.hart], MEDICAL_PROFILE_BUILDING_TYPE_IDS.hart ), liveMedicalProfile( 'midwifery', 'Midwifery Training', 'Community Midwife vehicle', '2 Midwifery-trained personnel per vehicle', 'LIVE: fills each exact type-95 Community Midwife vehicle to 2/2 with midwife-trained personnel.', [MEDICAL_RULES.midwifery], MEDICAL_PROFILE_BUILDING_TYPE_IDS.midwifery ), liveMedicalProfile( 'sort', 'SORT Training', 'CBRN Vehicle / Mass Casualty Equipment', '2 SORT-trained personnel per vehicle', 'LIVE: fills exact type-32 CBRN Vehicles and type-33 Mass Casualty Equipment to 2/2 with special_operation_response-trained personnel.', [MEDICAL_RULES.sort], MEDICAL_PROFILE_BUILDING_TYPE_IDS.sort ), liveMedicalProfile( 'specialist_paramedic', 'Specialist Paramedic Training', 'Specialist Paramedic RRV', '2 Specialist Paramedic-trained personnel per vehicle', 'LIVE: fills each exact type-96 Specialist Paramedic RRV to 2/2 with paramedic_advanced-trained personnel.', [MEDICAL_RULES.specialistParamedic], MEDICAL_PROFILE_BUILDING_TYPE_IDS.specialistParamedic ), liveMedicalProfile( 'tactical_command', 'Tactical Command Course', 'Ambulance Control Unit', '2 Tactical Command-trained personnel per vehicle', 'LIVE: fills each exact type-31 Ambulance Control Unit to 2/2 with elw2_ems-trained personnel. ATV Carriers remain HART-only.', [MEDICAL_RULES.tacticalCommand], MEDICAL_PROFILE_BUILDING_TYPE_IDS.tacticalCommand ), { id: 'all_medical', label: 'Run all Medical profiles', vehicle: 'All mapped medical vehicle groups', requirement: 'Specialist profiles first; Critical Care Ambulances last', policy: 'LIVE BATCH: preserves current assignments, fills every exact specialist medical vehicle first, fills normal Ambulances with Critical Care personnel last, then verifies the station-wide result.', live: true, engine: 'personnel-rules', stationTypes: [], buildingTypeIds: MEDICAL_PROFILE_BUILDING_TYPE_IDS.all, rules: MEDICAL_ALL_RULES, batch: true } ] },
        fire: { label: 'Fire / Airfield', icon: '🚒✈️', profiles: [ liveFireProfile('fire_aircraft_rescue', 'Aircraft Rescue and Firefighting', 'Major Foam Tender / RIV / Airfield Command / Rescue Stairs', 'Foam and RIV 4/4; Command and Rescue Stairs 2/2', 'LIVE: fills exact Airfield types 75 and 76 to 4 ARFF-trained personnel and types 77 and 78 to 2 while preserving existing occupants.', [FIRE_RULES.arffFoam, FIRE_RULES.arffRiv, FIRE_RULES.arffCommand, FIRE_RULES.arffStairs]), liveFireProfile('fire_co_responder', 'Co-Responder Training', 'Co-Responder Vehicle', '1 Co-Responder-trained member per vehicle', 'LIVE: fills each exact type-18 Co-Responder Vehicle to 1/1 with coresponder-trained personnel.', [FIRE_RULES.coResponder]), liveFireProfile('fire_drone_operator', 'Drone Operator Training', 'Fire Station Drone Vehicle', '2 Drone Operators per vehicle', 'LIVE: fills each exact type-90 Fire Station Drone Vehicle to 2/2 with drone-trained personnel.', [FIRE_RULES.drone]), liveFireProfile('fire_hazmat', 'HazMat Unit', 'Operational Support Unit (OSU)', '6 HazMat-trained personnel per OSU', 'LIVE: fills each exact type-39 Fire OSU with 6 gw_gefahrgut-trained personnel. Type-7 HazMat Units are excluded.', [FIRE_RULES.hazmatOsu]), liveFireProfile('fire_high_volume_pump', 'High Volume Pump Training', 'Prime Mover linked to an HVP pod', '2 High Volume Pump-trained members per linked Prime Mover', 'LIVE: reads the station vehicle API and fills only an exact type-40 Prime Mover linked to a type-50 HVP pod. Ambiguous links are skipped.', [FIRE_RULES.highVolumePump]), liveFireProfile('fire_lifeguard', 'Lifeguard Training', 'Light 4x4 linked to a Boat Trailer', '4 Lifeguards per linked Light 4x4', 'LIVE: reads the station vehicle API and fills only an exact type-73 Light 4x4 linked to a type-74 Boat Trailer. Ambiguous links are skipped.', [FIRE_RULES.lifeguard]), liveFireProfile('fire_mobile_command', 'Level 1 Incident Commander Training', 'Incident Command and Control Unit (ICCU)', '3 Level 1 Incident Commanders per ICCU', "LIVE: fills each exact type-15 ICCU with 3 elw2-trained personnel while preserving its remaining seats.", [FIRE_RULES.incidentCommand]), liveFireProfile('fire_railway', 'Railway Fire', 'RRU', '2 Railway Fire-trained personnel per RRU', 'LIVE: fills each exact type-107 RRU to 2/2 with railway_fire-trained personnel.', [FIRE_RULES.railway]), { id: 'all_fire', label: 'Run all Fire / Airfield profiles', vehicle: 'All mapped Fire and Airfield vehicle groups', requirement: 'Process all verified Fire and Airfield profiles in safe priority order', policy: 'LIVE BATCH: preserves current occupants, resolves actual trailer and pod links, merges overlapping requirements onto one crew, and verifies every processed vehicle.', live: true, engine: 'personnel-rules', stationTypes: [], buildingTypeIds: FIRE_PROFILE_BUILDING_TYPE_IDS, rules: FIRE_ALL_RULES, batch: true, mergeOverlappingVehicleRules: true } ] },
        police: { label: 'Police', icon: '🚓', profiles: [ livePoliceProfile('police_bomb_disposal', 'Bomb Disposal', 'EOD Response, Medium and Heavy vehicles', 'Fill each mapped EOD vehicle to its verified maximum with Bomb Disposal personnel', 'LIVE: EOD Commander vehicles are processed first by Run all Police, then Response 4/4, Medium 3/3 and Heavy 2/2. Existing assignments are preserved.', [POLICE_RULES.eodResponse, POLICE_RULES.eodMedium, POLICE_RULES.eodHeavy], ['EOD']), livePoliceProfile('police_dog_handling', 'Dog handling', 'Dog Support Unit', 'At least 1 Dog Handler per DSU', 'LIVE: safely meets the game-confirmed minimum of one Dog Handler per DSU without moving existing staff.', [POLICE_RULES.dog]), livePoliceProfile('police_drone_operator', 'Drone Operator Training', 'Police Drone Vehicle', '2 Drone Operators per Police Drone Vehicle', 'LIVE: fills Police Drone Vehicles to 2/2. Search Advisor dual-trained personnel are preserved where possible.', [POLICE_RULES.drone]), livePoliceProfile('police_eod_commander', 'EOD Commander', 'EOD Commander Vehicle', '2 EOD Commanders per vehicle', 'LIVE: fills EOD Commander vehicles to 2/2 before general Bomb Disposal vehicles in the full Police run.', [POLICE_RULES.eodCommander], ['EOD']), livePoliceProfile('police_firearms', 'Firearms training', 'Multi-Role Armoured Vehicle', '6 Firearms-trained officers per MRAV', 'LIVE: fills every MRAV to 6/6 with Firearms-trained personnel and preserves Roads Policing dual-trained officers where possible.', [POLICE_RULES.firearms]), livePoliceProfile( 'police_public_order_1', 'Level 1 Public Order Training', 'Normal Police IRV', '2 Level 1 Public Order officers per IRV', 'LIVE INDIVIDUAL PROFILE: checks and assigns Level 1 Public Order training only. Other Police qualifications do not affect this result.', [ POLICE_RULES .publicOrderLevel1 ] ), livePoliceProfile( 'police_public_order_2', 'Level 2 Public Order Training', 'Normal Police IRV', '2 Level 2 Public Order officers per IRV', 'LIVE INDIVIDUAL PROFILE: checks and assigns Level 2 Public Order training only. Other Police qualifications do not affect this result.', [ POLICE_RULES .publicOrderLevel2 ] ), livePoliceProfile('police_marine_bomb_disposal', 'Marine Bomb Disposal', 'Marine EOD Response and Equipment vehicles', 'Response 4/4; Equipment Van 3/3', 'LIVE: fills Marine EOD Response vehicles to 4/4 and Equipment Vans to 3/3 with Marine Bomb Disposal personnel.', [POLICE_RULES.marineResponse, POLICE_RULES.marineEquipment], ['EOD']), livePoliceProfile('police_mobile_operations_management', 'Mobile Operations Management', 'EIU', '2 Mobile Operations Managers per EIU', 'LIVE: fills each EIU to 2/2 with railway_police_command-trained personnel.', [POLICE_RULES.mobileOperations]), livePoliceProfile('police_mounted', 'Mounted Training', 'Mounted Unit', 'At least 1 Mounted Officer per vehicle', 'LIVE: meets the verified native minimum of one Mounted Officer per Mounted Unit. It does not fill the remaining passenger seats.', [POLICE_RULES.mounted]), livePoliceProfile('police_inspector', 'Police Inspector Training', 'Normal Police IRV', '2 Police Inspectors per allocated IRV', 'LIVE: uses normal IRVs and fills allocated vehicles to 2/2 with police_inspector-trained officers.', [POLICE_RULES.inspector]), livePoliceProfile( 'police_medic', 'Police Medic Training', 'Normal Police IRV', '2 Police Medics per IRV', 'LIVE INDIVIDUAL PROFILE: checks and assigns Police Medic training only. Run all Police profiles retains the combined four-course crew rule.', [ POLICE_RULES .publicOrderMedic ] ), livePoliceProfile('police_search_advisor', 'Police Search Advisor Training', 'Police Drone Vehicle', '2 dual-trained Drone/Search Advisor personnel', 'LIVE: both personnel must hold drone and search_and_rescue training.', [POLICE_RULES.searchAdvisor]), livePoliceProfile( 'police_sergeant', 'Police Sergeant Training', 'Normal Police IRV', '2 Police Sergeants per IRV', 'LIVE INDIVIDUAL PROFILE: checks and assigns Police Sergeant training only. Run all Police profiles retains the combined four-course crew rule.', [ POLICE_RULES .publicOrderSergeant ] ), livePoliceProfile('police_aviation', 'Police aviation', 'Police Helicopter', '3 Police Aviation personnel per helicopter', 'LIVE: fills each Police Helicopter to 3/3 with polizeihubschrauber-trained personnel.', [POLICE_RULES.aviation], ['AIR']), livePoliceProfile('police_railway', 'Railway Policing', 'Railway Policing IRV', '2 Railway Police Officers per IRV', 'LIVE: fills Railway Unit IRVs to 2/2 with railway_police-trained personnel and preserves Mobile Operations Managers where possible.', [POLICE_RULES.railway]), livePoliceProfile('police_roads', 'Roads Policing Officer Training', 'Armed Traffic Car', '2 dual-trained Roads Policing + Firearms officers', 'LIVE: both officers must hold traffic_police and swat.', [POLICE_RULES.roads]), { id: 'all_police', label: 'Run all Police profiles', vehicle: 'All verified Police, Aviation and EOD vehicle groups', requirement: 'Process verified profiles in safe reservation order', policy: 'LIVE BATCH: preserves current assignments, assigns specialist and dual-trained roles first, allocates shared IRV/Drone pools safely, then verifies the station-wide result.', live: true, engine: 'police', stationTypes: ['POLICE', 'AIR', 'EOD'], rules: POLICE_ALL_RULES, batch: true } ] },
        coastguard: { label: 'SAR / Mountain Rescue / Coastguard', icon: '🌊⛰️', profiles: [ liveSarProfile('sar_cave_rescue', 'Cave Rescue Training', 'SAR or Mountain Rescue 4x4', '4 Cave Rescue Specialists per vehicle', 'LIVE: fills exact type-93 and type-99 4x4 vehicles to their live configured 4-seat maximum with mountain_cave_rescue-trained personnel.', [SAR_RULES.caveRescue], SAR_PROFILE_BUILDING_TYPE_IDS.caveRescue), liveSarProfile('sar_coastal_air_rescue', 'Coastal Air Rescue Operations Training', 'Coastguard Rescue Helicopter', '4 Coastal Air Rescue Pilots per helicopter', 'LIVE: fills exact type-64 and type-65 Coastguard Rescue Helicopters to 4/4 with coastal_rescue_pilot-trained personnel.', [SAR_RULES.coastalAir], SAR_PROFILE_BUILDING_TYPE_IDS.coastalAir), liveSarProfile('sar_coastal_command', 'Coastal Command Training', 'Coastguard Commander', '5 Coastal Commanders per vehicle', 'LIVE: fills each exact type-60 Coastguard Commander to 5/5 with coastal_command-trained personnel.', [SAR_RULES.coastalCommand], SAR_PROFILE_BUILDING_TYPE_IDS.coastalCommand), liveSarProfile('sar_search_advisor', 'Coastguard Search Advisor Training', 'Operational Support Van', '3 Search Advisors per vehicle', 'LIVE: fills each exact type-86 Operational Support Van to 3/3 with search_and_rescue-trained personnel.', [SAR_RULES.searchAdvisor], SAR_PROFILE_BUILDING_TYPE_IDS.searchAdvisor), liveSarProfile('sar_dog_handling', 'Dog handling', 'Search Dog Unit', '1 Search Dog Handler per vehicle', 'LIVE: fills exact type-101 and type-102 Search Dog Units to 1/1 with rescue_dogs-trained personnel.', [SAR_RULES.dogHandling], SAR_PROFILE_BUILDING_TYPE_IDS.dogHandling), liveSarProfile('sar_drone_operator', 'Drone Operator Training', 'SAR HQ Drone Vehicle', '2 Drone Operators per vehicle', 'LIVE: fills each exact type-89 SAR HQ Drone Vehicle to 2/2 with drone-trained personnel.', [SAR_RULES.drone], SAR_PROFILE_BUILDING_TYPE_IDS.drone), liveSarProfile('sar_flood_first_responder', 'Flood First Responder Training', 'Vehicle linked to a Flood Rescue trailer', 'Fill every seat of the actual linked towing vehicle', 'LIVE: resolves type-61 and type-88 flood trailers through the station API, then fills only their actual eligible towing vehicle with flood_equipment-trained personnel. Ambiguous links are skipped.', [SAR_RULES.floodCrv, SAR_RULES.floodMud, SAR_RULES.floodRope, SAR_RULES.floodCommander, SAR_RULES.floodSupport, SAR_RULES.floodLifeboat4x4, SAR_RULES.floodControlVan, SAR_RULES.floodSupportVan, SAR_RULES.floodDrone, SAR_RULES.floodRrv], SAR_PROFILE_BUILDING_TYPE_IDS.flood), liveSarProfile('sar_hovercraft_commander', 'Hovercraft Commander Training', 'Hovercraft Transporter linked to a Hovercraft Trailer', '3 Hovercraft Commanders per linked transporter', 'LIVE: fills only an exact type-72 Hovercraft Transporter linked to a type-71 trailer, using the live 3-seat maximum from supplied evidence.', [SAR_RULES.hovercraft], SAR_PROFILE_BUILDING_TYPE_IDS.hovercraft), liveSarProfile('sar_jet_ski', 'Jet Ski Handling', 'Quadbike / 4x4 linked to a Rescue Watercraft Trailer', 'Quadbike: 2 crew; 4x4: 4 crew', 'Fills the actual vehicle linked to a Rescue Watercraft Trailer. Lifeguard vehicles require both Lifeguard and Jet Ski training. Ambiguous links are skipped.', [SAR_RULES.jetSki, SAR_RULES.lifeguardQuadJet, SAR_RULES.lifeguard4x4Jet], SAR_PROFILE_BUILDING_TYPE_IDS.jetSki), liveSarProfile('sar_lifeboat_operations', 'Lifeboat Operations Training', 'ILB / ALB', 'ILB 4/4; ALB 7/7', 'LIVE: fills exact type-68 ILBs to 4/4 and type-69 ALBs to 7/7 with ocean_navigation-trained personnel.', [SAR_RULES.lifeboatIlb, SAR_RULES.lifeboatAlb], SAR_PROFILE_BUILDING_TYPE_IDS.lifeboat), liveSarProfile('sar_lifeguard', 'Lifeguard Training', 'Lifeguard Quadbike / Lifeguard 4x4 / boat towing 4x4', 'Quadbike: 2 crew; Lifeguard 4x4: 4 crew', 'Fills Lifeguard Quadbikes and Lifeguard 4x4s with Lifeguard-trained crew. Existing type-66 vehicles still require a linked Inland Rescue Boat.', [SAR_RULES.lifeguard, SAR_RULES.lifeguardQuad, SAR_RULES.lifeguard4x4], SAR_PROFILE_BUILDING_TYPE_IDS.lifeguard), liveSarProfile('sar_mud_rescue', 'Mud Rescue Training', 'Coastguard Mud Rescue Unit', '5 Mud Rescue Operators per vehicle', 'LIVE: fills each exact type-58 Mud Rescue Unit to 5/5 with coastal_mud_rescue-trained personnel.', [SAR_RULES.mudRescue], SAR_PROFILE_BUILDING_TYPE_IDS.mudRescue), liveSarProfile('sar_rope_rescue', 'Rope Rescue Training', 'Coastguard Rope Rescue Unit', '5 Rope Rescue Operators per vehicle', 'LIVE: fills each exact type-59 Rope Rescue Unit to 5/5 with gw_hoehenrettung-trained personnel.', [SAR_RULES.ropeRescue], SAR_PROFILE_BUILDING_TYPE_IDS.ropeRescue), liveSarProfile('sar_search_management', 'Search Management Training', 'SAR or Mountain Rescue Control Van', '3 SAR Commanders per vehicle', 'LIVE: fills exact type-85 and type-100 Control Vans to 3/3 with search_and_rescue_command-trained personnel.', [SAR_RULES.searchManagement], SAR_PROFILE_BUILDING_TYPE_IDS.searchManagement), { id: 'all_sar', label: 'Run all SAR / Mountain Rescue profiles', vehicle: 'All mapped SAR, Mountain Rescue, Coastguard and Water Rescue vehicle groups', requirement: 'Process all verified profiles and combine overlapping training on each crew', policy: 'LIVE BATCH: preserves current occupants, resolves each actual trailer-to-tractor link, combines overlapping qualifications on the same vehicle, and verifies the station-wide result.', live: true, engine: 'personnel-rules', stationTypes: [], buildingTypeIds: SAR_PROFILE_BUILDING_TYPE_IDS.all, rules: SAR_ALL_RULES, batch: true, mergeOverlappingVehicleRules: true } ] },
        all_services: { label: 'All Services', icon: '🧭', profiles: [{ id: 'all_services_profiles', label: 'Run all service profiles — future option', vehicle: 'All supported service vehicles', requirement: 'Process services and profiles in safe priority order', policy: 'This future option will only be enabled after each individual service is fully tested and live.', live: false, stationTypes: [] }] } }; const TYPE_ID_TO_VEHICLE_TYPE = globalThis.NexusUnitNaming.typeNames;

    const VEHICLE_INFO = globalThis.NexusUnitNaming.rules;

    const UNIT_CLASS_ALL = 'ALL'; const UNIT_CLASS_TYPE_IDS_BY_STATION_TYPE = Object.freeze({ AMBULANCE: Object.freeze([ '5', '10', '27', '28', '30', '31', '33', '34', '96', '97', '98' ]), FIRE: Object.freeze([ '3', '4', '6', '7', '15', '16', '17', '26', '29', '35', '36', '38', '39', '107' ]), POLICE: Object.freeze([ '8', '11', '12', '13', '19', '20', '24', '25', '51', '52', '54', '55', '56', '91', '108', '115', '116' ]), AIR: Object.freeze([ '9', '11', '65' ]), AIRFIELD: Object.freeze([ '73', '75', '76', '77', '78', '79', '80', '81' ]), COASTGUARD: Object.freeze([ '57', '58', '59', '60', '61', '62', '63', '65', '66', '67', '70', '71', '72', '118', '119' ]), RNLI: Object.freeze([ '67', '68', '69', '70', '74' ]), SAR: Object.freeze([ '61', '62', '63', '66', '70', '71', '72', '85', '86', '87', '88', '89', '93', '99', '101', '102' ]), EOD: Object.freeze([ '109', '110', '111', '112', '113', '114' ]), RECOVERY: Object.freeze([ '105', '106' ]) });

    const STATION_TYPES = { ALL: "All station types", AMBULANCE: "Ambulance", HART: "HART", FIRE: "Fire", POLICE: "Police", AIR: "Air / Heli", COASTGUARD: "Coastguard", RNLI: "RNLI / Lifeboat", SAR: "SAR", AIRFIELD: "Airfield", EOD: "EOD / Bomb", RECOVERY: "Recovery", OTHER: "Other" }; const STATION_NAMING_MODE_TOWN_ONLY = 'TOWN_ONLY';

    // MissionChief's own building type IDs.
    const STATION_BUILDING_TYPE_INFO = {
        0:  { stationType: 'FIRE',       suffix: '-FS',   label: 'Fire station' },
        18: { stationType: 'FIRE',       suffix: '-FS',   label: 'Small fire station' },
        2:  { stationType: 'AMBULANCE',  suffix: '-AS',   label: 'Ambulance station' },
        20: { stationType: 'AMBULANCE',  suffix: '-AS',   label: 'Small ambulance station' },
        25: { stationType: 'HART',       suffix: '-HART', label: 'HART base' },
        6:  { stationType: 'POLICE',     suffix: '-PS',   label: 'Police station' },
        19: { stationType: 'POLICE',     suffix: '-PS',   label: 'Small police station' },
        5:  { stationType: 'AIR',        suffix: '-AA',   label: 'Air ambulance station' },
        13: { stationType: 'AIR',        suffix: '-PH',   label: 'Police helicopter station' },
        22: {
            stationType: 'OTHER',
            suffix: '',
            namingMode: STATION_NAMING_MODE_TOWN_ONLY,
            label: 'Response location'
        },
        27: { stationType: 'RNLI',       suffix: '-RNLI', label: 'RNLI / lifeboat station' },
        37: { stationType: 'COASTGUARD', suffix: '-LG', label: 'Lifeguard station' },
        28: { stationType: 'COASTGUARD', suffix: '-CG',   label: 'Coastguard station' },
        30: { stationType: 'COASTGUARD', suffix: '-CG',   label: 'Coastguard helicopter station' },
        31: { stationType: 'SAR',        suffix: '-SAR',  label: 'Search and Rescue HQ' },
        33: { stationType: 'SAR',        suffix: '-SAR',  label: 'Mountain Rescue station' },
        34: { stationType: 'RECOVERY',   suffix: '-REC',  label: 'Recovery station' },
        35: { stationType: 'EOD',        suffix: '-EOD',  label: 'EOD / bomb disposal station' }
    };

    const NAMING_SERVICES = Object.freeze({
        ALL: 'All services',
        FIRE: 'Fire & Rescue',
        AMBULANCE: 'Ambulance',
        POLICE: 'Police',
        SAR: 'Search & Rescue / Coastguard',
        RECOVERY: 'Recovery',
        OTHER: 'Other'
    });
    const NAMING_SERVICE_BY_BUILDING_TYPE_ID = Object.freeze({
        0: 'FIRE',
        18: 'FIRE',
        2: 'AMBULANCE',
        20: 'AMBULANCE',
        25: 'AMBULANCE',
        5: 'AMBULANCE',
        6: 'POLICE',
        19: 'POLICE',
        13: 'POLICE',
        22: 'OTHER',
        35: 'POLICE',
        27: 'SAR',
        28: 'SAR',
        30: 'SAR',
        31: 'SAR',
        33: 'SAR',
        34: 'RECOVERY'
    });
    const STATE = {
        running: false,
        paused: false,
        stopped: false,
        debug: false,
        stations: [],
        filteredStations: [],
        stationIndex: 0,
        renamedCount: 0,
        skippedCount: 0,
        mode: "all",
        selectedUnitClass: UNIT_CLASS_ALL,
        runId: 0,
        activeControllers: new Set()
    };
    const STATION_STATE = {
        running: false,
        paused: false,
        stopped: false,
        debug: false,
        stations: [],
        filteredStations: [],
        queue: [],
        selectedHref: '',
        mode: 'all',
        action: 'preview',
        stationIndex: 0,
        renamedCount: 0,
        skippedCount: 0,
        previewedCount: 0,
        buildingCoordinateCache: new Map(),
        buildingDataPromise: null,
        activeControllers: new Set(),
        nameSequencesByBase: new Map()
    };
    const NAMING_DISPATCH_CENTRE_ALL = 'ALL';
    const NAMING_DISPATCH_CENTRE_UNASSIGNED = '__UNASSIGNED__';
    const NAMING_DISPATCH_CENTRE_STATE = {
        loadPromise: null,
        loaded: false,
        listPromise: null,
        listLoaded: false,
        byBuildingId: new Map(),
        labelsById: new Map(),
        lastListError: '',
        lastAssignmentError: ''
    };
    const PERSONNEL_STATE = {
        running: false,
        paused: false,
        stopped: false,
        debug: false,
        stations: [],
        filteredStations: [],
        queue: [],
        selectedHref: '',
        service: 'medical',
        profile: 'critical_care',
        mode: 'all',
        action: 'preview',
        registerBuilding: false,
        configuredUnitsRequired: 0,
        unitsRequired: 0,
        unitsFulfilled: 0,
        unitTargetReached: false,
        stationsTargetMet: 0,
        stationsTargetShort: 0,
        stationIndex: 0,
        completedStations: 0,
        skippedStations: 0,
        checkedVehicles: 0,
        plannedCount: 0,
        assignedCount: 0,
        trainingShortfall: 0,
        assignmentShortfall: 0,
        reports: [],
        currentReport: '',
        currentStationReport: '',
        lastStationReport: null,
        activeController: null,
        lastRequestAt: 0
    };
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    function registerToolLifecycleCleanup(cleanup) {
        if (typeof cleanup === 'function') {
            TOOL_LIFECYCLE_CLEANUPS.add(cleanup);
        }
        return cleanup;
    }
    function runToolLifecycleCleanup() {
        if (TOOL_LIFECYCLE_CLEANED) return;
        TOOL_LIFECYCLE_CLEANED = true;
        STATE.stopped = true;
        STATE.paused = false;
        for (const controller of STATE.activeControllers) {
            try {
                controller.abort();
            } catch (_error) {}
        }
        STATE.activeControllers.clear();
        STATE.stations = [];
        STATE.filteredStations = [];
        STATION_STATE.stopped = true;
        STATION_STATE.paused = false;
        PERSONNEL_STATE.stopped = true;
        PERSONNEL_STATE.paused = false;
        flushPersonnelTrainingRegistry(true);
        PERSONNEL_STATE.registerReader?.cancel();
        if (PERSONNEL_STATE.activeController) {
            try {
                PERSONNEL_STATE.activeController.abort();
            } catch (_error) {}
            PERSONNEL_STATE.activeController = null;
        }
        for (const controller of STATION_STATE.activeControllers) {
            try {
                controller.abort();
            } catch (_error) {}
        }
        STATION_STATE.activeControllers.clear();
        for (const cleanup of [...TOOL_LIFECYCLE_CLEANUPS]) {
            try {
                cleanup();
            } catch (_error) {}
        }
        TOOL_LIFECYCLE_CLEANUPS.clear();
        for (const frameId of TOOL_LOG_SCROLL_FRAMES.values()) {
            try {
                cancelAnimationFrame(frameId);
            } catch (_error) {}
        }
        TOOL_LOG_SCROLL_FRAMES.clear();
        TOOL_UI_ELEMENT_CACHE.clear();
        PERSONNEL_STATION_LINK_BY_HREF.clear();
        PERSONNEL_START_OPTION_BY_HREF.clear();
        PERSONNEL_HIGHLIGHTED_STATION_LINKS.clear();
        STATION_STATE.buildingCoordinateCache.clear();
        STATION_STATE.buildingDataPromise = null;
        NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
        NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
        NAMING_DISPATCH_CENTRE_STATE.loadPromise = null;
        NAMING_DISPATCH_CENTRE_STATE.loaded = false;
        NAMING_DISPATCH_CENTRE_STATE.listPromise = null;
        NAMING_DISPATCH_CENTRE_STATE.listLoaded = false;
        PERSONNEL_STATE.reports = [];
        PERSONNEL_STATE.lastStationReport = null;
        PERSONNEL_STATE.currentReport = '';
        PERSONNEL_STATE.currentStationReport = '';
        PERSONNEL_TRAINING_REGISTRY_CACHE = null;
        PERSONNEL_SHORTFALL_CACHE = [];
        PERSONNEL_SHORTFALL_CACHE_SIZE = -1;
    }
    function getToolElementById(id) {
        const key = String(id || '');
        if (!key) return null;
        const cached = TOOL_UI_ELEMENT_CACHE.get(key);
        if (cached?.isConnected) return cached;
        const element = document.getElementById(key);
        if (element) TOOL_UI_ELEMENT_CACHE.set(key, element);
        else TOOL_UI_ELEMENT_CACHE.delete(key);
        return element;
    }
    function clearBoundedToolLog(logBox) {
        if (!logBox) return;
        const frameId = TOOL_LOG_SCROLL_FRAMES.get(logBox);
        if (frameId != null) {
            try {
                cancelAnimationFrame(frameId);
            } catch (_error) {}
            TOOL_LOG_SCROLL_FRAMES.delete(logBox);
        }
        logBox.replaceChildren();
    }
    function appendBoundedToolLog(logBox, line) {
        if (!logBox || !line) return;
        logBox.appendChild(line);
        if (logBox.childElementCount > TOOL_LOG_MAX_LINES + TOOL_LOG_TRIM_BUFFER) {
            const removeCount = logBox.childElementCount - TOOL_LOG_MAX_LINES;
            for (let index = 0; index < removeCount; index++) {
                logBox.firstElementChild?.remove();
            }
        }
        if (!TOOL_LOG_SCROLL_FRAMES.has(logBox)) {
            const frameId = requestAnimationFrame(() => {
                TOOL_LOG_SCROLL_FRAMES.delete(logBox);
                if (logBox.isConnected) logBox.scrollTop = logBox.scrollHeight;
            });
            TOOL_LOG_SCROLL_FRAMES.set(logBox, frameId);
        }
    }
    function isIosSafariWebsite() {
        const userAgent = String(navigator.userAgent || '');
        const platform = String(navigator.platform || '');
        const isIosDevice = /iP(?:ad|hone|od)/i.test(userAgent)
            || (
                platform === 'MacIntel'
                && Number(navigator.maxTouchPoints || 0) > 1
            );
        const isSafariBrowser = /Safari/i.test(userAgent)
            && !/(?:CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(userAgent);
        return isIosDevice
            && isSafariBrowser
            && /^https?:$/i.test(String(location.protocol || ''));
    }
    const STATION_OVERVIEW_LINK_SELECTOR = [
        'a.lightbox-open.list-group-item.active[href*="/buildings/"]',
        'a.lightbox-open[href*="/buildings/"]',
        '.building_list_li a[href*="/buildings/"]',
        '.building_list a[href*="/buildings/"]',
        '[data-building-id] a[href*="/buildings/"]'
    ].join(',');
    function normaliseStationOverviewHref(value) {
        try {
            const url = new URL(String(value || ''), location.origin);
            if (url.origin !== location.origin) return '';
            const match = url.pathname.match(/^\/buildings\/(\d+)\/?$/);
            return match ? `/buildings/${match[1]}` : '';
        } catch (_error) {
            return '';
        }
    }
    function isGenericStationActionText(value) {
        return /^(?:details?|open|show|view|edit|move|vehicles?|personnel|education|extensions?)$/i
            .test(cleanText(value));
    }
    function getStationOverviewContainer(link) {
        return link?.closest?.(
            '.building_list_li, .building_list, [building_type_id], ' +
            '[data-building-type-id], [data-building-id], [id^="building_"]'
        ) || link?.closest?.('li, .panel, .card, .well') || link?.parentElement || null;
    }
    function readStationBuildingTypeId(link, container = getStationOverviewContainer(link)) {
        const candidates = [
            link?.closest?.('[building_type_id], [data-building-type-id]'),
            container,
            container?.querySelector?.('[building_type_id], [data-building-type-id]')
        ].filter(Boolean);
        for (const candidate of candidates) {
            const raw =
                candidate.getAttribute?.('building_type_id') ??
                candidate.getAttribute?.('data-building-type-id') ??
                candidate.dataset?.buildingTypeId ??
                '';
            if (raw !== '' && Number.isFinite(Number(raw))) return Number(raw);
        }
        return null;
    }
    function scoreStationOverviewLink(link, href) {
        let score = 0;
        if (link.classList?.contains('lightbox-open')) score += 100;
        if (link.matches?.('.list-group-item.active')) score += 70;
        if (normaliseStationOverviewHref(link.getAttribute?.('href')) === href) score += 40;
        const label = cleanText(link.textContent || link.getAttribute?.('aria-label') || '');
        if (label && !isGenericStationActionText(label)) score += 35;
        if (link.offsetParent !== null) score += 10;
        return score;
    }
    function readStationOverviewName(link, container, href) {
        const values = [];
        const add = value => {
            const cleaned = cleanText(value);
            if (!cleaned || isGenericStationActionText(cleaned)) return;
            if (!values.includes(cleaned)) values.push(cleaned);
        };
        add(container?.getAttribute?.('search_attribute'));
        add(container?.getAttribute?.('data-building-name'));
        add(container?.dataset?.buildingName);
        const sameBuildingLinks = container
            ? [...container.querySelectorAll('a[href]')]
                .filter(candidate => normaliseStationOverviewHref(candidate.getAttribute('href')) === href)
                .sort((a, b) => scoreStationOverviewLink(b, href) - scoreStationOverviewLink(a, href))
            : [link];
        sameBuildingLinks.forEach(candidate => {
            add(candidate.getAttribute?.('aria-label'));
            add(candidate.getAttribute?.('title'));
            add(candidate.textContent);
        });
        const nameSelectors = [
            '[data-building-name]',
            '.building_list_title',
            '.building-list-title',
            '.building_name',
            '.building-name',
            '.panel-heading',
            '.card-title',
            'h1', 'h2', 'h3', 'h4'
        ];
        for (const selector of nameSelectors) {
            container?.querySelectorAll?.(selector).forEach(node => {
                add(node.getAttribute?.('data-building-name'));
                add(node.textContent);
            });
        }
        if (!values.length && container) {
            const clone = container.cloneNode(true);
            clone.querySelectorAll(
                'button, .btn, table, tbody, .vehicle, .vehicle_list, ' +
                '[vehicle_id], [data-vehicle-id], a[href*="/vehicles/"]'
            ).forEach(node => node.remove());
            String(clone.textContent || '')
                .split(/[\r\n]+/)
                .map(value => cleanText(value))
                .filter(Boolean)
                .forEach(add);
        }
        return values[0] || `Building ${getBuildingIdFromHref(href) || ''}`.trim();
    }
    function getStationOverviewEntries(root = document) {
        const groups = new Map();
        getNamingDispatchCentreStationRowDocuments(root).forEach(candidateDocument => {
            candidateDocument.querySelectorAll(STATION_OVERVIEW_LINK_SELECTOR).forEach(link => {
                if (link.closest?.('#mc-namer-panel')) return;
                const href = normaliseStationOverviewHref(link.getAttribute?.('href'));
                if (!href) return;
                const container = getStationOverviewContainer(link);
                if (!container && !link.matches?.('.lightbox-open.list-group-item.active')) return;
                const candidates = groups.get(href) || [];
                candidates.push({ link, container });
                groups.set(href, candidates);
            });
        });
        return [...groups.entries()].map(([href, candidates], index) => {
            candidates.sort((a, b) =>
                scoreStationOverviewLink(b.link, href) -
                scoreStationOverviewLink(a.link, href)
            );
            const selected = candidates[0];
            const container = selected.container || getStationOverviewContainer(selected.link);
            return {
                index,
                href,
                buildingId: getBuildingIdFromHref(href),
                displayName: readStationOverviewName(selected.link, container, href),
                buildingTypeId: readStationBuildingTypeId(selected.link, container),
                link: selected.link,
                container
            };
        });
    }
    let namingInventory = null, namingInventoryPromise = null, namingInventoryController = null;
    const STATION_NAMING_DIAGNOSTICS = {startedAt:0,finishedAt:0,requests:0,bytes:0,largestResponse:0,stage:'Idle',recent:[],lastFailure:null};
    function resetStationNamingDiagnostics() {
        Object.assign(STATION_NAMING_DIAGNOSTICS,{startedAt:Date.now(),finishedAt:0,requests:0,bytes:0,largestResponse:0,stage:'Pre-check',recent:[],lastFailure:null});
    }
    function recordStationNamingStep(stage, started, detail = {}) {
        if (!STATION_STATE.debug && !detail.error) return;
        const row = {at:Date.now(),stage,elapsedMs:Math.round(performance.now()-started),...detail};
        if (detail.error) STATION_NAMING_DIAGNOSTICS.lastFailure = row;
        if (STATION_STATE.debug) {
            STATION_NAMING_DIAGNOSTICS.recent.push(row);
            if (STATION_NAMING_DIAGNOSTICS.recent.length > 80) STATION_NAMING_DIAGNOSTICS.recent.shift();
        }
    }
    function downloadStationNamingDiagnostics() {
        const memory = performance.memory;
        const report = {version:'3.0.43.281',namerVersion:'1.3.4',capturedAt:new Date().toISOString(),
            running:STATION_STATE.running,paused:STATION_STATE.paused,stopped:STATION_STATE.stopped,
            stationIndex:STATION_STATE.stationIndex,queued:STATION_STATE.queue.length,
            renamed:STATION_STATE.renamedCount,previewed:STATION_STATE.previewedCount,skipped:STATION_STATE.skippedCount,
            activeRequests:STATION_STATE.activeControllers.size+(namingInventoryController?1:0),
            logLines:document.getElementById('mc-station-log')?.childElementCount||0,
            approximatePageHeapBytes:memory?.usedJSHeapSize||null,heapIsWholePage:true,
            detailedCapture:STATION_STATE.debug,...STATION_NAMING_DIAGNOSTICS};
        const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
        const link=document.createElement('a');link.href=url;link.download='nexus-renamer-'+Date.now()+'.json';link.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    async function precheckStationNamingQueue() {
        const started=performance.now();setStationUiValue('status','Pre-checking selected stations');
        const rows=await loadNamingInventory(true);
        if (STATION_STATE.stopped) return;
        const byId=new Map(rows.map(b=>[String(b.id),b]));
        const seen=new Set();
        for (let i=0;i<STATION_STATE.queue.length;i++) {
            const station=STATION_STATE.queue[i],id=String(station.buildingId),fresh=byId.get(id);
            if (!fresh || seen.has(id) || Number(fresh.building_type)!==Number(station.buildingTypeId)) throw Error('Selected station changed or is unavailable. Refresh Stations before starting again.');
            seen.add(id);station.displayName=cleanText(fresh.caption);
            station.precheckedCoordinates=normalizeCoordinates(fresh.latitude,fresh.longitude);
            if ((i+1)%100===0) { await sleep(8);if (STATION_STATE.stopped) return; }
        }
        const sequences=new Map();
        for (let i=0;i<rows.length;i+=100) {
            const chunk=rows.slice(i,i+100).map(b=>({buildingId:String(b.id),displayName:b.caption}));
            createStationNameSequenceRegistry(chunk,sequences);
            setStationUiValue('status',`Pre-checking names ${Math.min(i+100,rows.length)} / ${rows.length}`);
            await sleep(8);if (STATION_STATE.stopped) return;
        }
        STATION_STATE.nameSequencesByBase=sequences;
        STATION_NAMING_DIAGNOSTICS.stage='Pre-check complete';
        recordStationNamingStep('pre-check',started,{stations:STATION_STATE.queue.length,inventory:rows.length});
        stationLog(`Pre-check complete: ${STATION_STATE.queue.length} selected stations. Processing one station at a time.`,'info');
    }
    const namingPlayer = () => document.querySelector('#navbar_profile_link')?.getAttribute('href')?.match(/\/profile\/(\d+)/)?.[1] || '';
    let namingInventoryPlayer = '';
    async function loadNamingInventory(force = false) {
        const player = namingPlayer();
        if (!player) throw Error('Sign in to MissionChief to load your stations.');
        if (namingInventoryPromise) return namingInventoryPromise;
        if (!force && namingInventory && namingInventoryPlayer === player) return namingInventory;
        namingInventory = null;
        namingInventoryPromise = (async () => {
            const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
            namingInventoryController = controller;
            try {
                const response = await fetch('/api/buildings', {credentials:'same-origin', cache:'no-store', redirect:'error', signal:controller.signal});
                if (!response.ok) throw Error('Station list returned HTTP '+response.status);
                const text = await response.text();
                if (text.length > 12*1024*1024) throw Error('Station inventory is too large.');
                const rows = JSON.parse(text), ids = new Set();
                if (!Array.isArray(rows) || rows.length > 20000) throw Error('Station inventory is unavailable.');
                for (const row of rows) {
                    if (!row || !/^[1-9]\d*$/.test(String(row.id)) || ids.has(String(row.id)) || !Number.isInteger(Number(row.building_type)) || row.building_type == null || row.building_type === '' || typeof row.caption !== 'string') throw Error('Station inventory is incomplete.');
                    ids.add(String(row.id));
                }
                if (namingPlayer() !== player) throw Error('Player changed. Refresh the game before using Renamer.');
                namingInventory = rows; namingInventoryPlayer = player; return rows;
            } finally { clearTimeout(timer); namingInventoryController = null; }
        })().finally(() => { namingInventoryPromise = null; });
        return namingInventoryPromise;
    }
    function getNamingStationEntries() {
        if (!namingInventory || namingPlayer() !== namingInventoryPlayer) return [];
        return namingInventory.map((b,index) => ({index,href:'/buildings/'+b.id,buildingId:String(b.id),displayName:cleanText(b.caption),buildingTypeId:Number(b.building_type)}));
    }
    function getNamingBuildingRecordId(building) {
        const raw = building?.id ?? building?.building_id ?? building?.buildingId ?? '';
        if (raw === '' || raw == null) return '';
        return String(raw);
    }
    function getNamingDispatchCentreIdFromRecord(building) {
        const raw =
            building?.leitstelle_building_id ??
            building?.leitstelleBuildingId ??
            building?.dispatch_center_id ??
            building?.dispatchCenterId ??
            building?.dispatch_centre_id ??
            building?.dispatchCentreId ??
            '';
        if (raw === '' || raw == null) return '';
        const numeric = Number(raw);
        if (Number.isFinite(numeric) && numeric <= 0) return '';
        return String(raw);
    }
    function getNamingBuildingRecordLabel(building, fallbackId = '') {
        return cleanText(
            building?.caption ??
            building?.name ??
            building?.building_name ??
            building?.buildingName ??
            ''
        ) || `Dispatch Centre ${fallbackId}`.trim();
    }
    function getNamingStationRowBuildingId(row) {
        if (!row) return '';
        const explicit =
            row.getAttribute?.('building_id') ||
            row.getAttribute?.('data-building-id') ||
            row.dataset?.buildingId ||
            '';
        if (explicit) return String(explicit);
        const rowId = String(row.id || '').match(/^building_list_(\d+)$/)?.[1] || '';
        if (rowId) return rowId;
        const nested =
            row.querySelector?.('[building_id]')?.getAttribute?.('building_id') ||
            row.querySelector?.('[data-building_id]')?.getAttribute?.('data-building_id') ||
            '';
        return nested ? String(nested) : '';
    }
    function getNamingStationRowDispatchCentreId(row) {
        if (!row) return '';
        const raw =
            row.getAttribute?.('leitstelle_building_id') ||
            row.getAttribute?.('data-leitstelle-building-id') ||
            row.dataset?.leitstelleBuildingId ||
            '';
        if (raw === '' || raw == null) return '';
        const normalized = String(raw).trim();
        if (!normalized || /^(?:null|undefined|false)$/i.test(normalized)) return '';
        const numeric = Number(normalized);
        if (Number.isFinite(numeric) && numeric <= 0) return '';
        return normalized;
    }
    function refreshNamingDispatchCentreAssignmentsFromStationRows() {
        NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
        const seenRows = new Set();
        getNamingDispatchCentreStationRowDocuments().forEach(candidateDocument => {
            const rows = [
                ...candidateDocument.querySelectorAll(
                    '.building_list_li, .building_list, [leitstelle_building_id], [data-leitstelle-building-id]'
                )
            ];
            rows.forEach(row => {
                if (!row || seenRows.has(row)) return;
                seenRows.add(row);
                const buildingId = getNamingStationRowBuildingId(row);
                if (!buildingId) return;
                const dispatchCentreId = getNamingStationRowDispatchCentreId(row);
                if (!dispatchCentreId) return;
                NAMING_DISPATCH_CENTRE_STATE.byBuildingId.set(buildingId, dispatchCentreId);
            });
        });
        NAMING_DISPATCH_CENTRE_STATE.loaded = true;
        return true;
    }
    async function loadNamingDispatchCentreData(force = false) {
        try {
            const rows = await loadNamingInventory(force);
            NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
            for (const b of rows) NAMING_DISPATCH_CENTRE_STATE.byBuildingId.set(String(b.id),getNamingDispatchCentreIdFromRecord(b));
            NAMING_DISPATCH_CENTRE_STATE.loaded = true;
            NAMING_DISPATCH_CENTRE_STATE.lastAssignmentError = '';return true;
        } catch(error) {
            NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();NAMING_DISPATCH_CENTRE_STATE.loaded = false;
            NAMING_DISPATCH_CENTRE_STATE.lastAssignmentError = cleanText(error.message);return false;
        }
    }
    function getNamingDispatchCentreId(buildingId) {
        const key = String(buildingId || '');
        return key ? NAMING_DISPATCH_CENTRE_STATE.byBuildingId.get(key) || '' : '';
    }
    function syncNamingStationDispatchCentreAssignments(stations) {
        (stations || []).forEach(station => {
            if (!station) return;
            station.dispatchCentreId = getNamingDispatchCentreId(
                station.buildingId
            );
        });
        return stations || [];
    }
    function stationMatchesNamingDispatchCentre(station, selectedDispatchCentre) {
        const selected = String(selectedDispatchCentre || NAMING_DISPATCH_CENTRE_ALL);
        if (selected === NAMING_DISPATCH_CENTRE_ALL) return true;
        if (selected === NAMING_DISPATCH_CENTRE_UNASSIGNED) {
            return !station?.dispatchCentreId;
        }
        return String(station?.dispatchCentreId || '') === selected;
    }
    function getNamingDispatchCentreIdFromHref(href, allowNested = false) {
        if (!href) return '';
        try {
            const url = new URL(String(href), location.origin);
            if (url.origin !== location.origin) return '';
            const pattern = allowNested ? /^\/buildings\/(\d+)(?:\/|$)/ : /^\/buildings\/(\d+)\/?$/;
            return url.pathname.match(pattern)?.[1] || '';
        } catch (_) {
            return '';
        }
    }
    function extractNamingDispatchCentresFromStationRows(root = document) {
        const centres = new Map();
        if (!root?.querySelectorAll) return centres;
        root.querySelectorAll(
            '.building_list_li[building_type_id="7"], .building_list[building_type_id="7"]'
        ).forEach(row => {
            if (String(row.getAttribute?.('building_type_id') || '').trim() !== '7') return;
            const rowId = String(row.id || '').match(/^building_list_(\d+)$/)?.[1] || '';
            const detailsLink = row.querySelector?.('a[href^="/buildings/"]');
            const hrefId = String(getNamingDispatchCentreIdFromHref(
                detailsLink?.getAttribute?.('href') || '',
                false
            ) || '');
            if (rowId && hrefId && rowId !== hrefId) return;
            const id = rowId || hrefId;
            if (!id) return;
            const label =
                cleanText(row.getAttribute?.('search_attribute') || '') ||
                cleanText(
                    row.querySelector?.('.building_list_caption .map_position_mover')?.textContent || ''
                ) ||
                cleanText(row.querySelector?.('.map_position_mover')?.textContent || '');
            if (!label) return;
            centres.set(String(id), label);
        });
        return centres;
    }
    function extractNamingDispatchCentresFromStationControls(root = document) {
        const centres = new Map();
        if (!root?.querySelectorAll) return centres;
        root.querySelectorAll('.leitstelle_selection[leitstelle]').forEach(control => {
            const id = String(control.getAttribute?.('leitstelle') || '').trim();
            if (!/^\d+$/.test(id) || Number(id) <= 0) return;
            const label =
                cleanText(control.getAttribute?.('search_attribute') || '') ||
                cleanText(control.textContent || '');
            if (!label) return;
            centres.set(id, label);
        });
        return centres;
    }
    function getNamingDispatchCentreStationRowDocuments(root = document) {
        const documents = [];
        const queue = [];
        const queuedDocuments = new Set();
        const seenDocuments = new Set();
        const enqueue = candidate => {
            if (
                !candidate?.querySelectorAll ||
                seenDocuments.has(candidate) ||
                queuedDocuments.has(candidate)
            ) return;
            queuedDocuments.add(candidate);
            queue.push(candidate);
        };
        enqueue(root);
        if (root === document) {
            try { enqueue(window.top?.document); } catch (_) {}
        }
        while (queue.length && documents.length < 32) {
            const candidateDocument = queue.shift();
            queuedDocuments.delete(candidateDocument);
            if (!candidateDocument || seenDocuments.has(candidateDocument)) continue;
            seenDocuments.add(candidateDocument);
            documents.push(candidateDocument);
            try {
                candidateDocument.querySelectorAll('iframe').forEach(frame => {
                    try {
                        enqueue(
                            frame.contentDocument ||
                            frame.contentWindow?.document ||
                            null
                        );
                    } catch (_) {}
                });
            } catch (_) {}
        }
        return documents;
    }
    function collectNamingDispatchCentresFromStationRows() {
        const centres = new Map();
        getNamingDispatchCentreStationRowDocuments().forEach(candidateDocument => {
            extractNamingDispatchCentresFromStationControls(candidateDocument).forEach((label, id) => {
                centres.set(String(id), label);
            });
            extractNamingDispatchCentresFromStationRows(candidateDocument).forEach((label, id) => {
                centres.set(String(id), label);
            });
        });
        return centres;
    }
    async function loadNamingDispatchCentreList(force = false) {
        try {
            const rows = await loadNamingInventory(force);
            NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();
            for (const b of rows) if (Number(b.building_type) === 7) NAMING_DISPATCH_CENTRE_STATE.labelsById.set(String(b.id),getNamingBuildingRecordLabel(b,String(b.id)));
            NAMING_DISPATCH_CENTRE_STATE.listLoaded = true;NAMING_DISPATCH_CENTRE_STATE.lastListError = '';return true;
        } catch(error) {
            NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();NAMING_DISPATCH_CENTRE_STATE.listLoaded = false;
            NAMING_DISPATCH_CENTRE_STATE.lastListError = cleanText(error.message);return false;
        }
    }
    function getNamingServiceForStation(station) {
        const buildingTypeId = String(station?.buildingTypeId ?? '');
        const direct = NAMING_SERVICE_BY_BUILDING_TYPE_ID[buildingTypeId];
        if (direct) return direct;
        switch (String(station?.stationType || '')) {
            case 'FIRE':
            case 'AIRFIELD':
                return 'FIRE';
            case 'AMBULANCE':
            case 'HART':
                return 'AMBULANCE';
            case 'POLICE':
            case 'EOD':
                return 'POLICE';
            case 'RNLI':
            case 'COASTGUARD':
            case 'SAR':
                return 'SAR';
            case 'RECOVERY':
                return 'RECOVERY';
            default:
                return 'OTHER';
        }
    }
    function stationMatchesNamingService(station, selectedService) {
        const selected = String(selectedService || 'ALL');
        return selected === 'ALL' || getNamingServiceForStation(station) === selected;
    }
    function populateNamingDispatchCentreFilter(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const previous = select.value || NAMING_DISPATCH_CENTRE_ALL;
        const centres = [...NAMING_DISPATCH_CENTRE_STATE.labelsById.entries()]
            .map(([id, label]) => ({ id: String(id), label: cleanText(label) || `Dispatch Centre ${id}` }))
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
        select.replaceChildren();
        const add = (value, label) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        };
        const available =
            NAMING_DISPATCH_CENTRE_STATE.listLoaded;
        if (!available) {
            add(NAMING_DISPATCH_CENTRE_ALL, 'Dispatch Centres unavailable — refresh');
            select.value = NAMING_DISPATCH_CENTRE_ALL;
            select.disabled = true;
            select.title = `Dispatch Centre data unavailable: ${getNamingDispatchCentreRefreshFailureReason()}`;
            return;
        }
        add(NAMING_DISPATCH_CENTRE_ALL, 'All dispatch centres');
        centres.forEach(({ id, label }) => add(id, label));
        add(NAMING_DISPATCH_CENTRE_UNASSIGNED, 'Unassigned / default');
        const values = new Set([...select.options].map(option => option.value));
        select.value = values.has(previous) ? previous : NAMING_DISPATCH_CENTRE_ALL;
        select.disabled = false;
        select.title = 'Choose a MissionChief Dispatch Centre first, then Service, Station Type and Start From.';
    }
    function getStationsForNamingDispatchCentre(stations, dispatchSelectId) {
        const centre = document.getElementById(dispatchSelectId)?.value || NAMING_DISPATCH_CENTRE_ALL;
        return (stations || []).filter(station => stationMatchesNamingDispatchCentre(station, centre));
    }
    function getStationsForNamingService(stations, dispatchSelectId, serviceSelectId) {
        const service = document.getElementById(serviceSelectId)?.value || 'ALL';
        return getStationsForNamingDispatchCentre(stations, dispatchSelectId)
            .filter(station => stationMatchesNamingService(station, service));
    }
    function populateNamingServiceFilter(selectId, dispatchSelectId, stations) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const previous = select.value || 'ALL';
        const scoped = getStationsForNamingDispatchCentre(stations, dispatchSelectId);
        const services = new Set(scoped.map(getNamingServiceForStation).filter(Boolean));
        select.replaceChildren();
        const add = (value, label) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            select.appendChild(option);
        };
        if (!(stations || []).length) {
            add('ALL', 'Refresh stations first');
            select.value = 'ALL';
            select.disabled = true;
            return;
        }
        if (!scoped.length) {
            add('ALL', 'No services in selected Dispatch Centre');
            select.value = 'ALL';
            select.disabled = true;
            return;
        }
        add('ALL', 'All services');
        Object.entries(NAMING_SERVICES).forEach(([key, label]) => {
            if (key === 'ALL' || !services.has(key)) return;
            add(key, label);
        });
        const values = new Set([...select.options].map(option => option.value));
        select.value = values.has(previous) ? previous : 'ALL';
        select.disabled = false;
    }
    function populateNamingStationTypeFilter(selectId, dispatchSelectId, serviceSelectId, stations) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const previous = select.value || 'ALL';
        const scoped = getStationsForNamingService(stations, dispatchSelectId, serviceSelectId);
        const types = new Set(scoped.map(station => station?.stationType).filter(Boolean));
        select.replaceChildren();
        const all = document.createElement('option');
        all.value = 'ALL';
        all.textContent = 'All station types';
        select.appendChild(all);
        Object.entries(STATION_TYPES).forEach(([key, label]) => {
            if (key === 'ALL') return;
            if ((stations || []).length && !types.has(key)) return;
            const option = document.createElement('option');
            option.value = key;
            option.textContent = label;
            select.appendChild(option);
        });
        const values = new Set([...select.options].map(option => option.value));
        select.value = values.has(previous) ? previous : 'ALL';
        select.disabled = !(stations || []).length || !scoped.length;
    }
    const NAMING_DISPATCH_CENTRE_REFRESH_LISTENER_KEY =
        '__MC_NAMING_DISPATCH_CENTRE_REFRESH_V1089__';
    function getNamingDispatchCentreRefreshFailureReason() {
        const reasons = [
            NAMING_DISPATCH_CENTRE_STATE.lastListError,
            NAMING_DISPATCH_CENTRE_STATE.lastAssignmentError
        ].map(reason => cleanText(reason || '')).filter(Boolean);
        return [...new Set(reasons)].join(' | ') ||
            'Dispatch Centre data could not be loaded.';
    }
    function reportNamingDispatchCentreRefreshFailure(reason) {
        const message = `Dispatch Centre refresh failed: ${reason}`;
        if (typeof log === 'function' && document.getElementById('mc-namer-log')) {
            log(message, 'error');
        }
        if (
            typeof stationLog === 'function' &&
            document.getElementById('mc-station-log')
        ) {
            stationLog(message, 'error');
        }
    }
    function yieldNamingDispatchCentreRefreshPaint() {
        return new Promise(resolve => {
            const view = document.defaultView || window;
            view.setTimeout(resolve, 40);
        });
    }
    function installNamingDispatchCentreRefreshListener() {
        if (document[NAMING_DISPATCH_CENTRE_REFRESH_LISTENER_KEY]) return;
        document[NAMING_DISPATCH_CENTRE_REFRESH_LISTENER_KEY] = true;
        document.addEventListener('click', event => {
            const button = event.target?.closest?.(
                '#mc-namer-refresh-dispatch-centres, #mc-station-refresh-dispatch-centres'
            );
            if (!button || button.ownerDocument !== document) return;
            event.preventDefault();
            if (button.disabled) return;
            void refreshNamingDispatchCentres(true);
        });
    }
    async function refreshNamingDispatchCentres(force = true) {
        if (STATE.running || STATION_STATE.running || PERSONNEL_STATE.running) return false;
        const buttons = [
            document.getElementById('mc-namer-refresh-dispatch-centres'),
            document.getElementById('mc-station-refresh-dispatch-centres')
        ].filter(Boolean);
        buttons.forEach(button => {
            button.disabled = true;
            button.textContent = 'Refreshing…';
            button.title = 'Loading Dispatch Centres from MissionChief.';
            button.dataset.dispatchCentreRefreshState = 'loading';
            button.setAttribute('aria-busy', 'true');
        });
        await yieldNamingDispatchCentreRefreshPaint();
        let listLoaded = false;
        let assignmentsLoaded = false;
        let ready = false;
        let centreCount = 0;
        try {
            [listLoaded, assignmentsLoaded] = await Promise.all([
                loadNamingDispatchCentreList(force),
                loadNamingDispatchCentreData(force)
            ]);
            if (assignmentsLoaded) {
                syncNamingStationDispatchCentreAssignments(STATE.stations);
                syncNamingStationDispatchCentreAssignments(STATION_STATE.stations);
            }
            hydrateNamingInventoriesFromCurrentOverview();
            populateNamingDispatchCentreFilter('mc-namer-dispatch-centre');
            populateNamingDispatchCentreFilter('mc-station-dispatch-centre');
            populateNamingServiceFilter(
                'mc-namer-service',
                'mc-namer-dispatch-centre',
                STATE.stations
            );
            populateNamingStationTypeFilter(
                'mc-namer-station-type',
                'mc-namer-dispatch-centre',
                'mc-namer-service',
                STATE.stations
            );
            populateNamingServiceFilter(
                'mc-station-service',
                'mc-station-dispatch-centre',
                STATION_STATE.stations
            );
            populateNamingStationTypeFilter(
                'mc-station-type',
                'mc-station-dispatch-centre',
                'mc-station-service',
                STATION_STATE.stations
            );
            populateStartDropdown();
            populateStationNamingStartDropdown();
            centreCount = NAMING_DISPATCH_CENTRE_STATE.labelsById.size;
            ready = Boolean(listLoaded && assignmentsLoaded);
            return ready;
        } catch (error) {
            NAMING_DISPATCH_CENTRE_STATE.lastListError =
                NAMING_DISPATCH_CENTRE_STATE.lastListError ||
                cleanText(error?.message || String(error));
            console.warn('[Command Nexus] Dispatch Centre refresh failed:', error);
            return false;
        } finally {
            const failureReason = getNamingDispatchCentreRefreshFailureReason();
            if (!ready) reportNamingDispatchCentreRefreshFailure(failureReason);
            buttons.forEach(button => {
                button.disabled = false;
                button.removeAttribute('aria-busy');
                button.dataset.dispatchCentreRefreshState = ready ? 'ready' : 'error';
                button.textContent = ready
                    ? 'Refresh Dispatch Centres'
                    : 'Retry Dispatch Centres';
                button.title = ready
                    ? `Loaded ${centreCount} Dispatch Centre${centreCount === 1 ? '' : 's'} from MissionChief.`
                    : `Retry Dispatch Centres. ${failureReason}`;
            });
        }
    }
    async function handleUnitDispatchCentreChange() {
        await refreshStations();
    }
    function handleUnitNamingServiceChange() {
        populateNamingStationTypeFilter(
            'mc-namer-station-type',
            'mc-namer-dispatch-centre',
            'mc-namer-service',
            STATE.stations
        );
        handleUnitStationTypeChange();
    }
    async function handleStationDispatchCentreChange() {
        await refreshStationNamingStations();
    }
    function handleStationNamingServiceChange() {
        populateNamingStationTypeFilter(
            'mc-station-type',
            'mc-station-dispatch-centre',
            'mc-station-service',
            STATION_STATE.stations
        );
        populateStationNamingStartDropdown();
    }
    function hydrateNamingInventoriesFromCurrentOverview() {
        const entries = getNamingStationEntries();
        const unitStations = [];
        const stationNamingStations = [];
        entries.forEach((entry, index) => {
            if (!entry?.href || !entry?.buildingId) return;
            const typeInfo = getStationNamingTypeInfo(
                entry.buildingTypeId,
                entry.displayName
            );
            const stationType = typeInfo.stationType ||
                STATION_BUILDING_TYPE_INFO[entry.buildingTypeId]?.stationType ||
                detectStationType(entry.displayName);
            const common = {
                index,
                href: entry.href,
                buildingId: entry.buildingId,
                displayName: entry.displayName,
                buildingTypeId: entry.buildingTypeId,
                dispatchCentreId: getNamingDispatchCentreId(entry.buildingId),
                stationType,
                service: getNamingServiceForStation({
                    buildingTypeId: entry.buildingTypeId,
                    stationType
                })
            };
            unitStations.push({
                ...common,
                callsignBase: createCallsignBase(entry.displayName)
            });
            stationNamingStations.push({
                ...common,
                suffix: typeInfo.suffix,
                namingMode: typeInfo.namingMode || '',
                typeLabel: typeInfo.label
            });
        });
        STATE.stations = unitStations;
        STATION_STATE.stations = stationNamingStations;
        return Math.max(unitStations.length, stationNamingStations.length);
    }
    function findStationOverviewEntry(href) {
        const expected = normaliseStationOverviewHref(href);
        if (!expected) return null;
        return getStationOverviewEntries().find(entry => entry.href === expected) || null;
    }
    function ensureSingleNamingToolsPanel(preferredPanel = null) {
        const panels = [...document.querySelectorAll('#mc-namer-panel')];
        const keeper = preferredPanel?.isConnected
            ? preferredPanel
            : panels[0] || null;
        panels.forEach(panel => {
            if (panel !== keeper) panel.remove();
        });
        const styles = [...document.querySelectorAll('style[data-mc-namer-style="true"]')];
        styles.forEach((style, index) => {
            if (index > 0) style.remove();
        });
        return keeper;
    }
    function init(toolsHost) {
        addPanel(toolsHost);
        log(`Unit Naming Tool v${UNIT_VERSION} loaded. Press Refresh Stations first.`, 'info');
        stationLog(`Station Naming Tool v${STATION_VERSION} loaded. Refresh stations, choose Preview or Rename and Save, then press Start.`, 'info');
        personnelLog(`Personnel Assignment v${PERSONNEL_VERSION} loaded. Verified Medical, Fire/Airfield, Police, and SAR/Coastguard profiles are live; All Services remains in safe UI preview.`, 'info');
    }
    function addPanel(toolsHost) {
        if (ensureSingleNamingToolsPanel()) return;
        const panel = document.createElement('div');
        panel.id = 'mc-namer-panel';
        panel.classList.toggle('mc-ios-safari', isIosSafariWebsite());
        panel.innerHTML = `
            <div id="mc-namer-header">
                <div class="mc-nexus-brand-block">
                    <span class="mc-nexus-mark" aria-hidden="true">NX</span>
                    <span class="mc-nexus-brand-copy">
                        <span class="mc-nexus-eyebrow">MISSIONCHIEF COMMAND NEXUS</span>
                        <span id="mc-namer-header-title">Unit Naming</span>
                    </span>
                </div>
                <div class="mc-nexus-header-actions">
                    <span id="mc-namer-header-version" class="mc-nexus-version-chip">v${UNIT_VERSION}</span>
                    <button id="mc-namer-collapse" type="button" aria-expanded="true" title="Collapse Nexus tools">−</button>
                </div>
            </div>
            <div id="mc-namer-body">
            <div class="mc-namer-tabs" role="tablist" aria-label="Command Nexus tools">
                <button id="mc-tab-unit" class="mc-namer-tab active" type="button" role="tab" aria-selected="true">
                    <span class="mc-nexus-tab-index">01</span><span>Unit Naming</span>
                </button>
                <button id="mc-tab-station" class="mc-namer-tab" type="button" role="tab" aria-selected="false">
                    <span class="mc-nexus-tab-index">02</span><span>Station Naming</span>
                </button>
                <button id="mc-tab-personnel" class="mc-namer-tab" type="button" role="tab" aria-selected="false">
                    <span class="mc-nexus-tab-index">03</span><span>Personnel</span>
                </button>
            </div>
            <div id="mc-unit-view" class="mc-tool-view mc-nexus-tool-grid">
                <div class="mc-namer-section mc-nexus-config-card">
                    <label><b>Dispatch Centre:</b></label>
                    <select id="mc-namer-dispatch-centre" disabled>
                        <option value="ALL">All dispatch centres</option>
                    </select>
                    <button id="mc-namer-refresh-dispatch-centres" type="button" style="margin-top:4px; cursor:pointer; pointer-events:auto; touch-action:manipulation;">Refresh Dispatch Centres</button>
                    <label style="margin-top:6px; display:block;"><b>Service:</b></label>
                    <select id="mc-namer-service" disabled>
                        <option value="ALL">Refresh stations first</option>
                    </select>
                    <label style="margin-top:6px; display:block;"><b>Station Type:</b></label>
                    <select id="mc-namer-station-type">
                        <option value="ALL">All station types</option>
                        ${Object.entries(STATION_TYPES).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}
                    </select>
                    <label style="margin-top:6px; display:block;"><b>Unit Class:</b></label>
                    <select id="mc-namer-unit-class">
                        <option value="ALL">All classes</option>
                    </select>
                    <label style="margin-top:6px; display:block;"><b>Mode:</b></label>
                    <select id="mc-namer-mode">
                        <option value="all">All matching stations from selected start point</option>
                        <option value="single">Selected station only</option>
                    </select>
                    <label style="margin-top:6px; display:block;"><b>Start From:</b></label>
                    <select id="mc-namer-startfrom">
                        <option value="">Refresh stations first</option>
                    </select>
                </div>
                <div class="mc-namer-buttons mc-nexus-action-bar">
                    <button id="mc-namer-refresh">Refresh Stations</button>
                    <button id="mc-namer-start">Start</button>
                    <button id="mc-namer-pause">Pause</button>
                    <button id="mc-namer-stop">Stop</button>
                    <button id="mc-namer-debug">Debug: OFF</button>
                    <button id="mc-namer-clear">Clear Log</button>
                </div>
                <div class="mc-namer-section mc-nexus-status-card">
                    <div><b>Status:</b> <span id="mc-namer-status">Idle</span></div>
                    <div><b>Station:</b> <span id="mc-namer-station">None</span></div>
                    <div><b>Vehicle:</b> <span id="mc-namer-vehicle">None</span></div>
                    <div><b>Progress:</b> <span id="mc-namer-progress">0 / 0</span></div>
                    <div><b>Renamed:</b> <span id="mc-namer-renamed">0</span></div>
                    <div><b>Skipped:</b> <span id="mc-namer-skipped">0</span></div>
                </div>
                <div id="mc-namer-log" class="mc-nexus-log"></div>
            </div>
            <div id="mc-station-view" class="mc-tool-view mc-nexus-tool-grid" style="display:none;">
                <div class="mc-namer-section mc-nexus-config-card">
                    <label><b>Dispatch Centre:</b></label>
                    <select id="mc-station-dispatch-centre" disabled>
                        <option value="ALL">All dispatch centres</option>
                    </select>
                    <button id="mc-station-refresh-dispatch-centres" type="button" style="margin-top:4px; cursor:pointer; pointer-events:auto; touch-action:manipulation;">Refresh Dispatch Centres</button>
                    <label style="margin-top:6px; display:block;"><b>Service:</b></label>
                    <select id="mc-station-service" disabled>
                        <option value="ALL">Refresh stations first</option>
                    </select>
                    <label style="margin-top:6px; display:block;"><b>Station Type:</b></label>
                    <select id="mc-station-type">
                        <option value="ALL">All station types</option>
                        ${Object.entries(STATION_TYPES).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}
                    </select>
                    <label style="margin-top:6px; display:block;"><b>Mode:</b></label>
                    <select id="mc-station-mode">
                        <option value="all">All matching stations from selected start point</option>
                        <option value="single">Selected station only</option>
                    </select>
                    <label style="margin-top:6px; display:block;"><b>Action:</b></label>
                    <select id="mc-station-action">
                        <option value="preview">Preview only - do not save</option>
                        <option value="save">Rename and save</option>
                    </select>
                    <label style="margin-top:6px; display:block;"><b>Start From:</b></label>
                    <select id="mc-station-startfrom">
                        <option value="">Refresh stations first</option>
                    </select>
                </div>
                <div class="mc-namer-buttons mc-nexus-action-bar">
                    <button id="mc-station-refresh">Refresh Stations</button>
                    <button id="mc-station-start">Start</button>
                    <button id="mc-station-pause">Pause</button>
                    <button id="mc-station-stop">Stop</button>
                    <button id="mc-station-debug">Debug: OFF</button>
                    <button id="mc-station-diagnostics">Download Renamer diagnostics</button>
                    <button id="mc-station-clear">Clear Log</button>
                </div>
                <div class="mc-namer-section mc-nexus-status-card">
                    <div><b>Status:</b> <span id="mc-station-status">Idle</span></div>
                    <div><b>Station:</b> <span id="mc-station-current">None</span></div>
                    <div><b>Address:</b> <span id="mc-station-address">None</span></div>
                    <div><b>Town:</b> <span id="mc-station-town">None</span></div>
                    <div><b>Before:</b> <span id="mc-station-before">None</span></div>
                    <div><b>After:</b> <span id="mc-station-after">None</span></div>
                    <div><b>Progress:</b> <span id="mc-station-progress">0 / 0</span></div>
                    <div><b>Renamed:</b> <span id="mc-station-renamed">0</span></div>
                    <div><b>Skipped:</b> <span id="mc-station-skipped">0</span></div>
                </div>
                <div id="mc-station-log" class="mc-nexus-log"></div>
            </div>
            <div id="mc-personnel-view" class="mc-tool-view mc-nexus-tool-grid mc-nexus-personnel-grid" style="display:none;">
                <div class="mc-namer-section mc-personnel-navigation-section mc-nexus-config-card">
                    <div class="mc-personnel-navigation-title">Assignment Navigator</div>
                    <label style="display:block;"><b>Service:</b></label>
                    <select id="mc-personnel-service">
                        ${Object.entries(PERSONNEL_SERVICE_DEFINITIONS).map(([key, service]) => `<option value="${key}">${service.icon} ${service.label}</option>`).join('')}
                    </select>
                    <label style="margin-top:6px; display:block;"><b>Training profile:</b></label>
                    <select id="mc-personnel-profile"></select>
                    <div id="mc-personnel-profile-banner" class="mc-personnel-profile-banner"></div>
                    <div class="mc-personnel-fixed-grid">
                        <div><b>Training:</b><br><span id="mc-personnel-profile-training">${PERSONNEL_TRAINING_LABEL}</span></div>
                        <div><b>Vehicle:</b><br><span id="mc-personnel-profile-vehicle">${PERSONNEL_TARGET_VEHICLE_LABEL}</span></div>
                        <div><b>Required:</b><br><span id="mc-personnel-profile-requirement">${PERSONNEL_TARGET_PER_VEHICLE} trained staff per vehicle</span></div>
                    </div>
                    <div id="mc-personnel-policy-summary" class="mc-personnel-policy-summary"></div>
                    <label style="margin-top:8px; display:block;"><b>Mode:</b></label>
                    <select id="mc-personnel-mode">
                        <option id="mc-personnel-mode-all-option" value="all">All relevant stations from selected start point — scan every station</option>
                        <option value="target">Ensure each relevant station has Units required</option>
                        <option value="single">Selected station only</option>
                    </select>
                    <label style="margin-top:6px; display:block;"><b>Action:</b></label>
                    <select id="mc-personnel-action">
                        <option value="preview">Preview only - do not change assignments</option>
                        <option value="assign">Assign and verify</option>
                    </select>
                    <label style="margin-top:6px; display:block;" for="mc-personnel-crew-each"><b>Trained crew per vehicle:</b></label>
                    <select id="mc-personnel-crew-each"><option value="0">Profile default</option></select>
                    <div class="mc-personnel-input-note">Choose crew per vehicle. Use target mode to choose how many vehicles at each station. Existing crew stay assigned; capacity always applies.</div>
                    <label style="margin-top:6px; display:block;"><b>Vehicles per station:</b></label>
                    <input id="mc-personnel-units-required" type="number" min="0" step="1" value="0" inputmode="numeric">
                    <div id="mc-personnel-units-required-note" class="mc-personnel-input-note">Disabled in All Stations mode. Select the target-units mode to enter a stopping target.</div>
                    <label style="margin-top:6px; display:block;"><b>Start From:</b></label>
                    <select id="mc-personnel-startfrom">
                        <option value="">Refresh stations first</option>
                    </select>
                </div>
                <div class="mc-namer-buttons mc-nexus-action-bar">
                    <button id="mc-personnel-refresh">Refresh Stations</button>
                    <button id="mc-personnel-start">Start</button>
                    <button id="mc-personnel-pause">Pause</button>
                    <button id="mc-personnel-stop">Stop</button>
                    <button id="mc-personnel-view-station-report">View Station Report</button>
                    <button id="mc-personnel-copy-station">Copy Station Report</button>
                    <button id="mc-personnel-copy">Copy Overall Report</button>
                    <button id="mc-personnel-debug">Debug: OFF</button>
                    <button id="mc-personnel-clear">Clear Log</button>
                </div>
                <div class="mc-namer-section mc-nexus-status-card">
                    <div><b>Status:</b> <span id="mc-personnel-status">Idle</span></div>
                    <div><b>Station:</b> <span id="mc-personnel-current">None</span></div>
                    <div><b>Vehicle:</b> <span id="mc-personnel-vehicle">None</span></div>
                    <div><b>Station progress:</b> <span id="mc-personnel-progress">0 / 0</span></div>
                    <div><b>Stations completed:</b> <span id="mc-personnel-completed">0</span></div>
                    <div><b>Vehicles checked:</b> <span id="mc-personnel-vehicles">0</span></div>
                    <div><b id="mc-personnel-units-fulfilled-label">Units fulfilled:</b> <span id="mc-personnel-units-fulfilled">0 / All</span></div>
                    <div><b>Planned / assigned:</b> <span id="mc-personnel-assigned">0</span></div>
                    <div><b>Need training:</b> <span id="mc-personnel-training-shortfall">0</span></div>
                    <div><b>Unfilled positions:</b> <span id="mc-personnel-assignment-shortfall">0</span></div>
                </div>
                <div id="mc-personnel-training-shortfall-section" class="mc-namer-section mc-personnel-training-shortfall-section mc-nexus-alert-card" hidden>
                    <div class="mc-personnel-training-shortfall-heading">
                        ⚠ Stations needing additional qualified personnel:
                        <span id="mc-personnel-training-shortfall-station-count">0</span>
                    </div>
                    <div class="mc-personnel-training-shortfall-note">
                        This only shows genuine training shortages. Assignment or verification problems are kept separate.
                    </div>
                    <div id="mc-personnel-training-shortfall-list" class="mc-personnel-training-shortfall-list"></div>
                </div>
                <div class="mc-namer-section mc-personnel-report-options mc-nexus-report-controls">
                    <b>Report display:</b>
                    <div class="mc-personnel-report-toggle-grid">
                        <label class="mc-personnel-report-toggle">
                            <input id="mc-personnel-show-station-report" type="checkbox" checked>
                            <span>Latest station report</span>
                        </label>
                        <label class="mc-personnel-report-toggle">
                            <input id="mc-personnel-show-overall-report" type="checkbox" checked>
                            <span>Overall run report</span>
                        </label>
                    </div>
                    <div class="mc-personnel-report-note">The short status and shortfall figures above always remain visible.</div>
                </div>
                <div id="mc-personnel-after-action-section" class="mc-namer-section mc-personnel-report-section mc-nexus-station-report">
                    <b>Latest Station After-Action Report</b>
                    <pre id="mc-personnel-after-action">Run a station preview or assignment to create the station report.</pre>
                </div>
                <div id="mc-personnel-overall-report-section" class="mc-namer-section mc-personnel-report-section mc-nexus-overall-report">
                    <b>Overall Run Report</b>
                    <pre id="mc-personnel-report">Run a preview or assignment to create the overall report.</pre>
                </div>
                <div class="mc-personnel-log-heading mc-nexus-log-heading">Live Activity Log</div>
                <div id="mc-personnel-log" class="mc-nexus-log"></div>
            </div>
            </div>
        `;
        panel.slot = 'nexus-renamer';
        panel.setAttribute('data-nexus-renamer-docked', '');
        toolsHost.appendChild(panel);
        ensureSingleNamingToolsPanel(panel);
        const compactDisclosureStoragePrefix =
            'mc_compact_disclosure_v1071_';
        function createCompactDisclosure(
            id,
            label,
            targets,
            defaultOpen = false
        ) {
            const nodes = (Array.isArray(targets) ? targets : [targets])
                .filter(node => node?.isConnected);
            if (!nodes.length) return null;
            const details = document.createElement('details');
            details.id = id;
            details.className = 'mc-compact-disclosure';
            const storageKey =
                `${compactDisclosureStoragePrefix}${id}`;
            let savedState = null;
            try {
                savedState = localStorage.getItem(storageKey);
            } catch (_error) {}
            details.open = savedState == null
                ? Boolean(defaultOpen)
                : savedState === 'true';
            const summary = document.createElement('summary');
            summary.className = 'mc-compact-disclosure-summary';
            summary.innerHTML = `
                <span>${label}</span>
                <span class="mc-compact-summary-mark" aria-hidden="true"></span>
            `;
            const body = document.createElement('div');
            body.className = 'mc-compact-disclosure-body';
            nodes[0].parentNode.insertBefore(details, nodes[0]);
            details.appendChild(summary);
            details.appendChild(body);
            nodes.forEach(node => body.appendChild(node));
            details.addEventListener('toggle', () => {
                try {
                    localStorage.setItem(
                        storageKey,
                        String(details.open)
                    );
                } catch (_error) {}
            });
            return details;
        }
        function createCompactActionDisclosure(
            container,
            selectors,
            label,
            id,
            defaultOpen = false
        ) {
            if (!container) return null;
            const buttons = selectors
                .map(selector => container.querySelector(selector))
                .filter(Boolean);
            if (!buttons.length) return null;
            const details = createCompactDisclosure(
                id,
                label,
                buttons,
                defaultOpen
            );
            if (!details) return null;
            details.classList.add('mc-compact-action-disclosure');
            container.appendChild(details);
            return details;
        }
        const compactUnitView = panel.querySelector('#mc-unit-view');
        const compactStationView = panel.querySelector('#mc-station-view');
        const compactPersonnelView = panel.querySelector('#mc-personnel-view');
        createCompactActionDisclosure(
            compactUnitView?.querySelector('.mc-nexus-action-bar'),
            ['#mc-namer-debug', '#mc-namer-clear'],
            'More',
            'mc-compact-unit-tools'
        );
        createCompactDisclosure(
            'mc-compact-unit-status',
            'Status',
            compactUnitView?.querySelector('.mc-nexus-status-card'),
            false
        );
        createCompactDisclosure(
            'mc-compact-unit-log',
            'Activity log',
            compactUnitView?.querySelector('#mc-namer-log'),
            false
        );
        createCompactActionDisclosure(
            compactStationView?.querySelector('.mc-nexus-action-bar'),
            ['#mc-station-debug', '#mc-station-diagnostics', '#mc-station-clear'],
            'More',
            'mc-compact-station-tools'
        );
        createCompactDisclosure(
            'mc-compact-station-status',
            'Status',
            compactStationView?.querySelector('.mc-nexus-status-card'),
            false
        );
        createCompactDisclosure(
            'mc-compact-station-log',
            'Activity log',
            compactStationView?.querySelector('#mc-station-log'),
            false
        );
        createCompactDisclosure(
            'mc-compact-personnel-profile',
            'Profile details',
            [
                compactPersonnelView?.querySelector('.mc-personnel-fixed-grid'),
                compactPersonnelView?.querySelector('#mc-personnel-policy-summary')
            ],
            false
        );
        createCompactActionDisclosure(
            compactPersonnelView?.querySelector('.mc-nexus-action-bar'),
            [
                '#mc-personnel-view-station-report',
                '#mc-personnel-copy-station',
                '#mc-personnel-copy',
                '#mc-personnel-debug',
                '#mc-personnel-clear'
            ],
            'Tools and reports',
            'mc-compact-personnel-tools',
            isIosSafariWebsite()
        );
        createCompactDisclosure(
            'mc-compact-personnel-status',
            'Status',
            compactPersonnelView?.querySelector('.mc-nexus-status-card'),
            false
        );
        createCompactDisclosure(
            'mc-compact-personnel-report-display',
            'Report display',
            compactPersonnelView?.querySelector('.mc-nexus-report-controls'),
            false
        );
        createCompactDisclosure(
            'mc-compact-personnel-station-report',
            'Station report',
            compactPersonnelView?.querySelector('#mc-personnel-after-action-section'),
            false
        );
        createCompactDisclosure(
            'mc-compact-personnel-overall-report',
            'Overall report',
            compactPersonnelView?.querySelector('#mc-personnel-overall-report-section'),
            false
        );
        createCompactDisclosure(
            'mc-compact-personnel-log',
            'Activity log',
            [
                compactPersonnelView?.querySelector('.mc-personnel-log-heading'),
                compactPersonnelView?.querySelector('#mc-personnel-log')
            ],
            false
        );
        const style = document.createElement('style');
        style.dataset.mcNamerStyle = 'true';
        style.textContent = `
            #mc-namer-panel {
                position: fixed;
                top: 90px;
                right: 20px;
                width: 470px;
                max-height: 760px;
                background: #1f2933;
                color: #f5f5f5;
                z-index: 999999;
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.35);
                font-family: Arial, sans-serif;
                font-size: 12px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                max-height: min(760px, calc(100vh - 20px));
            }
            #mc-namer-body {
                min-height: 0;
                overflow-y: auto;
                overflow-x: hidden;
                overscroll-behavior: contain;
                scrollbar-gutter: stable;
            }
            #mc-namer-header {
                background: #0d6efd;
                padding: 7px 8px 7px 10px;
                font-weight: bold;
                font-size: 14px;
                cursor: move;
                user-select: none;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                min-height: 34px;
            }
            #mc-namer-header-title {
                min-width: 0;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
            }
            #mc-namer-collapse {
                flex: 0 0 26px;
                width: 26px;
                height: 24px;
                padding: 0;
                border: 1px solid rgba(255,255,255,0.45);
                border-radius: 5px;
                background: rgba(0,0,0,0.18);
                color: #ffffff;
                font-size: 18px;
                font-weight: bold;
                line-height: 20px;
                cursor: pointer;
            }
            #mc-namer-collapse:hover,
            #mc-namer-collapse:focus-visible {
                background: rgba(255,255,255,0.20);
                outline: none;
            }
            #mc-namer-panel.mc-namer-collapsed {
                width: 290px;
                max-height: none;
            }
            #mc-namer-panel.mc-namer-collapsed #mc-namer-body {
                display: none;
            }
            .mc-namer-tabs {
                display: flex;
                gap: 0;
                background: #0b1220;
                border-bottom: 1px solid #374151;
                position: sticky;
                top: 0;
                z-index: 20;
            }
            .mc-namer-tab {
                flex: 1;
                border: 0;
                border-right: 1px solid #374151;
                border-radius: 0;
                padding: 8px 6px;
                background: #1f2937;
                color: #cbd5e1;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
            }
            .mc-namer-tab:last-child {
                border-right: 0;
            }
            .mc-namer-tab:hover {
                background: #273449;
                color: #ffffff;
            }
            .mc-namer-tab.active {
                background: #0d6efd;
                color: #ffffff;
                box-shadow: inset 0 -3px 0 #93c5fd;
            }
            .mc-tool-view {
                background: #111827;
            }
            .mc-namer-section {
                padding: 8px 10px;
                background: #111827;
                border-bottom: 1px solid #374151;
                line-height: 1.5;
            }
            #mc-namer-startfrom,
            #mc-namer-service,
            #mc-namer-station-type,
            #mc-namer-dispatch-centre,
            #mc-namer-refresh-dispatch-centres,
            #mc-namer-unit-class,
            #mc-namer-mode,
            #mc-station-startfrom,
            #mc-station-service,
            #mc-station-type,
            #mc-station-dispatch-centre,
            #mc-station-refresh-dispatch-centres,
            #mc-station-mode,
            #mc-station-action,
            #mc-personnel-service,
            #mc-personnel-profile,
            #mc-personnel-startfrom,
            #mc-personnel-mode,
            #mc-personnel-action,
            #mc-personnel-units-required {
                width: 100%;
                margin-top: 4px;
                padding: 5px;
                color: #111;
                border-radius: 4px;
                border: 1px solid #555;
            }
            .mc-personnel-input-note {
                margin-top: 4px;
                color: #9ca3af;
                font-size: 10px;
                line-height: 1.3;
            }
            .mc-namer-buttons {
                padding: 8px;
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
                background: #111827;
                border-bottom: 1px solid #374151;
            }
            .mc-namer-buttons button {
                border: 0;
                border-radius: 4px;
                padding: 5px 8px;
                cursor: pointer;
                font-size: 12px;
            }
            #mc-namer-refresh,
            #mc-station-refresh,
            #mc-personnel-refresh { background: #6c757d; color: white; }
            #mc-namer-start,
            #mc-station-start,
            #mc-personnel-start { background: #198754; color: white; }
            #mc-namer-pause,
            #mc-station-pause,
            #mc-personnel-pause { background: #ffc107; color: #111; }
            #mc-namer-stop,
            #mc-station-stop,
            #mc-personnel-stop { background: #dc3545; color: white; }
            #mc-personnel-build-register,
            #mc-personnel-full-register {
                background: #0f766e;
                color: white;
                border: 1px solid #5eead4;
                font-weight: bold;
            }
            #mc-personnel-export-register { background: #2563eb; color: white; }
            #mc-personnel-import-register { background: #0e7490; color: white; }
            #mc-personnel-build-register:disabled,
            #mc-personnel-full-register:disabled,
            #mc-personnel-export-register:disabled,
            #mc-personnel-import-register:disabled {
                cursor: not-allowed;
                opacity: 0.5;
            }
            #mc-personnel-copy,
            #mc-personnel-copy-station { background: #7c3aed; color: white; }
            #mc-personnel-view-station-report { background: #2563eb; color: white; }
            #mc-namer-debug,
            #mc-station-debug,
            #mc-personnel-debug { background: #0dcaf0; color: #111; }
            #mc-namer-clear,
            #mc-station-clear,
            #mc-personnel-clear { background: #f8f9fa; color: #111; }
            #mc-namer-log,
            #mc-station-log,
            #mc-personnel-log {
                padding: 8px 10px;
                max-height: 350px;
                overflow-y: auto;
                background: #0b1220;
                font-family: Consolas, monospace;
                white-space: pre-wrap;
                line-height: 1.4;
            }
            .mc-personnel-navigation-section {
                background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
            }
            .mc-personnel-navigation-title {
                margin-bottom: 7px;
                color: #bfdbfe;
                font-size: 12px;
                font-weight: bold;
                letter-spacing: 0.2px;
            }
            .mc-personnel-profile-banner {
                margin: 7px 0;
                padding: 6px 8px;
                border: 1px solid #374151;
                border-radius: 5px;
                background: #0b1220;
                font-weight: bold;
                line-height: 1.3;
            }
            .mc-personnel-profile-banner.is-live {
                border-color: #22c55e;
                background: rgba(20,83,45,0.32);
                color: #bbf7d0;
            }
            .mc-personnel-profile-banner.is-preview {
                border-color: #f59e0b;
                background: rgba(120,53,15,0.28);
                color: #fde68a;
            }
            .mc-personnel-policy-summary {
                margin-top: 7px;
                padding: 7px 8px;
                border-left: 4px solid #3b82f6;
                border-radius: 4px;
                background: rgba(30,64,175,0.16);
                color: #dbeafe;
                font-size: 11px;
                line-height: 1.35;
            }
            .mc-personnel-policy-summary strong {
                color: #ffffff;
            }
            #mc-personnel-start:disabled,
            #mc-personnel-refresh:disabled,
            #mc-personnel-mode:disabled,
            #mc-personnel-action:disabled,
            #mc-personnel-startfrom:disabled {
                cursor: not-allowed;
                opacity: 0.45;
                filter: grayscale(0.35);
            }
            .mc-personnel-fixed-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 6px;
            }
            .mc-personnel-fixed-grid > div {
                padding: 6px;
                border: 1px solid #374151;
                border-radius: 5px;
                background: #0b1220;
                text-align: center;
            }
            .mc-personnel-training-shortfall-section {
                border-left: 5px solid #ef4444;
                background: #2b1015;
                box-shadow: inset 0 0 0 1px rgba(239,68,68,0.28);
            }
            .mc-personnel-training-shortfall-heading {
                color: #fecaca;
                font-weight: bold;
                font-size: 12px;
            }
            .mc-personnel-training-shortfall-note {
                margin-top: 3px;
                color: #fca5a5;
                font-size: 10px;
                line-height: 1.3;
            }
            .mc-personnel-training-shortfall-list {
                display: grid;
                gap: 5px;
                max-height: 145px;
                margin-top: 7px;
                overflow-y: auto;
                overscroll-behavior: contain;
                scrollbar-gutter: stable;
            }
            .mc-personnel-training-shortfall-row {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 8px;
                align-items: center;
                padding: 6px 7px;
                border: 1px solid rgba(248,113,113,0.45);
                border-radius: 5px;
                background: rgba(127,29,29,0.34);
            }
            .mc-personnel-training-shortfall-name {
                min-width: 0;
                color: #fee2e2;
                font-weight: bold;
                overflow-wrap: anywhere;
            }
            .mc-personnel-training-shortfall-value {
                color: #ffffff;
                font-weight: bold;
                white-space: nowrap;
            }
            a.mc-personnel-training-shortfall-station {
                border-left: 5px solid #ef4444 !important;
                box-shadow: inset 0 0 0 1px rgba(239,68,68,0.42) !important;
                background-color: rgba(127,29,29,0.24) !important;
            }
            .mc-personnel-report-options {
                padding-top: 7px;
                padding-bottom: 7px;
            }
            .mc-personnel-report-toggle-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 6px;
                margin-top: 6px;
            }
            .mc-personnel-report-toggle {
                display: flex;
                align-items: center;
                gap: 6px;
                min-width: 0;
                padding: 6px 7px;
                border: 1px solid #374151;
                border-radius: 5px;
                background: #0b1220;
                cursor: pointer;
                user-select: none;
            }
            .mc-personnel-report-toggle input {
                flex: 0 0 auto;
                margin: 0;
                cursor: pointer;
            }
            .mc-personnel-report-toggle span {
                min-width: 0;
                line-height: 1.25;
            }
            .mc-personnel-report-note {
                margin-top: 5px;
                color: #9ca3af;
                font-size: 11px;
            }
            .mc-personnel-report-section {
                padding-bottom: 8px;
                scroll-margin-top: 42px;
            }
            .mc-personnel-report-section[hidden] {
                display: none !important;
            }
            #mc-personnel-report,
            #mc-personnel-after-action {
                margin: 6px 0 0;
                min-height: 130px;
                max-height: 280px;
                overflow-y: scroll;
                overflow-x: auto;
                overscroll-behavior: contain;
                scrollbar-gutter: stable both-edges;
                padding: 8px;
                border: 1px solid #374151;
                border-radius: 5px;
                background: #070d18;
                color: #d1fae5;
                font: 11px/1.4 Consolas, monospace;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
                user-select: text;
            }
            #mc-personnel-after-action {
                color: #e0f2fe;
                border-color: #2563eb;
            }
            #mc-personnel-log {
                max-height: 220px;
                overflow-y: scroll;
                overscroll-behavior: contain;
                scrollbar-gutter: stable;
            }
            .mc-personnel-log-heading {
                padding: 7px 10px;
                background: #111827;
                border-bottom: 1px solid #374151;
                font-weight: bold;
            }
            .mc-log-info { color: #93c5fd; }
            .mc-log-station { color: #bfdbfe; font-weight: bold; margin-top: 8px; }
            .mc-log-before { color: #fca5a5; }
            .mc-log-after { color: #86efac; }
            .mc-log-debug { color: #facc15; }
            .mc-log-error { color: #f87171; font-weight: bold; }
            .mc-log-done { color: #22c55e; font-weight: bold; }
            #mc-namer-panel.mc-ios-safari {
                top: calc(8px + env(safe-area-inset-top, 0px));
                right: calc(8px + env(safe-area-inset-right, 0px));
                left: calc(8px + env(safe-area-inset-left, 0px));
                width: auto;
                max-width: none;
                max-height: calc(
                    100vh
                    - 16px
                    - env(safe-area-inset-top, 0px)
                    - env(safe-area-inset-bottom, 0px)
                );
                -webkit-transform: translateZ(0);
            }
            @supports (height: 100dvh) {
                #mc-namer-panel.mc-ios-safari {
                    max-height: calc(
                        100dvh
                        - 16px
                        - env(safe-area-inset-top, 0px)
                        - env(safe-area-inset-bottom, 0px)
                    );
                }
            }
            #mc-namer-panel.mc-ios-safari.mc-namer-collapsed {
                width: auto;
            }
            #mc-namer-panel.mc-ios-safari #mc-namer-header {
                cursor: grab;
                touch-action: none;
                -webkit-user-select: none;
            }
            #mc-namer-panel.mc-ios-safari #mc-namer-header:active {
                cursor: grabbing;
            }
            #mc-namer-panel.mc-ios-safari #mc-namer-body,
            #mc-namer-panel.mc-ios-safari #mc-namer-log,
            #mc-namer-panel.mc-ios-safari #mc-station-log,
            #mc-namer-panel.mc-ios-safari #mc-personnel-log,
            #mc-namer-panel.mc-ios-safari #mc-personnel-report,
            #mc-namer-panel.mc-ios-safari #mc-personnel-after-action {
                -webkit-overflow-scrolling: touch;
            }
            #mc-namer-panel.mc-ios-safari .mc-namer-tab {
                min-height: 42px;
                padding: 7px 4px;
                font-size: 11px;
                line-height: 1.2;
            }
            #mc-namer-panel.mc-ios-safari .mc-namer-buttons button,
            #mc-namer-panel.mc-ios-safari select,
            #mc-namer-panel.mc-ios-safari input {
                min-height: 36px;
                font-size: 16px;
            }
            /* iOS Safari Personnel Assignment completeness contract. */
            #mc-namer-panel.mc-ios-safari #mc-personnel-import-register-file {
                display: none !important;
                position: absolute !important;
                inline-size: 0 !important;
                block-size: 0 !important;
                overflow: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }
            #mc-namer-panel.mc-ios-safari #mc-namer-body {
                min-height: 0;
                max-height: calc(
                    100dvh
                    - env(safe-area-inset-top, 0px)
                    - env(safe-area-inset-bottom, 0px)
                    - 58px
                );
                overflow-y: auto !important;
                overscroll-behavior: contain;
                -webkit-overflow-scrolling: touch;
                padding-bottom: max(14px, env(safe-area-inset-bottom, 0px));
            }
            #mc-namer-panel.mc-ios-safari .mc-nexus-action-bar {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
                align-items: stretch;
            }
            #mc-namer-panel.mc-ios-safari .mc-nexus-action-bar > button {
                display: inline-flex !important;
                align-items: center;
                justify-content: center;
                inline-size: 100%;
                min-inline-size: 0;
                min-height: 44px !important;
                padding: 8px 10px;
                line-height: 1.2;
                white-space: normal;
                overflow-wrap: anywhere;
                touch-action: manipulation;
            }
            #mc-namer-panel.mc-ios-safari #mc-personnel-refresh,
            #mc-namer-panel.mc-ios-safari #mc-personnel-start,
            #mc-namer-panel.mc-ios-safari .mc-compact-action-disclosure {
                grid-column: 1 / -1;
            }
            #mc-namer-panel.mc-ios-safari .mc-compact-disclosure {
                display: block !important;
                min-inline-size: 0;
                margin: 0;
                border: 1px solid #4b5563;
                border-radius: 7px;
                background: #111827;
                overflow: hidden;
            }
            #mc-namer-panel.mc-ios-safari .mc-compact-disclosure-summary {
                display: flex !important;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                min-height: 44px !important;
                padding: 9px 11px;
                color: #f8fafc;
                background: #1f2937;
                font-weight: 700;
                line-height: 1.2;
                list-style: none;
                cursor: pointer;
                user-select: none;
                touch-action: manipulation;
            }
            #mc-namer-panel.mc-ios-safari
            .mc-compact-disclosure-summary::-webkit-details-marker {
                display: none;
            }
            #mc-namer-panel.mc-ios-safari .mc-compact-summary-mark::before {
                content: "+";
                color: #93c5fd;
                font-size: 18px;
                line-height: 1;
            }
            #mc-namer-panel.mc-ios-safari
            .mc-compact-disclosure[open]
            > .mc-compact-disclosure-summary
            .mc-compact-summary-mark::before {
                content: "−";
            }
            #mc-namer-panel.mc-ios-safari .mc-compact-disclosure:not([open])
            > .mc-compact-disclosure-body {
                display: none !important;
            }
            #mc-namer-panel.mc-ios-safari .mc-compact-disclosure[open]
            > .mc-compact-disclosure-body {
                display: block !important;
                min-inline-size: 0;
                padding: 8px;
                border-top: 1px solid #374151;
            }
            #mc-namer-panel.mc-ios-safari .mc-compact-action-disclosure[open]
            > .mc-compact-disclosure-body {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
            }
            #mc-namer-panel.mc-ios-safari .mc-compact-action-disclosure button {
                display: inline-flex !important;
                align-items: center;
                justify-content: center;
                inline-size: 100%;
                min-inline-size: 0;
                min-height: 44px !important;
                padding: 8px;
                white-space: normal;
                overflow-wrap: anywhere;
                touch-action: manipulation;
            }
            #mc-namer-panel.mc-ios-safari .mc-nexus-personnel-grid
            > .mc-compact-disclosure {
                margin: 0 8px 8px;
            }
            /* End iOS Safari Personnel Assignment completeness contract. */
            #mc-namer-panel:not(.mc-ios-safari) {
                --nx-bg: #080d14;
                --nx-surface: #0d141e;
                --nx-surface-2: #121b27;
                --nx-surface-3: #172230;
                --nx-border: rgba(151, 171, 195, 0.18);
                --nx-border-strong: rgba(95, 195, 228, 0.36);
                --nx-text: #e7edf4;
                --nx-text-2: #b1bfce;
                --nx-muted: #7f8d9c;
                --nx-accent: #5fc3e4;
                --nx-accent-soft: rgba(95, 195, 228, 0.12);
                --nx-success: #62c99a;
                --nx-warning: #d7ad62;
                --nx-danger: #db7d83;
                --nx-radius: 10px;
                --nx-radius-sm: 7px;
                --nx-gap: 8px;
                top: 72px;
                right: 16px;
                width: min(860px, calc(100vw - 32px));
                max-width: calc(100vw - 32px);
                max-height: calc(100vh - 88px);
                border: 1px solid var(--nx-border-strong);
                border-radius: 14px;
                background: var(--nx-bg);
                color: var(--nx-text);
                box-shadow: 0 20px 56px rgba(0, 0, 0, 0.48);
                font-family: Inter, ui-sans-serif, system-ui, -apple-system,
                    BlinkMacSystemFont, "Segoe UI", sans-serif;
                font-size: 12px;
            }
            #mc-namer-panel:not(.mc-ios-safari)[data-active-tool="personnel"] {
                width: min(1080px, calc(100vw - 32px));
            }
            #mc-namer-panel:not(.mc-ios-safari),
            #mc-namer-panel:not(.mc-ios-safari) * {
                box-sizing: border-box;
            }
            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-header {
                min-height: 54px;
                padding: 8px 10px;
                border-bottom: 1px solid var(--nx-border);
                background: var(--nx-surface);
                cursor: move;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-brand-block,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-header-actions {
                display: flex;
                align-items: center;
                min-width: 0;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-brand-block {
                gap: 9px;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-header-actions {
                gap: 7px;
                flex: 0 0 auto;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-mark {
                display: grid;
                place-items: center;
                width: 34px;
                height: 34px;
                flex: 0 0 34px;
                border: 1px solid var(--nx-border-strong);
                border-radius: 9px;
                background: var(--nx-accent-soft);
                color: var(--nx-accent);
                font: 800 12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas,
                    monospace;
                letter-spacing: 0.08em;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-brand-copy {
                display: flex;
                flex-direction: column;
                min-width: 0;
                gap: 2px;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-eyebrow {
                color: var(--nx-muted);
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.13em;
                line-height: 1.1;
            }
            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-header-title {
                color: var(--nx-text);
                font-size: 14px;
                font-weight: 700;
                line-height: 1.2;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-version-chip {
                padding: 4px 7px;
                border: 1px solid var(--nx-border);
                border-radius: 999px;
                background: var(--nx-surface-2);
                color: var(--nx-text-2);
                font: 700 10px/1 ui-monospace, SFMono-Regular, Menlo, Consolas,
                    monospace;
                white-space: nowrap;
            }
            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-collapse {
                width: 30px;
                height: 30px;
                flex-basis: 30px;
                border: 1px solid var(--nx-border);
                border-radius: 8px;
                background: var(--nx-surface-2);
                color: var(--nx-text-2);
                font-size: 16px;
                line-height: 1;
            }
            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-collapse:hover,
            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-collapse:focus-visible {
                border-color: var(--nx-border-strong);
                background: var(--nx-accent-soft);
                color: var(--nx-accent);
                outline: 2px solid transparent;
            }
            #mc-namer-panel:not(.mc-ios-safari).mc-namer-collapsed {
                width: min(340px, calc(100vw - 32px));
            }
            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-body {
                min-height: 0;
                background: var(--nx-bg);
                scrollbar-color: rgba(127, 141, 156, 0.48) transparent;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tabs {
                position: sticky;
                top: 0;
                z-index: 20;
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 4px;
                padding: 6px;
                border-bottom: 1px solid var(--nx-border);
                background: rgba(8, 13, 20, 0.96);
                backdrop-filter: blur(12px);
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tab {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                min-width: 0;
                min-height: 36px;
                padding: 7px 9px;
                border: 1px solid transparent;
                border-radius: 8px;
                background: transparent;
                color: var(--nx-text-2);
                font-size: 11px;
                font-weight: 650;
                line-height: 1.2;
                overflow-wrap: anywhere;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tab-index {
                color: var(--nx-muted);
                font: 700 9px/1 ui-monospace, SFMono-Regular, Menlo, Consolas,
                    monospace;
                letter-spacing: 0.08em;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tab:hover,
            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tab:focus-visible {
                border-color: var(--nx-border);
                background: var(--nx-surface-2);
                color: var(--nx-text);
                outline: none;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tab.active {
                border-color: var(--nx-border-strong);
                background: var(--nx-accent-soft);
                color: var(--nx-text);
                box-shadow: none;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tab.active
            .mc-nexus-tab-index {
                color: var(--nx-accent);
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-tool-view {
                min-width: 0;
                padding: var(--nx-gap);
                background: var(--nx-bg);
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: var(--nx-gap);
                align-items: start;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-config-card,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-alert-card,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-report-controls,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-section {
                min-width: 0;
                padding: 10px;
                border: 1px solid var(--nx-border);
                border-radius: var(--nx-radius);
                background: var(--nx-surface);
                line-height: 1.42;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-config-card {
                grid-column: 1;
                grid-row: 1;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card {
                grid-column: 2;
                grid-row: 1;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
                gap: 6px;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card > div {
                min-width: 0;
                min-height: 56px;
                padding: 8px;
                border: 1px solid rgba(151, 171, 195, 0.12);
                border-radius: var(--nx-radius-sm);
                background: var(--nx-surface-2);
                overflow-wrap: anywhere;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card > div > b {
                display: block;
                margin-bottom: 4px;
                color: var(--nx-muted);
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card > div > span {
                color: var(--nx-text);
                font-variant-numeric: tabular-nums;
                font-weight: 650;
                overflow-wrap: anywhere;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar {
                grid-column: 1 / -1;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(126px, 1fr));
                gap: 6px;
                padding: 0;
                border: 0;
                background: transparent;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar button {
                min-width: 0;
                min-height: 36px;
                padding: 7px 9px;
                border: 1px solid var(--nx-border) !important;
                border-radius: 8px;
                background: var(--nx-surface-2) !important;
                color: var(--nx-text-2) !important;
                font-size: 11px;
                font-weight: 650;
                line-height: 1.2;
                white-space: normal;
                overflow-wrap: anywhere;
                transition: border-color 120ms ease, background 120ms ease,
                    color 120ms ease, transform 120ms ease;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar button:hover,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar button:focus-visible {
                border-color: var(--nx-border-strong) !important;
                background: var(--nx-surface-3) !important;
                color: var(--nx-text) !important;
                outline: none;
                transform: translateY(-1px);
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar
            :is(#mc-namer-start, #mc-station-start, #mc-personnel-start) {
                border-color: rgba(98, 201, 154, 0.42) !important;
                background: rgba(98, 201, 154, 0.11) !important;
                color: #b9ead4 !important;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar
            :is(#mc-namer-pause, #mc-station-pause, #mc-personnel-pause) {
                border-color: rgba(215, 173, 98, 0.42) !important;
                background: rgba(215, 173, 98, 0.10) !important;
                color: #ead4a8 !important;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar
            :is(#mc-namer-stop, #mc-station-stop, #mc-personnel-stop) {
                border-color: rgba(219, 125, 131, 0.42) !important;
                background: rgba(219, 125, 131, 0.10) !important;
                color: #efb9bd !important;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar
            :is(#mc-namer-refresh, #mc-station-refresh, #mc-personnel-refresh,
                #mc-personnel-build-register, #mc-personnel-full-register) {
                border-color: var(--nx-border-strong) !important;
                background: var(--nx-accent-soft) !important;
                color: #bfe8f5 !important;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-log,
            #mc-namer-panel:not(.mc-ios-safari) #mc-personnel-report,
            #mc-namer-panel:not(.mc-ios-safari) #mc-personnel-after-action {
                min-width: 0;
                border: 1px solid var(--nx-border);
                border-radius: var(--nx-radius);
                background: #070b11;
                color: #c7d3df;
                font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
                    monospace;
                font-size: 10.5px;
                line-height: 1.48;
                overflow-wrap: anywhere;
                scrollbar-color: rgba(127, 141, 156, 0.48) transparent;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-log {
                grid-column: 1 / -1;
                max-height: 240px;
                padding: 9px 10px;
            }
            #mc-namer-panel:not(.mc-ios-safari) label,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-navigation-title,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-log-heading,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-section > b,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-options > b {
                color: var(--nx-text-2);
                font-size: 10px;
                font-weight: 700;
                letter-spacing: 0.04em;
            }
            #mc-namer-panel:not(.mc-ios-safari) select,
            #mc-namer-panel:not(.mc-ios-safari) input:not([type="checkbox"]):not([type="file"]) {
                width: 100%;
                min-width: 0;
                min-height: 36px;
                margin-top: 4px;
                padding: 7px 9px;
                border: 1px solid var(--nx-border);
                border-radius: 8px;
                background: var(--nx-surface-2);
                color: var(--nx-text);
                font: 500 12px/1.25 Inter, ui-sans-serif, system-ui,
                    sans-serif;
            }
            #mc-namer-panel:not(.mc-ios-safari) select:focus-visible,
            #mc-namer-panel:not(.mc-ios-safari) input:focus-visible,
            #mc-namer-panel:not(.mc-ios-safari) button:focus-visible {
                outline: 2px solid rgba(95, 195, 228, 0.58);
                outline-offset: 1px;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-profile-banner,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-policy-summary,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-fixed-grid > div,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-toggle {
                border-color: var(--nx-border);
                background: var(--nx-surface-2);
                color: var(--nx-text-2);
                box-shadow: none;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-profile-banner.is-live {
                border-color: rgba(98, 201, 154, 0.42);
                background: rgba(98, 201, 154, 0.09);
                color: #b9ead4;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-profile-banner.is-preview {
                border-color: rgba(215, 173, 98, 0.42);
                background: rgba(215, 173, 98, 0.09);
                color: #ead4a8;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-policy-summary {
                border-left: 3px solid var(--nx-accent);
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid {
                grid-template-columns: minmax(290px, 0.85fr) minmax(0, 1.15fr);
                grid-template-areas:
                    "config status"
                    "actions actions"
                    "alert alert"
                    "report-controls report-controls"
                    "station-report overall-report"
                    "log-heading log-heading"
                    "log log";
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-config-card {
                grid-area: config;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-status-card {
                grid-area: status;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-action-bar {
                grid-area: actions;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-alert-card {
                grid-area: alert;
                border-color: rgba(219, 125, 131, 0.38);
                background: rgba(219, 125, 131, 0.07);
                box-shadow: none;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-report-controls {
                grid-area: report-controls;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-station-report {
                grid-area: station-report;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-overall-report {
                grid-area: overall-report;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-log-heading {
                grid-area: log-heading;
                padding: 7px 2px 0;
                border: 0;
                background: transparent;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid
            > .mc-nexus-log {
                grid-area: log;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-toggle-grid,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-fixed-grid {
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-section,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-note,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-input-note,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-training-shortfall-note {
                overflow-wrap: anywhere;
            }
            @media (max-width: 1180px) and (min-width: 901px) {
                #mc-namer-panel:not(.mc-ios-safari),
                #mc-namer-panel:not(.mc-ios-safari)[data-active-tool="personnel"] {
                    width: min(780px, calc(100vw - 24px));
                    right: 12px;
                }
                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }
            @media (max-width: 900px) and (min-width: 701px) {
                #mc-namer-panel:not(.mc-ios-safari),
                #mc-namer-panel:not(.mc-ios-safari)[data-active-tool="personnel"] {
                    top: 12px;
                    right: 12px;
                    width: calc(100vw - 24px);
                    max-height: calc(100vh - 24px);
                }
                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid,
                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid {
                    grid-template-columns: minmax(0, 1fr);
                    grid-template-areas: none;
                }
                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid > *,
                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid > * {
                    grid-column: 1 !important;
                    grid-row: auto !important;
                    grid-area: auto !important;
                }
            }
            @media (max-width: 700px) {
                #mc-namer-panel:not(.mc-ios-safari),
                #mc-namer-panel:not(.mc-ios-safari)[data-active-tool="personnel"] {
                    top: 8px;
                    right: 8px;
                    width: calc(100vw - 16px);
                    max-width: calc(100vw - 16px);
                    max-height: calc(100vh - 16px);
                }
                #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tabs {
                    grid-template-columns: minmax(0, 1fr);
                }
                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid,
                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid {
                    grid-template-columns: minmax(0, 1fr);
                    grid-template-areas: none;
                }
                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid > *,
                #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid > * {
                    grid-column: 1 !important;
                    grid-row: auto !important;
                    grid-area: auto !important;
                }
            }
            #mc-namer-panel:not(.mc-ios-safari) {
                top: 54px;
                right: 10px;
                width: min(440px, calc(100vw - 20px));
                max-width: calc(100vw - 20px);
                max-height: calc(100vh - 64px);
                border-radius: 9px;
                box-shadow: 0 12px 34px rgba(0, 0, 0, 0.42);
                font-size: 11px;
            }
            #mc-namer-panel:not(.mc-ios-safari)[data-active-tool="personnel"] {
                width: min(390px, calc(100vw - 20px));
            }
            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-header {
                min-height: 34px;
                padding: 4px 5px;
                gap: 5px;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-brand-block {
                gap: 5px;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-mark {
                width: 23px;
                height: 23px;
                flex-basis: 23px;
                border-radius: 6px;
                font-size: 8px;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-eyebrow,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tab-index {
                display: none;
            }
            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-header-title {
                font-size: 11px;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-version-chip {
                padding: 3px 5px;
                font-size: 8px;
            }
            #mc-namer-panel:not(.mc-ios-safari) #mc-namer-collapse {
                width: 25px;
                height: 25px;
                flex-basis: 25px;
                border-radius: 6px;
                font-size: 14px;
            }
            #mc-namer-panel:not(.mc-ios-safari).mc-namer-collapsed {
                width: min(205px, calc(100vw - 20px));
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tabs {
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 2px;
                padding: 3px;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-namer-tab {
                min-height: 27px;
                padding: 4px 5px;
                border-radius: 5px;
                font-size: 9.5px;
                line-height: 1.1;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-tool-view,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid {
                grid-template-columns: minmax(0, 1fr);
                grid-template-areas: none;
                gap: 4px;
                padding: 4px;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-tool-grid > *,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-personnel-grid > * {
                grid-column: 1 !important;
                grid-row: auto !important;
                grid-area: auto !important;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-config-card,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-alert-card,
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-report-controls,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-report-section {
                padding: 5px;
                border-radius: 6px;
                line-height: 1.3;
            }
            #mc-namer-panel:not(.mc-ios-safari) label[style] {
                margin-top: 3px !important;
            }
            #mc-namer-panel:not(.mc-ios-safari) label,
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-navigation-title {
                font-size: 9px;
                letter-spacing: 0.02em;
            }
            #mc-namer-panel:not(.mc-ios-safari) select,
            #mc-namer-panel:not(.mc-ios-safari)
            input:not([type="checkbox"]):not([type="file"]) {
                min-height: 28px;
                margin-top: 2px;
                padding: 4px 6px;
                border-radius: 5px;
                font-size: 11px;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar {
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 3px;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-action-bar button {
                min-height: 28px;
                padding: 4px 5px;
                border-radius: 5px;
                font-size: 9.5px;
                line-height: 1.1;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-compact-disclosure {
                min-width: 0;
                margin: 0;
                border: 1px solid var(--nx-border);
                border-radius: 6px;
                background: var(--nx-surface);
                overflow: hidden;
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-disclosure-summary {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                min-height: 27px;
                padding: 4px 6px;
                color: var(--nx-text-2);
                font-size: 9.5px;
                font-weight: 700;
                line-height: 1.1;
                cursor: pointer;
                list-style: none;
                user-select: none;
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-disclosure-summary::-webkit-details-marker {
                display: none;
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-summary-mark::before {
                content: "+";
                color: var(--nx-muted);
                font-size: 13px;
                line-height: 1;
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-disclosure[open]
            > .mc-compact-disclosure-summary
            .mc-compact-summary-mark::before {
                content: "−";
                color: var(--nx-accent);
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-disclosure[open]
            > .mc-compact-disclosure-summary {
                border-bottom: 1px solid var(--nx-border);
                color: var(--nx-text);
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-disclosure-body {
                min-width: 0;
                padding: 4px;
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-action-disclosure {
                grid-column: 1 / -1 !important;
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-action-disclosure
            .mc-compact-disclosure-body {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 3px;
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-compact-action-disclosure button {
                width: 100%;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-status-card {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                gap: 2px;
                padding: 0;
                border: 0;
                background: transparent;
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-nexus-status-card > div {
                display: grid;
                grid-template-columns: minmax(74px, 0.42fr) minmax(0, 1fr);
                gap: 5px;
                align-items: start;
                min-height: 0;
                padding: 3px 4px;
                border: 0;
                border-radius: 4px;
                background: var(--nx-surface-2);
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-nexus-status-card > div > b {
                display: block;
                margin: 0;
                font-size: 8px;
                letter-spacing: 0.04em;
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-nexus-status-card > div > span {
                font-size: 9.5px;
                line-height: 1.2;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-personnel-fixed-grid,
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-report-toggle-grid {
                grid-template-columns: minmax(0, 1fr);
                gap: 3px;
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-fixed-grid > div,
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-report-toggle {
                padding: 4px 5px;
                border-radius: 4px;
                text-align: left;
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-profile-banner,
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-policy-summary {
                margin: 4px 0;
                padding: 4px 5px;
                font-size: 9.5px;
                line-height: 1.25;
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-training-shortfall-section {
                padding: 5px;
            }
            #mc-namer-panel:not(.mc-ios-safari)
            .mc-personnel-log-heading {
                display: none;
            }
            #mc-namer-panel:not(.mc-ios-safari) .mc-nexus-log,
            #mc-namer-panel:not(.mc-ios-safari) #mc-personnel-report,
            #mc-namer-panel:not(.mc-ios-safari) #mc-personnel-after-action {
                max-height: 170px;
                min-height: 0;
                margin: 0;
                padding: 5px;
                border-radius: 4px;
                font-size: 9px;
                line-height: 1.35;
            }
            @media (max-width: 700px) {
                #mc-namer-panel:not(.mc-ios-safari),
                #mc-namer-panel:not(.mc-ios-safari)[data-active-tool="personnel"] {
                    top: 8px;
                    right: 8px;
                    width: calc(100vw - 16px);
                    max-width: calc(100vw - 16px);
                    max-height: calc(100vh - 16px);
                }
            }
        `;
        document.head.appendChild(style);
        document.querySelector('#mc-tab-unit').onclick = () => switchToolTab('unit');
        document.querySelector('#mc-tab-station').onclick = () => switchToolTab('station');
        document.querySelector('#mc-tab-personnel').onclick = () => switchToolTab('personnel');
        document.querySelector('#mc-namer-collapse').onclick = event => {
            event.preventDefault();
            event.stopPropagation();
            togglePanelCollapsed();
        };
        document.querySelector('#mc-namer-collapse').onmousedown = event => {
            event.stopPropagation();
        };
        document.querySelector('#mc-namer-refresh').onclick = refreshStations;
        document.querySelector('#mc-namer-start').onclick = startRun;
        document.querySelector('#mc-namer-pause').onclick = togglePause;
        document.querySelector('#mc-namer-stop').onclick = stopRun;
        document.querySelector('#mc-namer-debug').onclick = toggleDebug;
        document.querySelector('#mc-namer-clear').onclick = clearLog;
        document.querySelector('#mc-namer-dispatch-centre').onchange = handleUnitDispatchCentreChange;
        installNamingDispatchCentreRefreshListener();
        document.querySelector('#mc-namer-service').onchange = handleUnitNamingServiceChange;
        document.querySelector('#mc-namer-station-type').onchange = handleUnitStationTypeChange;
        document.querySelector('#mc-namer-unit-class').onchange = handleUnitClassChange;
        populateUnitClassDropdown();
        void refreshNamingDispatchCentres(false);
        document.querySelector('#mc-station-refresh').onclick = refreshStationNamingStations;
        document.querySelector('#mc-station-start').onclick = startStationNamingRun;
        document.querySelector('#mc-station-pause').onclick = toggleStationNamingPause;
        document.querySelector('#mc-station-stop').onclick = stopStationNamingRun;
        document.querySelector('#mc-station-debug').onclick = toggleStationDebug;
        document.querySelector('#mc-station-diagnostics').onclick = downloadStationNamingDiagnostics;
        document.querySelector('#mc-station-clear').onclick = clearStationLog;
        document.querySelector('#mc-station-dispatch-centre').onchange = handleStationDispatchCentreChange;
        document.querySelector('#mc-station-service').onchange = handleStationNamingServiceChange;
        document.querySelector('#mc-station-type').onchange = populateStationNamingStartDropdown;
        document.querySelector('#mc-station-startfrom').onchange = updateStationNamingSelectionPreview;
        document.querySelector('#mc-station-mode').onchange = () => {
            STATION_STATE.mode = document.querySelector('#mc-station-mode')?.value || 'all';
        };
        document.querySelector('#mc-station-action').onchange = () => {
            STATION_STATE.action = document.querySelector('#mc-station-action')?.value || 'preview';
        };
        document.querySelector('#mc-personnel-service').onchange = handlePersonnelServiceChange;
        document.querySelector('#mc-personnel-profile').onchange = handlePersonnelProfileChange;
        document.querySelector('#mc-personnel-units-required').onchange = handlePersonnelUnitsRequiredChange;
        document.querySelector('#mc-personnel-refresh').onclick = refreshPersonnelStations;
        document.querySelector('#mc-personnel-start').onclick = startPersonnelRun;
        document.querySelector('#mc-personnel-pause').onclick = togglePersonnelPause;
        document.querySelector('#mc-personnel-stop').onclick = stopPersonnelRun;
        document.querySelector('#mc-personnel-view-station-report').onclick = showAndViewPersonnelStationReport;
        document.querySelector('#mc-personnel-copy-station').onclick = copyPersonnelStationReport;
        document.querySelector('#mc-personnel-copy').onclick = copyPersonnelReport;
        document.querySelector('#mc-personnel-debug').onclick = togglePersonnelDebug;
        document.querySelector('#mc-personnel-clear').onclick = clearPersonnelLog;
        document.querySelector('#mc-personnel-startfrom').onchange = updatePersonnelSelectionPreview;
        document.querySelector('#mc-personnel-mode').onchange =
            handlePersonnelModeChange;
        document.querySelector('#mc-personnel-action').onchange = () => {
            PERSONNEL_STATE.action = document.querySelector('#mc-personnel-action')?.value || 'preview';
        };
        document.querySelector('#mc-personnel-show-station-report').onchange = () => updatePersonnelReportVisibility(true);
        document.querySelector('#mc-personnel-show-overall-report').onchange = () => updatePersonnelReportVisibility(true);
        initialisePersonnelProfileNavigation();
        initialisePersonnelReportVisibility();
        let savedTab = 'unit';
        let savedCollapsed = false;
        try {
            savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) || 'unit';
            savedCollapsed = localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
        } catch (e) {}
        switchToolTab(savedTab === 'station' ? 'station' : savedTab === 'personnel' ? 'personnel' : 'unit', true);
        setPanelCollapsed(savedCollapsed, false);
        panel.setAttribute('data-nexus-namer-ready','');
        window.dispatchEvent(new Event('nexus:renamer-ready'));
    }
    function getPersonnelServiceDefinition(serviceId = PERSONNEL_STATE.service) {
        return PERSONNEL_SERVICE_DEFINITIONS[serviceId]
            || PERSONNEL_SERVICE_DEFINITIONS.medical;
    }
    function getPersonnelProfileDefinition(serviceId = PERSONNEL_STATE.service, profileId = PERSONNEL_STATE.profile) {
        const service = getPersonnelServiceDefinition(serviceId);
        return service.profiles.find(profile => profile.id === profileId)
            || service.profiles[0];
    }
    function isLivePersonnelProfile() {
        return getPersonnelProfileDefinition()?.live === true;
    }
    function normalisePersonnelUnitsRequired(value) {
        const parsed = Number.parseInt(String(value ?? '').trim(), 10);
        if (!Number.isFinite(parsed) || parsed < 0) return 0;
        return Math.min(9999, parsed);
    }
    function isPersonnelPerStationTargetMode() {
        return (
            PERSONNEL_STATE.mode === 'target'
            && PERSONNEL_STATE.unitsRequired > 0
        );
    }
    const NEXUS_PERSONNEL_CAPACITY = {"0":9,"1":5,"2":3,"3":3,"4":5,"5":2,"6":3,"7":6,"8":2,"9":5,"10":1,"11":3,"12":2,"13":4,"14":3,"15":6,"16":9,"17":6,"18":1,"19":3,"20":1,"21":1,"22":1,"23":12,"24":2,"25":2,"26":3,"27":2,"28":2,"29":2,"30":2,"31":2,"32":2,"33":2,"34":1,"35":2,"36":2,"37":9,"38":9,"39":6,"40":2,"41":0,"42":0,"43":0,"44":0,"45":0,"46":0,"47":0,"48":0,"49":0,"50":0,"51":9,"52":9,"53":4,"54":2,"55":8,"56":6,"57":5,"58":5,"59":5,"60":5,"61":0,"62":0,"63":8,"64":4,"65":4,"66":4,"67":0,"68":4,"69":7,"70":0,"71":0,"72":1,"73":4,"74":0,"75":4,"76":4,"77":2,"78":2,"79":2,"80":2,"81":0,"82":2,"83":1,"84":0,"85":3,"86":3,"87":0,"88":0,"89":2,"90":2,"91":2,"92":1,"93":1,"94":1,"95":2,"96":2,"97":2,"98":2,"99":4,"100":3,"101":1,"102":1,"103":12,"104":2,"105":2,"106":2,"107":2,"108":2,"109":2,"110":4,"111":3,"112":2,"113":4,"114":3,"115":2,"116":5};
    function nexusPersonnelCrewChoice() {
        const value = Number(PERSONNEL_STATE.crewChoice || 0);
        return Number.isInteger(value) && value >= -1 && value <= 100 ? value : 0;
    }
    function nexusSyncPersonnelCrewUi() {
        const input = document.querySelector('#mc-personnel-crew-each');
        if (!input) return;
        input.disabled = PERSONNEL_STATE.running || !isLivePersonnelProfile();
        if (PERSONNEL_STATE.running) return;
        const profile = getPersonnelProfileDefinition();
        const types = profile?.rules?.flatMap(rule => rule.vehicleTypeIds) || ['5'];
        const max = Math.max(1, ...types.map(type => NEXUS_PERSONNEL_CAPACITY[type] || 1));
        let saved = 0;
        try { saved = Number(localStorage.getItem('nexus-personnel-crew-' + PERSONNEL_STATE.service + '-' + PERSONNEL_STATE.profile) || 0); } catch {}
        if (!Number.isInteger(saved) || saved < -1 || saved > max) saved = 0;
        input.replaceChildren(new Option('Profile default', '0'), new Option('Fill to vehicle maximum', '-1'));
        for (let n = 1; n <= max; n++) input.add(new Option(String(n), String(n)));
        PERSONNEL_STATE.crewChoice = saved;
        input.value = String(saved);
        input.onchange = () => {
            if (PERSONNEL_STATE.running) { input.value = String(nexusPersonnelCrewChoice()); return; }
            PERSONNEL_STATE.crewChoice = Number(input.value);
            try { localStorage.setItem('nexus-personnel-crew-' + PERSONNEL_STATE.service + '-' + PERSONNEL_STATE.profile, input.value); } catch {}
        };
    }
    function nexusPersonnelRulesWithTargets(rules, vehicles) {
        const choice = nexusPersonnelCrewChoice();
        if (!choice) return rules;
        return rules.flatMap(rule => {
            const groups = new Map();
            for (const vehicle of vehicles) {
                if (!rule.vehicleTypeIds.includes(vehicle.vehicleTypeId) ||
                    (rule.fixedVehicleIds && !rule.fixedVehicleIds.includes(vehicle.vehicleId))) continue;
                const observed = Number(vehicle.maxCount);
                const capacity = Number.isInteger(observed) && observed > 0 ? observed : NEXUS_PERSONNEL_CAPACITY[vehicle.vehicleTypeId];
                if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Vehicle capacity unavailable for ' + vehicle.name);
                const target = choice === -1 ? capacity : Math.min(choice, capacity);
                if (!groups.has(target)) groups.set(target, []);
                groups.get(target).push(vehicle.vehicleId);
            }
            return [...groups].map(([target, ids]) => ({...rule, target, fixedVehicleIds:ids}));
        });
    }

    function getPersonnelUnitsRemaining() {
        return isPersonnelPerStationTargetMode()
            ? PERSONNEL_STATE.unitsRequired
            : Number.POSITIVE_INFINITY;
    }
    function formatPersonnelUnitsFulfilled() {
        if (isPersonnelPerStationTargetMode()) {
            const target = PERSONNEL_STATE.unitsRequired;
            const latestFulfilled = PERSONNEL_STATE.lastStationReport
                && !PERSONNEL_STATE.lastStationReport.error
                    ? Math.min(
                        target,
                        Number(
                            PERSONNEL_STATE.lastStationReport.fulfilledUnits
                            || 0
                        )
                    )
                    : 0;
            return `${PERSONNEL_STATE.stationsTargetMet} / ${PERSONNEL_STATE.completedStations} stations met | latest ${latestFulfilled}/${target}`;
        }
        return `${PERSONNEL_STATE.unitsFulfilled} / All`;
    }
    function handlePersonnelUnitsRequiredChange() {
        const input =
            document.querySelector(
                '#mc-personnel-units-required'
            );
        if (!input) return;
        if (PERSONNEL_STATE.running) {
            input.value =
                String(
                    PERSONNEL_STATE
                        .configuredUnitsRequired ||
                    0
                );
            personnelLog(
                'Stop Personnel Assignment before changing Units required.',
                'error'
            );
            return;
        }
        const configuredTarget =
            normalisePersonnelUnitsRequired(
                input.value
            );
        PERSONNEL_STATE
            .configuredUnitsRequired =
                configuredTarget;
        PERSONNEL_STATE.unitsRequired =
            0;
        PERSONNEL_STATE.unitsFulfilled =
            0;
        PERSONNEL_STATE.unitTargetReached =
            false;
        input.value =
            String(configuredTarget);
        try {
            localStorage.setItem(
                PERSONNEL_UNITS_REQUIRED_STORAGE_KEY,
                String(configuredTarget)
            );
        } catch (_error) {}
        setPersonnelUiValue(
            'unitsFulfilled',
            configuredTarget > 0
                ? `0 / ${configuredTarget}`
                : '0 / target not set'
        );
        personnelLog(
            configuredTarget > 0
                ? `Each-station target is configured for ${configuredTarget} fully staffed unit(s).`
                : 'Each-station target has not been entered yet.',
            'debug'
        );
    }
    function updatePersonnelModeUi() {
        const modeSelect =
            document.querySelector(
                '#mc-personnel-mode'
            );
        const input =
            document.querySelector(
                '#mc-personnel-units-required'
            );
        const note =
            document.querySelector(
                '#mc-personnel-units-required-note'
            );
        const live =
            isLivePersonnelProfile();
        const mode =
            modeSelect?.value ||
            PERSONNEL_STATE.mode ||
            'all';
        PERSONNEL_STATE.mode =
            mode;
        const targetMode =
            mode === 'target';
        const fulfilledLabel =
            document.querySelector(
                '#mc-personnel-units-fulfilled-label'
            );
        if (fulfilledLabel) {
            fulfilledLabel.textContent =
                targetMode
                    ? 'Station targets met:'
                    : 'Units fulfilled:';
        }
        if (input) {
            input.disabled =
                !live ||
                !targetMode;
            input.value =
                targetMode
                    ? String(
                        PERSONNEL_STATE
                            .configuredUnitsRequired ||
                        0
                    )
                    : '0';
        }
        if (note) {
            note.textContent =
                targetMode
                    ? 'Enter the number of fully staffed units required at every station. Existing covered units count first; only the missing units are topped up.'
                    : mode === 'single'
                        ? 'Selected Station mode scans every matching unit at that one station. Units required is not used.'
                        : 'All Stations mode always scans every relevant station from the selected start point. Units required is not used.';
        }
        if (
            !PERSONNEL_STATE.running
        ) {
            setPersonnelUiValue(
                'unitsFulfilled',
                targetMode &&
                PERSONNEL_STATE
                    .configuredUnitsRequired >
                    0
                    ? `0 / ${PERSONNEL_STATE.configuredUnitsRequired}`
                    : '0 / All'
            );
        }
    }
    function handlePersonnelModeChange() {
        if (PERSONNEL_STATE.running) {
            const select =
                document.querySelector(
                    '#mc-personnel-mode'
                );
            if (select) {
                select.value =
                    PERSONNEL_STATE.mode ||
                    'all';
            }
            personnelLog(
                'Stop Personnel Assignment before changing Mode.',
                'error'
            );
            return;
        }
        PERSONNEL_STATE.mode =
            document.querySelector(
                '#mc-personnel-mode'
            )?.value ||
            'all';
        PERSONNEL_STATE.unitsRequired =
            0;
        PERSONNEL_STATE.unitsFulfilled =
            0;
        PERSONNEL_STATE.unitTargetReached =
            false;
        updatePersonnelModeUi();
        const modeMessage =
            PERSONNEL_STATE.mode ===
                'target'
                ? 'Mode set to enforce the Units required target independently at every station.'
                : PERSONNEL_STATE.mode ===
                    'single'
                    ? 'Mode set to Selected station only.'
                    : 'Mode set to All relevant stations. Every station in scope will be scanned.';
        personnelLog(
            modeMessage,
            'debug'
        );
    }
    function initialisePersonnelProfileNavigation() {
        const serviceSelect = document.querySelector('#mc-personnel-service');
        if (!serviceSelect) return;
        let savedService = 'medical';
        let savedProfile = 'critical_care';
        let savedUnitsRequired = 0;
        try {
            savedService = localStorage.getItem(PERSONNEL_SERVICE_STORAGE_KEY) || 'medical';
            savedProfile = localStorage.getItem(PERSONNEL_PROFILE_STORAGE_KEY) || 'critical_care';
            savedUnitsRequired = normalisePersonnelUnitsRequired(localStorage.getItem(PERSONNEL_UNITS_REQUIRED_STORAGE_KEY) || 0);
        } catch (_error) {}
        if (savedService === 'mountain') savedService = 'coastguard';
        if (savedService === 'airport') savedService = 'fire';
        if (!PERSONNEL_SERVICE_DEFINITIONS[savedService]) savedService = 'medical';
        PERSONNEL_STATE.service = savedService;
        PERSONNEL_STATE.profile =
            savedProfile;
        PERSONNEL_STATE
            .configuredUnitsRequired =
                savedUnitsRequired;
        PERSONNEL_STATE.unitsRequired =
            0;
        PERSONNEL_STATE.unitsFulfilled =
            0;
        PERSONNEL_STATE.mode =
            document.querySelector(
                '#mc-personnel-mode'
            )?.value ||
            'all';
        serviceSelect.value =
            savedService;
        populatePersonnelProfileSelect(
            savedProfile
        );
        updatePersonnelProfileUi(
            false
        );
        updatePersonnelModeUi();
    }
    function populatePersonnelProfileSelect(preferredProfileId = '') {
        const select = document.querySelector('#mc-personnel-profile');
        if (!select) return;
        const service = getPersonnelServiceDefinition();
        select.innerHTML = '';
        service.profiles.forEach(profile => {
            const option = document.createElement('option');
            option.value = profile.id;
            option.textContent = `${profile.label}${profile.live ? ' — LIVE' : ' — UI preview'}`;
            select.appendChild(option);
        });
        const validPreferred = service.profiles.some(profile => profile.id === preferredProfileId)
            ? preferredProfileId
            : service.profiles[0]?.id || '';
        PERSONNEL_STATE.profile = validPreferred;
        select.value = validPreferred;
    }
    function handlePersonnelServiceChange() {
        if (PERSONNEL_STATE.running) {
            personnelLog('Stop Personnel Assignment before changing Service.', 'error');
            const select = document.querySelector('#mc-personnel-service');
            if (select) select.value = PERSONNEL_STATE.service;
            return;
        }
        PERSONNEL_STATE.service = document.querySelector('#mc-personnel-service')?.value || 'medical';
        populatePersonnelProfileSelect('');
        updatePersonnelProfileUi(true);
    }
    function handlePersonnelProfileChange() {
        if (PERSONNEL_STATE.running) {
            personnelLog('Stop Personnel Assignment before changing Training profile.', 'error');
            const select = document.querySelector('#mc-personnel-profile');
            if (select) select.value = PERSONNEL_STATE.profile;
            return;
        }
        PERSONNEL_STATE.profile = document.querySelector('#mc-personnel-profile')?.value || 'critical_care';
        updatePersonnelProfileUi(true);
    }
    function updatePersonnelProfileUi(save = true) {
        nexusSyncPersonnelCrewUi();
        const service = getPersonnelServiceDefinition();
        const profile = getPersonnelProfileDefinition();
        const live = isLivePersonnelProfile();
        const training = document.querySelector('#mc-personnel-profile-training');
        const vehicle = document.querySelector('#mc-personnel-profile-vehicle');
        const requirement = document.querySelector('#mc-personnel-profile-requirement');
        const policy = document.querySelector('#mc-personnel-policy-summary');
        const banner = document.querySelector('#mc-personnel-profile-banner');
        const modeAll = document.querySelector('#mc-personnel-mode-all-option');
        const start = document.querySelector('#mc-personnel-start');
        const refresh = document.querySelector('#mc-personnel-refresh');
        const mode = document.querySelector('#mc-personnel-mode');
        const action = document.querySelector('#mc-personnel-action');
        const unitsRequired = document.querySelector('#mc-personnel-units-required');
        const startFrom = document.querySelector('#mc-personnel-startfrom');
        if (training) training.textContent = profile.label;
        if (vehicle) vehicle.textContent = profile.vehicle;
        if (requirement) requirement.textContent = profile.requirement;
        if (policy) {
            policy.innerHTML = `<strong>${service.icon} ${service.label} policy:</strong> ${profile.policy}`;
        }
        if (banner) {
            banner.classList.toggle('is-live', live);
            banner.classList.toggle('is-preview', !live);
            banner.textContent = live
                ? '● LIVE PROFILE — the selected assignment engine is enabled.'
                : '◐ UI PREVIEW ONLY — assignment controls are safely disabled for this profile.';
        }
        if (modeAll) {
            modeAll.textContent = live
                ? `All ${getPersonnelStationScopeLabel()} from selected start point`
                : `All relevant ${service.label} stations from selected start point`;
        }
        [start, refresh, mode, action, startFrom].forEach(control => {
            if (control) control.disabled = !live;
        });
        if (unitsRequired) {
            unitsRequired.disabled =
                !live ||
                (
                    document.querySelector(
                        '#mc-personnel-mode'
                    )?.value ||
                    'all'
                ) !== 'target';
        }
        if (start) {
            start.title = live
                ? 'Start the selected Personnel Assignment profile'
                : 'This profile is a UI preview and cannot make assignments yet';
        }
        if (live) {
            setPersonnelUiValue('status', PERSONNEL_STATE.filteredStations.length ? 'Ready' : 'Refresh required');
        } else {
            setPersonnelUiValue('status', 'Profile UI preview');
            setPersonnelUiValue('vehicle', 'Not enabled');
        }
        if (save) {
            PERSONNEL_STATE.stations = [];
            PERSONNEL_STATE.filteredStations = [];
            PERSONNEL_STATE.queue = [];
            PERSONNEL_STATE.selectedHref = '';
            PERSONNEL_STATE.unitsFulfilled = 0;
            PERSONNEL_STATE.unitTargetReached = false;
            setPersonnelUiValue('unitsFulfilled', PERSONNEL_STATE.unitsRequired > 0 ? `0 / ${PERSONNEL_STATE.unitsRequired}` : '0 / All');
            populatePersonnelStartDropdown();
            setPersonnelUiValue('status', live ? 'Refresh required' : 'Profile UI preview');
            setPersonnelUiValue('vehicle', live ? 'None' : 'Not enabled');
            try {
                localStorage.setItem(PERSONNEL_SERVICE_STORAGE_KEY, PERSONNEL_STATE.service);
                localStorage.setItem(PERSONNEL_PROFILE_STORAGE_KEY, PERSONNEL_STATE.profile);
            } catch (_error) {}
            personnelLog(`${service.icon} Service: ${service.label} | Training profile: ${profile.label}${live ? ' (LIVE)' : ' (UI preview only)'}`, live ? 'info' : 'debug');
        }
        updatePersonnelModeUi();
    }
    function initialisePersonnelReportVisibility() {
        const stationCheckbox = document.querySelector('#mc-personnel-show-station-report');
        const overallCheckbox = document.querySelector('#mc-personnel-show-overall-report');
        if (!stationCheckbox || !overallCheckbox) return;
        let showStation = true;
        let showOverall = true;
        try {
            showStation = localStorage.getItem(PERSONNEL_STATION_REPORT_VISIBLE_KEY) !== 'false';
            showOverall = localStorage.getItem(PERSONNEL_OVERALL_REPORT_VISIBLE_KEY) !== 'false';
        } catch (_error) {}
        stationCheckbox.checked = showStation;
        overallCheckbox.checked = showOverall;
        updatePersonnelReportVisibility(false);
    }
    function updatePersonnelReportVisibility(save = true) {
        const stationCheckbox = document.querySelector('#mc-personnel-show-station-report');
        const overallCheckbox = document.querySelector('#mc-personnel-show-overall-report');
        const stationSection = document.querySelector('#mc-personnel-after-action-section');
        const overallSection = document.querySelector('#mc-personnel-overall-report-section');
        if (!stationCheckbox || !overallCheckbox || !stationSection || !overallSection) return;
        const showStation = Boolean(stationCheckbox.checked);
        const showOverall = Boolean(overallCheckbox.checked);
        stationSection.hidden = !showStation;
        overallSection.hidden = !showOverall;
        stationCheckbox.setAttribute('aria-expanded', showStation ? 'true' : 'false');
        overallCheckbox.setAttribute('aria-expanded', showOverall ? 'true' : 'false');
        if (save) {
            try {
                localStorage.setItem(PERSONNEL_STATION_REPORT_VISIBLE_KEY, showStation ? 'true' : 'false');
                localStorage.setItem(PERSONNEL_OVERALL_REPORT_VISIBLE_KEY, showOverall ? 'true' : 'false');
            } catch (_error) {}
        }
    }
    function showAndViewPersonnelStationReport() {
        const checkbox = document.querySelector('#mc-personnel-show-station-report');
        if (checkbox && !checkbox.checked) {
            checkbox.checked = true;
            updatePersonnelReportVisibility(true);
        }
        requestAnimationFrame(() => scrollPersonnelTo('mc-personnel-after-action-section'));
    }
    function togglePanelCollapsed() {
        const panel = document.querySelector('#mc-namer-panel');
        if (!panel) return;
        setPanelCollapsed(!panel.classList.contains('mc-namer-collapsed'));
    }
    function setPanelCollapsed(collapsed, save = true) {
        const panel = document.querySelector('#mc-namer-panel');
        const button = document.querySelector('#mc-namer-collapse');
        if (!panel || !button) return;
        panel.classList.toggle('mc-namer-collapsed', Boolean(collapsed));
        button.textContent = collapsed ? '+' : '−';
        button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        button.title = collapsed ? 'Expand naming tools' : 'Collapse naming tools';
        if (save) {
            try {
                localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? 'true' : 'false');
            } catch (e) {}
        }
    }
    function switchToolTab(tabName, force = false) {
        const targetTab = ['unit', 'station', 'personnel'].includes(tabName)
            ? tabName
            : 'unit';
        const panel = document.querySelector('#mc-namer-panel');
        const unitView = document.querySelector('#mc-unit-view');
        const stationView = document.querySelector('#mc-station-view');
        const personnelView = document.querySelector('#mc-personnel-view');
        const unitTab = document.querySelector('#mc-tab-unit');
        const stationTab = document.querySelector('#mc-tab-station');
        const personnelTab = document.querySelector('#mc-tab-personnel');
        const headerTitle = document.querySelector('#mc-namer-header-title');
        const headerVersion = document.querySelector('#mc-namer-header-version');
        if (
            !panel ||
            !unitView ||
            !stationView ||
            !personnelView ||
            !unitTab ||
            !stationTab ||
            !personnelTab ||
            !headerTitle ||
            !headerVersion
        ) {
            return;
        }
        if (!force && STATE.running && targetTab !== 'unit') {
            log('Stop the Unit Naming Tool before switching tabs.', 'error');
            return;
        }
        if (!force && STATION_STATE.running && targetTab !== 'station') {
            stationLog('Stop the Station Naming Tool before switching tabs.', 'error');
            return;
        }
        if (!force && PERSONNEL_STATE.running && targetTab !== 'personnel') {
            personnelLog('Stop Personnel Assignment before switching tabs.', 'error');
            return;
        }
        const showUnit = targetTab === 'unit';
        const showStation = targetTab === 'station';
        const showPersonnel = targetTab === 'personnel';
        unitView.style.display = showUnit ? 'grid' : 'none';
        stationView.style.display = showStation ? 'grid' : 'none';
        personnelView.style.display = showPersonnel ? 'grid' : 'none';
        unitTab.classList.toggle('active', showUnit);
        stationTab.classList.toggle('active', showStation);
        personnelTab.classList.toggle('active', showPersonnel);
        unitTab.setAttribute('aria-selected', showUnit ? 'true' : 'false');
        stationTab.setAttribute('aria-selected', showStation ? 'true' : 'false');
        personnelTab.setAttribute('aria-selected', showPersonnel ? 'true' : 'false');
        headerTitle.textContent = showUnit
            ? 'Unit Naming'
            : showStation
                ? 'Station Naming'
                : 'Personnel Assignment';
        headerVersion.textContent = showUnit
            ? `v${UNIT_VERSION}`
            : showStation
                ? `v${STATION_VERSION}`
                : `v${PERSONNEL_VERSION}`;
        panel.dataset.activeTool = targetTab;
        if (!force && panel.hasAttribute('data-nexus-renamer-docked')) window.dispatchEvent(new Event('nexus:tools-open-renamer'));
        try {
            localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, targetTab);
        } catch (_error) {}
    }
    async function refreshStationNamingStations() {
        if (PERSONNEL_STATE.running) {
            stationLog('Personnel Assignment is currently running. Stop it before refreshing Station Naming.', 'error');
            setStationUiValue('status', 'Blocked by Personnel Assignment');
            return;
        }
        if (STATE.running) {
            stationLog('Unit Naming is currently running. Stop it before refreshing Station Naming.', 'error');
            setStationUiValue('status', 'Blocked by Unit Naming');
            return;
        }
        if (STATION_STATE.running) {
            stationLog('Stop Station Naming before refreshing the station list.', 'error');
            return;
        }
        setStationUiValue('status', 'Refreshing stations...');
        stationLog('Refreshing station list and reading MissionChief building type IDs...', 'info');
        const ready = await Promise.all([loadNamingDispatchCentreList(true),loadNamingDispatchCentreData(true)]);
        if (ready.some(value => !value)) {
            hydrateNamingInventoriesFromCurrentOverview();populateStartDropdown();populateStationNamingStartDropdown();setStatus('Station list unavailable');setStationUiValue('status', 'Station list unavailable');stationLog(getNamingDispatchCentreRefreshFailureReason(),'error');return;
        }
        const stationEntries = getNamingStationEntries();
        STATION_STATE.stations = stationEntries
            .map((entry, index) => {
                const typeInfo = getStationNamingTypeInfo(
                    entry.buildingTypeId,
                    entry.displayName
                );
                return {
                    index,
                    href: entry.href,
                    buildingId: entry.buildingId,
                    displayName: entry.displayName,
                    buildingTypeId: entry.buildingTypeId,
                    dispatchCentreId: getNamingDispatchCentreId(entry.buildingId),
                    stationType: typeInfo.stationType,
                    service: getNamingServiceForStation({
                        buildingTypeId: entry.buildingTypeId,
                        stationType: typeInfo.stationType
                    }),
                    suffix: typeInfo.suffix,
                    namingMode: typeInfo.namingMode || '',
                    typeLabel: typeInfo.label
                };
            })
            .filter(station => station.href && station.buildingId);
        populateNamingDispatchCentreFilter('mc-station-dispatch-centre');
        populateNamingServiceFilter('mc-station-service', 'mc-station-dispatch-centre', STATION_STATE.stations);
        populateNamingStationTypeFilter('mc-station-type', 'mc-station-dispatch-centre', 'mc-station-service', STATION_STATE.stations);
        populateStationNamingStartDropdown();
        setStationUiValue('status', 'Ready');
        stationLog(`Stations found: ${STATION_STATE.stations.length}`, 'info');
        stationLog(`Matching filter: ${STATION_STATE.filteredStations.length}`, 'info');
        if (STATION_STATE.filteredStations.length) {
            stationLog(`First match: ${STATION_STATE.filteredStations[0].displayName}`, 'info');
            stationLog(`Last match : ${STATION_STATE.filteredStations[STATION_STATE.filteredStations.length - 1].displayName}`, 'info');
        }
    }
    function getStationNamingTypeInfo(buildingTypeId, displayName) {
        const name = cleanText(displayName).toUpperCase();
        if ((buildingTypeId === 0 || buildingTypeId === 18)
            && (/\bAIRPORT\b|\bAIRFIELD\b/.test(name) || /-AF\d*$/.test(name))) {
            return { stationType: 'AIRFIELD', suffix: '-AF', label: 'Airfield station' };
        }
        const mapped = STATION_BUILDING_TYPE_INFO[buildingTypeId];
        if (mapped) return mapped;
        const detectedType = detectStationType(displayName);
        const fallbackByType = {
            FIRE: { stationType: 'FIRE', suffix: '-FS', label: 'Fire station' },
            AMBULANCE: { stationType: 'AMBULANCE', suffix: '-AS', label: 'Ambulance station' },
            POLICE: { stationType: 'POLICE', suffix: '-PS', label: 'Police station' },
            RNLI: { stationType: 'RNLI', suffix: '-RNLI', label: 'RNLI / lifeboat station' },
            COASTGUARD: { stationType: 'COASTGUARD', suffix: '-CG', label: 'Coastguard station' },
            SAR: { stationType: 'SAR', suffix: '-SAR', label: 'Search and rescue station' },
            AIRFIELD: { stationType: 'AIRFIELD', suffix: '-AF', label: 'Airfield station' },
            EOD: { stationType: 'EOD', suffix: '-EOD', label: 'EOD / bomb disposal station' },
            RECOVERY: { stationType: 'RECOVERY', suffix: '-REC', label: 'Recovery station' }
        };
        if (detectedType === 'AIR') {
            return /POLICE/i.test(name)
                ? { stationType: 'AIR', suffix: '-PH', label: 'Police helicopter station' }
                : { stationType: 'AIR', suffix: '-AA', label: 'Air ambulance station' };
        }
        return fallbackByType[detectedType]
            || { stationType: 'OTHER', suffix: '', label: `Unsupported building type ${buildingTypeId ?? 'unknown'}` };
    }
    function populateStationNamingStartDropdown() {
        const select = document.querySelector('#mc-station-startfrom');
        if (!select) return;
        const selectedService = document.querySelector('#mc-station-service')?.value || 'ALL';
        const selectedType = document.querySelector('#mc-station-type')?.value || 'ALL';
        const selectedDispatchCentre =
            document.querySelector('#mc-station-dispatch-centre')?.value ||
            NAMING_DISPATCH_CENTRE_ALL;
        STATION_STATE.filteredStations = STATION_STATE.stations.filter(station => {
            const stationTypeMatches =
                selectedType === 'ALL' || station.stationType === selectedType;
            return stationTypeMatches &&
                stationMatchesNamingService(station, selectedService) &&
                stationMatchesNamingDispatchCentre(station, selectedDispatchCentre);
        });
        select.innerHTML = '';
        if (!STATION_STATE.filteredStations.length) {
            select.innerHTML = '<option value="">No matching stations found</option>';
            STATION_STATE.selectedHref = '';
            setStationUiValue('current', 'None');
            setStationUiValue('progress', '0 / 0');
            return;
        }
        const firstOption = document.createElement('option');
        firstOption.value = STATION_STATE.filteredStations[0].href;
        firstOption.textContent = 'Start from first matching station';
        select.appendChild(firstOption);
        STATION_STATE.filteredStations.forEach(station => {
            const option = document.createElement('option');
            option.value = station.href;
            option.textContent = `${station.displayName} [${STATION_TYPES[station.stationType] || station.stationType} | type ${station.buildingTypeId ?? '?'}]`;
            select.appendChild(option);
        });
        STATION_STATE.selectedHref = select.value;
        setStationUiValue('progress', `0 / ${STATION_STATE.filteredStations.length}`);
        updateStationNamingSelectionPreview();
    }
    function updateStationNamingSelectionPreview() {
        const select = document.querySelector('#mc-station-startfrom');
        const selectedHref = select?.value || '';
        const station = STATION_STATE.filteredStations.find(item => item.href === selectedHref);
        STATION_STATE.selectedHref = selectedHref;
        setStationUiValue('current', station?.displayName || 'None');
        setStationUiValue('address', 'Not read yet');
        setStationUiValue('town', 'Not extracted yet');
        setStationUiValue('before', station?.displayName || 'None');
        setStationUiValue('after', 'Not generated yet');
        if (station) {
            stationDebug(`Selected: ${station.displayName} | href=${selectedHref} | building_type_id=${station.buildingTypeId} | rule=${station.typeLabel} ${station.suffix}`);
        }
    }
    function startStationNamingRun() {
        if (namingInventoryPromise || !namingInventory || namingPlayer() !== namingInventoryPlayer) {
            stationLog('Wait for the station list to finish, or use Refresh Stations if loading failed.', 'error');return;
        }
        if (PERSONNEL_STATE.running) {
            stationLog('Personnel Assignment is currently running. Stop it before starting Station Naming.', 'error');
            setStationUiValue('status', 'Blocked by Personnel Assignment');
            return;
        }
        if (STATE.running) {
            stationLog('Unit Naming is currently running. Stop it before starting Station Naming.', 'error');
            setStationUiValue('status', 'Blocked by Unit Naming');
            return;
        }
        if (STATION_STATE.running) {
            stationLog('Station Naming is already running.', 'debug');
            return;
        }
        if (!STATION_STATE.filteredStations.length) {
            stationLog('No matching stations loaded. Press Refresh Stations first.', 'error');
            setStationUiValue('status', 'Refresh required');
            return;
        }
        const selectedHref = document.querySelector('#mc-station-startfrom')?.value || '';
        const startIndex = STATION_STATE.filteredStations.findIndex(station => station.href === selectedHref);
        if (startIndex < 0) {
            stationLog(`Selected start station not found: ${selectedHref || 'none'}`, 'error');
            setStationUiValue('status', 'Invalid start station');
            return;
        }
        STATION_STATE.mode = document.querySelector('#mc-station-mode')?.value || 'all';
        STATION_STATE.action = document.querySelector('#mc-station-action')?.value || 'preview';
        STATION_STATE.queue = STATION_STATE.mode === 'single'
            ? [STATION_STATE.filteredStations[startIndex]]
            : STATION_STATE.filteredStations.slice(startIndex);
        STATION_STATE.running = true;
        STATION_STATE.paused = false;
        STATION_STATE.stopped = false;
        STATION_STATE.stationIndex = 0;
        STATION_STATE.renamedCount = 0;
        STATION_STATE.skippedCount = 0;
        STATION_STATE.previewedCount = 0;
        STATION_STATE.nameSequencesByBase = new Map();
        resetStationNamingDiagnostics();
        document.querySelector('#mc-station-pause').textContent = 'Pause';
        updateStationCounters();
        setStationUiValue('progress', `0 / ${STATION_STATE.queue.length}`);
        setStationUiValue('status', STATION_STATE.action === 'save' ? 'Starting rename run' : 'Starting preview');
        stationLog(`Mode: ${STATION_STATE.mode === 'single' ? 'Selected station only' : 'All matching stations from selected start point'}`, 'info');
        stationLog(`Action: ${STATION_STATE.action === 'save' ? 'RENAME AND SAVE' : 'PREVIEW ONLY - no names will be saved'}`, STATION_STATE.action === 'save' ? 'after' : 'info');
        stationLog(`Starting from: ${STATION_STATE.queue[0]?.displayName || 'None'}`, 'info');
        processStationNamingQueue().catch(error => {
            stationLog(`Station Naming stopped after an unexpected error: ${error?.message || error}`, 'error');
            stationDebug(error?.stack || String(error));
            STATION_STATE.stopped = true;
            STATION_STATE.running = false;
            setStationUiValue('status', 'Error');
        });
    }
    function toggleStationNamingPause() {
        if (!STATION_STATE.running) {
            stationLog('Nothing is currently running.', 'debug');
            return;
        }
        STATION_STATE.paused = !STATION_STATE.paused;
        document.querySelector('#mc-station-pause').textContent = STATION_STATE.paused ? 'Resume' : 'Pause';
        setStationUiValue('status', STATION_STATE.paused ? 'Paused' : 'Running');
        stationLog(STATION_STATE.paused ? 'Paused. The current safe step will finish before waiting.' : 'Resumed.', 'debug');
    }
    function stopStationNamingRun() {
        if (!STATION_STATE.running) {
            stationLog('Nothing is currently running.', 'debug');
            return;
        }
        STATION_STATE.stopped = true;
        namingInventoryController?.abort();
        STATION_STATE.paused = false;
        document.querySelector('#mc-station-pause').textContent = 'Pause';
        setStationUiValue('status', 'Stopping...');
        for (const controller of STATION_STATE.activeControllers) {
            try {
                controller.abort();
            } catch (_error) {}
        }
        STATION_STATE.activeControllers.clear();
        stationLog('Stop requested. Active station requests were cancelled and no further station will be saved.', 'error');
    }
    async function processStationNamingQueue() {
        try {
            await precheckStationNamingQueue();
            while (STATION_STATE.stationIndex < STATION_STATE.queue.length) {
                if (STATION_STATE.stopped) break;
                await waitIfStationNamingPaused();
                if (STATION_STATE.stopped) break;
                const station = STATION_STATE.queue[STATION_STATE.stationIndex];
                const displayPosition = STATION_STATE.stationIndex + 1;
                setStationUiValue('progress', `${displayPosition} / ${STATION_STATE.queue.length}`);
                setStationUiValue('current', station.displayName);
                setStationUiValue('address', 'Reading station...');
                setStationUiValue('town', 'Waiting...');
                setStationUiValue('before', station.displayName);
                setStationUiValue('after', 'Waiting...');
                setStationUiValue('status', 'Reading station');
                stationLog(`Station ${displayPosition}/${STATION_STATE.queue.length}: ${station.displayName}`, 'station');
                stationLog(
                    `Type: ${station.typeLabel} | building_type_id=${station.buildingTypeId ?? 'unknown'} | ` +
                    `format=${station.suffix || station.namingMode || 'none'}`,
                    'info'
                );
                const stepStarted = performance.now();
                const result = await processOneStationName(station);
                recordStationNamingStep('station', stepStarted, {stationId:station.buildingId,result});
                if (result === 'renamed') {
                    STATION_STATE.renamedCount++;
                } else if (result === 'previewed') {
                    STATION_STATE.previewedCount++;
                } else {
                    STATION_STATE.skippedCount++;
                }
                updateStationCounters();
                STATION_STATE.stationIndex++;
                if (!STATION_STATE.stopped) await sleep(350);
            }
        } catch(error) {
            if (STATION_STATE.stopped && error?.name === 'AbortError') return;
            STATION_STATE.stopped=true;
            recordStationNamingStep('pre-check or queue error',performance.now(),{error:String(error?.message||error).slice(0,300)});
            throw error;
        } finally {
            STATION_NAMING_DIAGNOSTICS.finishedAt = Date.now();
            STATION_STATE.nameSequencesByBase.clear();
            STATION_STATE.running = false;
            STATION_STATE.paused = false;
            document.querySelector('#mc-station-pause').textContent = 'Pause';
            if (STATION_STATE.stopped) {
                setStationUiValue('status', 'Stopped');
                stationLog(`Stopped. Renamed ${STATION_STATE.renamedCount}, previewed ${STATION_STATE.previewedCount}, skipped ${STATION_STATE.skippedCount}.`, 'error');
            } else {
                setStationUiValue('status', 'Finished');
                setStationUiValue('progress', `${STATION_STATE.queue.length} / ${STATION_STATE.queue.length}`);
                stationLog(`Finished. Renamed ${STATION_STATE.renamedCount}, previewed ${STATION_STATE.previewedCount}, skipped ${STATION_STATE.skippedCount}.`, 'done');
            }
        }
    }
    async function processOneStationName(station) {
        const isTownOnly = station.namingMode === STATION_NAMING_MODE_TOWN_ONLY;
        if (!station.suffix && !isTownOnly) {
            stationLog(`Skipped: no safe naming rule exists for building_type_id=${station.buildingTypeId ?? 'unknown'}.`, 'error');
            return 'skipped';
        }
        try {
            setStationUiValue('status', 'Reading station');
            const expectedBuildingId = String(
                station.buildingId || getBuildingIdFromHref(station.href)
            );
            let doc = null;
            if (!station.precheckedCoordinates) {
                const stationPage = await stationFetchDocument(station.href, 12000);
                const returnedBuildingId = getBuildingIdFromHref(stationPage.href);
                if (!expectedBuildingId || returnedBuildingId !== expectedBuildingId) throw new Error(`Station read returned the wrong building (${returnedBuildingId || 'none'}; expected ${expectedBuildingId || 'unknown'}).`);
                doc = stationPage.doc;
            }
            if (STATION_STATE.stopped) return 'skipped';
            await waitIfStationNamingPaused();
            const resolvedSuffix = station.suffix || '';
            if (isTownOnly) {
                stationLog(
                    `Town-only station rule: building_type_id=${station.buildingTypeId} | ` +
                    'Unit Naming owns the vehicle role and unit sequence.',
                    'info'
                );
            }
            setStationUiValue('status', 'Reading station address');
            const addressResult = await resolveStationAddress(station, doc);
            doc = null;
            const address = String(addressResult.address || '').trim();
            setStationUiValue('address', address || 'No usable game address');
            if (address) stationLog(`Address: ${address}`, 'info');
            const parsed = extractStationArea(address);
            let detectedArea = globalThis.NexusNaming.area(parsed.area);
            let source = addressResult.source;
            if (!detectedArea) {
                setStationUiValue('status', 'Finding nearest town or village');
                const controller = new AbortController();
                STATION_STATE.activeControllers.add(controller);
                try {
                    const point = await globalThis.NexusNaming.locate(station.buildingId, addressResult);
                    if (STATION_STATE.stopped) return 'skipped';
                    const place = await globalThis.NexusNaming.nearest(point, {signal: controller.signal});
                    detectedArea = place.name;
                    source = `Nearest mapped town/village: ${place.name} (${place.distanceKm.toFixed(2)} km, GeoNames)`;
                } finally { STATION_STATE.activeControllers.delete(controller); }
            }
            if (STATION_STATE.stopped) return 'skipped';
            const formattedArea = formatStationArea(detectedArea);
            if (!formattedArea) throw new Error('No place name could be verified. Name left unchanged; review this station.');
            setStationUiValue('town', formattedArea);
            stationLog(`Name source: ${source}`, 'info');
            if (parsed.postcode) stationLog(`Postcode: ${parsed.postcode}`, 'info');
            stationLog(`Detected area: ${formattedArea}`, 'after');
            const stationSequence = isTownOnly
                ? ''
                : reserveStationNameSequence(
                    formattedArea,
                    resolvedSuffix,
                    station
                );
            stationLog(
                isTownOnly
                    ? 'Station sequence: none (Unit Naming supplies the unit sequence)'
                    : `Station sequence: ${stationSequence}`,
                'info'
            );
            let proposedName = buildStationName(
                formattedArea,
                resolvedSuffix,
                station.displayName,
                stationSequence,
                station.namingMode
            );
            setStationUiValue('after', proposedName);
            stationLog(`BEFORE: ${station.displayName}`, 'before');
            stationLog(`AFTER : ${proposedName}`, 'after');
            if (STATION_STATE.action !== 'save') {
                setStationUiValue('status', 'Preview complete');
                stationLog('Preview only: nothing was saved.', 'info');
                return 'previewed';
            }
            if (STATION_STATE.stopped) return 'skipped';
            await waitIfStationNamingPaused();
            if (STATION_STATE.stopped) return 'skipped';
            setStationUiValue('status', 'Reading station edit form');
            const editHref = `${station.href}/edit`;
            const editPage = await stationFetchDocument(editHref, 12000);
            if (getBuildingIdFromHref(editPage.href) !== expectedBuildingId) {
                throw new Error('Station edit request returned a different building.');
            }
            const prepared = prepareBackgroundNativeForm(editPage.doc, {
                expectedAction: station.href,
                inputSelector: '#building_name',
                requiredMethodOverride: 'patch',
                submitSelector: 'input.btn-success[type="submit"][value="Save"], button.btn-success[type="submit"]',
                value: proposedName,
                resourceLabel: `station ${expectedBuildingId}`
            });
            const nameInput = prepared.input;
            const actualBefore = String(nameInput.value || '').trim();
            proposedName = buildStationName(
                formattedArea,
                resolvedSuffix,
                actualBefore,
                stationSequence,
                station.namingMode
            );
            setStationUiValue('before', actualBefore || station.displayName);
            setStationUiValue('after', proposedName);
            if (actualBefore === proposedName) {
                stationLog(`Already correct: ${proposedName}`, 'info');
                setStationUiValue('status', 'Already correct');
                return 'skipped';
            }
            if (STATION_STATE.stopped) return 'skipped';
            await waitIfStationNamingPaused();
            prepared.body.set(nameInput.name, proposedName);
            stationLog(`EDIT BEFORE: ${actualBefore}`, 'before');
            stationLog(`EDIT AFTER : ${proposedName}`, 'after');
            setStationUiValue('status', 'Saving station in background');
            let submissionError = null;
            try {
                await submitBackgroundNativeForm(stationFetchWithTimeout,prepared,12000);
            } catch(error) { submissionError=error; }
            const saved = await verifyStationNameSaved(station.href, proposedName);
            if (!saved) throw submissionError || new Error('Save could not be verified. The script did not count this station as renamed.');
            station.displayName = proposedName;
            updateStationListName(station.href, proposedName);
            setStationUiValue('status', 'Saved');
            stationLog(`Saved and verified: ${proposedName}`, 'done');
            return 'renamed';
        } catch (error) {
            stationLog(`Skipped ${station.displayName}: ${error?.message || error}`, 'error');
            recordStationNamingStep('station error', performance.now(), {stationId:station.buildingId,error:String(error?.message || error).slice(0,300)});
            stationDebug(error?.stack || String(error));
            return 'skipped';
        }
    }
    async function resolveStationAddress(station, stationDoc) {
        const coordinates = await getStationCoordinates(station, stationDoc);
        let reverseError = '';
        if (coordinates) {
            stationDebug(`Coordinate address lookup: ${coordinates.latitude}, ${coordinates.longitude} (${coordinates.source})`);
            const reverseResult = await fetchMissionChiefReverseAddress(
                coordinates.latitude,
                coordinates.longitude
            );
            if (reverseResult.address) {
                return {
                    address: reverseResult.address,
                    source: `MissionChief reverse address via ${coordinates.source}`,
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude
                };
            }
            reverseError = reverseResult.error || 'MissionChief reverse-address lookup returned no address.';
            stationDebug(`Reverse-address lookup unavailable for ${station.displayName}: ${reverseError}`);
        } else {
            reverseError = 'No station coordinates could be found for the reverse-address lookup.';
            stationDebug(`${reverseError} Station: ${station.displayName}`);
        }
        const movePageResult = await fetchStationMoveAddress(station);
        if (movePageResult.address) return {...movePageResult, latitude:coordinates?.latitude, longitude:coordinates?.longitude};
        stationDebug(`Move-page address unavailable for ${station.displayName}: ${movePageResult.error || 'no #building_address returned'}`);
        return {
            address: '',
            source: coordinates?.source || 'none',
            latitude: coordinates?.latitude, longitude: coordinates?.longitude,
            error: [reverseError, movePageResult.error]
                .filter(Boolean)
                .join(' ')
        };
    }

    async function fetchStationMoveAddress(station) {
        const url = `${station.href}/move`;
        try {
            const response = await stationFetchWithTimeout(url, {
                credentials: 'same-origin',
                cache: 'no-store'
            }, 9000);
            if (!response.ok) {
                return {
                    address: '',
                    source: 'Move building page',
                    error: `Move building request returned HTTP ${response.status}.`
                };
            }
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const address = normalizeStationAddressText(
                doc.querySelector('#building_address')?.value || ''
            );
            if (address) {
                return {
                    address,
                    source: 'Move building page (background read only)'
                };
            }
            const pageMessage = cleanText(
                doc.querySelector('.alert-danger, .alert-warning, #infoBox, .toast-message')?.textContent || ''
            );
            const responsePath = (() => {
                try {
                    return new URL(response.url, location.origin).pathname;
                } catch (_error) {
                    return response.url || url;
                }
            })();
            return {
                address: '',
                source: 'Move building page',
                error: pageMessage
                    ? `${pageMessage} (response path: ${responsePath})`
                    : `No #building_address was returned (response path: ${responsePath}).`
            };
        } catch (error) {
            return {
                address: '',
                source: 'Move building page',
                error: `Move building request failed: ${error?.message || error}`
            };
        }
    }
    async function getStationCoordinates(station, stationDoc) {
        if (station.precheckedCoordinates) return {...station.precheckedCoordinates,source:'checked game building inventory'};
        const fromPageCache = findBuildingCoordinatesInPageCaches(station.buildingId);
        if (fromPageCache) return { ...fromPageCache, source: 'MissionChief building marker cache' };
        const fromDocument = extractCoordinatesFromStationDocument(stationDoc);
        if (fromDocument) return { ...fromDocument, source: 'station page' };
        await loadMissionChiefBuildingCoordinates();
        const fromLoadedData = STATION_STATE.buildingCoordinateCache.get(String(station.buildingId));
        if (fromLoadedData) return { ...fromLoadedData, source: 'MissionChief buildings data' };
        return null;
    }
    function extractCoordinatesFromStationDocument(doc) {
        if (!doc) return null;
        const latitudeInput = doc.querySelector('#building_latitude, input[name="building[latitude]"]');
        const longitudeInput = doc.querySelector('#building_longitude, input[name="building[longitude]"]');
        const direct = normalizeCoordinates(latitudeInput?.value, longitudeInput?.value);
        if (direct) return direct;
        const dataElement = doc.querySelector('[data-latitude][data-longitude], [data-lat][data-lng]');
        if (dataElement) {
            const dataCoordinates = normalizeCoordinates(
                dataElement.getAttribute('data-latitude') ?? dataElement.getAttribute('data-lat'),
                dataElement.getAttribute('data-longitude') ?? dataElement.getAttribute('data-lng')
            );
            if (dataCoordinates) return dataCoordinates;
        }
        const patterns = [
            /(?:setView|L\.marker)\s*\(\s*\[\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/i,
            /latitude\s*[:=]\s*["']?(-?\d+(?:\.\d+)?)["']?[\s\S]{0,160}?longitude\s*[:=]\s*["']?(-?\d+(?:\.\d+)?)/i
        ];
        for (const script of doc.scripts) {
            const scriptText = script.textContent || '';
            if (!scriptText) continue;
            for (const pattern of patterns) {
                const match = scriptText.match(pattern);
                const parsed = normalizeCoordinates(match?.[1], match?.[2]);
                if (parsed) return parsed;
            }
        }
        return null;
    }
    function findBuildingCoordinatesInPageCaches(buildingId) {
        const id = String(buildingId || '');
        const cacheCandidates = [];
        try {
            cacheCandidates.push(window.building_markers_params_cache_per_id);
        } catch (_error) {}
        try {
            if (window.parent && window.parent !== window) {
                cacheCandidates.push(window.parent.building_markers_params_cache_per_id);
            }
        } catch (_error) {}
        for (const cache of cacheCandidates) {
            const building = getBuildingRecordFromCache(cache, id);
            const coordinates = normalizeCoordinates(building?.latitude, building?.longitude);
            if (coordinates) {
                STATION_STATE.buildingCoordinateCache.set(id, coordinates);
                return coordinates;
            }
        }
        return STATION_STATE.buildingCoordinateCache.get(id) || null;
    }
    function getBuildingRecordFromCache(cache, buildingId) {
        if (!cache) return null;
        const numericId = Number(buildingId);
        const keys = [buildingId, Number.isFinite(numericId) ? numericId : buildingId];
        if (typeof cache.get === 'function') {
            for (const key of keys) {
                const value = cache.get(key);
                if (value) return value;
            }
        }
        if (Array.isArray(cache)) {
            return cache.find(item => String(item?.id ?? item?.building_id ?? '') === String(buildingId)) || null;
        }
        if (typeof cache === 'object') {
            for (const key of keys) {
                if (cache[key]) return cache[key];
            }
            return Object.values(cache).find(item => String(item?.id ?? item?.building_id ?? '') === String(buildingId)) || null;
        }
        return null;
    }
    async function loadMissionChiefBuildingCoordinates() {
        if (STATION_STATE.buildingDataPromise) {
            await STATION_STATE.buildingDataPromise;
            return;
        }
        STATION_STATE.buildingDataPromise = (async () => {
            try {
                const response = await stationFetchWithTimeout('/building/buildings_json', {
                    credentials: 'same-origin',
                    cache: 'no-store'
                }, 15000);
                if (!response.ok) {
                    stationDebug(`Buildings-data fallback returned HTTP ${response.status}.`);
                    return;
                }
                const payload = await response.json();
                const records = extractBuildingRecords(payload);
                const wantedIds = new Set(
                    STATION_STATE.stations
                        .map(station => String(station?.buildingId || ''))
                        .filter(Boolean)
                );
                const restrictToVisibleStations = wantedIds.size > 0;
                records.forEach(building => {
                    const id = String(building?.id ?? building?.building_id ?? '');
                    if (!id || (restrictToVisibleStations && !wantedIds.has(id))) return;
                    const coordinates = normalizeCoordinates(building?.latitude, building?.longitude);
                    if (coordinates) STATION_STATE.buildingCoordinateCache.set(id, coordinates);
                });
                stationDebug(`Buildings-data fallback cached ${STATION_STATE.buildingCoordinateCache.size} in-scope coordinate record(s).`);
            } catch (error) {
                stationDebug(`Buildings-data fallback failed: ${error?.message || error}`);
            }
        })();
        await STATION_STATE.buildingDataPromise;
    }
    function extractBuildingRecords(payload) {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.buildings)) return payload.buildings;
        if (Array.isArray(payload.result)) return payload.result;
        if (Array.isArray(payload.data)) return payload.data;
        if (typeof payload === 'object') {
            const values = Object.values(payload);
            const directRecords = values.filter(value => value && typeof value === 'object' && !Array.isArray(value));
            if (directRecords.some(value => 'latitude' in value && 'longitude' in value)) return directRecords;
            for (const value of values) {
                if (Array.isArray(value)) return value;
                if (value && typeof value === 'object') {
                    const nested = extractBuildingRecords(value);
                    if (nested.length) return nested;
                }
            }
        }
        return [];
    }
    async function fetchMissionChiefReverseAddress(latitude, longitude) {
        const coordinates = normalizeCoordinates(latitude, longitude);
        if (!coordinates) {
            return { address: '', error: 'Invalid coordinates were supplied to the reverse-address lookup.' };
        }
        const query = new URLSearchParams({
            latitude: String(coordinates.latitude),
            longitude: String(coordinates.longitude)
        });
        try {
            const response = await stationFetchWithTimeout(`/reverse_address?${query.toString()}`, {
                credentials: 'same-origin',
                cache: 'no-store',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }, 10000);
            if (!response.ok) {
                return { address: '', error: `Reverse-address lookup returned HTTP ${response.status}.` };
            }
            let address = String(await response.text()).trim();
            if (/^<!doctype|^<html/i.test(address)) {
                return { address: '', error: 'Reverse-address lookup returned an HTML page instead of an address.' };
            }
            if ((address.startsWith('"') && address.endsWith('"')) || (address.startsWith("'") && address.endsWith("'"))) {
                try {
                    address = JSON.parse(address);
                } catch (_error) {
                    address = address.slice(1, -1);
                }
            }
            address = normalizeStationAddressText(address);
            if (!address) {
                return { address: '', error: 'Reverse-address lookup returned an empty or invalid response.' };
            }
            return { address };
        } catch (error) {
            return { address: '', error: `Reverse-address lookup failed: ${error?.message || error}` };
        }
    }
    function normalizeStationAddressText(address) {
        return String(address || '')
            .replace(/<br\s*\/?>/gi, ', ')
            .replace(/<\/(?:address|div|li|p|td|tr)>/gi, ', ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\r?\n+/g, ', ')
            .replace(/(?:\s*,\s*)+/g, ', ')
            .replace(/^[\s,]+|[\s,]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function normalizeCoordinates(latitude, longitude) {
        if (latitude == null || longitude == null || typeof latitude === 'boolean' || typeof longitude === 'boolean' || String(latitude).trim() === '' || String(longitude).trim() === '') return null;
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
        return { latitude: lat, longitude: lng };
    }
    function getSameOriginResourceUrl(url, resourceLabel = 'Resource') {
        let resolved;
        try {
            resolved = new URL(String(url || ''), location.origin);
        } catch (_error) {
            throw new Error(`${resourceLabel} URL is invalid.`);
        }
        if (resolved.origin !== location.origin) {
            throw new Error(`${resourceLabel} URL is not same-origin.`);
        }
        return resolved;
    }
    function prepareBackgroundNativeForm(doc, {
        expectedAction,
        inputSelector,
        requiredMethodOverride = '',
        submitSelector = 'input[type="submit"], button[type="submit"]',
        value,
        resourceLabel = 'resource'
    }) {
        const input = doc?.querySelector?.(inputSelector) || null;
        const form = input?.closest?.('form') || null;
        if (!input || !form) {
            throw new Error(`The native ${resourceLabel} edit form or ${inputSelector} field was not returned.`);
        }
        const inputName = String(input.getAttribute('name') || '').trim();
        if (!inputName) {
            throw new Error(`The native ${resourceLabel} field has no submitted name.`);
        }
        const actionAttribute = String(form.getAttribute('action') || '').trim();
        if (!actionAttribute) {
            throw new Error(`The native ${resourceLabel} form has no action.`);
        }
        const actionUrl = getSameOriginResourceUrl(
            actionAttribute,
            `Native ${resourceLabel} form action`
        );
        const expectedActionUrl = getSameOriginResourceUrl(
            expectedAction,
            `Expected ${resourceLabel} form action`
        );
        if (
            actionUrl.pathname !== expectedActionUrl.pathname ||
            actionUrl.search !== expectedActionUrl.search
        ) {
            throw new Error(
                `The native ${resourceLabel} form action did not match ${expectedActionUrl.pathname}${expectedActionUrl.search}.`
            );
        }
        const method = String(form.getAttribute('method') || 'get').toUpperCase();
        if (method !== 'POST') {
            throw new Error(`The native ${resourceLabel} form method was ${method}, not POST.`);
        }
        if (requiredMethodOverride) {
            const actualOverride = String(
                form.querySelector('input[name="_method"]')?.value || ''
            ).trim().toLowerCase();
            if (actualOverride !== String(requiredMethodOverride).toLowerCase()) {
                throw new Error(
                    `The native ${resourceLabel} form did not contain the required ${requiredMethodOverride.toUpperCase()} override.`
                );
            }
        }
        const body = new FormData(form);
        body.set(inputName, String(value ?? ''));
        const submitControl = form.querySelector(submitSelector);
        const submitName = String(submitControl?.getAttribute?.('name') || '').trim();
        if (submitName && !submitControl.disabled) {
            body.set(submitName, String(submitControl.value || ''));
        }
        const csrfToken = String(
            doc.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
            ''
        ).trim();
        const headers = {
            'Accept': 'text/html,application/xhtml+xml'
        };
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
        return {
            actionHref: `${actionUrl.pathname}${actionUrl.search}`,
            body,
            form,
            headers,
            input,
            method,
            resourceLabel
        };
    }
    async function submitBackgroundNativeForm(
        fetchWithTimeout,
        prepared,
        timeoutMs = 12000
    ) {
        const response = await fetchWithTimeout(prepared.actionHref, {
            method: prepared.method,
            credentials: 'same-origin',
            cache: 'no-store',
            redirect: 'follow',
            headers: prepared.headers,
            body: prepared.body
        }, timeoutMs);
        if (!response.ok) {
            throw new Error(
                `Native ${prepared.resourceLabel} save returned HTTP ${response.status}.`
            );
        }
        try {
            await response.text();
        } catch (_error) {}
        return response;
    }
    async function stationFetchWithTimeout(url, options = {}, timeoutMs = 10000) {
        const requestUrl=getSameOriginResourceUrl(url,'Station request'),controller=new AbortController();
        const started=performance.now(),path=requestUrl.pathname;
        STATION_STATE.activeControllers.add(controller);
        STATION_NAMING_DIAGNOSTICS.stage='Downloading '+path;
        STATION_NAMING_DIAGNOSTICS.requests++;
        const timer=setTimeout(()=>controller.abort(),timeoutMs);
        try {
            const response=await fetch(path+requestUrl.search,{credentials:'same-origin',cache:'no-store',redirect:'follow',...options,signal:controller.signal});
            const text=await readStationNamingBody(response,controller.signal);
            const reply={ok:response.ok,status:response.status,url:response.url,headers:response.headers,text:async()=>text,json:async()=>JSON.parse(text)};
            recordStationNamingStep('download',started,{path,status:response.status,characters:text.length});
            return reply;
        } catch(error) {
            recordStationNamingStep('download',started,{path,error:String(error?.message||error).slice(0,300)});
            throw error;
        } finally { clearTimeout(timer);STATION_STATE.activeControllers.delete(controller); }
    }
    async function readStationNamingBody(response, signal) {
        const limit=6*1024*1024;
        if (Number(response.headers.get('content-length'))>limit) {await response.body?.cancel();throw Error('Station response exceeds 6 MB. Run stopped for this station.');}
        const reader=response.body?.getReader();if(!reader)return '';
        const decoder=new TextDecoder();let bytes=0,text='';
        const abort=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
        try {
            while(true){signal.throwIfAborted();const part=await reader.read();signal.throwIfAborted();if(part.done)break;
                bytes+=part.value.byteLength;if(bytes>limit)throw Error('Station response exceeds 6 MB. Run stopped for this station.');
                text+=decoder.decode(part.value,{stream:true});
            }
            text+=decoder.decode();
            STATION_NAMING_DIAGNOSTICS.bytes+=bytes;STATION_NAMING_DIAGNOSTICS.largestResponse=Math.max(STATION_NAMING_DIAGNOSTICS.largestResponse,bytes);
            return text;
        } catch(error){await reader.cancel().catch(()=>{});throw error;}
        finally{signal.removeEventListener('abort',abort);reader.releaseLock();}
    }
    async function stationFetchDocument(url, timeoutMs = 10000) {
        const requestUrl = getSameOriginResourceUrl(url, 'Station document');
        const response = await stationFetchWithTimeout(requestUrl.href, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml'
            }
        }, timeoutMs);
        if (!response.ok) {
            throw new Error(`Station request returned HTTP ${response.status}: ${requestUrl.pathname}`);
        }
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const responseUrl = getSameOriginResourceUrl(
            response.url || requestUrl.href,
            'Station response'
        );
        return {
            doc,
            href: `${responseUrl.pathname}${responseUrl.search}`
        };
    }
    function extractStationArea(address) {
        const input = normalizeStationAddressText(address);
        const postcodeRegex = /\b(GIR\s?0AA|(?:[A-PR-UWYZ][0-9][0-9A-HJKPSTUW]?|[A-PR-UWYZ][A-HK-Y][0-9][0-9ABEHMNPRV-Y]?)\s?[0-9][ABD-HJLNP-UW-Z]{2})\b/i;
        const match = input.match(postcodeRegex);
        if (!match || match.index == null) {
            return { postcode: '', afterPostcode: '', area: '' };
        }
        const postcode = match[1].toUpperCase().replace(/\s+/g, ' ').trim();
        const afterPostcode = input
            .slice(match.index + match[0].length)
            .replace(/^[\s,;:\-]+/, '')
            .trim();
        const parts = afterPostcode
            .split(',')
            .map(part => part.trim())
            .filter(Boolean);
        const countryOnly = /^(UNITED KINGDOM|UK|SCOTLAND|ENGLAND|WALES|NORTHERN IRELAND)$/i;
        while (parts.length > 1 && countryOnly.test(parts[parts.length - 1])) parts.pop();
        let area = parts.at(-1) || afterPostcode;
        area = area
            .replace(/(?:\s*,\s*|\s+)(?:UNITED KINGDOM|UK|SCOTLAND|ENGLAND|WALES|NORTHERN IRELAND)$/i, '')
            .trim();
        const words = area.split(/\s+/).filter(Boolean);
        for (let suffixLength = Math.floor(words.length / 2); suffixLength >= 1; suffixLength -= 1) {
            const suffixWords = words.slice(-suffixLength);
            const suffixKey = suffixWords.join(' ').toUpperCase();
            const precedingWords = words.slice(0, -suffixLength);
            let repeated = false;
            for (let index = 0; index <= precedingWords.length - suffixLength; index += 1) {
                const candidateKey = precedingWords
                    .slice(index, index + suffixLength)
                    .join(' ')
                    .toUpperCase();
                if (candidateKey === suffixKey) {
                    repeated = true;
                    break;
                }
            }
            if (repeated) {
                area = suffixWords.join(' ');
                break;
            }
        }
        return {
            postcode,
            afterPostcode,
            area
        };
    }

    function formatStationArea(area) {
        return String(area || '')
            .replace(/\band\b/gi, '&')
            .replace(/\s*&\s*/g, ' & ')
            .replace(/^[\s,;:\-]+|[\s,;:\-]+$/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
    }

    function buildStationName(
        formattedArea,
        suffix,
        currentName,
        sequenceOverride = '',
        namingMode = ''
    ) {
        if (namingMode === STATION_NAMING_MODE_TOWN_ONLY) {
            return formattedArea;
        }
        const sequence = String(
            sequenceOverride || getExistingStationSequence(currentName, suffix) || ''
        ).trim();
        return `${formattedArea}${suffix}${sequence}`;
    }

    function getExistingStationSequence(currentName, suffix) {
        if (!suffix) return '';
        const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = String(currentName || '').trim().match(
            new RegExp(`${escapedSuffix}[\\s-]*(\\d+)$`, 'i')
        );
        return match ? match[1] : '';
    }

    function createStationNameSequenceRegistry(stations, registry = new Map()) {
        const knownSuffixes = [...new Set(Object.values(STATION_BUILDING_TYPE_INFO)
            .map(info => info.suffix)
            .filter(Boolean))]
            .sort((left, right) => right.length - left.length);
        (stations || []).forEach((station, index) => {
            const currentName = String(station?.displayName || '').trim();
            if (!currentName) return;
            const ownerKey = String(
                station?.buildingId || station?.href || `station-index:${index}`
            );
            for (const suffix of knownSuffixes) {
                const sequence = Number(getExistingStationSequence(currentName, suffix));
                const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const hasExistingSequence =
                    Number.isInteger(sequence) && sequence > 0;
                const match = hasExistingSequence
                    ? currentName.match(
                        new RegExp(`^(.*?)${escapedSuffix}[\\s-]*\\d+$`, 'i')
                    )
                    : currentName.match(
                        new RegExp(`^(.*?)${escapedSuffix}\\s*$`, 'i')
                    );
                if (!match) continue;
                const key = `${match[1]}${suffix}`
                    .replace(/\s+/g, ' ')
                    .trim()
                    .toUpperCase();
                if (!registry.has(key)) registry.set(key, new Map());
                const sequenceOwners = registry.get(key);
                if (hasExistingSequence) {
                    if (!sequenceOwners.has(sequence)) {
                        sequenceOwners.set(sequence, ownerKey);
                    }
                } else {
                    let allocatedSequence = 1;
                    while (sequenceOwners.has(allocatedSequence)) {
                        allocatedSequence++;
                    }
                    sequenceOwners.set(allocatedSequence, ownerKey);
                }
                break;
            }
        });
        return registry;
    }

    function reserveStationNameSequence(formattedArea, suffix, station) {
        const key = `${formattedArea}${suffix}`
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
        const sequenceOwners = STATION_STATE.nameSequencesByBase.get(key) || new Map();
        STATION_STATE.nameSequencesByBase.set(key, sequenceOwners);
        const currentName = String(station?.displayName || station || '').trim();
        const ownerKey = String(
            station?.buildingId || station?.href || `station-name:${currentName}`
        );
        for (const [reservedSequence, reservedOwner] of sequenceOwners) {
            if (reservedOwner === ownerKey) return String(reservedSequence);
        }
        const existingSequence = Number(
            getExistingStationSequence(currentName, suffix)
        );
        if (Number.isInteger(existingSequence) && existingSequence > 0) {
            const existingOwner = sequenceOwners.get(existingSequence);
            if (!existingOwner || existingOwner === ownerKey) {
                sequenceOwners.set(existingSequence, ownerKey);
                return String(existingSequence);
            }
        }
        let sequence = 1;
        while (sequenceOwners.has(sequence)) sequence++;
        sequenceOwners.set(sequence, ownerKey);
        return String(sequence);
    }

    function getBuildingIdFromHref(href) {
        const match = String(href || '').match(/\/buildings\/(\d+)/);
        return match ? match[1] : '';
    }
    async function verifyStationNameSaved(stationHref, expectedName) {
        for (let attempt = 1; attempt <= 14; attempt++) {
            if (STATION_STATE.stopped) return false;
            await sleep(attempt === 1 ? 500 : 350);
            try {
                const response = await stationFetchWithTimeout(`${stationHref}/edit`, {
                    credentials: 'same-origin',
                    cache: 'no-store'
                }, 10000);
                if (!response.ok) {
                    stationDebug(`Save verification HTTP ${response.status}, attempt ${attempt}.`);
                    continue;
                }
                const html = await response.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const savedName = String(doc.querySelector('#building_name')?.value || '').trim();
                stationDebug(`Save verification attempt ${attempt}: "${savedName}"`);
                if (savedName === expectedName) return true;
            } catch (error) {
                stationDebug(`Save verification attempt ${attempt} failed: ${error?.message || error}`);
            }
        }
        return false;
    }
    function updateStationListName(href, newName) {
        const id=getBuildingIdFromHref(href);if(!/^[1-9]\d*$/.test(id))return;
        const record=namingInventory?.find(b=>String(b.id)===id);if(record)record.caption=newName;
        for(const list of [STATE.stations,STATION_STATE.stations])for(const station of list)if(String(station.buildingId)===id){
            station.displayName=newName;if('callsignBase' in station)station.callsignBase=createCallsignBase(newName);
        }
        // Update only this station's existing label. Never rebuild all station rows after a save.
        const relative='/buildings/'+id,absolute=location.origin+relative,containers=new Set();
        for(const link of document.querySelectorAll(`a[href="${relative}"],a[href="${absolute}"]`)){
            if(link.closest('#mc-namer-panel,#nexus-native-tools'))continue;
            const container=link.closest('.building_list_li,.building_list,[data-building-id]');
            if(!container||containers.has(container))continue;
            const nameNode=link.querySelector('[data-building-name],.building_list_title,.building-list-title,.building_name,.building-name');
            const label=cleanText(link.textContent),target=nameNode||(label&&!isGenericStationActionText(label)?link:null);
            if(!target)continue;containers.add(container);target.textContent=newName;target.setAttribute('data-building-name',newName);
            container.setAttribute('search_attribute',newName);
        }
    }
    async function waitIfStationNamingPaused() {
        while (STATION_STATE.paused && !STATION_STATE.stopped) {
            await sleep(250);
        }
    }
    function updateStationCounters() {
        setStationUiValue('renamed', STATION_STATE.renamedCount);
        setStationUiValue('skipped', STATION_STATE.skippedCount);
    }
    function toggleStationDebug() {
        STATION_STATE.debug = !STATION_STATE.debug;
        document.querySelector('#mc-station-debug').textContent = STATION_STATE.debug ? 'Debug: ON' : 'Debug: OFF';
        stationLog(`Debug ${STATION_STATE.debug ? 'enabled' : 'disabled'}.`, 'debug');
    }
    function clearStationLog() {
        clearBoundedToolLog(getToolElementById('mc-station-log'));
    }
    function setStationUiValue(field, value) {
        if (field === 'status') STATION_NAMING_DIAGNOSTICS.stage=String(value).slice(0,180);
        const map = {
            status: 'mc-station-status',
            current: 'mc-station-current',
            address: 'mc-station-address',
            town: 'mc-station-town',
            before: 'mc-station-before',
            after: 'mc-station-after',
            progress: 'mc-station-progress',
            renamed: 'mc-station-renamed',
            skipped: 'mc-station-skipped'
        };
        const el = getToolElementById(map[field]);
        if (el) el.textContent = String(value);
    }
    function stationLog(message, type = 'info') {
        const logBox = getToolElementById('mc-station-log');
        if (!logBox) return;
        const line = document.createElement('div');
        line.className = `mc-log-${type}`;
        line.textContent = message;
        appendBoundedToolLog(logBox, line);
    }
    function stationDebug(message) {
        if (!STATION_STATE.debug) return;
        stationLog(`[DEBUG] ${message}`, 'debug');
    }
    function getPersonnelProfileStationTypes() {
        const profile = getPersonnelProfileDefinition();
        return Array.isArray(profile?.stationTypes) ? profile.stationTypes.map(String) : [];
    }
    function getPersonnelProfileBuildingTypeIds() {
        const profile = getPersonnelProfileDefinition();
        return Array.isArray(profile?.buildingTypeIds) ? profile.buildingTypeIds.map(String) : [];
    }
    function getPersonnelStationScopeLabel() {
        const service = getPersonnelServiceDefinition();
        const stationTypes = getPersonnelProfileStationTypes();
        if (service === PERSONNEL_SERVICE_DEFINITIONS.medical) {
            return getPersonnelProfileBuildingTypeIds().length
                ? 'relevant medical stations'
                : 'ambulance stations';
        }
        if (stationTypes.length === 1 && stationTypes[0] === 'AIR') return 'police aviation stations';
        if (stationTypes.length === 1 && stationTypes[0] === 'EOD') return 'EOD / bomb disposal stations';
        if (service === PERSONNEL_SERVICE_DEFINITIONS.police) return 'relevant Police stations';
        return `relevant ${service.label} stations`;
    }
    function refreshPersonnelStations() {
        if (!isLivePersonnelProfile()) {
            const service = getPersonnelServiceDefinition();
            const profile = getPersonnelProfileDefinition();
            personnelLog(`${service.label} > ${profile.label} is currently a UI preview only. No station scan was started.`, 'error');
            setPersonnelUiValue('status', 'Profile UI preview');
            return;
        }
        if (STATE.running || STATION_STATE.running) {
            personnelLog('A naming tool is currently running. Stop it before refreshing Personnel Assignment.', 'error');
            setPersonnelUiValue('status', 'Blocked by naming tool');
            return;
        }
        if (PERSONNEL_STATE.running) {
            personnelLog('Stop Personnel Assignment before refreshing the station list.', 'error');
            return;
        }
        const allowedStationTypes = new Set(getPersonnelProfileStationTypes());
        const allowedBuildingTypeIds = new Set(getPersonnelProfileBuildingTypeIds());
        const scopeLabel = getPersonnelStationScopeLabel();
        setPersonnelUiValue('status', `Refreshing ${scopeLabel}...`);
        personnelLog(`Refreshing ${scopeLabel}...`, 'info');
        const stationEntries = getStationOverviewEntries();
        PERSONNEL_STATION_LINK_BY_HREF.clear();
        stationEntries.forEach(entry => {
            if (entry.href) PERSONNEL_STATION_LINK_BY_HREF.set(entry.href, entry.link);
        });
        PERSONNEL_STATE.stations = stationEntries
            .map((entry, index) => ({
                index,
                href: entry.href,
                buildingId: entry.buildingId,
                displayName: entry.displayName,
                buildingTypeId: entry.buildingTypeId,
                stationType:
                    STATION_BUILDING_TYPE_INFO[entry.buildingTypeId]?.stationType ||
                    detectStationType(entry.displayName)
            }))
            .filter(station =>
                station.href
                && station.buildingId
                && (
                    allowedStationTypes.has(station.stationType)
                    || allowedBuildingTypeIds.has(String(station.buildingTypeId))
                )
            );
        PERSONNEL_STATE.filteredStations = [...PERSONNEL_STATE.stations];
        populatePersonnelStartDropdown();
        setPersonnelUiValue('status', 'Ready');
        personnelLog(`${scopeLabel.replace(/^./, value => value.toUpperCase())} found: ${PERSONNEL_STATE.filteredStations.length}`, 'info');
        if (PERSONNEL_STATE.filteredStations.length) {
            personnelLog(`First: ${PERSONNEL_STATE.filteredStations[0].displayName}`, 'info');
            personnelLog(`Last : ${PERSONNEL_STATE.filteredStations[PERSONNEL_STATE.filteredStations.length - 1].displayName}`, 'info');
        }
    }
    function populatePersonnelStartDropdown() {
        const select = getToolElementById('mc-personnel-startfrom');
        if (!select) return;
        select.replaceChildren();
        PERSONNEL_START_OPTION_BY_HREF.clear();
        if (!PERSONNEL_STATE.filteredStations.length) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = `No ${getPersonnelStationScopeLabel()} found`;
            select.appendChild(option);
            PERSONNEL_STATE.selectedHref = '';
            setPersonnelUiValue('current', 'None');
            setPersonnelUiValue('progress', '0 / 0');
            return;
        }
        const fragment = document.createDocumentFragment();
        const firstOption = document.createElement('option');
        firstOption.value = PERSONNEL_STATE.filteredStations[0].href;
        firstOption.textContent = `Start from first ${getPersonnelStationScopeLabel().replace(/s$/, '')}`;
        firstOption.dataset.personnelStartOption = 'true';
        fragment.appendChild(firstOption);
        PERSONNEL_STATE.filteredStations.forEach(station => {
            const option = document.createElement('option');
            option.value = station.href;
            option.dataset.personnelStationOption = 'true';
            option.textContent = `${station.displayName} [building type ${station.buildingTypeId ?? '?'}]`;
            PERSONNEL_START_OPTION_BY_HREF.set(String(station.href), option);
            fragment.appendChild(option);
        });
        select.appendChild(fragment);
        PERSONNEL_STATE.selectedHref = select.value;
        setPersonnelUiValue('progress', `0 / ${PERSONNEL_STATE.filteredStations.length}`);
        updatePersonnelSelectionPreview();
    }
    function updatePersonnelSelectionPreview() {
        const selectedHref = document.querySelector('#mc-personnel-startfrom')?.value || '';
        const station = PERSONNEL_STATE.filteredStations.find(item => item.href === selectedHref);
        PERSONNEL_STATE.selectedHref = selectedHref;
        setPersonnelUiValue('current', station?.displayName || 'None');
        setPersonnelUiValue('vehicle', 'None');
        personnelDebug(`Selected station: ${station?.displayName || 'none'} | href=${selectedHref}`);
    }
    function getPersonnelTrainingRegistryStats(registry = readPersonnelTrainingRegistry()) {
        const vehicles = registry?.vehicles && typeof registry.vehicles === 'object'
            ? Object.values(registry.vehicles)
            : [];
        const updatedAt = vehicles.reduce(
            (latest, entry) => Math.max(latest, Number(entry?.updatedAt || 0)),
            Number(registry?.updatedAt || 0)
        );
        return {
            count: vehicles.length,
            updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0
        };
    }
    function formatPersonnelTrainingRegistryTimestamp(timestamp) {
        const value = Number(timestamp || 0);
        if (!Number.isFinite(value) || value <= 0) return 'never';
        try {
            return new Intl.DateTimeFormat('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short'
            }).format(new Date(value));
        } catch (_error) {
            return new Date(value).toLocaleString();
        }
    }
    function updatePersonnelTrainingRegistryStatus() {
        if (registerView) registerView.showStats(registerStats());
    }
    function registerStats() {
        const {count, updatedAt} = getPersonnelTrainingRegistryStats();
        return {count, updated:formatPersonnelTrainingRegistryTimestamp(updatedAt)};
    }
    function isUnsafePersonnelTrainingRegistryKey(value) {
        return !value || value === '__proto__' || value === 'constructor' || value === 'prototype';
    }
    function normalisePersonnelTrainingRegistryCountMap(value) {
        const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        const result = Object.create(null);
        Object.entries(source).forEach(([rawKey, rawCount]) => {
            const key = String(rawKey || '').slice(0, 150);
            const count = Number(rawCount || 0);
            if (isUnsafePersonnelTrainingRegistryKey(key) || !Number.isFinite(count) || count < 0) return;
            result[key] = Math.floor(count);
        });
        return result;
    }
    function normaliseImportedPersonnelTrainingRegistry(candidate) {
        const source = candidate?.registry && typeof candidate.registry === 'object' ? candidate.registry : candidate;
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            throw new Error('The selected file does not contain a Personnel Register object.');
        }
        const schemaVersion = source.schemaVersion == null
            ? PERSONNEL_TRAINING_REGISTRY_SCHEMA_VERSION
            : Number(source.schemaVersion);
        if (schemaVersion !== PERSONNEL_TRAINING_REGISTRY_SCHEMA_VERSION) {
            throw new Error(`Unsupported Personnel Register schema version: ${schemaVersion}.`);
        }
        if (!source.vehicles || typeof source.vehicles !== 'object' || Array.isArray(source.vehicles)) {
            throw new Error('The selected file does not contain a valid vehicles register.');
        }
        const entries = Object.entries(source.vehicles);
        if (entries.length > PERSONNEL_TRAINING_REGISTRY_MAX_VEHICLES) {
            throw new Error(`The file contains ${entries.length} vehicles; the supported maximum is ${PERSONNEL_TRAINING_REGISTRY_MAX_VEHICLES}.`);
        }
        const vehicles = Object.create(null);
        entries.forEach(([rawVehicleId, rawEntry]) => {
            const vehicleId = String(rawVehicleId || '').slice(0, 80);
            if (isUnsafePersonnelTrainingRegistryKey(vehicleId)) throw new Error('The file contains an invalid vehicle identifier.');
            if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) {
                throw new Error(`Vehicle ${vehicleId} does not contain a valid register entry.`);
            }
            const safeCount = value => {
                const count = Number(value || 0);
                return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
            };
            const safeTimestamp = value => {
                const timestamp = Number(value || 0);
                return Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : 0;
            };
            const assignedTrainingProfiles = Array.isArray(rawEntry.assignedTrainingProfiles)
                ? rawEntry.assignedTrainingProfiles.slice(0, 250).map(profile => {
                    return Array.from(new Set(
                        (Array.isArray(profile) ? profile : [])
                            .slice(0, 80)
                            .map(value => String(value || '').slice(0, 120))
                            .filter(Boolean)
                    )).sort();
                })
                : [];
            vehicles[vehicleId] = {
                vehicleId,
                vehicleName: String(rawEntry.vehicleName || '').slice(0, 500),
                vehicleTypeId: String(rawEntry.vehicleTypeId || '').slice(0, 80),
                stationName: String(rawEntry.stationName || '').slice(0, 500),
                stationHref: String(rawEntry.stationHref || '').slice(0, 1000),
                assignedPersonnelCount: safeCount(rawEntry.assignedPersonnelCount),
                assignmentScanComplete: rawEntry.assignmentScanComplete === true,
                personnelRowsSeen: safeCount(rawEntry.personnelRowsSeen),
                trainingCounts: normalisePersonnelTrainingRegistryCountMap(rawEntry.trainingCounts),
                trainingCombinationCounts: normalisePersonnelTrainingRegistryCountMap(rawEntry.trainingCombinationCounts),
                assignedTrainingProfiles,
                trainingProfilesComplete:
                    rawEntry.trainingProfilesComplete === true &&
                    Array.isArray(rawEntry.assignedTrainingProfiles),
                updatedAt: safeTimestamp(rawEntry.updatedAt),
                source: String(rawEntry.source || '').slice(0, 250)
            };
        });
        const safeRegistryTimestamp = value => {
            const timestamp = Number(value || 0);
            return Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : 0;
        };
        return {
            schemaVersion: PERSONNEL_TRAINING_REGISTRY_SCHEMA_VERSION,
            sourceVersion: String(source.sourceVersion || '').slice(0, 80),
            updatedAt: safeRegistryTimestamp(source.updatedAt),
            lastPrunedAt: safeRegistryTimestamp(source.lastPrunedAt),
            vehicles
        };
    }
    function downloadPersonnelTrainingRegistryJson(filename, payload) {
        const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    async function exportPersonnelTrainingRegistry() {
        if (PERSONNEL_STATE.running) {
            window.alert('Finish or stop the active Personnel operation before exporting the register.');
            return;
        }
        try {
            await window.NexusPersonnelStore.ready();
            const saved = await flushPersonnelTrainingRegistry(false);
            if (saved?.error) throw new Error(saved.error);
        } catch (error) {
            window.alert(`Personnel Register export failed: ${error.message}`);
            return;
        }
        const registry = readPersonnelTrainingRegistry();
        const stats = getPersonnelTrainingRegistryStats(registry);
        if (!stats.count) {
            window.alert('The Personnel Register is empty. Build or import a register before exporting.');
            return;
        }
        const exportedAt = new Date().toISOString();
        downloadPersonnelTrainingRegistryJson(`missionchief-personnel-register-${exportedAt.slice(0, 10)}.json`, {
            format: PERSONNEL_TRAINING_REGISTRY_EXPORT_FORMAT,
            exportVersion: PERSONNEL_TRAINING_REGISTRY_EXPORT_VERSION,
            exportedAt,
            origin: location.origin,
            vehicleCount: stats.count,
            registry
        });
        personnelLog(`Personnel Register exported: ${stats.count} vehicle(s).`, 'done');
    }
    async function importPersonnelTrainingRegistry(file) {
        await window.NexusPersonnelStore.ready();
        if (!file) return;
        if (PERSONNEL_STATE.running) {
            window.alert('Finish or stop the active Personnel operation before importing a register.');
            return;
        }
        if (Number(file.size || 0) > PERSONNEL_TRAINING_REGISTRY_IMPORT_MAX_BYTES) {
            window.alert('Personnel Register import failed: the selected file is larger than 10 MB.');
            return;
        }
        let registry;
        try {
            const parsed = JSON.parse(await file.text());
            if (parsed?.format && parsed.format !== PERSONNEL_TRAINING_REGISTRY_EXPORT_FORMAT) {
                throw new Error(`Unsupported export format: ${String(parsed.format).slice(0, 120)}`);
            }
            registry = normaliseImportedPersonnelTrainingRegistry(parsed);
        } catch (error) {
            personnelLog(`Personnel Register import failed: ${error?.message || error}`, 'error');
            window.alert(`Personnel Register import failed: ${error?.message || error}`);
            return;
        }
        const importedCount = Object.keys(registry.vehicles).length;
        if (!importedCount) {
            window.alert('The selected file contains an empty Personnel Register. Nothing was imported.');
            return;
        }
        const existingCount = getPersonnelTrainingRegistryStats().count;
        if (!window.confirm(
            `Import ${importedCount.toLocaleString('en-GB')} vehicle register entries?\n\n` +
            `This replaces the ${existingCount.toLocaleString('en-GB')} entries currently stored in this browser.`
        )) return;
        try {
            if (PERSONNEL_TRAINING_REGISTRY_FLUSH_TIMER != null) {
                clearTimeout(PERSONNEL_TRAINING_REGISTRY_FLUSH_TIMER);
                PERSONNEL_TRAINING_REGISTRY_FLUSH_TIMER = null;
            }
            await window.NexusPersonnelStore.write(registry, {replace:true});
            PERSONNEL_TRAINING_REGISTRY_CACHE = registry;
            PERSONNEL_TRAINING_REGISTRY_DIRTY = false;
            PERSONNEL_TRAINING_REGISTRY_PENDING_EVENT = null;
        } catch (error) {
            personnelLog(`Personnel Register import could not be saved: ${error?.message || error}`, 'error');
            window.alert(`Personnel Register could not be saved: ${error?.message || error}`);
            return;
        }
        dispatchPersonnelTrainingRegistryUpdate({ imported: true, vehicleCount: importedCount, updatedAt: Date.now() });
        updatePersonnelTrainingRegistryStatus();
        personnelLog(`Personnel Register imported: ${importedCount} vehicle(s). Existing browser register replaced.`, 'done');
        setPersonnelUiValue('status', 'Personnel register imported');
        window.alert(`Personnel Register imported successfully: ${importedCount.toLocaleString('en-GB')} vehicle entries.`);
    }
    function getPersonnelRegisterCanonicalProfiles(profiles) {
        return (Array.isArray(profiles) ? profiles : [])
            .map(profile => {
                return Array.from(
                    new Set(
                        (Array.isArray(profile) ? profile : [])
                            .map(String)
                            .filter(Boolean)
                    )
                ).sort().join('+');
            })
            .sort()
            .join('|');
    }
    let registerView = null;
    let registerCentresByStation = new Map();
    // Display names only. Station callsigns and the vehicle matching tables keep their own formats.
    const registerVehicleTypes = Object.freeze({
        ...TYPE_ID_TO_VEHICLE_TYPE,
        0: 'Water Ladder', 1: 'Light 4×4 Pump', 2: 'Aerial Appliance',
        8: 'Police Incident Response Vehicle', 10: 'Rapid Response Vehicle', 12: 'Dog Support Unit',
        14: 'Breathing Apparatus Support Unit', 20: 'Operational Team Leader', 21: 'General Practitioner',
        23: 'Crew Carrier', 27: 'Primary Response Vehicle', 28: 'Secondary Response Vehicle',
        30: 'All-Terrain Vehicle Carrier', 32: 'Chemical, Biological, Radiological and Nuclear Response Vehicle',
        35: 'Bulk Foam Unit', 36: 'Water and Foam Carrier', 37: 'Water Ladder with Compressed Air Foam',
        38: 'Rescue Pump with Compressed Air Foam', 40: 'Prime Mover', 41: 'Water Pod',
        42: 'Bulk Foam Pod', 43: 'Rescue Pod', 44: 'Command Pod', 45: 'Welfare Pod',
        46: 'Breathing Apparatus Support Pod', 47: 'Misting Pod', 48: 'Hazardous Materials Pod',
        49: 'Operational Support Pod', 50: 'High Volume Pump', 51: 'Police Support Unit Carrier',
        53: 'Multiple Dog Carrier', 56: 'Multi-Role Armoured Vehicle', 68: 'Inshore Lifeboat',
        69: 'All-Weather Lifeboat', 76: 'Rapid Intervention Vehicle', 77: 'Airfield Firefighting Command Vehicle',
        82: 'Armed Cell Van', 83: 'Medical Cycle Responder', 84: 'Pump Trailer', 85: 'Search and Rescue Control Van',
        88: 'Search and Rescue Flood Rescue Trailer', 89: 'Search and Rescue Headquarters Drone Vehicle',
        92: 'Personal Search and Rescue Vehicle', 93: 'Search and Rescue 4×4', 94: 'Search and Rescue Response Vehicle (RRV)',
        95: 'Community Midwife', 96: 'Specialist Paramedic Rapid Response Vehicle',
        102: 'Search and Rescue Dog Unit', 103: 'Search and Rescue Crew Carrier', 104: 'Recovery Vehicle',
        105: 'Flatbed Recovery Vehicle', 106: 'Heavy Goods Vehicle Recovery Vehicle', 108: 'Railway Emergency Intervention Unit',
        109: 'Bomb Disposal Commander', 110: 'Bomb Disposal Response Vehicle', 111: 'Bomb Disposal Medium Equipment Van',
        112: 'Bomb Disposal Heavy Equipment Vehicle', 113: 'Marine Bomb Disposal Response Vehicle',
        114: 'Marine Bomb Disposal Equipment Van'
    });

    function registerVehicleDescription(vehicle) {
        const type = registerVehicleTypes[vehicle.vehicleTypeId];
        const callsign = String(vehicle.name || '').trim();
        if (!callsign || callsign === String(vehicle.vehicleId)) return (type || 'Vehicle') + ' #' + vehicle.vehicleId;
        if (!type || callsign.toLowerCase().includes(type.toLowerCase())) return callsign;
        return callsign + ' · ' + type;
    }

    function registeredCrewTraining(centre) {
        const totals = new Map();
        let incomplete = 0;
        for (const entry of Object.values(readPersonnelTrainingRegistry().vehicles)) {
            if (centre !== 'all') {
                const station = getBuildingIdFromHref(entry?.stationHref);
                if (registerCentresByStation.get(station) !== centre) continue;
            }
            const profiles = entry?.assignedTrainingProfiles;
            if (entry?.assignmentScanComplete !== true || entry.trainingProfilesComplete !== true ||
                !Array.isArray(profiles) || profiles.length !== entry.assignedPersonnelCount ||
                !profiles.every(Array.isArray)) {
                incomplete++;
                continue;
            }
            for (const profile of profiles) {
                const qualifications = new Set();
                for (const code of profile) {
                    if (typeof code !== 'string' || !code.trim()) continue;
                    const key = code.trim().toLowerCase();
                    const courseName = Object.hasOwn(PERSONNEL_TRAINING_LABELS, key) ? PERSONNEL_TRAINING_LABELS[key] : '';
                    const label = key === 'hazard_response_ems' ? 'HART' : courseName;
                    qualifications.add(label || key.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()));
                }
                for (const label of qualifications) totals.set(label, (totals.get(label) || 0) + 1);
            }
        }
        const courses = [...totals].sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b));
        return {courses, incomplete};
    }
    async function readPersonnelRegisterBuildings() {
        const response = await fetch('/api/buildings', {
            credentials: 'same-origin', cache: 'no-store', redirect: 'error',
            headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(15000)
        });
        if (!response.ok) throw new Error(`Building list returned HTTP ${response.status}`);
        const buildings = await response.json();
        if (!Array.isArray(buildings) || buildings.length > 20000 || buildings.some(b => !b || !/^[1-9]\d*$/.test(String(b.id))) || new Set(buildings.map(b => String(b.id))).size !== buildings.length) {
            throw new Error('The game did not return a valid building list.');
        }
        registerCentresByStation = new Map(buildings.map(building => [
            String(building.id), getNamingDispatchCentreIdFromRecord(building) || 'unassigned'
        ]));
        return buildings;
    }
    function filterPersonnelRegisterBuildings(buildings, centre) {
        return buildings.filter(building => centre === 'all' ||
            (centre === 'unassigned' ? !getNamingDispatchCentreIdFromRecord(building) :
                getNamingDispatchCentreIdFromRecord(building) === centre))
            .map((building, index) => ({
                index, buildingId: String(building.id), href: `/buildings/${building.id}`,
                displayName: cleanText(building.caption || building.name || '') || `Building ${building.id}`,
                buildingTypeId: Number(building.building_type),
                dispatchCentreId: getNamingDispatchCentreIdFromRecord(building)
            }));
    }
    function openPersonnelRegister() {
        const host = document.getElementById('nexus-native-tools');
        const section = host?.shadowRoot?.getElementById('registerView');
        if (!section || section.hidden) return;
        if (!registerView) {
            registerView = NexusPersonnelRegisterView.mount(section, {
                ready: () => window.NexusPersonnelStore.ready(),
                stats: registerStats,
                training: registeredCrewTraining,
                centres: async () => {
                    const buildings = await readPersonnelRegisterBuildings();
                    return buildings.filter(b => Number(b.building_type) === 7)
                        .map(b => ({id:String(b.id), caption:b.caption || 'Dispatch centre '+b.id}))
                        .sort((a,b) => a.caption.localeCompare(b.caption));
                },
                build: buildPersonnelTrainingRegisterOneClick,
                pause: togglePersonnelPause,
                stop: stopPersonnelRun,
                export: exportPersonnelTrainingRegistry,
                import: importPersonnelTrainingRegistry,
                cloudReview: () => {
                    if (!window.__NEXUS_PROFILE_SYNC__?.reviewRegister) throw Error('Reload MissionChief after updating Nexus to use cloud replacement.');
                    return window.__NEXUS_PROFILE_SYNC__.reviewRegister();
                },
                cloudReplace: token => window.__NEXUS_PROFILE_SYNC__.replaceRegister(token),
                cloudCancel: () => window.__NEXUS_PROFILE_SYNC__?.cancelRegisterReview()
            });
        }
        registerView.opened();
    }
    function getPersonnelStationAssignmentSnapshot(doc, vehicles) {
        const evidence = parseStationPersonnelAssignmentEvidence(doc, vehicles);
        const rows = Array.from(
            doc?.querySelectorAll?.('#personal_table tbody tr') || []
        );
        const vehicleNameIndex = getUniquePersonnelVehicleNameIndex(vehicles);
        const stationVehicleIds = new Set(
            (Array.isArray(vehicles) ? vehicles : [])
                .map(vehicle => String(vehicle?.vehicleId || ''))
                .filter(Boolean)
        );
        let assignedRows = 0;
        let unresolvedRows = 0;
        rows.forEach(row => {
            const cells = Array.from(row.children || []);
            const hasDeleteCheckbox = !!row.querySelector?.(
                'input.personal-delete-checkbox'
            );
            const nameIndex = hasDeleteCheckbox ? 1 : 0;
            const assignedVehicleCell = cells[nameIndex + 2] || null;
            const assignedVehicleLink = assignedVehicleCell?.querySelector?.(
                'a[href^="/vehicles/"]'
            ) || null;
            const linkedVehicleId = getVehicleIdFromHref(
                assignedVehicleLink?.getAttribute?.('href') || ''
            );
            const assignedVehicleName = cleanText(
                assignedVehicleLink?.textContent ||
                assignedVehicleCell?.textContent ||
                ''
            );
            const normalizedVehicleName = normalizePersonnelVehicleName(
                assignedVehicleName
            );
            const matchedVehicle = linkedVehicleId
                ? null
                : vehicleNameIndex.get(normalizedVehicleName);
            const resolvedVehicleId = String(
                linkedVehicleId ||
                matchedVehicle?.vehicleId ||
                ''
            );
            const hasAssignmentText = Boolean(
                assignedVehicleName &&
                !/^(?:-|none|no vehicle|not assigned|unassigned)$/i.test(
                    assignedVehicleName
                )
            );
            if (!hasAssignmentText) return;
            assignedRows += 1;
            if (
                !getStationPersonnelRowId(row) ||
                !resolvedVehicleId ||
                !stationVehicleIds.has(resolvedVehicleId)
            ) {
                unresolvedRows += 1;
            }
        });
        const profilesByVehicle = new Map();
        evidence.forEach(person => {
            const vehicleId = String(person?.assignedVehicleId || '');
            if (!vehicleId) return;
            const profiles = profilesByVehicle.get(vehicleId) || [];
            profiles.push(
                Array.from(
                    new Set(
                        (Array.isArray(person?.trainingCodes)
                            ? person.trainingCodes
                            : []
                        ).map(String).filter(Boolean)
                    )
                ).sort()
            );
            profilesByVehicle.set(vehicleId, profiles);
        });
        return {
            evidence,
            profilesByVehicle,
            personnelRowsSeen: rows.length,
            assignedRows,
            unresolvedRows,
            safe: Boolean(
                rows.length > 0 &&
                unresolvedRows === 0 &&
                evidence.length === assignedRows
            )
        };
    }
    function isPersonnelRegistryVehicleSnapshotReusable({
        vehicle,
        station,
        existingEntry,
        expectedProfiles,
        snapshotSafe,
        fullVerify
    }) {
        if (fullVerify || !snapshotSafe || !existingEntry) return false;
        if (
            !existingEntry.assignmentScanComplete ||
            !existingEntry.trainingProfilesComplete
        ) {
            return false;
        }
        if (
            !String(existingEntry.source || '').startsWith(
                'personnel-register-exact-'
            )
        ) {
            return false;
        }
        const verifiedAt = Number(existingEntry.updatedAt || 0);
        if (
            !Number.isFinite(verifiedAt) ||
            verifiedAt <= 0 ||
            Date.now() - verifiedAt > PERSONNEL_REGISTER_REVERIFY_AGE_MS
        ) {
            return false;
        }
        if (
            String(existingEntry.vehicleId || '') !== String(vehicle.vehicleId) ||
            String(existingEntry.vehicleTypeId || '') !== String(vehicle.vehicleTypeId || '') ||
            String(existingEntry.stationHref || '') !== String(station.href || '')
        ) {
            return false;
        }
        if (
            Number(existingEntry.assignedPersonnelCount || 0) !==
            expectedProfiles.length
        ) {
            return false;
        }
        return getPersonnelRegisterCanonicalProfiles(
            existingEntry.assignedTrainingProfiles
        ) === getPersonnelRegisterCanonicalProfiles(expectedProfiles);
    }
    function mergePersonnelRegisterEvidence(target, person) {
        const personnelId = String(person?.personnelId || '');
        if (!personnelId) return;
        const existing = target.get(personnelId);
        const newHasExactBinding = Boolean(person?.assignedVehicleId);
        const existingHasExactBinding = Boolean(existing?.assignedVehicleId);
        if (
            !existing ||
            (person.assignedHere && !existing.assignedHere) ||
            (newHasExactBinding && !existingHasExactBinding)
        ) {
            target.set(personnelId, person);
        }
    }
    function createPersonnelRegisterReader() {
        const controllers = new Set();
        const slots = [];
        const limit = isIosSafariWebsite() ? 2 : PERSONNEL_REGISTER_MAX_CONCURRENCY;
        const launchGap = isIosSafariWebsite() ? 350 : PERSONNEL_REGISTER_LAUNCH_GAP_MS;
        let active = 0, nextLaunchAt = 0, cooldownUntil = 0, cancelled = false;
        let launchChain = Promise.resolve();
        const stats = { requests: 0, throttled: 0, failed: 0, networkMs: 0 };
        const check = () => {
            if (cancelled || PERSONNEL_STATE.stopped) throw new DOMException('Register scan stopped', 'AbortError');
        };
        const waitUntil = async target => {
            while (Date.now() < target) {
                check();
                await new Promise(resolve => setTimeout(resolve, Math.min(100, target - Date.now())));
            }
        };
        const waitPaused = async () => {
            while (PERSONNEL_STATE.paused) { check(); await new Promise(resolve => setTimeout(resolve, 100)); }
        };
        const waitForLaunchSlot = () => {
            const task = launchChain.then(async () => {
                check();
                while (active >= limit) { await new Promise(resolve => slots.push(resolve)); check(); }
                // Recheck after every pause/wait: another response can impose
                // backoff while this request is waiting for its launch slot.
                while (true) {
                    await waitPaused(); check();
                    const target = Math.max(nextLaunchAt, cooldownUntil);
                    if (Date.now() >= target) break;
                    await waitUntil(target);
                }
                nextLaunchAt = Date.now() + launchGap;
                active++;
            });
            launchChain = task.catch(() => {});
            return task;
        };
        const read = async (url, timeoutMs = 14000, format = 'html') => {
            const requestUrl = getSameOriginResourceUrl(url, 'Personnel register read');
            await waitForLaunchSlot();
            const controller = new AbortController();
            controllers.add(controller);
            const started = Date.now();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            stats.requests++;
            try {
                check();
                const response = await fetch(`${requestUrl.pathname}${requestUrl.search}`, {
                    method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'follow',
                    headers: { Accept: format === 'json' ? 'application/json' : 'text/html,application/xhtml+xml' }, signal: controller.signal
                });
                // Keep assignment writes on their original conservative pacing.
                PERSONNEL_STATE.lastRequestAt = Date.now();
                if (response.status === 429 || response.status === 503) {
                    stats.throttled++;
                    const retry = response.headers?.get('Retry-After');
                    const seconds = retry == null || retry === '' ? NaN : Number(retry);
                    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retry) - Date.now();
                    cooldownUntil = Math.max(cooldownUntil, Date.now() + Math.max(5000, Number.isFinite(delay) ? delay : 5000));
                }
                if (!response.ok) throw new Error(`Register read returned HTTP ${response.status}`);
                const finalUrl = getSameOriginResourceUrl(response.url || requestUrl.href, 'Personnel register response');
                if (finalUrl.pathname !== requestUrl.pathname) throw new Error('Register read redirected to a different page');
                if (format === 'json') {
                    const data = await response.json(); check();
                    return {response, data};
                }
                const html = await response.text();
                check();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                return { response, doc, href: new URL(response.url || url, location.origin).pathname };
            } catch (error) { stats.failed++; throw error; }
            finally {
                clearTimeout(timer); controllers.delete(controller); active--;
                stats.networkMs += Date.now() - started;
                slots.splice(0).forEach(resolve => resolve());
            }
        };
        return {
            read, stats,
            cancel() {
                cancelled = true;
                controllers.forEach(controller => controller.abort());
                slots.splice(0).forEach(resolve => resolve());
            }
        };
    }

    async function runPersonnelRegisterVehicleVerificationPool({
        vehicles,
        mergedPersonnel,
        station,
        onProgress = () => {}
    }) {
        const queue = Array.isArray(vehicles) ? vehicles.slice() : [];
        const verifiedVehicles = [];
        let exactPagesRead = 0;
        let failedVehicles = 0;
        const failedVehicleIds = [];
        let cursor = 0;
        const concurrency = Math.max(
            1,
            Math.min(
                isIosSafariWebsite() ? 2 : PERSONNEL_REGISTER_MAX_CONCURRENCY,
                queue.length || 1
            )
        );
        const worker = async () => {
            while (true) {
                if (PERSONNEL_STATE.stopped) return;
                await waitIfPersonnelPaused();
                if (PERSONNEL_STATE.stopped) return;
                const index = cursor;
                cursor += 1;
                if (index >= queue.length) return;
                const vehicle = queue[index];
                setPersonnelUiValue(
                    'vehicle',
                    `${registerVehicleDescription(vehicle)} (${index + 1}/${queue.length})`
                );
                setPersonnelUiValue('status', 'Reading exact vehicle assignments');
                let parsed = null;
                let finalError = null;
                for (let attempt = 0; attempt < 2; attempt++) {
                    try {
                        if (PERSONNEL_STATE.stopped) return;
                        const assignmentPage = await personnelFetchDocument(
                            vehicle.assignmentHref,
                            14000
                        );
                        if (!assignmentPage.doc.querySelector('#personal_table')) {
                            throw new Error(
                                'Personnel table was not present on the assignment page.'
                            );
                        }
                        parsed = parseVehicleAssignmentPage(
                            assignmentPage.doc,
                            vehicle.vehicleId
                        );
                        break;
                    } catch (error) {
                        finalError = error;
                        if (attempt === 0 && !PERSONNEL_STATE.stopped) {
                            await new Promise(resolve => setTimeout(resolve, 900));
                        }
                    }
                }
                if (!parsed) {
                    failedVehicles += 1;
                    failedVehicleIds.push(String(vehicle.vehicleId || ''));
                    personnelLog(
                        `Exact vehicle scan failed for ${registerVehicleDescription(vehicle)}: ${finalError?.message || finalError}`,
                        'error'
                    );
                    continue;
                }
                parsed.rows.forEach(person => {
                    mergePersonnelRegisterEvidence(mergedPersonnel, person);
                });
                verifiedVehicles.push(vehicle);
                exactPagesRead += 1;
                onProgress(exactPagesRead);
            }
        };
        await Promise.all(
            Array.from({ length: concurrency }, () => worker())
        );
        return {
            station,
            verifiedVehicles,
            exactPagesRead,
            failedVehicles,
            failedVehicleIds
        };
    }
    async function precheckPersonnelRegisterStations(stations, registry, reader) {
        const {data: fleet} = await reader.read('/api/vehicles', 15000, 'json');
        if (!Array.isArray(fleet) || fleet.length > 100000 || fleet.some(v =>
            !v || !/^[1-9]\d*$/.test(String(v.id)) || !/^[1-9]\d*$/.test(String(v.building_id))) ||
            new Set(fleet.map(v => String(v.id))).size !== fleet.length) {
            throw Error('Owned vehicle list was incomplete or invalid');
        }
        const occupied = new Set(fleet.map(v => String(v.building_id)));
        const saved = new Set(Object.values(registry.vehicles).map(v => v.stationHref));
        // A saved station must still be checked, even if the API now has no vehicles:
        // only its native vehicle table can confirm which old records to remove.
        return stations.filter(station => occupied.has(station.buildingId) || saved.has(station.href));
    }
    async function flushPersonnelRegisterChanges(silent) {
        if (PERSONNEL_REGISTER_FLUSH_JOB) return PERSONNEL_REGISTER_FLUSH_JOB;
        const job = (async () => {
            try {
                while (PERSONNEL_REGISTER_PENDING_IDS.size) {
                    const ids = [...PERSONNEL_REGISTER_PENDING_IDS].slice(0, 100);
                    const snapshots = new Map(ids.map(id => [id, JSON.stringify(PERSONNEL_TRAINING_REGISTRY_CACHE.vehicles[id])]));
                    const vehicles = Object.fromEntries([...snapshots].filter(([,value]) => value).map(([id,value]) => [id,JSON.parse(value)]));
                    if (Object.keys(vehicles).length) await window.NexusPersonnelStore.write({schemaVersion:1, vehicles});
                    // A concurrent update must remain pending until its own commit.
                    for (const [id, value] of snapshots) if (JSON.stringify(PERSONNEL_TRAINING_REGISTRY_CACHE.vehicles[id]) === value) PERSONNEL_REGISTER_PENDING_IDS.delete(id);
                }
                PERSONNEL_TRAINING_REGISTRY_DIRTY = false;
                const detail = PERSONNEL_TRAINING_REGISTRY_PENDING_EVENT;
                PERSONNEL_TRAINING_REGISTRY_PENDING_EVENT = null;
                dispatchPersonnelTrainingRegistryUpdate(detail);
                updatePersonnelTrainingRegistryStatus();
                return {saved:true, pruned:0, retained:Object.keys(PERSONNEL_TRAINING_REGISTRY_CACHE.vehicles).length, quotaRetry:false};
            } catch(error) {
                if (!silent) personnelLog('Register changes could not be saved: '+error.message, 'error');
                return {saved:false, error};
            }
        })();
        PERSONNEL_REGISTER_FLUSH_JOB = job;
        try { return await job; } finally { if (PERSONNEL_REGISTER_FLUSH_JOB === job) PERSONNEL_REGISTER_FLUSH_JOB = null; }
    }
    async function buildPersonnelTrainingRegisterOneClick({fullVerify, centre, scopeLabel}) {
        const player = namingPlayer();
        if (!player) throw Error('Sign in to MissionChief before building the register.');
        if (!['all','unassigned'].includes(centre) && !/^[1-9]\d*$/.test(centre)) throw Error('Choose a dispatch centre.');
        await window.NexusPersonnelStore.ready();
        function checkAvailable() {
            if (player !== namingPlayer()) throw Error('Player changed. Reopen MissionChief before building the register.');
            if (STATE.running || STATION_STATE.running || PERSONNEL_STATE.running) throw Error('Finish the current naming or personnel operation before refreshing the register.');
        }
        checkAvailable();
        const inventory = await readPersonnelRegisterBuildings();
        checkAvailable();
        let stations = filterPersonnelRegisterBuildings(inventory, centre);
        if (!stations.length) throw Error('No stations found for '+scopeLabel+'.');
        const previousAction = PERSONNEL_STATE.action;
        const previousSave = await flushPersonnelTrainingRegistry(false);
        if (previousSave?.error) throw previousSave.error;
        checkAvailable();
        let registry = readPersonnelTrainingRegistry();
        PERSONNEL_REGISTER_PENDING_IDS = new Set();
        PERSONNEL_STATE.running = true;
        PERSONNEL_STATE.registerBuilding = true;
        const scanStartedAt = Date.now();
        const registerReader = createPersonnelRegisterReader();
        PERSONNEL_STATE.registerReader = registerReader;
        let nextStationPage = null;
        PERSONNEL_STATE.stopped = false;
        PERSONNEL_STATE.paused = false;
        PERSONNEL_STATE.action = fullVerify
            ? 'Full Verify Register'
            : 'Quick Refresh Register';
        registerView.started();
        setPersonnelUiValue(
            'status',
            fullVerify
                ? 'Full verifying personnel register'
                : 'Quick refreshing personnel register'
        );
        setPersonnelUiValue('progress', `0 / ${stations.length}`);
        setPersonnelUiValue('vehicle', 'None');
        personnelLog(
            `${fullVerify ? 'Full verification' : 'Quick refresh'} started for ${scopeLabel}: ${stations.length} station(s). ` +
            `${fullVerify ? 'Every exact vehicle page will be read.' : 'Unchanged exact records will be reused and only changed or unsafe vehicles will be reopened.'} ` +
            'No personnel assignments will be changed.',
            'info'
        );
        let completedStations = 0;
        let skippedStations = 0;
        let failedStations = 0;
        let unsafeStations = 0;
        let exactPagesRead = 0;
        let exactVehiclesRegistered = 0;
        let reusedVehicles = 0;
        let deletedVehicles = 0;
        let failedVehicles = 0;
        let emptyBuildingsSkipped = 0;
        const updatePace = () => {
            const seconds = Math.floor((Date.now() - scanStartedAt) / 1000);
            setPersonnelUiValue('pace', `Elapsed ${Math.floor(seconds / 60)}m ${seconds % 60}s · ${registerReader.stats.requests} read requests · ${emptyBuildingsSkipped} empty buildings avoided`);
        };
        try {
            setPersonnelUiValue('status', 'Checking which buildings have vehicles');
            try {
                const selected = await precheckPersonnelRegisterStations(stations, registry, registerReader);
                emptyBuildingsSkipped = stations.length - selected.length;
                stations = selected;
                personnelLog(`Fleet precheck: ${stations.length} station(s) to check; ${emptyBuildingsSkipped} buildings have no owned vehicles or saved records.`, 'info');
            } catch(error) {
                if (!PERSONNEL_STATE.stopped) personnelLog('Fleet precheck unavailable; checking every selected building. '+error.message, 'info');
            }
            setPersonnelUiValue('progress', `0 / ${stations.length}`);
            updatePace();
            for (
                let stationIndex = 0;
                stationIndex < stations.length;
                stationIndex++
            ) {
                if (PERSONNEL_STATE.stopped) break;
                await waitIfPersonnelPaused();
                if (PERSONNEL_STATE.stopped) break;
                const station = stations[stationIndex];
                registry = readPersonnelTrainingRegistry();
                updatePace();
                setPersonnelUiValue(
                    'progress',
                    `${stationIndex + 1} / ${stations.length}`
                );
                setPersonnelUiValue('current', station.displayName);
                setPersonnelUiValue('vehicle', 'Reading station vehicles');
                setPersonnelUiValue('status', 'Reading station snapshot');
                personnelLog(
                    `Register station ${stationIndex + 1}/${stations.length}: ${station.displayName}`,
                    'station'
                );
                try {
                    let result = nextStationPage
                        ? await nextStationPage
                        : await personnelFetchDocument(station.href, 14000).then(page => ({ page }), error => ({ error }));
                    nextStationPage = null;
                    // Long audits and pauses must not reuse an old prefetched
                    // snapshot when deciding whether exact records can be reused.
                    if (result.fetchedAt && Date.now() - result.fetchedAt > 10000) {
                        result = await personnelFetchDocument(station.href, 14000).then(page => ({ page }), error => ({ error }));
                    }
                    // Only one station is prefetched; every GET shares the same
                    // global concurrency and launch limits as exact vehicle reads.
                    if (!PERSONNEL_STATE.stopped && stationIndex + 1 < stations.length) {
                        nextStationPage = personnelFetchDocument(stations[stationIndex + 1].href, 14000)
                            .then(page => ({ page, fetchedAt: Date.now() }), error => ({ error }));
                    }
                    if (result.error) throw result.error;
                    const stationPage = result.page;
                    if (!stationPage.doc.querySelector('#vehicle_table')) {
                        throw new Error(
                            'Vehicle table was not present on the station page.'
                        );
                    }
                    const vehicles = getPersonnelVehicleQueue(
                        stationPage.doc,
                        []
                    );
                    const currentVehicleIds = new Set(
                        vehicles.map(vehicle => String(vehicle.vehicleId))
                    );
                    const removedVehicleIds = Object.entries(registry.vehicles || {})
                        .filter(([vehicleId, entry]) => String(entry?.stationHref || '') === station.href && !currentVehicleIds.has(String(vehicleId)))
                        .map(([vehicleId]) => vehicleId);
                    if (removedVehicleIds.length) {
                        await window.NexusPersonnelStore.remove(removedVehicleIds);
                        for (const vehicleId of removedVehicleIds) delete registry.vehicles[vehicleId];
                        PERSONNEL_TRAINING_REGISTRY_DIRTY = true;
                        deletedVehicles += removedVehicleIds.length;
                    }
                    if (!vehicles.length) {
                        skippedStations += 1;
                        completedStations += 1;
                        await flushPersonnelTrainingRegistry(false);
                        setPersonnelUiValue('completed', completedStations);
                        personnelLog(
                            'No vehicles found at this station; any former station vehicle records were removed.',
                            'debug'
                        );
                        continue;
                    }
                    const snapshot = getPersonnelStationAssignmentSnapshot(
                        stationPage.doc,
                        vehicles
                    );
                    if (snapshot.evidence.length) {
                        personnelLog(
                            `Station personnel table supplied ${snapshot.evidence.length} exact assigned-person fallback record(s).`,
                            'debug'
                        );
                    }
                    if (!snapshot.safe) {
                        unsafeStations += 1;
                        personnelLog(
                            `Station snapshot was not safe for reuse (${snapshot.unresolvedRows} unresolved assigned row(s)); exact verification will be used.`,
                            'debug'
                        );
                    }
                    const mergedPersonnel = new Map(
                        snapshot.evidence.map(person => [
                            String(person.personnelId),
                            person
                        ])
                    );
                    const vehiclesToVerify = [];
                    vehicles.forEach(vehicle => {
                        const vehicleId = String(vehicle.vehicleId || '');
                        const existingEntry = registry.vehicles?.[vehicleId] || null;
                        const expectedProfiles =
                            snapshot.profilesByVehicle.get(vehicleId) || [];
                        const reusable =
                            isPersonnelRegistryVehicleSnapshotReusable({
                                vehicle,
                                station,
                                existingEntry,
                                expectedProfiles,
                                snapshotSafe: snapshot.safe,
                                fullVerify
                            });
                        if (!reusable) {
                            vehiclesToVerify.push(vehicle);
                            return;
                        }
                        existingEntry.vehicleName = vehicle.name || vehicleId;
                        existingEntry.vehicleTypeId = String(
                            vehicle.vehicleTypeId || ''
                        );
                        existingEntry.stationName = station.displayName;
                        existingEntry.stationHref = station.href;
                        existingEntry.stationConfirmedAt = Date.now();
                        PERSONNEL_TRAINING_REGISTRY_DIRTY = true;
                        PERSONNEL_REGISTER_PENDING_IDS.add(vehicleId);
                        reusedVehicles += 1;
                    });
                    const verification =
                        await runPersonnelRegisterVehicleVerificationPool({
                            vehicles: vehiclesToVerify,
                            mergedPersonnel,
                            station,
                            onProgress: count => {
                                setPersonnelUiValue('vehicles', reusedVehicles + exactVehiclesRegistered + count);
                                updatePace();
                            }
                        });
                    exactPagesRead += verification.exactPagesRead;
                    failedVehicles += verification.failedVehicles;
                    verification.failedVehicleIds.forEach(vehicleId => {
                        const existingEntry = registry.vehicles?.[vehicleId];
                        if (!existingEntry) return;
                        existingEntry.assignmentScanComplete = false;
                        existingEntry.trainingProfilesComplete = false;
                        existingEntry.source =
                            'personnel-register-refresh-failed-v1';
                        existingEntry.refreshFailedAt = Date.now();
                        PERSONNEL_TRAINING_REGISTRY_DIRTY = true;
                        PERSONNEL_REGISTER_PENDING_IDS.add(vehicleId);
                    });
                    if (verification.verifiedVehicles.length) {
                        const published =
                            publishPersonnelVehicleTrainingRegistry({
                                station,
                                vehicles: verification.verifiedVehicles,
                                personnel: Array.from(
                                    mergedPersonnel.values()
                                ),
                                source:
                                    'personnel-register-exact-incremental-scan-v1',
                                pruneMissingVehicles: false
                            });
                        exactVehiclesRegistered += Number(published || 0);
                    }
                    completedStations += 1;
                    const savedStation = await flushPersonnelTrainingRegistry(false);
                    if (savedStation?.error) throw savedStation.error;
                    updatePace();
                    setPersonnelUiValue('completed', completedStations);
                    setPersonnelUiValue(
                        'vehicles',
                        reusedVehicles + exactVehiclesRegistered
                    );
                    personnelLog(
                        `Station complete: ${vehiclesToVerify.length} exact page(s) queued, ${verification.exactPagesRead} verified, ${vehicles.length - vehiclesToVerify.length} reused.`,
                        'done'
                    );
                } catch (error) {
                    failedStations += 1;
                    personnelLog(
                        `Register scan failed at ${station.displayName}: ${error?.message || error}`,
                        'error'
                    );
                }
            }
            const saved = await flushPersonnelTrainingRegistry(false);
            if (saved?.error) throw saved.error;
            const stopped = PERSONNEL_STATE.stopped;
            const registryRetained = getPersonnelTrainingRegistryStats().count;
            const summary = [
                fullVerify
                    ? 'PERSONNEL REGISTER FULL VERIFICATION'
                    : 'PERSONNEL REGISTER QUICK REFRESH',
                '',
                `Status: ${stopped ? 'STOPPED' : (failedStations || failedVehicles ? 'COMPLETE WITH ERRORS' : 'COMPLETE')}`,
                `Elapsed: ${((Date.now() - scanStartedAt) / 1000).toFixed(1)} seconds`,
                `Read requests: ${registerReader.stats.requests}; server backoffs: ${registerReader.stats.throttled}`,
                `Dispatch centre scope: ${scopeLabel}`,
                `Stations in this refresh: ${stations.length}`,
                `Empty buildings avoided by fleet precheck: ${emptyBuildingsSkipped}`,
                'Other dispatch centres retain their existing records and verification times.',
                `Stations completed: ${completedStations}`,
                `Stations without vehicles: ${skippedStations}`,
                `Stations unsafe for reuse: ${unsafeStations}`,
                `Stations failed: ${failedStations}`,
                `Exact vehicle pages read: ${exactPagesRead}`,
                `Exact vehicles registered: ${exactVehiclesRegistered}`,
                `Exact vehicles reused unchanged: ${reusedVehicles}`,
                `Removed vehicles: ${deletedVehicles}`,
                `Vehicle pages failed: ${failedVehicles}`,
                `Registry retained: ${registryRetained}`,
                '',
                'Only personnel already assigned to each exact vehicle were recorded.',
                'Unchanged records retain their last exact verification timestamp and receive a station confirmation timestamp.',
                'Vehicle pages remain authoritative; unsafe or changed station evidence always triggers exact verification.',
                'No personnel assignments were changed.'
            ].join('\n');
            updatePace();
            registerView.set('report', summary);
            const failedChecks = failedVehicles + failedStations;
            registerView.set('result', [
                completedStations + (completedStations === 1 ? ' station completed' : ' stations completed'),
                exactVehiclesRegistered + ' verified',
                reusedVehicles + ' reused',
                failedChecks + (failedChecks === 1 ? ' failed check' : ' failed checks')
            ].join(' · '));
            setPersonnelUiValue('completed', completedStations);
            setPersonnelUiValue(
                'vehicles',
                reusedVehicles + exactVehiclesRegistered
            );
            setPersonnelUiValue('assigned', 0);
            setPersonnelUiValue(
                'status',
                stopped
                    ? 'Register refresh stopped'
                    : (failedStations || failedVehicles
                        ? 'Register refresh complete with errors'
                        : 'Register refresh complete')
            );
            personnelLog(
                stopped
                    ? 'Personnel register refresh stopped. Existing exact records were preserved where work did not complete.'
                    : 'Personnel register refresh complete.',
                stopped ? 'error' : 'done'
            );
        } finally {
            registerReader.cancel();
            if (nextStationPage) await nextStationPage;
            if (!PERSONNEL_REGISTER_PENDING_IDS.size) {
                PERSONNEL_REGISTER_PENDING_IDS = null;
                PERSONNEL_TRAINING_REGISTRY_CACHE = null;
            }
            PERSONNEL_STATE.registerReader = null;
            PERSONNEL_STATE.running = false;
            PERSONNEL_STATE.registerBuilding = false;
            PERSONNEL_STATE.paused = false;
            PERSONNEL_STATE.action = previousAction;
            updatePersonnelTrainingRegistryStatus();
        }
        // Regression compatibility tokens retained inside the authoritative build:
        // parseStationPersonnelAssignmentEvidence(
        // person.assignedHere && !existing.assignedHere
        // personnel-register-exact-all-vehicle-scan-v2
    }
    function startPersonnelRun() {
        if (!isLivePersonnelProfile()) {
            const service = getPersonnelServiceDefinition();
            const profile = getPersonnelProfileDefinition();
            personnelLog(`${service.label} > ${profile.label} is shown for UI review only. Assignment has been safely blocked until that profile is implemented and tested.`, 'error');
            setPersonnelUiValue('status', 'Profile UI preview');
            return;
        }
        if (STATE.running || STATION_STATE.running) {
            personnelLog('A naming tool is currently running. Stop it before starting Personnel Assignment.', 'error');
            setPersonnelUiValue('status', 'Blocked by naming tool');
            return;
        }
        if (PERSONNEL_STATE.running) {
            personnelLog('Personnel Assignment is already running.', 'debug');
            return;
        }
        if (!PERSONNEL_STATE.filteredStations.length) {
            personnelLog(`No ${getPersonnelStationScopeLabel()} loaded. Press Refresh Stations first.`, 'error');
            setPersonnelUiValue('status', 'Refresh required');
            return;
        }
        const selectedHref = document.querySelector('#mc-personnel-startfrom')?.value || '';
        const startIndex = PERSONNEL_STATE.filteredStations.findIndex(station => station.href === selectedHref);
        if (startIndex < 0) {
            personnelLog(`Selected start station not found: ${selectedHref || 'none'}`, 'error');
            setPersonnelUiValue('status', 'Invalid start station');
            return;
        }
        PERSONNEL_STATE.mode =
            document.querySelector(
                '#mc-personnel-mode'
            )?.value ||
            'all';
        PERSONNEL_STATE.action =
            document.querySelector(
                '#mc-personnel-action'
            )?.value ||
            'preview';
        const unitsInput =
            document.querySelector(
                '#mc-personnel-units-required'
            );
        if (
            PERSONNEL_STATE.mode ===
            'target'
        ) {
            const configuredTarget =
                normalisePersonnelUnitsRequired(
                    unitsInput?.value ||
                    PERSONNEL_STATE
                        .configuredUnitsRequired ||
                    0
                );
            if (
                configuredTarget <=
                0
            ) {
                personnelLog(
                    'Target-units mode requires a Units required value greater than 0.',
                    'error'
                );
                setPersonnelUiValue(
                    'status',
                    'Enter a units target'
                );
                unitsInput?.focus();
                return;
            }
            PERSONNEL_STATE
                .configuredUnitsRequired =
                    configuredTarget;
            PERSONNEL_STATE.unitsRequired =
                configuredTarget;
            if (unitsInput) {
                unitsInput.value =
                    String(configuredTarget);
            }
            try {
                localStorage.setItem(
                    PERSONNEL_UNITS_REQUIRED_STORAGE_KEY,
                    String(configuredTarget)
                );
            } catch (_error) {}
        } else {
            PERSONNEL_STATE.unitsRequired =
                0;
            if (unitsInput) {
                unitsInput.value =
                    '0';
            }
        }
        PERSONNEL_STATE.queue = PERSONNEL_STATE.mode === 'single'
            ? [PERSONNEL_STATE.filteredStations[startIndex]]
            : PERSONNEL_STATE.filteredStations.slice(startIndex);
        PERSONNEL_STATE.running = true;
        PERSONNEL_STATE.paused = false;
        PERSONNEL_STATE.stopped = false;
        PERSONNEL_STATE.unitsFulfilled = 0;
        PERSONNEL_STATE.unitTargetReached = false;
        PERSONNEL_STATE.stationsTargetMet = 0;
        PERSONNEL_STATE.stationsTargetShort = 0;
        PERSONNEL_STATE.stationIndex = 0;
        PERSONNEL_STATE.completedStations = 0;
        PERSONNEL_STATE.skippedStations = 0;
        PERSONNEL_STATE.checkedVehicles = 0;
        PERSONNEL_STATE.plannedCount = 0;
        PERSONNEL_STATE.assignedCount = 0;
        PERSONNEL_STATE.trainingShortfall = 0;
        PERSONNEL_STATE.assignmentShortfall = 0;
        PERSONNEL_STATE.reports = [];
        PERSONNEL_STATE.currentReport = '';
        PERSONNEL_STATE.currentStationReport = '';
        PERSONNEL_STATE.lastStationReport = null;
        PERSONNEL_STATE.activeController = null;
        PERSONNEL_STATE.lastRequestAt = 0;
        PERSONNEL_SHORTFALL_CACHE = [];
        PERSONNEL_SHORTFALL_CACHE_SIZE = -1;
        document.querySelector('#mc-personnel-pause').textContent = 'Pause';
        updatePersonnelCounters();
        renderPersonnelAfterActionText('The latest completed station report will appear here.');
        renderPersonnelReport('Scanning has started. The completed overall report will appear here.');
        updatePersonnelTrainingShortfallHighlights();
        setPersonnelUiValue('progress', `0 / ${PERSONNEL_STATE.queue.length}`);
        setPersonnelUiValue('status', PERSONNEL_STATE.action === 'assign' ? 'Starting assignment run' : 'Starting preview');
        personnelLog(`Service/Profile: ${getPersonnelServiceDefinition().label} > ${getPersonnelProfileDefinition().label}`, 'info');
        personnelLog(
            `Mode: ${
                PERSONNEL_STATE.mode ===
                    'single'
                    ? 'Selected station only — scan the entire selected station'
                    : PERSONNEL_STATE.mode ===
                        'target'
                        ? `Ensure each ${getPersonnelStationScopeLabel().replace(/s$/, '')} has ${PERSONNEL_STATE.unitsRequired} fully staffed unit(s)`
                        : `All ${getPersonnelStationScopeLabel()} from selected start point — scan every station`
            }`,
            'info'
        );
        personnelLog(`Action: ${PERSONNEL_STATE.action === 'assign' ? 'ASSIGN AND VERIFY' : 'PREVIEW ONLY - no assignments will change'}`, PERSONNEL_STATE.action === 'assign' ? 'after' : 'info');
        personnelLog(
            PERSONNEL_STATE.mode ===
                'target'
                ? `Units required at every station: ${PERSONNEL_STATE.unitsRequired}. Existing fully covered units count first; only the station's remaining target will be planned or assigned before moving to the next station.`
                : PERSONNEL_STATE.mode ===
                    'single'
                    ? 'Units required: not used. Every matching unit at the selected station will be processed.'
                    : 'Units required: not used. Every relevant station and matching unit from the selected start point will be processed.',
            'info'
        );
        personnelLog(`Rule: ${getPersonnelProfileDefinition().requirement}.`, 'info');
        processPersonnelQueue().catch(error => {
            personnelLog(`Personnel Assignment stopped after an unexpected error: ${error?.message || error}`, 'error');
            personnelDebug(error?.stack || String(error));
            PERSONNEL_STATE.stopped = true;
            PERSONNEL_STATE.running = false;
            setPersonnelUiValue('status', 'Error');
        });
    }
    function togglePersonnelPause() {
        if (!PERSONNEL_STATE.running) {
            personnelLog('Nothing is currently running.', 'debug');
            return;
        }
        PERSONNEL_STATE.paused = !PERSONNEL_STATE.paused;
        if (PERSONNEL_STATE.registerBuilding) registerView.pauseLabel(PERSONNEL_STATE.paused);
        else document.querySelector('#mc-personnel-pause').textContent = PERSONNEL_STATE.paused ? 'Resume' : 'Pause';
        setPersonnelUiValue('status', PERSONNEL_STATE.paused ? 'Paused' : 'Running');
        personnelLog(PERSONNEL_STATE.paused ? 'Paused. The current safe request will finish before waiting.' : 'Resumed.', 'debug');
    }
    function stopPersonnelRun() {
        if (!PERSONNEL_STATE.running) {
            personnelLog('Nothing is currently running.', 'debug');
            return;
        }
        PERSONNEL_STATE.stopped = true;
        PERSONNEL_STATE.paused = false;
        if (PERSONNEL_STATE.registerBuilding) registerView.pauseLabel(false);
        else document.querySelector('#mc-personnel-pause').textContent = 'Pause';
        setPersonnelUiValue('status', 'Stopping...');
        PERSONNEL_STATE.registerReader?.cancel();
        if (PERSONNEL_STATE.activeController) {
            try {
                PERSONNEL_STATE.activeController.abort();
            } catch (_error) {}
            PERSONNEL_STATE.activeController = null;
        }
        personnelLog('Stop requested. The active Personnel request was cancelled and no further work will run.', 'error');
    }
    async function processPersonnelQueue() {
        await window.NexusPersonnelStore.ready();
        try {
            while (
                PERSONNEL_STATE.stationIndex <
                PERSONNEL_STATE.queue.length
            ) {
                if (PERSONNEL_STATE.stopped) break;
                await waitIfPersonnelPaused();
                if (PERSONNEL_STATE.stopped) break;
                const station =
                    PERSONNEL_STATE.queue[
                        PERSONNEL_STATE.stationIndex
                    ];
                const displayPosition =
                    PERSONNEL_STATE.stationIndex + 1;
                setPersonnelUiValue(
                    'progress',
                    `${displayPosition} / ${PERSONNEL_STATE.queue.length}`
                );
                setPersonnelUiValue(
                    'current',
                    station.displayName
                );
                setPersonnelUiValue(
                    'vehicle',
                    'None'
                );
                setPersonnelUiValue(
                    'status',
                    'Scanning station'
                );
                personnelLog(
                    `Station ${displayPosition}/${PERSONNEL_STATE.queue.length}: ${station.displayName}`,
                    'station'
                );
                let completedReport;
                try {
                    completedReport =
                        await processOnePersonnelStation(
                            station
                        );
                    if (isPersonnelPerStationTargetMode()) {
                        const stationTarget =
                            PERSONNEL_STATE.unitsRequired;
                        const stationFulfilled =
                            Math.min(
                                stationTarget,
                                Number(
                                    completedReport.fulfilledUnits
                                    || 0
                                )
                            );
                        completedReport.stationTarget =
                            stationTarget;
                        completedReport.stationTargetFulfilled =
                            stationFulfilled;
                        completedReport.stationTargetMet =
                            stationFulfilled >= stationTarget;
                        completedReport.stationTargetShortfallUnits =
                            Math.max(
                                0,
                                stationTarget - stationFulfilled
                            );
                        if (completedReport.stationTargetMet) {
                            PERSONNEL_STATE.stationsTargetMet++;
                        } else {
                            PERSONNEL_STATE.stationsTargetShort++;
                        }
                        PERSONNEL_STATE.unitsFulfilled +=
                            stationFulfilled;
                    } else {
                        PERSONNEL_STATE.unitsFulfilled +=
                            Number(
                                completedReport.fulfilledUnits
                                || 0
                            );
                    }
                    PERSONNEL_STATE.reports.push(
                        completedReport
                    );
                    PERSONNEL_STATE.completedStations++;
                    PERSONNEL_STATE.checkedVehicles +=
                        completedReport.vehiclesChecked;
                    PERSONNEL_STATE.plannedCount +=
                        completedReport.planned;
                    PERSONNEL_STATE.assignedCount +=
                        completedReport.assigned;
                    PERSONNEL_STATE.trainingShortfall +=
                        completedReport.trainingShortfall;
                    PERSONNEL_STATE.assignmentShortfall +=
                        completedReport.assignmentShortfall;
                    const targetText =
                        isPersonnelPerStationTargetMode()
                            ? (
                                completedReport.stationTargetMet
                                    ? ` | target PASSED ${completedReport.stationTargetFulfilled}/${completedReport.stationTarget}`
                                    : ` | target SHORT ${completedReport.stationTargetFulfilled}/${completedReport.stationTarget}`
                            )
                            : '';
                    personnelLog(
                        `${station.displayName}: vehicles=${completedReport.vehicleCount ?? completedReport.ambulances ?? 0}, units fulfilled=${Number(completedReport.fulfilledUnits || 0)}, qualified=${completedReport.trained}, need training=${completedReport.trainingShortfall}, unfilled=${completedReport.assignmentShortfall}${targetText}.`,
                        (
                            completedReport.trainingShortfall
                            || completedReport.assignmentShortfall
                            || (
                                isPersonnelPerStationTargetMode()
                                && !completedReport.stationTargetMet
                            )
                        )
                            ? 'error'
                            : 'done'
                    );
                } catch (error) {
                    if (
                        PERSONNEL_STATE.stopped
                        && error?.name === 'AbortError'
                    ) {
                        personnelLog(
                            'Active Personnel request cancelled.',
                            'debug'
                        );
                        break;
                    }
                    PERSONNEL_STATE.skippedStations++;
                    completedReport = {
                        stationName: station.displayName,
                        error: error?.message || String(error),
                        vehicleCount: 0,
                        ambulances: 0,
                        required: 0,
                        trained: 0,
                        availableAtScan: 0,
                        availableAtEnd: 0,
                        initialQualifiedFilled: 0,
                        finalQualifiedFilled: 0,
                        initialCriticalFilled: 0,
                        finalCriticalFilled: 0,
                        trainingShortfall: 0,
                        assignmentShortfall: 0,
                        planned: 0,
                        assigned: 0,
                        fulfilledUnits: 0,
                        vehiclesChecked: 0,
                        afterActionVerified: false,
                        verificationError:
                            error?.message || String(error),
                        vehicles: []
                    };
                    if (isPersonnelPerStationTargetMode()) {
                        completedReport.stationTarget =
                            PERSONNEL_STATE.unitsRequired;
                        completedReport.stationTargetFulfilled = 0;
                        completedReport.stationTargetMet = false;
                        completedReport.stationTargetShortfallUnits =
                            PERSONNEL_STATE.unitsRequired;
                        PERSONNEL_STATE.stationsTargetShort++;
                    }
                    PERSONNEL_STATE.reports.push(
                        completedReport
                    );
                    personnelLog(
                        `Skipped ${station.displayName}: ${error?.message || error}`,
                        'error'
                    );
                    personnelDebug(
                        error?.stack || String(error)
                    );
                }
                PERSONNEL_STATE.lastStationReport =
                    completedReport;
                await flushPersonnelTrainingRegistry(true);
                renderPersonnelAfterAction(
                    completedReport
                );
                PERSONNEL_STATE.stationIndex++;
                updatePersonnelCounters();
                buildAndRenderPersonnelReport();
                if (PERSONNEL_STATE.mode === 'single') {
                    scrollPersonnelTo(
                        'mc-personnel-after-action-section'
                    );
                }
                if (!PERSONNEL_STATE.stopped) {
                    await waitPersonnelDelay(
                        PERSONNEL_STATION_GAP_MS
                    );
                }
            }
        } finally {
            PERSONNEL_STATE.running = false;
            PERSONNEL_STATE.paused = false;
            document.querySelector(
                '#mc-personnel-pause'
            ).textContent = 'Pause';
            buildAndRenderPersonnelReport();
            await flushPersonnelTrainingRegistry(true);
            PERSONNEL_TRAINING_REGISTRY_CACHE = null;
            if (PERSONNEL_STATE.stopped) {
                setPersonnelUiValue(
                    'status',
                    'Stopped'
                );
                personnelLog(
                    'Stopped. The reports contain all stations completed before the stop request.',
                    'error'
                );
                return;
            }
            const targetMode =
                isPersonnelPerStationTargetMode();
            const hasTargetShortfall =
                targetMode
                && PERSONNEL_STATE.stationsTargetShort > 0;
            setPersonnelUiValue(
                'status',
                targetMode
                    ? (
                        hasTargetShortfall
                            ? 'Finished - some station targets not met'
                            : 'Finished - every station target met'
                    )
                    : 'Finished - report ready'
            );
            setPersonnelUiValue(
                'progress',
                `${PERSONNEL_STATE.queue.length} / ${PERSONNEL_STATE.queue.length}`
            );
            if (targetMode) {
                personnelLog(
                    `Finished. Target ${PERSONNEL_STATE.unitsRequired} per station: ${PERSONNEL_STATE.stationsTargetMet}/${PERSONNEL_STATE.completedStations} station(s) met; ${PERSONNEL_STATE.stationsTargetShort} short.`,
                    hasTargetShortfall
                        ? 'error'
                        : 'done'
                );
            }
            personnelLog(
                `Finished. Stations ${PERSONNEL_STATE.completedStations}, vehicles ${PERSONNEL_STATE.checkedVehicles}, units fulfilled ${PERSONNEL_STATE.unitsFulfilled}, ${PERSONNEL_STATE.action === 'assign' ? 'assigned' : 'planned'} ${PERSONNEL_STATE.action === 'assign' ? PERSONNEL_STATE.assignedCount : PERSONNEL_STATE.plannedCount}, need training ${PERSONNEL_STATE.trainingShortfall}, unfilled ${PERSONNEL_STATE.assignmentShortfall}.`,
                (
                    hasTargetShortfall
                    || PERSONNEL_STATE.trainingShortfall
                    || PERSONNEL_STATE.assignmentShortfall
                )
                    ? 'error'
                    : 'done'
            );
            if (
                PERSONNEL_STATE.mode === 'single'
                && PERSONNEL_STATE.lastStationReport
            ) {
                scrollPersonnelTo(
                    'mc-personnel-after-action-section'
                );
            }
        }
    }
    function prunePersonnelTrainingRegistry(
        registry,
        now = Date.now(),
        maximumVehicles = PERSONNEL_TRAINING_REGISTRY_MAX_VEHICLES
    ) {
        const sourceVehicles = registry?.vehicles && typeof registry.vehicles === 'object'
            ? registry.vehicles
            : {};
        const cutoff = now - PERSONNEL_TRAINING_REGISTRY_MAX_AGE_MS;
        const validEntries = Object.entries(sourceVehicles)
            .filter(([vehicleId, entry]) => {
                const updatedAt = Number(entry?.updatedAt || 0);
                return Boolean(
                    vehicleId
                    && entry
                    && typeof entry === 'object'
                    && Number.isFinite(updatedAt)
                    && updatedAt >= cutoff
                );
            })
            .sort((left, right) => Number(right[1]?.updatedAt || 0) - Number(left[1]?.updatedAt || 0));
        const retainedEntries = validEntries.slice(0, Math.max(0, Number(maximumVehicles) || 0));
        const vehicles = Object.fromEntries(retainedEntries);
        const originalCount = Object.keys(sourceVehicles).length;
        const retainedCount = retainedEntries.length;
        registry.vehicles = vehicles;
        return {
            originalCount,
            retainedCount,
            removedCount: Math.max(0, originalCount - retainedCount)
        };
    }
    async function savePersonnelTrainingRegistry(registry) {
        await window.NexusPersonnelStore.ready();
        await window.NexusPersonnelStore.write(registry);
        return {saved:true,pruned:0,retained:Object.keys(registry.vehicles||{}).length,quotaRetry:false};
    }
    function createEmptyPersonnelTrainingRegistry() {
        return {
            schemaVersion: PERSONNEL_TRAINING_REGISTRY_SCHEMA_VERSION,
            sourceVersion: PERSONNEL_VERSION,
            updatedAt: 0,
            lastPrunedAt: 0,
            vehicles: {}
        };
    }
    function readPersonnelTrainingRegistry() {
        if (PERSONNEL_TRAINING_REGISTRY_CACHE) {
            return PERSONNEL_TRAINING_REGISTRY_CACHE;
        }
        const emptyRegistry = createEmptyPersonnelTrainingRegistry();
        try {
            const parsed = JSON.parse(
                localStorage.getItem(PERSONNEL_TRAINING_REGISTRY_STORAGE_KEY) || 'null'
            );
            if (!parsed || typeof parsed !== 'object' || typeof parsed.vehicles !== 'object') {
                PERSONNEL_TRAINING_REGISTRY_CACHE = emptyRegistry;
                return PERSONNEL_TRAINING_REGISTRY_CACHE;
            }
            PERSONNEL_TRAINING_REGISTRY_CACHE = {
                ...emptyRegistry,
                ...parsed,
                vehicles: { ...parsed.vehicles }
            };
            prunePersonnelTrainingRegistry(PERSONNEL_TRAINING_REGISTRY_CACHE);
            PERSONNEL_TRAINING_REGISTRY_CACHE.lastPrunedAt = Date.now();
            return PERSONNEL_TRAINING_REGISTRY_CACHE;
        } catch (_error) {
            PERSONNEL_TRAINING_REGISTRY_CACHE = emptyRegistry;
            return PERSONNEL_TRAINING_REGISTRY_CACHE;
        }
    }
    function dispatchPersonnelTrainingRegistryUpdate(eventDetail) {
        if (!eventDetail) return;
        try {
            window.dispatchEvent(new CustomEvent(
                'mc-personnel-training-registry-updated',
                { detail: eventDetail }
            ));
        } catch (_eventError) {}
    }
    async function flushPersonnelTrainingRegistry(silent = false) {
        if (PERSONNEL_REGISTER_PENDING_IDS) return flushPersonnelRegisterChanges(silent);
        if (PERSONNEL_TRAINING_REGISTRY_FLUSH_TIMER != null) {
            clearTimeout(PERSONNEL_TRAINING_REGISTRY_FLUSH_TIMER);
            PERSONNEL_TRAINING_REGISTRY_FLUSH_TIMER = null;
        }
        if (!PERSONNEL_TRAINING_REGISTRY_DIRTY || !PERSONNEL_TRAINING_REGISTRY_CACHE) {
            return { saved: false, pruned: 0, retained: 0, quotaRetry: false };
        }
        try {
            const snapshot = JSON.stringify(PERSONNEL_TRAINING_REGISTRY_CACHE);
            const eventAtSave = PERSONNEL_TRAINING_REGISTRY_PENDING_EVENT;
            const registrySave = await savePersonnelTrainingRegistry(JSON.parse(snapshot));
            if (PERSONNEL_TRAINING_REGISTRY_PENDING_EVENT !== eventAtSave || JSON.stringify(PERSONNEL_TRAINING_REGISTRY_CACHE) !== snapshot) {
                schedulePersonnelTrainingRegistryFlush();
                return registrySave;
            }
            PERSONNEL_TRAINING_REGISTRY_DIRTY = false;
            const pendingEvent = PERSONNEL_TRAINING_REGISTRY_PENDING_EVENT;
            PERSONNEL_TRAINING_REGISTRY_PENDING_EVENT = null;
            dispatchPersonnelTrainingRegistryUpdate(pendingEvent);
            updatePersonnelTrainingRegistryStatus();
            if (!silent) {
                personnelDebug(
                    `Shared training register saved: retained=${registrySave.retained} | pruned=${registrySave.pruned}${registrySave.quotaRetry ? ' | quota retry used' : ''}`
                );
            }
            return registrySave;
        } catch (error) {
            if (!silent) {
                personnelLog(`Shared training register could not be saved: ${error?.message || error}`, 'error');
            }
            return { saved: false, pruned: 0, retained: 0, quotaRetry: false, error };
        }
    }
    function schedulePersonnelTrainingRegistryFlush() {
        // The register builder awaits each station commit; no duplicate timer saves.
        if (PERSONNEL_REGISTER_PENDING_IDS) return;
        if (PERSONNEL_TRAINING_REGISTRY_FLUSH_TIMER != null) return;
        PERSONNEL_TRAINING_REGISTRY_FLUSH_TIMER = setTimeout(() => {
            PERSONNEL_TRAINING_REGISTRY_FLUSH_TIMER = null;
            flushPersonnelTrainingRegistry(false);
        }, PERSONNEL_TRAINING_REGISTRY_FLUSH_DELAY_MS);
    }
    function countPersonnelTrainingCodes(
        assignedPersonnel
    ) {
        const counts = {};
        (
            Array.isArray(
                assignedPersonnel
            )
                ? assignedPersonnel
                : []
        ).forEach(person => {
            const uniqueCodes =
                new Set(
                    (
                        Array.isArray(
                            person?.trainingCodes
                        )
                            ? person.trainingCodes
                            : []
                    )
                        .map(String)
                        .filter(Boolean)
                );
            uniqueCodes.forEach(code => {
                counts[code] =
                    Number(
                        counts[code] ||
                        0
                    ) + 1;
            });
        });
        return counts;
    }
    function getPersonnelAssignedTrainingProfiles(assignedPersonnel) {
        return (Array.isArray(assignedPersonnel) ? assignedPersonnel : [])
            .map(person => Array.from(new Set(
                (Array.isArray(person?.trainingCodes) ? person.trainingCodes : [])
                    .map(String)
                    .filter(Boolean)
            )).sort())
            .filter(profile => Array.isArray(profile));
    }
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
    function publishPersonnelVehicleTrainingRegistry({
        station,
        vehicles,
        personnel,
        source = 'scan',
        pruneMissingVehicles = true
    }) {
        const stationVehicles = Array.isArray(vehicles)
            ? vehicles.filter(vehicle => vehicle?.vehicleId)
            : [];
        if (!stationVehicles.length) return 0;
        const registry = readPersonnelTrainingRegistry();
        const now = Date.now();
        const currentVehicleIds = new Set(
            stationVehicles.map(vehicle => String(vehicle.vehicleId))
        );
        const processedTypeIds = new Set(
            stationVehicles.map(vehicle => String(vehicle.vehicleTypeId || ''))
        );
        if (pruneMissingVehicles) {
            Object.entries(registry.vehicles).forEach(([vehicleId, entry]) => {
                if (String(entry?.stationHref || '') !== String(station?.href || '')) return;
                if (!processedTypeIds.has(String(entry?.vehicleTypeId || ''))) return;
                if (!currentVehicleIds.has(String(vehicleId))) delete registry.vehicles[vehicleId];
            });
        }
        stationVehicles.forEach(vehicle => {
            const vehicleId = String(vehicle.vehicleId);
            const exactVehicleProfileScan =
                String(source || '').startsWith('personnel-register-exact-');
            const assignedPersonnel = exactVehicleProfileScan
                ? (Array.isArray(personnel) ? personnel : []).filter(person => {
                    return String(person?.assignedVehicleId || '') === vehicleId;
                })
                : getPersonnelAssignedToVehicle(personnel, vehicle);
            const assignedTrainingProfiles =
                getPersonnelAssignedTrainingProfiles(assignedPersonnel);
            registry.vehicles[vehicleId] = {
                vehicleId,
                vehicleName: String(vehicle.name || ''),
                vehicleTypeId: String(vehicle.vehicleTypeId || ''),
                stationName: String(station?.displayName || station?.stationName || ''),
                stationHref: String(station?.href || ''),
                assignedPersonnelCount: assignedPersonnel.length,
                assignmentScanComplete: true,
                personnelRowsSeen: Number.isFinite(vehicle.assignmentPersonnelRowsSeen)
                    ? Math.max(0, vehicle.assignmentPersonnelRowsSeen)
                    : (Array.isArray(personnel) ? personnel.length : 0),
                trainingCounts: countPersonnelTrainingCodes(assignedPersonnel),
                trainingCombinationCounts: countPersonnelTrainingCombinations(assignedPersonnel),
                assignedTrainingProfiles,
                trainingProfilesComplete: exactVehicleProfileScan,
                updatedAt: now,
                source: String(source)
            };
            PERSONNEL_REGISTER_PENDING_IDS?.add(vehicleId);
        });
        registry.schemaVersion = PERSONNEL_TRAINING_REGISTRY_SCHEMA_VERSION;
        registry.sourceVersion = PERSONNEL_VERSION;
        registry.updatedAt = now;
        PERSONNEL_TRAINING_REGISTRY_DIRTY = true;
        PERSONNEL_TRAINING_REGISTRY_PENDING_EVENT = {
            stationName: station?.displayName || '',
            vehicleCount: stationVehicles.length,
            updatedAt: now
        };
        const finalSnapshot = /final-verification|station-complete/i.test(String(source));
        if (finalSnapshot) flushPersonnelTrainingRegistry(false);
        else schedulePersonnelTrainingRegistryFlush();
        personnelDebug(
            `Shared training register cache updated: ${stationVehicles.length} vehicle(s) at ${station?.displayName || 'station'} | source=${source}${finalSnapshot ? ' | flushed' : ' | write queued'}`
        );
        return stationVehicles.length;
    }
    window.__NEXUS_PERSONNEL_OPERATION_BUSY__ = () => !!(PERSONNEL_STATE.running || PERSONNEL_STATE.registerBuilding || STATE.running || STATION_STATE.running);
    // Shared writer owned by the existing register tool, including its live cache.
    window.__NEXUS_CREW_REGISTER__ = {
        ready() {
            if (PERSONNEL_STATE.running) throw new Error('Finish or stop the personnel/register tool before assigning crew');
            return true;
        },
        async save(snapshot) {
            this.ready();
            await window.NexusPersonnelStore.ready();
            const {vehicleId, vehicleTypeId, buildingId, profiles} = snapshot || {};
            if (![vehicleId, vehicleTypeId, buildingId].every(id => /^\d+$/.test(String(id))) ||
                !Array.isArray(profiles) || profiles.length > 100 ||
                profiles.some(p => !Array.isArray(p) || p.some(code => typeof code !== 'string' || !/^[a-zA-Z0-9_]+$/.test(code)))) {
                throw new Error('Verified crew record is incomplete');
            }
            // Finish pending writes, then merge with the latest saved register.
            if (PERSONNEL_TRAINING_REGISTRY_DIRTY) {
                const pending = await flushPersonnelTrainingRegistry(true);
                if (!pending.saved) throw new Error('Training register could not be saved');
            }
            PERSONNEL_TRAINING_REGISTRY_CACHE = null;
            publishPersonnelVehicleTrainingRegistry({
                station: {href: `/buildings/${buildingId}`, displayName: String(snapshot.stationName || '').slice(0, 256)},
                vehicles: [{vehicleId: String(vehicleId), vehicleTypeId: String(vehicleTypeId), name: String(snapshot.vehicleName || '').slice(0, 256), assignmentPersonnelRowsSeen: snapshot.rowsSeen}],
                personnel: profiles.map(trainingCodes => ({assignedVehicleId: String(vehicleId), trainingCodes})),
                source: 'personnel-register-exact-assign-crew',
                pruneMissingVehicles: false
            });
            const result = await flushPersonnelTrainingRegistry(false);
            if (!result.saved) throw new Error('Crew assigned, but training register could not be saved');
            return true;
        }
    };

    function getPersonnelAssignmentIndex(personnel) {
        if (!Array.isArray(personnel)) {
            return { byVehicleId: new Map(), byVehicleName: new Map() };
        }
        const cached = PERSONNEL_ASSIGNMENT_INDEX_CACHE.get(personnel);
        if (cached) return cached;
        const byVehicleId = new Map();
        const byVehicleName = new Map();
        personnel.forEach(person => {
            const vehicleId = String(person?.assignedVehicleId || '');
            const vehicleName = normalizePersonnelVehicleName(person?.assignedVehicleName || '');
            if (vehicleId) {
                if (!byVehicleId.has(vehicleId)) byVehicleId.set(vehicleId, []);
                byVehicleId.get(vehicleId).push(person);
            }
            if (vehicleName) {
                if (!byVehicleName.has(vehicleName)) byVehicleName.set(vehicleName, []);
                byVehicleName.get(vehicleName).push(person);
            }
        });
        const index = { byVehicleId, byVehicleName };
        PERSONNEL_ASSIGNMENT_INDEX_CACHE.set(personnel, index);
        return index;
    }
    function getPersonnelAssignedToVehicle(personnel, vehicle) {
        if (!Array.isArray(personnel) || !vehicle) return [];
        const index = getPersonnelAssignmentIndex(personnel);
        const vehicleId = String(vehicle.vehicleId || '');
        const vehicleNameKey = normalizePersonnelVehicleName(vehicle.name || '');
        const byId = vehicleId ? (index.byVehicleId.get(vehicleId) || []) : [];
        const byName = vehicleNameKey ? (index.byVehicleName.get(vehicleNameKey) || []) : [];
        if (!byId.length) return byName;
        if (!byName.length || byName === byId) return byId;
        const result = byId.slice();
        const seen = new Set(result.map(person => String(person.personnelId || '')));
        byName.forEach(person => {
            const personnelId = String(person.personnelId || '');
            if (!seen.has(personnelId)) {
                seen.add(personnelId);
                result.push(person);
            }
        });
        return result;
    }
    async function processOnePersonnelStation(station) {
        await window.NexusPersonnelStore.ready();
        const profile = getPersonnelProfileDefinition();
        if (
            profile?.engine === 'police'
            || profile?.engine === 'personnel-rules'
        ) {
            return processOnePoliceStation(station, profile);
        }
        if (nexusPersonnelCrewChoice()) return processOnePoliceStation(station, {...profile, rules:[makePoliceRule({
            id:'medical_critical_care_custom',label:'Critical Care',vehicleTypeIds:['5'],vehicleLabel:'Ambulance',
            target:1,trainingAll:['critical_care'],trainingLabel:'Critical Care'
        })]});
        return processOneMedicalCriticalCareStation(station);
    }
    function getPoliceTrainingLabel(
        trainingCode
    ) {
        return (
            PERSONNEL_TRAINING_LABELS[
                String(
                    trainingCode ||
                    ''
                )
            ] ||
            String(
                trainingCode ||
                ''
            )
                .replace(
                    /_/g,
                    ' '
                )
                .replace(
                    /\b\w/g,
                    character =>
                        character
                            .toUpperCase()
                )
        );
    }
    function getPersonnelMissingTrainingForRule(
        person,
        rule
    ) {
        const codes =
            new Set(
                Array.isArray(
                    person?.trainingCodes
                )
                    ? person.trainingCodes
                    : []
            );
        return (
            Array.isArray(
                rule?.trainingAll
            )
                ? rule.trainingAll
                : []
        )
            .filter(
                code =>
                    !codes.has(code)
            )
            .map(
                getPoliceTrainingLabel
            );
    }
    function buildPoliceRuleTrainingGapSummary(
        personnel,
        rule,
        requiredPositions
    ) {
        const required = Math.max(0, Number(requiredPositions) || 0);
        const counts = getVisiblePersonnelTrainingCounts(personnel);
        return (Array.isArray(rule?.trainingAll) ? rule.trainingAll : []).map(code => {
            const visible = Number(counts.get(String(code)) || 0);
            return {
                code: String(code),
                label: getPoliceTrainingLabel(code),
                required,
                visible,
                missing: Math.max(0, required - visible)
            };
        });
    }
    function formatPoliceTrainingGapSummary(
        trainingGaps
    ) {
        const missing =
            (
                Array.isArray(
                    trainingGaps
                )
                    ? trainingGaps
                    : []
            ).filter(
                item =>
                    Number(
                        item?.missing ||
                        0
                    ) >
                    0
            );
        if (!missing.length) {
            return 'None';
        }
        return missing
            .map(
                item =>
                    `${item.label} x${item.missing}`
            )
            .join(', ');
    }
    function formatVehicleOccupantTrainingGaps(
        occupantTrainingGaps
    ) {
        const entries =
            Array.isArray(
                occupantTrainingGaps
            )
                ? occupantTrainingGaps
                : [];
        if (!entries.length) {
            return '';
        }
        return entries
            .map(entry => {
                return (
                    `${entry.name}: ` +
                    `${entry.missingTraining.join(', ')}`
                );
            })
            .join('; ');
    }
    function getPersonnelTrainingSet(person) {
        if (!person || typeof person !== 'object') return new Set();
        const cached = PERSONNEL_TRAINING_SET_CACHE.get(person);
        if (cached) return cached;
        const trainingSet = new Set(
            Array.isArray(person.trainingCodes)
                ? person.trainingCodes.map(String)
                : []
        );
        PERSONNEL_TRAINING_SET_CACHE.set(person, trainingSet);
        return trainingSet;
    }
    function getVisiblePersonnelTrainingCounts(personnel) {
        if (!Array.isArray(personnel)) return new Map();
        const cached = PERSONNEL_VISIBLE_TRAINING_COUNTS_CACHE.get(personnel);
        if (cached) return cached;
        const counts = new Map();
        personnel.forEach(person => {
            getPersonnelTrainingSet(person).forEach(code => {
                counts.set(code, Number(counts.get(code) || 0) + 1);
            });
        });
        PERSONNEL_VISIBLE_TRAINING_COUNTS_CACHE.set(personnel, counts);
        return counts;
    }
    function personnelMatchesRule(person, rule) {
        const requiredCodes = Array.isArray(rule?.trainingAll) ? rule.trainingAll : [];
        if (!requiredCodes.length) return true;
        const trainingSet = getPersonnelTrainingSet(person);
        return requiredCodes.every(code => trainingSet.has(code));
    }
    function sortPersonnelCandidatesForRule(candidates, rule) {
        return candidates.slice().sort((left, right) => {
            const leftReserved = rule.preferWithout.some(code => left.trainingCodes.includes(code)) ? 1 : 0;
            const rightReserved = rule.preferWithout.some(code => right.trainingCodes.includes(code)) ? 1 : 0;
            if (leftReserved !== rightReserved) return leftReserved - rightReserved;
            const extraDifference = left.trainingCodes.length - right.trainingCodes.length;
            if (extraDifference) return extraDifference;
            return String(left.name || '').localeCompare(String(right.name || ''), 'en-GB', { numeric: true });
        });
    }
    function getPersonnelVehicleTypeIdFromRow(row) {
        if (!row) return '';
        const typedElements = [
            row,
            ...row.querySelectorAll(
                '[vehicle_type_id], [data-vehicle-type-id], ' +
                '[vehicle_type], [data-vehicle-type]'
            )
        ];
        const candidates = typedElements.flatMap(element => [
            element.getAttribute?.('vehicle_type_id'),
            element.getAttribute?.('data-vehicle-type-id'),
            element.getAttribute?.('vehicle_type'),
            element.getAttribute?.('data-vehicle-type')
        ]);
        const numericTypeId = candidates
            .map(value => String(value || '').trim())
            .find(value => /^\d+$/.test(value));
        if (numericTypeId) return numericTypeId;
        const typeText = cleanText([
            row.getAttribute?.('vehicle_type_caption'),
            row.getAttribute?.('data-vehicle-type-caption'),
            row.querySelector?.('[vehicle_type_caption]')?.getAttribute?.('vehicle_type_caption'),
            row.querySelector?.('[data-vehicle-type-caption]')?.getAttribute?.('data-vehicle-type-caption'),
            row.querySelector?.('td:nth-child(2)')?.textContent
        ].filter(Boolean).join(' '));
        if (/\b(?:PSU|Police\s+Support\s+Unit)\s+Carrier\b/i.test(typeText)) {
            return '51';
        }
        return '';
    }
    function getPersonnelVehicleQueue(doc, allowedTypeIds) {
        const allowed = new Set((allowedTypeIds || []).map(String));
        const allowAllVehicleTypes = allowed.size === 0;
        const seen = new Set();
        const queue = [];
        for (const row of [...doc.querySelectorAll('#vehicle_table tr')]) {
            const vehicleTypeId = getPersonnelVehicleTypeIdFromRow(row);
            if (!allowAllVehicleTypes && !allowed.has(vehicleTypeId)) continue;
            const vehicleLinks = [...row.querySelectorAll('a[href*="/vehicles/"]')];
            const plainVehicleLink = vehicleLinks.find(link => /^\/vehicles\/\d+\/?(?:[?#].*)?$/.test(link.getAttribute('href') || ''));
            const editLink = vehicleLinks.find(link => /\/vehicles\/\d+\/edit(?:[/?#]|$)/.test(link.getAttribute('href') || ''));
            const directAssignmentLink = vehicleLinks.find(link => /\/vehicles\/\d+\/zuweisung(?:[/?#]|$)/.test(link.getAttribute('href') || ''));
            const vehicleId = [plainVehicleLink, editLink, directAssignmentLink]
                .map(link => getVehicleIdFromHref(link?.getAttribute('href') || ''))
                .find(Boolean) || '';
            if (!vehicleId || seen.has(vehicleId)) continue;
            seen.add(vehicleId);
            const occupancy = parsePersonnelVehicleOccupancy(row);
            const nameSource = plainVehicleLink || vehicleLinks.find(link => cleanText(link.textContent || ''));
            queue.push({
                vehicleId,
                vehicleTypeId,
                name: cleanText(nameSource?.textContent || row.textContent || '') || `${TYPE_ID_TO_VEHICLE_TYPE[vehicleTypeId] || 'Vehicle'} ${vehicleId}`,
                assignmentHref: directAssignmentLink?.getAttribute('href') || `/vehicles/${vehicleId}/zuweisung`,
                assignedCount: occupancy.assignedCount,
                maxCount: occupancy.maxCount
            });
        }
        queue.sort((left, right) => left.name.localeCompare(right.name, 'en-GB', { numeric: true, sensitivity: 'base' }));
        return queue;
    }
    function sortPersonnelVehiclesForStationTarget(
        vehicles,
        personnel,
        rule
    ) {
        return (
            Array.isArray(vehicles)
                ? vehicles.slice()
                : []
        ).sort((left, right) => {
            const getState = vehicle => {
                const assigned =
                    getPersonnelAssignedToVehicle(
                        personnel,
                        vehicle
                    );
                const qualified =
                    assigned.filter(
                        person =>
                            personnelMatchesRule(
                                person,
                                rule
                            )
                    ).length;
                const total = assigned.length;
                const capacity =
                    Math.max(
                        rule.target,
                        Number(vehicle.maxCount)
                        || rule.target
                    );
                return {
                    covered:
                        qualified >= rule.target,
                    qualified,
                    total,
                    seatsAvailable:
                        Math.max(
                            0,
                            capacity - total
                        )
                };
            };
            const leftState = getState(left);
            const rightState = getState(right);
            const leftRank =
                leftState.covered
                    ? 0
                    : leftState.seatsAvailable > 0
                        ? 1
                        : 2;
            const rightRank =
                rightState.covered
                    ? 0
                    : rightState.seatsAvailable > 0
                        ? 1
                        : 2;
            if (leftRank !== rightRank) {
                return leftRank - rightRank;
            }
            if (
                leftState.qualified
                !== rightState.qualified
            ) {
                return (
                    rightState.qualified
                    - leftState.qualified
                );
            }
            if (leftState.total !== rightState.total) {
                return leftState.total - rightState.total;
            }
            return String(
                left.name || ''
            ).localeCompare(
                String(right.name || ''),
                'en-GB',
                { numeric: true }
            );
        });
    }
    function selectPoliceRuleVehicles({ rule, allVehicles, personnel, reservedPersonnelIds, claimedVehicleIds, batch }) {
        const fixedVehicleIds = Array.isArray(rule.fixedVehicleIds)
            ? new Set(rule.fixedVehicleIds.map(String))
            : null;
        const matchingVehicles = allVehicles.filter(vehicle =>
            rule.vehicleTypeIds.includes(vehicle.vehicleTypeId)
            && (!fixedVehicleIds || fixedVehicleIds.has(vehicle.vehicleId))
            && !claimedVehicleIds.has(vehicle.vehicleId)
        );
        if (!batch || !rule.sharedVehiclePool) return matchingVehicles;
        const existing = matchingVehicles.filter(vehicle =>
            getPersonnelAssignedToVehicle(personnel, vehicle).some(person => personnelMatchesRule(person, rule))
        );
        const existingIds = new Set(existing.map(vehicle => vehicle.vehicleId));
        const availableCount = personnel.filter(person =>
            person.available
            && !reservedPersonnelIds.has(person.personnelId)
            && personnelMatchesRule(person, rule)
        ).length;
        const additionalVehicleCount = Math.ceil(availableCount / Math.max(1, rule.target));
        const additional = matchingVehicles
            .filter(vehicle => !existingIds.has(vehicle.vehicleId))
            .sort((left, right) => {
                const leftOccupied = Number.isInteger(left.assignedCount) ? left.assignedCount : 0;
                const rightOccupied = Number.isInteger(right.assignedCount) ? right.assignedCount : 0;
                if (leftOccupied !== rightOccupied) return leftOccupied - rightOccupied;
                return left.name.localeCompare(right.name, 'en-GB', { numeric: true });
            })
            .slice(0, additionalVehicleCount);
        return [...existing, ...additional];
    }
    function getPersonnelBuildingVehicleApiRecords(payload) {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.vehicles)) return payload.vehicles;
        if (Array.isArray(payload?.result)) return payload.result;
        if (Array.isArray(payload?.data)) return payload.data;
        return [];
    }
    function getPersonnelApiVehicleId(record) {
        return String(record?.id ?? record?.vehicle_id ?? '').trim();
    }
    function getPersonnelApiVehicleTypeId(record) {
        return String(
            record?.vehicle_type
            ?? record?.vehicle_type_id
            ?? ''
        ).trim();
    }
    function getPersonnelApiTractiveVehicleId(record) {
        const value =
            record?.tractive_vehicle_id
            ?? record?.tractiveVehicleId
            ?? '';
        if (value === 0 || value === '0') return '';
        return String(value).trim();
    }
    function isPersonnelApiTractiveRandom(record) {
        const value =
            record?.tractive_random
            ?? record?.tractiveRandom;
        return value === true || value === 1 || value === '1';
    }
    async function resolvePersonnelCompanionVehicleIds(station, rules, allVehicles) {
        const companionRules = rules.filter(rule =>
            Array.isArray(rule.companionVehicleTypeIds)
            && rule.companionVehicleTypeIds.length
        );
        const resolvedByRuleId = new Map();
        if (!companionRules.length) return resolvedByRuleId;
        const buildingId = String(
            station?.buildingId
            || getBuildingIdFromHref(station?.href || '')
            || ''
        );
        if (!/^\d+$/.test(buildingId)) {
            personnelLog('Companion-vehicle lookup skipped: the station building ID is unavailable.', 'error');
            companionRules.forEach(rule => resolvedByRuleId.set(rule.id, new Set()));
            return resolvedByRuleId;
        }
        let records = [];
        try {
            const response = await personnelFetchResponse(
                `/api/buildings/${buildingId}/vehicles`,
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                },
                14000
            );
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            records = getPersonnelBuildingVehicleApiRecords(
                await response.json()
            );
            if (!records.length) {
                throw new Error('the vehicle API returned no records');
            }
        } catch (error) {
            personnelLog(
                `Companion-vehicle lookup failed at ${station.displayName}: ${error?.message || error}. Trailer and pod profiles were skipped safely.`,
                'error'
            );
            companionRules.forEach(rule => resolvedByRuleId.set(rule.id, new Set()));
            return resolvedByRuleId;
        }
        const stationTargetVehicleIds = new Set(
            allVehicles.map(vehicle => String(vehicle.vehicleId))
        );
        const recordById = new Map(
            records
                .map(record => [getPersonnelApiVehicleId(record), record])
                .filter(([vehicleId]) => vehicleId)
        );
        companionRules.forEach(rule => {
            const targetTypeIds = new Set(rule.vehicleTypeIds.map(String));
            const companionTypeIds = new Set(
                rule.companionVehicleTypeIds.map(String)
            );
            const targetRecords = records.filter(record => {
                const vehicleId = getPersonnelApiVehicleId(record);
                return stationTargetVehicleIds.has(vehicleId)
                    && targetTypeIds.has(getPersonnelApiVehicleTypeId(record));
            });
            const companionRecords = records.filter(record =>
                companionTypeIds.has(getPersonnelApiVehicleTypeId(record))
            );
            const targetIds = new Set(
                targetRecords.map(getPersonnelApiVehicleId)
            );
            const companionIds = new Set(
                companionRecords.map(getPersonnelApiVehicleId)
            );
            const linkedTargetIds = new Set();
            const companionHasConflictingExplicitLink =
                companionRecords.some(companion => {
                    if (isPersonnelApiTractiveRandom(companion)) return false;
                    const tractiveVehicleId =
                        getPersonnelApiTractiveVehicleId(companion);
                    return Boolean(tractiveVehicleId)
                        && !targetIds.has(tractiveVehicleId);
                });
            const targetHasConflictingExplicitLink =
                targetRecords.some(target => {
                    if (isPersonnelApiTractiveRandom(target)) return false;
                    const companionVehicleId =
                        getPersonnelApiTractiveVehicleId(target);
                    return Boolean(companionVehicleId)
                        && !companionIds.has(companionVehicleId);
                });
            companionRecords.forEach(companion => {
                if (isPersonnelApiTractiveRandom(companion)) return;
                const tractiveVehicleId =
                    getPersonnelApiTractiveVehicleId(companion);
                if (targetIds.has(tractiveVehicleId)) {
                    linkedTargetIds.add(tractiveVehicleId);
                }
            });
            targetRecords.forEach(target => {
                if (isPersonnelApiTractiveRandom(target)) return;
                const companionVehicleId =
                    getPersonnelApiTractiveVehicleId(target);
                if (companionIds.has(companionVehicleId)) {
                    linkedTargetIds.add(getPersonnelApiVehicleId(target));
                }
            });
            if (
                !linkedTargetIds.size
                && targetRecords.length === 1
                && companionRecords.length === 1
                && !companionHasConflictingExplicitLink
                && !targetHasConflictingExplicitLink
            ) {
                linkedTargetIds.add(
                    getPersonnelApiVehicleId(targetRecords[0])
                );
                personnelDebug(
                    `${rule.label}: resolved the only eligible ${rule.vehicleLabel} and companion at ${station.displayName}.`
                );
            }
            resolvedByRuleId.set(rule.id, linkedTargetIds);
            if (!linkedTargetIds.size) {
                const reason = !companionRecords.length
                    ? `no companion type ${[...companionTypeIds].join('/')}`
                    : !targetRecords.length
                        ? `no eligible towing type ${[...targetTypeIds].join('/')}`
                        : 'the trailer-to-tractor relationship is ambiguous';
                personnelLog(
                    `${rule.label}: ${reason} at ${station.displayName}; no vehicle was assigned by this rule.`,
                    'info'
                );
            } else {
                personnelDebug(
                    `${rule.label}: resolved ${linkedTargetIds.size} linked towing vehicle(s) from ${companionRecords.length} companion vehicle(s).`
                );
            }
            linkedTargetIds.forEach(vehicleId => {
                if (!recordById.has(vehicleId)) linkedTargetIds.delete(vehicleId);
            });
        });
        return resolvedByRuleId;
    }
    function mergePersonnelRulesByVehicle(rules, allVehicles) {
        const mergedRules = [];
        allVehicles.forEach(vehicle => {
            const applicableRules = rules.filter(rule => {
                if (!rule.vehicleTypeIds.includes(vehicle.vehicleTypeId)) {
                    return false;
                }
                if (!Array.isArray(rule.fixedVehicleIds)) return true;
                return rule.fixedVehicleIds.map(String).includes(vehicle.vehicleId);
            });
            if (!applicableRules.length) return;
            const trainingAll = [...new Set(
                applicableRules.flatMap(rule => rule.trainingAll)
            )];
            const labels = [...new Set(
                applicableRules.map(rule => rule.label)
            )];
            const trainingLabels = trainingAll.map(code =>
                PERSONNEL_TRAINING_LABELS[code] || code
            );
            const sourceRuleIds = applicableRules.map(rule => rule.id);
            mergedRules.push(Object.freeze({
                id: `personnel_vehicle_${vehicle.vehicleId}_${sourceRuleIds.join('_')}`,
                label: labels.join(' + '),
                vehicleTypeIds: [vehicle.vehicleTypeId],
                companionVehicleTypeIds: [],
                fixedVehicleIds: [vehicle.vehicleId],
                vehicleLabel: vehicle.name || applicableRules[0].vehicleLabel,
                target: Math.max(...applicableRules.map(rule => rule.target)),
                trainingAll,
                trainingLabel: trainingLabels.join(' + '),
                preferWithout: [...new Set(
                    applicableRules.flatMap(rule => rule.preferWithout || [])
                )].filter(code => !trainingAll.includes(code)),
                sharedVehiclePool: false,
                sourceRuleIds
            }));
        });
        return mergedRules;
    }
    async function preparePersonnelRulesForStation(station, profile, configuredRules, allVehicles) {
        const companionVehicleIds =
            await resolvePersonnelCompanionVehicleIds(
                station,
                configuredRules,
                allVehicles
            );
        const resolvedRules = configuredRules.flatMap(rule => {
            if (!rule.companionVehicleTypeIds?.length) return [rule];
            const fixedVehicleIds = [
                ...(companionVehicleIds.get(rule.id) || [])
            ];
            return fixedVehicleIds.length
                ? [{ ...rule, fixedVehicleIds }]
                : [];
        });
        if (profile.mergeOverlappingVehicleRules === true) {
            return nexusPersonnelRulesWithTargets(mergePersonnelRulesByVehicle(
                resolvedRules,
                allVehicles
            ), allVehicles);
        }
        return nexusPersonnelRulesWithTargets(resolvedRules, allVehicles);
    }
    function calculatePersonnelQualificationShortfall(personnel, slotRules) {
        const people = (personnel || []).filter(person => person?.personnelId);
        const slots = Array.isArray(slotRules) ? slotRules : [];
        const personToSlot = new Map();
        const candidatesByRule = new Map();
        const getCandidates = rule => {
            if (!candidatesByRule.has(rule)) {
                candidatesByRule.set(
                    rule,
                    people.filter(person => personnelMatchesRule(person, rule))
                );
            }
            return candidatesByRule.get(rule);
        };
        const tryFillSlot = (slotIndex, seenPersonnel) => {
            const rule = slots[slotIndex];
            for (const person of getCandidates(rule)) {
                if (seenPersonnel.has(person.personnelId)) continue;
                seenPersonnel.add(person.personnelId);
                const previousSlot = personToSlot.get(person.personnelId);
                if (previousSlot === undefined || tryFillSlot(previousSlot, seenPersonnel)) {
                    personToSlot.set(person.personnelId, slotIndex);
                    return true;
                }
            }
            return false;
        };
        let matched = 0;
        for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
            if (tryFillSlot(slotIndex, new Set())) matched++;
        }
        return Math.max(0, slots.length - matched);
    }
    async function processOnePoliceStation(station, profile) {
        const serviceLabel =
            String(
                getPersonnelServiceDefinition()?.label
                || 'Personnel'
            );
        const serviceSourceLabel =
            serviceLabel
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
            || 'personnel';
        const stationPage = await personnelFetchDocument(station.href, 14000);
        const configuredRules = Array.isArray(profile.rules) ? profile.rules : [];
        const targetTypeIds = [...new Set(configuredRules.flatMap(rule => rule.vehicleTypeIds))];
        const allVehicles = getPersonnelVehicleQueue(stationPage.doc, targetTypeIds);
        if (!allVehicles.length) {
            personnelLog(`No vehicles mapped to the selected ${serviceLabel} profile were found at this station.`, 'debug');
            return {
                stationName: station.displayName,
                stationHref: station.href,
                profileLabel: profile.label,
                noTargetVehicles: true,
                vehicleCount: 0,
                ambulances: 0,
                required: 0,
                trained: 0,
                availableAtScan: 0,
                availableAtEnd: 0,
                initialQualifiedFilled: 0,
                finalQualifiedFilled: 0,
                initialCriticalFilled: 0,
                finalCriticalFilled: 0,
                trainingShortfall: 0,
                assignmentShortfall: 0,
                planned: 0,
                assigned: 0,
                fulfilledUnits: 0,
                vehiclesChecked: 0,
                afterActionVerified: true,
                verificationError: '',
                rules: [],
                vehicles: []
            };
        }
        const rules = await preparePersonnelRulesForStation(
            station,
            profile,
            configuredRules,
            allVehicles
        );
        const baselinePage = await personnelFetchDocument(allVehicles[0].assignmentHref, 14000);
        const baselineAssignment = parseVehicleAssignmentPage(baselinePage.doc, allVehicles[0].vehicleId);
        const personnel = baselineAssignment.rows;
        publishPersonnelVehicleTrainingRegistry({
            station,
            vehicles:
                allVehicles,
            personnel,
            source:
                `${serviceSourceLabel}-station-scan`
        });
        const reservedPersonnelIds = new Set();
        const claimedVehicleIds = new Set();
        const vehicleReports = [];
        const ruleReports = [];
        let required = 0;
        let trainingShortfall = 0;
        const qualificationSlots = [];
        let stationPlanned = 0;
        let stationAssigned = 0;
        let stationAssignmentShortfall = 0;
        let projectedFulfilledUnits = 0;
        const stationUnitsNeeded = getPersonnelUnitsRemaining();
        const stationUnitTargetReached = () =>
            Number.isFinite(stationUnitsNeeded)
            && projectedFulfilledUnits >= stationUnitsNeeded;
        const unionQualified = personnel.filter(person => rules.some(rule => personnelMatchesRule(person, rule)));
        const availableAtScan = unionQualified.filter(person => person.available).length;
        personnelLog(`Mapped ${serviceLabel} vehicles at station: ${allVehicles.length}`, 'info');
        personnelLog(`Profile rule groups: ${rules.length} | Qualified personnel visible: ${unionQualified.length}`, 'info');
        if (Number.isFinite(stationUnitsNeeded)) {
            personnelLog(`Units still required before this station: ${stationUnitsNeeded}. Only fully covered vehicles count.`, 'info');
        }
        for (const rule of rules) {
            if (PERSONNEL_STATE.stopped || stationUnitTargetReached()) break;
            await waitIfPersonnelPaused();
            if (PERSONNEL_STATE.stopped || stationUnitTargetReached()) break;
            let ruleVehicles = selectPoliceRuleVehicles({
                rule,
                allVehicles,
                personnel,
                reservedPersonnelIds,
                claimedVehicleIds,
                batch: profile.batch === true
            });
            if (isPersonnelPerStationTargetMode()) {
                ruleVehicles =
                    sortPersonnelVehiclesForStationTarget(
                        ruleVehicles,
                        personnel,
                        rule
                    );
            }
            if (!ruleVehicles.length) {
                personnelDebug(`${rule.label}: no allocated ${rule.vehicleLabel} vehicles at ${station.displayName}.`);
                continue;
            }
            const ruleTrained = personnel.filter(person => personnelMatchesRule(person, rule)).length;
            const ruleReport = {
                ruleId: rule.id,
                label: rule.label,
                vehicleLabel: rule.vehicleLabel,
                target: rule.target,
                trainingLabel: rule.trainingLabel,
                vehicleCount: 0,
                required: 0,
                trained: ruleTrained,
                trainingShortfall: 0,
                trainingGaps: []
            };
            personnelLog(`${rule.label}: ${ruleVehicles.length} available ${rule.vehicleLabel}(s), target ${rule.target} per vehicle.`, 'station');
            for (let vehicleIndex = 0; vehicleIndex < ruleVehicles.length; vehicleIndex++) {
                if (PERSONNEL_STATE.stopped || stationUnitTargetReached()) break;
                await waitIfPersonnelPaused();
                if (PERSONNEL_STATE.stopped || stationUnitTargetReached()) break;
                const vehicle = ruleVehicles[vehicleIndex];
                claimedVehicleIds.add(vehicle.vehicleId);
                ruleReport.vehicleCount++;
                ruleReport.required += rule.target;
                required += rule.target;
                for (let slotIndex = 0; slotIndex < rule.target; slotIndex++) qualificationSlots.push(rule);
                setPersonnelUiValue('vehicle', vehicle.name || vehicle.vehicleId);
                setPersonnelUiValue('status', PERSONNEL_STATE.action === 'assign' ? `Checking ${serviceLabel} vehicle` : `Building ${serviceLabel} preview`);
                personnelLog(`${rule.label} vehicle ${vehicleIndex + 1}/${ruleVehicles.length}: ${vehicle.name}`, 'station');
                const baselineAssigned =
                    getPersonnelAssignedToVehicle(
                        personnel,
                        vehicle
                    );
                let beforeTotal =
                    baselineAssigned.length;
                let beforeQualified =
                    baselineAssigned.filter(
                        person =>
                            personnelMatchesRule(
                                person,
                                rule
                            )
                    ).length;
                let occupantTrainingGaps =
                    baselineAssigned
                        .map(person => {
                            return {
                                name:
                                    String(
                                        person.name ||
                                        person.personnelId ||
                                        'Assigned person'
                                    ),
                                missingTraining:
                                    getPersonnelMissingTrainingForRule(
                                        person,
                                        rule
                                    )
                            };
                        })
                        .filter(
                            entry =>
                                entry
                                    .missingTraining
                                    .length >
                                0
                        );
                const plannedNames = [];
                const assignedNames = [];
                let liveAssignment = null;
                if (PERSONNEL_STATE.action === 'assign' && beforeQualified < rule.target) {
                    const livePage = await personnelFetchDocument(vehicle.assignmentHref, 14000);
                    liveAssignment = parseVehicleAssignmentPage(livePage.doc, vehicle.vehicleId);
                    if (!rule.vehicleTypeIds.includes(liveAssignment.vehicleTypeId)) {
                        personnelLog(`Skipped unexpected vehicle_type_id=${liveAssignment.vehicleTypeId || 'unknown'} for ${rule.label}.`, 'error');
                        const unfilled = Math.max(0, rule.target - beforeQualified);
                        stationAssignmentShortfall += unfilled;
                        vehicleReports.push({
                            vehicleId: vehicle.vehicleId,
                            vehicleTypeId: vehicle.vehicleTypeId,
                            name: vehicle.name,
                            ruleId: rule.id,
                            ruleLabel: rule.label,
                            trainingLabel: rule.trainingLabel,
                            target: rule.target,
                            beforeQualified,
                            beforeCritical: beforeQualified,
                            beforeTotal,
                            afterQualified: beforeQualified,
                            afterCritical: beforeQualified,
                            afterTotal: beforeTotal,
                            finalQualified: beforeQualified,
                            finalCritical: beforeQualified,
                            finalTotal: beforeTotal,
                            plannedNames,
                            assignedNames,
                            unfilled,
                            occupiedSeatBlock: 0,
                            verificationStatus: 'skipped'
                        });
                        continue;
                    }
                    beforeTotal = liveAssignment.totalAssigned.length;
                    beforeQualified = liveAssignment.totalAssigned.filter(person => personnelMatchesRule(person, rule)).length;
                }
                if (beforeQualified >= rule.target) {
                    personnelLog(`Already covered: ${beforeQualified}/${rule.target} ${rule.trainingLabel}.`, 'done');
                } else {
                    const seatCapacity = Math.max(rule.target, Number(vehicle.maxCount) || rule.target);
                    const seatsAvailable = Math.max(0, seatCapacity - beforeTotal);
                    const targetGap = Math.max(0, rule.target - beforeQualified);
                    const attemptCount = Math.min(targetGap, seatsAvailable);
                    if (!attemptCount && targetGap) {
                        personnelLog(`Cannot top up safely: ${beforeTotal}/${seatCapacity} seats are occupied and ${targetGap} qualified position(s) remain. Existing staff were preserved.`, 'error');
                    }
                    const sourceRows = PERSONNEL_STATE.action === 'assign' ? (liveAssignment?.rows || []) : personnel;
                    const candidates = sortPersonnelCandidatesForRule(
                        sourceRows.filter(person =>
                            person.available
                            && !reservedPersonnelIds.has(person.personnelId)
                            && personnelMatchesRule(person, rule)
                        ),
                        rule
                    ).slice(0, attemptCount);
                    candidates.forEach(person => reservedPersonnelIds.add(person.personnelId));
                    if (PERSONNEL_STATE.action === 'preview') {
                        candidates.forEach(person => plannedNames.push(person.name));
                        stationPlanned += candidates.length;
                        if (candidates.length) personnelLog(`Would assign: ${candidates.map(person => person.name).join(', ')}`, 'after');
                    } else {
                        const submittedCandidates = [];
                        for (const candidate of candidates) {
                            if (PERSONNEL_STATE.stopped) break;
                            await waitIfPersonnelPaused();
                            if (PERSONNEL_STATE.stopped) break;
                            personnelLog(`Assigning ${candidate.name} to ${vehicle.name}...`, 'after');
                            if (await submitPersonnelAssignment(candidate)) {
                                submittedCandidates.push(candidate);
                                personnelLog(`Assignment submitted: ${candidate.name}`, 'info');
                            } else {
                                personnelLog(`Assignment request failed: ${candidate.name}`, 'error');
                            }
                        }
                        if (submittedCandidates.length && !PERSONNEL_STATE.stopped) {
                            await waitPersonnelDelay(250);
                            const verificationPage = await personnelFetchDocument(vehicle.assignmentHref, 14000);
                            const verification = parseVehicleAssignmentPage(verificationPage.doc, vehicle.vehicleId);
                            publishPersonnelVehicleTrainingRegistry({
                                station,
                                vehicles:
                                    allVehicles,
                                personnel:
                                    verification.rows,
                                source:
                                    `${serviceSourceLabel}-vehicle-verification`
                            });
                            const verifiedIds = new Set(
                                verification.rows
                                    .filter(person => person.assignedHere && personnelMatchesRule(person, rule))
                                    .map(person => person.personnelId)
                            );
                            submittedCandidates.forEach(candidate => {
                                if (verifiedIds.has(candidate.personnelId)) {
                                    assignedNames.push(candidate.name);
                                    stationAssigned++;
                                    personnelLog(`Assigned and verified: ${candidate.name}`, 'done');
                                } else {
                                    personnelLog(`Assignment could not be verified: ${candidate.name}`, 'error');
                                }
                            });
                        }
                    }
                }
                const addedCount = PERSONNEL_STATE.action === 'preview' ? plannedNames.length : assignedNames.length;
                const afterQualified = Math.min(rule.target, beforeQualified + addedCount);
                const afterTotal = beforeTotal + addedCount;
                const unfilled = Math.max(0, rule.target - afterQualified);
                const seatCapacity = Math.max(rule.target, Number(vehicle.maxCount) || rule.target);
                const occupiedSeatBlock = Math.max(0, Math.min(rule.target - beforeQualified, Math.max(0, beforeTotal - beforeQualified) - Math.max(0, seatCapacity - rule.target)));
                stationAssignmentShortfall += unfilled;
                personnelLog(unfilled ? `Unfilled ${rule.trainingLabel} positions: ${unfilled}` : `Coverage complete: ${afterQualified}/${rule.target}`, unfilled ? 'error' : 'done');
                vehicleReports.push({
                    vehicleId: vehicle.vehicleId,
                    vehicleTypeId: vehicle.vehicleTypeId,
                    name: vehicle.name,
                    ruleId: rule.id,
                    ruleLabel: rule.label,
                    trainingLabel: rule.trainingLabel,
                    target: rule.target,
                    beforeQualified,
                    beforeCritical: beforeQualified,
                    beforeTotal,
                    afterQualified,
                    afterCritical: afterQualified,
                    afterTotal,
                    finalQualified: afterQualified,
                    finalCritical: afterQualified,
                    finalTotal: afterTotal,
                    plannedNames,
                    assignedNames,
                    unfilled,
                    occupiedSeatBlock,
                    occupantTrainingGaps,
                    verificationStatus: PERSONNEL_STATE.action === 'preview' ? 'projected' : 'individually-verified'
                });
                if (unfilled === 0) {
                    projectedFulfilledUnits++;
                    personnelLog(
                        Number.isFinite(stationUnitsNeeded)
                            ? `Unit target progress at this station: ${projectedFulfilledUnits}/${stationUnitsNeeded}.`
                            : `Fully covered units at this station: ${projectedFulfilledUnits}.`,
                        'done'
                    );
                }
            }
            if (ruleReport.vehicleCount) {
                ruleReport.trainingShortfall =
                    Math.max(
                        0,
                        ruleReport.required -
                        ruleTrained
                    );
                ruleReport.trainingGaps =
                    buildPoliceRuleTrainingGapSummary(
                        personnel,
                        rule,
                        ruleReport.required
                    );
                ruleReports.push(
                    ruleReport
                );
                if (ruleReport.trainingShortfall) {
                    personnelLog(
                        `${rule.label} training shortfall estimate for processed units: ${ruleReport.trainingShortfall}. Missing: ${formatPoliceTrainingGapSummary(ruleReport.trainingGaps)}.`,
                        'error'
                    );
                }
            }
        }
        let afterActionVerified = PERSONNEL_STATE.action === 'preview';
        let verificationError = '';
        let availableAtEnd = Math.max(0, availableAtScan - (PERSONNEL_STATE.action === 'preview' ? stationPlanned : stationAssigned));
        if (PERSONNEL_STATE.action === 'assign' && !PERSONNEL_STATE.stopped && vehicleReports.length) {
            setPersonnelUiValue('status', `Final ${serviceLabel} station verification`);
            setPersonnelUiValue('vehicle', `All mapped ${serviceLabel} vehicles`);
            personnelLog(`Running final station-wide ${serviceLabel} verification...`, 'info');
            try {
                await waitPersonnelDelay(900);
                const finalPage = await personnelFetchDocument(allVehicles[0].assignmentHref, 14000);
                const finalAssignment = parseVehicleAssignmentPage(finalPage.doc, allVehicles[0].vehicleId);
                publishPersonnelVehicleTrainingRegistry({
                    station,
                    vehicles:
                        allVehicles,
                    personnel:
                        finalAssignment.rows,
                    source:
                        `${serviceSourceLabel}-final-verification`
                });
                availableAtEnd = finalAssignment.rows.filter(person => person.available && rules.some(rule => personnelMatchesRule(person, rule))).length;
                stationAssignmentShortfall = 0;
                vehicleReports.forEach(vehicleReport => {
                    const rule = rules.find(item => item.id === vehicleReport.ruleId);
                    const actualAssigned = getPersonnelAssignedToVehicle(finalAssignment.rows, vehicleReport);
                    const actualQualified = rule ? actualAssigned.filter(person => personnelMatchesRule(person, rule)).length : 0;
                    vehicleReport.afterQualified = actualQualified;
                    vehicleReport.afterCritical = actualQualified;
                    vehicleReport.finalQualified = actualQualified;
                    vehicleReport.finalCritical = actualQualified;
                    vehicleReport.afterTotal = actualAssigned.length;
                    vehicleReport.finalTotal = actualAssigned.length;
                    vehicleReport.unfilled =
                        Math.max(
                            0,
                            vehicleReport.target -
                            actualQualified
                        );
                    vehicleReport.occupantTrainingGaps =
                        rule
                            ? actualAssigned
                                .map(person => {
                                    return {
                                        name:
                                            String(
                                                person.name ||
                                                person.personnelId ||
                                                'Assigned person'
                                            ),
                                        missingTraining:
                                            getPersonnelMissingTrainingForRule(
                                                person,
                                                rule
                                            )
                                    };
                                })
                                .filter(
                                    entry =>
                                        entry
                                            .missingTraining
                                            .length >
                                        0
                                )
                            : [];
                    vehicleReport.verificationStatus = 'final-verified';
                    stationAssignmentShortfall += vehicleReport.unfilled;
                });
                afterActionVerified = true;
                personnelLog(`Final ${serviceLabel} station verification passed. Unfilled positions: ${stationAssignmentShortfall}.`, stationAssignmentShortfall ? 'error' : 'done');
            } catch (error) {
                verificationError = error?.message || String(error);
                vehicleReports.forEach(vehicleReport => {
                    if (vehicleReport.verificationStatus !== 'skipped') vehicleReport.verificationStatus = 'individual-verification-only';
                });
                personnelLog(`Final ${serviceLabel} station verification failed: ${verificationError}`, 'error');
            }
        }
        trainingShortfall = calculatePersonnelQualificationShortfall(personnel, qualificationSlots);
        let initialQualifiedFilled = vehicleReports.reduce((sum, vehicle) => sum + Number(vehicle.beforeQualified || 0), 0);
        let finalQualifiedFilled = vehicleReports.reduce((sum, vehicle) => sum + Number(vehicle.afterQualified || 0), 0);
        let fulfilledUnits = vehicleReports.filter(vehicle => Number(vehicle.unfilled || 0) === 0).length;
        const stationTarget =
            isPersonnelPerStationTargetMode()
                ? PERSONNEL_STATE.unitsRequired
                : 0;
        if (stationTarget > 0) {
            fulfilledUnits =
                Math.min(
                    stationTarget,
                    fulfilledUnits
                );
            if (rules.length === 1) {
                const targetPositions =
                    stationTarget * rules[0].target;
                required = targetPositions;
                trainingShortfall =
                    Math.max(
                        0,
                        targetPositions - unionQualified.length
                    );
                stationAssignmentShortfall =
                    Math.max(
                        0,
                        (
                            stationTarget - fulfilledUnits
                        ) * rules[0].target
                    );
                initialQualifiedFilled =
                    Math.min(
                        targetPositions,
                        initialQualifiedFilled
                    );
                finalQualifiedFilled =
                    Math.min(
                        targetPositions,
                        finalQualifiedFilled
                    );
            }
        }
        return {
            stationName: station.displayName,
            stationHref: station.href,
            personnelPageHref: baselinePage.href,
            profileLabel: profile.label,
            qualificationLabel: profile.batch ? `Mapped ${serviceLabel} qualifications` : (rules[0]?.trainingLabel || profile.label),
            vehicleCount: vehicleReports.length,
            ambulances: vehicleReports.length,
            required,
            trained: unionQualified.length,
            availableAtScan,
            availableAtEnd,
            initialQualifiedFilled,
            finalQualifiedFilled,
            initialCriticalFilled: initialQualifiedFilled,
            finalCriticalFilled: finalQualifiedFilled,
            trainingShortfall,
            assignmentShortfall: stationAssignmentShortfall,
            planned: stationPlanned,
            assigned: stationAssigned,
            fulfilledUnits,
            stationTarget,
            stationTargetFulfilled:
                stationTarget > 0
                    ? fulfilledUnits
                    : 0,
            stationTargetMet:
                stationTarget > 0
                    ? fulfilledUnits >= stationTarget
                    : null,
            stationTargetShortfallUnits:
                stationTarget > 0
                    ? Math.max(
                        0,
                        stationTarget - fulfilledUnits
                    )
                    : 0,
            vehiclesChecked: vehicleReports.length,
            afterActionVerified,
            verificationError,
            missingTrainingSummary:
                ruleReports
                    .flatMap(
                        ruleReport =>
                            ruleReport
                                .trainingGaps ||
                            []
                    ),
            rules: ruleReports,
            vehicles: vehicleReports
        };
    }
    function sortMedicalVehiclesForStationTarget(
        vehicles,
        personnel
    ) {
        return (
            Array.isArray(vehicles)
                ? vehicles.slice()
                : []
        ).sort((left, right) => {
            const getState = vehicle => {
                const assigned =
                    getPersonnelAssignedToVehicle(
                        personnel,
                        vehicle
                    );
                const critical =
                    assigned.filter(
                        person =>
                            person.trainingCodes.includes(
                                PERSONNEL_TRAINING_CODE
                            )
                    ).length;
                const total = assigned.length;
                return {
                    covered:
                        critical >=
                        PERSONNEL_TARGET_PER_VEHICLE,
                    critical,
                    total,
                    seatsAvailable:
                        Math.max(
                            0,
                            PERSONNEL_TARGET_PER_VEHICLE
                            - total
                        )
                };
            };
            const leftState = getState(left);
            const rightState = getState(right);
            const leftRank =
                leftState.covered
                    ? 0
                    : leftState.seatsAvailable > 0
                        ? 1
                        : 2;
            const rightRank =
                rightState.covered
                    ? 0
                    : rightState.seatsAvailable > 0
                        ? 1
                        : 2;
            if (leftRank !== rightRank) {
                return leftRank - rightRank;
            }
            if (
                leftState.critical
                !== rightState.critical
            ) {
                return (
                    rightState.critical
                    - leftState.critical
                );
            }
            return String(
                left.name || ''
            ).localeCompare(
                String(right.name || ''),
                'en-GB',
                { numeric: true }
            );
        });
    }
    async function processOneMedicalCriticalCareStation(station) {
        const stationPage = await personnelFetchDocument(station.href, 14000);
        const vehicles = getPersonnelAmbulanceQueue(stationPage.doc);
        if (!vehicles.length) {
            throw new Error('No Ambulance vehicles were found in the station vehicle table.');
        }
        const baselinePage = await personnelFetchDocument(vehicles[0].assignmentHref, 14000);
        const baselineAssignment = parseVehicleAssignmentPage(baselinePage.doc, vehicles[0].vehicleId);
        if (baselineAssignment.vehicleTypeId !== PERSONNEL_TARGET_VEHICLE_TYPE_ID) {
            throw new Error(`The personnel assignment page was not an Ambulance page (vehicle_type_id=${baselineAssignment.vehicleTypeId || 'unknown'}).`);
        }
        const personnel = baselineAssignment.rows;
        const trained = personnel.filter(person => person.trainingCodes.includes(PERSONNEL_TRAINING_CODE));
        const availableAtScan = trained.filter(person => person.available).length;
        const processingVehicles =
            isPersonnelPerStationTargetMode()
                ? sortMedicalVehiclesForStationTarget(
                    vehicles,
                    personnel
                )
                : vehicles;
        const reservedPersonnelIds = new Set();
        const vehicleReports = [];
        let required = 0;
        let trainingShortfall = 0;
        let stationPlanned = 0;
        let stationAssigned = 0;
        let stationAssignmentShortfall = 0;
        let projectedFulfilledUnits = 0;
        const stationUnitsNeeded = getPersonnelUnitsRemaining();
        const stationUnitTargetReached = () =>
            Number.isFinite(stationUnitsNeeded)
            && projectedFulfilledUnits >= stationUnitsNeeded;
        personnelLog(`Ambulances available: ${vehicles.length}`, 'info');
        personnelLog(`${PERSONNEL_TRAINING_LABEL} trained: ${trained.length} | Available at scan: ${availableAtScan}`, 'info');
        if (Number.isFinite(stationUnitsNeeded)) {
            personnelLog(`Units still required before this station: ${stationUnitsNeeded}. Only Ambulances reaching 2/2 Critical Care count.`, 'info');
        }
        personnelLog(
            PERSONNEL_STATE.action === 'preview'
                ? 'Low-impact preview: station occupancy is cross-checked against one Ambulance personnel page.'
                : 'Fast safe assignment: each Ambulance is read once, assignments are submitted in a small batch, then verified with one vehicle check and one final station-wide check.',
            'debug'
        );
        for (let vehicleIndex = 0; vehicleIndex < processingVehicles.length; vehicleIndex++) {
            if (PERSONNEL_STATE.stopped || stationUnitTargetReached()) break;
            await waitIfPersonnelPaused();
            if (PERSONNEL_STATE.stopped || stationUnitTargetReached()) break;
            const vehicle = processingVehicles[vehicleIndex];
            required += PERSONNEL_TARGET_PER_VEHICLE;
            setPersonnelUiValue('vehicle', vehicle.name || vehicle.vehicleId);
            setPersonnelUiValue('status', PERSONNEL_STATE.action === 'assign' ? 'Checking vehicle' : 'Building station preview');
            personnelLog(`Vehicle ${vehicleIndex + 1}/${processingVehicles.length}: ${vehicle.name || vehicle.vehicleId}`, 'station');
            const stationAssignedPeople = getPersonnelAssignedToVehicle(personnel, vehicle);
            const mappedTotal = stationAssignedPeople.length;
            const mappedCritical = stationAssignedPeople.filter(person => person.trainingCodes.includes(PERSONNEL_TRAINING_CODE)).length;
            const hasTableOccupancy = Number.isInteger(vehicle.assignedCount) && vehicle.assignedCount >= 0;
            let beforeTotal = hasTableOccupancy
                ? Math.min(vehicle.assignedCount, mappedTotal)
                : mappedTotal;
            let beforeCritical = Math.min(mappedCritical, beforeTotal);
            const plannedNames = [];
            const assignedNames = [];
            if (hasTableOccupancy && mappedTotal !== beforeTotal) {
                personnelDebug(
                    `${vehicle.name}: station table occupancy=${vehicle.assignedCount}, `
                    + `personnel snapshot mapped=${mappedTotal}. Initial count set to ${beforeTotal}.`
                );
            }
            if (beforeTotal === 0) beforeCritical = 0;
            let liveAssignment = null;
            if (PERSONNEL_STATE.action === 'assign' && beforeCritical < PERSONNEL_TARGET_PER_VEHICLE && beforeTotal < PERSONNEL_TARGET_PER_VEHICLE) {
                const livePage = await personnelFetchDocument(vehicle.assignmentHref, 14000);
                liveAssignment = parseVehicleAssignmentPage(livePage.doc, vehicle.vehicleId);
                if (liveAssignment.vehicleTypeId !== PERSONNEL_TARGET_VEHICLE_TYPE_ID) {
                    personnelLog(`Skipped non-Ambulance assignment page: vehicle_type_id=${liveAssignment.vehicleTypeId || 'unknown'}`, 'error');
                    const skippedUnfilled = Math.max(0, PERSONNEL_TARGET_PER_VEHICLE - beforeCritical);
                    stationAssignmentShortfall += skippedUnfilled;
                    vehicleReports.push({
                        vehicleId: vehicle.vehicleId,
                        name: vehicle.name || `Vehicle ${vehicle.vehicleId}`,
                        beforeCritical,
                        beforeTotal,
                        finalCritical: beforeCritical,
                        finalTotal: beforeTotal,
                        afterCritical: beforeCritical,
                        afterTotal: beforeTotal,
                        plannedNames,
                        assignedNames,
                        unfilled: skippedUnfilled,
                        occupiedSeatBlock: 0,
                        verificationStatus: 'skipped'
                    });
                    continue;
                }
                beforeCritical = liveAssignment.criticalAssigned.length;
                beforeTotal = liveAssignment.totalAssigned.length;
            }
            if (beforeCritical >= PERSONNEL_TARGET_PER_VEHICLE) {
                personnelLog(`Already covered: ${beforeCritical}/${PERSONNEL_TARGET_PER_VEHICLE} Critical Care staff.`, 'done');
            } else {
                const seatsAvailable = Math.max(0, PERSONNEL_TARGET_PER_VEHICLE - beforeTotal);
                const targetGap = Math.max(0, PERSONNEL_TARGET_PER_VEHICLE - beforeCritical);
                const attemptCount = Math.min(targetGap, seatsAvailable);
                if (seatsAvailable === 0) {
                    personnelLog(`Cannot top up safely: ${beforeTotal}/${PERSONNEL_TARGET_PER_VEHICLE} seats are occupied, but only ${beforeCritical} occupant(s) have Critical Care. Existing staff were preserved.`, 'error');
                }
                if (PERSONNEL_STATE.action === 'preview') {
                    const candidates = trained
                        .filter(person => person.available && !reservedPersonnelIds.has(person.personnelId))
                        .slice(0, attemptCount);
                    candidates.forEach(person => {
                        reservedPersonnelIds.add(person.personnelId);
                        plannedNames.push(person.name);
                    });
                    stationPlanned += candidates.length;
                    if (candidates.length) {
                        personnelLog(`Would assign: ${candidates.map(person => person.name).join(', ')}`, 'after');
                    }
                } else {
                    const candidates = (liveAssignment?.availableCritical || [])
                        .filter(person => !reservedPersonnelIds.has(person.personnelId))
                        .slice(0, attemptCount);
                    const submittedCandidates = [];
                    candidates.forEach(person => reservedPersonnelIds.add(person.personnelId));
                    for (const candidate of candidates) {
                        if (PERSONNEL_STATE.stopped) break;
                        await waitIfPersonnelPaused();
                        if (PERSONNEL_STATE.stopped) break;
                        personnelLog(`Assigning ${candidate.name} to ${vehicle.name || vehicle.vehicleId}...`, 'after');
                        const submitted = await submitPersonnelAssignment(candidate);
                        if (submitted) {
                            submittedCandidates.push(candidate);
                            personnelLog(`Assignment submitted: ${candidate.name}`, 'info');
                        } else {
                            personnelLog(`Assignment request failed: ${candidate.name}`, 'error');
                        }
                    }
                    if (submittedCandidates.length && !PERSONNEL_STATE.stopped) {
                        await waitPersonnelDelay(250);
                        const verificationPage = await personnelFetchDocument(vehicle.assignmentHref, 14000);
                        const verification = parseVehicleAssignmentPage(verificationPage.doc, vehicle.vehicleId);
                        const verifiedIds = new Set(
                            verification.rows
                                .filter(person => person.assignedHere)
                                .map(person => person.personnelId)
                        );
                        submittedCandidates.forEach(candidate => {
                            if (verifiedIds.has(candidate.personnelId)) {
                                assignedNames.push(candidate.name);
                                stationAssigned++;
                                personnelLog(`Assigned and verified: ${candidate.name}`, 'done');
                            } else {
                                personnelLog(`Assignment could not be verified: ${candidate.name}`, 'error');
                            }
                        });
                    }
                }
            }
            const calculatedAfterCritical = PERSONNEL_STATE.action === 'preview'
                ? Math.min(PERSONNEL_TARGET_PER_VEHICLE, beforeCritical + plannedNames.length)
                : Math.min(PERSONNEL_TARGET_PER_VEHICLE, beforeCritical + assignedNames.length);
            const calculatedAfterTotal = PERSONNEL_STATE.action === 'preview'
                ? beforeTotal + plannedNames.length
                : beforeTotal + assignedNames.length;
            const calculatedUnfilled = Math.max(0, PERSONNEL_TARGET_PER_VEHICLE - calculatedAfterCritical);
            stationAssignmentShortfall += calculatedUnfilled;
            if (calculatedUnfilled) {
                personnelLog(`Unfilled Critical Care positions: ${calculatedUnfilled}`, 'error');
            } else {
                personnelLog(`Coverage complete: ${calculatedAfterCritical}/${PERSONNEL_TARGET_PER_VEHICLE}`, 'done');
            }
            vehicleReports.push({
                vehicleId: vehicle.vehicleId,
                name: vehicle.name || `Vehicle ${vehicle.vehicleId}`,
                beforeCritical,
                beforeTotal,
                finalCritical: calculatedAfterCritical,
                finalTotal: calculatedAfterTotal,
                afterCritical: calculatedAfterCritical,
                afterTotal: calculatedAfterTotal,
                plannedNames,
                assignedNames,
                unfilled: calculatedUnfilled,
                occupiedSeatBlock: Math.max(0, (PERSONNEL_TARGET_PER_VEHICLE - beforeCritical) - Math.max(0, PERSONNEL_TARGET_PER_VEHICLE - beforeTotal)),
                verificationStatus: PERSONNEL_STATE.action === 'preview' ? 'projected' : 'individually-verified'
            });
            if (calculatedUnfilled === 0) {
                projectedFulfilledUnits++;
                personnelLog(
                    Number.isFinite(stationUnitsNeeded)
                        ? `Unit target progress at this station: ${projectedFulfilledUnits}/${stationUnitsNeeded}.`
                        : `Fully covered Ambulances at this station: ${projectedFulfilledUnits}.`,
                    'done'
                );
            }
        }
        trainingShortfall = Math.max(0, required - trained.length);
        if (trainingShortfall) {
            personnelLog(`Training shortfall for processed Ambulances: ${trainingShortfall} additional personnel need ${PERSONNEL_TRAINING_LABEL} training.`, 'error');
        }
        let afterActionVerified = PERSONNEL_STATE.action === 'preview';
        let verificationError = '';
        let availableAtEnd = Math.max(0, availableAtScan - (PERSONNEL_STATE.action === 'preview' ? stationPlanned : stationAssigned));
        if (PERSONNEL_STATE.action === 'assign' && !PERSONNEL_STATE.stopped && vehicleReports.length) {
            setPersonnelUiValue('status', 'Final station verification');
            setPersonnelUiValue('vehicle', 'Processed Ambulances');
            personnelLog('Running final station-wide after-action verification...', 'info');
            try {
                await waitPersonnelDelay(900);
                const finalPage = await personnelFetchDocument(vehicles[0].assignmentHref, 14000);
                const finalAssignment = parseVehicleAssignmentPage(finalPage.doc, vehicles[0].vehicleId);
                if (finalAssignment.vehicleTypeId !== PERSONNEL_TARGET_VEHICLE_TYPE_ID) {
                    throw new Error(`Final verification returned vehicle_type_id=${finalAssignment.vehicleTypeId || 'unknown'}.`);
                }
                availableAtEnd = finalAssignment.availableCritical.length;
                stationAssignmentShortfall = 0;
                vehicleReports.forEach(vehicleReport => {
                    const actualAssigned = getPersonnelAssignedToVehicle(finalAssignment.rows, vehicleReport);
                    const actualCritical = actualAssigned.filter(person => person.trainingCodes.includes(PERSONNEL_TRAINING_CODE)).length;
                    const actualTotal = actualAssigned.length;
                    vehicleReport.afterCritical = actualCritical;
                    vehicleReport.afterTotal = actualTotal;
                    vehicleReport.finalCritical = actualCritical;
                    vehicleReport.finalTotal = actualTotal;
                    vehicleReport.unfilled = Math.max(0, PERSONNEL_TARGET_PER_VEHICLE - actualCritical);
                    vehicleReport.verificationStatus = 'final-verified';
                    stationAssignmentShortfall += vehicleReport.unfilled;
                });
                afterActionVerified = true;
                personnelLog(`Final station verification passed. Unfilled positions: ${stationAssignmentShortfall}.`, stationAssignmentShortfall ? 'error' : 'done');
            } catch (error) {
                verificationError = error?.message || String(error);
                afterActionVerified = false;
                vehicleReports.forEach(vehicleReport => {
                    if (vehicleReport.verificationStatus !== 'skipped') {
                        vehicleReport.verificationStatus = 'individual-verification-only';
                    }
                });
                personnelLog(`Final station verification failed: ${verificationError}`, 'error');
            }
        }
        let initialCriticalFilled = vehicleReports.reduce((sum, vehicle) => sum + Number(vehicle.beforeCritical || 0), 0);
        let finalCriticalFilled = vehicleReports.reduce((sum, vehicle) => sum + Number(vehicle.afterCritical || 0), 0);
        let fulfilledUnits = vehicleReports.filter(vehicle => Number(vehicle.unfilled || 0) === 0).length;
        const stationTarget =
            isPersonnelPerStationTargetMode()
                ? PERSONNEL_STATE.unitsRequired
                : 0;
        if (stationTarget > 0) {
            fulfilledUnits =
                Math.min(
                    stationTarget,
                    fulfilledUnits
                );
            required =
                stationTarget
                * PERSONNEL_TARGET_PER_VEHICLE;
            trainingShortfall =
                Math.max(
                    0,
                    required - trained.length
                );
            stationAssignmentShortfall =
                Math.max(
                    0,
                    (
                        stationTarget - fulfilledUnits
                    ) * PERSONNEL_TARGET_PER_VEHICLE
                );
            initialCriticalFilled =
                Math.min(
                    required,
                    initialCriticalFilled
                );
            finalCriticalFilled =
                Math.min(
                    required,
                    finalCriticalFilled
                );
        }
        return {
            stationName: station.displayName,
            stationHref: station.href,
            personnelPageHref: baselinePage.href,
            profileLabel: 'Critical Care',
            qualificationLabel: PERSONNEL_TRAINING_LABEL,
            vehicleCount: vehicleReports.length,
            ambulances: vehicleReports.length,
            required,
            trained: trained.length,
            availableAtScan,
            availableAtEnd,
            initialQualifiedFilled: initialCriticalFilled,
            finalQualifiedFilled: finalCriticalFilled,
            initialCriticalFilled,
            finalCriticalFilled,
            trainingShortfall,
            assignmentShortfall: stationAssignmentShortfall,
            planned: stationPlanned,
            assigned: stationAssigned,
            fulfilledUnits,
            stationTarget,
            stationTargetFulfilled:
                stationTarget > 0
                    ? fulfilledUnits
                    : 0,
            stationTargetMet:
                stationTarget > 0
                    ? fulfilledUnits >= stationTarget
                    : null,
            stationTargetShortfallUnits:
                stationTarget > 0
                    ? Math.max(
                        0,
                        stationTarget - fulfilledUnits
                    )
                    : 0,
            vehiclesChecked: vehicleReports.length,
            afterActionVerified,
            verificationError,
            rules: [{
                ruleId: 'critical_care',
                label: 'Critical Care',
                vehicleLabel: PERSONNEL_TARGET_VEHICLE_LABEL,
                target: PERSONNEL_TARGET_PER_VEHICLE,
                trainingLabel: PERSONNEL_TRAINING_LABEL,
                vehicleCount: vehicleReports.length,
                required,
                trained: trained.length,
                trainingShortfall
            }],
            vehicles: vehicleReports.map(vehicle => ({
                ...vehicle,
                ruleId: 'critical_care',
                ruleLabel: 'Critical Care',
                trainingLabel: PERSONNEL_TRAINING_LABEL,
                target: PERSONNEL_TARGET_PER_VEHICLE,
                beforeQualified: vehicle.beforeCritical,
                afterQualified: vehicle.afterCritical,
                finalQualified: vehicle.finalCritical
            }))
        };
    }
    async function waitPersonnelDelay(delayMs) {
        const endAt = Date.now() + Math.max(0, Number(delayMs) || 0);
        while (Date.now() < endAt) {
            if (PERSONNEL_STATE.stopped) return;
            await sleep(Math.min(100, endAt - Date.now()));
        }
    }
    async function waitForPersonnelRequestSlot() {
        const elapsed = Date.now() - (PERSONNEL_STATE.lastRequestAt || 0);
        const waitMs = Math.max(0, PERSONNEL_REQUEST_GAP_MS - elapsed);
        if (waitMs) await waitPersonnelDelay(waitMs);
        if (PERSONNEL_STATE.stopped) throw new DOMException('Personnel run stopped', 'AbortError');
    }
    async function personnelFetchResponse(url, options = {}, timeoutMs = 12000) {
        await waitForPersonnelRequestSlot();
        const requestUrl = getSameOriginResourceUrl(
            url,
            'Personnel Assignment request'
        );
        const controller = new AbortController();
        PERSONNEL_STATE.activeController = controller;
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(
                `${requestUrl.pathname}${requestUrl.search}`,
                {
                credentials: 'same-origin',
                cache: 'no-store',
                redirect: 'follow',
                ...options,
                signal: controller.signal
                }
            );
            PERSONNEL_STATE.lastRequestAt = Date.now();
            return response;
        } finally {
            clearTimeout(timer);
            if (PERSONNEL_STATE.activeController === controller) {
                PERSONNEL_STATE.activeController = null;
            }
        }
    }
    async function personnelFetchDocument(url, timeoutMs = 12000) {
        if (PERSONNEL_STATE.registerBuilding && PERSONNEL_STATE.registerReader) {
            return PERSONNEL_STATE.registerReader.read(url, timeoutMs);
        }
        const response = await personnelFetchResponse(url, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml'
            }
        }, timeoutMs);
        if (!response.ok) throw new Error(`Request returned HTTP ${response.status}: ${url}`);
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return { response, doc, href: new URL(response.url || url, location.origin).pathname };
    }
    function parsePersonnelVehicleOccupancy(row) {
        const text = String(row?.textContent || '');
        const matches = [...text.matchAll(/\(\s*(\d+)\s*\/\s*(\d+)\s*\)/g)];
        const match = matches.at(-1);
        if (!match) {
            return { assignedCount: null, maxCount: null };
        }
        return {
            assignedCount: Number(match[1]),
            maxCount: Number(match[2])
        };
    }
    function normalizePersonnelVehicleName(value) {
        return cleanText(value)
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
    }
    function getPersonnelAmbulanceQueue(doc) {
        const seen = new Set();
        const queue = [];
        const rows = [...doc.querySelectorAll('#vehicle_table tr')];
        let ambulanceRows = 0;
        for (const row of rows) {
            const image = row.querySelector('img[vehicle_type_id]');
            const vehicleTypeId = image?.getAttribute('vehicle_type_id') || '';
            if (vehicleTypeId !== PERSONNEL_TARGET_VEHICLE_TYPE_ID) continue;
            ambulanceRows++;
            const vehicleLinks = [...row.querySelectorAll('a[href*="/vehicles/"]')];
            const plainVehicleLink = vehicleLinks.find(link => {
                const href = link.getAttribute('href') || '';
                return /^\/vehicles\/\d+\/?(?:[?#].*)?$/.test(href);
            });
            const editLink = vehicleLinks.find(link => {
                const href = link.getAttribute('href') || '';
                return /\/vehicles\/\d+\/edit(?:[/?#]|$)/.test(href);
            });
            const directAssignmentLink = vehicleLinks.find(link => {
                const href = link.getAttribute('href') || '';
                return /\/vehicles\/\d+\/zuweisung(?:[/?#]|$)/.test(href);
            });
            const idCandidates = [plainVehicleLink, editLink, directAssignmentLink]
                .map(link => getVehicleIdFromHref(link?.getAttribute('href') || ''))
                .filter(Boolean);
            const vehicleId = idCandidates[0] || '';
            if (!vehicleId || seen.has(vehicleId)) continue;
            seen.add(vehicleId);
            const distinctIds = [...new Set(idCandidates)];
            if (distinctIds.length > 1) {
                personnelDebug(`Ambulance row contains conflicting vehicle IDs (${distinctIds.join(', ')}). Using ${vehicleId}.`);
            }
            const assignmentHref = directAssignmentLink?.getAttribute('href') || `/vehicles/${vehicleId}/zuweisung`;
            const nameSource = plainVehicleLink
                || vehicleLinks.find(link => cleanText(link.textContent || ''))
                || null;
            const name = cleanText(nameSource?.textContent || row.textContent || '') || `Ambulance ${vehicleId}`;
            const occupancy = parsePersonnelVehicleOccupancy(row);
            queue.push({
                vehicleId,
                name,
                assignmentHref,
                assignedCount: occupancy.assignedCount,
                maxCount: occupancy.maxCount
            });
        }
        queue.sort((a, b) => a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: 'base'
        }));
        personnelDebug(`Vehicle table scan: ${rows.length} row(s), ${ambulanceRows} Ambulance row(s), ${queue.length} usable assignment route(s).`);
        queue.forEach(vehicle => {
            personnelDebug(`Ambulance detected: ${vehicle.name} | ID=${vehicle.vehicleId} | table occupancy=${vehicle.assignedCount ?? '?'} / ${vehicle.maxCount ?? '?'}`);
        });
        return queue;
    }
    function parseTrainingCodes(row) {
        const raw = row?.getAttribute('data-filterable-by') ||
            row?.querySelector?.('[data-filterable-by]')?.getAttribute('data-filterable-by') ||
            '[]';
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed)
                ? Array.from(new Set(parsed.map(String).filter(Boolean)))
                : [];
        } catch (_error) {
            const rawText = String(raw || '');
            const quotedCodes = Array.from(
                rawText.matchAll(/["']([^"']+)["']/g),
                match => String(match[1] || '').trim()
            ).filter(Boolean);
            if (quotedCodes.length) {
                return Array.from(new Set(quotedCodes));
            }
            return Array.from(new Set(
                rawText
                    .replace(/[\[\]]/g, ' ')
                    .split(/[\s,]+/)
                    .map(value => value.replace(/^["']|["']$/g, '').trim())
                    .filter(Boolean)
            ));
        }
    }
    function getStationPersonnelRowId(row) {
        if (!row) return '';
        const candidates = [
            row.getAttribute?.('personal_id'),
            row.getAttribute?.('data-personal-id'),
            row.id?.match(/personal_(\d+)/)?.[1],
            row.querySelector?.('input.personal-delete-checkbox[value]')?.value,
            row.querySelector?.('input.personal-delete-checkbox[value]')?.getAttribute?.('value'),
            row.querySelector?.('a[href^="/personals/"]')?.getAttribute?.('href')?.match(/\/personals\/(\d+)/)?.[1]
        ];
        return String(
            candidates.find(value => /^\d+$/.test(String(value || '').trim())) ||
            ''
        );
    }
    function getUniquePersonnelVehicleNameIndex(vehicles) {
        const index = new Map();
        (Array.isArray(vehicles) ? vehicles : []).forEach(vehicle => {
            const key = normalizePersonnelVehicleName(vehicle?.name || '');
            if (!key || !vehicle?.vehicleId) return;
            if (index.has(key)) {
                index.set(key, null);
                return;
            }
            index.set(key, vehicle);
        });
        return index;
    }
    function parseStationPersonnelAssignmentEvidence(doc, vehicles) {
        if (!doc?.querySelectorAll) return [];
        const vehicleNameIndex =
            getUniquePersonnelVehicleNameIndex(vehicles);
        return Array.from(
            doc.querySelectorAll('#personal_table tbody tr')
        ).map(row => {
            const cells = Array.from(row.children || []);
            const hasDeleteCheckbox = !!row.querySelector?.(
                'input.personal-delete-checkbox'
            );
            const nameIndex = hasDeleteCheckbox ? 1 : 0;
            const trainingIndex = nameIndex + 1;
            const assignedVehicleIndex = nameIndex + 2;
            const statusIndex = nameIndex + 3;
            const assignedVehicleCell = cells[assignedVehicleIndex] || null;
            const assignedVehicleLink = assignedVehicleCell?.querySelector?.(
                'a[href^="/vehicles/"]'
            ) || null;
            const linkedVehicleId = getVehicleIdFromHref(
                assignedVehicleLink?.getAttribute?.('href') || ''
            );
            const assignedVehicleName = cleanText(
                assignedVehicleLink?.textContent ||
                assignedVehicleCell?.textContent ||
                ''
            );
            const matchedVehicle = linkedVehicleId
                ? null
                : vehicleNameIndex.get(
                    normalizePersonnelVehicleName(assignedVehicleName)
                );
            const assignedVehicleId = String(
                linkedVehicleId ||
                matchedVehicle?.vehicleId ||
                ''
            );
            const statusText = cleanText(
                cells[statusIndex]?.textContent || ''
            );
            return {
                personnelId: getStationPersonnelRowId(row),
                name: cleanText(cells[nameIndex]?.textContent || ''),
                trainingText: cleanText(cells[trainingIndex]?.textContent || ''),
                trainingCodes: parseTrainingCodes(row),
                assignedHere: false,
                assignedVehicleId,
                assignedVehicleName,
                available: /\bavailable\b/i.test(statusText),
                assignedElsewhere: false,
                displayedVehicleId: assignedVehicleId,
                assignHref: '',
                stationAssignmentEvidence: true
            };
        }).filter(person => {
            return !!(
                person.personnelId &&
                person.assignedVehicleId
            );
        });
    }
    function parseVehicleAssignmentPage(doc, vehicleId) {
        const currentVehicleId = String(vehicleId || '');
        const vehicleTypeElement = doc.querySelector(
            '.vehicle_image_reload[vehicle_type_id], ' +
            '[vehicle_type_id], [data-vehicle-type-id]'
        );
        const vehicleTypeId = String(
            vehicleTypeElement?.getAttribute('vehicle_type_id') ||
            vehicleTypeElement?.getAttribute('data-vehicle-type-id') ||
            ''
        );
        const rows = [...doc.querySelectorAll('#personal_table tbody tr')]
            .map(row => {
                const cells = [...row.children];
                const actionControls = [...row.querySelectorAll(
                    'a[href*="/zuweisungDo/"], button, ' +
                    'input[type="submit"], input[type="button"], ' +
                    '[personal_id], [data-personal-id], .btn-assigned'
                )];
                const visibleActionControls = actionControls.filter(control => {
                    const style = String(control.getAttribute?.('style') || '').toLowerCase();
                    const hiddenByClass = control.classList?.contains('hidden') ||
                        control.classList?.contains('d-none');
                    return !(
                        control.hidden ||
                        control.getAttribute?.('aria-hidden') === 'true' ||
                        hiddenByClass ||
                        /display\s*:\s*none|visibility\s*:\s*hidden/.test(style)
                    );
                });
                const exactActionLink = actionControls.find(control => {
                    const href = control.getAttribute?.('href') || '';
                    return href.includes(`/vehicles/${currentVehicleId}/zuweisungDo/`);
                });
                const assignedControl = visibleActionControls.find(control => {
                    const text = cleanText(
                        control?.innerText ||
                        control?.textContent ||
                        control?.value ||
                        ''
                    );
                    return !!(
                        control?.classList?.contains('btn-assigned') ||
                        /remove\s+binding/i.test(text)
                    );
                });
                const statusControl = assignedControl || exactActionLink || actionControls[0] || null;
                const actionLink = exactActionLink || actionControls.find(control => control.tagName === 'A') || null;
                const personnelIdCandidates = [
                    statusControl?.getAttribute?.('personal_id'),
                    statusControl?.getAttribute?.('data-personal-id'),
                    actionLink?.getAttribute?.('personal_id'),
                    actionLink?.getAttribute?.('data-personal-id'),
                    row.getAttribute?.('personal_id'),
                    row.getAttribute?.('data-personal-id'),
                    row.id?.match(/personal_(\d+)/)?.[1],
                    actionLink?.getAttribute?.('href')?.match(/\/zuweisungDo\/(\d+)/)?.[1],
                    statusControl?.getAttribute?.('formaction')?.match(/\/zuweisungDo\/(\d+)/)?.[1]
                ];
                const personnelId = String(
                    personnelIdCandidates.find(value => /^\d+$/.test(String(value || '').trim())) ||
                    ''
                );
                const assignedVehicleLink = [...row.querySelectorAll('a[href^="/vehicles/"]')].find(link => {
                    const href = link.getAttribute('href') || '';
                    return /^\/vehicles\/\d+\/?(?:[?#].*)?$/.test(href);
                });
                const detectedAssignedVehicleId = getVehicleIdFromHref(
                    assignedVehicleLink?.getAttribute('href') || ''
                );
                const assignedHere = visibleActionControls.some(control => {
                    const text = cleanText(
                        control?.innerText ||
                        control?.textContent ||
                        control?.value ||
                        ''
                    );
                    return !!(
                        control?.classList?.contains('btn-assigned') ||
                        /remove\s+binding/i.test(text)
                    );
                });
                const assignedElsewhere = !assignedHere && visibleActionControls.some(
                    control => control?.classList?.contains('btn-warning')
                );
                const available = !assignedHere && !assignedElsewhere && visibleActionControls.some(
                    control => control?.classList?.contains('btn-success')
                );
                const assignedVehicleId = assignedHere
                    ? currentVehicleId
                    : (assignedElsewhere ? detectedAssignedVehicleId : '');
                const assignHref = String(
                    exactActionLink?.getAttribute?.('href') ||
                    actionLink?.getAttribute?.('href') ||
                    statusControl?.getAttribute?.('formaction') ||
                    ''
                );
                return {
                    personnelId,
                    name: cleanText(cells[0]?.textContent || ''),
                    trainingText: cleanText(cells[1]?.textContent || ''),
                    trainingCodes: parseTrainingCodes(row),
                    assignedHere,
                    assignedVehicleId,
                    assignedVehicleName: assignedVehicleId ? cleanText(assignedVehicleLink?.textContent || '') : '',
                    available,
                    assignedElsewhere,
                    displayedVehicleId: detectedAssignedVehicleId,
                    assignHref
                };
            })
            .filter(person => person.personnelId);
        return {
            vehicleTypeId,
            rows,
            totalAssigned: rows.filter(person => person.assignedVehicleId === currentVehicleId),
            criticalAssigned: rows.filter(person => person.assignedVehicleId === currentVehicleId && person.trainingCodes.includes(PERSONNEL_TRAINING_CODE)),
            availableCritical: rows.filter(person => person.available && person.trainingCodes.includes(PERSONNEL_TRAINING_CODE))
        };
    }
    async function submitPersonnelAssignment(candidate) {
        if (!candidate.assignHref || PERSONNEL_STATE.stopped) return false;
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const headers = {
            'Accept': 'text/html,application/xhtml+xml',
            'X-Requested-With': 'XMLHttpRequest'
        };
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
        const response = await personnelFetchResponse(candidate.assignHref, {
            method: 'POST',
            headers
        }, 12000);
        if (!response.ok) {
            personnelDebug(`Assignment request HTTP ${response.status}: ${candidate.assignHref}`);
            return false;
        }
        try {
            await response.text();
        } catch (_error) {}
        return true;
    }
    function getPersonnelReportResult(report) {
        if (report?.error) return 'ERROR';
        if (Number(report?.stationTarget || 0) > 0) {
            return report?.stationTargetMet
                ? 'TARGET MET'
                : 'TARGET SHORTFALL';
        }
        if (report?.noTargetVehicles) return 'NO TARGET VEHICLES';
        if (Number(report?.assignmentShortfall || 0) > 0) return 'SHORTFALL';
        return 'COMPLETE';
    }
    function getPersonnelReportQualificationLabel(report) {
        return report?.qualificationLabel || getPersonnelProfileDefinition()?.label || 'Required qualification';
    }
    function getPersonnelReportVehicleCount(report) {
        return Number(report?.vehicleCount ?? report?.ambulances ?? report?.vehiclesChecked ?? 0);
    }
    function getPersonnelReportInitialFilled(report) {
        return Number(report?.initialQualifiedFilled ?? report?.initialCriticalFilled ?? 0);
    }
    function getPersonnelReportFinalFilled(report) {
        return Number(report?.finalQualifiedFilled ?? report?.finalCriticalFilled ?? 0);
    }
    function buildStationAfterActionText(report) {
        if (!report) return 'No station report is available yet.';
        const isAssign = PERSONNEL_STATE.action === 'assign';
        const service = getPersonnelServiceDefinition();
        const profile = getPersonnelProfileDefinition();
        const result = getPersonnelReportResult(report);
        const qualificationLabel = getPersonnelReportQualificationLabel(report);
        const lines = [
            `${service.label.toUpperCase()} — ${profile.label.toUpperCase()} ${isAssign ? 'STATION AFTER-ACTION REPORT' : 'STATION PREVIEW REPORT'}`,
            `Station: ${report.stationName || 'Unknown'}`,
            `Result: ${result}`,
            `Generated: ${new Date().toLocaleString('en-GB')}`,
            ''
        ];
        if (report.error) {
            lines.push(`ERROR: ${report.error}`);
            return lines.join('\n');
        }
        if (report.noTargetVehicles) {
            lines.push('No vehicles mapped to this profile were found at the station. No assignments were changed.');
            return lines.join('\n');
        }
        const verificationText = isAssign
            ? (report.afterActionVerified ? 'PASSED - final station state re-read' : `PARTIAL - ${report.verificationError || 'final station re-read was not verified'}`)
            : 'PREVIEW PROJECTION - no assignments changed';
        lines.push(
            `Final verification: ${verificationText}`,
            `Mapped vehicles checked: ${getPersonnelReportVehicleCount(report)}`,
            ...(
                Number(report.stationTarget || 0) > 0
                    ? [
                        `Station unit target: ${report.stationTarget}`,
                        `Station target result: ${report.stationTargetMet ? 'PASSED' : 'SHORT'} — ${Number(report.stationTargetFulfilled || 0)}/${report.stationTarget}`,
                        `Additional fully staffed units needed: ${Number(report.stationTargetShortfallUnits || 0)}`
                    ]
                    : []
            ),
            `Units fully covered at this station: ${Number(report.fulfilledUnits || 0)}`,
            `Required qualified positions: ${Number(report.required || 0)}`,
            `${qualificationLabel} personnel visible: ${Number(report.trained || 0)}`,
            `Available qualified before action: ${Number(report.availableAtScan || 0)}`,
            `Available qualified after action: ${Number(report.availableAtEnd || 0)}`,
            `Qualified positions before: ${getPersonnelReportInitialFilled(report)}/${Number(report.required || 0)}`,
            `${isAssign ? 'Qualified positions after' : 'Projected qualified positions'}: ${getPersonnelReportFinalFilled(report)}/${Number(report.required || 0)}`,
            `${isAssign ? 'Personnel assigned and verified' : 'Assignments planned'}: ${isAssign ? Number(report.assigned || 0) : Number(report.planned || 0)}`,
            `Qualification shortfall estimate: ${Number(report.trainingShortfall || 0)}`,
            `Missing training by qualification: ${formatPoliceTrainingGapSummary(report.missingTrainingSummary)}`,
            `Unfilled required positions after action: ${Number(report.assignmentShortfall || 0)}`
        );
        if (Array.isArray(report.rules) && report.rules.length > 1) {
            lines.push('', 'RULE GROUPS');
            report.rules.forEach(rule => {
                lines.push(
                    `  - ${rule.label}: ${rule.vehicleCount} ${rule.vehicleLabel}(s) | target ${rule.target} each | required ${rule.required} | trained ${rule.trained} | training shortfall ${rule.trainingShortfall} | missing ${formatPoliceTrainingGapSummary(rule.trainingGaps)}`
                );
            });
        }
        lines.push('', 'VEHICLE RESULTS');
        report.vehicles.forEach(vehicle => {
            const names = isAssign ? vehicle.assignedNames : vehicle.plannedNames;
            const afterLabel = isAssign
                ? (vehicle.verificationStatus === 'final-verified' ? 'final verified' : 'after action')
                : 'projected';
            const target = Number(vehicle.target || PERSONNEL_TARGET_PER_VEHICLE);
            const beforeQualified = Number(vehicle.beforeQualified ?? vehicle.beforeCritical ?? 0);
            const afterQualified = Number(vehicle.afterQualified ?? vehicle.afterCritical ?? 0);
            const vehicleResult = Number(vehicle.unfilled || 0) ? `SHORTFALL ${vehicle.unfilled}` : 'COMPLETE';
            const nameText = names?.length
                ? ` | ${isAssign ? 'assigned' : 'planned'}: ${names.join(', ')}`
                : '';
            const blockText = vehicle.occupiedSeatBlock
                ? ` | ${vehicle.occupiedSeatBlock} required position(s) blocked by existing occupants`
                : '';
            const ruleText = vehicle.ruleLabel ? ` [${vehicle.ruleLabel}]` : '';
            const occupantGapText =
                formatVehicleOccupantTrainingGaps(
                    vehicle
                        .occupantTrainingGaps
                );
            const missingTrainingText =
                occupantGapText
                    ? ` | existing occupants missing: ${occupantGapText}`
                    : '';
            lines.push(
                `  - ${vehicle.name}${ruleText}: before ${beforeQualified}/${target} -> ${afterLabel} ${afterQualified}/${target} ${vehicle.trainingLabel || qualificationLabel} | ${vehicleResult}${nameText}${blockText}${missingTrainingText}`
            );
        });
        return lines.join('\n');
    }
    function renderPersonnelAfterAction(report) {
        PERSONNEL_STATE.lastStationReport = report || null;
        PERSONNEL_STATE.currentStationReport = buildStationAfterActionText(report);
        renderPersonnelAfterActionText(PERSONNEL_STATE.currentStationReport);
    }
    function renderPersonnelAfterActionText(text) {
        const report = getToolElementById('mc-personnel-after-action');
        if (!report) return;
        const wasNearBottom = report.scrollHeight - report.scrollTop - report.clientHeight < 28;
        const oldScrollTop = report.scrollTop;
        report.textContent = String(text || '');
        report.scrollTop = wasNearBottom ? report.scrollHeight : oldScrollTop;
    }
    function buildPersonnelOverallStationBlock(report, isAssign) {
        if (!report) return '';
        const cached = PERSONNEL_REPORT_BLOCK_CACHE.get(report);
        if (cached && cached.isAssign === isAssign) return cached.text;
        const lines = [];
        const stationHeading = Number(report.trainingShortfall || 0) > 0
            ? `⚠ ${report.stationName.toUpperCase()} — ESTIMATED TRAINING SHORTFALL ${report.trainingShortfall} ⚠`
            : report.stationName.toUpperCase();
        lines.push(stationHeading);
        if (report.error) {
            lines.push('  Result: ERROR', `  ERROR: ${report.error}`);
        } else if (report.noTargetVehicles) {
            lines.push('  Result: NO TARGET VEHICLES');
        } else {
            lines.push(
                `  Result: ${getPersonnelReportResult(report)}`,
                `  Final verification: ${isAssign ? (report.afterActionVerified ? 'PASSED' : 'PARTIAL / FAILED') : 'PREVIEW PROJECTION'}`,
                `  Mapped vehicles: ${getPersonnelReportVehicleCount(report)}`,
                ...(
                    Number(report.stationTarget || 0) > 0
                        ? [
                            `  Station target: ${report.stationTarget}`,
                            `  Station target result: ${report.stationTargetMet ? 'PASSED' : 'SHORT'} (${Number(report.stationTargetFulfilled || 0)}/${report.stationTarget})`,
                            `  Additional units required: ${Number(report.stationTargetShortfallUnits || 0)}`
                        ]
                        : []
                ),
                `  Units fully covered: ${Number(report.fulfilledUnits || 0)}`,
                `  Required qualified positions: ${Number(report.required || 0)}`,
                `  Qualified personnel visible: ${Number(report.trained || 0)}`,
                `  Available qualified before: ${Number(report.availableAtScan || 0)}`,
                `  Available qualified after: ${Number(report.availableAtEnd || 0)}`,
                `  Qualified positions before: ${getPersonnelReportInitialFilled(report)}/${Number(report.required || 0)}`,
                `  ${isAssign ? 'Qualified positions after' : 'Projected qualified positions'}: ${getPersonnelReportFinalFilled(report)}/${Number(report.required || 0)}`,
                `  Qualification shortfall estimate: ${Number(report.trainingShortfall || 0)}`,
                `  Missing training by qualification: ${formatPoliceTrainingGapSummary(report.missingTrainingSummary)}`,
                `  ${isAssign ? 'Personnel assigned' : 'Assignments planned'}: ${isAssign ? Number(report.assigned || 0) : Number(report.planned || 0)}`,
                `  Unfilled required positions after action: ${Number(report.assignmentShortfall || 0)}`
            );
            if (report.verificationError) lines.push(`  Verification warning: ${report.verificationError}`);
            if (Array.isArray(report.rules) && report.rules.length > 1) {
                report.rules.forEach(rule => {
                    lines.push(
                        `    Rule: ${rule.label} | vehicles ${rule.vehicleCount} | target ${rule.target} | required ${rule.required} | trained ${rule.trained} | shortfall ${rule.trainingShortfall} | missing ${formatPoliceTrainingGapSummary(rule.trainingGaps)}`
                    );
                });
            }
            report.vehicles.forEach(vehicle => {
                const actionNames = isAssign ? vehicle.assignedNames : vehicle.plannedNames;
                const actionText = actionNames?.length
                    ? ` | ${isAssign ? 'assigned' : 'planned'}: ${actionNames.join(', ')}`
                    : '';
                const seatText = vehicle.occupiedSeatBlock
                    ? ` | ${vehicle.occupiedSeatBlock} required position(s) blocked by existing occupants`
                    : '';
                const afterLabel = isAssign
                    ? (vehicle.verificationStatus === 'final-verified' ? 'final verified' : 'after action')
                    : 'projected';
                const target = Number(vehicle.target || PERSONNEL_TARGET_PER_VEHICLE);
                const beforeQualified = Number(vehicle.beforeQualified ?? vehicle.beforeCritical ?? 0);
                const afterQualified = Number(vehicle.afterQualified ?? vehicle.afterCritical ?? 0);
                const ruleText = vehicle.ruleLabel ? ` [${vehicle.ruleLabel}]` : '';
                const occupantGapText = formatVehicleOccupantTrainingGaps(vehicle.occupantTrainingGaps);
                const missingTrainingText = occupantGapText
                    ? ` | existing occupants missing: ${occupantGapText}`
                    : '';
                lines.push(
                    `    - ${vehicle.name}${ruleText}: before ${beforeQualified}/${target} -> ${afterLabel} ${afterQualified}/${target} | unfilled ${Number(vehicle.unfilled || 0)}${actionText}${seatText}${missingTrainingText}`
                );
            });
        }
        const text = lines.join('\n');
        PERSONNEL_REPORT_BLOCK_CACHE.set(report, { isAssign, text });
        return text;
    }
    function buildAndRenderPersonnelReport() {
        const isAssign = PERSONNEL_STATE.action === 'assign';
        const actionLabel = isAssign ? 'ASSIGN AND VERIFY' : 'PREVIEW ONLY';
        const actionCount = isAssign ? PERSONNEL_STATE.assignedCount : PERSONNEL_STATE.plannedCount;
        const service = getPersonnelServiceDefinition();
        const profile = getPersonnelProfileDefinition();
        const lines = [
            `${service.label.toUpperCase()} — ${profile.label.toUpperCase()} ${isAssign ? 'PERSONNEL AFTER-ACTION REPORT' : 'PERSONNEL PREVIEW REPORT'}`,
            `Action: ${actionLabel}`,
            `Generated: ${new Date().toLocaleString('en-GB')}`,
            `Rule: ${profile.requirement}`,
            `${isPersonnelPerStationTargetMode() ? 'Units requested at every station' : 'Units requested'}: ${isPersonnelPerStationTargetMode() ? PERSONNEL_STATE.unitsRequired : 'ALL MATCHING UNITS'}`,
            `${isPersonnelPerStationTargetMode() ? 'Station targets' : 'Units fulfilled'}: ${formatPersonnelUnitsFulfilled()}`,
            ''
        ];
        const trainingShortfallReports = getPersonnelTrainingShortfallReports();
        if (trainingShortfallReports.length) {
            lines.push(`⚠ QUALIFICATION SHORTFALL STATIONS (${trainingShortfallReports.length}) ⚠`);
            trainingShortfallReports.forEach(report => {
                lines.push(
                    `  ⚠ ${report.stationName.toUpperCase()}: ESTIMATED SHORTFALL ${report.trainingShortfall} | required ${report.required} | qualified visible ${report.trained} | missing ${formatPoliceTrainingGapSummary(report.missingTrainingSummary)}`
                );
            });
            lines.push('');
        } else if (PERSONNEL_STATE.reports.some(report => !report.error && !report.noTargetVehicles)) {
            lines.push('QUALIFICATION SHORTFALL STATIONS: NONE', '');
        }
        PERSONNEL_STATE.reports.forEach(report => {
            lines.push(buildPersonnelOverallStationBlock(report, isAssign), '');
        });
        lines.push(
            'TOTALS',
            `  Stations completed: ${PERSONNEL_STATE.completedStations}`,
            `  Stations skipped: ${PERSONNEL_STATE.skippedStations}`,
            `  Vehicles checked: ${PERSONNEL_STATE.checkedVehicles}`,
            `  ${isPersonnelPerStationTargetMode() ? 'Units required at every station' : 'Units requested'}: ${isPersonnelPerStationTargetMode() ? PERSONNEL_STATE.unitsRequired : 'ALL'}`,
            `  ${isPersonnelPerStationTargetMode() ? 'Station targets' : 'Units fulfilled'}: ${formatPersonnelUnitsFulfilled()}`,
            ...(
                isPersonnelPerStationTargetMode()
                    ? [
                        `  Stations meeting target: ${PERSONNEL_STATE.stationsTargetMet}`,
                        `  Stations below target: ${PERSONNEL_STATE.stationsTargetShort}`
                    ]
                    : []
            ),
            `  ${isAssign ? 'Personnel assigned' : 'Assignments planned'}: ${actionCount}`,
            `  Qualification shortfall estimate: ${PERSONNEL_STATE.trainingShortfall}`,
            `  Unfilled required positions after action: ${PERSONNEL_STATE.assignmentShortfall}`
        );
        PERSONNEL_STATE.currentReport = lines.join('\n');
        renderPersonnelReport(PERSONNEL_STATE.currentReport);
        updatePersonnelTrainingShortfallHighlights();
    }
    function getPersonnelTrainingShortfallReports() {
        if (PERSONNEL_SHORTFALL_CACHE_SIZE === PERSONNEL_STATE.reports.length) {
            return PERSONNEL_SHORTFALL_CACHE;
        }
        PERSONNEL_SHORTFALL_CACHE = PERSONNEL_STATE.reports
            .filter(report => !report?.error && Number(report?.trainingShortfall || 0) > 0)
            .slice()
            .sort((left, right) => {
                const shortfallDifference = Number(right.trainingShortfall || 0) - Number(left.trainingShortfall || 0);
                if (shortfallDifference) return shortfallDifference;
                return String(left.stationName || '').localeCompare(String(right.stationName || ''), 'en-GB', { numeric: true });
            });
        PERSONNEL_SHORTFALL_CACHE_SIZE = PERSONNEL_STATE.reports.length;
        return PERSONNEL_SHORTFALL_CACHE;
    }
    function updatePersonnelTrainingShortfallHighlights() {
        const section = getToolElementById('mc-personnel-training-shortfall-section');
        const count = getToolElementById('mc-personnel-training-shortfall-station-count');
        const list = getToolElementById('mc-personnel-training-shortfall-list');
        const shortages = getPersonnelTrainingShortfallReports();
        if (section && count && list) {
            count.textContent = String(shortages.length);
            section.hidden = shortages.length === 0;
            const fragment = document.createDocumentFragment();
            shortages.forEach(report => {
                const row = document.createElement('div');
                row.className = 'mc-personnel-training-shortfall-row';
                const name = document.createElement('span');
                name.className = 'mc-personnel-training-shortfall-name';
                name.textContent = report.stationName || 'Unknown station';
                const value = document.createElement('span');
                value.className = 'mc-personnel-training-shortfall-value';
                value.textContent = `Need ${report.trainingShortfall}`;
                row.append(name, value);
                fragment.appendChild(row);
            });
            list.replaceChildren(fragment);
        }
        const shortageByHref = new Map(
            shortages
                .filter(report => report.stationHref)
                .map(report => [String(report.stationHref), Number(report.trainingShortfall || 0)])
        );
        PERSONNEL_STATE.filteredStations.forEach(station => {
            const option = PERSONNEL_START_OPTION_BY_HREF.get(String(station.href));
            if (!option) return;
            const stationShortfall = shortageByHref.get(String(station.href)) || 0;
            option.textContent = stationShortfall > 0
                ? `⚠ ${station.displayName} — NEEDS ${stationShortfall} TRAINING`
                : `${station.displayName} [building type ${station.buildingTypeId ?? '?'}]`;
        });
        for (const link of PERSONNEL_HIGHLIGHTED_STATION_LINKS) {
            link.classList.remove('mc-personnel-training-shortfall-station');
            link.removeAttribute('data-mc-personnel-training-shortfall');
            if (link.title?.includes('qualification shortfall:')) link.removeAttribute('title');
        }
        PERSONNEL_HIGHLIGHTED_STATION_LINKS.clear();
        shortages.forEach(report => {
            const stationLink = PERSONNEL_STATION_LINK_BY_HREF.get(String(report.stationHref || ''));
            if (!stationLink?.isConnected) return;
            stationLink.classList.add('mc-personnel-training-shortfall-station');
            stationLink.dataset.mcPersonnelTrainingShortfall = String(report.trainingShortfall);
            stationLink.title = `${getPersonnelProfileDefinition().label} qualification shortfall: ${report.trainingShortfall} additional qualified staff estimated`;
            PERSONNEL_HIGHLIGHTED_STATION_LINKS.add(stationLink);
        });
    }
    function renderPersonnelReport(text) {
        const report = getToolElementById('mc-personnel-report');
        if (!report) return;
        const wasNearBottom = report.scrollHeight - report.scrollTop - report.clientHeight < 28;
        const oldScrollTop = report.scrollTop;
        report.textContent = String(text || '');
        report.scrollTop = wasNearBottom ? report.scrollHeight : oldScrollTop;
    }
    async function copyTextToClipboard(text, successMessage) {
        const value = String(text || '');
        try {
            await navigator.clipboard.writeText(value);
            personnelLog(successMessage, 'done');
        } catch (_error) {
            const textarea = document.createElement('textarea');
            textarea.value = value;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            const copied = document.execCommand('copy');
            textarea.remove();
            personnelLog(copied ? successMessage : 'Clipboard copy failed. Select the report text manually.', copied ? 'done' : 'error');
        }
    }
    async function copyPersonnelReport() {
        if (!PERSONNEL_STATE.currentReport) buildAndRenderPersonnelReport();
        await copyTextToClipboard(PERSONNEL_STATE.currentReport || '', 'Overall report copied to clipboard.');
    }
    async function copyPersonnelStationReport() {
        if (!PERSONNEL_STATE.currentStationReport && PERSONNEL_STATE.lastStationReport) {
            renderPersonnelAfterAction(PERSONNEL_STATE.lastStationReport);
        }
        if (!PERSONNEL_STATE.currentStationReport) {
            personnelLog('No completed station report is available to copy.', 'error');
            return;
        }
        await copyTextToClipboard(PERSONNEL_STATE.currentStationReport, 'Station after-action report copied to clipboard.');
    }
    function scrollPersonnelTo(sectionId) {
        const body = document.querySelector('#mc-namer-body');
        const section = document.getElementById(sectionId);
        if (!body || !section) return;
        const bodyRect = body.getBoundingClientRect();
        const sectionRect = section.getBoundingClientRect();
        const targetTop = body.scrollTop + sectionRect.top - bodyRect.top - 38;
        body.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }
    async function waitIfPersonnelPaused() {
        while (PERSONNEL_STATE.paused && !PERSONNEL_STATE.stopped) {
            await sleep(250);
        }
    }
    function updatePersonnelCounters() {
        setPersonnelUiValue('completed', PERSONNEL_STATE.completedStations);
        setPersonnelUiValue('vehicles', PERSONNEL_STATE.checkedVehicles);
        setPersonnelUiValue('unitsFulfilled', formatPersonnelUnitsFulfilled());
        setPersonnelUiValue('assigned', PERSONNEL_STATE.action === 'assign' ? PERSONNEL_STATE.assignedCount : PERSONNEL_STATE.plannedCount);
        setPersonnelUiValue('trainingShortfall', PERSONNEL_STATE.trainingShortfall);
        setPersonnelUiValue('assignmentShortfall', PERSONNEL_STATE.assignmentShortfall);
    }
    function setPersonnelUiValue(field, value) {
        if (PERSONNEL_STATE.registerBuilding || registerView?.transferring) {
            registerView?.set(field, value);
            return;
        }
        const map = {
            status: 'mc-personnel-status',
            current: 'mc-personnel-current',
            vehicle: 'mc-personnel-vehicle',
            progress: 'mc-personnel-progress',
            completed: 'mc-personnel-completed',
            vehicles: 'mc-personnel-vehicles',
            unitsFulfilled: 'mc-personnel-units-fulfilled',
            assigned: 'mc-personnel-assigned',
            trainingShortfall: 'mc-personnel-training-shortfall',
            assignmentShortfall: 'mc-personnel-assignment-shortfall'
        };
        const el = getToolElementById(map[field]);
        if (el) el.textContent = String(value);
    }
    function togglePersonnelDebug() {
        PERSONNEL_STATE.debug = !PERSONNEL_STATE.debug;
        document.querySelector('#mc-personnel-debug').textContent = PERSONNEL_STATE.debug ? 'Debug: ON' : 'Debug: OFF';
        personnelLog(`Debug ${PERSONNEL_STATE.debug ? 'enabled' : 'disabled'}.`, 'debug');
    }
    function clearPersonnelLog() {
        clearBoundedToolLog(getToolElementById('mc-personnel-log'));
    }
    function personnelLog(message, type = 'info') {
        if (PERSONNEL_STATE.registerBuilding || registerView?.transferring) {
            registerView?.log(message, type);
            return;
        }
        const logBox = getToolElementById('mc-personnel-log');
        if (!logBox) return;
        const line = document.createElement('div');
        line.className = `mc-log-${type}`;
        line.textContent = message;
        appendBoundedToolLog(logBox, line);
    }
    function personnelDebug(message) {
        if (!PERSONNEL_STATE.debug) return;
        personnelLog(`[DEBUG] ${message}`, 'debug');
    }
    function cleanText(text) {
        return String(text || '')
            .replace(/🚑|🚒|🚓|🚁|🚤|🏥|🔥|🚨|☢️|🤿|🦺|🎖️|🚔|🚛|🧯|🚐|🚚|🚙|🚗|🚜|🚢|🛟|🎯|🛡️|🏣|🧑‍🚒|🚌|🚒🪜|🚔🔫|🚔🥅|🚔🐎|⚠️|🛻|🟤|🛥️|✈️|🪜|📡|🛠️|🌊|🟡|🏔️|🐕|💣|❤️|💧|👷|🫧|1️⃣|2️⃣/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    function createCallsignBase(stationName) {
        return globalThis.NexusUnitNaming.base(stationName);
    }
    function detectStationType(name) {
        const n = cleanText(name).toUpperCase();
        if (n.includes('AIRMED') || n.includes('AIR AMB')) return 'AIR';
        if (n.includes('AIRPORT')) return 'AIRFIELD';
        if (n.includes('BOMB') || n.includes('EOD')) return 'EOD';
        if (n.includes('RECOVERY')) return 'RECOVERY';
        if (n.includes('SAR')) return 'SAR';
        if (n.includes('RNLI') || n.includes('-LB') || n.includes('LIFEBOAT')) return 'RNLI';
        if (n.includes('-CG') || n.includes('COASTGUARD')) return 'COASTGUARD';
        if (n.includes('-PS') || n.includes('POLICE')) return 'POLICE';
        if (n.includes('-AS') || n.includes('AO STATION') || n.includes('AMBULANCE')) return 'AMBULANCE';
        if (n.includes('-FS') || n.includes('FIRE')) return 'FIRE';
        return 'OTHER';
    }
    function getVehicleIdFromHref(href) {
        const match = String(href || '').match(/\/vehicles\/(\d+)/);
        return match ? match[1] : '';
    }
    function makeVehicleName(station, vehicleType, count) {
        return globalThis.NexusUnitNaming.format(station, vehicleType, count);
    }
    async function unitFetchWithTimeout(url, options = {}, timeoutMs = 12000) {
        const requestUrl = getSameOriginResourceUrl(url, 'Unit Naming request');
        const controller = new AbortController();
        STATE.activeControllers.add(controller);
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            return await fetch(`${requestUrl.pathname}${requestUrl.search}`, {
                credentials: 'same-origin',
                cache: 'no-store',
                redirect: 'follow',
                ...options,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timer);
            STATE.activeControllers.delete(controller);
        }
    }
    async function unitFetchDocument(url, timeoutMs = 12000) {
        const requestUrl = getSameOriginResourceUrl(url, 'Unit Naming document');
        const response = await unitFetchWithTimeout(requestUrl.href, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml'
            }
        }, timeoutMs);
        if (!response.ok) {
            throw new Error(`Unit Naming request returned HTTP ${response.status}: ${requestUrl.pathname}`);
        }
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const responseUrl = getSameOriginResourceUrl(
            response.url || requestUrl.href,
            'Unit Naming response'
        );
        return {
            response,
            doc,
            href: `${responseUrl.pathname}${responseUrl.search}`
        };
    }
    async function verifyUnitNameSaved(editHref, vehicleId, expectedName) {
        for (let attempt = 1; attempt <= 12; attempt++) {
            if (STATE.stopped) return false;
            await sleep(attempt === 1 ? 450 : 300);
            try {
                const editPage = await unitFetchDocument(editHref, 10000);
                if (getVehicleIdFromHref(editPage.href) !== String(vehicleId)) {
                    debug(`Vehicle verification returned the wrong ID on attempt ${attempt}.`);
                    continue;
                }
                const savedName = String(
                    editPage.doc.querySelector('#vehicle_caption')?.value || ''
                ).trim();
                debug(`Vehicle save verification attempt ${attempt}: "${savedName}"`);
                if (savedName === expectedName) return true;
            } catch (error) {
                debug(`Vehicle save verification attempt ${attempt} failed: ${error?.message || error}`);
            }
        }
        return false;
    }

    function getUnitClassOptionsForStationType(stationType) {
        const selectedStationType = String(stationType || 'ALL');
        const configuredTypeIds =
            UNIT_CLASS_TYPE_IDS_BY_STATION_TYPE[selectedStationType];
        const typeIds =
            Array.isArray(configuredTypeIds)
                ? configuredTypeIds
                : Object.keys(TYPE_ID_TO_VEHICLE_TYPE);
        const byVehicleType = new Map();
        typeIds.forEach(vehicleTypeId => {
            const vehicleType =
                TYPE_ID_TO_VEHICLE_TYPE[String(vehicleTypeId)] || '';
            const info = VEHICLE_INFO[vehicleType];
            if (!vehicleType || !info || byVehicleType.has(vehicleType)) {
                return;
            }
            byVehicleType.set(vehicleType, {
                vehicleType,
                vehicleTypeId: String(vehicleTypeId),
                label:
                    `${info.icon ? `${info.icon} ` : ''}${vehicleType} (${info.code})`
            });
        });
        return Array.from(byVehicleType.values()).sort((left, right) => {
            return left.vehicleType.localeCompare(
                right.vehicleType,
                'en-GB',
                {
                    numeric: true,
                    sensitivity: 'base'
                }
            );
        });
    }

    function getSelectedUnitClass() {
        return document.querySelector('#mc-namer-unit-class')?.value ||
            STATE.selectedUnitClass ||
            UNIT_CLASS_ALL;
    }
    function getUnitClassDisplayLabel(value = getSelectedUnitClass()) {
        const selected = String(value || UNIT_CLASS_ALL);
        if (selected === UNIT_CLASS_ALL) return 'All classes';
        const info = VEHICLE_INFO[selected];
        return info
            ? `${selected} (${info.code})`
            : selected;
    }
    function populateUnitClassDropdown() {
        const select = document.querySelector('#mc-namer-unit-class');
        if (!select) return;
        const selectedStationType =
            document.querySelector('#mc-namer-station-type')?.value ||
            'ALL';
        const previous =
            select.value ||
            STATE.selectedUnitClass ||
            UNIT_CLASS_ALL;
        const options =
            getUnitClassOptionsForStationType(selectedStationType);
        select.innerHTML = '';
        const allOption = document.createElement('option');
        allOption.value = UNIT_CLASS_ALL;
        allOption.textContent = 'All classes';
        select.appendChild(allOption);
        options.forEach(item => {
            const option = document.createElement('option');
            option.value = item.vehicleType;
            option.textContent = item.label;
            option.dataset.vehicleTypeId = item.vehicleTypeId;
            select.appendChild(option);
        });
        const available = new Set([
            UNIT_CLASS_ALL,
            ...options.map(item => item.vehicleType)
        ]);
        select.value = available.has(previous)
            ? previous
            : UNIT_CLASS_ALL;
        STATE.selectedUnitClass = select.value;
        select.title =
            `${options.length} naming classes available for ` +
            `${STATION_TYPES[selectedStationType] || selectedStationType}`;
    }
    function handleUnitStationTypeChange() {
        populateUnitClassDropdown();
        populateStartDropdown();
    }
    function handleUnitClassChange() {
        STATE.selectedUnitClass = getSelectedUnitClass();
        populateStartDropdown();
        setStatus('Class filter updated');
        log(`Unit class: ${getUnitClassDisplayLabel()}`, 'info');
    }
    function vehicleMatchesSelectedUnitClass(vehicle) {
        const selected =
            STATE.selectedUnitClass ||
            getSelectedUnitClass();
        return (
            selected === UNIT_CLASS_ALL ||
            vehicle?.vehicleType === selected
        );
    }
    async function refreshStations() {
        if (STATION_STATE.running) {
            log('Stop Station Naming before refreshing Unit Naming.', 'error');return;
        }
        if (PERSONNEL_STATE.running) {
            log('Personnel Assignment is currently running. Stop it before refreshing Unit Naming.', 'error');
            return;
        }
        if (STATE.running) {
            log('Cannot refresh while running. Stop first.', 'error');
            return;
        }
        populateUnitClassDropdown();
        STATE.selectedUnitClass = getSelectedUnitClass();
        setStatus('Refreshing stations...');
        log('Refreshing station list...', 'info');
        log(`Unit class filter: ${getUnitClassDisplayLabel()}`, 'info');
        const ready = await Promise.all([loadNamingDispatchCentreList(true),loadNamingDispatchCentreData(true)]);
        if (ready.some(value => !value)) {
            hydrateNamingInventoriesFromCurrentOverview();populateStartDropdown();populateStationNamingStartDropdown();setStatus('Station list unavailable');setStationUiValue('status', 'Station list unavailable');log(getNamingDispatchCentreRefreshFailureReason(),'error');return;
        }
        const stationEntries = getNamingStationEntries();
        STATE.stations = stationEntries.map((entry, index) => {
            const stationType =
                STATION_BUILDING_TYPE_INFO[entry.buildingTypeId]?.stationType ||
                detectStationType(entry.displayName);
            return {
                index,
                href: entry.href,
                buildingId: entry.buildingId,
                displayName: entry.displayName,
                buildingTypeId: entry.buildingTypeId,
                dispatchCentreId: getNamingDispatchCentreId(entry.buildingId),
                callsignBase: createCallsignBase(entry.displayName),
                stationType,
                service: getNamingServiceForStation({
                    buildingTypeId: entry.buildingTypeId,
                    stationType
                })
            };
        });
        populateNamingDispatchCentreFilter('mc-namer-dispatch-centre');
        populateNamingServiceFilter('mc-namer-service', 'mc-namer-dispatch-centre', STATE.stations);
        populateNamingStationTypeFilter('mc-namer-station-type', 'mc-namer-dispatch-centre', 'mc-namer-service', STATE.stations);
        populateStartDropdown();
        setStatus('Ready');
        setProgress(0, STATE.filteredStations.length);
        log(`Stations found: ${STATE.stations.length}`, 'info');
        log(`Matching filter: ${STATE.filteredStations.length}`, 'info');
        if (STATE.filteredStations.length) {
            log(`First match: ${STATE.filteredStations[0].displayName}`, 'info');
            log(`Last match : ${STATE.filteredStations[STATE.filteredStations.length - 1].displayName}`, 'info');
        }
    }
    function populateStartDropdown() {
        const select = document.querySelector('#mc-namer-startfrom');
        if (!select) return;
        const selectedService = document.querySelector('#mc-namer-service')?.value || 'ALL';
        const selectedType = document.querySelector('#mc-namer-station-type')?.value || 'ALL';
        const selectedDispatchCentre =
            document.querySelector('#mc-namer-dispatch-centre')?.value ||
            NAMING_DISPATCH_CENTRE_ALL;
        STATE.filteredStations = STATE.stations.filter(station => {
            const stationTypeMatches =
                selectedType === 'ALL' || station.stationType === selectedType;
            return stationTypeMatches &&
                stationMatchesNamingService(station, selectedService) &&
                stationMatchesNamingDispatchCentre(station, selectedDispatchCentre);
        });
        select.innerHTML = '';
        if (!STATE.filteredStations.length) {
            select.innerHTML = `<option value="">No matching stations found</option>`;
            setProgress(0, 0);
            return;
        }
        const firstOption = document.createElement('option');
        firstOption.value = STATE.filteredStations[0].href;
        firstOption.textContent = 'Start from first matching station';
        select.appendChild(firstOption);
        STATE.filteredStations.forEach(station => {
            const option = document.createElement('option');
            option.value = station.href;
            option.textContent = `${station.displayName} [${STATION_TYPES[station.stationType] || station.stationType}]`;
            select.appendChild(option);
        });
        setProgress(0, STATE.filteredStations.length);
    }
    window.__NEXUS_RENAME_BUILDING__ = async function(id) {
        if(!/^\d+$/.test(String(id)))throw Error('Invalid station');
        if(STATE.running||PERSONNEL_STATE.running||STATION_STATE.running)throw Error('Finish the current naming or personnel operation first');
        if(!document.querySelector('#mc-namer-panel'))throw Error('Open Nexus tools on the main game page first');
        await refreshStations();
        if(STATE.running||PERSONNEL_STATE.running||STATION_STATE.running)throw Error('Another operation started; try again when it finishes');
        const station=STATE.stations.find(s=>String(s.buildingId)===String(id));
        if(!station)throw Error('Station not found in your station list');
        STATE.filteredStations=[station];
        const select=document.querySelector('#mc-namer-startfrom');select.replaceChildren(new Option(station.displayName,station.href));select.value=station.href;
        document.querySelector('#mc-namer-mode').value='single';
        document.querySelector('#mc-namer-unit-class').value='ALL';
        switchToolTab('unit');setPanelCollapsed(false);startRun();
    };
    function startRun() {
        if (namingInventoryPromise || !namingInventory || namingPlayer() !== namingInventoryPlayer) {
            log('Wait for the station list to finish, or use Refresh Stations if loading failed.', 'error');return;
        }
        if (PERSONNEL_STATE.running) {
            log('Personnel Assignment is currently running. Stop it before starting Unit Naming.', 'error');
            return;
        }
        if (STATION_STATE.running) {
            log('Station Naming is currently running. Stop it before starting Unit Naming.', 'error');
            return;
        }
        if (STATE.running) {
            log('Already running.', 'debug');
            return;
        }
        if (!STATE.filteredStations.length) {
            log('No matching stations loaded. Press Refresh Stations first.', 'error');
            return;
        }
        const selectedHref = document.querySelector('#mc-namer-startfrom').value;
        const startIndex = STATE.filteredStations.findIndex(station => station.href === selectedHref);
        if (startIndex < 0) {
            log(`Selected start station not found: ${selectedHref}`, 'error');
            return;
        }
        STATE.mode = document.querySelector('#mc-namer-mode')?.value || 'all';
        STATE.selectedUnitClass = getSelectedUnitClass();
        STATE.running = true;
        STATE.paused = false;
        STATE.stopped = false;
        STATE.stationIndex = startIndex;
        STATE.renamedCount = 0;
        STATE.skippedCount = 0;
        const runId = ++STATE.runId;
        updateCounters();
        document.querySelector('#mc-namer-pause').textContent = 'Pause';
        log(`Mode: ${STATE.mode === 'single' ? 'Selected station only' : 'All matching stations'}`, 'info');
        log(`Station type: ${STATION_TYPES[document.querySelector('#mc-namer-station-type').value]}`, 'info');
        log(`Unit class: ${getUnitClassDisplayLabel(STATE.selectedUnitClass)}`, 'info');
        log(`Starting from: ${STATE.filteredStations[startIndex].displayName}`, 'info');
        processStations(runId).catch(error => {
            if (runId !== STATE.runId) return;
            log(`Unit Naming stopped after an unexpected error: ${error?.message || error}`, 'error');
            debug(error?.stack || String(error));
            STATE.stopped = true;
            setStatus('Error');
        });
    }
    function togglePause() {
        if (!STATE.running) return;
        STATE.paused = !STATE.paused;
        document.querySelector('#mc-namer-pause').textContent = STATE.paused ? 'Resume' : 'Pause';
        setStatus(STATE.paused ? 'Paused' : 'Running');
        log(STATE.paused ? 'Paused.' : 'Resumed.', 'debug');
    }
    function stopRun() {
        if (!STATE.running) return;
        STATE.stopped = true;
        STATE.paused = false;
        for (const controller of STATE.activeControllers) {
            try {
                controller.abort();
            } catch (_error) {}
        }
        STATE.activeControllers.clear();
        document.querySelector('#mc-namer-pause').textContent = 'Pause';
        setStatus('Stopping...');
        log('Stop requested. Active Unit Naming requests were cancelled.', 'error');
    }
    function toggleDebug() {
        STATE.debug = !STATE.debug;
        document.querySelector('#mc-namer-debug').textContent = STATE.debug ? 'Debug: ON' : 'Debug: OFF';
        log(`Debug ${STATE.debug ? 'enabled' : 'disabled'}.`, 'debug');
    }
    function clearLog() {
        clearBoundedToolLog(getToolElementById('mc-namer-log'));
    }
    async function processStations(runId) {
        try {
            while (STATE.stationIndex < STATE.filteredStations.length) {
                if (STATE.stopped || runId !== STATE.runId) break;
                await waitIfPaused(runId);
                if (STATE.stopped || runId !== STATE.runId) break;
                const station = STATE.filteredStations[STATE.stationIndex];
                setStatus('Reading station in background');
                setStation(station.displayName);
                setVehicle('None');
                setProgress(STATE.stationIndex, STATE.filteredStations.length);
                log(`Station: ${station.displayName}`, 'station');
                try {
                    const stationPage = await unitFetchDocument(station.href, 12000);
                    const expectedBuildingId = String(
                        station.buildingId || getBuildingIdFromHref(station.href)
                    );
                    const returnedBuildingId = getBuildingIdFromHref(stationPage.href);
                    if (!expectedBuildingId || returnedBuildingId !== expectedBuildingId) {
                        throw new Error(
                            `Station read returned building ${returnedBuildingId || 'none'}; expected ${expectedBuildingId || 'unknown'}.`
                        );
                    }
                    if (!stationPage.doc.querySelector('#vehicle_table')) {
                        throw new Error('The station vehicle table was not returned.');
                    }
                    const namingController = new AbortController();
                    STATE.activeControllers.add(namingController);
                    try {
                        const base = await globalThis.NexusNaming.resolveBase(station.displayName, station.buildingId, extractCoordinatesFromStationDocument(stationPage.doc), {signal:namingController.signal});
                        station.callsignBase = createCallsignBase(base);
                    } finally { STATE.activeControllers.delete(namingController); }
                    if (STATE.stopped || runId !== STATE.runId) break;
                    await processStationVehicleQueue(stationPage.doc, station);
                } catch (error) {
                    if (STATE.stopped && error?.name === 'AbortError') break;
                    log(`Station skipped: ${station.displayName} — ${error?.message || error}`, 'error');
                    debug(error?.stack || String(error));
                    STATE.skippedCount++;
                    updateCounters();
                }
                if (STATE.mode === 'single') {
                    log('Single station mode complete.', 'done');
                    break;
                }
                STATE.stationIndex++;
            }
        } finally {
            if (runId !== STATE.runId) return;
            STATE.running = false;
            STATE.paused = false;
            document.querySelector('#mc-namer-pause').textContent = 'Pause';
            if (STATE.stopped) {
                setStatus('Stopped');
                log(`Stopped. Renamed ${STATE.renamedCount}. Skipped ${STATE.skippedCount}.`, 'error');
            } else {
                setStatus('Finished');
                setStation('None');
                setVehicle('None');
                setProgress(
                    STATE.mode === 'single' ? 1 : STATE.filteredStations.length,
                    STATE.mode === 'single' ? 1 : STATE.filteredStations.length
                );
                log(`Finished. Renamed ${STATE.renamedCount}. Skipped ${STATE.skippedCount}.`, 'done');
            }
        }
    }
    function getVehicleQueueFromTable(doc) {
        return [...doc.querySelectorAll('#vehicle_table tbody tr')]
            .map((row, index) => {
                const img = row.querySelector('img[vehicle_type_id]');
                const vehicleTypeId = img?.getAttribute('vehicle_type_id') || '';
                const vehicleType = TYPE_ID_TO_VEHICLE_TYPE[vehicleTypeId] || '';
                const allLinks = [...row.querySelectorAll('a[href^="/vehicles/"]')];
                const editLink = allLinks.find(a => {
                    const href = a.getAttribute('href') || '';
                    return href.endsWith('/edit');
                });
                const vehicleLink = allLinks.find(a => {
                    const href = a.getAttribute('href') || '';
                    return !href.endsWith('/edit') && !href.includes('/zuweisung');
                });
                const vehicleHref = vehicleLink?.getAttribute('href') || '';
                const editHref = editLink?.getAttribute('href') || '';
                const vehicleId = getVehicleIdFromHref(editHref || vehicleHref);
                const currentName = cleanText(vehicleLink?.textContent || '');
                return {
                    tableIndex: index,
                    vehicleId,
                    vehicleTypeId,
                    vehicleType,
                    currentName,
                    vehicleHref,
                    editHref
                };
            })
            .filter(v => v.editHref && v.vehicleId)
            .filter(vehicleMatchesSelectedUnitClass);
    }
    async function processStationVehicleQueue(stationDoc, station) {
        setStatus('Building vehicle queue');
        const queue = getVehicleQueueFromTable(stationDoc);
        debug(`Vehicle queue built for ${station.displayName}: ${queue.length}`);
        if (!queue.length) {
            log(`No ${getUnitClassDisplayLabel(STATE.selectedUnitClass)} vehicles found in ${station.displayName}.`, 'debug');
            return;
        }
        const counts = {};
        for (const item of queue) {
            if (STATE.stopped) return;
            await waitIfPaused();
            if (STATE.stopped) return;
            if (!item.vehicleType) {
                log(`Unknown vehicle_type_id skipped: ${item.vehicleTypeId} | ${item.editHref}`, 'error');
                STATE.skippedCount++;
                updateCounters();
                continue;
            }
            const info = VEHICLE_INFO[item.vehicleType];
            if (!info) {
                log(`No naming rule skipped: "${item.vehicleType}"`, 'error');
                STATE.skippedCount++;
                updateCounters();
                continue;
            }
            counts[item.vehicleType] = (counts[item.vehicleType] || 0) + 1;
            const newName = makeVehicleName(
                station,
                item.vehicleType,
                counts[item.vehicleType]
            );
            setStatus('Reading vehicle edit form');
            setVehicle(item.editHref);
            try {
                const editPage = await unitFetchDocument(item.editHref, 12000);
                if (getVehicleIdFromHref(editPage.href) !== String(item.vehicleId)) {
                    throw new Error('Vehicle edit request returned a different vehicle ID.');
                }
                const expectedAction = item.editHref.replace(/\/edit(?:\?.*)?$/, '');
                const prepared = prepareBackgroundNativeForm(editPage.doc, {
                    expectedAction,
                    inputSelector: '#vehicle_caption',
                    requiredMethodOverride: 'patch',
                    submitSelector: 'input[type="submit"][value="Save"], button[type="submit"]',
                    value: newName,
                    resourceLabel: `vehicle ${item.vehicleId}`
                });
                const before = String(prepared.input.value || '').trim();
                if (before === newName) {
                    log(`Already correct: ${newName}`, 'info');
                    STATE.skippedCount++;
                    updateCounters();
                    continue;
                }
                setStatus('Saving vehicle in background');
                setVehicle(newName);
                log(`BEFORE: ${before}`, 'before');
                log(`AFTER : ${newName}`, 'after');
                await submitBackgroundNativeForm(
                    unitFetchWithTimeout,
                    prepared,
                    12000
                );
                const saved = await verifyUnitNameSaved(
                    item.editHref,
                    item.vehicleId,
                    newName
                );
                if (!saved) {
                    throw new Error('Save could not be verified; this vehicle was not counted as renamed.');
                }
                STATE.renamedCount++;
                updateCounters();
                log(`Saved and verified: ${newName}`, 'done');
            } catch (error) {
                if (STATE.stopped && error?.name === 'AbortError') return;
                log(`Vehicle skipped ${item.editHref}: ${error?.message || error}`, 'error');
                debug(error?.stack || String(error));
                STATE.skippedCount++;
                updateCounters();
            }
            if (!STATE.stopped) await sleep(250);
        }
    }
    async function waitIfPaused(runId = STATE.runId) {
        while (STATE.paused && !STATE.stopped && runId === STATE.runId) {
            await sleep(300);
        }
    }
    function setStatus(text) {
        const el = getToolElementById('mc-namer-status');
        if (el) el.textContent = text;
    }
    function setStation(text) {
        const el = getToolElementById('mc-namer-station');
        if (el) el.textContent = text;
    }
    function setVehicle(text) {
        const el = getToolElementById('mc-namer-vehicle');
        if (el) el.textContent = text;
    }
    function setProgress(done, total) {
        const el = getToolElementById('mc-namer-progress');
        if (el) el.textContent = `${done} / ${total}`;
    }
    function updateCounters() {
        const renamed = getToolElementById('mc-namer-renamed');
        const skipped = getToolElementById('mc-namer-skipped');
        if (renamed) renamed.textContent = String(STATE.renamedCount);
        if (skipped) skipped.textContent = String(STATE.skippedCount);
    }
    function log(message, type = 'info') {
        const logBox = getToolElementById('mc-namer-log');
        if (!logBox) return;
        const line = document.createElement('div');
        line.className = `mc-log-${type}`;
        line.textContent = message;
        appendBoundedToolLog(logBox, line);
    }
    function debug(message) {
        if (!STATE.debug) return;
        log(`[DEBUG] ${message}`, 'debug');
    }
    const handlePersonnelRegistryStorage = event => {
        if (event?.key !== PERSONNEL_TRAINING_REGISTRY_STORAGE_KEY) return;
        if (PERSONNEL_TRAINING_REGISTRY_DIRTY || PERSONNEL_REGISTER_PENDING_IDS) return;
        PERSONNEL_TRAINING_REGISTRY_CACHE = null;
    };
    const handleToolPageHide = event => {
        flushPersonnelTrainingRegistry(true);
        if (event?.persisted) return;
        runToolLifecycleCleanup();
    };
    window.addEventListener('storage', handlePersonnelRegistryStorage);
    window.addEventListener('pagehide', handleToolPageHide);
    registerToolLifecycleCleanup(() => {
        window.removeEventListener('storage', handlePersonnelRegistryStorage);
        window.removeEventListener('pagehide', handleToolPageHide);
    });
    for (const tab of ['unit','station','personnel']) {
        const select = () => { switchToolTab(tab); setPanelCollapsed(false, false); };
        window.addEventListener('nexus:renamer-select-'+tab, select);
        registerToolLifecycleCleanup(() => window.removeEventListener('nexus:renamer-select-'+tab, select));
    }
    const openFromTools = () => {
        const toolsHost = document.getElementById('nexus-native-tools');
        if (!document.documentElement.hasAttribute('data-nexus-renamer-requested') ||
            !toolsHost?.shadowRoot?.querySelector('#renamerView slot[name="nexus-renamer"]')) return;
        if (!ensureSingleNamingToolsPanel()) init(toolsHost);
        else window.dispatchEvent(new Event('nexus:renamer-ready'));
    };
    window.addEventListener('nexus:register-open', openPersonnelRegister);
    registerToolLifecycleCleanup(() => window.removeEventListener('nexus:register-open', openPersonnelRegister));
    openPersonnelRegister();
    window.addEventListener('nexus:renamer-open', openFromTools);
    registerToolLifecycleCleanup(() => window.removeEventListener('nexus:renamer-open', openFromTools));
    if (document.documentElement.hasAttribute('data-nexus-renamer-requested')) openFromTools();
})();
