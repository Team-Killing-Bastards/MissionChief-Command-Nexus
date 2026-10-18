import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('./extension/nexus-runtime.js');
const previous = read('../3.0.43.224/extension/nexus-runtime.js');
function recovery(text) {
  return text.slice(text.indexOf('function createNexusRecovery(env) {'), text.indexOf('\nwindow.__NEXUS_RECOVERY__ ='));
}
let checks = 0;
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
function fixture(text, seed = null) {
  let now = 1792317028466;
  const store = new Map(seed ? [['nexus-recovery-v1', JSON.stringify(seed)]] : []);
  const events = [];
  const env = {
    localStorage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) },
    document: { querySelector: () => ({ getAttribute: () => '/profile/123', textContent: 'Test account' }) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    dispatchEvent: event => events.push(JSON.parse(event.detail)),
  };
  env.top = env;
  const context = vm.createContext({ Date: { now: () => now }, env });
  vm.runInContext(recovery(text) + '; globalThis.api = createNexusRecovery(env);', context);
  return { api: context.api, store, events, advance: ms => { now += ms; }, reload: () => vm.runInContext('globalThis.api = createNexusRecovery(env)', context) };
}
const family = 'Large Aircraft Crash Off Airport';
for (const text of [previous, source]) {
  const f = fixture(text);
  for (const id of ['1', '2']) {
    eq(f.api.attempt(id, 'RESOURCE_SHORTAGE', family), true, 'each initial mission gets a bounded recheck');
    f.api.outcome(id, false);
  }
  eq(f.api.attempt('3', 'RESOURCE_SHORTAGE', family), text === source,
    text === source ? 'later aircraft missions are no longer poisoned by two earlier failures' : 'reproduces .224 family-wide suppression');
}
for (const category of ['RESOURCE_SHORTAGE', 'PERSONNEL_SHORTAGE']) {
  const seed = { attempts: {}, profiles: { [`${category}:${family}`]: { failures: 20, successes: 0, at: 1792317028466 } } };
  const f = fixture(source, seed);
  eq(f.api.attempt('4', category, family), true, 'legacy history does not block new recovery');
  eq(f.api.attempt('4', category, family), false, 'same pending mission cannot loop');
  f.api.outcome('4', false);
  eq(f.api.attempt('4', category, family), false, 'same failed mission cannot loop');
  eq(f.reload().attempt('4', category, family), false, 'reload retains the mission attempt guard');
  eq(f.api.attempt('4', 'DIFFERENT_CATEGORY', 'Changed caption'), false, 'changing a reason does not reset the mission guard');
  eq(f.api.attempt('5', category, family), true, 'a different mission remains eligible');
  f.api.outcome('5', true);
  const outcomes = f.events.filter(e => e.kind === 'recovery-result');
  eq(outcomes.map(e => e.outcome).join(','), 'shortage-persists,selection-ready', 'outcomes remain accurate');
  f.advance(21600001);
  eq(f.api.attempt('4', category, family), true, 'existing six-hour per-mission expiry is preserved');
}
const bounded = fixture(source);
for (let i = 0; i < 150; i++) { bounded.api.attempt(String(i), 'RESOURCE_SHORTAGE', `Mission ${i}`); bounded.api.outcome(String(i), false); }
eq(bounded.api.snapshot().attempts, 100, 'attempt history stays bounded');
eq(bounded.api.snapshot().profiles, 100, 'outcome history stays bounded');
eq(/setInterval|setTimeout|fetch\(/.test(recovery(source)), false, 'recovery adds no polling, timers or network calls');

// Aside from the explicitly tested HazMat fallback functions, the runtime remains
// identical: crew checks, ownership, transport and dispatch safeguards included.
const oldBlock = `    const profile = data.profiles[signature];
    // Repeated proven unsuccessful full searches are skipped; records expire in a week.
    if (profile?.failures >= 2 && !profile?.successes) return false;`;
const newBlock = `    // Availability and crew evidence belong to this mission and this attempt.
    // Historical failures for a mission name cannot veto another mission's recheck.
    // The per-mission attempt above still prevents repeated recovery loops.`;
function fn(name, text) {
  const start = new RegExp('^ {0,8}(?:async )?function ' + name + '\\(', 'm').exec(text);
  assert(start, name);
  const end = /\n {0,4}(?:async )?function /.exec(text.slice(start.index + start[0].length));
  assert(end, name);
  return text.slice(start.index, start.index + start[0].length + end.index);
}
let restored = source.replaceAll('3.0.43.225', '3.0.43.224').replace(newBlock, oldBlock);
restored = restored.replace(fn('nexusHazmatAlternativeTypes', restored) + '\n', '');
for (const name of ['nexusFleetPreferenceTypes', 'getAllMatchingVehicleCheckboxes',
  'countSelectedMatchingVehicles', 'collapseSharedFireOperationalSupportRequirements']) {
  restored = restored.replace(fn(name, restored), fn(name, previous));
}
eq(restored, previous, 'no unreviewed runtime changes outside recovery and HazMat fallback');
fs.writeFileSync(new URL('./recovery-validation.json', import.meta.url), JSON.stringify({ checks, oldRegressionReproduced: true, liveGameVerified: false }, null, 2) + '\n');
console.log(`${checks} shortage recovery checks passed; .224 suppression reproduced and corrected.`);
