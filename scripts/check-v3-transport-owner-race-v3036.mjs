#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name, from = 0) {
  const start = source.indexOf(`function ${name}(`, from);
  assert.ok(start >= 0, `${name} must exist`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] || '';
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) {
      if (char === '*' && next === '/') { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

const moduleStart = source.indexOf('MODULE 2: MISSION FINDER');
assert.ok(moduleStart >= 0);

const transportAllowed = extractFunction('isTransportAutomationAllowed', moduleStart);
const authority = vm.createContext({
  isManualAutoStopActive: () => false,
  isMfV3ManagedTransportWorker: () => false,
  isMfV3ManagedActiveFrame: () => true,
  isAutoModeActiveFlagSet: () => true,
  isPostTransportRehookPending: () => true,
  result: null,
});
vm.runInContext(`${transportAllowed}\nresult = isTransportAutomationAllowed();`, authority);
assert.equal(authority.result, false,
  'mission Worker A must remain transport-inert even when shared Auto Mode and rehook flags are set');
authority.isMfV3ManagedTransportWorker = () => true;
vm.runInContext('result = isTransportAutomationAllowed();', authority);
assert.equal(authority.result, true, 'transport Worker B must retain local destination authority');
authority.isMfV3ManagedTransportWorker = () => false;
authority.isMfV3ManagedActiveFrame = () => false;
vm.runInContext('result = isTransportAutomationAllowed();', authority);
assert.equal(authority.result, true,
  'a normal visible mission document must retain the established manual transport behaviour');

const ownerGate = extractFunction('shouldKeepMissionFinderObserverForCurrentFrame', moduleStart);
const document = { body: {} };
const ownership = vm.createContext({
  MF_IS_TOP_WINDOW: false,
  document,
  isMissionPage: () => true,
  isMfV3ManagedActiveFrame: () => true,
  getPrimaryMissionRequirementDocument: () => ({ competing: true }),
  result: null,
});
vm.runInContext(`${ownerGate}\nresult = shouldKeepMissionFinderObserverForCurrentFrame();`, ownership);
assert.equal(ownership.result, true,
  'a correctly named fresh Worker A must survive a transient false storage bridge during bootstrap');
ownership.isMfV3ManagedActiveFrame = () => false;
vm.runInContext('result = shouldKeepMissionFinderObserverForCurrentFrame();', ownership);
assert.equal(ownership.result, false, 'an unrelated child mission frame must still yield');

for (const name of ['maybeAssistPatientTransport', 'maybeAssistPrisonerTransport', 'maybeHandleTransportServiceTimeout']) {
  assert.match(extractFunction(name), /state\.workerRole !== 'TRANSPORT_B'/,
    `${name} must be transport-B-only`);
}
for (const name of [
  'maybeHandleConfirmedPrisonerReleaseSuccess',
  'maybeReturnFromCompletedPrisonerDestination',
  'maybeRecoverStalledTransportContext',
  'maybeRecoverStrandedPrisonerHandoff',
]) {
  const legacy = extractFunction(name);
  assert.match(legacy, /\{\s*return false;\s*\}$/);
  assert.doesNotMatch(legacy, /location\.(?:replace|assign)|redirectWorkerToPriority|createWorker|\.click\s*\(/);
}

const schedule = extractFunction('schedulePostTransportRehook');
assert.match(schedule, /state\.workerRole !== 'TRANSPORT_B'/);
assert.doesNotMatch(schedule, /redirectWorkerToPriority/);
assert.doesNotMatch(source, /return-existing-worker-after-completed-prisoner-destination/);

const finish = extractFunction('returnToTopMissionAfterTransport');
assert.ok(finish.indexOf('removeWorker(false)') < finish.indexOf('createWorker(mission.url)'));

console.log('PASS: v3.0.35 transport leakage and active/inactive observer race are permanently blocked.');
