#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SELF = path.basename(fileURLToPath(import.meta.url));
const forbidden = [
  {
    label: 'userscript metadata version assertion',
    pattern: /@version[^\n]{0,80}\d+\\?\.\d+\\?\.\d+/,
  },
  {
    label: 'Mission Finder module version assertion',
    pattern: /MISSION FINDER V\d+\\?\.\d+\\?\.\d+/,
  },
  {
    label: 'Resource Administration component version assertion',
    pattern: /const (?:UNIT|STATION|PERSONNEL)_VERSION[^\n]{0,80}\d+\\?\.\d+\\?\.\d+/,
  },
];

const checkFiles = (await readdir(SCRIPT_DIR))
  .filter((name) => name.startsWith('check-') && name.endsWith('.mjs') && name !== SELF)
  .sort();

const violations = [];
for (const name of checkFiles) {
  const source = await readFile(path.join(SCRIPT_DIR, name), 'utf8');
  for (const { label, pattern } of forbidden) {
    const match = source.match(pattern);
    if (!match) continue;
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    violations.push(`${name}:${line}: ${label}`);
  }
}

if (violations.length) {
  console.error(
    'Behavioral regression checks must not pin release or component versions. ' +
    'Keep canonical version validation in validate-userscript.mjs.\n' +
    violations.map((violation) => `- ${violation}`).join('\n')
  );
  process.exit(1);
}

console.log(`Version-agnostic regression contract passed across ${checkFiles.length} checks.`);
