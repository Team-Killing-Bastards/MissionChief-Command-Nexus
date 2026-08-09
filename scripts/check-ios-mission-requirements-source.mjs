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
    fail(`Missing mission requirement source contract: ${label}`);
  }
}

function requirePattern(pattern, label) {
  if (!pattern.test(source)) {
    fail(`Missing mission requirement source contract: ${label}`);
  }
}

function extractFunction(name) {
  const pattern = new RegExp(
    `(?:^|\\n)[ \\t]*(?:async[ \\t]+)?function[ \\t]+${name}[ \\t]*\\([^)]*\\)[ \\t]*\\{`,
    'm'
  );
  const match = pattern.exec(source);
  if (!match) fail(`Unable to find ${name}`);

  const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
  const opening = source.indexOf('{', start);
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

  fail(`Unable to extract ${name}`);
}

requireText('// @version      1.0.93', 'current v1.0.84 metadata');
requireText(' * MODULE 2: MISSION FINDER V10.6.144', 'current V10.6.144 module header');
requireText('function getMissionRequirementSource(', 'authoritative source resolver');
requireText('function normaliseMissionRequirementSourceUrl(', 'same-origin URL normaliser');
requireText('function validateMissionRequirementResponseUrl(', 'response identity validator');
requireText('function findMissionRequirementTable(', 'authoritative table detector');
requireText('function getMissionRequirementReadFailure(', 'fail-closed source state');
requireText("'missing-source'", 'missing-source blocker');
requireText("'invalid-response'", 'invalid-response blocker');
requireText("credentials: 'include'", 'same-origin authenticated fetch');
requireText("redirect: 'follow'", 'explicit redirect handling');
requireText('missionRequirementTableFound', 'parser table metadata');
requireText('getMissionRequirementReadFailure(', 'Unit Finder failure handoff');
requirePattern(
  /function handleCombinedLogic\([\s\S]{0,10000}getMissionRequirementReadFailure\([\s\S]{0,10000}VISIBLE FALLBACK/,
  'authoritative failure blocks before visible fallback'
);

const activeHelp = extractFunction('getActiveMissionHelpLink');
if (/isMissionElementVisible/.test(activeHelp)) {
  fail('Hidden #mission_help must not be rejected by visibility');
}

const localMissionKey = extractFunction('getLocalMissionInstanceKey');
if (/querySelectorAll\('#mission_help'\)[\s\S]{0,300}filter\([^)]*isMissionElementVisible/.test(localMissionKey)) {
  fail('Mission key must not discard hidden #mission_help');
}

const normaliseSource = Function(
  'window',
  `"use strict"; ${extractFunction('normaliseMissionRequirementSourceUrl')}; return normaliseMissionRequirementSourceUrl;`
)(
  {
    location: {
      href: 'https://www.missionchief.co.uk/missions/256255875',
      origin: 'https://www.missionchief.co.uk'
    }
  }
);

const validateResponse = Function(
  'window',
  `"use strict"; ${extractFunction('validateMissionRequirementResponseUrl')}; return validateMissionRequirementResponseUrl;`
)(
  {
    location: {
      href: 'https://www.missionchief.co.uk/missions/256255875',
      origin: 'https://www.missionchief.co.uk'
    }
  }
);

const suppliedLink = normaliseSource(
  '/einsaetze/636?mission_id=256255875',
  '256255875',
  'https://www.missionchief.co.uk/missions/256255875'
);
if (!suppliedLink) fail('Supplied hidden mission-help link was rejected');
if (suppliedLink.missionTypeId !== '636') fail('Mission type 636 was not retained');
if (suppliedLink.missionId !== '256255875') fail('Mission instance ID was not retained');

const injectedId = normaliseSource(
  '/einsaetze/636',
  '256255875',
  'https://www.missionchief.co.uk/missions/256255875'
);
if (!injectedId || !injectedId.url.includes('mission_id=256255875')) {
  fail('Missing mission_id fallback was not constructed');
}

if (normaliseSource(
  '/einsaetze/636?mission_id=999',
  '256255875',
  'https://www.missionchief.co.uk/missions/256255875'
) !== null) {
  fail('Mismatched mission instance must be rejected');
}

if (normaliseSource(
  'https://example.com/einsaetze/636?mission_id=256255875',
  '256255875',
  'https://www.missionchief.co.uk/missions/256255875'
) !== null) {
  fail('Cross-origin requirement source must be rejected');
}

if (!validateResponse(
  suppliedLink,
  'https://www.missionchief.co.uk/einsaetze/636?mission_id=256255875'
)) {
  fail('Matching requirement response URL was rejected');
}
if (validateResponse(
  suppliedLink,
  'https://www.missionchief.co.uk/einsaetze/637?mission_id=256255875'
)) {
  fail('Mismatched mission type response was accepted');
}
if (validateResponse(
  suppliedLink,
  'https://www.missionchief.co.uk/einsaetze/636?mission_id=999'
)) {
  fail('Mismatched mission instance response was accepted');
}

const findTable = Function(
  `"use strict"; ${extractFunction('findMissionRequirementTable')}; return findMissionRequirementTable;`
)();

function cell(textContent) {
  return { textContent };
}
function row(values) {
  return {
    querySelectorAll(selector) {
      return selector === 'td' ? values.map(cell) : [];
    }
  };
}
function table({ headings = [], rows = [] }) {
  return {
    querySelectorAll(selector) {
      if (selector === 'thead th, thead td, th') return headings.map(cell);
      if (selector === 'tbody tr, tr') return rows;
      return [];
    }
  };
}

const irrelevant = table({
  headings: ['Other data'],
  rows: [row(['Average credits', '1000'])]
});
const authoritative = table({
  headings: ['Vehicle and Personnel Requirements'],
  rows: [row(['Required Rescue Pump', '2'])]
});
if (findTable(null, [irrelevant, authoritative]) !== null) {
  fail('Null document must remain rejected');
}
const fakeDocument = {
  querySelectorAll() {
    return [irrelevant, authoritative];
  }
};
if (findTable(fakeDocument) !== authoritative) {
  fail('Authoritative Vehicle and Personnel Requirements table was not selected');
}

console.log('iOS mission requirement source checks passed.');
