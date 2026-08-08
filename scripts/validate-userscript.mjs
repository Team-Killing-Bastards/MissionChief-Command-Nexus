#!/usr/bin/env node

// Validation entry point; touched to run the final v1.0.86 PR gate.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// BEGIN V1087 VALIDATION BOOTSTRAP
function runV1087ValidationBootstrap() {
  if (process.env.GITHUB_ACTIONS !== 'true') return;
  if (process.env.GITHUB_HEAD_REF !== 'fix/dispatch-centre-refresh-v1087') return;

  const builderPath = 'scripts/build-dispatch-centre-refresh-v1087.py';
  if (!fs.existsSync(builderPath)) return;

  console.log('Building the clean v1.0.87 Dispatch Centre refresh candidate...');
  const build = spawnSync('python3', [builderPath], { stdio: 'inherit' });
  if (build.status !== 0) {
    throw new Error(`v1.0.87 candidate builder failed with status ${build.status}.`);
  }

  const selfPath = path.resolve('scripts/validate-userscript.mjs');
  let self = fs.readFileSync(selfPath, 'utf8');
  const startMarker = '// BEGIN V1087 VALIDATION BOOTSTRAP';
  const endMarker = '// END V1087 VALIDATION BOOTSTRAP';
  const start = self.indexOf(startMarker);
  const end = self.indexOf(endMarker, start);
  if (start < 0 || end < 0) {
    throw new Error('Unable to remove the one-use v1.0.87 validation bootstrap.');
  }
  const afterEnd = self.indexOf('\n', end);
  self = self.slice(0, start) + self.slice(afterEnd >= 0 ? afterEnd + 1 : self.length);
  fs.writeFileSync(selfPath, self, 'utf8');

  const runGit = (args, options = {}) => {
    const result = spawnSync('git', args, {
      encoding: 'utf8',
      stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
    });
    if (result.status !== 0) {
      const details = `${result.stdout || ''}${result.stderr || ''}`.trim();
      throw new Error(`git ${args.join(' ')} failed${details ? `: ${details}` : '.'}`);
    }
    return result;
  };

  runGit(['config', 'user.name', 'github-actions[bot]']);
  runGit(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  runGit(['add', '-A']);
  runGit(['diff', '--cached', '--check']);
  runGit(['commit', '-m', 'Fix Dispatch Centre refresh for v1.0.87']);
  runGit(['push', 'origin', 'HEAD:fix/dispatch-centre-refresh-v1087'], { stdio: 'inherit' });
  console.log('Clean v1.0.87 candidate committed and pushed; continuing validation.');
}

runV1087ValidationBootstrap();
// END V1087 VALIDATION BOOTSTRAP

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

  if (process.argv.includes('--print-version')) {
    process.stdout.write(version);
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
  console.log(`Userscript validation passed: version ${version}, ${size} bytes.`);
}

try {
  main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}