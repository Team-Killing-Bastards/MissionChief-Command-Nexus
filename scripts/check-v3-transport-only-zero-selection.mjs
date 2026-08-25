#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const body = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = body; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
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
    if (character === '/' && next === '/') {
      index = source.indexOf('\n', index + 2);
      if (index < 0) break;
      continue;
    }
    if (character === '/' && next === '*') {
      index = source.indexOf('*/', index + 2) + 1;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

const detector = extractFunction('isTransportOnlyZeroSelection');
let candidate = {
  missionId: '259030720',
  actionKind: 'UPGRADE',
  missingText: 'Transport is needed!',
};
const sandbox = vm.createContext({
  state: { currentMissionId: '259030720' },
  mapMissionCandidate() { return candidate; },
  normaliseText(value) { return String(value || '').replace(/\s+/g, ' ').trim(); },
});
vm.runInContext(`${detector}\nthis.detect = isTransportOnlyZeroSelection;`, sandbox);

const exportedStop = 'Auto stopped: Unit Finder selected 0 vehicles after a full-list retry. The mission was not dispatched. Transport is needed!';
assert.equal(sandbox.detect(exportedStop), true, 'the Cruise Liner transport-only upgrade must not be reported as a fleet shortage');

candidate = { ...candidate, missingText: 'Missing Vehicles: 2 Ambulances. Transport is needed!' };
assert.equal(sandbox.detect(exportedStop), false, 'an explicit missing-vehicle requirement must retain zero-selection shortage handling');

candidate = { ...candidate, actionKind: 'NEW', missingText: 'Transport is needed!' };
assert.equal(sandbox.detect(exportedStop), false, 'a new mission must never be excused as a transport-only upgrade');

const recovery = extractFunction('maybeHandleRecoverableAutoStop');
for (const token of [
  'isTransportOnlyZeroSelection(zeroStop.evidence)',
  "'Transport-only upgrade required no additional vehicle dispatch'",
  "category = transportOnly ? 'TRANSPORT_ONLY' : 'ZERO_SELECTION'",
  'zeroSelection = !transportOnly',
]) assert.ok(recovery.includes(token), `transport-only recovery lost: ${token}`);

console.log('PASS: transport-only upgrades are separated from genuine zero-selection vehicle shortages.');
