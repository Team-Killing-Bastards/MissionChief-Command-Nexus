/* Shared, allowlisted local preferences. No privileged API or game actions. */
(() => {
  'use strict';
  if (globalThis.NexusSettings) return;
  const key = 'nexusConveniencesV1';
  // A flag path preserves the original LSS-imported value until explicitly changed.
  const features = [
    ['currency', 'Credits & coins', 'Credits and coins dropdown'],
    ['dailyCredits', 'Credits & coins', 'Daily credit summary'],
    ['creditOverview', 'Credits & coins', 'Credit history chart'],
    ['missionRewards', 'Mission list', 'Estimated credits on mission cards'],
    ['listPatientTime', 'Mission list', 'Patient treatment time on mission cards', 'extendedCallList', 'remainingPatientTime'],
    ['generationDate', 'Mission window', 'Mission generation time', 'extendedCallWindow', 'generationDate'],
    ['oldMissionBorder', 'Mission window', 'Highlight older missions', 'extendedCallWindow', 'redBorder'],
    ['missingRequirements', 'Mission window', 'Missing requirements panel', 'extendedCallWindow', 'enhancedMissingVehicles'],
    ['requirementButtons', 'Mission window', 'Click missing vehicles to select units'],
    ['requirementTicks', 'Mission window', 'Blue ticks for selected and incoming units'],
    ['patientSummary', 'Mission window', 'Patient summary', 'extendedCallWindow', 'patientSummary'],
    ['patientTime', 'Mission window', 'Patient treatment time', 'extendedCallWindow', 'remainingPatientTime'],
    ['vehicleGroups', 'Mission window', 'Nexus vehicle group buttons'],
    ['vehicleTypes', 'Mission window', 'Vehicle type beside unit names', 'extendedCallWindow', 'vehicleTypeInList'],
    ['selectedCounter', 'Mission window', 'Selected unit and crew summary', 'extendedCallWindow', 'selectedVehicleCounter'],
    ['arrDetails', 'Mission window', 'Alarm and response plan details on hover', 'extendedCallWindow', 'arrSpecs'],
    ['commandBar', 'Mission window', 'Nexus dispatch and sharing toolbar'],
    ['schoolingFilters', 'Schooling', 'Course personnel filters'],
    ['crewRequirements', 'Buildings & personnel', 'Crew requirements and specialist coverage', 'extendedBuilding', 'personnelDemands'],
    ['extensions', 'Buildings & personnel', 'Building extension status cards', 'extendedBuilding', 'expansions'],
    ['personnelSummary', 'Buildings & personnel', 'Personnel and training summary', 'extendedBuilding', 'schoolingSummary'],
    ['assignedCrew', 'Buildings & personnel', 'Assigned crew counts beside vehicles'],
    ['buildingVehicleTypes', 'Buildings & personnel', 'Vehicle types in building lists', 'extendedBuilding', 'vehicleTypes'],
    ['assignmentLinks', 'Buildings & personnel', 'Assign crew shortcuts', 'extendedBuilding', 'personnelAssignmentBtn'],
    ['personnelFilters', 'Buildings & personnel', 'Personnel search and training filter', 'extendedBuilding', 'enhancedPersonnelAssignment'],
    ['fittingPersonnel', 'Buildings & personnel', 'Start with matching training filter enabled', 'extendedBuilding', 'enhancedPersonnelAssignment.toggleFittingPersonnel'],
    ['chatTime', 'Chat & profile', 'Chat timestamps', 'chatExtras', 'chatTime'],
    ['chatHighlight', 'Chat & profile', 'Highlight your chat messages', 'chatExtras', 'selfHighlight'],
    ['profileId', 'Chat & profile', 'Player ID on profiles']
  ].map(([id, group, label, module, flag]) => ({ id, group, label, module, flag }));
  const runtime = [
    ['keepPosition', 'Mission control', 'Keep my saved mission panel position', 'mf_keep_panel_position_v10_4_0', false],
    ['readyDelay', 'Mission control', 'Mission ready delay (milliseconds)', 'mf_mission_ready_delay_ms', 1000, 500, 15000],
    ['missingAmbulance', 'Mission control', 'Include one ambulance for high / very high risk missing persons', 'mf_high_risk_missing_person_ambulance_v1', false],
    ['officerEnabled', 'Mission control', 'Automatically include an Ambulance Officer', 'mf_ambulance_officer_threshold_enabled_v1', false],
    ['officerThreshold', 'Mission control', 'When required ambulances exceed', 'mf_ambulance_officer_threshold_v1', 5, 0, 99],
    ['queueRestart', 'Mission control', 'Queue restart', 'mf_next_queue_restart_enabled_v10', true],
    ['queueThreshold', 'Mission control', 'Queue restart threshold', 'mf_next_queue_restart_threshold_v10_1_3', 20, 1, 999],
    ['eventScanner', 'Event Scanner', 'Automatically collect mission event items', 'mf_event_scanner_enabled_v1', true]
  ].map(([id, group, label, key, fallback, min, max]) => ({id, group, label, key, fallback, min, max}));
  const transportKey = 'nexusManualTransportShortcutsV1';
  const transport = [
    {id:'autoOpenTransportRequest', label:'Open the first transport request'},
    {id:'autoClickSuccessBtns', label:'Jump to the next request after finishing'}
  ];
  function object(storageKey) {
    const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }
  function read() {
    const saved = object(key), result = {};
    for (const spec of features) if (typeof saved[spec.id] === 'boolean') result[spec.id] = saved[spec.id];
    return result;
  }
  // Features are a per-document snapshot: no storage reads in vehicle-row loops.
  let activeFeatures; try { activeFeatures = read(); } catch { activeFeatures = {}; }
  function enabled(id) { return activeFeatures[id] !== false; }
  function applyFlags(data) {
    if (!data?.flags) return; // Manual-only reference data is absent in Auto workers.
    const saved = activeFeatures;
    for (const spec of features) if (spec.module && typeof saved[spec.id] === 'boolean') {
      data.flags[spec.module] ||= {}; data.flags[spec.module][spec.flag] = saved[spec.id];
    }
  }
  function runtimeValue(spec) {
    const raw = localStorage.getItem(spec.key);
    if (raw === null) return spec.fallback;
    if (typeof spec.fallback === 'boolean') return raw === 'true' ? true : raw === 'false' ? false : spec.fallback;
    const value = Number(raw);
    return Number.isInteger(value) && value >= spec.min && value <= spec.max ? value : spec.fallback;
  }
  function snapshot(defaults) {
    const saved = read(), transports = object(transportKey);
    return {
      features: Object.fromEntries(features.map(spec => [spec.id, saved[spec.id] ?? (spec.module ? !!defaults?.[spec.module]?.[spec.flag] : true)])),
      runtime: Object.fromEntries(runtime.map(spec => [spec.id, runtimeValue(spec)])),
      transport: Object.fromEntries(transport.map(spec => [spec.id, typeof transports[spec.id] === 'boolean' ? transports[spec.id] : defaults?.enhancedTransportRequests?.[spec.id] !== false]))
    };
  }
  function save(values) {
    // Validate the complete draft before writing. Unknown keys never enter storage.
    const selected = {}, moves = {};
    for (const spec of features) { if (typeof values.features?.[spec.id] !== 'boolean') throw Error('Invalid feature setting'); selected[spec.id] = values.features[spec.id]; }
    for (const spec of transport) { if (typeof values.transport?.[spec.id] !== 'boolean') throw Error('Invalid transport setting'); moves[spec.id] = values.transport[spec.id]; }
    for (const spec of runtime) {
      const value = values.runtime?.[spec.id];
      if (typeof spec.fallback === 'boolean' ? typeof value !== 'boolean' : !Number.isInteger(value) || value < spec.min || value > spec.max) throw Error(`Check ${spec.label}`);
    }
    localStorage.setItem(key, JSON.stringify(selected));
    localStorage.setItem(transportKey, JSON.stringify(moves));
    for (const spec of runtime) localStorage.setItem(spec.key, String(values.runtime[spec.id]));
    // Prevent the historical default-delay migration overwriting a deliberate new choice.
    localStorage.setItem('mf_ready_delay_10_6_58_migrated', 'true');
    window.dispatchEvent(new Event('nexus:settings-saved'));
  }
  globalThis.NexusSettings = Object.freeze({ features, runtime, transport, key, transportKey, read, enabled, applyFlags, snapshot, save });
})();
