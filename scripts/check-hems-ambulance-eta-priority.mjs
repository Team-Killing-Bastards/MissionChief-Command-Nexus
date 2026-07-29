#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(token, label) {
  if (!source.includes(token)) fail(`Missing HEMS ambulance ETA contract: ${label}`);
}

function extractFunction(name) {
  const pattern = new RegExp(`^\\s*(?:async\\s+)?function\\s+${name}\\s*\\(`, 'm');
  const match = pattern.exec(source);
  if (!match) fail(`Unable to locate function ${name}`);
  const start = match.index;
  const rest = source.slice(start + match[0].length);
  const next = /^\s*(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(/m.exec(rest);
  if (!next) fail(`Unable to locate end of function ${name}`);
  return source.slice(start, start + match[0].length + next.index);
}

for (const [token, label] of [
  ['// @version      1.0.56', 'v1.0.51 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.119', 'Mission Finder V10.6.119'],
  ['function isStandardAmbulanceEtaVehicleCheckbox(', 'combined standard Ambulance candidate helper'],
  ["typeIdentifiers.includes('5')", 'exact type-5 road Ambulance'],
  ["typeIdentifiers.includes('9')", 'exact type-9 HEMS'],
  ['AMBULANCE ETA PRIORITY', 'ETA-priority diagnostic'],
]) requireText(token, label);

const standardHelper = extractFunction('isStandardAmbulanceEtaVehicleCheckbox');
if (standardHelper.includes("includes('98')")) {
  fail('Critical Care Transfer Ambulance type 98 must not enter standard Ambulance demand');
}
const standardMatcher = Function(
  'getVehicleTypeIdentifiers',
  `"use strict";\n${standardHelper}\nreturn isStandardAmbulanceEtaVehicleCheckbox;`
)(input => input.types || []);
for (const [types, expected, label] of [
  [['5'], true, 'road Ambulance'],
  [['9'], true, 'HEMS'],
  [['98'], false, 'Critical Care Transfer Ambulance'],
  [['8'], false, 'Police vehicle'],
]) {
  if (standardMatcher({ types }) !== expected) {
    fail(`Standard Ambulance eligibility failed for ${label}`);
  }
}

const sorterSource = extractFunction('sortVehicleCheckboxesByBestArrival');
const sorter = Function(
  'mfVehicleArrivalMetricCache',
  `"use strict";\n${sorterSource}\nreturn sortVehicleCheckboxesByBestArrival;`
)(new WeakMap());
function vehicle(delay, distance, type) {
  const row = {
    getAttribute(name) {
      if (name === 'data-sortvalue') return String(delay);
      if (name === 'data-distance') return String(distance);
      return null;
    }
  };
  return { type, closest(selector) { return selector === 'tr' ? row : null; } };
}
const nearerRoad = vehicle(360, 2, '5');
const fartherFasterHems = vehicle(180, 80, '9');
if (sorter([nearerRoad, fartherFasterHems])[0] !== fartherFasterHems) {
  fail('A farther HEMS with the quicker ETA must be selected before the nearer road Ambulance');
}
const tieRoad = vehicle(180, 2, '5');
const tieHems = vehicle(180, 80, '9');
if (sorter([tieHems, tieRoad])[0] !== tieRoad) {
  fail('Distance must remain only the tie-breaker when ETAs are equal');
}

const allMatching = extractFunction('getAllMatchingVehicleCheckboxes');
for (const token of [
  'const standardAmbulanceEtaPreferred = strictExactOnly;',
  'if (standardAmbulanceEtaPreferred)',
  'isStandardAmbulanceEtaVehicleCheckbox(input)',
  'sortVehicleCheckboxesByBestArrival(',
]) {
  if (!allMatching.includes(token)) fail(`Shared selector missing: ${token}`);
}
const standardBranchStart = allMatching.indexOf('if (standardAmbulanceEtaPreferred)');
const roadRailStart = allMatching.indexOf('if (roadRailOnly)', standardBranchStart);
const standardBranch = allMatching.slice(standardBranchStart, roadRailStart);
if (standardBranch.includes('vehicleValuesMatchCandidates')) {
  fail('Standard Ambulance ETA selection must not use generic text matching');
}

const selectedCounter = extractFunction('countSelectedMatchingVehicles');
if (!selectedCounter.includes('matches = isStandardAmbulanceEtaVehicleCheckbox(input);')) {
  fail('Selected type-9 HEMS must count toward ordinary Ambulance demand');
}

const fallbackFinder = extractFunction('findUnitButton');
const exactRoute = fallbackFinder.indexOf('isAmbulanceTransportRequest(');
const genericCandidates = fallbackFinder.indexOf('const candidates = getVehicleMatchCandidates(');
if (!(exactRoute >= 0 && genericCandidates > exactRoute)) {
  fail('Standard Ambulance fallback must stay on the exact combined ETA route');
}

const selection = extractFunction('selectVehicleUnits');
const strictStart = selection.indexOf('const strictVehicleTypeOnly');
const strictEnd = selection.indexOf('if (', strictStart + 20);
const strictBlock = selection.slice(strictStart, strictEnd);
if (!strictBlock.includes('isAmbulanceTransportRequest(originalName, mappedName)')) {
  fail('Standard Ambulance demand must block generic quick-select fallback');
}

const airMatcher = extractFunction('isAirAmbulanceVehicleCheckbox');
if (!airMatcher.includes("typeIdentifiers.includes('9')")) {
  fail('Explicit HEMS/Air Ambulance requirements must remain exact type 9');
}
const transferMatcher = extractFunction('isCriticalCareTransferAmbulanceCheckbox');
if (!transferMatcher.includes("typeIdentifiers.includes('98')")) {
  fail('Critical Care Transfer Ambulance requirements must remain exact type 98');
}
const genericCriticalCare = extractFunction('isGenericCriticalCareVehicleCheckbox');
for (const token of ['isAirAmbulanceVehicleCheckbox(input)', 'isCriticalCareRoadAmbulanceCheckbox(input, registry)']) {
  if (!genericCriticalCare.includes(token)) fail(`Generic Critical Care route changed unexpectedly: ${token}`);
}

console.log('HEMS ambulance ETA contracts passed: standard patient demand compares exact type-5 Ambulances and type-9 HEMS by ETA, counts either when selected, blocks generic fallback, and preserves strict HEMS, transfer and Critical Care routes.');
