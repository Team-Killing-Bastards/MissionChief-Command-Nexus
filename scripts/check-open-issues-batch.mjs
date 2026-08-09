#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const SOURCE_PATH = 'src/missionchief-command-nexus.user.js';
const source = await readFile(SOURCE_PATH, 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(text, label) {
  if (!source.includes(text)) fail(`Missing open-issues contract: ${label}`);
}

function extractBetween(startText, endText, label) {
  const start = source.indexOf(startText);
  if (start < 0) fail(`Unable to find ${label} start`);
  const end = source.indexOf(endText, start + startText.length);
  if (end < 0) fail(`Unable to find ${label} end`);
  return source.slice(start, end);
}

requireText('// @version      1.0.95', 'current userscript metadata');
requireText("const PERSONNEL_VERSION = '1.3.9';", 'current Personnel Assignment version');
requireText(' * MODULE 2: MISSION FINDER V10.6.144', 'current Mission Finder header');

// #126 PSU registry and assigned staff.
requireText('function getPersonnelVehicleTypeIdFromRow(row)', 'broad vehicle-type discovery');
requireText("return '51';", 'PSU type-51 fallback');
requireText("#personal_table tbody tr')", 'all personnel rows scanned');
requireText("input[type=\"submit\"], input[type=\"button\"]", 'button/input assignment controls');
requireText("control?.classList?.contains('btn-assigned')", 'assigned-state button');
requireText('/remove\\s+binding/i.test(text)', 'visible Remove binding control');
requireText('registry.vehicles[vehicleId] = {', 'exact vehicle-ID registry replacement');

// #123 CRV.
requireText('function isCrvRequirement(', 'CRV requirement classifier');
requireText("return typeIdentifiers.includes('57')", 'exact type-57 CRV matcher');
requireText('matches = isCrvVehicleCheckbox(input);', 'selected CRV counter');

// #121 structured Missing Vehicles.
requireText('[data-requirement-type="vehicles"]', 'new structured vehicle selector');
requireText('function getStructuredMissingVehicleRows(', 'structured Missing Vehicles parser');
requireText(".replace(/\\u00a0/g, ' ')", 'NBSP normalisation');
requireText("'data-requirement-type-vehicles'", 'structured update source');
requireText("dispatchTargetMode: 'total'", 'Missing Vehicles quantity is a current checked-selection target');
requireText('explicitMissingVehicles: true', 'Missing Vehicles current-source authority');

// #117 was superseded by the later all-vehicle trained-staff rule.
requireText("code:\n                    'search_and_rescue'", 'Search Advisor trained-person code');
requireText('registryAnyVehicle:', 'Search Advisor all-vehicle registry flag');
requireText("getRegistryTrainingQualifiedCount(", 'Search Advisor exact assigned-training evidence');
if (source.includes('"Search Advisor": "Control Van"')) {
  fail('Search Advisor must no longer be hard-mapped to Control Van');
}

// #115 Police Officers.
requireText('Math.ceil(required / 2)', 'Police Officer ceiling conversion');
requireText("unitName:\n                    'Police Car'", 'Police Officer Police Car row');
requireText('matches = isPoliceCarVehicleCheckbox(input);', 'selected type-8 count');

// #86 HEMS vs trained road Critical Care.
requireText('function isGenericCriticalCareRequirement(', 'generic Critical Care classifier');
requireText("return typeIdentifiers.includes('9')", 'exact type-9 HEMS matcher');
requireText("getVehicleTypeIdentifiers(input).includes('5')", 'exact type-5 road Ambulance matcher');
requireText('trainingCounts.critical_care', 'Critical Care training verification');
requireText('sortVehicleCheckboxesByBestArrival(', 'shared nearest-arrival ordering');
requireText('function isCriticalCareTransferAmbulanceRequirement(', 'explicit type-98 exception');

const allMatching = extractBetween(
  '    function getAllMatchingVehicleCheckboxes(',
  '    function getMatchingVehicleCheckboxes(',
  'shared candidate selector'
);
for (const token of [
  'if (crvOnly)',
  'if (controlVanOnly)',
  'if (airAmbulanceOnly)',
  'if (criticalCareTransferOnly)',
  'if (genericCriticalCare)'
]) {
  if (!allMatching.includes(token)) fail(`Shared selector missing ${token}`);
}

const updateRows = extractBetween(
  '    function readMissionUpdateRows(',
  '    function getMissionUpdateFirstPassKey(',
  'Mission Update parser'
);
if (!updateRows.includes('structuredMissingVehicleRows.forEach')) {
  fail('Mission Update does not consume structured Missing Vehicles rows');
}
if (!updateRows.includes('personnelTextBlocks.forEach')) {
  fail('Missing Personnel processing was lost');
}

console.log('Open issues #126, #123, #121, #117, #115 and #86 regression checks passed.');
