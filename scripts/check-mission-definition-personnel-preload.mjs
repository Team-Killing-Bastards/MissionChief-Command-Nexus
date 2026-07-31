#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(token, label) {
  if (!source.includes(token)) fail(`Missing Required Personnel preload contract: ${label}`);
}

function extractFunction(name, asyncFunction = false) {
  const signature = asyncFunction
    ? `    async function ${name}(`
    : `    function ${name}(`;
  const start = source.indexOf(signature);
  if (start < 0) fail(`Unable to find ${name}`);
  const signatureEnd = source.indexOf(') {', start);
  if (signatureEnd < 0) fail(`Unable to find ${name} body`);
  const bodyStart = signatureEnd + 2;
  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';

    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
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

requireText('// @version      1.0.65', 'Command Nexus version');
requireText(' * MODULE 2: MISSION FINDER V10.6.128', 'Mission Finder version');
requireText('function scheduleMissionRequiredPersonnelPreload(', 'mission-load scheduler');
requireText('function preloadMissionRequiredPersonnel(', 'authoritative preload runner');
requireText('function getPreloadedMissionTrainedPersonnelRequirements(', 'required-course panel model');
requireText('function getCachedMissionRequirementRows(', 'mission requirement cache reader');
requireText('function setCachedMissionRequirementRows(', 'mission requirement cache writer');
requireText('Mission Required Personnel', 'visible Required Personnel panel label');
requireText('still needed', 'visible trained-personnel shortfall');

const readRequirements = extractFunction('readLiveMissionRequirements', true);
for (const token of [
  'options = {}',
  'allowCached',
  'getCachedMissionRequirementRows(',
  'mfMissionRequirementPreloadPromise',
  'setCachedMissionRequirementRows(',
  'missionKeyAtFetchStart',
]) {
  if (!readRequirements.includes(token)) fail(`Requirement reader missing ${token}`);
}

const panel = extractFunction('renderSelectedTrainedPersonnelPanel');
for (const token of [
  'scheduleMissionRequiredPersonnelPreload(0)',
  'getPreloadedMissionTrainedPersonnelRequirements()',
  'getSelectedTrainedPersonnelCountForCode(',
  'Mission Required Personnel',
  'still needed',
]) {
  if (!panel.includes(token)) fail(`Trained-personnel panel missing ${token}`);
}

const fixture = `
<tr>
  <td>Required Personnel</td>
  <td>
    12x Level 2 Public Order Officer<br>
    2x Police Medic<br>
    1x Police Sergeant<br>
  </td>
</tr>`;
const label = fixture.match(/<td>\s*([^<]+?)\s*<\/td>/i)?.[1]?.trim();
const valueCell = fixture.match(/<td>\s*12x[\s\S]*?<\/td>/i)?.[0] || '';
const value = valueCell
  .replace(/<br\s*\/?\s*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .trim();

if (label !== 'Required Personnel') fail(`Fixture row label was ${label}`);
const expected = new Map([
  ['Level 2 Public Order Officer', 12],
  ['Police Medic', 2],
  ['Police Sergeant', 1],
]);
for (const [course, amount] of expected) {
  const match = value.match(new RegExp(`(?:^|\\n)\\s*(\\d+)x\\s+${course}(?:s)?\\s*(?:$|\\n)`, 'i'));
  if (Number(match?.[1]) !== amount) {
    fail(`Fixture did not preserve ${amount}x ${course}`);
  }
}

const definitionCheck = extractFunction('getMissionDefinitionTrainedPersonnelRequirements');
if (!definitionCheck.includes('/^Personnel')) {
  fail('Required Personnel classifier no longer excludes Required Personnel Available');
}

console.log('Mission Required Personnel preload checks passed.');
