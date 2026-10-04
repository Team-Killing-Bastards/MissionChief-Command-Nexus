import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const captureSource = fs.readFileSync(path.join(root, 'nexus-alliance-owner-capture.js'), 'utf8');
const coreSource = fs.readFileSync(path.join(root, 'nexus-alliance-core.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

assert.equal(manifest.version, '3.0.43.189');
assert.match(captureSource, /wrapMissionFunction\('processMissionElement'\)/, 'current virtual-list mission processing must also be captured');
assert.match(captureSource, /globalThis\.mission_markers/, 'existing live map markers must be recoverable when a marker was created before the wrapper installed');
assert.match(captureSource, /markerSeenAt/, 'direct marker evidence must have independent liveness');
assert.match(captureSource, /MARKER_FALLBACK_MS\s*=\s*72\s*\*\s*60\s*\*\s*60\s*\*\s*1000/, 'map-only Planned Appearances must not expire after two minutes');
assert.match(captureSource, /if \(currentMapMissionIds\.has\(key\)\) return true;[\s\S]*if \(markerEvidenceCurrent\(record\)\) return true;/, 'missions_data absence must not override direct map-marker evidence');

let now = 1800000000000;
class FakeDate extends Date {
  static now() { return now; }
}

const markerCalls = [];
const sandbox = {
  console,
  Date: FakeDate,
  user_id: 419938,
  alliance_id: 17,
  missions_data: {
    // Deliberately contains only a normal mission. 3.0.43.142 incorrectly treated this
    // as proof that a separately observed map-only Planned Appearance was no longer live.
    700001: { id: 700001, user_id: 812345, alliance_id: 17, sw: false, mtid: 147, caption: 'Ordinary Alliance Mission' },
  },
  mission_markers: [],
  missionMarkerAdd(mission) { markerCalls.push(mission.id); return mission.id; },
  missionMarkerAddSingle(mission) { markerCalls.push(mission.id); return mission.id; },
  processMissionElement(mission) { markerCalls.push(mission.id); return mission.id; },
  additionalMissionsFiltersFuncs: [],
  onMissionVLInitCallbacks: [],
  onMissionVLRenderCallbacks: [],
  setInterval: () => 1,
  clearInterval: () => {},
  setTimeout: () => 1,
  clearTimeout: () => {},
  CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
  document: { hidden: false, addEventListener() {} },
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

const end = now + (5 * 60 * 60 * 1000);
const foreignOpenDay = {
  id: 261637457,
  user_id: 812345,
  alliance_id: 17,
  sw: true,
  sw_start_in: 4842,
  date_now: now / 1000,
  date_end: end / 1000,
  mtid: 526,
  caption: 'Fire Station Open Day',
  average_credits: 23400,
};
const ownOpenDay = { ...foreignOpenDay, id: 261637458, user_id: 419938, caption: 'My Fire Station Open Day' };
const otherAlliance = { ...foreignOpenDay, id: 261637459, alliance_id: 99, caption: 'Other Alliance Open Day' };
const offshore = { ...foreignOpenDay, id: 261637460, mtid: 553, caption: 'Offshore Planned Test' };

// These are deliberately delivered via map-marker functions, not missions_data or a DOM card.
context.missionMarkerAdd(foreignOpenDay);
context.missionMarkerAddSingle(ownOpenDay);
context.processMissionElement(otherAlliance);
context.missionMarkerAdd(offshore);
assert.deepEqual(markerCalls, [261637457, 261637458, 261637459, 261637460], 'wrappers must preserve native function calls');

// Harvest a missions_data cache that DOES NOT contain the Planned Appearances. This was the
// live failure in 3.0.43.142: currentMapHarvestAt made its absence authoritative.
capture.harvest();

const emptyDocument = {
  querySelectorAll() { return []; },
  getElementById() { return null; },
  querySelector() { return null; },
};
let missions = C.missions(emptyDocument);
assert.deepEqual(Array.from(missions, item => item.id).sort(), ['261637457', '261637460', '700001'], 'foreign same-alliance marker-only Planned Appearances must survive an incomplete missions_data cache');
assert.equal(missions.find(item => item.id === '261637457')?.missionTypeId, '526');
assert.equal(missions.find(item => item.id === '261637457')?.name, 'Fire Station Open Day');
assert.equal(missions.find(item => item.id === '261637460')?.offshore, true, 'Ocean-only filtering must still cover marker-only planned missions');

// A planned appearance can be visible more than two minutes before it starts. It must remain
// in the Alliance table for hours while direct marker evidence and its end time say it is live.
now += 10 * 60 * 1000;
missions = C.missions(emptyDocument);
assert.ok(missions.some(item => item.id === '261637457'), 'marker-only Fire Station Open Day must not expire after the old two-minute fallback');

// Expire only after the native date_end (plus a small grace) has passed.
now = end + (6 * 60 * 1000);
assert.ok(!C.missions(emptyDocument).some(item => item.id === '261637457'), 'ended Planned Appearance must not linger indefinitely');

// Recovery path: if the wrapper missed initial creation, a mission_markers entry with explicit
// mission/user fields is enough to reconstruct the same safe evidence.
now += 1000;
context.mission_markers = [{
  mission_id: 261637461,
  user_id: 812345,
  alliance_id: 17,
  sw: true,
  mtid: 526,
  caption: 'Recovered Fire Station Open Day',
  date_end: (now + 3600000) / 1000,
  average_credits: 23400,
}];
capture.harvest();
assert.ok(C.missions(emptyDocument).some(item => item.id === '261637461'), 'existing explicit mission_markers data must recover a map-only planned appearance');

console.log('PASS: 3.0.43.151 keeps direct MissionChief map-marker Planned Appearance evidence independent of incomplete missions_data, survives multi-hour countdowns, captures processMissionElement, recovers explicit mission_markers entries, excludes own/wrong-alliance missions, and expires by native end time.');
