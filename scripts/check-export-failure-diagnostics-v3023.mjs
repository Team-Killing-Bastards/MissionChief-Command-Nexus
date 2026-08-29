import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const required = [
  "const V2_UNIT_FINDER_DIAGNOSTICS_KEY = 'mf_unit_finder_diagnostics_v1';",
  'function buildRunFailureDiagnostics(missionValue, staffingFailures)',
  "fulfilment: 'unknown'",
  "mission.fulfilment = mission.selectedVehicleCount > 0 ? 'partially-fulfilled' : 'unfulfilled';",
  "mission.fulfilment = 'fully-fulfilled';",
  'stalledTransports,',
  'unresolvedMissions,',
  'currentBlocker:',
  'failureDiagnostics,',
  'function ensureAutoMinimumAmbulanceSelected(',
  "'minimum-ambulance-selection-block'",
  'mandatory minimum ambulance could not be selected',
  'function hydrateNamingInventoriesFromCurrentOverview()',
  'hydrateNamingInventoriesFromCurrentOverview();',
  'const MF_UNIT_FINDER_DIAGNOSTICS_LIMIT = 120;',
];

const missing = required.filter(token => !source.includes(token));
if (missing.length) {
  console.error('Missing V3.0.23 diagnostics/naming/ambulance guards:');
  missing.forEach(token => console.error(`- ${token}`));
  process.exit(1);
}

const minimumAmbulanceCalls = source.match(/await ensureAutoMinimumAmbulanceSelected\(/g) || [];
if (minimumAmbulanceCalls.length < 2) {
  console.error('Minimum ambulance guard must run after selection and immediately before dispatch.');
  process.exit(1);
}

const minimumAmbulanceStart = source.indexOf('function ensureAutoMinimumAmbulanceSelected(');
const minimumAmbulanceEnd = source.indexOf('function getAutoMemoryHeapSnapshot(', minimumAmbulanceStart);
const minimumAmbulance = source.slice(minimumAmbulanceStart, minimumAmbulanceEnd);
if (!minimumAmbulance.includes('getVehicleCheckboxSnapshot(true).find(input=>!input.disabled&&!input.checked&&isNormalAmbulanceVehicleCheckbox(input))')) {
  console.error('Minimum ambulance gate must select through the exact type-5 Any vehicle route.');
  process.exit(1);
}
if (minimumAmbulance.includes('filterKnownUnstaffedAmbulanceCandidates') || minimumAmbulance.includes("selectVehicleUnits('Ambulance','Ambulance x 01'")) {
  console.error('Minimum ambulance gate must not re-enter the mixed type-5/type-9 patient route.');
  process.exit(1);
}
const ordinaryAmbulanceFilterCalls = source.match(/filterKnownUnstaffedAmbulanceCandidates\(/g) || [];
if (ordinaryAmbulanceFilterCalls.length !== 1 || source.includes("'ordinary-ambulance-demand'") || source.includes("'mission-upgrade-any-vehicle'")) {
  console.error('Ordinary type-5 Ambulances must not be gated by the trained-personnel register.');
  process.exit(1);
}

console.log('V3.0.23 export failure diagnostics, pop-out cascades and minimum ambulance checks passed.');
