import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const captureSource = fs.readFileSync(path.join(root, 'nexus-alliance-owner-capture.js'), 'utf8');
const coreSource = fs.readFileSync(path.join(root, 'nexus-alliance-core.js'), 'utf8');
const supportSource = fs.readFileSync(path.join(root, 'nexus-alliance-support.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

assert.equal(manifest.version, '3.0.43.189');
assert.match(captureSource, /globalThis\.missions_data/, 'map mission cache must be harvested so map-only planned appearances are discoverable');
assert.match(captureSource, /mission\.caption \?\? mission\.name/, 'map capture must retain the mission caption/name');
assert.match(captureSource, /mission\.mtid \?\? mission\.mission_type_id/, 'map capture must retain the native mission type id');
assert.match(captureSource, /mission\.average_credits/, 'map capture must retain MissionChief reward data when present');
assert.match(coreSource, /capturedSharedPlannedAppearances/, 'Alliance core must merge captured map-only planned appearances');
assert.match(coreSource, /source: 'mission-map'/, 'map-only Alliance rows must remain identifiable as map sourced');
assert.match(supportSource, /capture\?\.harvest\?\.\(\)/, 'opening/refreshing Alliance support must harvest the current map mission cache');
assert.match(supportSource, /No shared alliance missions are currently visible in the game\./, 'empty state must no longer claim only the sidebar list is authoritative');

const sandbox = {
  console,
  user_id: 419938,
  alliance_id: 17,
  missions_data: {
    261637456: { id: 261637456, user_id: 419938, alliance_id: 17, sw: true, mtid: 526, caption: 'My Fire Station Open Day', average_credits: 23400 },
    261637457: { id: 261637457, user_id: 812345, alliance_id: 17, sw: true, mtid: 526, caption: 'Fire Station Open Day', average_credits: 23400 },
    261637458: { id: 261637458, user_id: 812345, alliance_id: 99, sw: true, mtid: 526, caption: 'Other Alliance Open Day', average_credits: 23400 },
    261637459: { id: 261637459, user_id: 812345, alliance_id: 17, sw: false, mtid: 147, caption: 'Ordinary Alliance Mission', average_credits: 5000 },
    261637460: { id: 261637460, user_id: 812345, alliance_id: 17, sw: true, mtid: 553, caption: 'Offshore Planned Test', average_credits: 25000 },
  },
  additionalMissionsFiltersFuncs: [],
  onMissionVLInitCallbacks: [],
  onMissionVLRenderCallbacks: [],
  setInterval: () => 1,
  clearInterval: () => {},
  setTimeout: () => 1,
  clearTimeout: () => {},
  CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
};
sandbox.window = sandbox;
sandbox.top = sandbox;
sandbox.globalThis = sandbox;
sandbox.window.top = sandbox;
sandbox.addEventListener = () => {};
sandbox.dispatchEvent = () => true;

const context = vm.createContext(sandbox);
vm.runInContext(captureSource, context);
vm.runInContext(coreSource, context);

const capture = context.__NEXUS_ALLIANCE_MISSION_OWNER_CAPTURE__;
const C = context.NexusAllianceCore;
assert.ok(capture && C);
assert.equal(capture.harvest(), 5, 'all live map mission objects should be harvested once');

const emptyDocument = {
  querySelectorAll() { return []; },
  getElementById() { return null; },
  querySelector() { return null; },
};
const missions = C.missions(emptyDocument);
const ids = Array.from(missions, item => item.id).sort();
assert.deepEqual(ids, ['261637457', '261637459', '261637460'], 'only current foreign planned appearances in this alliance may be synthesised from the map');

const openDay = missions.find(item => item.id === '261637457');
assert.equal(openDay.name, 'Fire Station Open Day');
assert.equal(openDay.missionTypeId, '526');
assert.equal(openDay.credits, 23400);
assert.equal(openDay.planned, true);
assert.equal(openDay.entry, null, 'map-only mission must not pretend a sidebar card exists');
assert.equal(openDay.source, 'mission-map');
assert.equal(openDay.offshore, false, 'Fire Station Open Day must remain eligible');

const offshore = missions.find(item => item.id === '261637460');
assert.equal(offshore.offshore, true, 'existing Ocean-only protection must apply equally to map-only planned appearances');

// The live map cache is authoritative for removal: if MissionChief removes the marker,
// a later harvest must remove it from the synthetic Alliance table instead of retaining stale history.
context.missions_data = {
  261637456: sandbox.missions_data[261637456],
};
capture.harvest();
assert.deepEqual(Array.from(C.missions(emptyDocument), item => item.id), [], 'ended/removed map missions must not linger in the Alliance table');

console.log('PASS: 3.0.43.151 captures foreign Alliance Planned Appearances directly from MissionChief map mission data even when no mission card exists, while excluding own/stale/wrong-alliance entries and preserving Ocean-only filtering.');
