#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`async function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const brace = source.indexOf('{', source.indexOf(')', start));
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = brace; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

const autoLoop = extractFunction('runAutoModeLoop');
const start = autoLoop.indexOf('if (!vehicleLoadState.ready) {');
const end = autoLoop.indexOf("updateStatusBox('Auto Mode dispatching mission...');", start);
assert.ok(start >= 0 && end > start, 'the final non-ready dispatch gate must be isolatable');
const nonReady = autoLoop.slice(start, end);

assert.doesNotMatch(nonReady, /clickDispatchOnly\s*\(/,
  'an under-covered mission must never dispatch the partial checked set');
assert.doesNotMatch(nonReady, /clickMissionDispatchByValue\s*\(/,
  'an under-covered mission must never use the completed-dispatch route');
assert.doesNotMatch(nonReady, /claimAutoMissionDispatch\s*\(/,
  'an under-covered mission must not claim a dispatch it will not perform');
assert.doesNotMatch(nonReady, /MF_FINAL_QUEUE_DISPATCH_FLAG/,
  'an under-covered mission must not arm final-queue dispatch state');
assert.match(nonReady, /Required mission resource is unavailable/,
  'a partial selection must use the controller recoverable-resource-shortage wording');
assert.match(nonReady, /No vehicles were dispatched\./,
  'the stop reason must state that the partial selection was held');
assert.match(nonReady, /Unit Finder selected 0 vehicles after a full-list retry/,
  'the existing zero-selection fail-closed route must remain intact');
assert.ok(!source.includes('Auto Mode: units not ready. Dispatching to skip mission...'),
  'the old partial-dispatch status must be removed');

console.log('PASS: Auto Mode fails closed on incomplete coverage and never sends a partial vehicle set merely to skip the mission.');
