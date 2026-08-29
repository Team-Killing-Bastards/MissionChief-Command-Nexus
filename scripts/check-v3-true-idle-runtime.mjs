#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const declaration = `function ${name}(`;
  const start = source.indexOf(declaration);
  assert.ok(start >= 0, `${name} must exist`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

const heavyStart = source.indexOf('const shouldStartHeavyCommandNexusRuntime = () => {');
const heavyEnd = source.indexOf('\n  };', heavyStart) + 5;
assert.ok(heavyStart >= 0 && heavyEnd > heavyStart, 'heavy-runtime host gate must exist');
const heavyGate = source.slice(heavyStart, heavyEnd);

function heavyRuntimeAllowed({ path = '/', name = '', missionDom = false, verifiedActive = false } = {}) {
  const context = vm.createContext({
    window: { name },
    location: { pathname: path },
    document: { querySelector: () => missionDom ? {} : null },
    ACTIVE_WORKER_NAME_PREFIX: 'mcn-v3-active-worker-',
    PIPELINE_PRELOAD_NAME_PREFIX: 'mcn-v3-pipeline-preload-',
    isParentVerifiedActiveWorker: () => verifiedActive,
    result: null,
  });
  vm.runInContext(`${heavyGate}\nresult = shouldStartHeavyCommandNexusRuntime();`, context);
  return context.result;
}

assert.equal(heavyRuntimeAllowed(), false, 'the idle main map must not allocate both heavy engines');
assert.equal(heavyRuntimeAllowed({ path: '/buildings/123' }), false, 'unrelated game pages must remain lightweight');
assert.equal(heavyRuntimeAllowed({ path: '/missions/123' }), true, 'a mission page needs Mission Finder');
assert.equal(heavyRuntimeAllowed({ path: '/vehicles/12/patient/34' }), true, 'patient transport needs Mission Finder');
assert.equal(heavyRuntimeAllowed({ path: '/vehicles/12/gefangener/34' }), true, 'prisoner transport needs Mission Finder');
assert.equal(heavyRuntimeAllowed({ path: '/leitstellenansicht' }), true, 'Stations workspace needs Resource Administration');
assert.equal(heavyRuntimeAllowed({ name: 'mcn-v3-active-worker-1-123', verifiedActive: true }), true, 'Parent-verified Worker A needs the full runtime');
assert.equal(heavyRuntimeAllowed({ name: 'mcn-v3-active-worker-1-123' }), false, 'a stale active-looking frame name must remain lightweight');
assert.equal(heavyRuntimeAllowed({ name: 'mcn-v3-pipeline-preload-0-123' }), false, 'warm Worker B must not allocate the heavy engine');
assert.equal(heavyRuntimeAllowed({ missionDom: true }), true, 'an embedded mission DOM must remain supported');

const lightweightStart = source.indexOf("const dormantPreload = String(window.name || '').startsWith('mcn-v3-pipeline-preload-');");
const lightweightEnd = source.indexOf('\n\n/* Dispatch Centres Show all', lightweightStart);
assert.ok(lightweightStart >= 0 && lightweightEnd > lightweightStart, 'lightweight B bridge block must exist');
const lightweightBlock = source.slice(lightweightStart, lightweightEnd);
let heavyLoads = 0;
let ownsOperationalState = false;
const preloadWindow = {
  name: 'mcn-v3-pipeline-preload-1-123',
  __MCN_V3_FRAME_OWNERSHIP_BRIDGE__: { isActive: () => ownsOperationalState },
  __MCN_HEAVY_RUNTIME_LOADED__: true,
  missionFinder2026Initialized: false,
};
const preloadContext = vm.createContext({
  window: preloadWindow,
  location: { pathname: '/missions/123' },
  Date,
  Object,
  heavyStarted: false,
  startHeavyCommandNexusRuntime() {
    heavyLoads += 1;
    preloadContext.heavyStarted = true;
    preloadWindow.__MCN_HEAVY_RUNTIME_LOADED__ = true;
    preloadWindow.missionFinder2026Initialized = true;
    return true;
  },
});
vm.runInContext(lightweightBlock, preloadContext);
const lightweightBridge = preloadWindow.__MCN_V2_DORMANT_PRELOAD_BRIDGE__;
assert.ok(lightweightBridge, 'Worker B must publish the native dormant bridge');
assert.equal(lightweightBridge.status().lightweight, true);
assert.equal(preloadWindow.__MCN_HEAVY_RUNTIME_LOADED__, false);
assert.equal(lightweightBridge.promote({ activationToken: 'token', expectedMissionId: '123' }), false);
preloadWindow.name = 'mcn-v3-active-worker-2-123';
ownsOperationalState = true;
assert.equal(lightweightBridge.promote({ activationToken: 'token', expectedMissionId: '123' }), true);
assert.equal(heavyLoads, 1, 'promotion must mount the heavy engine exactly once');
assert.equal(lightweightBridge.status().promoted, true);
assert.equal(lightweightBridge.status().lightweight, false);

const resumeAllowed = extractFunction('persistedBackgroundResumeAllowed');
let now = Date.now();
class FakeDate extends Date { static now() { return now; } }
const resumeState = { wanted: true, handoffAt: now - 5000, discarded: false };
const resumeContext = vm.createContext({
  document: {},
  Date: FakeDate,
  SESSION_RESUME_HANDOFF_AT: 'resume-handoff',
  CONTROLLER_RESUME_HANDOFF_MAX_AGE_MS: 15 * 1000,
  persistedBackgroundWanted: () => resumeState.wanted,
  sessionGet: () => String(resumeState.handoffAt || ''),
  result: null,
});
Object.defineProperty(resumeContext.document, 'wasDiscarded', {
  get: () => resumeState.discarded,
});
vm.runInContext(`${resumeAllowed}\nresult = persistedBackgroundResumeAllowed();`, resumeContext);
assert.equal(resumeContext.result, true, 'a fresh verified page handoff must resume');
resumeState.handoffAt = now - 16000;
vm.runInContext('result = persistedBackgroundResumeAllowed();', resumeContext);
assert.equal(resumeContext.result, false, 'stale run intent must not silently recreate A/B');
resumeState.handoffAt = 0;
resumeState.discarded = true;
vm.runInContext('result = persistedBackgroundResumeAllowed();', resumeContext);
assert.equal(resumeContext.result, true, 'a browser-discarded active tab must retain sleep recovery');
resumeState.wanted = false;
vm.runInContext('result = persistedBackgroundResumeAllowed();', resumeContext);
assert.equal(resumeContext.result, false, 'no stored run intent means no resume');

const clearIntent = extractFunction('clearPersistedRunIntent');
assert.ok(clearIntent.includes("sessionSet(SESSION_RESUME_HANDOFF_AT, '')"));
const pagehideIndex = source.indexOf("window.addEventListener('pagehide', () => {");
const startupIndex = source.indexOf('const startupResumeAllowed = persistedBackgroundResumeAllowed();');
assert.ok(pagehideIndex >= 0 && startupIndex > pagehideIndex);
assert.ok(source.slice(pagehideIndex, startupIndex).includes('sessionSet(SESSION_RESUME_HANDOFF_AT, String(Date.now()))'));
assert.ok(source.slice(startupIndex, source.indexOf('mountWhenMapReady();', startupIndex)).includes('clearPersistedRunIntent();'));
assert.ok(source.includes('const startHeavyCommandNexusRuntime = () => {'));
assert.ok(source.includes('} else if (shouldStartHeavyCommandNexusRuntime()) {'));
assert.ok(source.includes('if (window.top !== window.self) return;'));

console.log('PASS: V3 idle map and dormant B stay lightweight, promotion mounts the full engine once, and stale run intent cannot spawn A/B.');
