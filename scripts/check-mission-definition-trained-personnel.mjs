#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(token, label) {
  if (!source.includes(token)) fail(`Missing mission-definition personnel contract: ${label}`);
}

function extractFunction(name) {
  const signature = `    function ${name}(`;
  const start = source.indexOf(signature);
  if (start < 0) fail(`Unable to find ${name}`);

  const bodyStart = source.indexOf('{', start);
  if (bodyStart < 0) fail(`Unable to find ${name} body`);

  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character === quote) quote = '';
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }

    if (character === '/' && next === '/') {
      const lineEnd = source.indexOf('\n', index + 2);
      index = lineEnd < 0 ? source.length : lineEnd;
      continue;
    }

    if (character === '/' && next === '*') {
      const blockEnd = source.indexOf('*/', index + 2);
      if (blockEnd < 0) fail(`Unclosed comment in ${name}`);
      index = blockEnd + 1;
      continue;
    }

    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  fail(`Unable to extract ${name}`);
}

requireText('// @version      1.0.56', 'v1.0.55 metadata');
requireText(' * MODULE 2: MISSION FINDER V10.6.119', 'Mission Finder V10.6.119 header');
requireText('function getTrainedPersonnelRequirementsFromFreeText(', 'free-text trained-personnel parser');
requireText('function getMissionDefinitionTrainedPersonnelRequirements(', 'mission-definition row classifier');
requireText('const trailingText =', 'adjacent quantity boundary');
requireText("source:\n                            'mission-definition-required-personnel'", 'mission-definition source marker');
requireText('missionDefinitionRequiredPersonnel:', 'mission-definition trained row marker');
requireText('getTrainedPersonnelVehicleTarget(\n                                missionDefinitionPersonnelRequirements', 'shared trained optimiser target');

const patternStart = source.indexOf('    const MF_TRAINED_PERSONNEL_PATTERNS =');
const patternEnd = source.indexOf('\n\n    let mfKeepPanelPosition', patternStart);
if (patternStart < 0 || patternEnd < 0) fail('Unable to extract trained-personnel patterns');
const patternBlock = source.slice(patternStart, patternEnd);

const runtime = Function(
  `"use strict";\n` +
  patternBlock + '\n' +
  `function normalisePublicOrderTrainedRequirements(requirements) { return requirements; }\n` +
  extractFunction('cleanRequirementName') + '\n' +
  extractFunction('getTrainedPersonnelRequirementsFromFreeText') + '\n' +
  extractFunction('getMissionDefinitionTrainedPersonnelRequirements') + '\n' +
  `return {getMissionDefinitionTrainedPersonnelRequirements};`
)();

const cellText = [
  '22x Level 2 Public Order Officer',
  '4x Police Medic',
  '5x Police Sergeant',
  '2x Police Inspector',
].join('\n');

const parsed = runtime.getMissionDefinitionTrainedPersonnelRequirements(
  'Required Personnel',
  cellText
);
const byCode = new Map(parsed.map((item) => [item.code, item.required]));
const expected = new Map([
  ['level_2_public_order', 22],
  ['police_medic', 4],
  ['police_sergeant', 5],
  ['police_inspector', 2],
]);

if (parsed.length !== expected.size) {
  fail(`Expected ${expected.size} trained requirements, found ${parsed.length}`);
}
for (const [code, amount] of expected) {
  if (byCode.get(code) !== amount) {
    fail(`Expected ${code}=${amount}, found ${byCode.get(code)}`);
  }
}

const multiplicationSign = runtime.getMissionDefinitionTrainedPersonnelRequirements(
  'Personnel Requirements',
  '22× Level 2 Public Order Officers'
);
if (multiplicationSign[0]?.code !== 'level_2_public_order' || multiplicationSign[0]?.required !== 22) {
  fail('Multiplication-sign personnel quantities must be normalised');
}

const duplicateMedic = runtime.getMissionDefinitionTrainedPersonnelRequirements(
  'Required Personnel',
  '2x Police Medic 4x Police Medics'
);
if (duplicateMedic[0]?.required !== 4) {
  fail('Duplicate course text must retain the maximum authoritative total');
}

const wrongRow = runtime.getMissionDefinitionTrainedPersonnelRequirements(
  'Required Vehicles',
  cellText
);
if (wrongRow.length !== 0) {
  fail('Non-personnel mission rows must not enter the trained-personnel parser');
}

const extractor = extractFunction('extractLiveMissionRequirementRows');
for (const token of [
  'getMissionDefinitionTrainedPersonnelRequirements(',
  'isTrainedPersonnelRequirement:',
  'personnelTrainingRequirements:',
  'missionDefinitionRequiredPersonnel:',
  "'mission-definition-required-personnel'",
]) {
  if (!extractor.includes(token)) fail(`Mission requirement extractor missing ${token}`);
}

console.log('Mission-definition trained-personnel checks passed.');
