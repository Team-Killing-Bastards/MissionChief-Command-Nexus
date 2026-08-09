#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(token, label) {
  if (!source.includes(token)) fail(`Missing bulk-update contract: ${label}`);
}

for (const [token, label] of [
  ['// @version      1.0.89', 'v1.0.51 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.144', 'Mission Finder V10.6.120'],
  ["const PERSONNEL_VERSION = '1.3.9';", 'Personnel v1.3.5'],
  ['const DEFAULT_MISSION_READY_DELAY = 1000;', '1000 ms default retained'],
  ['personnel-register-exact-all-vehicle-scan-v2', 'exact all-vehicle register source'],
  ['assignedTrainingProfiles,', 'per-person assigned profiles'],
  ['trainingProfilesComplete: exactVehicleProfileScan', 'complete profile marker'],
  ['MF_EXACT_REGISTER_TRAINING_SOURCE_PREFIX', 'Mission Finder exact register trust'],
  ["code:\n                    'search_and_rescue'", 'Search Advisor trained parser'],
  ['registryAnyVehicle:', 'Search Advisor any-vehicle flag'],
  ['trainedOnly:', 'Search Advisor trained-only flag'],
  ['getRegistryTrainingQualifiedCount(', 'verified assigned training count'],
  ['function isFlatbedRecoveryVehicleRequirement(', 'recovery requirement classifier'],
  ['function isFlatbedRecoveryVehicleCheckbox(input)', 'recovery checkbox matcher'],
  [".includes('105')", 'exact type-105 recovery vehicle'],
  ['flatbedRecoveryOnly', 'strict recovery selector path'],
  ['strictVehicleTypeOnly', 'generic quick-select fallback blocked'],
  ['data-requirement-type-vehicles', 'structured Missing Vehicles support'],
]) requireText(token, label);

for (const forbidden of [
  'Default 1000ms. Auto Mode uses readiness checks and skips duplicate loading waits.',
  '"Search Advisor": "Control Van"',
  '"Search Advisors": "Control Van"',
]) {
  if (source.includes(forbidden)) fail(`Forbidden legacy contract remains: ${forbidden}`);
}

const towFunctionStart = source.indexOf('    function getCarsToTowVehicleRequirement(');
const towFunctionEnd = source.indexOf('    function ', towFunctionStart + 20);
if (towFunctionStart < 0 || towFunctionEnd < 0) fail('Unable to extract towing conversion');
const towFunction = source.slice(towFunctionStart, towFunctionEnd);
const towing = Function(
  'isCarsToTowRequirementName',
  `"use strict";\n${towFunction}\nreturn getCarsToTowVehicleRequirement;`
)(value => /^(?:Required\s+)?(?:\d+\s+)?car(?:s)?\s+to\s+tow$/i.test(String(value || '').trim()));

for (const [label, cars, expectedVehicles] of [
  ['Car to tow', 1, 1],
  ['Cars to tow', 2, 1],
  ['Cars to tow', 3, 2],
]) {
  const result = towing(label, cars);
  if (!result || result.stillNeeded !== expectedVehicles) {
    fail(`${label} ${cars} expected ${expectedVehicles} recovery vehicle(s)`);
  }
}

console.log('Bulk update contracts passed: delay helper removed, all-vehicle exact personnel profiles trusted, Search Advisor uses trained assigned units, and singular/plural towing uses exact type-105 recovery vehicles.');
