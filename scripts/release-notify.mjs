#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { appendFile, readFile } from 'node:fs/promises';

const SOURCE_PATH =
  process.env.SOURCE_PATH ||
  'src/missionchief-command-nexus.user.js';

const REPOSITORY_SOURCE_PATH =
  process.env.REPOSITORY_SOURCE_PATH ||
  'src/missionchief-command-nexus.user.js';

const CHANGELOG_PATH =
  process.env.CHANGELOG_PATH ||
  'CHANGELOG.md';

const PRODUCT_NAME =
  process.env.PRODUCT_NAME ||
  'MissionChief Command Nexus';

const MAX_MISSION_BRIEF_LENGTH = 1400;
const GITHUB_SOURCE_ATTEMPTS = 12;
const GITHUB_SOURCE_WAIT_MS = 2_500;
const GREASY_FORK_ATTEMPTS = 60;
const GREASY_FORK_WAIT_MS = 5_000;
const GITHUB_API_VERSION = '2022-11-28';
const DISCORD_RECEIPT_ASSET_PREFIX =
  'Command-Nexus-Discord-Receipt-';

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


function readBooleanEnv(name) {
  return /^(?:1|true|yes|on)$/i.test(
    process.env[name]?.trim() || ''
  );
}

function requireGitHubToken() {
  const token =
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim();

  if (!token) {
    throw new Error(
      'Missing required environment variable: GITHUB_TOKEN or GH_TOKEN'
    );
  }

  return token;
}

function githubHeaders(token, extra = {}) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'User-Agent':
      'MissionChief-Command-Nexus-Discord-Receipt/1.0',
    ...extra,
  };
}

async function githubJson({
  url,
  token,
  method = 'GET',
  body,
  expected = [200],
  label,
}) {
  const response = await fetch(url, {
    method,
    headers: githubHeaders(
      token,
      body
        ? { 'Content-Type': 'application/json' }
        : {}
    ),
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'follow',
  });

  if (!expected.includes(response.status)) {
    const responseBody = await response.text();
    throw new Error(
      `${label} returned HTTP ${response.status}: ` +
      responseBody.slice(0, 1_500)
    );
  }

  if (response.status === 204) return null;
  return response.json();
}

function discordReceiptAssetPrefix(releaseTag) {
  return `${DISCORD_RECEIPT_ASSET_PREFIX}${releaseTag}-`;
}

function findDiscordReceiptAsset(release, releaseTag) {
  const prefix = discordReceiptAssetPrefix(releaseTag);
  return (release?.assets || []).find((asset) =>
    String(asset?.name || '').startsWith(prefix)
  ) || null;
}

async function getGitHubReleaseByTag({
  repository,
  releaseTag,
  token,
}) {
  return githubJson({
    url:
      `https://api.github.com/repos/${repository}` +
      `/releases/tags/${encodeURIComponent(releaseTag)}`,
    token,
    label: `Read GitHub Release ${releaseTag}`,
  });
}

async function recordDiscordSkipSummary({
  releaseTag,
  receiptAsset,
}) {
  const line =
    `Discord release notification already recorded for ${releaseTag}; ` +
    `skipping duplicate post (receipt asset: ${receiptAsset.name}).`;
  console.log(line);

  const summaryPath = process.env.GITHUB_STEP_SUMMARY?.trim();
  if (!summaryPath) return;

  await appendFile(
    summaryPath,
    [
      '### Discord delivery already completed',
      `- Release: \`${releaseTag}\``,
      `- Receipt asset: \`${receiptAsset.name}\``,
      '- Action: duplicate Discord post skipped',
      '',
    ].join('\n'),
    'utf8'
  );
}

