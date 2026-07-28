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
    fail(`Missing Police IRV fallback contract: ${label}`);
  }
}

function extractBetween(startText, endText, label) {
  const start = source.indexOf(startText);
  if (start < 0) fail(`Unable to find ${label} start`);
  const end = source.indexOf(endText, start + startText.length);
  if (end < 0) fail(`Unable to find ${label} end`);
  return source.slice(start, end);
}

requireText('// @version      1.0.52', 'v1.0.51 metadata');
requireText(' * MODULE 2: MISSION FINDER V10.6.115', 'V10.6.115 module header');
requireText('allowUnknown: true', 'unknown or stale type-8 IRV fallback');
requireText('allowProtected: true', 'known specialist type-8 IRV final fallback');
requireText('protectedFallback.push(checkbox)', 'specialist fallback partition');
requireText(
  '...verifiedOrdinary,\n            ...unknownOrStale,\n            ...protectedFallback',
  'ordinary then unknown then specialist order'
);
requireText(
  'matches = isPoliceCarVehicleCheckbox(input);',
  'every selected exact Police Car / type-8 IRV counts for generic attendance'
);
requireText('const personnelTextBlocks =', 'current visible Missing Personnel alerts');
requireText(
  'personnelTextBlocks.forEach(text => {',
  'Missing Personnel processing remains active with the live panel'
);
requireText(
  '(?::|=|-)?\\\\s*(?:x\\\\s*)?(\\\\d+)',
  'Police Officer count parser accepts colon/equal/hyphen separators'
);
requireText(
  ".replace(/^Missing\\s+Personnel\\s*:\\s*/i, '')",
  'Missing Personnel prefix normalisation'
);

const ordinaryRefresh = extractBetween(
  '    async function refreshOrdinaryPoliceRegistryFromLiveVehicles(',
  '    async function prepareTrainedPersonnelRegistryForRows(',
  'ordinary Police registry preparation'
);
if (ordinaryRefresh.includes('await fetch(')) {
  fail('Generic Police Car preparation must not live-scan assignment pages');
}

const genericCounter = extractBetween(
  '    function countSelectedMatchingVehicles(',
  '    function refreshVehicleRequirementCounters(',
  'generic selected-vehicle counter'
);
if (genericCounter.includes('{ allowUnknown: false }')) {
  fail('Generic selected type-8 IRVs must not be rejected as unknown');
}

const strictRequirements = extractBetween(
  '    function normalisePublicOrderTrainedRequirements(',
  '    function isStrictLiveVerifiedTrainingEntry(',
  'strict trained Police requirements'
);
for (const requiredToken of [
  "'police_trained_irv_vehicle'",
  "'police_inspector_vehicle'",
  "eligibleVehicleTypeIds: [\n                    '8'",
  "eligibleVehicleTypeIds: [\n                    '51',\n                    '8'"
]) {
  if (!strictRequirements.includes(requiredToken)) {
    fail(`Named trained Police vehicle contract changed: ${requiredToken}`);
  }
}


console.log('Police IRV fallback and Missing Personnel regression checks passed.');
