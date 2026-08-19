#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const backend = await readFile('integrations/google-apps-script/Code.gs', 'utf8');
function fail(message) { console.error(`ERROR: ${message}`); process.exit(1); }
function expect(condition, message) { if (!condition) fail(message); }

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

expect(source.includes("querySelector('#navbar_profile_link')"), 'Navbar profile link must be authoritative');
expect(source.includes("/^\\/profile\\/(\\d+)\\/?$/"), 'Profile href must resolve an exact numeric MissionChief ID');
expect(source.includes('const MF_MISSION_LOGGER_FIXED_ENDPOINT ='), 'Private deployment endpoint must be compiled into this trusted two-user build');
expect(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/.test(source), 'The live Apps Script endpoint must be embedded');
expect(source.includes('Sharing &amp; Sync'), 'Logger settings must use the Sharing & Sync heading');
expect(source.includes('Share and sync my MissionChief activity automatically'), 'Logger settings must expose the single sharing checkbox');
for (const removed of [
  'Private Google logger URL',
  'MissionChief user (detected automatically)',
  'Save logger setup',
  '>Sync now<',
  '>Forget setup<',
]) {
  expect(!source.includes(removed), `Removed logger setup UI must stay absent: ${removed}`);
}
expect(source.includes('profileId: identity.playerId'), 'Upload must send stable numeric profile ID');
expect(source.includes('username: identity.playerName'), 'Upload must send current navbar username');
expect(source.includes('identity.legacyPlayerName ||'), 'Old backend compatibility alias must remain during rollout');
expect(!source.includes('Pair this browser'), 'Legacy pairing UI must remain absent');
expect(!source.includes('One-time pairing code'), 'Legacy pairing input must remain absent');

const identity = extractFunction(source, 'readMissionLoggerIdentity');
for (const token of [
  'resolveMissionChiefNavbarIdentity()',
  "createMissionLoggerId('device')",
  'writeMissionLoggerIdentity(profile)',
  'MF_MISSION_LOGGER_LEGACY_IDENTITY_KEY',
]) {
  expect(identity.includes(token), `Automatic navbar provisioning missing ${token}`);
}
expect(!identity.includes('clearMissionLoggerProfileScopedData'), 'Automatic identity provisioning must preserve queued data');

const setup = extractFunction(source, 'saveMissionLoggerSetup');
expect(setup.includes('MF_MISSION_LOGGER_FIXED_ENDPOINT'), 'Compatibility setup helper must use the fixed endpoint');
expect(setup.includes('readMissionLoggerIdentity()'), 'Compatibility setup helper must use automatic navbar identity');
expect(setup.includes('scheduleMissionLoggerDeferredDrain('), 'Compatibility setup helper must start backlog draining');
expect(!setup.includes('clearMissionLoggerProfileScopedData'), 'Fixed endpoint provisioning must never clear queued data');

expect(backend.includes('resolveOrCreateMissionChiefNavbarProfile_'), 'Backend must resolve/create numeric navbar identities');
expect(backend.includes("/^\\d{1,20}$/"), 'Backend profile IDs must be strictly numeric');
expect(backend.includes("'Auto-created from #navbar_profile_link'"), 'New navbar users must be auditable');
expect(backend.includes("'PAIRING_DISABLED'"), 'Legacy pair/revoke actions must remain disabled');
const uploadStart = backend.indexOf('function handleLoggerUpload_(payload)');
const uploadEnd = backend.indexOf('\nfunction ', uploadStart + 'function handleLoggerUpload_(payload)'.length);
const uploadHandler = backend.slice(uploadStart, uploadEnd);
expect(uploadStart >= 0 && uploadEnd > uploadStart, 'Private upload handler must be isolatable');
expect(!uploadHandler.includes('payload.token'), 'Private upload handler must not require upload tokens');
expect(backend.includes("buildId: '1.1.12-multi-device-performance-1'"), 'Activity backend build marker must remain compatible');
console.log('Fixed private endpoint + automatic MissionChief profile regression passed.');
