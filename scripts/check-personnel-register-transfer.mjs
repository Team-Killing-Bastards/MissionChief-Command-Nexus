#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

// Keep the Personnel Register transfer and latest trained-coverage optimiser inseparable.
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

for (const [token, label] of [
  ['// @version      1.0.49', 'v1.0.49 metadata'],
  ["const PERSONNEL_VERSION = '1.3.6';", 'Personnel v1.3.4'],
  [' * MODULE 2: MISSION FINDER V10.6.113', 'latest Mission Finder baseline'],
  ['Build All Register', 'readable all-station register action'],
  ['id="mc-personnel-export-register"', 'register export control'],
  ['id="mc-personnel-import-register"', 'register import control'],
  ['id="mc-personnel-register-status"', 'register status display'],
  ['function exportPersonnelTrainingRegistry()', 'register export implementation'],
  ['async function importPersonnelTrainingRegistry(file)', 'register import implementation'],
  ['PERSONNEL_TRAINING_REGISTRY_IMPORT_MAX_BYTES', 'import file-size limit'],
  ['PERSONNEL_TRAINING_REGISTRY_MAX_VEHICLES', 'vehicle-count limit'],
  ['isUnsafePersonnelTrainingRegistryKey', 'unsafe-key rejection'],
  ['const registryRetained = getPersonnelTrainingRegistryStats().count;', 'accurate retained count'],
  ['const MF_PSU_COMPATIBLE_TRAINING_CODES =', 'trained coverage optimiser'],
  ['function applyTrainingCandidateCoverage(', 'trained coverage allocation'],
]) {
  if (!source.includes(token)) fail(`Missing Personnel Register release contract: ${label}`);
}

console.log('Personnel Register transfer and latest trained-coverage contracts passed.');
