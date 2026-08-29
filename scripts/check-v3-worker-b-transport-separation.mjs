#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name, from = 0) {
  const start = source.indexOf(`function ${name}(`, from);
  assert.ok(start >= 0, `${name} must exist`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

assert.match(source, /const PIPELINE_PRELOAD_COUNT = 0;/,
  'the B slot must no longer create mission preloads');
assert.match(source, /workerRole: '',/);
assert.match(source, /function createWorker\(url, role = 'MISSION_A'\)/);
assert.match(source, /'TRANSPORT_B'/);
assert.match(source, /ACTIVE_WORKER_NAME_PREFIX\}\$\{transportWorker \? 'transport-b-' : ''\}/,
  'transport B must remain a managed active frame while retaining an explicit role name');

const handoff = extractFunction('redirectWorkerToTransportService');
assert.ok(handoff.includes("state.workerRole !== 'MISSION_A'"));
assert.ok(handoff.includes("pausePipelineController('transport-worker-b-handoff', true)"));
assert.ok(handoff.indexOf('removeWorker(false)') < handoff.indexOf('startTransportOnlyWorker('),
  'mission A must be removed before transport B can start');
assert.doesNotMatch(handoff, /state\.worker\.contentWindow\.location\.(?:replace|assign)/,
  'A must never be navigated into transport');

const startB = extractFunction('startTransportOnlyWorker');
assert.ok(startB.includes("createWorker(url.href, 'TRANSPORT_B')"));
assert.ok(startB.includes("clearSharedV2AutoRunning('transport-worker-b-start')"));
assert.doesNotMatch(startB, /Dispatch|Unit Finder/);

const finishB = extractFunction('returnToTopMissionAfterTransport');
assert.ok(finishB.includes("state.workerRole !== 'TRANSPORT_B'"));
assert.ok(finishB.indexOf('removeWorker(false)') < finishB.indexOf('createWorker(mission.url)'),
  'transport B must be removed before fresh mission A starts');
assert.doesNotMatch(finishB, /redirectWorkerToPriority/,
  'a transport iframe must never be promoted or redirected into mission work');

const watch = extractFunction('watchWorker');
assert.match(watch, /state\.workerRole === 'TRANSPORT_B' && isMissionUrl\(href\)/);
assert.match(watch, /state\.workerRole === 'MISSION_A' && !controlRunning/);
const load = extractFunction('onWorkerLoad');
assert.match(load, /state\.workerRole === 'TRANSPORT_B' && isMissionUrl\(href\)/);

const missionModule = source.indexOf('MODULE 2: MISSION FINDER');
assert.ok(missionModule >= 0);
const initialise = extractFunction('initialize', missionModule);
assert.match(initialise, /mcn-v3-active-worker-transport-b-/,
  'transport B must fail closed before Mission Finder mounts dispatch controls');
assert.match(source, /!isMfV3ManagedTransportWorker\(\) &&\s*\(/,
  'transport B must not inherit shared Auto Mode running state');
const transportAllowed = extractFunction('isTransportAutomationAllowed', missionModule);
assert.match(transportAllowed, /isMfV3ManagedTransportWorker\(\)/,
  'B must receive local transport authority without shared Auto Mode state');
const transportHandler = extractFunction('handleTransportRequestsAfterDispatch', missionModule);
assert.match(transportHandler, /autoModeRunning \|\| isMfV3ManagedTransportWorker\(\)/,
  'the existing destination engine must continue while the current frame is B');
const observer = extractFunction('startMissionFinderObserver', missionModule);
assert.match(observer, /clearAllTransportAutomationFlags\('transport-worker-b'\)/,
  'B must clear stale shared Mission Finder rehook state before acting');
assert.match(observer, /handleTransportRequestsAfterDispatch\('worker-b'\)/,
  'every B transport document must bootstrap the existing transport engine');
assert.doesNotMatch(observer, /runAutoModeLoop\(/,
  'B transport bootstrap must never start the mission Auto Mode loop');
const exactTransportClick = extractFunction('clickExactApproachTransportButton', missionModule);
const bruteTransportClick = extractFunction('mfBruteClickFirstApproach', missionModule);
for (const body of [exactTransportClick, bruteTransportClick]) {
  assert.match(body, /!isMfV3ManagedTransportWorker\(\)/,
    'B transport clicks must not publish shared Auto Mode or rehook flags');
}
assert.match(source, /A: paused \| B: transport/);
assert.match(source, /B: transport standby/);

console.log('PASS: Worker A is mission-only, Worker B is on-demand transport-only, and the two active roles never coexist.');
