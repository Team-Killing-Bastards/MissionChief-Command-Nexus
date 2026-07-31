#!/usr/bin/env node

// Permanent contract for the Fire Engine Update route and the requested Auto Mode copy cleanup.
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

for (const [token, label] of [
  ['// @version      1.0.65', 'v1.0.51 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.128', 'Mission Finder V10.6.120 header'],
  ['"Fire engines": "Fire Engine R/PUMP x 1"', 'plural Fire Engine alias'],
  ['MF_FIRE_ENGINE_TYPE_IDS', 'Fire Engine type set'],
  ['function isFireEngineRequirement(', 'Fire Engine requirement detector'],
  ['function isFireEngineVehicleCheckbox(', 'Fire Engine checkbox detector'],
  ['removeAutoModeQueueHelperCopy();', 'Auto Mode helper-copy cleanup call'],
]) {
  if (!source.includes(token)) fail(`Missing contract: ${label}`);
}

const typeSetStart = source.indexOf('const MF_FIRE_ENGINE_TYPE_IDS');
const typeSetEnd = source.indexOf(']);', typeSetStart);
const typeSet = source.slice(typeSetStart, typeSetEnd + 3);
for (const required of ["'0'", "'16'", "'17'"]) {
  if (!typeSet.includes(required)) fail(`Fire Engine type set is missing ${required}`);
}
if (typeSet.includes("'5'")) fail('Ambulance type 5 must never be owned by Fire Engine requirements');

const matcherStart = source.indexOf('function isFireEngineVehicleCheckbox(');
const matcherEnd = source.indexOf('\n    function ', matcherStart + 1);
const matcher = source.slice(matcherStart, matcherEnd);
for (const required of ['getVehicleTypeIdentifiers(input)', 'MF_FIRE_ENGINE_TYPE_IDS.has(typeId)']) {
  if (!matcher.includes(required)) fail(`Strict Fire Engine matcher is missing ${required}`);
}
for (const forbidden of ['getExtendedVehicleValues', 'vehicleValuesMatchCandidates', '.includes(candidate)', 'Ambulance']) {
  if (matcher.includes(forbidden)) fail(`Strict Fire Engine matcher contains forbidden fallback: ${forbidden}`);
}

for (const functionName of ['getAllMatchingVehicleCheckboxes', 'countSelectedMatchingVehicles', 'findUnitButton']) {
  const start = source.indexOf(`function ${functionName}(`);
  const end = source.indexOf('\n    function ', start + 1);
  const body = source.slice(start, end);
  if (!body.includes('isFireEngineRequirement(') || !body.includes('isFireEngineVehicleCheckbox(')) {
    fail(`${functionName} does not use the strict Fire Engine route`);
  }
}

const getAllStart = source.indexOf('function getAllMatchingVehicleCheckboxes(');
const getAllEnd = source.indexOf('\n    function ', getAllStart + 1);
const getAllBody = source.slice(getAllStart, getAllEnd);
if (!(getAllBody.indexOf('isFireEngineRequirement(') < getAllBody.indexOf('getVehicleMatchCandidates('))) {
  fail('Fire Engine selection must run before generic text matching');
}

const findStart = source.indexOf('function findUnitButton(');
const findEnd = source.indexOf('\n    function ', findStart + 1);
const findBody = source.slice(findStart, findEnd);
if (!(findBody.indexOf('isFireEngineRequirement(') < findBody.indexOf("queryVehicleSelectionElements('a[search_attribute]')"))) {
  fail('Fire Engine fallback must stop before generic quick-select anchors');
}

const uiStart = source.indexOf('function removeAutoModeQueueHelperCopy(');
const uiEnd = source.indexOf('\n    function updateAutoModeButton(', uiStart);
const uiBody = source.slice(uiStart, uiEnd);
for (const required of ['/unit finder/i', '/mission update/i', '/dispatch/i', 'input[type="checkbox"]', 'element.remove();']) {
  if (!uiBody.includes(required)) fail(`Auto Mode helper cleanup is missing ${required}`);
}

console.log('Fire Engine Update selection is restricted to pump-capable Fire types 0/16/17, excludes Ambulance type 5 and removes only the Auto Mode explanatory helper copy beneath the queue checkbox.');
