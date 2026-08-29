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

if (source.includes('ensureAutoMinimumAmbulanceSelected') || source.includes('mandatory minimum ambulance')) {
  console.error('Global every-mission Ambulance enforcement must remain removed.');
  process.exit(1);
}
const ordinaryAmbulanceFilterCalls = source.match(/filterKnownUnstaffedAmbulanceCandidates\(/g) || [];
if (ordinaryAmbulanceFilterCalls.length !== 1 || source.includes("'ordinary-ambulance-demand'") || source.includes("'mission-upgrade-any-vehicle'")) {
  console.error('Ordinary type-5 Ambulances must not be gated by the trained-personnel register.');
  process.exit(1);
}

console.log('Export failure diagnostics, pop-out cascades and scoped Ambulance checks passed.');
