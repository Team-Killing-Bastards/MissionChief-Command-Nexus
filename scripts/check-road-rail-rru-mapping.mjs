#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

for (const [token, label] of [
  ['// @version      1.0.38', 'v1.0.38 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.102', 'Mission Finder V10.6.102 header'],
  ['"Road Rail Unit": "RRU",', 'singular Road Rail Unit alias'],
  ['"Road Rail Units": "RRU",', 'plural Road Rail Units alias'],
  ['"107": "RRU",', 'exact type-107 RRU vehicle mapping'],
]) {
  if (!source.includes(token)) fail(`Missing Road Rail RRU contract: ${label}`);
}

const pluralCount = (source.match(/"Road Rail Units"\s*:\s*"RRU"/g) || []).length;
if (pluralCount !== 1) {
  fail(`Expected one plural Road Rail Units alias; found ${pluralCount}`);
}

console.log('Road Rail Unit singular/plural aliases map to exact type-107 RRU.');
