#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Unable to find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false, regex = false, regexClass = false;
  for (let i = brace; i < source.length; i += 1) {
    const c = source[i], n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (regex) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === '[') regexClass = true;
      if (c === ']') regexClass = false;
      if (c === '/' && !regexClass) regex = false;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '/' && /[=(,:;!&|?{}\[\]\n]/.test(source[i - 1] || '\n')) { regex = true; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(`Unterminated ${name}`);
}


const setMarker = 'const MF_POLICE_DRONE_REQUIREMENT_NAMES = new Set([';
const setStart = source.indexOf(setMarker);
const setEnd = source.indexOf(']);', setStart);
expect(setStart >= 0 && setEnd > setStart, 'Police Drone requirement-name set missing');
const droneSet = source.slice(setStart, setEnd + 3);
for (const alias of ['police drone', 'police drones', 'required police drone', 'required police drones']) {
  expect(droneSet.includes(`'${alias}'`), `Missing explicit Police Drone requirement alias: ${alias}`);
}
for (const alias of ['require drone', 'require drones', 'required drone', 'required drones', 'requires drone', 'requires drones']) {
  expect(!droneSet.includes(`'${alias}'`), `Generic Drone alias must not remain Police-only: ${alias}`);
}
expect(!/\n\s*'drone',/.test(droneSet), 'Bare Drone must not become a broad cross-service alias');
expect(!/\n\s*'drones',/.test(droneSet), 'Bare Drones must not become a broad cross-service alias');

for (const alias of ['Require Drone', 'Require Drones', 'Required Drone', 'Required Drones', 'Requires Drone', 'Requires Drones']) {
  expect(source.includes(`"${alias}": "Drone"`), `Missing generic Drone cross-reference alias: ${alias}`);
}

const mode = extractFunction('getPoliceAirRequirementMode');
expect(mode.includes('MF_POLICE_DRONE_REQUIREMENT_NAMES.has(raw)'), 'Police-air mode must classify original Drone requirement wording');
expect(mode.includes('MF_POLICE_DRONE_REQUIREMENT_NAMES.has(mapped)'), 'Police-air mode must classify mapped Drone requirement wording');
expect(mode.includes("return 'drone';"), 'Police-air requirement must enter drone-only mode');

const checkbox = extractFunction('isPoliceDroneCheckbox');
expect(checkbox.includes(".includes('91')"), 'Police Drone requirement must select exact MissionChief vehicle type 91');
expect(checkbox.includes('drone vehicle (police station)'), 'Police Drone checkbox matcher must retain the Police Station vehicle wording');

expect(/policeAirMode\s*===\s*'drone'[\s\S]{0,700}eligible\.filter\([\s\S]{0,160}isPoliceDroneCheckbox/.test(source), 'Drone-only candidate selection must filter to Police Drone Vehicle checkboxes');
expect(source.includes('matches = isPoliceDroneCheckbox(input);'), 'Selected-unit verification must keep the exact Police Drone matcher');
expect(source.includes('// Flexible wording only: Drone first, Police Helicopter fallback.'), 'Flexible helicopter-or-drone fallback contract missing');

console.log('PASS: Explicit Police Drone wording remains exact type 91 and separate from generic Require/Required/Requires Drone aliases, without creating a broad bare-Drone alias.');
