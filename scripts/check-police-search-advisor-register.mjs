#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(token, label) {
  if (!source.includes(token)) fail(`Missing Police Search Advisor register contract: ${label}`);
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
  ['// @version      1.0.80', 'v1.0.51 metadata'],
  ["const PERSONNEL_VERSION = '1.3.8';", 'Personnel v1.3.6'],
  [' * MODULE 2: MISSION FINDER V10.6.140', 'Mission Finder V10.6.120'],
  ['personnel-register-exact-all-vehicle-scan-v2', 'second-generation exact register source'],
  ['function parseStationPersonnelAssignmentEvidence(', 'station personnel assignment fallback'],
  ['function getUniquePersonnelVehicleNameIndex(', 'unique vehicle-name fail-closed index'],
  ['function getStationPersonnelRowId(', 'station personnel ID parser'],
  ["input.personal-delete-checkbox[value]", 'MissionChief personnel checkbox ID'],
  ['stationAssignmentEvidence: true', 'station evidence marker'],
  ['Station personnel table supplied', 'fallback diagnostic'],
  ["code: 'search_and_rescue'", 'Search Advisor training code'],
  ['registryAnyVehicle:', 'Search Advisor any-vehicle route'],
  ['trainedOnly:', 'Search Advisor trained-only route'],
]) requireText(token, label);

for (const forbidden of [
  'personnel-register-exact-all-vehicle-scan-v1',
  '"Search Advisor": "Control Van"',
  '"Search Advisors": "Control Van"',
]) {
  if (source.includes(forbidden)) fail(`Forbidden legacy Search Advisor contract remains: ${forbidden}`);
}

const cleanText = value => String(value || '').replace(/\s+/g, ' ').trim();
const getVehicleIdFromHref = href => String(href || '').match(/\/vehicles\/(\d+)/)?.[1] || '';
const bundle = [
  extractFunction('normalizePersonnelVehicleName'),
  extractFunction('parseTrainingCodes'),
  extractFunction('getStationPersonnelRowId'),
  extractFunction('getUniquePersonnelVehicleNameIndex'),
  extractFunction('parseStationPersonnelAssignmentEvidence'),
].join('\n');
const helpers = Function(
  'cleanText',
  'getVehicleIdFromHref',
  `"use strict";\n${bundle}\nreturn { parseTrainingCodes, parseStationPersonnelAssignmentEvidence };`
)(cleanText, getVehicleIdFromHref);

function makeCell(text, link = null) {
  return {
    textContent: text,
    querySelector(selector) {
      if (selector === 'a[href^="/vehicles/"]') return link;
      return null;
    },
  };
}

function makeRow({
  trainingAttribute = '["drone" "search_and_rescue"]',
  assignedName = '🚔🚁 KELTY-PS1-PDV-4',
  assignedHref = '',
  status = 'Available',
  personnelId = '81427610',
} = {}) {
  const deleteCheckbox = {
    value: personnelId,
    getAttribute(name) {
      return name === 'value' ? personnelId : null;
    },
  };
  const assignedLink = assignedHref ? {
    textContent: assignedName,
    getAttribute(name) {
      return name === 'href' ? assignedHref : null;
    },
  } : null;
  const cells = [
    makeCell(''),
    makeCell('Sophie L.'),
    makeCell('Search Advisor, Drone Operator'),
    makeCell(assignedName, assignedLink),
    makeCell(status),
    makeCell(''),
  ];
  return {
    children: cells,
    id: '',
    getAttribute(name) {
      return name === 'data-filterable-by' ? trainingAttribute : null;
    },
    querySelector(selector) {
      if (selector === 'input.personal-delete-checkbox' || selector === 'input.personal-delete-checkbox[value]') {
        return deleteCheckbox;
      }
      return null;
    },
  };
}

const spaceSeparatedCodes = helpers.parseTrainingCodes(makeRow());
if (
  spaceSeparatedCodes.length !== 2 ||
  !spaceSeparatedCodes.includes('drone') ||
  !spaceSeparatedCodes.includes('search_and_rescue')
) {
  fail(`MissionChief space-separated training codes were not parsed independently: ${JSON.stringify(spaceSeparatedCodes)}`);
}

const commaCodes = helpers.parseTrainingCodes(makeRow({
  trainingAttribute: '["drone","search_and_rescue"]',
}));
if (commaCodes.length !== 2 || !commaCodes.includes('search_and_rescue')) {
  fail('Valid JSON training-code arrays regressed');
}

const row = makeRow();
const doc = {
  querySelectorAll(selector) {
    return selector === '#personal_table tbody tr' ? [row] : [];
  },
};
const vehicles = [{
  vehicleId: '7532451',
  name: '🚔🚁 KELTY-PS1-PDV-4',
  vehicleTypeId: '91',
}];
const evidence = helpers.parseStationPersonnelAssignmentEvidence(doc, vehicles);
if (evidence.length !== 1) fail('Police station personnel row did not produce exact assignment evidence');
if (evidence[0].personnelId !== '81427610') fail('Police personnel ID was not read from the delete checkbox');
if (evidence[0].assignedVehicleId !== '7532451') fail('Unique Assigned To vehicle name did not resolve to the exact vehicle ID');
if (!evidence[0].available) fail('Available status must not erase the persistent Assigned To binding');
if (!evidence[0].trainingCodes.includes('search_and_rescue')) fail('Search Advisor training was not preserved in station assignment evidence');

const duplicateVehicles = [
  { vehicleId: '1', name: 'DUPLICATE PDV' },
  { vehicleId: '2', name: 'DUPLICATE PDV' },
];
const ambiguousDoc = {
  querySelectorAll() {
    return [makeRow({ assignedName: 'DUPLICATE PDV' })];
  },
};
if (helpers.parseStationPersonnelAssignmentEvidence(ambiguousDoc, duplicateVehicles).length !== 0) {
  fail('Ambiguous duplicate vehicle names must fail closed');
}

const linkedDoc = {
  querySelectorAll() {
    return [makeRow({
      assignedName: 'DUPLICATE PDV',
      assignedHref: '/vehicles/2',
    })];
  },
};
const linkedEvidence = helpers.parseStationPersonnelAssignmentEvidence(linkedDoc, duplicateVehicles);
if (linkedEvidence.length !== 1 || linkedEvidence[0].assignedVehicleId !== '2') {
  fail('An exact Assigned To vehicle link must override duplicate-name ambiguity');
}

const buildRegister = extractFunction('buildPersonnelTrainingRegisterOneClick');
for (const token of [
  'parseStationPersonnelAssignmentEvidence(',
  'new Map(',
  'person.assignedHere && !existing.assignedHere',
  'personnel-register-exact-all-vehicle-scan-v2',
]) {
  if (!buildRegister.includes(token)) fail(`Build All Register fallback integration missing: ${token}`);
}

const publisher = extractFunction('publishPersonnelVehicleTrainingRegistry');
for (const token of [
  "String(source || '').startsWith('personnel-register-exact-')",
  "String(person?.assignedVehicleId || '') === vehicleId",
  'assignedTrainingProfiles,',
  'trainingProfilesComplete: exactVehicleProfileScan',
]) {
  if (!publisher.includes(token)) fail(`Exact vehicle profile publishing regressed: ${token}`);
}

console.log('Police Search Advisor register contracts passed: MissionChief space-separated training codes are parsed, persistent Assigned To bindings survive Available status, unique names resolve exact vehicle IDs, ambiguous names fail closed and Search Advisor remains trained-only on any exact registered vehicle.');
