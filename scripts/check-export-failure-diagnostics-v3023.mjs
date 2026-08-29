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

console.log('V3.0.23 export failure diagnostics, pop-out cascades and minimum ambulance checks passed.');
