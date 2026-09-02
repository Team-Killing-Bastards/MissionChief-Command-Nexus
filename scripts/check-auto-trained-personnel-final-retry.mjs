#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const signatures = [`async function ${name}(`, `function ${name}(`];
  const start = Math.min(...signatures.map(signature => {
    const index = source.indexOf(signature);
    return index < 0 ? Number.POSITIVE_INFINITY : index;
  }));
  assert.ok(Number.isFinite(start), `${name} must exist`);
  const brace = source.indexOf('{', source.indexOf(')', start));
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = brace; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

const processRows = extractFunction('processRequirementRows');
const retryMarker = processRows.indexOf('TRAINED PERSONNEL FINAL RETRY');
assert.ok(retryMarker >= 0, 'trained requirements must expose one bounded final retry');
const refreshMatches = [...processRows.matchAll(/refreshPoliceInspectorRegistryFromLiveVehicles\s*\(/g)].map(match => match.index);
const selectionMatches = [...processRows.matchAll(/selectVehiclesForTrainedPersonnelRequirements\s*\(/g)].map(match => match.index);
assert.equal(refreshMatches.length, 2, 'trained processing must perform the normal refresh plus one final refresh');
assert.equal(selectionMatches.length, 2, 'trained processing must perform the normal selection plus one final selection');
assert.ok(refreshMatches[0] < selectionMatches[0], 'the first live refresh must precede the first selection');
assert.ok(selectionMatches[0] < retryMarker, 'the retry must only happen after the first selection remains short');
assert.ok(retryMarker < refreshMatches[1] && refreshMatches[1] < selectionMatches[1],
  'the final retry must refresh unverified assignments before selecting again');
assert.match(processRows, /await\s+wait\s*\(\s*250\s*\)/,
  'the retry must wait briefly for transient assignment-page failures to settle');
assert.match(processRows, /!result\.trainingSatisfied\s*\|\|\s*!result\.vehicleCoverageSatisfied/s,
  'both verified training and compatible vehicle capacity must be complete');

const normalise = extractFunction('normalisePublicOrderTrainedRequirements');
assert.match(normalise, /requirementType:\s*'armed_response_atc_vehicle'/s,
  'Armed Response must retain its dedicated Armed Traffic Car requirement');
assert.match(normalise, /eligibleVehicleTypeIds:\s*\[\s*'25'\s*\]/s,
  'Armed Response must remain restricted to exact type-25 Armed Traffic Cars');
assert.match(normalise, /requiredTrainingCodes:\s*\[\s*'traffic_police',\s*'swat'\s*\]/s,
  'Armed Traffic Car occupants must remain dual Roads Policing and Firearms qualified');

console.log('PASS: trained-personnel selection gets one bounded live retry without weakening exact Armed Traffic Car qualification rules.');
