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
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let regex = false;
  let regexClass = false;

  for (let i = brace; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1];
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

function extractStringSet(name) {
  const marker = `const ${name} = new Set([`;
  const start = source.indexOf(marker);
  const end = source.indexOf(']);', start);
  if (start < 0 || end <= start) fail(`Unable to find ${name}`);
  return new Set(
    Array.from(source.slice(start, end).matchAll(/'([^']+)'/g), match => match[1])
  );
}

expect(source.includes('// @version      1.0.122'), 'Expected Command Nexus 1.0.122');
expect(source.includes(' * MODULE 2: MISSION FINDER V10.6.160'), 'Expected Mission Finder V10.6.160');

const flexibleNames = extractStringSet('MF_POLICE_AIR_FLEXIBLE_REQUIREMENT_NAMES');
const helicopterNames = extractStringSet('MF_POLICE_HELICOPTER_REQUIREMENT_NAMES');
const policeDroneNames = extractStringSet('MF_POLICE_DRONE_REQUIREMENT_NAMES');
const genericDroneNames = extractStringSet('MF_GENERIC_DRONE_REQUIREMENT_NAMES');
const genericAliases = [
  'require drone',
  'require drones',
  'required drone',
  'required drones',
  'requires drone',
  'requires drones'
];

for (const alias of genericAliases) {
  expect(genericDroneNames.has(alias), `Generic Drone alias missing: ${alias}`);
  expect(!policeDroneNames.has(alias), `Generic Drone alias must not remain Police-only: ${alias}`);
}
expect(!genericDroneNames.has('drone'), 'Bare Drone must remain excluded');
expect(!genericDroneNames.has('drones'), 'Bare Drones must remain excluded');

for (const alias of ['Require Drone', 'Require Drones', 'Required Drone', 'Required Drones', 'Requires Drone', 'Requires Drones']) {
  expect(source.includes(`"${alias}": "Drone"`), `Generic Drone cross-reference missing: ${alias}`);
}

const normaliseVehicleText = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const modeFactory = new Function(
  'normaliseVehicleText',
  'MF_POLICE_AIR_FLEXIBLE_REQUIREMENT_NAMES',
  'MF_POLICE_HELICOPTER_REQUIREMENT_NAMES',
  'MF_POLICE_DRONE_REQUIREMENT_NAMES',
  'MF_GENERIC_DRONE_REQUIREMENT_NAMES',
  `${extractFunction('getPoliceAirRequirementMode')}; return getPoliceAirRequirementMode;`
);
const getMode = modeFactory(
  normaliseVehicleText,
  flexibleNames,
  helicopterNames,
  policeDroneNames,
  genericDroneNames
);

expect(getMode('Required Drones', 'Drone') === 'generic-drone', 'Required Drones must enter generic Drone mode');
expect(getMode('Require Drone', 'Drone') === 'generic-drone', 'Require Drone must enter generic Drone mode');
expect(getMode('Police Drone', 'Police Helicopter') === 'drone', 'Explicit Police Drone must remain Police-only');
expect(getMode('Police Helicopter', 'Police Helicopter') === 'helicopter', 'Police Helicopter must remain helicopter-only');
expect(getMode('Police Helicopter or Drone', 'Police Helicopter') === 'flexible', 'Explicit Police Helicopter-or-Drone must remain flexible');
expect(getMode('Drone', 'Drone') === '', 'Bare Drone must fail closed');
expect(getMode('Drones', 'Drones') === '', 'Bare Drones must fail closed');

const checkboxFactory = new Function(
  'getVehicleTypeIdentifiers',
  'getPoliceAirVehicleValues',
  'normaliseSartecDisplayedName',
  `${extractFunction('isPoliceDroneCheckbox')};\n${extractFunction('isSarDroneCheckbox')};\n${extractFunction('isGenericDroneCheckbox')};\nreturn { isPoliceDroneCheckbox, isSarDroneCheckbox, isGenericDroneCheckbox };`
);
const checkboxMatchers = checkboxFactory(
  input => input.typeIds || [],
  input => input.values || [],
  value => String(value || '')
);

const sarDrone = { typeIds: ['89'], values: ['drone vehicle sar hq'] };
const policeDrone = { typeIds: ['91'], values: ['drone vehicle (police station)'] };
const policeHelicopter = { typeIds: ['11'], values: ['police helicopter'] };
const unknownSarLabel = { typeIds: [], values: ['drone vehicle (sar hq)'] };
const deceptiveKnownType = { typeIds: ['11'], values: ['drone vehicle sar hq'] };

expect(checkboxMatchers.isSarDroneCheckbox(sarDrone), 'Exact type 89 must match SAR Drone');
expect(!checkboxMatchers.isPoliceDroneCheckbox(sarDrone), 'Exact type 89 must not match Police Drone');
expect(checkboxMatchers.isPoliceDroneCheckbox(policeDrone), 'Exact type 91 must match Police Drone');
expect(!checkboxMatchers.isSarDroneCheckbox(policeDrone), 'Exact type 91 must not match SAR Drone');
expect(checkboxMatchers.isGenericDroneCheckbox(sarDrone), 'Generic Drone must accept exact type 89');
expect(checkboxMatchers.isGenericDroneCheckbox(policeDrone), 'Generic Drone must accept exact type 91');
expect(!checkboxMatchers.isGenericDroneCheckbox(policeHelicopter), 'Generic Drone must reject Police Helicopter type 11');
expect(checkboxMatchers.isSarDroneCheckbox(unknownSarLabel), 'Unknown-type SAR Drone label fallback missing');
expect(!checkboxMatchers.isSarDroneCheckbox(deceptiveKnownType), 'Known non-SAR type must reject deceptive SAR label');

const candidates = extractFunction('getVehicleMatchCandidates');
expect(candidates.includes("policeAirMode === 'generic-drone'"), 'Candidate builder must recognise generic Drone mode');
expect(candidates.includes("add('Drone Vehicle SAR HQ')"), 'Candidate builder must include SAR Drone label');
expect(candidates.includes("add('Drone Vehicle (Police Station)')"), 'Candidate builder must retain Police Drone label');

const selector = extractFunction('getAllMatchingVehicleCheckboxes');
expect(/policeAirMode === 'generic-drone'[\s\S]{0,220}isGenericDroneCheckbox/.test(selector), 'Shared selector must use both exact Drone families');
expect(/policeAirMode === 'generic-drone'[\s\S]{0,220}sortVehicleCheckboxesByBestArrival/.test(selector), 'Generic Drone candidates must retain ETA sorting');

const selectedCounter = extractFunction('countSelectedMatchingVehicles');
expect(/policeAirMode === 'generic-drone'[\s\S]{0,100}isGenericDroneCheckbox/.test(selectedCounter), 'Selected-unit verification must count either exact Drone family');

const fallbackSelector = extractFunction('findUnitButton');
expect(/policeAirMode === 'generic-drone'[\s\S]{0,220}isGenericDroneCheckbox/.test(fallbackSelector), 'Legacy/fallback selector must use either exact Drone family');

expect(source.includes('// Flexible wording only: Drone first, Police Helicopter fallback.'), 'Police Helicopter-or-Drone ordering changed unexpectedly');

console.log('PASS: Required Drone(s) accepts exact type 89 SAR or type 91 Police Drone Vehicles across shared selection and verification, while explicit Police/Helicopter modes and the bare-Drone guard remain strict.');
