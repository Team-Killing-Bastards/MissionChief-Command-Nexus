import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const runtime = fs.readFileSync(path.join(root, 'nexus-runtime.js'), 'utf8');

assert.equal(manifest.version, '3.0.43.189', 'extension version must be 3.0.43.151');
assert.ok(runtime.includes("const MISSION_FINDER_VERSION = '10.6.191';"), 'Mission Finder must increase for hidden-mission fleet discovery');
assert.ok(runtime.includes('const MF_AUTO_RELEASE_BACKGROUND_FLEET_REFRESH_MS = 15000;'), 'fleet assignments must be refreshed on a bounded cadence');
assert.ok(runtime.includes('const MF_AUTO_RELEASE_BACKGROUND_FLEET_STALE_MS = 60000;'), 'brief API failures may reuse only a bounded stale fleet snapshot');
assert.ok(runtime.includes("fetch('/api/vehicles'"), 'candidate discovery must use the authoritative player fleet API');
assert.ok(runtime.includes("return type === '5';"), 'only exact type-5 vehicles may seed background mission candidates');
assert.ok(runtime.includes('vehicle?.mission_id'), 'direct MissionChief mission assignment must be recognised');
assert.ok(runtime.includes("targetType === 'mission'"), 'target_type/target_id mission assignment must be recognised');
assert.ok(runtime.includes('url: `/missions/${missionId}`'), 'assigned mission IDs must be inspectable without a visible sidebar row');
assert.ok(runtime.includes("source: 'api-vehicles-type5-assignment'"), 'fleet-derived hidden mission candidates must be identifiable in diagnostics');
const candidateStart = runtime.indexOf('async function collectAutoReleaseBackgroundMissionCandidates()');
const candidateEnd = runtime.indexOf('async function releaseAutoReleaseBackgroundAmbulances', candidateStart);
assert.ok(candidateStart >= 0 && candidateEnd > candidateStart, 'fleet candidate collector must exist');
const candidateSource = runtime.slice(candidateStart, candidateEnd);
assert.ok(!candidateSource.includes('collectMissionCandidates()'), 'hidden-mission discovery must not depend on the visible mission-list DOM');
assert.ok(!candidateSource.includes('missingText'), 'candidate discovery must not require patient/ambulance sidebar hints');
assert.ok(runtime.includes('const candidates = await collectAutoReleaseBackgroundMissionCandidates();'), 'background sweep must await fleet-derived candidates');
assert.ok(runtime.includes('getAutoReleaseOrdinaryAmbulanceRowsFromDocument('), 'mission inspection must still prove exact type-5 Ambulances are actually on scene before release');
assert.ok(runtime.includes('if (!ambulances.length) return;'), 'missions with no on-scene type-5 Ambulances must remain untouched');
assert.ok(runtime.includes('const liveShortageCount = getAutoReleaseSnapshotLiveShortageCount(missionDocument);'), 'live Ambulance/Critical Care shortages must still block release');
assert.ok(runtime.includes('const patientState = getAutoReleaseSnapshotPatientState(missionDocument);'), 'current untreated-patient demand must still control surplus calculation');
const typeStart = runtime.indexOf('function isOrdinaryAmbulanceOnSceneRow');
const typeEnd = runtime.indexOf('function getAutoReleaseOrdinaryAmbulanceRowsFromDocument', typeStart);
assert.ok(typeStart >= 0 && typeEnd > typeStart, 'type resolver must exist');
assert.ok(!runtime.slice(typeStart, typeEnd).includes("'22'"), 'CFR type 22 must remain impossible to release through this path');

console.log('PASS: 3.0.43.151 discovers type-5 Ambulance missions from /api/vehicles, including missions hidden or filtered out of the sidebar, while retaining on-scene and patient-demand safety gates.');
