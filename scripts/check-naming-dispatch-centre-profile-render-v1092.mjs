#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

// v1.0.92 proved that a plain hidden /profile iframe does not reproduce the
// LSSMV4/Vue profile modal + selected Buildings tab. Protect its removal and
// chain the replacement v1.0.93 native-row regression through the registered gate.
await import('./check-naming-dispatch-centre-native-station-rows-v1093.mjs');

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
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

expect(source.includes('// @version      1.0.107'), 'Expected Command Nexus 1.0.93');
expect(source.includes("const UNIT_VERSION = '3.3.23';"), 'Expected Unit Naming 3.3.18');
expect(source.includes("const STATION_VERSION = '1.3.14';"), 'Expected Station Naming 1.3.12');
const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(listLoader.includes('collectNamingDispatchCentresFromStationRows()'), 'v1.0.93 replacement native-row source missing');
expect(!listLoader.includes('/profile/'), 'v1.0.92 profile route must not return');
expect(!source.includes('loadNamingDispatchCentresFromRenderedProfile'), 'v1.0.92 hidden profile renderer must stay removed');
expect(!source.includes('extractNamingDispatchCentresFromProfileDocument'), 'v1.0.92 profile DOM parser must stay removed');
expect(!source.includes('.profile-dispatchcenter'), 'LSSMV4 profile-only selector must stay removed');
expect(workflow.includes('scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs'), 'Registered hierarchy regression must remain in Validate userscript');
expect(hierarchyCheck.includes("check-naming-dispatch-centre-profile-render-v1092.mjs"), 'Registered hierarchy regression must continue chaining the v1.0.92 supersession guard');

console.log('PASS: failed v1.0.92 hidden-profile acquisition is permanently superseded by v1.0.93 native station rows.');
