#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

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

const matcher = extractFunction('isAirfieldOperationsSupervisorRequirementName');
const context = { result: null };
vm.runInNewContext(
  `${matcher}\nresult = {` +
  ` yes: ['Airfield Operations Supervisor', 'Airfield Operations Supervisors', 'Required Airfield Operations Supervisor', 'Required Airfield Operations Supervisors', '2 Airfield Operations Supervisors', 'Required 3 Airfield Operations Supervisors'].map(isAirfieldOperationsSupervisorRequirementName),` +
  ` no: ['Airfield Operations Vehicle', 'Airfield Command', 'Operations Supervisor', 'Airport Fire Officer'].map(isAirfieldOperationsSupervisorRequirementName)` +
  `};`,
  context
);
expect(context.result.yes.every(Boolean), `Airfield Operations Supervisor alias rejected: ${JSON.stringify(context.result.yes)}`);
expect(context.result.no.every(value => value === false), `Unrelated Airfield wording was captured: ${JSON.stringify(context.result.no)}`);

for (const alias of [
  'Airfield Operations Supervisor',
  'Airfield Operations Supervisors',
  'Required Airfield Operations Supervisor',
  'Required Airfield Operations Supervisors',
]) {
  expect(
    source.includes(`"${alias}": "Airfield Operations Supervisor"`),
    `Airfield cross-reference must route ${alias} to the singular vehicle name`
  );
}

expect(source.includes("const MF_AIRFIELD_OPERATIONS_SUPERVISOR_TYPE_ID = '80';"), 'Airfield Operations Supervisor must declare verified MissionChief type 80');
const checkbox = extractFunction('isAirfieldOperationsSupervisorVehicleCheckbox');
expect(checkbox.includes('.includes(MF_AIRFIELD_OPERATIONS_SUPERVISOR_TYPE_ID)'), 'Airfield selector must consume the exact type-80 constant');
const classifier = extractFunction('isAirfieldOperationsSupervisorRequirement');
expect(classifier.includes('isAirfieldOperationsSupervisorRequirementName(value)'), 'Airfield classifier must consume the strict requirement-name matcher');

expect((source.match(/const airfieldSupervisorOnly =/g) || []).length >= 2, 'Airfield strict declarations are missing from shared selection paths');
expect(source.includes('if (airfieldSupervisorOnly) {'), 'Airfield exact candidate-selection branch missing');
expect(source.includes('return isAirfieldOperationsSupervisorVehicleCheckbox(input);'), 'Airfield exact type-80 candidate filter missing');
expect(source.includes('matches = isAirfieldOperationsSupervisorVehicleCheckbox(input);'), 'Airfield selected-vehicle verification missing');
expect(source.includes('isAirfieldOperationsSupervisorRequirement(originalName, mappedName) ||'), 'Airfield generic-fallback guard missing');

console.log('PASS: Airfield Operations Supervisor singular/plural requirements route only to exact MissionChief vehicle type 80 across Unit Finder, Mission Update and Auto Mode.');
