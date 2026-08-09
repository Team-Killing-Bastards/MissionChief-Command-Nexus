#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(token, label) {
  if (!source.includes(token)) fail(`Missing diagnostic-export contract: ${label}`);
}

requireText('// @version      1.0.92', 'v1.0.57 metadata');
requireText(' * MODULE 2: MISSION FINDER V10.6.144', 'Mission Finder V10.6.120');
requireText("'mf_unit_finder_diagnostics_v1'", 'diagnostic history storage');
requireText('function mfSetUnitFinderDiagnosticContext(', 'requirement context capture');
requireText('function mfBuildUnitFinderDiagnosticSnapshot(', 'snapshot builder');
requireText('function mfPersistUnitFinderDiagnostic(', 'snapshot persistence');
requireText('function exportUnitFinderDiagnostics()', 'JSON export');
requireText("diagnosticsBtn.id = 'mf-export-unit-finder-diagnostics'", 'export button');
requireText("mfPersistUnitFinderDiagnostic('before-dispatch')", 'pre-dispatch capture');
requireText("mfPersistUnitFinderDiagnostic('before-dispatch-share')", 'pre-share capture');
requireText('missionDefinitionRawRows:', 'raw definition evidence');
requireText('currentLiveRequirementRows:', 'live missing evidence');
requireText('selectedVehicles', 'actual selected vehicle evidence');
requireText('assignedTrainingProfiles:', 'per-person training-code evidence');
requireText('privacyNote:', 'export privacy statement');

const processStart = source.indexOf('    async function processRequirementRows(');
const processEnd = source.indexOf('\n    async function processVehicles(', processStart);
if (processStart < 0 || processEnd < 0) fail('Unable to isolate processRequirementRows');
const processBlock = source.slice(processStart, processEnd);
if (!processBlock.includes("mfSetUnitFinderDiagnosticContext(\n            'unit-finder'")) {
  fail('Unit Finder must capture supplied and processed requirement rows');
}

const updateStart = source.indexOf('    function handleMissionUpdateUnits(');
const updateEnd = source.indexOf('\n    async function autoHandleMissionUpdateAfterDispatch(', updateStart);
if (updateStart < 0 || updateEnd < 0) fail('Unable to isolate handleMissionUpdateUnits');
const updateBlock = source.slice(updateStart, updateEnd);
if (!updateBlock.includes("mfSetUnitFinderDiagnosticContext(\n            'mission-update'")) {
  fail('Mission Update must capture raw and normalised missing rows');
}

const exportStart = source.indexOf('    function exportUnitFinderDiagnostics()');
const exportEnd = source.indexOf('\n    function getVehicleDebugName(', exportStart);
if (exportStart < 0 || exportEnd < 0) fail('Unable to isolate diagnostic exporter');
const exportBlock = source.slice(exportStart, exportEnd);
for (const token of ['Blob(', 'JSON.stringify(payload, null, 2)', 'link.download = filename']) {
  if (!exportBlock.includes(token)) fail(`Exporter missing ${token}`);
}

console.log('Unit Finder diagnostic export checks passed.');
