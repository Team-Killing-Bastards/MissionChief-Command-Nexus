#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(token, label) {
  if (!source.includes(token)) fail(`Missing initial trained-personnel contract: ${label}`);
}

requireText('// @version      1.0.66', 'v1.0.55 metadata');
requireText(' * MODULE 2: MISSION FINDER V10.6.129', 'Mission Finder V10.6.120 header');
requireText('const suppliedHasMissionDefinitionPersonnel =', 'definition-personnel authority detector');
requireText("row?.source ===\n                            'mission-definition-required-personnel'", 'definition source fallback');
requireText('!suppliedHasMissionDefinitionPersonnel', 'live-panel replacement exclusion');
requireText('hasExplicitCurrentMissingRequirementRows(', 'explicit current shortage authority');

const processStart = source.indexOf('    async function processRequirementRows(');
const processEnd = source.indexOf('\n    async function processVehicles(', processStart);
if (processStart < 0 || processEnd < 0) fail('Unable to isolate processRequirementRows');
const processBlock = source.slice(processStart, processEnd);

const detectorIndex = processBlock.indexOf('const suppliedHasMissionDefinitionPersonnel =');
const replacementIndex = processBlock.indexOf('requirementRows = readMissionUpdateRows();');
if (detectorIndex < 0 || replacementIndex < 0 || detectorIndex > replacementIndex) {
  fail('Definition personnel must be detected before any live-panel replacement');
}
if (!processBlock.includes('!suppliedHasMissionDefinitionPersonnel')) {
  fail('Live-panel replacement must be blocked for definition-trained rows');
}

const supportedCodes = [
  'level_1_public_order',
  'level_2_public_order',
  'police_sergeant',
  'police_medic',
  'police_inspector',
  'railway_police',
  'search_and_rescue',
  'armed_response_personnel',
];
for (const code of supportedCodes) {
  if (!source.includes(`'${code}'`)) fail(`Missing supported training code ${code}`);
}

const extractorStart = source.indexOf('    function extractLiveMissionRequirementRows(');
const extractorEnd = source.indexOf('\n    function extractTowCarRequirementRows(', extractorStart);
if (extractorStart < 0 || extractorEnd < 0) fail('Unable to isolate mission definition extractor');
const extractor = source.slice(extractorStart, extractorEnd);
for (const token of [
  'getMissionDefinitionTrainedPersonnelRequirements(',
  'missionDefinitionRequiredPersonnel:',
  "'mission-definition-required-personnel'",
]) {
  if (!extractor.includes(token)) fail(`Definition extractor missing ${token}`);
}

console.log('Initial mission-definition trained-personnel authority checks passed.');
