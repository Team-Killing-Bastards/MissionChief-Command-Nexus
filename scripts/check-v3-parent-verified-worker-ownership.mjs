#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

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
const verifierStart = source.indexOf(
  'window.__MCN_V3_VERIFY_ACTIVE_WORKER__ = '
);
const verifierEnd = source.indexOf('\n};', verifierStart) + 3;
assert.ok(
  verifierStart >= 0 && verifierEnd > verifierStart,
  'the top Worker A verifier must be extractable'
);
const verifierSource = source.slice(verifierStart, verifierEnd);

assert.match(
  source,
  /window\.__MCN_V3_VERIFY_ACTIVE_WORKER__ = \(generationToken = ''\) =>/,
  'the top controller must expose a generation-scoped Worker A verifier'
);
for (const proof of [
  "frame.getAttribute(ACTIVE_WORKER_GENERATION_ATTRIBUTE) === expectedGeneration",
  "frame.getAttribute('data-mcn-v3-worker') === 'true'",
  'state.wanted',
  'state.stopping',
]) {
  assert.ok(source.includes(proof), `active-worker proof lost: ${proof}`);
}
assert.ok(
  !source.includes('frame.contentWindow !== candidateWindow'),
  'Worker A admission must not depend on cross-realm WindowProxy identity'
);
assert.ok(
  source.includes('verifier(generationToken) === true'),
  'the child must prove the exact generation without passing a cross-realm window wrapper'
);

const attributes = new Map([
  ['data-mcn-v3-worker-generation', '7'],
  ['data-mcn-v3-worker', 'true'],
]);
const activeFrame = {
  isConnected: true,
  name: 'mcn-v3-active-worker-7-259458804',
  getAttribute: name => attributes.get(name) || '',
};
const verifierContext = vm.createContext({
  window: {},
  state: {
    wanted: true,
    stopping: false,
    worker: activeFrame,
    workerGeneration: 7,
  },
  ACTIVE_WORKER_NAME_PREFIX: 'mcn-v3-active-worker-',
  ACTIVE_WORKER_GENERATION_ATTRIBUTE: 'data-mcn-v3-worker-generation',
});
vm.runInContext(verifierSource, verifierContext);
assert.equal(
  verifierContext.window.__MCN_V3_VERIFY_ACTIVE_WORKER__('7'),
  true,
  'the exact current generation must admit the genuine Worker A after transport return'
);
assert.equal(
  verifierContext.window.__MCN_V3_VERIFY_ACTIVE_WORKER__('6'),
  false,
  'a stale generation must fail closed'
);
verifierContext.state.stopping = true;
assert.equal(
  verifierContext.window.__MCN_V3_VERIFY_ACTIVE_WORKER__('7'),
  false,
  'a stopping controller must reject Worker A'
);
verifierContext.state.stopping = false;
activeFrame.isConnected = false;
assert.equal(
  verifierContext.window.__MCN_V3_VERIFY_ACTIVE_WORKER__('7'),
  false,
  'a detached Worker A must fail closed'
);
activeFrame.isConnected = true;
attributes.set('data-mcn-v3-worker', 'false');
assert.equal(
  verifierContext.window.__MCN_V3_VERIFY_ACTIVE_WORKER__('7'),
  false,
  'a frame without exact active-worker metadata must fail closed'
);

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
