import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const runtime = fs.readFileSync(path.join(root, 'nexus-runtime.js'), 'utf8');
const settingsMain = fs.readFileSync(path.join(root, 'nexus-settings-main.js'), 'utf8');
const settingsIsolated = fs.readFileSync(path.join(root, 'nexus-settings.js'), 'utf8');

assert.equal(manifest.version, '3.0.43.189', 'extension version must be 3.0.43.151');
assert.ok(runtime.includes("const MISSION_FINDER_VERSION = '10.6.191';"), 'Mission Finder must increase for live type-5 stand-down monitoring');

for (const source of [settingsMain, settingsIsolated]) {
  assert.ok(source.includes("['autoReleaseAmbulance', 'Mission control', 'Auto release surplus Ambulances (Type 5 only; CFR stays on scene)', 'mf_auto_release_surplus_ambulances_v1', false]"), 'Settings must expose the default-off type-5-only stand-down toggle');
}

assert.ok(runtime.includes("const MF_AUTO_RELEASE_SURPLUS_AMBULANCES_KEY =\n        'mf_auto_release_surplus_ambulances_v1';"), 'runtime must use the same persisted setting key');
assert.ok(runtime.includes("directTypeValues.includes('5')"), 'direct MissionChief type 5 must be eligible');
assert.ok(runtime.includes("registeredType === '5'"), 'Personnel Register type 5 must be eligible');
assert.ok(runtime.includes("return typeLabel === 'ambulance';"), 'exact native Ambulance label may identify type 5 when numeric metadata is absent');
assert.ok(!runtime.slice(runtime.indexOf('function isOrdinaryAmbulanceOnSceneRow'), runtime.indexOf('function getAutoReleaseOrdinaryAmbulanceRows')).includes("'22'"), 'Community First Responder type 22 must not be considered releasable');

assert.ok(runtime.includes("#mission_vehicle_at_mission tr[id^=\"vehicle_row\"]"), 'only on-scene vehicle rows must be considered');
assert.ok(runtime.includes('getAttendedPatientAmbulanceSummary(roots)'), 'live Ambulance/Critical Care shortages must be checked before release');
assert.ok(runtime.includes('if (liveShortage.count > 0) return;'), 'live patient shortage must block automatic stand-down');
assert.ok(runtime.includes('getAutoReleasePatientLinkedVehicleIds(roots)'), 'vehicles linked to current patient cards must be protected');
assert.ok(runtime.includes('const surplus = Math.max(0, ambulances.length - patientState.count);'), 'surplus must be calculated from current patients versus on-scene type-5 Ambulances');
assert.ok(runtime.includes('!patientLinkedIds.has(item.id)'), 'patient-linked Ambulances must never be selected for stand-down');
assert.ok(runtime.includes('url.pathname !== `/vehicles/${item.id}/backalarm`'), 'stand-down must validate MissionChief native backalarm route');
assert.ok(runtime.includes("url.searchParams.get('return') !== 'mission'"), 'stand-down must stay scoped to return=mission');
assert.ok(runtime.includes("headers: { 'X-Requested-With': 'XMLHttpRequest' }"), 'stand-down must follow MissionChief AJAX semantics');
assert.ok(runtime.includes('}, 4000);'), 'monitor must use a bounded 4-second safety interval');
assert.ok(runtime.includes("scheduleAutoReleaseSurplusAmbulanceCheck('patient or mission DOM changed')"), 'existing mission mutation lifecycle must also trigger a prompt check');
assert.ok(runtime.includes('stopAutoReleaseSurplusAmbulanceMonitor();'), 'monitor must be released by runtime lifecycle cleanup');

console.log('PASS: 3.0.43.151 adds a default-off automatic stand-down that only returns surplus exact type-5 Ambulances, preserves CFR type 22, blocks while patient shortages remain, and protects patient-linked units.');
