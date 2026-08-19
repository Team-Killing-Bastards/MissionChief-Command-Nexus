#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(text, name) {
  const marker = `function ${name}(`;
  const start = text.indexOf(marker);
  if (start < 0) fail(`Missing function ${name}`);
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
  for (let index = bodyStart; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1] || '';
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
    if (character === '/' && next === '/') {
      const end = text.indexOf('\n', index + 2);
      index = end < 0 ? text.length : end;
      continue;
    }
    if (character === '/' && next === '*') {
      const end = text.indexOf('*/', index + 2);
      if (end < 0) fail(`Unclosed comment in ${name}`);
      index = end + 1;
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


const listRecord = extractFunction(
  source,
  'getMissionLoggerMissionListRecord'
);
for (const token of [
  'mission?.user_id',
  'getMissionLoggerCurrentUserId()',
  'ownerId !== currentUserId',
  'mission?.caption',
  'mission?.mtid',
  'mission?.alliance_id',
]) {
  expect(listRecord.includes(token), `Generated-mission ownership/data capture missing ${token}`);
}

const generatedEvent = extractFunction(
  source,
  'createMissionLoggerGeneratedEvent'
);
for (const token of [
  "eventType: 'mission-observed'",
  "'mission-list-generated'",
  'missionDefinitionId:',
  'advertisedCredits:',
  'firstObservedAt:',
]) {
  expect(generatedEvent.includes(token), `Generated mission event missing ${token}`);
}

const generatedRecord = extractFunction(
  source,
  'recordMissionLoggerGeneratedMission'
);
for (const token of [
  'MF_MISSION_LOGGER_OBSERVED_RETENTION_MS',
  'options.baselineOnly === true',
  '!mfMissionLoggerGenerationArmed',
  'writeMissionLoggerObservedRegistry(registry)',
  'queueMissionLoggerEvent(',
]) {
  expect(generatedRecord.includes(token), `Generated mission dedupe/baseline guard missing ${token}`);
}
expect(
  generatedRecord.indexOf('const queued = queueMissionLoggerEvent(') <
    generatedRecord.lastIndexOf('registry[record.missionId] = now'),
  'Generated missions must enter the bounded queue before their dedupe timestamp is committed'
);

const installer = extractFunction(
  source,
  'installMissionLoggerMissionGenerationCapture'
);
for (const token of [
  'window.missionMarkerAdd',
  'nativeMissionMarkerAdd.apply(',
  'return result;',
  '__mfMissionLoggerGenerationWrapper',
  'scanMissionLoggerMissionList(document, true)',
]) {
  expect(installer.includes(token), `Native missionMarkerAdd capture missing ${token}`);
}

const mutationFallback = extractFunction(
  source,
  'observeMissionLoggerMissionListMutations'
);
expect(
  mutationFallback.includes('record?.addedNodes'),
  'Existing mutation records must supply the fallback mission-list capture'
);
expect(
  !mutationFallback.includes('new MutationObserver'),
  'Mission generation capture must not create another repeating observer'
);

const observer = extractFunction(source, 'startMissionFinderObserver');
expect(
  observer.includes('installMissionLoggerMissionGenerationCapture()'),
  'Top-window startup must install generated-mission capture'
);
expect(
  observer.includes('observeMissionLoggerMissionListMutations(records)'),
  'The existing main observer must own the mission-list fallback'
);

const openedObservation = extractFunction(
  source,
  'recordMissionLoggerObservedEvent'
);
expect(
  openedObservation.includes('MF_MISSION_LOGGER_OBSERVED_RETENTION_MS'),
  'Opening a generated mission must reuse the same seven-day dedupe registry'
);

console.log(
  'Mission generation logger regression passed: current-user native mission-list creation, initial hydration baseline, callback/mutation dedupe and existing-observer ownership are locked.'
);
