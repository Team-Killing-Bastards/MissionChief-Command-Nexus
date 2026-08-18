#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const backend = await readFile('integrations/google-apps-script/Code.gs', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}
function expect(condition, message) {
  if (!condition) fail(message);
}
function extractFunction(text, name) {
  const expression = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const match = expression.exec(text);
  if (!match) fail(`Missing function ${name}`);
  const start = match.index;
  const parameterStart = text.indexOf('(', start);
  let parameterDepth = 0;
  let bodyStart = -1;
  let quote = '';
  let escaped = false;
  for (let index = parameterStart; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') parameterDepth += 1;
    if (character === ')') {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        bodyStart = text.indexOf('{', index);
        break;
      }
    }
  }
  if (bodyStart < 0) fail(`Missing body for ${name}`);

  let depth = 0;
  quote = '';
  escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = bodyStart; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1] || '';
    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  fail(`Unable to isolate ${name}`);
}

expect(/const MF_MISSION_LOGGER_CLIENT_VERSION\s*=\s*'[^']+';/.test(source), 'Logger client version constant is missing');
expect(/MF_MISSION_LOGGER_REQUEST_TIMEOUT_MS\s*=\s*120000;/.test(source), 'Google acknowledgement timeout must be 120 seconds');
expect(source.includes('MF_MISSION_LOGGER_REQUEST_TIMEOUT_MS + 30000'), 'Cross-tab lease must exceed the request window by 30 seconds');
expect(source.includes('Object.freeze([2000, 5000, 15000])'), 'Busy retries must use bounded 2s, 5s and 15s backoff');

const initialize = extractFunction(source, 'initialize');
const pageGuardAt = initialize.indexOf('if (!isMissionPage()) return;');
const recorderAt = initialize.indexOf('installMissionActivityRecorder();');
const ownerClaimAt = initialize.indexOf("claimCurrentMissionExecutionOwnership('initialize')");
expect(pageGuardAt >= 0, 'Mission-page guard is missing');
expect(recorderAt > pageGuardAt, 'Recorder must remain mission-page scoped');
expect(recorderAt < ownerClaimAt, 'Top-window recorder must install before Mission Finder ownership can return');
expect((initialize.match(/installMissionActivityRecorder\(\);/g) || []).length === 1, 'Initialize must install the recorder exactly once');
const recorder = extractFunction(source, 'installMissionActivityRecorder');
expect(recorder.includes('!MF_IS_TOP_WINDOW'), 'Recorder must remain single-owner in the top window');

const uploadBatch = extractFunction(source, 'submitMissionLoggerUploadBatch');
for (const token of [
  'busyAttempt <=',
  'MF_MISSION_LOGGER_BUSY_RETRY_DELAYS_MS.length',
  "'LOGGER_BUSY'",
  'await wait(retryDelay)',
  'batchId: pending.batchId',
  'attempt < 2',
  "'LOGGER_TIMEOUT'",
]) {
  expect(uploadBatch.includes(token), `Upload helper is missing ${token}`);
}

function makeRunner(submit, waits, states) {
  return Function(
    'submitMissionLoggerRequest',
    'wait',
    'writeMissionLoggerState',
    'refreshMissionLoggerSyncLock',
    `"use strict";
     const MF_MISSION_LOGGER_BUSY_RETRY_DELAYS_MS = Object.freeze([2000, 5000, 15000]);
     const MF_MISSION_LOGGER_BATCH_CONFIRM_RETRY_DELAY_MS = 1000;
     ${uploadBatch}
     return submitMissionLoggerUploadBatch;`
  )(
    submit,
    async delay => { waits.push(delay); },
    state => { states.push(state); },
    () => true
  );
}

const identity = {
  playerId: '1988',
  playerName: 'Conroy',
  legacyPlayerName: 'Conroy',
  deviceId: 'device-conroy',
  deviceLabel: 'Windows · Chrome'
};
const pending = { batchId: 'stable-batch-1' };
const events = [{ eventId: 'event-1' }];

{
  const calls = [];
  const waits = [];
  const states = [];
  const run = makeRunner(async (action, payload) => {
    calls.push({ action, payload });
    if (calls.length < 3) {
      const error = new Error('busy');
      error.code = 'LOGGER_BUSY';
      throw error;
    }
    return { ok: true, batchId: payload.batchId };
  }, waits, states);
  const result = await run(identity, pending, events, 'owner');
  expect(result.ok === true, 'Busy upload must eventually return the acknowledgement');
  expect(calls.length === 3, 'Two busy responses must produce exactly two bounded retries');
  expect(calls.every(call => call.payload.batchId === pending.batchId), 'Busy retries must preserve the same batch ID');
  expect(JSON.stringify(waits) === JSON.stringify([2000, 5000]), 'Busy backoff order is incorrect');
  expect(states.every(state => String(state.drainMessage || '').includes('same batch ID')), 'Busy status must explain idempotent retry');
}

{
  const calls = [];
  const waits = [];
  const states = [];
  const run = makeRunner(async (action, payload) => {
    calls.push({ action, payload });
    if (calls.length === 1) {
      const error = new Error('timeout');
      error.code = 'LOGGER_TIMEOUT';
      throw error;
    }
    return { ok: true, batchId: payload.batchId };
  }, waits, states);
  await run(identity, pending, events, 'owner');
  expect(calls.length === 2, 'A timeout must receive one confirmation retry');
  expect(calls.every(call => call.payload.batchId === pending.batchId), 'Timeout confirmation must preserve the same batch ID');
  expect(JSON.stringify(waits) === JSON.stringify([1000]), 'Timeout confirmation delay changed unexpectedly');
}

{
  const calls = [];
  const waits = [];
  const states = [];
  const run = makeRunner(async () => {
    calls.push(true);
    const error = new Error('busy');
    error.code = 'LOGGER_BUSY';
    throw error;
  }, waits, states);
  let rejected = null;
  try {
    await run(identity, pending, events, 'owner');
  } catch (error) {
    rejected = error;
  }
  expect(rejected?.code === 'LOGGER_BUSY', 'Exhausted busy retries must surface LOGGER_BUSY');
  expect(calls.length === 4, 'Busy retry count must remain bounded to the initial request plus three retries');
  expect(JSON.stringify(waits) === JSON.stringify([2000, 5000, 15000]), 'All configured busy delays must be used once');
}

expect(backend.includes("buildId: '1.1.10-upload-lock-hotfix-1'"), 'Backend build marker must identify the hotfix');
expect(backend.includes('uploadLockWaitMs: 2000'), 'Backend lock acquisition must be bounded to two seconds');
const backendUpload = extractFunction(backend, 'handleLoggerUpload_');
expect(backendUpload.includes('lock.tryLock(MC_LOGGER.uploadLockWaitMs)'), 'Upload endpoint must use bounded tryLock');
expect(!backendUpload.includes('lock.waitLock(30000)'), 'Upload endpoint must not consume the old 30-second wait budget');
expect(backendUpload.includes("'LOGGER_BUSY'"), 'Lock contention must return an explicit LOGGER_BUSY code');
const doPost = extractFunction(backend, 'doPost');
expect(doPost.includes("retryable: errorCode === 'LOGGER_BUSY'"), 'Busy response must be marked retryable');

console.log('Mission Analytics v1.1.10 hotfix regression passed: top-window recorder ownership, 120-second acknowledgement window, stable batch IDs and bounded LOGGER_BUSY backoff are locked.');
