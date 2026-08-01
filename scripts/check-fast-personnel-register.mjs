#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

for (const [token, label] of [
  ['// @version      1.0.75', 'v1.0.51 metadata'],
  ["const PERSONNEL_VERSION = '1.3.8';", 'Personnel v1.3.7'],
  ['const PERSONNEL_REGISTER_MAX_CONCURRENCY = 3;', 'bounded desktop concurrency'],
  ['const PERSONNEL_REGISTER_LAUNCH_GAP_MS = 350;', 'shared request launch pacing'],
  ['const PERSONNEL_REGISTER_REVERIFY_AGE_MS = 30 * 24 * 60 * 60 * 1000;', 'periodic exact reverification'],
  ['id="mc-personnel-build-register"', 'quick refresh control'],
  ['Quick Refresh Register', 'quick refresh label'],
  ['id="mc-personnel-full-register"', 'full verification control'],
  ['Full Verify Register', 'full verification label'],
  ['function getPersonnelStationAssignmentSnapshot(', 'safe station snapshot'],
  ['function isPersonnelRegistryVehicleSnapshotReusable(', 'exact-record reuse gate'],
  ['async function runPersonnelRegisterVehicleVerificationPool(', 'bounded verification pool'],
  ['await waitForLaunchSlot();', 'shared launch gate'],
  ['Math.min(\n                isIosSafariWebsite() ? 2 : PERSONNEL_REGISTER_MAX_CONCURRENCY', 'mobile concurrency reduction'],
  ['snapshot.unresolvedRows', 'unsafe snapshot fail closed'],
  ['stationVehicleIds.has(resolvedVehicleId)', 'foreign assignment fails closed'],
  ['Station personnel table supplied', 'Search Advisor fallback diagnostic'],
  ["startsWith(\n                'personnel-register-exact-'", 'exact source requirement'],
  ['stationConfirmedAt = Date.now();', 'unchanged station reconfirmation'],
  ["source:\n                                    'personnel-register-exact-incremental-scan-v1'", 'incremental exact publisher'],
  ['Exact vehicles reused unchanged:', 'reuse reporting'],
  ['const registryRetained = getPersonnelTrainingRegistryStats().count;', 'accurate retained count'],
  ['Vehicle pages remain authoritative', 'authority report'],
  ['STATE.running || STATION_STATE.running', 'naming tools block concurrent register work'],
  ["querySelector('#vehicle_table')", 'station table required before pruning'],
  ['failedVehicleIds', 'failed exact page tracking'],
  ['personnel-register-refresh-failed-v1', 'failed exact records become untrusted'],
]) {
  if (!source.includes(token)) fail(`Missing fast-register contract: ${label}`);
}

const builderStart = source.indexOf('    async function buildPersonnelTrainingRegisterOneClick(');
if (builderStart < 0) fail('Unable to locate register builder');
const builderTail = source.slice(builderStart + 20);
const nextTopLevelFunction = /^    (?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(/m.exec(builderTail);
if (!nextTopLevelFunction) fail('Unable to isolate register builder');
const builderEnd = builderStart + 20 + nextTopLevelFunction.index;
const builder = source.slice(builderStart, builderEnd);
if (!builder.includes('fullVerify')) fail('Builder does not expose quick/full mode');
if (!builder.includes('vehiclesToVerify')) fail('Builder does not classify changed vehicles');
if (!builder.includes('reusedVehicles += 1')) fail('Builder does not retain unchanged exact records');
if (!builder.includes('delete registry.vehicles[vehicleId]')) fail('Builder does not remove deleted station vehicles');
if (!builder.includes('parseStationPersonnelAssignmentEvidence(')) fail('Builder lost Search Advisor station-fallback integration contract');

console.log('Fast personnel register contracts passed: routine refresh reuses unchanged exact records, unsafe or changed vehicles are verified, full audit remains available and exact page requests are bounded.');
