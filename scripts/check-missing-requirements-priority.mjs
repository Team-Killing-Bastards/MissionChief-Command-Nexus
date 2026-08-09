#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(text, token, label) {
  if (!text.includes(token)) {
    fail(`Missing current-requirements priority contract: ${label} (${token})`);
  }
}

function section(startToken, endToken, label) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end <= start) fail(`Unable to locate ${label}`);
  return source.slice(start, end);
}

function requireOrdered(text, first, second, label) {
  const firstIndex = text.indexOf(first);
  const secondIndex = text.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) {
    fail(`Current-requirements priority ordering failed: ${label}`);
  }
}

for (const [token, label] of [
  ['// @version      1.0.94', 'current Command Nexus metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.144', 'current Mission Finder header'],
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
  ['suppliedHasExplicitCurrentMissingRequirements', 'explicit supplied-row protection'],
  ["targetMode === 'shortage'", 'legacy shortage mode preservation'],
]) {
  requireText(source, token, label);
}

const combined = section(
  'async function handleCombinedLogic(',
  'function getActiveMissionInfoForAllySteal(',
  'Unit Finder combined logic'
);
for (const [token, label] of [
  ['let useCurrentMissionUpdateAuthority =', 'combined current-state authority switch'],
  ['hasVisibleCurrentMissingOnMissionTable()', 'combined Missing on mission authority check'],
  ['const refreshedMissingOnMissionTableAuthority =', 'late Missing on mission refresh'],
  ['Current Missing on mission table found with no positive Still needed rows', 'zero-shortage existing-mission route'],
  ['currentUpdateRows', 'current Mission Update rows retained for processing'],
  ["'CURRENT MISSING REQUIREMENTS'", 'current rows passed to Mission Update processing'],
  ['handleUnitFinderPatientRequirements()', 'patient requirement subrule preservation'],
]) {
  requireText(combined, token, label);
}
requireOrdered(
  combined,
  'readMissionUpdateRows(',
  'readLiveMissionRequirements()',
  'Unit Finder must read current Mission Update state before the mission definition'
);
requireOrdered(
  combined,
  'let useCurrentMissionUpdateAuthority =',
  'const attachmentRows =',
  'authority must be decided before attachment selection'
);

const autoLoop = section(
  'async function runAutoModeLoop(',
  'function initialize(',
  'Auto Mode loop'
);
for (const [token, label] of [
  ['const hasEarlyMissingOnMissionTableAuthority =', 'early Auto Mode table authority'],
  ['const hasEarlyCurrentMissionUpdateAuthority =', 'early combined authority'],
  ['prefetchedAttachmentRowsPromise', 'attachment prefetch control'],
  ['readLiveMissionRequirements()', 'mission definition prefetch'],
  ['Patient-only alerts never suppress the attachment route.', 'patient-only new-mission rule'],
  ['postUnitFinderExplicitMissingRows', 'post-selection explicit shortage recheck'],
]) {
  requireText(autoLoop, token, label);
}
requireOrdered(
  autoLoop,
  'const hasEarlyCurrentMissionUpdateAuthority =',
  'prefetchedAttachmentRowsPromise',
  'Auto Mode must decide current-state authority before prefetching the definition'
);
requireOrdered(
  autoLoop,
  'hasEarlyCurrentMissionUpdateAuthority',
  'readLiveMissionRequirements()',
  'current Mission Update authority must suppress the definition prefetch'
);

if (source.includes('let useExplicitMissingRequirements =')) {
  fail('Legacy explicit-alert-only authority switch remains');
}
if (combined.includes("explicitMissingRows,\n                    'CURRENT MISSING REQUIREMENTS'")) {
  fail('Unit Finder drops retained patient shortages by processing only the explicit subset');
}
if (source.includes("'data-requirement-type-vehicles',\n                {\n                    dispatchTargetMode: 'shortage'")) {
  fail('Structured Missing Vehicles is incorrectly additive instead of a current-selection total');
}

console.log('Current Missing Vehicles/Personnel and Missing on mission tables outrank full mission totals, zero-shortage tables preserve existing-mission state, patient-only rows remain additive, and Auto Mode retains the new-mission versus Mission Update routing rule.');
