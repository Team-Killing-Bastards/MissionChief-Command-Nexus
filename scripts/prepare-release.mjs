#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const VERSION_PATTERN =
  /^[0-9]+\.[0-9]+\.[0-9]+(?:[.-][0-9A-Za-z.-]+)?$/;

function parseArguments(argv) {
  const values = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (!argument.startsWith('--')) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const value = argv[index + 1];

    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${argument}`);
    }

    values.set(argument.slice(2), value);
    index += 1;
  }

  return values;
}

function requireArgument(argumentsMap, name) {
  const value = argumentsMap.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required argument: --${name}`);
  }

  return value;
}

function replaceExactlyOnce(text, pattern, replacement, label) {
  let replacements = 0;

  const updated = text.replace(pattern, (...args) => {
    replacements += 1;

    return typeof replacement === 'function'
      ? replacement(...args)
      : replacement;
  });

  if (replacements !== 1) {
    throw new Error(
      `${label} expected exactly one match; found ${replacements}`
    );
  }

  return updated;
}

function replaceIfPresentExactlyOnce(
  text,
  pattern,
  replacement,
  label
) {
  if (!pattern.test(text)) {
    return text;
  }

  return replaceExactlyOnce(
    text,
    pattern,
    replacement,
    label
  );
}

function extractCurrentVersion(source) {
  const match = source.match(
    /^\/\/\s*@version\s+(\S+)\s*$/m
  );

  if (!match) {
    throw new Error(
      'Could not find @version in the canonical userscript'
    );
  }

  return match[1];
}

function normaliseNotes(rawNotes) {
  const bullets = rawNotes
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*]\s*/, '')
        .trim()
    )
    .filter(Boolean)
    .map((line) => `- ${line}`);

  return bullets.length
    ? bullets
    : ['- Release preparation and verified deployment updates.'];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  const argumentsMap = parseArguments(process.argv.slice(2));
  const version = requireArgument(argumentsMap, 'version');
  const notes = argumentsMap.get('notes')?.trim() || '';

  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid release version: ${version}`);
  }

  const sourcePath =
    'src/missionchief-command-nexus.user.js';
  const readmePath = 'README.md';
  const sourceReadmePath = 'src/README.md';
  const changelogPath = 'CHANGELOG.md';

  const [
    source,
    readme,
    sourceReadme,
    changelog,
  ] = await Promise.all([
    readFile(sourcePath, 'utf8'),
    readFile(readmePath, 'utf8'),
    readFile(sourceReadmePath, 'utf8'),
    readFile(changelogPath, 'utf8'),
  ]);

  const currentVersion = extractCurrentVersion(source);

  if (currentVersion === version) {
    console.log(
      `Command Nexus is already prepared as ${version}.`
    );

    return;
  }

  const updatedSource = replaceExactlyOnce(
    source,
    /^(\/\/\s*@version\s+)\S+(\s*)$/m,
    (_match, prefix, suffix) =>
      `${prefix}${version}${suffix}`,
    'Canonical userscript version'
  );

  let updatedReadme = replaceExactlyOnce(
    readme,
    /(\*\*Current version:\*\*\s*`)[^`]+(`)/,
    (_match, prefix, suffix) =>
      `${prefix}${version}${suffix}`,
    'README current version'
  );

  const behaviourAnchor =
    `current-v${version.replace(/[^0-9A-Za-z-]/g, '')}-behaviour`;

  updatedReadme = replaceIfPresentExactlyOnce(
    updatedReadme,
    /\[\*\*v[^*]+\*\*\]\(#current-v[^)]+-behaviour\)/,
    `[**v${version}**](#${behaviourAnchor})`,
    'README current-behaviour navigation link'
  );

  updatedReadme = replaceIfPresentExactlyOnce(
    updatedReadme,
    /^## Current v\S+ behaviour$/m,
    `## Current v${version} behaviour`,
    'README current-behaviour heading'
  );

  const updatedSourceReadme = replaceExactlyOnce(
    sourceReadme,
    /(\|\s*Command Nexus version\s*\|\s*`)[^`]+(`\s*\|)/,
    (_match, prefix, suffix) =>
      `${prefix}${version}${suffix}`,
    'Source README version'
  );

  const releaseHeading = new RegExp(
    `^## \\[${escapeRegExp(version)}\\](?:\\s+-.*)?\\s*$`,
    'm'
  );

  let updatedChangelog = changelog;

  if (!releaseHeading.test(changelog)) {
    const currentHeading = new RegExp(
      `^## \\[${escapeRegExp(currentVersion)}\\]` +
      '(?:\\s+-.*)?\\s*$',
      'm'
    );

    const currentMatch = currentHeading.exec(changelog);

    if (!currentMatch) {
      throw new Error(
        `Could not find changelog section for current version ` +
        currentVersion
      );
    }

    const date = new Date().toISOString().slice(0, 10);
    const bulletLines = normaliseNotes(notes);

    const section =
      `## [${version}] - ${date}\n\n` +
      '### Changed\n\n' +
      `${bulletLines.join('\n')}\n` +
      `- Increased the unified userscript version from ` +
      `\`${currentVersion}\` to \`${version}\`.\n\n`;

    updatedChangelog =
      changelog.slice(0, currentMatch.index) +
      section +
      changelog.slice(currentMatch.index);
  }

  await Promise.all([
    writeFile(sourcePath, updatedSource, 'utf8'),
    writeFile(readmePath, updatedReadme, 'utf8'),
    writeFile(
      sourceReadmePath,
      updatedSourceReadme,
      'utf8'
    ),
    writeFile(changelogPath, updatedChangelog, 'utf8'),
  ]);

  console.log(
    `Prepared Command Nexus ${currentVersion} -> ${version}.`
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
});
