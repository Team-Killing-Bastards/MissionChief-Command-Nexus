#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);
const fail = message => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Missing function ${name}`);
  const parameterStart = source.indexOf('(', start);
  let parameterDepth = 0;
  let quote = '';
  let escaped = false;
  let brace = -1;
  for (let index = parameterStart; index < source.length; index += 1) {
    const character = source[index];
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
        brace = source.indexOf('{', index);
        break;
      }
    }
  }
  if (brace < 0) fail(`Missing body for ${name}`);
  let depth = 0;
  quote = '';
  escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = brace; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
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
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  fail(`Unable to isolate ${name}`);
}

for (const token of [
  'MF_MISSION_LOGGER_MAX_QUEUE_EVENTS = 1200',
  'MF_MISSION_LOGGER_MAX_QUEUE_CHARS = 3000000',
  'MF_MISSION_LOGGER_BATCH_SIZE = 40',
  'MF_MISSION_LOGGER_AUTO_DRAIN_MAX_BATCHES = 8',
  'MF_MISSION_LOGGER_MANUAL_DRAIN_MAX_BATCHES = 12',
  'MF_MISSION_LOGGER_EAGER_SYNC_THRESHOLD = 20',
  'MF_MISSION_LOGGER_DEFERRED_DRAIN_DELAY_MS = 1000',
  'MF_MISSION_LOGGER_DRAIN_REQUEST_KEY =',
  'MF_MISSION_LOGGER_SYNC_LOCK_LEASE_MS =',
  'MF_MISSION_LOGGER_BATCH_CONFIRM_RETRY_DELAY_MS = 1000',
]) {
  expect(source.includes(token), `Missing outbox contract ${token}`);
}

const priority = extractFunction('getMissionLoggerQueueEventPriority');
const dropIndex = extractFunction('findMissionLoggerQueueDropIndex');
const bound = extractFunction('boundMissionLoggerQueue');
const runtime = Function(
  `"use strict";
   const MF_MISSION_LOGGER_MAX_QUEUE_EVENTS = 1200;
   const MF_MISSION_LOGGER_MAX_QUEUE_CHARS = 3000000;
   ${priority}
   ${dropIndex}
   ${bound}
   return boundMissionLoggerQueue;`
)();
const events = [
  { eventId: 'dispatch-old', eventType: 'dispatch' },
  { eventId: 'observed-old', eventType: 'mission-observed' },
  { eventId: 'credit', eventType: 'mission-credit' },
  { eventId: 'observed-new', eventType: 'mission-observed' },
];
const bounded = runtime(events, { maxEvents: 3, maxChars: 3000000 });
expect(bounded.queue.some(event => event.eventId === 'dispatch-old'), 'Overflow must preserve dispatch evidence before observations');
expect(bounded.queue.some(event => event.eventId === 'credit'), 'Overflow must preserve exact-credit evidence before observations');
expect(!bounded.queue.some(event => event.eventId === 'observed-old'), 'The oldest lowest-priority observation must be discarded first');
expect(bounded.droppedTypes['mission-observed'] === 1, 'Overflow diagnostics must identify the dropped observation');

const sync = extractFunction('syncMissionLoggerNow');
for (const token of [
  'batchNumber < maxBatches',
  'MF_MISSION_LOGGER_DRAIN_MAX_MS',
  'submitMissionLoggerUploadBatch(',
  'await wait(\n                    MF_MISSION_LOGGER_DRAIN_GAP_MS',
  "'backlog remains after bounded drain'",
]) {
  expect(sync.includes(token), `Backlog drain missing ${token}`);
}
expect(
  (sync.match(/submitMissionLoggerUploadBatch\(/g) || []).length === 1,
  'One retry-safe batch helper must be reused inside the bounded batch loop'
);

const batchSubmit = extractFunction('submitMissionLoggerUploadBatch');
for (const token of [
  'attempt < 2',
  'refreshMissionLoggerSyncLock(lockOwner)',
  "String(error?.code || '') !==",
  "'LOGGER_TIMEOUT'",
  'MF_MISSION_LOGGER_BATCH_CONFIRM_RETRY_DELAY_MS',
  'submitMissionLoggerRequest(',
]) {
  expect(batchSubmit.includes(token), `Batch confirmation retry missing ${token}`);
}
const refreshLock = extractFunction('refreshMissionLoggerSyncLock');
expect(
  refreshLock.includes('MF_MISSION_LOGGER_SYNC_LOCK_LEASE_MS'),
  'Each batch must renew the shared cross-tab lock before submission'
);
expect(
  source.includes("error.code = 'LOGGER_TIMEOUT'"),
  'Request timeout must expose a stable retry code'
);
for (const token of [
  'if (mfMissionLoggerSyncActive)',
  'scheduleMissionLoggerDeferredDrain(',
  "'waiting for another MissionChief tab'",
  'mfMissionLoggerManualDrainRequested',
]) {
  expect(sync.includes(token), `Manual sync follow-up missing ${token}`);
}

const deferred = extractFunction('scheduleMissionLoggerDeferredDrain');
for (const token of [
  'mfMissionLoggerManualDrainRequested = true',
  'MF_MISSION_LOGGER_DEFERRED_DRAIN_DELAY_MS',
  'skipCreditReconcile: true',
  'backlog: true',
  'if (!MF_IS_TOP_WINDOW)',
  'MF_MISSION_LOGGER_DRAIN_REQUEST_KEY',
  'localStorage.setItem(',
]) {
  expect(deferred.includes(token), `Deferred drain missing ${token}`);
}
expect(
  source.includes("? 'Drain queued'"),
  'Sync Now must visibly confirm when a full drain is queued behind an active upload'
);
expect(
  !source.includes(`!identity ||
                mfMissionLoggerSyncActive;`),
  'Sync Now must remain available while another automatic batch is active'
);

expect(
  source.includes('event.key ===\n                    MF_MISSION_LOGGER_DRAIN_REQUEST_KEY'),
  'The top-window storage listener must receive manual drain requests from mission frames and pop-outs'
);
expect(
  source.includes('Uploaded ${batchEvents.length} event'),
  'The logger UI must expose accepted-batch progress instead of leaving the queue count unexplained'
);

const eager = extractFunction('scheduleMissionLoggerEagerSync');
expect(eager.includes('MF_MISSION_LOGGER_EAGER_SYNC_THRESHOLD'), 'Eager sync must keep the queue threshold');
expect(eager.includes('skipCreditReconcile: true'), 'Backlog-only follow-up must not repeat expensive credit reconciliation');
const enqueue = extractFunction('queueMissionLoggerEvent');
expect(enqueue.includes('scheduleMissionLoggerEagerSync('), 'Every successful enqueue must consider eager upload');

console.log('Mission logger outbox regression passed: 1,200-event/3 MB safety bound, priority retention, eager upload, bounded multi-batch drain, cross-frame manual hand-off, lock renewal and timeout confirmation retry are locked.');
