#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

// Fire Road Rail Unit and Coastguard Rope Rescue Unit share an abbreviation only;
// their dispatch routes must remain exact type 107 and type 59 respectively.
for (const [token, label] of [
  ['// @version      1.0.39', 'v1.0.39 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.103', 'Mission Finder V10.6.103 header'],
  ['"Road Rail Unit": "Road Rail Unit",', 'singular canonical Road Rail alias'],
  ['"Road Rail Units": "Road Rail Unit",', 'plural canonical Road Rail alias'],
  ['function isRoadRailUnitRequirement(', 'strict Road Rail requirement detector'],
  ['function isRoadRailUnitVehicleCheckbox(', 'strict Road Rail checkbox matcher'],
  ["typeIdentifiers.includes('107')", 'exact type-107 matcher'],
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

const roadRailMatcher = source.slice(
  source.indexOf('function isRoadRailUnitVehicleCheckbox('),
  source.indexOf('function isCrvRequirement(')
);
if (roadRailMatcher.includes("includes('59')") || roadRailMatcher.includes('coastguard rope')) {
  fail('Road Rail matcher must never include Coastguard Rope Rescue type 59');
}

console.log('Road Rail requirements use exact Fire type-107 RRU and exclude Coastguard type-59 CRRU.');
