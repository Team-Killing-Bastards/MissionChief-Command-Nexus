#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
await import('./check-police-drone-requirement-v10100.mjs');

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

expect(source.includes('// @version      1.0.101'), 'Expected Command Nexus 1.0.101');
expect(source.includes(' * MODULE 2: MISSION FINDER V10.6.150'), 'Expected Mission Finder V10.6.150');

const matcher = extractFunction('isRescueDogRequirementName');
const context = { result: null };
vm.runInNewContext(
  `${matcher}\nresult = {` +
  ` yes: ['Rescue Dog', 'Rescue Dogs', '1 Rescue Dog', 'Required Rescue Dog', 'Required 2 Rescue Dogs', 'Search Dog Unit', 'Search Dog Units', '2 Search Dog Units', 'Required Search Dog Unit', 'Required Search Dog Units', 'Required 2 Search Dog Units'].map(isRescueDogRequirementName),` +
  ` no: ['Search Advisor', 'Police Dog', 'Dog Support Unit', 'Rescue Pump', 'HGV to tow'].map(isRescueDogRequirementName)` +
  `};`,
  context
);
expect(context.result.yes.every(Boolean), `Rescue Dog alias rejected: ${JSON.stringify(context.result.yes)}`);
expect(context.result.no.every(value => value === false), `Unrelated requirement captured as Rescue Dog: ${JSON.stringify(context.result.no)}`);

const classifier = extractFunction('isSearchDogUnitRequirement');
expect(classifier.includes('isRescueDogRequirementName(value)'), 'Search Dog classifier must consume the strict Rescue/Search Dog requirement-name matcher');
const checkbox = extractFunction('isSearchDogUnitVehicleCheckbox');
expect(checkbox.includes(".includes('101')"), 'Search Dog Unit must be exact MissionChief vehicle type 101');

expect((source.match(/const searchDogUnitOnly =/g) || []).length >= 2, 'Search Dog strict declarations missing from shared selection paths');
expect(source.includes('if (searchDogUnitOnly) {'), 'Search Dog strict quick-selection branch missing');
expect(source.includes('return isSearchDogUnitVehicleCheckbox(input);'), 'Search Dog exact type-101 candidate filter missing');
expect(source.includes('matches = isSearchDogUnitVehicleCheckbox(input);'), 'Search Dog selected-vehicle verification missing');
expect(source.includes('isSearchDogUnitRequirement(originalName, mappedName) ||'), 'Search Dog generic-fallback guard missing');

expect(extractFunction('isFlatbedRecoveryVehicleCheckbox').includes(".includes('105')"), 'Flatbed Recovery type 105 regression');
expect(extractFunction('isHgvRecoveryVehicleCheckbox').includes(".includes('106')"), 'HGV Recovery type 106 regression');

console.log('PASS: Rescue Dog and Search Dog Unit requirement aliases route only to exact Search Dog Unit type 101 across candidate selection, selected-unit verification and strict generic-fallback protection.');
