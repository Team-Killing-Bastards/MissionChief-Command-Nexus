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
assert.match(coreSource, /const plannedMissionListId = 'mission_list_sicherheitswache';/, 'planned appearances must use MissionChief native planned mission list');
assert.match(coreSource, /if \(isSharedPlannedAppearance\(entry\)\) entries\.add\(entry\);/, 'only verified foreign planned appearances may enter the Nexus alliance table');
assert.doesNotMatch(coreSource, /raw !== 'own'/, 'participation state must never be treated as mission ownership again');
assert.match(coreSource, /MissionChief's mission object says they belong to another user/, 'planned ownership must be based on MissionChief mission-object authority');
assert.match(captureSource, /additionalMissionsFiltersFuncs/, 'current MissionChief virtual-list mission objects must be captured through the supported filter hook');
assert.match(captureSource, /rememberMission\(mission, 'mission-vl-filter'\)/, 'the passive filter must retain mission owner user_id');
assert.match(captureSource, /return true;/, 'the MissionChief filter hook must remain read-only and never hide native missions');
assert.match(supportSource, /nexus:alliance-mission-owner-update/, 'Alliance table must refresh when owner evidence becomes available');
assert.match(supportSource, /item\.planned\?' · Planned appearance':''/, 'planned appearances should remain visibly identified in the Nexus list');

const sandbox = {
  console,
  user_id: 100,
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
sandbox.additionalMissionsFiltersFuncs = [];
sandbox.onMissionVLInitCallbacks = [];
sandbox.onMissionVLRenderCallbacks = [];

const context = vm.createContext(sandbox);
vm.runInContext(captureSource, context);
vm.runInContext(coreSource, context);
const C = context.NexusAllianceCore;
const ownerCapture = context.__NEXUS_ALLIANCE_MISSION_OWNER_CAPTURE__;
assert.ok(C, 'Alliance core must export NexusAllianceCore');
assert.ok(ownerCapture, 'Alliance owner capture must be installed');
assert.equal(context.additionalMissionsFiltersFuncs.length, 1, 'one passive mission ownership filter must be registered');

function entry(missionId, { planned = true, participation = 'new' } = {}) {
  return {
    className: '',
    textContent: '',
    dataset: { missionId: String(missionId) },
    closest(selector) { return planned && selector === '#mission_list_sicherheitswache' ? {} : null; },
    getAttribute(name) {
      if (name === 'mission_id') return String(missionId);
      if (name === 'data-mission-participation-filter') return participation;
      return null;
    },
    matches() { return false; },
  };
}

const passiveFilter = context.additionalMissionsFiltersFuncs[0];
assert.equal(passiveFilter({ id: 501, user_id: 100, sw: true }), true, 'capture hook must never alter MissionChief filtering');
assert.equal(passiveFilter({ id: 502, user_id: 200, sw: true }), true, 'capture hook must never alter foreign MissionChief filtering');

assert.equal(C.isSharedPlannedAppearance(entry(501, { participation: 'new' })), false, 'own planned appearance must stay out even when participation says new');
assert.equal(C.isSharedPlannedAppearance(entry(501, { participation: 'participating' })), false, 'own planned appearance must stay out even after participation');
assert.equal(C.isSharedPlannedAppearance(entry(502, { participation: 'new' })), true, 'foreign/shared planned appearance must be captured regardless of participation state');
assert.equal(C.isSharedPlannedAppearance(entry(503, { participation: 'new' })), false, 'unknown owner must fail closed instead of guessing from participation');
assert.equal(C.isSharedPlannedAppearance(entry(502, { planned: false })), false, 'foreign ordinary missions must not be reclassified as planned here');
assert.equal(C.isOffshoreMissionType('526'), false, 'Fire Station Open Day must remain eligible for Alliance support');

console.log('PASS: 3.0.43.151 keeps planned appearances in the Alliance table only when MissionChief owner user_id proves the mission belongs to another alliance member.');
