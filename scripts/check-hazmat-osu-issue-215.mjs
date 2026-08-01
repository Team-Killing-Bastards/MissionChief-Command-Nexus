#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) fail(`Missing function ${name}`);
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

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }

    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  fail(`Unterminated function ${name}`);
}

function sliceBetween(startToken, endToken, label) {
  const start = source.indexOf(startToken);
  if (start < 0) fail(`Missing ${label} start`);
  const end = source.indexOf(endToken, start);
  if (end < 0) fail(`Missing ${label} end`);
  return source.slice(start, end);
}

expect(source.includes('// @version      1.0.80'), 'Expected Command Nexus 1.0.64');
expect(source.includes(' * MODULE 2: MISSION FINDER V10.6.140'), 'Expected Mission Finder V10.6.127');
expect(source.includes("const MF_FIRE_OPERATIONAL_SUPPORT_TYPE_ID = '39';"), 'OSU exact type constant missing');

for (const alias of [
  '"HazMat Unit": "OSU"',
  '"HazMat Units": "OSU"',
  '"Required HazMat Unit": "OSU"',
  '"Required HazMat Units": "OSU"',
  '"Required Hazmat Unit": "OSU"',
  '"Required Hazmat Units": "OSU"',
]) {
  expect(source.includes(alias), `HazMat OSU alias missing ${alias}`);
}

const normaliseVehicleText = value => String(value || '')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const requirementSet = new Set([
  'hazmat',
  'hazmat unit',
  'hazmat units',
  'required hazmat',
  'required hazmat unit',
  'required hazmat units',
  'hazmat unit or cbrn vehicle',
  'hazmat units or cbrn vehicles',
  'required hazmat unit or cbrn vehicle',
  'required hazmat units or cbrn vehicles',
]);

const isHazMatOsuRequirement = vm.runInNewContext(
  `(${extractFunction('isHazMatOsuRequirement')})`,
  {
    normaliseVehicleText,
    MF_HAZMAT_OSU_REQUIREMENT_NAMES: requirementSet,
  }
);

for (const caption of [
  'HazMat Unit',
  'HazMat Units',
  'Required HazMat Unit',
  'Required HazMat Units',
  'Required HazMat Unit x1',
  'HazMat Unit or CBRN Vehicle',
]) {
  expect(
    isHazMatOsuRequirement(caption, 'OSU') === true,
    `HazMat requirement not recognised: ${caption}`
  );
}
expect(
  isHazMatOsuRequirement('Operational Support Van', 'Operational Support Van') === false,
  'Operational Support Van must not be treated as a HazMat OSU requirement'
);
expect(
  isHazMatOsuRequirement('HazMat-capable generic support vehicle', 'Support Unit') === false,
  'Generic HazMat-capable support text must not be accepted as the exact HazMat requirement'
);

const isFireOperationalSupportUnitCheckbox = vm.runInNewContext(
  `(${extractFunction('isFireOperationalSupportUnitCheckbox')})`,
  {
    MF_FIRE_OPERATIONAL_SUPPORT_TYPE_ID: '39',
    getVehicleTypeIdentifiers: input => input.typeIds || [],
    getExtendedVehicleValues: input => input.values || [],
    normaliseVehicleText,
  }
);

expect(
  isFireOperationalSupportUnitCheckbox({ typeIds: ['39'], values: ['Operational Support Unit'] }) === true,
  'Exact type-39 OSU was rejected'
);
expect(
  isFireOperationalSupportUnitCheckbox({ typeIds: ['7'], values: ['HazMat Unit'] }) === false,
  'Type-7 HazMat Unit must not satisfy an OSU requirement'
);
expect(
  isFireOperationalSupportUnitCheckbox({ typeIds: ['86'], values: ['Operational Support Van'] }) === false,
  'Type-86 Operational Support Van must not satisfy an OSU requirement'
);
expect(
  isFireOperationalSupportUnitCheckbox({ typeIds: ['115'], values: ['Welfare Vehicle'] }) === false,
  'Welfare/support vehicle must not satisfy an OSU requirement'
);
expect(
  isFireOperationalSupportUnitCheckbox({ typeIds: [], values: ['OSU'] }) === true,
  'Exact OSU name fallback should work only when no type identifier exists'
);
expect(
  isFireOperationalSupportUnitCheckbox({ typeIds: ['7'], values: ['OSU'] }) === false,
  'A known non-39 type must fail closed even when its display name contains OSU'
);

const allMatching = sliceBetween(
  '    function getAllMatchingVehicleCheckboxes(originalName, mappedName, includeChecked) {',
  '\n    function getMatchingVehicleCheckboxes(originalName, mappedName) {',
  'all-matching vehicle selector'
);
expect(
  allMatching.includes('isFireOperationalSupportRequirement(originalName, mappedName)'),
  'Unit Finder exact OSU branch missing'
);
expect(
  allMatching.includes('isFireOperationalSupportUnitCheckbox(input)'),
  'Unit Finder OSU branch does not filter exact type 39'
);

const selectedCounter = extractFunction('countSelectedMatchingVehicles');
expect(
  selectedCounter.includes('input.checked && isFireOperationalSupportUnitCheckbox(input)'),
  'Already-selected OSUs are not counted through the exact type-39 matcher'
);

const unitFinderRows = sliceBetween(
  '    async function processRequirementRows(\n',
  '\n    async function processVehicles(\n',
  'Unit Finder requirement processing'
);
for (const token of [
  'const matchingSelectedAtStart =',
  'countSelectedMatchingVehicles(',
  'const remainingToSelect = Math.max(',
  'effectiveRequired - selectedBefore',
]) {
  expect(unitFinderRows.includes(token), `Unit Finder quantity reconciliation missing ${token}`);
}

const updateHandler = sliceBetween(
  '    function handleMissionUpdateUnits(showAlerts, suppliedRows = null, options = {}) {',
  '\n    async function autoHandleMissionUpdateAfterDispatch()',
  'Mission Update handler'
);
for (const token of [
  'const matchingSelectedFromDom =',
  'countSelectedMatchingVehicles(',
  'const remainingToSelect =',
  'effectiveRequired -',
  "'UPDATE'",
]) {
  expect(updateHandler.includes(token), `Mission Update quantity reconciliation missing ${token}`);
}

const selector = extractFunction('selectVehicleUnits');
expect(
  selector.includes('isFireOperationalSupportRequirement(originalName, mappedName)'),
  'OSU requirements are not strict no-fallback selections'
);
expect(
  selector.includes('!strictVehicleTypeOnly'),
  'Generic fallback gate missing'
);

const findUnitButton = extractFunction('findUnitButton');
expect(
  findUnitButton.includes('isFireOperationalSupportRequirement(originalName, mappedName)'),
  'Mission Update/legacy selector lacks exact OSU branch'
);
expect(
  findUnitButton.includes('isFireOperationalSupportUnitCheckbox(input)'),
  'Mission Update/legacy OSU branch does not enforce exact type 39'
);

console.log('Issue #215 regression passed: HazMat requirements preserve quantity, count selected OSUs and accept only exact type-39 Operational Support Units across Unit Finder and Mission Update.');
