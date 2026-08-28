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
    if (char === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Unterminated ${name}`);
}

const matcher = vm.runInNewContext(`(${extractFunction('isHomeResponseSar4x4Checkbox')})`, {
  getVehicleTypeIdentifiers: input => input.typeIds,
  getSartecDisplayedVehicleValues: input => input.names,
});

assert.equal(matcher({ typeIds: ['93'], names: ['CARDENDEN-SAR4x4-1'] }), true);
assert.equal(matcher({ typeIds: ['93'], names: ['TONAGH-SAR4X4-22'] }), true);
assert.equal(matcher({ typeIds: ['93'], names: ['TONAGH-SAR4x4'] }), false, 'A numbered suffix is mandatory');
assert.equal(matcher({ typeIds: ['93'], names: ['SAR4x4-1-SPARE'] }), false, 'The callsign suffix must be exact');
assert.equal(matcher({ typeIds: ['99'], names: ['MOUNTAIN-SAR4x4-1'] }), false, 'Mountain Rescue type 99 must remain excluded');
assert.equal(matcher({ typeIds: ['66'], names: ['GENERIC-SAR4x4-1'] }), false, 'Generic type 66 must remain excluded');

const selection = extractFunction('getAllMatchingVehicleCheckboxes');
assert.ok(selection.includes('preferred.length ? preferred : available.filter(isSartecVehicleCheckbox)'), 'Named Home Response units must precede the SARTEC fallback pool');
const count = extractFunction('countSelectedMatchingVehicles');
assert.ok(count.includes('isHomeResponseSar4x4Checkbox(input) || isSartecVehicleCheckbox(input)'), 'Both accepted SARTEC pools must count as selected');
const single = extractFunction('findUnitButton');
assert.ok(single.includes('available.find(isHomeResponseSar4x4Checkbox) || available.find(isSartecVehicleCheckbox)'), 'Single-unit selection must retain SARTEC as fallback');

console.log('PASS: SARTEC uses exact named type-93 Home Response SAR 4x4 units first and retains the original SARTEC pool as fallback.');
