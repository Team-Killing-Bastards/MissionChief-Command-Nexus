#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(token, label) {
  if (!source.includes(token)) {
    fail(`Missing current-requirements priority contract: ${label} (${token})`);
  }
}

function requireOrdered(first, second, label) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) {
    fail(`Current-requirements priority ordering failed: ${label}`);
  }
}

for (const [token, label] of [
  ['// @version      1.0.60', 'Command Nexus 1.0.60 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.123', 'Mission Finder V10.6.123 header'],
  ['function isExplicitMissingVehicleRequirementRow(', 'explicit Missing Vehicles classifier'],
  ['function isExplicitMissingPersonnelRequirementRow(', 'explicit Missing Personnel classifier'],
  ['function getMissionUpdateRowAuthority(', 'current-row authority ordering'],
  ['function getExplicitCurrentMissingRequirementRows(', 'explicit-current-row extractor'],
  ['function getMissionUpdateTableHeaderTexts(', 'Mission Update header reader'],
  ['function isMissingOnMissionUpdateTable(', 'Missing on mission table classifier'],
  ['function hasVisibleCurrentMissingOnMissionTable(', 'Missing on mission authority gate'],
  ["headers.includes('missing on mission')", 'Missing on mission header contract'],
  ["header === 'still needed'", 'Still needed header contract'],
  ["source === 'missing-on-mission-table'", 'Missing on mission explicit source'],
  ["source === 'data-raw-html-missing-vehicles'", 'escaped Missing Vehicles explicit source'],
  ["root.querySelectorAll('[data-raw-html]')", 'escaped data-raw-html host scan'],
  ['normaliseEscapedMissionHtmlText(rawHtml)', 'escaped Missing Vehicles decoding'],
  ["source: 'data-raw-html-missing-vehicles'", 'escaped Missing Vehicles source marker'],
  ['const missingOnMissionTable =', 'per-table Missing on mission classification'],
  ['!missingOnMissionTable', 'zero Still needed fallback suppression'],
  ['selected + reportedStillNeeded', 'current-selection total conversion'],
  ["'missing-on-mission-table'", 'Mission Update table row source'],
  ["dispatchTargetMode: 'total'", 'current-selection total mode'],
  ['explicitMissingVehicles: true', 'current Missing Vehicles authority marker'],
  ['let useCurrentMissionUpdateAuthority =', 'combined current-state authority switch'],
  ['hasVisibleCurrentMissingOnMissionTable()', 'combined Missing on mission authority check'],
  ['const refreshedMissingOnMissionTableAuthority =', 'late Missing on mission refresh'],
  ['Current Missing on mission table found with no positive Still needed rows', 'zero-shortage existing-mission route'],
  ["currentUpdateRows,\n                    'CURRENT MISSING REQUIREMENTS'", 'current rows passed to Mission Update processing'],
  ['const hasEarlyMissingOnMissionTableAuthority =', 'early Auto Mode table authority'],
  ['const hasEarlyCurrentMissionUpdateAuthority =', 'early combined authority'],
  ['hasEarlyCurrentMissionUpdateAuthority\n                        ? null\n                        : readLiveMissionRequirements()', 'attachment prefetch suppression'],
  ['Patient-only alerts never suppress the attachment route.', 'patient-only new-mission rule'],
  ['handleUnitFinderPatientRequirements()', 'patient requirement subrule preservation'],
  ['postUnitFinderExplicitMissingRows', 'post-selection explicit shortage recheck'],
  ['suppliedHasExplicitCurrentMissingRequirements', 'explicit supplied-row protection'],
  ["targetMode === 'shortage'", 'legacy shortage mode preservation'],
]) {
  requireText(token, label);
}

requireOrdered(
  'readMissionUpdateRows({\n                silent: true',
  'await readLiveMissionRequirements()',
  'Unit Finder must read current Mission Update state before the mission definition'
);
requireOrdered(
  'let useCurrentMissionUpdateAuthority =',
  'const attachmentRows =',
  'authority must be decided before attachment selection'
);
requireOrdered(
  'const hasEarlyCurrentMissionUpdateAuthority =',
  'prefetchedAttachmentRowsPromise =',
  'Auto Mode must decide current-state authority before prefetching the definition'
);

if (source.includes('let useExplicitMissingRequirements =')) {
  fail('Legacy explicit-alert-only authority switch remains');
}
if (source.includes("explicitMissingRows,\n                    'CURRENT MISSING REQUIREMENTS'")) {
  fail('Unit Finder drops retained patient shortages by processing only the explicit subset');
}
if (source.includes("'data-requirement-type-vehicles',\n                {\n                    dispatchTargetMode: 'shortage'")) {
  fail('Structured Missing Vehicles is incorrectly additive instead of a current-selection total');
}

console.log('Current Missing Vehicles/Personnel and Missing on mission tables outrank full mission totals, zero-shortage tables preserve existing-mission state, patient-only rows remain additive, and Auto Mode retains the new-mission versus Mission Update routing rule.');
