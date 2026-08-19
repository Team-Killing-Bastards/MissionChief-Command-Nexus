#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
function fail(message) { console.error(`ERROR: ${message}`); process.exit(1); }
function expect(condition, message) { if (!condition) fail(message); }

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

expect(source.includes('const MF_MISSION_LOGGER_FIXED_ENDPOINT ='), 'Fixed private endpoint constant is missing');
expect(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/.test(source), 'Fixed private endpoint is not a deployed Apps Script /exec URL');

const uiStart = source.indexOf("const missionLoggerBox = document.createElement('div');");
const uiEnd = source.indexOf("const queueRestartBox = document.createElement('div');", uiStart);
expect(uiStart >= 0 && uiEnd > uiStart, 'Sharing & Sync UI block is missing');
const ui = source.slice(uiStart, uiEnd);
expect(ui.includes('Sharing &amp; Sync'), 'Sharing & Sync heading is missing');
expect(ui.includes('Share and sync my MissionChief activity automatically'), 'Sharing checkbox label is missing');
expect((ui.match(/type=\"checkbox\"/g) || []).length === 1, 'Sharing & Sync must contain exactly one checkbox');
for (const forbidden of [
  'type="url"',
  'type="text"',
  '<button',
  'mf-mission-logger-endpoint',
  'mf-mission-logger-player',
  'mf-mission-logger-save',
  'mf-mission-logger-sync',
  'mf-mission-logger-forget',
  'mf-mission-logger-profile',
  'mf-mission-logger-state',
  'mf-mission-logger-queue',
  'mf-mission-logger-last-sync',
  'mf-mission-logger-credit-status',
  'mf-mission-logger-error',
]) {
  expect(!ui.includes(forbidden), `Sharing & Sync exposes forbidden UI: ${forbidden}`);
}
for (const token of [
  'MF_MISSION_LOGGER_ENABLED_KEY',
  'MF_MISSION_LOGGER_FIXED_ENDPOINT',
  'readMissionLoggerIdentity();',
  'startMissionLoggerSyncTimer();',
  'scheduleMissionLoggerDeferredDrain(',
  'stopMissionLoggerSyncTimer();',
  'stopMissionLoggerCreditReconciliation();',
]) {
  expect(ui.includes(token), `Sharing checkbox flow missing ${token}`);
}
expect(!ui.includes('clearMissionLoggerProfileScopedData'), 'Sharing checkbox must never clear the queue');

const identity = extractFunction(source, 'readMissionLoggerIdentity');
expect(identity.includes('resolveMissionChiefNavbarIdentity()'), 'Identity must come from the MissionChief navbar');
expect(identity.includes("createMissionLoggerId('device')"), 'Fresh browsers must receive a diagnostic device ID automatically');
expect(identity.includes('writeMissionLoggerIdentity(profile)'), 'Automatic identity must persist');
expect(!identity.includes('clearMissionLoggerProfileScopedData'), 'Automatic identity migration must preserve the queue');

const setup = extractFunction(source, 'saveMissionLoggerSetup');
expect(setup.includes('MF_MISSION_LOGGER_FIXED_ENDPOINT'), 'Compatibility setup helper must use the fixed endpoint');
expect(setup.includes('scheduleMissionLoggerDeferredDrain('), 'Compatibility setup helper must drain existing backlog');
expect(!setup.includes('clearMissionLoggerProfileScopedData'), 'Compatibility setup helper must preserve existing backlog');

const timer = extractFunction(source, 'startMissionLoggerSyncTimer');
for (const token of [
  'mfMissionLoggerStartupDrainChecked',
  'readMissionLoggerQueue().length > 0',
  "'existing sharing and sync backlog'",
  'manual: true',
]) {
  expect(timer.includes(token), `Startup backlog recovery missing ${token}`);
}

console.log('Hardcoded Sharing & Sync regression passed.');
