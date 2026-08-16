#!/usr/bin/env node

// Canonical distribution and component-version validation entry point.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT_PATH = 'src/missionchief-command-nexus.user.js';
const MAX_GREASY_FORK_BYTES = 2 * 1024 * 1024;
const REQUIRED_KEYS = [
  'name',
  'namespace',
  'version',
  'description',
  'author',
  'license',
  'homepageURL',
  'supportURL',
  'match',
  'grant',
  'run-at',
];
const FORBIDDEN_DISTRIBUTION_KEYS = ['updateURL', 'downloadURL', 'installURL'];
const COMPONENT_VERSION_PATTERNS = new Map([
  ['Resource Administration module', /MODULE 1: UNIT, STATION & PERSONNEL TOOLS V(\d+(?:\.\d+){2})/g],
  ['Mission Finder module', /MODULE 2: MISSION FINDER V(\d+(?:\.\d+){2})/g],
  ['Unit Naming', /const UNIT_VERSION = '(\d+(?:\.\d+){2})';/g],
  ['Station Naming', /const STATION_VERSION = '(\d+(?:\.\d+){2})';/g],
  ['Personnel Assignment', /const PERSONNEL_VERSION = '(\d+(?:\.\d+){2})';/g],
]);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function parseMetadata(code) {
  const blockMatch = code.match(/\/\/ ==UserScript==\s*([\s\S]*?)\/\/ ==\/UserScript==/);
  if (!blockMatch) {
    throw new Error('Userscript metadata block was not found.');
  }

  const metadata = new Map();
  for (const line of blockMatch[1].split(/\r?\n/)) {
    const match = line.match(/^\/\/\s+@([^\s]+)\s+(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (!metadata.has(key)) metadata.set(key, []);
    metadata.get(key).push(value.trim());
  }
  return metadata;
}

function getSingle(metadata, key) {
  const values = metadata.get(key) ?? [];
  if (values.length !== 1) {
    throw new Error(`Expected exactly one @${key}; found ${values.length}.`);
  }
  return values[0];
}

function parseComponentVersions(code) {
  const versions = new Map();
  for (const [label, pattern] of COMPONENT_VERSION_PATTERNS) {
    const matches = [...code.matchAll(pattern)];
    if (matches.length !== 1) {
      throw new Error(`Expected exactly one ${label} version; found ${matches.length}.`);
    }
    parseVersion(matches[0][1]);
    versions.set(label, matches[0][1]);
  }
  return versions;
}

function parseVersion(version) {
  if (!/^\d+(?:\.\d+){2}(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`@version must use release form such as 1.0.0 or 1.0.1-beta.1; found "${version}".`);
  }
  const [core, prerelease = ''] = version.split('-', 2);
  return {
    raw: version,
    numbers: core.split('.').map(Number),
    prerelease,
  };
}

function compareVersions(leftRaw, rightRaw) {
  const left = parseVersion(leftRaw);
  const right = parseVersion(rightRaw);
  for (let i = 0; i < 3; i += 1) {
    if (left.numbers[i] !== right.numbers[i]) {
      return left.numbers[i] > right.numbers[i] ? 1 : -1;
    }
  }
  if (left.prerelease === right.prerelease) return 0;
  if (!left.prerelease) return 1;
  if (!right.prerelease) return -1;
  return left.prerelease.localeCompare(right.prerelease, 'en', { numeric: true });
}

function git(args) {
  return spawnSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function main() {
  const absolutePath = path.resolve(SCRIPT_PATH);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`${SCRIPT_PATH} does not exist.`);
  }

  const code = fs.readFileSync(absolutePath, 'utf8');
  const metadata = parseMetadata(code);
  const version = getSingle(metadata, 'version');
  const componentVersions = parseComponentVersions(code);

  if (process.argv.includes('--print-version')) {
    process.stdout.write(version);
    return;
  }
  if (process.argv.includes('--print-mission-finder-version')) {
    process.stdout.write(componentVersions.get('Mission Finder module'));
    return;
  }

  for (const key of REQUIRED_KEYS) {
    if (!metadata.has(key) || metadata.get(key).some((value) => !value)) {
      fail(`Missing or empty required metadata key @${key}.`);
    }
  }

  for (const key of FORBIDDEN_DISTRIBUTION_KEYS) {
    if (metadata.has(key)) {
      fail(`Do not include @${key}; Greasy Fork controls updates for Greasy Fork installations.`);
    }
  }

  parseVersion(version);

  const namespace = getSingle(metadata, 'namespace');
  if (namespace !== 'https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus') {
    fail(`Unexpected @namespace: ${namespace}`);
  }

  const license = getSingle(metadata, 'license');
  if (license !== 'MIT') {
    fail(`Expected @license MIT; found ${license}.`);
  }

  const matches = metadata.get('match') ?? [];
  const requiredMatches = [
    'https://www.missionchief.co.uk/*',
    'https://police.missionchief.co.uk/*',
  ];
  for (const requiredMatch of requiredMatches) {
    if (!matches.includes(requiredMatch)) {
      fail(`Missing required @match ${requiredMatch}`);
    }
  }

  const size = fs.statSync(absolutePath).size;
  if (size > MAX_GREASY_FORK_BYTES) {
    fail(`Script is ${size} bytes, above Greasy Fork's 2 MB limit.`);
  }

  const metadataBlocks = (code.match(/\/\/ ==UserScript==/g) ?? []).length;
  if (metadataBlocks !== 1) {
    fail(`Expected one userscript metadata block; found ${metadataBlocks}.`);
  }

  const baseArgIndex = process.argv.indexOf('--base-ref');
  if (baseArgIndex !== -1) {
    const baseRef = process.argv[baseArgIndex + 1];
    if (!baseRef) throw new Error('--base-ref requires a Git ref.');

    const diff = git(['diff', '--quiet', `${baseRef}...HEAD`, '--', SCRIPT_PATH]);
    if (diff.status !== 0) {
      const baseFile = git(['show', `${baseRef}:${SCRIPT_PATH}`]);
      if (baseFile.status === 0) {
        const baseVersion = getSingle(parseMetadata(baseFile.stdout), 'version');
        if (compareVersions(version, baseVersion) <= 0) {
          fail(`Script changed but @version did not increase: base=${baseVersion}, current=${version}.`);
        }
      }
    }
  }

  if (process.exitCode) return;
  console.log(
    `Userscript validation passed: version ${version}, ` +
    `Mission Finder ${componentVersions.get('Mission Finder module')}, ` +
    `${size} bytes.`
  );
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
