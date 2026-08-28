#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const patterns = [`function ${name}(`, `async function ${name}(`];
  const starts = patterns.map(pattern => source.indexOf(pattern)).filter(index => index >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  assert.notEqual(start, -1, `Missing ${name}`);
  const parameterStart = source.indexOf('(', start);
  let parameterDepth = 0;
  let parameterEnd = -1;
  for (let index = parameterStart; index < source.length; index += 1) {
    if (source[index] === '(') parameterDepth += 1;
    if (source[index] === ')' && --parameterDepth === 0) {
      parameterEnd = index;
      break;
    }
  }
  assert.notEqual(parameterEnd, -1, `Unterminated parameters for ${name}`);
  const bodyStart = source.indexOf('{', parameterEnd);
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

const resolver = extractFunction('getPrvSrvRequirementTypeId');
const matcher = extractFunction('isPrvSrvVehicleCheckbox');
const unique = extractFunction('getUniquePrvSrvVehicleCheckboxes');
const context = vm.createContext({
  normaliseVehicleText: value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase(),
  getVehicleTypeIdentifiers: input => input.typeIds || [],
  getMissionVehicleId: input => input.vehicleId || '',
  getVehicleCheckboxSnapshot: () => context.boxes,
  boxes: [],
});
vm.runInContext(
  `${resolver}\n${matcher}\n${unique}\n` +
  'this.resolveType = getPrvSrvRequirementTypeId; ' +
  'this.matchesType = isPrvSrvVehicleCheckbox; ' +
  'this.uniqueBoxes = getUniquePrvSrvVehicleCheckboxes;',
  context,
);

for (const name of ['PRV', 'PRVs', 'Primary Response Vehicle', 'Required Primary Response Vehicles']) {
  assert.equal(context.resolveType(name, ''), '27', `${name} must resolve to exact type 27`);
}
for (const name of ['SRV', 'SRVs', 'Secondary Response Vehicle', 'Required Secondary Response Vehicles']) {
  assert.equal(context.resolveType(name, ''), '28', `${name} must resolve to exact type 28`);
}
assert.equal(context.resolveType('PRV backup callsign', ''), '', 'Callsign substrings are not requirement authority');
assert.equal(context.matchesType({ typeIds: ['27'] }, '27'), true);
assert.equal(context.matchesType({ typeIds: ['28'] }, '27'), false, 'SRV must not satisfy PRV');
assert.equal(context.matchesType({ typeIds: ['27'] }, '28'), false, 'PRV must not satisfy SRV');
assert.equal(context.matchesType({ typeIds: [] }, '27'), false, 'Missing native type evidence must fail closed');

context.boxes = [
  { vehicleId: '1001', typeIds: ['27'], checked: true, disabled: false, isConnected: true },
  { vehicleId: '1001', typeIds: ['27'], checked: true, disabled: false, isConnected: true },
  { vehicleId: '1002', typeIds: ['27'], checked: false, disabled: false, isConnected: true },
  { vehicleId: '2001', typeIds: ['28'], checked: true, disabled: false, isConnected: true },
  { vehicleId: '', typeIds: ['27'], checked: true, disabled: false, isConnected: true },
  { vehicleId: '1003', typeIds: ['27'], checked: true, disabled: false, isConnected: false },
];
assert.equal(
  context.uniqueBoxes('27', input => input.checked && !input.disabled).length,
  1,
  'Only one connected, unique, checked type-27 vehicle ID may count',
);
assert.equal(
  context.uniqueBoxes('28', input => input.checked && !input.disabled).length,
  1,
  'Exact type-28 coverage must remain isolated',
);

for (const functionName of [
  'getAllMatchingVehicleCheckboxes',
  'countSelectedMatchingVehicles',
  'findUnitButton',
]) {
  assert.ok(
    extractFunction(functionName).includes('getPrvSrvRequirementTypeId'),
    `${functionName} must use exact PRV/SRV requirement identity`,
  );
}

const freshSelection = extractFunction('processRequirementRows');
assert.match(freshSelection, /exactPrvSrvRequirement\s*\? selectedFromDom/, 'Fresh selection must ignore successful-click totals for PRV/SRV');

const updateSelection = extractFunction('handleMissionUpdateUnits');
assert.match(updateSelection, /exactPrvSrvRequirement\s*\? matchingSelectedFromDom/, 'Live residual selection must start from confirmed PRV/SRV DOM coverage');
assert.match(updateSelection, /exactPrvSrvRequirement\s*\? selectedFromCurrentDom/, 'Mission Update must ignore click and live-table counts as PRV/SRV proof');

const finalCheck = extractFunction('confirmPrvSrvSelectionBeforeDispatch');
assert.ok(finalCheck.includes('missing: required - selected'), 'Final verification must top up only the exact shortfall');
assert.ok(finalCheck.includes('await wait(180);'), 'Top-up clicks need a bounded settle before confirmation');
assert.ok(extractFunction('countSelectedMatchingVehicles').includes("input => input.checked === true && input.disabled !== true"), 'Confirmed coverage must remain checked and enabled');
assert.ok(finalCheck.includes('changeDispatchBoxColor(false);'), 'An unresolved PRV/SRV shortfall must fail closed');
assert.ok(finalCheck.includes("'prv-srv-final-verification-block'"), 'The final block must be exported diagnostically');
assert.ok(finalCheck.includes('vehicleLoadState.rows.every'), 'A successful top-up must restore readiness only when every requirement row remains covered');

for (const functionName of ['triggerDispatchClick', 'triggerDispatchShareClick']) {
  const body = extractFunction(functionName);
  assert.ok(body.indexOf('confirmPrvSrvSelectionBeforeDispatch') < body.indexOf('clickDispatch'), `${functionName} must verify before clicking Dispatch`);
}

const auto = extractFunction('runAutoModeLoop');
assert.ok(auto.includes("'Auto Mode final dispatch decision'"), 'Auto Mode must verify before its readiness decision');
assert.ok(auto.includes("'Auto Mode immediate pre-dispatch recheck'"), 'Auto Mode must recheck immediately before completed Dispatch');
assert.ok(auto.includes('Dispatch was not clicked.'), 'Auto Mode must stop fail closed on a confirmed PRV/SRV shortage');

console.log('PASS: PRV/SRV selection uses exact unique checked IDs, tops up only confirmed shortfalls, preserves live residual authority and blocks under-covered Dispatch.');
