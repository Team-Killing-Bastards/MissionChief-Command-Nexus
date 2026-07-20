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
const GITHUB_SOURCE_ATTEMPTS = 60;
const GITHUB_SOURCE_WAIT_MS = 5_000;
const GREASY_FORK_ATTEMPTS = 60;
const GREASY_FORK_WAIT_MS = 5_000;

const COLOURS = Object.freeze({
  command: 0x22d3ee,
  mission: 0x8b5cf6,
  verified: 0x22c55e,
});

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
  const lines = section
    .split('\n')
    .map((line) => line.trimEnd());

  const subheadings = lines.filter((line) => /^###\s+/.test(line));
  const omitSingleGenericHeading =
    subheadings.length === 1 &&
    /^###\s+(Changed|Added|Fixed|Removed|Security)\s*$/i.test(
      subheadings[0]
    );

  const formattedLines = lines
    .filter(
      (line, index, allLines) =>
        line.trim() ||
        (index > 0 && allLines[index - 1].trim())
    )
    .map((line) => {
      const subheading = line.match(/^###\s+(.+)$/);

      if (!subheading) {
        return line;
      }

      return omitSingleGenericHeading
        ? ''
        : `**${subheading[1]}**`;
    })
    .filter(Boolean);

  let result = '';

  for (const line of formattedLines) {
    const candidate = result
      ? `${result}\n${line}`
      : line;

    if (candidate.length > MAX_MISSION_BRIEF_LENGTH) {
      const suffix =
        '\n\n…Read the complete patch log from the release link below.';

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

function formatSeconds(milliseconds) {
  const seconds = Math.max(0, milliseconds / 1000);

  if (seconds < 1) {
    return '<1 second';
  }

  if (seconds < 10) {
    return `${seconds.toFixed(1)} seconds`;
  }

  return `${Math.round(seconds)} seconds`;
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
        'MissionChief-Command-Nexus-Release-Validator/2.0',
    },
  });

  if (!response.ok) {
    throw new Error(
      `${label} returned HTTP ${response.status}`
    );
  }

  return response.text();
}

