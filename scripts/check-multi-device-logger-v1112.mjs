#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(
  new URL('../src/missionchief-command-nexus.user.js', import.meta.url),
  'utf8'
);
const backend = fs.readFileSync(
  new URL('../integrations/google-apps-script/Code.gs', import.meta.url),
  'utf8'
);

const metadataVersion = source.match(/^\/\/ @version\s+(\S+)/m)?.[1];
const loggerVersion = source.match(
  /MF_MISSION_LOGGER_CLIENT_VERSION = '([^']+)'/
)?.[1];
assert.ok(metadataVersion, 'Userscript metadata version is missing');
assert.equal(
  loggerVersion,
  metadataVersion,
  'Mission logger client version must match the canonical userscript version'
);
assert.match(source, /MF_MISSION_LOGGER_OBSERVER_LEASE_MS = 90000/);
assert.match(source, /submitMissionLoggerRequest\(\s*'observer-lease'/);
assert.match(source, /function isMissionLoggerPassiveObserverOwner\(/);
assert.match(source, /function flushMissionActivityBuffer\(/);
assert.match(source, /requestIdleCallback/);
assert.match(source, /MF_MISSION_LOGGER_ACTIVITY_BUFFER_MAX = 80/);
assert.match(source, /getMissionLoggerDeviceStagger/);
assert.match(source, /Math\.floor\(Math\.random\(\) \* 750\)/);
assert.match(
  source,
  /function recordMissionLoggerObservedEvent\(\)[\s\S]*?!isMissionLoggerPassiveObserverOwner\(\)/
);
assert.match(
  source,
  /function installMissionLoggerMissionGenerationCapture\(\)[\s\S]*?!isMissionLoggerPassiveObserverOwner\(\)/
);
assert.match(
  source,
  /activityCategory === 'NETWORK'[\s\S]*?!isMissionLoggerPassiveObserverOwner\(\)/
);
assert.doesNotMatch(
  source,
  /phase: 'START', outcome: 'STARTED'/
);

assert.match(backend, /buildId:\s*'[^']+'/);
assert.match(backend, /action === 'observer-lease'/);
assert.match(backend, /function handleLoggerObserverLease_\(/);
assert.match(backend, /multi-device-observer-lease/);
assert.match(backend, /cross-device-semantic-dedupe/);
assert.match(backend, /function filterCrossDevicePassiveObservationRows_\(/);
assert.match(backend, /filterCrossDevicePassiveObservationRows_\([\s\S]*?preparedRaw/);

// Contract model: the first device owns the passive lease, renews it, and a
// second computer can take over once the owner stops renewing.
function lease(existing, deviceId, now, leaseMs = 90000) {
  const granted =
    !existing || existing.expiresAt <= now || existing.deviceId === deviceId;
  return {
    granted,
    value: granted
      ? { deviceId, expiresAt: now + leaseMs }
      : existing
  };
}
let state = null;
let result = lease(state, 'device-a', 1000);
assert.equal(result.granted, true);
state = result.value;
result = lease(state, 'device-b', 2000);
assert.equal(result.granted, false);
result = lease(state, 'device-a', 3000);
assert.equal(result.granted, true);
state = result.value;
result = lease(state, 'device-b', state.expiresAt + 1);
assert.equal(result.granted, true);
assert.equal(result.value.deviceId, 'device-b');

// Contract model: only passive observations are cross-device deduped. Acting
// device dispatch evidence must always survive.
const existing = new Set(['419896|258500001|mission-observed']);
const events = [
  { player: '419896', mission: '258500001', type: 'mission-observed' },
  { player: '419896', mission: '258500001', type: 'dispatch' },
  { player: '419896', mission: '258500002', type: 'mission-observed' },
  { player: '419938', mission: '258500001', type: 'mission-observed' }
];
const kept = events.filter(event => {
  const key = `${event.player}|${event.mission}|${event.type}`;
  return event.type !== 'mission-observed' || !existing.has(key);
});
assert.equal(kept.length, 3);
assert.equal(kept.some(event => event.type === 'dispatch'), true);

console.log('Multi-device logger coordination and performance regression passed');
