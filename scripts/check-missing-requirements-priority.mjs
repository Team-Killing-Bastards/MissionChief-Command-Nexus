#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const SOURCE_PATH = 'src/missionchief-command-nexus.user.js';
const source = await readFile(SOURCE_PATH, 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(text, label) {
  if (!source.includes(text)) {
    fail(`Missing current-requirements priority contract: ${label}`);
  }
}

function extractFunction(name) {
  const pattern = new RegExp(
    `(?:^|\n)[ \t]*(?:async[ \t]+)?function[ \t]+${name}[ \t]*\([^)]*\)[ \t]*\{`,
    'm'
  );
  const match = pattern.exec(source);
  if (!match) fail(`Unable to find function ${name}`);

  const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
  const opening = match.index + match[0].lastIndexOf('{');
  let depth = 0;
  let state = 'code';
  let quote = '';
  let escaped = false;

  for (let index = opening; index < source.length; index += 1) {
    const character = source[index];
    const following = source[index + 1] || '';

    if (state === 'line-comment') {
      if (character === '\n') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      if (character === '*' && following === '/') {
        state = 'code';
        index += 1;
      }
      continue;
    }
    if (state === 'string' || state === 'template') {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) {
        state = 'code';
        quote = '';
      }
      continue;
    }
    if (character === '/' && following === '/') {
      state = 'line-comment';
      index += 1;
      continue;
    }
    if (character === '/' && following === '*') {
      state = 'block-comment';
      index += 1;
      continue;
    }
    if (character === "'" || character === '"') {
      state = 'string';
      quote = character;
      continue;
    }
    if (character === '`') {
      state = 'template';
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  fail(`Unable to extract function ${name}`);
}

requireText('// @version      1.0.59', 'v1.0.51 metadata');
requireText(' * MODULE 2: MISSION FINDER V10.6.122', 'V10.6.120 module header');
requireText('function isExplicitMissingVehicleRequirementRow(', 'explicit Missing Vehicles classifier');
requireText('function isExplicitMissingPersonnelRequirementRow(', 'explicit Missing Personnel classifier');
requireText('function getMissionUpdateRowAuthority(', 'current-row authority ordering');
requireText('function hasExplicitCurrentMissingRequirementRows(', 'explicit-current-row gate');
requireText('function getExplicitCurrentMissingRequirementRows(', 'explicit-current-row extractor');
requireText('function hasVisibleCurrentMissingOnMissionTable(', 'Missing on mission table authority gate');

const helperFactory = Function(
  `"use strict";\n${extractFunction('isExplicitMissingVehicleRequirementRow')}\n${extractFunction('isExplicitMissingPersonnelRequirementRow')}\n${extractFunction('getMissionUpdateRowAuthority')}\n${extractFunction('hasExplicitCurrentMissingRequirementRows')}\n${extractFunction('getExplicitCurrentMissingRequirementRows')}\nreturn { isExplicitMissingVehicleRequirementRow, isExplicitMissingPersonnelRequirementRow, getMissionUpdateRowAuthority, hasExplicitCurrentMissingRequirementRows, getExplicitCurrentMissingRequirementRows };`
);
const helpers = helperFactory();

const explicitVehicle = {
  unitName: 'Fire engine',
  stillNeeded: 2,
  updateSource: 'data-requirement-type-vehicles',
  liveRequirementDetails: {
    dispatchTargetMode: 'total',
    explicitMissingVehicles: true
  }
};
const missingOnMission = {
  unitName: 'Traffic Cars',
  stillNeeded: 2,
  updateSource: 'missing-on-mission-table',
  liveRequirementDetails: {
    dispatchTargetMode: 'total',
    explicitMissingVehicles: true,
    missingOnMissionTable: true,
    reportedStillNeeded: 2,
    selected: 0
  }
};
const explicitPersonnel = {
  unitName: 'Police Car',
  stillNeeded: 3,
  updateSource: 'visible-missing-personnel-alert',
  liveRequirementDetails: {
    dispatchTargetMode: 'total',
    explicitMissingPersonnel: true
  }
};
const liveTotal = {
  unitName: 'Fire engine',
  stillNeeded: 12,
  updateSource: 'live-requirements-panel',
  liveRequirementDetails: {
    dispatchTargetMode: 'shortage'
  }
};
const patientOnly = {
  unitName: 'Ambulance',
  stillNeeded: 1,
  isPatientAlertFallback: true
};

if (!helpers.isExplicitMissingVehicleRequirementRow(explicitVehicle)) {
  fail('Structured Missing Vehicles row was not authoritative');
}
if (!helpers.isExplicitMissingVehicleRequirementRow(missingOnMission)) {
  fail('Missing on mission table row was not authoritative');
}
if (!helpers.isExplicitMissingPersonnelRequirementRow(explicitPersonnel)) {
  fail('Visible Missing Personnel row was not authoritative');
}
if (helpers.isExplicitMissingVehicleRequirementRow(liveTotal)) {
  fail('Ordinary live/full requirement row was incorrectly treated as an explicit missing alert');
}
if (helpers.hasExplicitCurrentMissingRequirementRows([patientOnly])) {
  fail('Patient-only alerts must not suppress the normal mission-help route');
}
if (!helpers.hasExplicitCurrentMissingRequirementRows([patientOnly, missingOnMission])) {
  fail('Missing on mission table must suppress the full mission requirement set');
}
if (helpers.getExplicitCurrentMissingRequirementRows([patientOnly, missingOnMission]).length !== 1) {
  fail('Explicit current-row extraction returned the wrong rows');
}
if (!(helpers.getMissionUpdateRowAuthority(missingOnMission) > helpers.getMissionUpdateRowAuthority(liveTotal))) {
  fail('Missing on mission shortage must outrank a larger full/live requirement total');
}

const structuredParser = extractFunction('getStructuredMissingVehicleRows');
if (!structuredParser.includes(".replace(/\\u00a0/g, ' ')")) {
  fail('Structured Missing Vehicles parser lost non-breaking-space normalisation');
}
if (!structuredParser.includes("root.querySelectorAll('[data-raw-html]')")) {
  fail('Escaped data-raw-html Missing Vehicles fallback is missing');
}

const updateRows = extractFunction('readMissionUpdateRows');
for (const token of [
  "dispatchTargetMode: 'total'",
  'explicitMissingVehicles: true',
  'explicitMissingPersonnel: true',
  "'missing-on-mission-table'",
  'selected + reportedStillNeeded',
  'const explicitMissingRequirementsPresent =',
  'const requirementRowsForDedupe =',
  'candidateAuthority > existingAuthority',
  'if (row?.isPatientAlertFallback)',
  "row?.patientRequirementType &&"
]) {
  if (!updateRows.includes(token)) {
    fail(`Mission Update authority filter is missing: ${token}`);
  }
}
if (updateRows.includes("'data-requirement-type-vehicles',\n                {\n                    dispatchTargetMode: 'shortage'")) {
  fail('Structured Missing Vehicles is still being added as an additive shortage');
}

const processing = extractFunction('processRequirementRows');
if (!processing.includes('suppliedHasExplicitCurrentMissingRequirements')) {
  fail('Explicit supplied rows are not protected from live/full source replacement');
}
if (!processing.includes('!suppliedHasExplicitCurrentMissingRequirements')) {
  fail('Full/live requirement replacement still overrides explicit current shortages');
}
if (!processing.includes("targetMode === 'shortage'")) {
  fail('Existing live Still Needed shortage handling was removed');
}

const unitFinder = extractFunction('handleCombinedLogic');
const updateReadIndex = unitFinder.indexOf('readMissionUpdateRows({');
const attachmentReadIndex = unitFinder.indexOf('readLiveMissionRequirements()');
if (updateReadIndex < 0 || attachmentReadIndex < 0 || updateReadIndex > attachmentReadIndex) {
  fail('Unit Finder does not check current missing requirements before the full attachment');
}
for (const token of [
  'let useCurrentMissionUpdateAuthority =',
  'hasVisibleCurrentMissingOnMissionTable()',
  'const refreshedUpdateRows =',
  'Full mission requirements were not reloaded.',
  "currentUpdateRows,\n                    'CURRENT MISSING REQUIREMENTS'"
]) {
  if (!unitFinder.includes(token)) {
    fail(`Unit Finder current-shortage priority is missing: ${token}`);
  }
}
if (unitFinder.includes("explicitMissingRows,\n                    'CURRENT MISSING REQUIREMENTS'")) {
  fail('Unit Finder drops retained patient shortages by processing only the explicit subset');
}

const autoLoop = extractFunction('runAutoModeLoop');
for (const token of [
  'const hasEarlyExplicitMissingRequirements =',
  'const hasEarlyCurrentMissionUpdateAuthority =',
  'hasEarlyCurrentMissionUpdateAuthority\n                        ? null\n                        : readLiveMissionRequirements()',
  'Patient-only alerts never suppress the attachment route.'
]) {
  if (!autoLoop.includes(token)) {
    fail(`Auto Mode current-shortage priority is missing: ${token}`);
  }
}

console.log('Current Missing Vehicles/Personnel and Missing on mission tables outrank full mission totals, patient-only rows remain additive, and Auto Mode preserves the new-mission versus Mission Update routing rule.');
