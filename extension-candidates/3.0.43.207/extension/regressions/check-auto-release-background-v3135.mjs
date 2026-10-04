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
assert.ok(runtime.includes("const MISSION_FINDER_VERSION = '10.6.191';"), 'Mission Finder must increase for independent background release monitoring');

for (const source of [settingsMain, settingsIsolated]) {
  assert.ok(source.includes("['autoReleaseAmbulance', 'Mission control', 'Auto release surplus Ambulances (Type 5 only; CFR stays on scene)', 'mf_auto_release_surplus_ambulances_v1', false]"), 'existing default-off setting must be retained');
}

assert.ok(runtime.includes('const MF_AUTO_RELEASE_BACKGROUND_SCAN_INTERVAL_MS = 3000;'), 'background scanner must use a bounded three-second scheduler');
assert.ok(runtime.includes('const MF_AUTO_RELEASE_BACKGROUND_MISSION_COOLDOWN_MS = 15000;'), 'the same mission must not be hammered more often than every 15 seconds');
assert.ok(runtime.includes('const MF_AUTO_RELEASE_BACKGROUND_RELEASE_TTL_MS = 60000;'), 'recent released vehicle IDs must be deduplicated while MissionChief catches up');
assert.ok(runtime.includes('async function collectAutoReleaseBackgroundMissionCandidates()'), 'background mission candidate collection must exist');
assert.ok(runtime.includes('loadAutoReleaseBackgroundMissionCandidatesFromFleet'), 'background worker must discover assigned missions independently of Auto Mode queue ownership');

assert.ok(runtime.includes('async function runAutoReleaseSurplusAmbulanceBackgroundSweep'), 'independent background sweep must exist');
assert.ok(runtime.includes("headers: { 'X-Requested-With': 'XMLHttpRequest' }"), 'mission inspection and stand-down must use MissionChief AJAX semantics');
assert.ok(runtime.includes("new DOMParser().parseFromString(html, 'text/html')"), 'background scanner must inspect mission HTML without navigating Worker A');
assert.ok(runtime.includes('getAutoReleaseOrdinaryAmbulanceRowsFromDocument('), 'detached mission HTML must reuse the exact type-5 ambulance resolver');
assert.ok(runtime.includes('const liveShortageCount = getAutoReleaseSnapshotLiveShortageCount(missionDocument);'), 'background scanner must inspect current Ambulance/Critical Care shortage');
assert.ok(runtime.includes('if (liveShortageCount > 0) return;'), 'a current patient medical shortage must block stand-down');
assert.ok(runtime.includes('const patientState = getAutoReleaseSnapshotPatientState(missionDocument);'), 'background scanner must calculate current patient demand');
assert.ok(runtime.includes('/\\b([\\d,]+)\\s+Untreated\\s+patients?\\b/i'), 'patient summary must prefer untreated-patient count');
assert.ok(runtime.includes('const surplus = Math.max(0, ambulances.length - patientState.count);'), 'surplus must be calculated from on-scene type-5 ambulances versus current patient demand');
assert.ok(runtime.includes('getAutoReleasePatientLinkedVehicleIds(['), 'ambulances already linked to current patient cards must be protected');
assert.ok(runtime.includes('url.pathname !== `/vehicles/${item.id}/backalarm`'), 'only MissionChief native backalarm routes may be used');
assert.ok(runtime.includes("url.searchParams.get('return') !== 'mission'"), 'stand-down must stay scoped to return=mission');

const typeResolverStart = runtime.indexOf('function isOrdinaryAmbulanceOnSceneRow');
const typeResolverEnd = runtime.indexOf('function getAutoReleaseOrdinaryAmbulanceRowsFromDocument');
assert.ok(typeResolverStart >= 0 && typeResolverEnd > typeResolverStart, 'type-5 resolver must exist before detached-document adapter');
const typeResolver = runtime.slice(typeResolverStart, typeResolverEnd);
assert.ok(typeResolver.includes("directTypeValues.includes('5')"), 'exact MissionChief type 5 must remain eligible');
assert.ok(typeResolver.includes("registeredType === '5'"), 'Personnel Register exact type 5 remains valid evidence');
assert.ok(!typeResolver.includes("'22'"), 'CFR type 22 must never enter the releasable type resolver');

assert.ok(runtime.includes('window.__NEXUS_TYPE5_AMBULANCE_BACKGROUND_MONITOR__ = true;'), 'top window must advertise background ownership');
assert.ok(runtime.includes('isAutoReleaseBackgroundOwnedByTopWindow()'), 'mission child-frame release path must defer to the top background owner');
assert.ok(runtime.includes('startAutoReleaseSurplusAmbulanceBackgroundMonitor();'), 'top runtime must start the independent monitor');
assert.ok(runtime.includes('stopAutoReleaseSurplusAmbulanceBackgroundMonitor();'), 'runtime cleanup must stop the independent monitor');

console.log('PASS: 3.0.43.151 retains the independent exact type-5 Ambulance release worker and CFR type-22 protection.');
