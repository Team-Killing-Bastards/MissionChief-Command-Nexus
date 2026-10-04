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
assert.match(runtime, /const MASS_CASUALTY_THRESHOLD_ENABLED_KEY = 'mf_mass_casualty_equipment_threshold_enabled_v1';/);
assert.match(runtime, /const MASS_CASUALTY_THRESHOLD_KEY = 'mf_mass_casualty_equipment_threshold_v1';/);
assert.match(runtime, /const MASS_CASUALTY_AMBULANCE_THRESHOLD_DEFAULT = 20;/);
assert.match(runtime, /return raw == null \? true : raw === 'true';/, 'MCE assist must default ON to preserve the existing rule');
assert.match(runtime, /if \(!isMassCasualtyEquipmentThresholdEnabled\(\)\) return false;/, 'toggle must gate only the automatic threshold assist');
assert.match(runtime, /if \(thresholdAmbulanceDemand <= threshold \|\| selectedMce > 0\) return false;/, 'MCE must use uncapped Ambulance demand when available and never duplicate an existing MCE');
assert.match(runtime, /MASS_CASUALTY_EQUIPMENT_TYPE_ID = '33'/, 'automatic MCE must remain exact MissionChief vehicle type 33');
assert.match(runtime, /adding exactly one type-33 Mass Casualty Equipment/, 'automatic rule must still select exactly one MCE');

for (const [name, settings] of [['MAIN', settingsMain], ['ISOLATED', settingsIsolated]]) {
  const officer = settings.indexOf("['officerThreshold'");
  const missionLimitEnabled = settings.indexOf("['ambulanceMissionLimitEnabled'");
  const missionLimit = settings.indexOf("['ambulanceMissionLimit'");
  const enabled = settings.indexOf("['massCasualtyEnabled'");
  const threshold = settings.indexOf("['massCasualtyThreshold'");
  assert.ok(
    officer >= 0 &&
    missionLimitEnabled > officer &&
    missionLimit > missionLimitEnabled &&
    enabled > missionLimit &&
    threshold > enabled,
    `${name}: Ambulance mission-limit controls must sit after Ambulance Officer and before MCE controls`
  );
  assert.match(settings, /\['massCasualtyEnabled', 'Mission control', 'Automatically include 1 Mass Casualty Equipment', 'mf_mass_casualty_equipment_threshold_enabled_v1', true\]/);
  assert.match(settings, /\['massCasualtyThreshold', 'Mission control', 'Mass Casualty Equipment when Ambulances exceed', 'mf_mass_casualty_equipment_threshold_v1', 20, 0, 99\]/);
}


const blockStart = runtime.indexOf('function normaliseMassCasualtyAmbulanceThreshold(value)');
const blockEnd = runtime.indexOf('function prisonerReleaseSuccessKey(', blockStart);
assert.ok(blockStart > 0 && blockEnd > blockStart, 'MCE threshold implementation block must be locatable');
const block = runtime.slice(blockStart, blockEnd);

function runAssist({ enabled = true, threshold = 20, ambulances = 21, uncappedDemand = 0, alreadySelectedMce = false } = {}) {
  const storage = new Map([
    ['mf_mass_casualty_equipment_threshold_enabled_v1', String(enabled)],
    ['mf_mass_casualty_equipment_threshold_v1', String(threshold)],
  ]);
  let clicks = 0;
  const boxes = Array.from({ length: ambulances }, () => ({ checked: true, type: '5', click() {} }));
  boxes.push({ checked: alreadySelectedMce, type: '33', click() { clicks++; this.checked = true; } });
  const context = vm.createContext({
    MASS_CASUALTY_THRESHOLD_ENABLED_KEY: 'mf_mass_casualty_equipment_threshold_enabled_v1',
    MASS_CASUALTY_THRESHOLD_KEY: 'mf_mass_casualty_equipment_threshold_v1',
    MASS_CASUALTY_AMBULANCE_THRESHOLD_DEFAULT: 20,
    MASS_CASUALTY_AMBULANCE_THRESHOLD_MIN: 0,
    MASS_CASUALTY_AMBULANCE_THRESHOLD_MAX: 99,
    MASS_CASUALTY_EQUIPMENT_TYPE_ID: '33',
    NORMAL_AMBULANCE_TYPE_ID: '5',
    VEHICLE_RULE_HISTORY_LIMIT: 40,
    localStorage: { getItem: key => storage.has(key) ? storage.get(key) : null },
    state: {
      wanted: true, stopping: false, currentMissionName: 'Threshold test',
      massCasualtyThresholdLastMissionId: '', massCasualtyThresholdLastAmbulanceCount: 0,
      massCasualtyThresholdAttempts: 0, massCasualtyThresholdHistory: [],
    },
    isMissionUrl: () => true,
    missionIdFromUrl: () => '123',
    mapMissionCandidate: () => ({ actionKind: 'NEW', missingText: '' }),
    normaliseText: value => String(value || '').trim(),
    vehicleCheckboxesForRules: () => boxes,
    exactVehicleTypeCheckbox: (input, id) => String(input.type) === String(id),
    isUsableRuleVehicleCheckbox: input => !input.checked,
    mfGetRecordedUncappedAmbulanceDemand: () => uncappedDemand,
    nowIso: () => '2026-09-20T10:00:00.000Z',
    missionNameForId: () => 'Threshold test',
    missionDisplay: (_id, name) => name,
    setPhase: () => {},
    log: () => {},
  });
  vm.runInContext(`${block}\nglobalThis.__run = maybeApplyMassCasualtyEquipmentThreshold;`, context);
  return { result: context.__run({}, '/missions/123', {}), clicks, state: context.state };
}

assert.equal(runAssist({ ambulances: 20 }).clicks, 0, 'threshold 20 must not add MCE at exactly 20 Ambulances');
assert.equal(runAssist({ ambulances: 21 }).clicks, 1, 'threshold 20 must add exactly one MCE above 20 Ambulances');
assert.equal(
  runAssist({ ambulances: 20, uncappedDemand: 77 }).clicks,
  1,
  'an Ambulance mission cap must not suppress MCE when the uncapped demand is above the threshold'
);
assert.equal(runAssist({ ambulances: 50, alreadySelectedMce: true }).clicks, 0, 'an already-selected MCE must prevent a duplicate');
assert.equal(runAssist({ enabled: false, ambulances: 50 }).clicks, 0, 'OFF toggle must disable the automatic threshold assist');
assert.equal(runAssist({ threshold: 30, ambulances: 30 }).clicks, 0, 'custom threshold must be honoured at the boundary');
assert.equal(runAssist({ threshold: 30, ambulances: 31 }).clicks, 1, 'custom threshold must add one MCE above the configured number');

// Explicit game/patient MCE mapping must remain present regardless of the optional threshold assist.
assert.match(runtime, /unitName:\s*'Mass Casualty Equipment'/);
assert.match(runtime, /maximum:\s*1/);

console.log('PASS: 3.0.43.151 keeps exact type-33 MCE dispatch, adds ON/OFF + threshold 20 settings, and prevents duplicates.');
