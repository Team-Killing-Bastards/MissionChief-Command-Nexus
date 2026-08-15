#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

for (const [token, label] of [
  ['// @version      1.0.120', 'v1.0.51 metadata'],
  [' * MODULE 2: MISSION FINDER V10.6.159', 'Mission Finder V10.6.120 header'],
  ['Keep my saved panel position', 'saved-position checkbox label'],
]) {
  if (!source.includes(token)) fail(`Missing saved-position contract: ${label}`);
}

const forbidden = 'Off = centre on every mission. On = remember where you drag it.';
if (source.includes(forbidden)) {
  fail('Saved-position explanatory helper text is still present');
}

console.log('The Keep my saved panel position checkbox remains available while its explanatory helper sentence is absent.');