async function verifyGitHubSource({
  repository,
  releaseSha,
  sourcePath,
  expectedVersion,
  expectedNormalisedSource,
}) {
  const startedAt = Date.now();
  const encodedSourcePath = sourcePath
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  const githubRawUrl =
    `https://raw.githubusercontent.com/` +
    `${repository}/${releaseSha}/${encodedSourcePath}`;
  let lastStatus = 'No response received';

  for (
    let attempt = 1;
    attempt <= GITHUB_SOURCE_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const githubSource = await fetchText(
        githubRawUrl,
        'GitHub raw source'
      );
      const githubVersion = extractUserscriptVersion(
        githubSource,
        'GitHub raw source'
      );

      if (githubVersion !== expectedVersion) {
        throw new Error(
          `GitHub raw source serves version ` +
          `${githubVersion}, expected ${expectedVersion}`
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

      const elapsedMs = Date.now() - startedAt;
      console.log(
        `GitHub source verified on attempt ${attempt}: ` +
        `${releaseSha} after ${formatSeconds(elapsedMs)}`
      );

      return {
        attempt,
        elapsedMs,
      };
    } catch (error) {
      lastStatus =
        error instanceof Error
          ? error.message
          : String(error);

      if (
        lastStatus.includes('serves version') ||
        lastStatus.includes('does not match')
      ) {
        throw error;
      }
    }

    console.log(
      `GitHub source not ready ` +
      `(${attempt}/${GITHUB_SOURCE_ATTEMPTS}): ` +
      lastStatus
    );

    if (attempt < GITHUB_SOURCE_ATTEMPTS) {
      await sleep(GITHUB_SOURCE_WAIT_MS);
    }
  }

  throw new Error(
    `GitHub source verification timed out: ${lastStatus}`
  );
}

async function verifyGreasyFork({
  installUrl,
  expectedVersion,
  expectedNormalisedSource,
}) {
  const startedAt = Date.now();
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
        const elapsedMs = Date.now() - startedAt;

        console.log(
          `Greasy Fork verified on attempt ${attempt}: ` +
          `version ${expectedVersion} after ` +
          `${formatSeconds(elapsedMs)}`
        );

        return {
          attempt,
          elapsedMs,
        };
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

function buildDiscordPayload({
  version,
  releaseTag,
  releaseSha,
  releaseUrl,
  greasyForkInstallUrl,
  greasyForkPageUrl,
  missionBrief,
  recordedChecksum,
  greasyForkElapsedMs,
}) {
  const shortCommit = releaseSha.slice(0, 12);
  const detectionTime = formatSeconds(greasyForkElapsedMs);

  return {
    username: 'Command Nexus Release Control',

    allowed_mentions: {
      parse: [],
    },

    embeds: [
      {
        color: COLOURS.command,
        title: `🚨 ${PRODUCT_NAME} ${releaseTag} is live`,
        url: releaseUrl,
        description:
          'The latest production build has cleared every release gate ' +
          'and is now available through **Greasy Fork** and **GitHub**.',
        fields: [
          {
            name: 'Release',
            value: `\`${version}\``,
            inline: true,
          },
          {
            name: 'Channel',
            value: '**Production**',
            inline: true,
          },
          {
            name: 'Status',
            value: '🟢 **LIVE**',
            inline: true,
          },
        ],
      },
      {
        color: COLOURS.mission,
        title: '🧭 Mission Brief',
        description: missionBrief,
      },
      {
        color: COLOURS.verified,
        title: '✅ Deployment verified',
        description:
          `Greasy Fork recognised the verified build in **${detectionTime}**. ` +
          'The notification was dispatched immediately after exact source parity was confirmed.',
        fields: [
          {
            name: 'GitHub',
            value:
              '✅ Release published\n' +
              '✅ Tag and source verified',
            inline: true,
          },
          {
            name: 'Greasy Fork',
            value:
              `✅ Version \`${version}\` live\n` +
              '✅ Served code matched',
            inline: true,
          },
          {
            name: 'Integrity',
            value:
              '✅ Asset parity confirmed\n' +
              '✅ SHA-256 validated',
            inline: true,
          },
          {
            name: 'Get the release',
            value:
              `[Install / Update](${greasyForkInstallUrl})  •  ` +
              `[Release Notes](${releaseUrl})  •  ` +
              `[Greasy Fork Page](${greasyForkPageUrl})`,
            inline: false,
          },
          {
            name: 'Build signature',
            value: `\`${recordedChecksum}\``,
            inline: false,
          },
        ],
        footer: {
          text:
            `Commit ${shortCommit} • ` +
            'Verified before notification',
        },
        timestamp: new Date().toISOString(),
      },
    ],
  };
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

  const changelog =
    await readFile(CHANGELOG_PATH, 'utf8');

  const missionBrief = formatMissionBrief(
    extractReleaseSection(changelog, version)
  );

  const releaseUrl =
    `https://github.com/${repository}` +
    `/releases/tag/${encodeURIComponent(releaseTag)}`;

  const [, greasyForkVerification] =
    await Promise.all([
      verifyGitHubSource({
        repository,
        releaseSha,
        sourcePath: SOURCE_PATH,
        expectedVersion: version,
        expectedNormalisedSource,
      }),
      verifyGreasyFork({
        installUrl: greasyForkInstallUrl,
        expectedVersion: version,
        expectedNormalisedSource,
      }),
    ]);

  const payload = buildDiscordPayload({
    version,
    releaseTag,
    releaseSha,
    releaseUrl,
    greasyForkInstallUrl,
    greasyForkPageUrl,
    missionBrief,
    recordedChecksum,
    greasyForkElapsedMs:
      greasyForkVerification.elapsedMs,
  });

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
