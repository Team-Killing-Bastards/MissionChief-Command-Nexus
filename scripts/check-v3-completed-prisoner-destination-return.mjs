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
  let lineComment = false;
  let blockComment = false;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] || '';
    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }
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

for (const name of [
  'maybeHandleConfirmedPrisonerReleaseSuccess',
  'maybeReturnFromCompletedPrisonerDestination',
  'maybeRecoverStalledTransportContext',
  'maybeRecoverStrandedPrisonerHandoff',
]) {
  const body = extractFunction(name);
  assert.match(body, /\{\s*return false;\s*\}$/,
    `${name} must remain an inert legacy compatibility hook`);
  assert.doesNotMatch(body, /location\.(?:replace|assign)|createWorker\s*\(|redirectWorkerToPriority\s*\(|\.click\s*\(/,
    `${name} must never navigate, rebuild or click from mission Worker A`);
}

assert.doesNotMatch(source, /return-existing-worker-after-completed-prisoner-destination/,
  'the released same-worker prisoner return path must not survive v3.0.36');

const schedule = extractFunction('schedulePostTransportRehook');
assert.match(schedule, /state\.workerRole !== 'TRANSPORT_B'/,
  'only active transport B may consume a cleared Radio request');
assert.match(schedule, /state\.transportServiceKey !== clearedKey/);
assert.match(schedule, /returnToTopMissionAfterTransport\('radio-cleared'/);
assert.doesNotMatch(schedule, /redirectWorkerToPriority|location\.(?:replace|assign)/,
  'Radio clearance must end B through the parent handoff, never repurpose the current iframe');

const finish = extractFunction('returnToTopMissionAfterTransport');
assert.match(finish, /state\.workerRole !== 'TRANSPORT_B'/);
assert.ok(finish.indexOf('removeWorker(false)') < finish.indexOf('createWorker(mission.url)'),
  'B must be removed before a fresh mission A is created');

console.log('PASS: completed prisoner destinations are owned by transport B and cannot navigate or recycle mission Worker A.');
