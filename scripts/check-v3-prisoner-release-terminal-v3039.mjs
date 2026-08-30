#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name, from = 0) {
  const markers = [`function ${name}(`, `async function ${name}(`];
  const starts = markers.map(marker => source.indexOf(marker, from)).filter(value => value >= 0);
  assert.ok(starts.length, `${name} must exist`);
  const start = Math.min(...starts);
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
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; index += 1; } continue; }
    if (quote) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === quote) quote = ''; continue; }
    if (char === '/' && next === '/') { lineComment = true; index += 1; continue; }
    if (char === '/' && next === '*') { blockComment = true; index += 1; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

const urlHelpers = [
  extractFunction('isPrisonerReleaseTerminalUrl'),
  extractFunction('canonicalMissionWorkerUrl'),
].join('\n');
const sandbox = {
  URL,
  location: { origin: 'https://www.missionchief.co.uk' },
  sameOriginUrl(value) {
    try {
      const url = new URL(String(value || ''), 'https://www.missionchief.co.uk');
      return url.origin === 'https://www.missionchief.co.uk' ? url : null;
    } catch { return null; }
  },
  missionIdFromUrl(value) {
    const url = new URL(String(value || ''), 'https://www.missionchief.co.uk');
    const match = url?.pathname.match(/^\/missions\/(\d+)(?:\/|$)/i);
    return match ? match[1] : '';
  },
};
vm.createContext(sandbox);
vm.runInContext(`${urlHelpers}; this.isTerminal=isPrisonerReleaseTerminalUrl; this.canonical=canonicalMissionWorkerUrl;`, sandbox);
assert.equal(sandbox.isTerminal('/missions/259517433/gefangene/entlassen'), true);
assert.equal(sandbox.isTerminal('/missions/259517433/gefangene/entlassen?sd=a'), true);
assert.equal(sandbox.isTerminal('/missions/259517433'), false);
assert.equal(sandbox.isTerminal('/missions/259517433/missing_vehicles'), false);
assert.equal(sandbox.canonical('/missions/259517433/gefangene/entlassen'), 'https://www.missionchief.co.uk/missions/259517433');

const finish = extractFunction('maybeFinishPrisonerReleaseTerminal');
for (const marker of [
  "state.workerRole !== 'MISSION_A'",
  "hasConfirmedPrisonerReleaseSuccess(doc)",
  "elapsedMs < 3000",
  "clearSharedV2AutoRunning('prisoner-release-terminal')",
  "state.bootstrapMissionUrl = ''",
  "state.currentMissionUrl = ''",
  "sessionSet(SESSION_RESUME_MISSION, '')",
  'removeWorker(false)',
  "supply.candidates.find(item => item.missionId !== missionId)",
]) assert.ok(finish.includes(marker), `terminal handler missing ${marker}`);
assert.doesNotMatch(finish, /\.click\s*\(|clickDispatch|clickFinalDispatch|runUnitFinder|dispatchSelected/,
  'terminal result handling must never click or dispatch');

const persist = extractFunction('persistResumeMission');
const stored = extractFunction('storedResumeMissionUrl');
assert.match(persist, /gefangene/);
assert.match(stored, /gefangene/);
assert.match(stored, /sessionSet\(SESSION_RESUME_MISSION, ''\)/);

const create = extractFunction('createWorker');
assert.ok(create.indexOf("role === 'MISSION_A'") < create.indexOf("frame.src = url"),
  'mission A URL must be canonicalized before iframe creation');

const load = extractFunction('onWorkerLoad');
assert.ok(load.indexOf('maybeFinishPrisonerReleaseTerminal') < load.indexOf('state.currentMissionUrl = href'),
  'worker-load terminal guard must run before current/resume URL persistence');
const watch = extractFunction('watchWorker');
assert.ok(watch.indexOf('maybeFinishPrisonerReleaseTerminal') < watch.indexOf('documentChanged && isMissionUrl(href)'),
  'watcher terminal guard must run before Mission Finder discovery');
const discover = extractFunction('waitForNexusAndStart');
assert.ok(discover.indexOf('maybeFinishPrisonerReleaseTerminal') < discover.indexOf('ensureActiveWorkerOwnership'),
  'discovery must exit terminal results before ownership or Auto Mode lookup');
assert.match(discover, /canonicalMissionWorkerUrl\(href\)/,
  'clean A-only retry must never replay the terminal route');

const missionModule = source.indexOf('MODULE 2: MISSION FINDER');
const observer = extractFunction('startMissionFinderObserver', missionModule);
const initialize = extractFunction('initialize', missionModule);
assert.ok(observer.indexOf('prisoner-release-terminal-result') < observer.indexOf('mission-observer-entered'),
  'terminal page must exit before Mission Finder observer startup');
assert.match(initialize, /gefangene/ ,
  'terminal page must never mount the mission UI');

console.log('PASS: prisoner release success/404 routes are terminal, never persisted or replayed, and return through a fresh mission Worker A without Auto Mode discovery or dispatch.');
