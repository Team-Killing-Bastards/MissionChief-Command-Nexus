#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const evidence = await readFile('docs/evidence/issue-300-search-dog-vehicle-type.md', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Unable to find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  fail(`Unterminated ${name}`);
}

function extractObject(marker) {
  const start = source.indexOf(marker);
  if (start < 0) fail(`Unable to find ${marker}`);
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
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) {
      return source.slice(brace, index + 1);
    }
  }
  fail(`Unterminated object after ${marker}`);
}

const verifiedIdMatch = source.match(
  /const MF_SEARCH_DOG_UNIT_TYPE_ID = '([^']+)';/
);
expect(verifiedIdMatch, 'Verified Search Dog vehicle-type constant missing');
const verifiedId = verifiedIdMatch[1];
expect(verifiedId === '102', `Expected native Search Dog type 102, found ${verifiedId}`);

const mapLiteral = extractObject('const TYPE_ID_TO_VEHICLE_TYPE = ');
const context = { result: null };
vm.runInNewContext(`result = (${mapLiteral});`, context);
expect(
  context.result[verifiedId] === 'Search Dog Unit SAR',
  'Unit Naming map must identify verified type 102 as Search Dog Unit SAR'
);
expect(
  !Object.prototype.hasOwnProperty.call(context.result, '101'),
  'Unit Naming must not retain an unverified type-101 Search Dog mapping'
);

const selector = extractFunction('isSearchDogUnitVehicleCheckbox');
expect(
  selector.includes('.includes(MF_SEARCH_DOG_UNIT_TYPE_ID)'),
  'Mission Finder Search Dog selector must consume the same verified constant'
);
expect(
  !selector.includes("'101'"),
  'Mission Finder Search Dog selector must not retain type 101'
);

expect(
  evidence.includes('`/missions/<redacted>/missing_vehicles?offset_page=1`'),
  'Evidence must retain the sanitized native mission route shape'
);
expect(
  evidence.includes('vehicle_type_id="102"') &&
    evidence.includes('vehicle_type="Search Dog Unit (SAR)"') &&
    evidence.includes('rescue_dogs="1"'),
  'Evidence must retain native type, label and rescue-dog capability signals'
);

console.log('PASS: native Search Dog evidence, Mission Finder selection and Unit Naming all use exact MissionChief UK vehicle type 102.');
