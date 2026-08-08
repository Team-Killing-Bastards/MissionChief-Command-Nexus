#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

// Road Rail dispatch must not use names, callsigns or abbreviation fallback.
for (const [token, label] of [
  ['// @version      1.0.86', 'v1.0.51 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.144', 'Mission Finder V10.6.120 header'],
  ['"Road Rail Unit": "Road Rail Unit",', 'singular canonical Road Rail alias'],
  ['"Road Rail Units": "Road Rail Unit",', 'plural canonical Road Rail alias'],
  ['function isRoadRailUnitRequirement(', 'strict Road Rail requirement detector'],
  ['function isRoadRailUnitVehicleCheckbox(', 'strict Road Rail checkbox matcher'],
  ["return getVehicleTypeIdentifiers(input).includes('107');", 'type-107-only matcher'],
  ['const roadRailOnly =', 'dedicated selector flag'],
  ['matches = isRoadRailUnitVehicleCheckbox(input);', 'dedicated selected-count verification'],
  ['"59": "Coastguard Rope Rescue Unit",', 'separate Coastguard type-59 mapping'],
  ['"107": "RRU",', 'Fire type-107 display mapping'],
]) {
  if (!source.includes(token)) fail(`Missing Road Rail RRU contract: ${label}`);
}

if (/"Road Rail Units?"\s*:\s*"RRU"/.test(source)) {
  fail('Road Rail aliases still use the ambiguous generic RRU route');
}

const matcherStart = source.indexOf('function isRoadRailUnitVehicleCheckbox(');
const matcherEnd = source.indexOf('function isCrvRequirement(', matcherStart);
const roadRailMatcher = source.slice(matcherStart, matcherEnd);

for (const forbidden of [
  'getExtendedVehicleValues',
  "cleaned === 'rru'",
  'road rail units',
  "includes('59')",
  'coastguard rope',
]) {
  if (roadRailMatcher.toLowerCase().includes(forbidden.toLowerCase())) {
    fail(`Road Rail matcher retains forbidden fallback: ${forbidden}`);
  }
}

console.log('Road Rail requirements use only exact Fire type-107; all RRU text fallback and Coastguard type-59 linkage are removed.');
