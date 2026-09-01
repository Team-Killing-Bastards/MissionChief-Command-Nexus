#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const moduleStart = source.indexOf('MODULE 2: MISSION FINDER');
assert.ok(moduleStart >= 0, 'Mission Finder module must be present');
const marker = 'const crossReference = ';
const start = source.indexOf(marker, moduleStart);
assert.ok(start >= 0, 'crossReference map must be present');
const objectStart = start + marker.length;
const end = source.indexOf(';\n', objectStart);
assert.ok(end > objectStart, 'crossReference object must terminate');
const context = { result: null };
vm.runInNewContext(`result = (${source.slice(objectStart, end)})`, context);
const map = context.result;

assert.equal(
  map['Airfield Firefighting Command Vehicle'],
  'Airfield FF Command Vehicle',
  'singular standalone requirement must keep its canonical selector'
);
assert.equal(
  map['Airfield Firefighting Command Vehicles'],
  'Airfield FF Command Vehicle',
  'Hot Brakes plural standalone requirement must select the command vehicle'
);
assert.equal(
  map['Fire Officers or Airfield Firefighting Command Vehicles'],
  'Fire Officer',
  'the separate Fire Officer alternative must remain unchanged'
);
assert.equal(
  map['ICCU or Ambulance Control Units or Airfield Firefighting Command Vehicles'],
  'Airfield FF Command Vehicle',
  'the existing multi-role command-vehicle alternative must remain unchanged'
);

const normalised = new Map(Object.entries(map).map(([key, value]) => [
  String(key).replace(/\s+/g, ' ').trim().toLowerCase(), value,
]));
const diagnosticRequirement = 'Airfield Firefighting Command Vehicles';
assert.equal(
  normalised.get(diagnosticRequirement.toLowerCase()),
  'Airfield FF Command Vehicle',
  'the exact v3.0.40 diagnostic requirement must no longer pass through unmapped'
);
assert.notEqual(
  normalised.get(diagnosticRequirement.toLowerCase()),
  diagnosticRequirement,
  'the standalone plural requirement must not remain its own unmapped name'
);

console.log('PASS: standalone singular/plural Airfield Firefighting Command Vehicle requirements map to the canonical vehicle while the Fire Officer alternative remains separate.');
