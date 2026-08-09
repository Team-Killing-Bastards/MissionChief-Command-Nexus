#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const asyncMarker = `async function ${name}(`;
  const syncMarker = `function ${name}(`;
  const asyncStart = source.indexOf(asyncMarker);
  const start = asyncStart >= 0 ? asyncStart : source.indexOf(syncMarker);
  if (start < 0) fail(`Unable to find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false;
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
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(`Unterminated ${name}`);
}

expect(source.includes('// @version      1.0.96'), 'Expected Command Nexus 1.0.96');
expect(source.includes(' * MODULE 2: MISSION FINDER V10.6.145'), 'Expected Mission Finder V10.6.145');

const context = {
  normalise: value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(),
  result: null
};
vm.runInNewContext(
  `${extractFunction('isCarsToTowRequirementName')}\n` +
  `result = {
    supported: [
      'Car to tow',
      'Cars to tow',
      'Car to tow: 2',
      '1 truck to tow',
      'truck to tow',
      'trucks to tow',
      '2 trucks to tow',
      'Required 1 truck to tow',
      '1 lorry to tow',
      'lorries to tow',
      '1 van to tow',
      'vehicles to tow',
      'truck to be towed',
      'Tow truck',
      'Recovery trucks'
    ].map(isCarsToTowRequirementName),
    unrelated: [
      '1 truck',
      'Fire truck',
      'Heavy Rescue truck',
      'Trucks required',
      'Truck with trailer'
    ].map(isCarsToTowRequirementName)
  };`,
  context
);
expect(context.result.supported.every(Boolean), `Supported towing alias rejected: ${JSON.stringify(context.result.supported)}`);
expect(context.result.unrelated.every(value => value === false), `Unrelated truck wording was captured: ${JSON.stringify(context.result.unrelated)}`);

const recoveryClassifier = extractFunction('isFlatbedRecoveryVehicleRequirement');
expect(recoveryClassifier.includes('isCarsToTowRequirementName(value)'), 'Flatbed Recovery classifier must consume towing aliases');
const recoveryCheckbox = extractFunction('isFlatbedRecoveryVehicleCheckbox');
expect(recoveryCheckbox.includes(".includes('105')"), 'Recovery checkbox matching must stay exact MissionChief type 105');

const converter = extractFunction('getCarsToTowVehicleRequirement');
expect(converter.includes('isCarsToTowRequirementName'), 'Towing quantity converter must use the towing alias classifier');
const resolve = extractFunction('resolveVehicleTypeRequirements');
expect(resolve.includes('getCarsToTowVehicleRequirement'), 'Requirement resolver must keep towing conversion in its normal path');

expect(source.includes('flatbedRecoveryOnly'), 'Strict Flatbed Recovery selection path missing');
expect(source.includes(".includes('105')"), 'Recovery selection must remain exact MissionChief type 105');

console.log('PASS: towing cross-reference recognises truck/lorry/van/vehicle-to-tow aliases, ignores unrelated truck wording, and keeps exact type-105 Recovery selection.');
