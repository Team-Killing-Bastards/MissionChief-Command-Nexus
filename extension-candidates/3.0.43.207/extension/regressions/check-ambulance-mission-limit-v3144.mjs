import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const runtime = fs.readFileSync(path.join(root, 'nexus-runtime.js'), 'utf8');
const settingsMain = fs.readFileSync(path.join(root, 'nexus-settings-main.js'), 'utf8');
const settingsIsolated = fs.readFileSync(path.join(root, 'nexus-settings.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

assert.equal(manifest.version, '3.0.43.189');
assert.match(runtime, /const MISSION_FINDER_VERSION = '10\.6\.191';/);
assert.match(runtime, /MF_AMBULANCE_MISSION_LIMIT_ENABLED_KEY\s*=\s*\n\s*'mf_ambulance_mission_limit_enabled_v1'/);
assert.match(runtime, /MF_AMBULANCE_MISSION_LIMIT_KEY\s*=\s*\n\s*'mf_ambulance_mission_limit_v1'/);
assert.match(runtime, /MF_AMBULANCE_MISSION_LIMIT_DEFAULT = 20;/);
assert.match(runtime, /MF_AMBULANCE_MISSION_LEDGER_KEY\s*=\s*\n\s*'mf_ambulance_mission_allocation_ledger_v1'/);
assert.match(runtime, /sessionStorage\.setItem\(\s*MF_AMBULANCE_MISSION_LEDGER_KEY/);
assert.match(runtime, /#mission_vehicle_at_mission tr\[id\^="vehicle_row"\], '\s*\+\s*'#mission_vehicle_driving tr\[id\^="vehicle_row"\]'/);
assert.match(runtime, /mfApplyAmbulanceMissionLimitToSelectionAmount\(\s*originalName,\s*mappedName,\s*required\s*\)/);
assert.ok(
  (runtime.match(/mfApplyAmbulanceMissionLimitToEffectiveRequired\(/g) || []).length >= 5,
  'fresh Unit Finder, patient, late-patient and Mission Update paths must all use the mission limit'
);
assert.match(runtime, /mfCommitSelectedAmbulancesToMissionLedger\(\s*'nexus-dispatch-action'\s*\)/);
assert.match(runtime, /mfCommitSelectedAmbulancesToMissionLedger\(\s*'dispatch-click'\s*\)/);
assert.match(runtime, /mfGetRecordedUncappedAmbulanceDemand\(missionId\)/, 'MCE threshold must retain uncapped Ambulance demand');

for (const [name, settings] of [['MAIN', settingsMain], ['ISOLATED', settingsIsolated]]) {
  const officer = settings.indexOf("['officerThreshold'");
  const enabled = settings.indexOf("['ambulanceMissionLimitEnabled'");
  const limit = settings.indexOf("['ambulanceMissionLimit'");
  const mce = settings.indexOf("['massCasualtyEnabled'");
  assert.ok(officer >= 0 && enabled > officer && limit > enabled && mce > limit, `${name}: mission limit settings must be under Ambulance Officer and before MCE`);
  assert.match(settings, /\['ambulanceMissionLimitEnabled', 'Mission control', 'Limit Ambulances per mission', 'mf_ambulance_mission_limit_enabled_v1', false\]/);
  assert.match(settings, /\['ambulanceMissionLimit', 'Mission control', 'Maximum Ambulances per mission', 'mf_ambulance_mission_limit_v1', 20, 1, 99\]/);
}

const blockStart = runtime.indexOf("    let mfUncappedAmbulanceDemandMissionId = '';");
const blockEnd = runtime.indexOf('    function isStandardAmbulanceEtaVehicleCheckbox', blockStart);
assert.ok(blockStart > 0 && blockEnd > blockStart, 'Ambulance mission-limit implementation block must be locatable');
const block = runtime.slice(blockStart, blockEnd);

const local = new Map([
  ['mf_ambulance_mission_limit_enabled_v1', 'true'],
  ['mf_ambulance_mission_limit_v1', '20'],
]);
const session = new Map();
let missionId = '123';
let selectedBoxes = [];
let observedRows = [{ id: 'vehicle_row_9001', type: '5' }];

const missionDoc = {
  location: { pathname: '/missions/123' },
  querySelectorAll(selector) {
    if (selector.includes('#mission_vehicle_at_mission') || selector.includes('#mission_vehicle_driving')) return observedRows;
    return [];
  },
};

const context = vm.createContext({
  MF_AMBULANCE_MISSION_LIMIT_ENABLED_KEY: 'mf_ambulance_mission_limit_enabled_v1',
  MF_AMBULANCE_MISSION_LIMIT_KEY: 'mf_ambulance_mission_limit_v1',
  MF_AMBULANCE_MISSION_LIMIT_DEFAULT: 20,
  MF_AMBULANCE_MISSION_LIMIT_MIN: 1,
  MF_AMBULANCE_MISSION_LIMIT_MAX: 99,
  MF_AMBULANCE_MISSION_LEDGER_KEY: 'mf_ambulance_mission_allocation_ledger_v1',
  MF_AMBULANCE_MISSION_LEDGER_TTL_MS: 48 * 60 * 60 * 1000,
  MF_AMBULANCE_MISSION_LEDGER_MAX_MISSIONS: 160,
  localStorage: {
    getItem: key => local.has(key) ? local.get(key) : null,
    setItem: (key, value) => local.set(key, String(value)),
  },
  sessionStorage: {
    getItem: key => session.has(key) ? session.get(key) : null,
    setItem: (key, value) => session.set(key, String(value)),
  },
  isAmbulanceTransportRequest: (original, mapped) => {
    const values = [original, mapped].map(value => String(value || '').trim().toLowerCase());
    return values.some(value => value === 'ambulance' || value === 'ambulances' || value === 'ambulance x 01');
  },
  getCurrentMissionIdForQueueRestart: () => missionId,
  getCurrentMissionName: () => 'Mission limit test',
  getMissionAccessibleDocuments: () => [missionDoc],
  getMissionIdFromLocalScope: () => missionId,
  readPersonnelTrainingRegistry: () => ({ vehicles: {} }),
  isOrdinaryAmbulanceOnSceneRow: row => String(row?.type) === '5',
  getAutoReleaseMissionVehicleId: row => String(row?.id || '').match(/vehicle_row_?(\d+)/)?.[1] || '',
  getVehicleCheckboxSnapshot: () => selectedBoxes,
  isNormalAmbulanceVehicleCheckbox: input => String(input?.type) === '5',
  getMissionVehicleId: input => String(input?.vehicleId || ''),
  mfDebugEnabled: false,
  debugLog: () => {},
  mfV3DormantPreload: true,
  document: { addEventListener() {} },
});

vm.runInContext(`${block}
globalThis.__ambulanceLimitApi = {
  state: mfGetAmbulanceMissionLimitState,
  capAmount: mfApplyAmbulanceMissionLimitToSelectionAmount,
  capTarget: mfApplyAmbulanceMissionLimitToEffectiveRequired,
  commit: mfCommitSelectedAmbulancesToMissionLedger,
  demand: mfGetRecordedUncappedAmbulanceDemand
};`, context);

const api = context.__ambulanceLimitApi;

let state = api.state('Ambulance', 'Ambulance');
assert.equal(state.committedCount, 1, 'an already en-route/on-scene Type-5 Ambulance must be absorbed into the mission ledger');
assert.equal(state.remainingSlots, 19);

selectedBoxes = Array.from({ length: 19 }, (_, index) => ({
  checked: true,
  type: '5',
  vehicleId: String(9100 + index),
}));
state = api.state('Ambulance', 'Ambulance');
assert.equal(state.allocatedCount, 20, 'current selected Type-5 Ambulances plus committed Type-5 Ambulances must share the same cap');
assert.equal(state.remainingSlots, 0);
assert.equal(api.capAmount('Ambulance', 'Ambulance', 57).amount, 0, 'no extra Type-5 Ambulance may be selected once the cap is full');

api.commit('test-dispatch');
selectedBoxes = [];
observedRows = [];
state = api.state('Ambulance', 'Ambulance');
assert.equal(state.committedCount, 20, 'the allocation must survive when Ambulances leave the mission DOM for hospital transport');
assert.equal(state.remainingSlots, 0, 'transporting Ambulances must continue consuming their mission-lifetime slots');
assert.equal(api.capAmount('Ambulance', 'Ambulance', 57).amount, 0, 'Auto Mode/Mission Update must not replace hospital-bound Ambulances with new IDs');

observedRows = [
  { id: 'vehicle_row_9001', type: '5' },
  { id: 'vehicle_row_9100', type: '5' },
];
state = api.state('Ambulance', 'Ambulance');
assert.equal(state.committedCount, 20, 'returning the same Ambulance IDs must not consume new slots');

missionId = '124';
missionDoc.location.pathname = '/missions/124';
observedRows = [];
state = api.state('Ambulance', 'Ambulance');
assert.equal(state.committedCount, 0, 'allocation must be isolated per mission ID');
assert.equal(state.remainingSlots, 20);

selectedBoxes = [
  { checked: true, type: '33', vehicleId: '9901' },
  { checked: true, type: '34', vehicleId: '9902' },
];
state = api.state('Ambulance', 'Ambulance');
assert.equal(state.allocatedCount, 0, 'Mass Casualty Equipment and Ambulance Officer must not count toward the Type-5 cap');

const cappedTarget = api.capTarget('Ambulance', 'Ambulance', 77, 0);
assert.equal(cappedTarget.effectiveRequired, 20, 'an uncapped request for 77 must be reduced to the configured mission target of 20');
assert.equal(api.demand('124'), 77, 'the uncapped demand must still be retained for Ambulance Officer/MCE threshold rules');

local.set('mf_ambulance_mission_limit_enabled_v1', 'false');
assert.equal(api.capAmount('Ambulance', 'Ambulance', 57).amount, 57, 'turning the setting OFF must restore normal selection');
assert.equal(api.state('Ambulance', 'Ambulance'), null, 'OFF must disable the mission allocation cap');

console.log('PASS: 3.0.43.151 limits exact Type-5 Ambulances by unique mission-lifetime IDs, keeps hospital/returning Ambulances allocated, and leaves AO/MCE outside the cap.');
