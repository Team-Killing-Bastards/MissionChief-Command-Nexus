#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `function ${name} must exist`);
  const brace = source.indexOf('{', start);
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
  assert.fail(`function ${name} is unterminated`);
}

assert.ok(source.includes('const PRISONER_HANDOFF_REDIRECT_RECOVERY_MS = 12000;'));
const recovery = extractFunction('maybeRecoverStrandedPrisonerHandoff');
for (const token of [
  '/prisoner cell handoff|assigning prisoner/i',
  'sleepRecoveryMissionUrl(href)',
  "'reload-exact-mission-after-prisoner-handoff-redirect'",
  'createWorker(recoveryUrl)',
]) assert.ok(recovery.includes(token), `prisoner redirect recovery lost ${token}`);
assert.doesNotMatch(recovery, /\.click\s*\(|clickDispatch/i, 'prisoner recovery must never click Dispatch');
assert.doesNotMatch(recovery, /skip(?:Current)?Mission\s*\(/i, 'prisoner recovery must never skip');

const storage = new Map();
const sessionStorage = {
  getItem: key => storage.has(key) ? storage.get(key) : null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
};
const latchContext = vm.createContext({
  sessionStorage,
  Date,
  JSON,
  MF_AUTO_DISPATCH_LATCH_KEY: 'test-dispatch-latch',
  MF_AUTO_DISPATCH_LATCH_TTL_MS: 300000,
});
vm.runInContext(
  `${extractFunction('claimAutoMissionDispatch')}\n${extractFunction('releaseAutoMissionDispatch')}\nthis.claim = claimAutoMissionDispatch; this.release = releaseAutoMissionDispatch;`,
  latchContext
);
assert.equal(latchContext.claim('258879609'), true, 'first Dispatch claim must succeed');
assert.equal(latchContext.claim('258879609'), false, 'repeat Dispatch on the same mission must be blocked');
assert.equal(latchContext.claim('258879636'), true, 'a new mission must obtain its own Dispatch claim');
latchContext.release('258879636');
assert.equal(latchContext.claim('258879636'), true, 'a failed click may release and retry its claim');

assert.ok(source.includes('claimAutoMissionDispatch(autoCycleMissionId)'));
assert.ok(source.includes('releaseAutoMissionDispatch(autoCycleMissionId)'));

console.log('PASS: prisoner handoff redirect recovery is no-dispatch/fail-closed and repeat mission Dispatch claims are blocked atomically.');
