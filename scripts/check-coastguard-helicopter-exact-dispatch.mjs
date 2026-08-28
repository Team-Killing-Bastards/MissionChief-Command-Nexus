#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing ${name}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unterminated ${name}`);
}

assert.match(source, /"Coastguard Rescue Helicopter": "CG Rescue Helicopter",/);
assert.match(source, /"Coastguard Rescue Helicopters": "CG Rescue Helicopter",/);
assert.match(source, /"Coastguard Rescue Helicopter \(20%\)": "CG Rescue Helicopter",/);
assert.doesNotMatch(source, /"Coastguard Rescue Helicopters?(?: \(20%\))?": "CG Rescue Helicopter \(Large\)"/);

const typeResolver = extractFunction('getCoastguardRescueHelicopterTypeId');
const checkboxMatcher = extractFunction('isCoastguardRescueHelicopterVehicleCheckbox');
const context = vm.createContext({
  normaliseVehicleText: value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase(),
  getVehicleTypeIdentifiers: input => input.typeIds || [],
});
vm.runInContext(`${typeResolver}\n${checkboxMatcher}\nthis.resolveType = getCoastguardRescueHelicopterTypeId; this.matchesType = isCoastguardRescueHelicopterVehicleCheckbox;`, context);

for (const name of [
  'Coastguard Rescue Helicopter',
  'Coastguard Rescue Helicopters',
  'Coastguard Rescue Helicopter (20%)',
  'Required Coastguard Rescue Helicopter',
]) assert.equal(context.resolveType(name, ''), '64', `${name} must require exact type 64`);

for (const name of [
  'Coastguard Rescue Helicopter Large',
  'Coastguard Rescue Helicopter (Large)',
  'Required Coastguard Rescue Helicopters (Large)',
  'CG Rescue Helicopter (Large)',
]) assert.equal(context.resolveType(name, ''), '65', `${name} must require exact type 65`);

assert.equal(context.resolveType('Police Helicopter', ''), '');
assert.equal(context.matchesType({ typeIds: ['64'] }, '64'), true);
assert.equal(context.matchesType({ typeIds: ['65'] }, '64'), false, 'Large type 65 must not satisfy a normal request');
assert.equal(context.matchesType({ typeIds: ['65'] }, '65'), true);
assert.equal(context.matchesType({ typeIds: ['64'] }, '65'), false, 'Normal type 64 must not satisfy a Large request');
assert.equal(context.matchesType({ typeIds: [] }, '64'), false, 'Missing native type evidence must fail closed');

for (const functionName of [
  'getAllMatchingVehicleCheckboxes',
  'countSelectedMatchingVehicles',
  'findUnitButton',
]) {
  const body = extractFunction(functionName);
  assert.ok(body.includes('getCoastguardRescueHelicopterTypeId'), `${functionName} must use exact Coastguard requirement identity`);
}

const selection = extractFunction('getAllMatchingVehicleCheckboxes');
assert.ok(selection.indexOf('getCoastguardRescueHelicopterTypeId') < selection.indexOf('getVehicleMatchCandidates'), 'Exact Coastguard type selection must run before generic text matching');

console.log('PASS: Coastguard helicopter dispatch is exact: normal requests use only type 64, explicit Large requests use only type 65, and missing type evidence fails closed.');
