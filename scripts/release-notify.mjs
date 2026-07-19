#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const SOURCE_PATH =
  process.env.SOURCE_PATH ||
  'src/missionchief-command-nexus.user.js';

const CHANGELOG_PATH =
  process.env.CHANGELOG_PATH ||
  'CHANGELOG.md';

const PRODUCT_NAME =
  process.env.PRODUCT_NAME ||
  'MissionChief Command Nexus';

const MAX_MISSION_BRIEF_LENGTH = 1400;
const GREASY_FORK_ATTEMPTS = 20;
const GREASY_FORK_WAIT_MS = 15_000;

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function normaliseUserscript(text) {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(
      /^\s*\/\/\s*@(downloadURL|updateURL|installURL)\s+.*\n?/gim,
      ''
    )
    .replace(/[ \t]+$/gm, '')
    .trimEnd()
    .concat('\n');
}

function extractUserscriptVersion(text, sourceName) {
  const match = text.match(
    /^\s*\/\/\s*@version\s+([^\s]+)\s*$/m
  );

  if (!match) {
    throw new Error(`Could not find @version in ${sourceName}`);
  }

  return match[1];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractReleaseSection(changelog, version) {
  const headingPattern = new RegExp(
    `^## \\[${escapeRegExp(version)}\\](?:\\s+-.*)?\\s*$`,
    'm'
  );

  const headingMatch = headingPattern.exec(changelog);

  if (!headingMatch) {
    throw new Error(
      `CHANGELOG.md has no release section for ${version}`
    );
  }

  const sectionStart = headingMatch.index + headingMatch[0].length;
  const remaining = changelog.slice(sectionStart);
  const nextHeading = remaining.search(/^##\s+/m);

  const section = (
    nextHeading === -1
      ? remaining
      : remaining.slice(0, nextHeading)
  ).trim();

  if (!section) {
    throw new Error(
      `CHANGELOG.md release section for ${version} is empty`
    );
  }

  return section;
}

function formatMissionBrief(section) {
  const formattedLines = section
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(
      (line, index, lines) =>
        line.trim() ||
        (index > 0 && lines[index - 1].trim())
    )
    .map((line) => {
      const subheading = line.match(/^###\s+(.+)$/);

      return subheading
        ? `**${subheading[1]}**`
        : line;
    });

  let result = '';

  for (const line of formattedLines) {
    const candidate = result
      ? `${result}\n${line}`
      : line;

    if (candidate.length > MAX_MISSION_BRIEF_LENGTH) {
      const suffix =
        '\n\n…Full details are available in the release patch log.';

      return `${result
        .slice(
          0,
          MAX_MISSION_BRIEF_LENGTH - suffix.length
        )
        .trimEnd()}${suffix}`;
    }

    result = candidate;
  }

  return result;
}

async function fetchText(url, label) {
  const requestUrl = new URL(url);

  requestUrl.searchParams.set(
    'release_check',
    Date.now().toString()
  );

  const response = await fetch(requestUrl, {
    redirect: 'follow',
    headers: {
      Accept:
        'text/plain, application/javascript, */*',
      'User-Agent':
        'MissionChief-Command-Nexus-Release-Validator/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(
      `${label} returned HTTP ${response.status}`
    );
  }

  return response.text();
}

async function verifyGreasyFork({
  installUrl,
  expectedVersion,
  expectedNormalisedSource,
}) {
  let lastStatus = 'No response received';

  for (
    let attempt = 1;
    attempt <= GREASY_FORK_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const greasyForkSource = await fetchText(
        installUrl,
        'Greasy Fork install URL'
      );

      const greasyForkVersion =
        extractUserscriptVersion(
          greasyForkSource,
          'Greasy Fork userscript'
        );

      if (greasyForkVersion !== expectedVersion) {
        lastStatus =
          `served version ${greasyForkVersion}; ` +
          `waiting for ${expectedVersion}`;
      } else if (
        normaliseUserscript(greasyForkSource) !==
        expectedNormalisedSource
      ) {
        throw new Error(
          `Greasy Fork serves version ${expectedVersion}, ` +
          'but its code does not match the tagged GitHub source'
        );
      } else {
        console.log(
          `Greasy Fork verified on attempt ${attempt}: ` +
          `version ${expectedVersion}`
        );

        return;
      }
    } catch (error) {
      lastStatus =
        error instanceof Error
          ? error.message
          : String(error);

      if (lastStatus.includes('code does not match')) {
        throw error;
      }
    }

    console.log(
      `Greasy Fork not ready ` +
      `(${attempt}/${GREASY_FORK_ATTEMPTS}): ` +
      lastStatus
    );

    if (attempt < GREASY_FORK_ATTEMPTS) {
      await sleep(GREASY_FORK_WAIT_MS);
    }
  }

  throw new Error(
    `Greasy Fork verification timed out: ${lastStatus}`
  );
}

async function postDiscord(webhookUrl, payload) {
  const target = new URL(webhookUrl);

  target.searchParams.set('wait', 'true');

  const response = await fetch(target, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseBody = await response.text();

    throw new Error(
      `Discord webhook failed with HTTP ` +
      `${response.status}: ` +
      responseBody.slice(0, 500)
    );
  }
}

async function main() {
  const discordWebhookUrl =
    requireEnv('DISCORD_WEBHOOK_URL');

  const greasyForkInstallUrl =
    requireEnv('GREASYFORK_INSTALL_URL');

  const greasyForkPageUrl =
    requireEnv('GREASYFORK_PAGE_URL');

  const repository =
    requireEnv('GITHUB_REPOSITORY');

  const releaseTag =
    requireEnv('RELEASE_TAG');

  const releaseSha =
    requireEnv('RELEASE_SHA');

  const version = releaseTag.replace(/^v/, '');

  if (!version || releaseTag !== `v${version}`) {
    throw new Error(
      `Release tag must start with v: ${releaseTag}`
    );
  }

  const sourceBuffer = await readFile(SOURCE_PATH);
  const sourceText = sourceBuffer.toString('utf8');

  const sourceVersion =
    extractUserscriptVersion(
      sourceText,
      SOURCE_PATH
    );

  if (sourceVersion !== version) {
    throw new Error(
      `Tagged version ${version} does not match ` +
      `userscript @version ${sourceVersion}`
    );
  }

  const assetName =
    `MissionChief-Command-Nexus-${version}.user.js`;

  const checksumName =
    `${assetName}.sha256`;

  const assetBuffer =
    await readFile(assetName);

  const checksumText =
    await readFile(checksumName, 'utf8');

  const recordedChecksum =
    checksumText
      .match(/^[a-f0-9]{64}/i)?.[0]
      ?.toLowerCase();

  const calculatedChecksum =
    sha256(assetBuffer);

  if (
    !recordedChecksum ||
    recordedChecksum !== calculatedChecksum
  ) {
    throw new Error(
      'Generated SHA-256 checksum does not match ' +
      'the packaged userscript asset'
    );
  }

  if (!assetBuffer.equals(sourceBuffer)) {
    throw new Error(
      'Packaged userscript asset does not exactly ' +
      'match the tagged source file'
    );
  }

  const expectedNormalisedSource =
    normaliseUserscript(sourceText);

  const encodedSourcePath =
    SOURCE_PATH
      .split('/')
      .map(encodeURIComponent)
      .join('/');

  const githubRawUrl =
    `https://raw.githubusercontent.com/` +
    `${repository}/${releaseSha}/${encodedSourcePath}`;

  const githubSource =
    await fetchText(
      githubRawUrl,
      'GitHub raw source'
    );

  const githubVersion =
    extractUserscriptVersion(
      githubSource,
      'GitHub raw source'
    );

  if (githubVersion !== version) {
    throw new Error(
      `GitHub raw source serves version ` +
      `${githubVersion}, expected ${version}`
    );
  }

  if (
    normaliseUserscript(githubSource) !==
    expectedNormalisedSource
  ) {
    throw new Error(
      'GitHub raw source does not match ' +
      'the tagged local source'
    );
  }

  console.log(
    `GitHub source verified: ${releaseSha}`
  );

  await verifyGreasyFork({
    installUrl: greasyForkInstallUrl,
    expectedVersion: version,
    expectedNormalisedSource,
  });

  const changelog =
    await readFile(CHANGELOG_PATH, 'utf8');

  const missionBrief = formatMissionBrief(
    extractReleaseSection(changelog, version)
  );

  const releaseUrl =
    `https://github.com/${repository}` +
    `/releases/tag/${encodeURIComponent(releaseTag)}`;

  const payload = {
    username: 'Command Nexus Release Control',

    allowed_mentions: {
      parse: [],
    },

    embeds: [
      {
        title:
          `${PRODUCT_NAME} ${releaseTag} deployed`,

        url: releaseUrl,

        description:
          `**Mission Brief — What Changed**\n` +
          missionBrief,

        color: 0x2ecc71,

        fields: [
          {
            name: 'Deployment Version',
            value: `\`${version}\``,
            inline: true,
          },
          {
            name: 'GitHub Updated',
            value:
              '✅ Release published\n' +
              '✅ Tagged source verified',
            inline: true,
          },
          {
            name: 'Greasy Fork Updated',
            value:
              `✅ Version \`${version}\` verified\n` +
              '✅ Served code matched',
            inline: true,
          },
          {
            name: 'Validation',
            value:
              '✅ Repository checks\n' +
              '✅ Userscript metadata and version\n' +
              '✅ Release asset parity\n' +
              '✅ GitHub and Greasy Fork source parity',
            inline: false,
          },
          {
            name:
              'Build Signature (SHA-256 checksum)',
            value: `\`${recordedChecksum}\``,
            inline: false,
          },
          {
            name: 'Install and Release Links',
            value:
              `[Quick Install / Update]` +
              `(${greasyForkInstallUrl})\n` +
              `[Full Release Patch Log]` +
              `(${releaseUrl})\n` +
              `[General Greasy Fork Page]` +
              `(${greasyForkPageUrl})`,
            inline: false,
          },
        ],

        footer: {
          text:
            `Commit ${releaseSha.slice(0, 12)} • ` +
            'Deployment verified before notification',
        },

        timestamp: new Date().toISOString(),
      },
    ],
  };

  await postDiscord(
    discordWebhookUrl,
    payload
  );

  console.log(
    `Discord release notification posted ` +
    `for ${releaseTag}`
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : error
  );

  process.exit(1);
});
