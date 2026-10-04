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
const captureEntry = manifest.content_scripts.find(entry => entry.js?.includes('nexus-alliance-owner-capture.js'));
assert.ok(captureEntry, 'owner capture must be installed by the extension');
assert.equal(captureEntry.run_at, 'document_start', 'owner capture must start before MissionChief renders the mission list');
assert.equal(captureEntry.world, 'MAIN', 'owner capture must run in MissionChief page context to receive mission objects');
assert.equal(captureEntry.all_frames, false, 'owner capture must be top-page only');

assert.match(captureSource, /mission\.user_id/, 'MissionChief user_id must be the primary owner authority');
assert.match(captureSource, /globalThis\.user_id/, 'MissionChief current user_id must be the comparison authority');
assert.match(captureSource, /missionMarkerAdd/, 'legacy mission object capture must remain as a fallback');
assert.match(captureSource, /missionsVirtualScroller/, 'current MissionChief virtual-list data must have a bounded harvest fallback');
assert.match(coreSource, /return !!owner\?\.foreign;/, 'planned entry admission must fail closed unless the owner is proven foreign');

const events = [];
const sandbox = {
  console,
  user_id: 777,
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
sandbox.dispatchEvent = event => { events.push(event); return true; };

const context = vm.createContext(sandbox);
vm.runInContext(captureSource, context);
vm.runInContext(coreSource, context);

const C = context.NexusAllianceCore;
const capture = context.__NEXUS_ALLIANCE_MISSION_OWNER_CAPTURE__;
assert.equal(context.additionalMissionsFiltersFuncs.length, 1, 'one supported passive VL filter must be registered');
const captureFilter = context.additionalMissionsFiltersFuncs[0];

function plannedEntry(missionId) {
  return {
    dataset: { missionId: String(missionId) },
    getAttribute(name) { return name === 'mission_id' ? String(missionId) : name === 'data-mission-participation-filter' ? 'new' : null; },
    closest(selector) { return selector === '#mission_list_sicherheitswache' ? {} : null; },
    matches() { return false; },
    className: '',
    textContent: '',
  };
}

captureFilter({ id: 1001, user_id: 777, sw: true, alliance_id: 42 });
captureFilter({ id: 1002, user_id: 888, sw: true, alliance_id: 42 });
captureFilter({ id: 1003, user_id: 999, sw: false, alliance_id: 42 });

assert.equal(capture.get('1001').userId, '777');
assert.equal(capture.get('1002').userId, '888');
assert.equal(C.isSharedPlannedAppearance(plannedEntry(1001)), false, 'player-owned planned appearance must be excluded even if shared with the alliance');
assert.equal(C.isSharedPlannedAppearance(plannedEntry(1002)), true, 'another member\'s planned appearance must be included');
assert.equal(C.isSharedPlannedAppearance(plannedEntry(1999)), false, 'owner-unknown planned appearance must fail closed');
assert.ok(events.some(event => event.type === 'nexus:alliance-mission-owner-update' && event.detail?.missionId === '1002'), 'new mission owner evidence must signal the Alliance table to refresh');

console.log('PASS: 3.0.43.151 uses MissionChief mission user_id authority so own planned appearances are excluded and only other members\' shared planned appearances are admitted.');
