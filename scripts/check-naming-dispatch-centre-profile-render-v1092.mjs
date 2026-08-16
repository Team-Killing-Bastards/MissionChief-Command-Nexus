#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

// A plain hidden /profile iframe does not reproduce the LSSMV4/Vue profile
// modal and selected Buildings tab. Protect its removal and chain the native-row
// replacement regression through this permanent check.
await import('./check-naming-dispatch-centre-native-station-rows-v1093.mjs');

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const hierarchyCheck = await readFile('scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const asyncMarker = `async function ${name}(`;
  const syncMarker = `function ${name}(`;
  const asyncStart = source.indexOf(asyncMarker);
  const start = asyncStart >= 0 ? asyncStart : source.indexOf(syncMarker);
  if (start < 0) fail(`Unable to find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(`Unterminated ${name}`);
}

const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(listLoader.includes('collectNamingDispatchCentresFromStationRows()'), 'Replacement native-row source missing');
expect(!listLoader.includes('/profile/'), 'Superseded profile route must not return');
expect(!source.includes('loadNamingDispatchCentresFromRenderedProfile'), 'Hidden profile renderer must stay removed');
expect(!source.includes('extractNamingDispatchCentresFromProfileDocument'), 'Profile DOM parser must stay removed');
expect(!source.includes('.profile-dispatchcenter'), 'LSSMV4 profile-only selector must stay removed');
expect(hierarchyCheck.includes("check-naming-dispatch-centre-profile-render-v1092.mjs"), 'Hierarchy regression must continue chaining the superseded-profile guard');

console.log('PASS: Failed hidden-profile acquisition remains superseded by native station rows.');
