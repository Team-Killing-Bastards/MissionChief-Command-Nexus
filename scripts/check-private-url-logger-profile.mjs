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
  const candidates = [`async function ${name}(`, `function ${name}(`];
  const start = candidates
    .map(marker => text.indexOf(marker))
    .find(index => index >= 0);
  if (start === undefined) fail(`Missing function ${name}`);

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
  fail(`Unable to bound ${name}`);
}

expect(source.includes("Object.freeze(['Marty', 'Conroy'])"), 'The two approved user choices must be explicit');
expect(source.includes('Save logger setup'), 'The simple logger setup button must exist');
expect(source.includes('Forget setup'), 'The local setup reset must exist');
expect(source.includes('There is no pairing code or expiring device token.'), 'The UI must explain the new identity model');
expect(!source.includes('Pair this browser'), 'Legacy pairing UI must be absent');
expect(!source.includes('One-time pairing code'), 'Legacy pairing code input must be absent');
expect(!source.includes('MF_MISSION_LOGGER_DEFAULT_ENDPOINT'), 'The private deployment URL must not be committed');
expect(!/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/.test(source), 'No live Apps Script deployment URL may be embedded');
expect(!/\n\s*async\s*\n\s*function\s+/.test(source), 'Removing legacy pairing must not leave a standalone async runtime expression');

const profile = extractFunction(source, 'readMissionLoggerIdentity');
expect(profile.includes('MF_MISSION_LOGGER_PROFILE_KEY'), 'Runtime identity must come from the v2 profile');
expect(profile.includes('playerName'), 'Runtime profile must include the selected user');
expect(profile.includes('deviceId'), 'Runtime profile must retain diagnostic device identity');
expect(!profile.includes('token'), 'Runtime profile must not require a token');

const save = extractFunction(source, 'saveMissionLoggerSetup');
for (const token of [
  'clearMissionLoggerProfileScopedData()',
  'MF_MISSION_LOGGER_LEGACY_IDENTITY_KEY',
  'writeMissionLoggerIdentity(profile)',
  "localStorage.setItem(\n            MF_MISSION_LOGGER_ENDPOINT_KEY",
  'recordMissionLoggerObservedEvent()',
]) {
  expect(save.includes(token), `Setup migration missing ${token}`);
}

const upload = extractFunction(source, 'submitMissionLoggerUploadBatch');
expect(upload.includes('profileName: identity.playerName'), 'Upload must send the selected user name');
expect(upload.includes('deviceId: identity.deviceId'), 'Upload must keep device diagnostics');
expect(!upload.includes('identity.token'), 'Upload must not send an old device token');

const route = extractFunction(backend, 'doPost');
expect(route.includes("action === 'upload'"), 'Private backend must accept uploads');
expect(route.includes("'PAIRING_DISABLED'"), 'Legacy pair/revoke actions must be rejected');

const backendUpload = extractFunction(backend, 'handleLoggerUpload_');
for (const token of [
  'payload.profileName || payload.playerName',
  'resolveActiveLoggerProfile_(',
  'upsertLoggerProfileDevice_(',
  'const playerId = profile.playerId',
]) {
  expect(backendUpload.includes(token), `Private backend upload missing ${token}`);
}
expect(!backendUpload.includes('payload.token'), 'Private backend must not read a token');
expect(!backendUpload.includes('authenticateLoggerDevice_('), 'Private backend must not authenticate a device token');

const resolver = extractFunction(backend, 'resolveActiveLoggerProfile_');
expect(resolver.includes("player.status === 'ACTIVE'"), 'Only active Players rows may receive data');
expect(resolver.includes("'PROFILE_NOT_FOUND'"), 'Unknown user names must fail clearly');
expect(resolver.includes("'PROFILE_AMBIGUOUS'"), 'Duplicate active display names must fail closed');

const device = extractFunction(backend, 'upsertLoggerProfileDevice_');
expect(device.includes("'',\n    'ACTIVE'"), 'New device diagnostics must store no token hash');
expect(device.includes('safeSheetText_(playerId)'), 'A browser can move to the selected user without token rotation');

console.log('Private URL + user logger profile regression passed.');
