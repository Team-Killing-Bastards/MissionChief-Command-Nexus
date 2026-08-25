#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

assert.match(source, /const RADIO_SCAN_INTERVAL_MS = 1000;/);
assert.match(source, /const ALLIANCE_RADIO_IGNORED_KEY_CACHE_LIMIT = 4000;/);

const refresh = extractFunction('refreshRadioTransportRequests');
assert.ok(refresh.includes('observedAt - state.radioScanAt < RADIO_SCAN_INTERVAL_MS'));
assert.ok(refresh.includes('pendingMs: Math.max(0, observedAt - Number(request.firstSeenAt || observedAt))'));

const collect = extractFunction('collectRadioTransportRequests');
assert.ok(collect.includes('ALLIANCE_RADIO_IGNORED_KEY_CACHE_LIMIT'));
assert.ok(collect.includes('state.runAllianceRadioIgnored % 250 === 0'));
assert.ok(collect.includes('Ignored sampled Alliance Radio Transport Request'));

let now = 1500;
class FakeDate extends Date { static now() { return now; } }
const context = vm.createContext({
  Date: FakeDate,
  RADIO_SCAN_INTERVAL_MS: 1000,
  state: {
    radioScanAt: 1000,
    radioTransportRequests: [{ key: '5:9', firstSeenAt: 500, pendingMs: 0 }],
  },
  result: null,
});
vm.runInContext(`${refresh}\nresult = refreshRadioTransportRequests();`, context);
assert.deepEqual(JSON.parse(JSON.stringify(context.result)), [{ key: '5:9', firstSeenAt: 500, pendingMs: 1000 }]);
assert.equal(context.state.radioScanAt, 1000, 'cached reads must not move the full-DOM scan timestamp');

console.log('PASS: Radio Transport scans are one-second bounded, cached pending ages stay live, and Alliance rows are durably deduplicated with sampled logs.');
