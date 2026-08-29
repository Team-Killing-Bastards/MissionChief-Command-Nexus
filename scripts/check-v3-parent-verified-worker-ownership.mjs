#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
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
    if (character === '}' && --depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  assert.fail(`${name} is unterminated`);
}

const createWorker = extractFunction('createWorker');
const managedWorkerCheck = extractFunction('isMfV3ManagedActiveWorker');
const observerGate = extractFunction(
  'shouldKeepMissionFinderObserverForCurrentFrame'
);

assert.match(
  source,
  /window\.__MCN_V3_VERIFY_ACTIVE_WORKER__ = \(candidateWindow, generationToken = ''\) =>/,
  'the top controller must expose an exact Worker A verifier'
);
for (const proof of [
  'frame.contentWindow !== candidateWindow',
  "frame.getAttribute(ACTIVE_WORKER_GENERATION_ATTRIBUTE) === expectedGeneration",
  "frame.getAttribute('data-mcn-v3-worker') === 'true'",
  'state.wanted',
  'state.stopping',
]) {
  assert.ok(source.includes(proof), `active-worker proof lost: ${proof}`);
}

assert.ok(
  createWorker.indexOf('state.worker = frame;') <
    createWorker.indexOf('document.body.appendChild(frame);'),
  'the controller must publish Worker A identity before document-start can run'
);
assert.match(
  createWorker,
  /setAttribute\(ACTIVE_WORKER_GENERATION_ATTRIBUTE, String\(generation\)\)/,
  'every new Worker A must carry its exact generation token'
);
assert.match(
  managedWorkerCheck,
  /isMfV3ParentVerifiedActiveWorker\(\)/,
  'Mission Finder must require parent-verified frame identity'
);
assert.match(
  managedWorkerCheck,
  /ownershipBridge\?\.activate\?\.\(\)/,
  'a verified Worker A must repair its current-document storage bridge'
);
assert.match(
  observerGate,
  /if \(!isMfV3ParentVerifiedActiveWorker\(\)\) return false;/,
  'a stale managed frame must fail closed at the observer gate'
);
assert.match(
  source,
  /if \(name\.startsWith\(ACTIVE_WORKER_NAME_PREFIX\)\) \{\s*return isParentVerifiedActiveWorker\(\);\s*\}/,
  'an active-looking frame name alone must not admit the heavy runtime'
);

console.log('V3 parent-verified Worker A ownership regression checks passed.');