async function uploadDiscordReceiptAsset({
  repository,
  releaseTag,
  releaseSha,
  token,
  webhook,
  message,
}) {
  const release = await getGitHubReleaseByTag({
    repository,
    releaseTag,
    token,
  });
  const assetName =
    `${discordReceiptAssetPrefix(releaseTag)}` +
    `${message.messageId}.json`;
  const uploadUrl = new URL(
    String(release.upload_url || '').replace(
      /\{\?name,label\}$/,
      ''
    )
  );
  uploadUrl.searchParams.set('name', assetName);

  const receipt = Buffer.from(
    JSON.stringify(
      {
        schema: 1,
        product: PRODUCT_NAME,
        release_tag: releaseTag,
        release_sha: releaseSha,
        webhook_id: webhook.webhookId,
        guild_id: webhook.guildId || null,
        channel_id: message.channelId,
        message_id: message.messageId,
        posted_at: new Date().toISOString(),
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: githubHeaders(token, {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': String(receipt.length),
    }),
    body: receipt,
    redirect: 'follow',
  });

  if (response.status !== 201) {
    const responseBody = await response.text();
    throw new Error(
      `Upload Discord receipt asset returned HTTP ` +
      `${response.status}: ${responseBody.slice(0, 1_500)}`
    );
  }

  console.log(
    `Discord single-delivery receipt uploaded for ${releaseTag}: ` +
    `asset=${assetName}`
  );
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
  const sourceUrl = new URL(
    `https://api.github.com/repos/${repository}` +
    `/contents/${encodedSourcePath}`
  );
  sourceUrl.searchParams.set('ref', releaseSha);
  let lastStatus = 'No response received';

  for (
    let attempt = 1;
    attempt <= GITHUB_SOURCE_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const response = await fetch(sourceUrl, {
        redirect: 'follow',
        headers: {
          Accept: 'application/vnd.github.raw+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent':
            'MissionChief-Command-Nexus-Release-Validator/2.1',
        },
      });

      if (!response.ok) {
        const transient =
          response.status === 404 ||
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500;

        if (!transient) {
          throw new Error(
            `GitHub Contents API returned HTTP ${response.status}`
          );
        }

        lastStatus =
          `GitHub Contents API returned HTTP ${response.status}`;
      } else {
        const githubSource = await response.text();
        const githubVersion = extractUserscriptVersion(
          githubSource,
          'GitHub immutable source'
        );

        if (githubVersion !== expectedVersion) {
          throw new Error(
            `GitHub immutable source serves version ` +
            `${githubVersion}, expected ${expectedVersion}`
          );
        }

        if (
          normaliseUserscript(githubSource) !==
          expectedNormalisedSource
        ) {
          throw new Error(
            'GitHub immutable source does not match ' +
            'the tagged local source'
          );
        }

        const elapsedMs = Date.now() - startedAt;
        console.log(
          `GitHub immutable source verified on attempt ${attempt}: ` +
          `${releaseSha} after ${formatSeconds(elapsedMs)}`
        );

        return {
          attempt,
          elapsedMs,
        };
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      if (
        message.includes('serves version') ||
        message.includes('does not match') ||
        (message.includes('returned HTTP 4') &&
          !message.includes('HTTP 404') &&
          !message.includes('HTTP 408') &&
          !message.includes('HTTP 429'))
      ) {
        throw error;
      }

      lastStatus = message;
    }

    console.log(
      `GitHub immutable source not ready ` +
      `(${attempt}/${GITHUB_SOURCE_ATTEMPTS}): ` +
      lastStatus
    );

    if (attempt < GITHUB_SOURCE_ATTEMPTS) {
      await sleep(GITHUB_SOURCE_WAIT_MS);
    }
  }

  throw new Error(
    `GitHub immutable source verification timed out: ${lastStatus}`
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

async function inspectDiscordWebhook(webhookUrl) {
  const response = await fetch(webhookUrl, {
    redirect: 'follow',
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'MissionChief-Command-Nexus-Release-Validator/2.2',
    },
  });

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `Discord webhook inspection failed with HTTP ` +
      `${response.status}: ` +
      responseBody.slice(0, 500)
    );
  }

  let webhook;

  try {
    webhook = JSON.parse(responseBody);
  } catch (_error) {
    throw new Error(
      'Discord webhook inspection did not return valid JSON'
    );
  }

  if (!webhook?.id || !webhook?.channel_id) {
    throw new Error(
      'Discord webhook inspection did not identify a webhook and channel'
    );
  }

  return {
    webhookId: String(webhook.id),
    channelId: String(webhook.channel_id),
    guildId: webhook.guild_id
      ? String(webhook.guild_id)
      : '',
    name: String(webhook.name || 'Unnamed webhook'),
  };
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

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `Discord webhook failed with HTTP ` +
      `${response.status}: ` +
      responseBody.slice(0, 500)
    );
  }

  let message;

  try {
    message = JSON.parse(responseBody);
  } catch (_error) {
    throw new Error(
      'Discord accepted the webhook request but did not return a valid message receipt'
    );
  }

  if (!message?.id || !message?.channel_id) {
    throw new Error(
      'Discord accepted the webhook request but did not return a message ID and channel ID'
    );
  }

  return {
    messageId: String(message.id),
    channelId: String(message.channel_id),
    guildId: message.guild_id
      ? String(message.guild_id)
      : '',
  };
}

async function recordDiscordReceipt({
  releaseTag,
  webhook,
  message,
}) {
  if (webhook.channelId !== message.channelId) {
    throw new Error(
      `Discord receipt channel ${message.channelId} does not match ` +
      `webhook channel ${webhook.channelId}`
    );
  }

  const receiptLines = [
    `Discord webhook target verified: ` +
      `name="${webhook.name}" ` +
      `webhook_id=${webhook.webhookId} ` +
      `channel_id=${webhook.channelId}` +
      (webhook.guildId
        ? ` guild_id=${webhook.guildId}`
        : ''),
    `Discord release notification posted for ${releaseTag}: ` +
      `message_id=${message.messageId} ` +
      `channel_id=${message.channelId}`,
  ];

  receiptLines.forEach((line) => console.log(line));

  const summaryPath = process.env.GITHUB_STEP_SUMMARY?.trim();

  if (summaryPath) {
    await appendFile(
      summaryPath,
      [
        '### Discord delivery receipt',
        `- Release: \`${releaseTag}\``,
        `- Webhook name: ${webhook.name}`,
        `- Guild ID: \`${webhook.guildId || 'not returned'}\``,
        `- Channel ID: \`${message.channelId}\``,
        `- Message ID: \`${message.messageId}\``,
        '',
      ].join('\n'),
      'utf8'
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

  const githubToken = requireGitHubToken();
  const forceDiscordResend =
    readBooleanEnv('FORCE_DISCORD_RESEND');

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

  const existingRelease = await getGitHubReleaseByTag({
    repository,
    releaseTag,
    token: githubToken,
  });
  const existingReceipt =
    findDiscordReceiptAsset(
      existingRelease,
      releaseTag
    );

  if (existingReceipt && !forceDiscordResend) {
    await recordDiscordSkipSummary({
      releaseTag,
      receiptAsset: existingReceipt,
    });
    return;
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
        sourcePath: REPOSITORY_SOURCE_PATH,
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

  const webhook = await inspectDiscordWebhook(
    discordWebhookUrl
  );

  const message = await postDiscord(
    discordWebhookUrl,
    payload
  );

  await recordDiscordReceipt({
    releaseTag,
    webhook,
    message,
  });

  await uploadDiscordReceiptAsset({
    repository,
    releaseTag,
    releaseSha,
    token: githubToken,
    webhook,
    message,
  });
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : error
  );

  process.exit(1);
});
