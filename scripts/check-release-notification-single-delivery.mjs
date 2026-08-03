#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(source, text, label) {
  if (!source.includes(text)) {
    fail(`Missing release-notification contract: ${label}`);
  }
}

function requireOrderedText(source, entries, label) {
  let cursor = -1;

  for (const entry of entries) {
    const index = source.indexOf(entry, cursor + 1);
    if (index < 0) {
      fail(`Missing ${label}: ${entry}`);
    }
    if (index <= cursor) {
      fail(`Incorrect ${label} order at: ${entry}`);
    }
    cursor = index;
  }
}

async function readTextFiles(directory, extensions) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!extensions.has(extname(entry.name))) continue;

    const path = join(directory, entry.name);
    files.push({
      name: entry.name,
      path,
      source: await readFile(path, 'utf8'),
    });
  }

  return files;
}

const [releaseWorkflow, repairWorkflow, repositoryQuality, notifier] =
  await Promise.all([
    readFile('.github/workflows/release.yml', 'utf8'),
    readFile('.github/workflows/release-delivery-repair.yml', 'utf8'),
    readFile('.github/workflows/repository-quality.yml', 'utf8'),
    readFile('scripts/release-notify.mjs', 'utf8'),
  ]);

const [workflowFiles, scriptFiles] = await Promise.all([
  readTextFiles('.github/workflows', new Set(['.yml', '.yaml'])),
  readTextFiles('scripts', new Set(['.mjs'])),
]);

for (const required of [
  'const PRODUCT_PAGE_URL =',
  'https://tkb-gaming.scot/mission-chief-scripts/command-nexus/',
  '[Install / Update](${productPageUrl})',
  '[TKB Scripts](${productPageUrl})',
]) {
  if (!notifier.includes(required)) {
    fail(`Release notifier is missing the TKB landing-page contract: ${required}`);
  }
}

if (notifier.includes('[Install / Update](${greasyForkInstallUrl})')) {
  fail('Release notifier must not bypass the Command Nexus TKB landing page');
}

if (/^\s{2}push:\s*\n\s{4}tags:/m.test(releaseWorkflow)) {
  fail('release.yml must not auto-publish from tag pushes');
}

requireText(
  releaseWorkflow,
  "if: inputs.operation == 'publish-release'",
  'explicit publish operation gate'
);
requireText(
  releaseWorkflow,
  'GITHUB_TOKEN: ${{ github.token }}',
  'GitHub token supplied to notifier'
);
requireText(
  releaseWorkflow,
  'node scripts/release-notify.mjs',
  'canonical notifier invocation'
);
requireText(
  repositoryQuality,
  'uses: ./.github/workflows/release.yml',
  'trusted post-merge automatic publisher'
);

requireText(
  notifier,
  'DISCORD_RECEIPT_ASSET_PREFIX',
  'durable Discord receipt asset prefix'
);
requireText(
  notifier,
  'findDiscordReceiptAsset(',
  'existing receipt lookup'
);
requireText(
  notifier,
  'skipping duplicate post',
  'duplicate notification skip path'
);
requireText(
  notifier,
  'uploadDiscordReceiptAsset(',
  'successful delivery receipt upload'
);
requireText(
  notifier,
  "readBooleanEnv('FORCE_DISCORD_RESEND')",
  'explicit force-resend support'
);
requireText(
  notifier,
  'verifyGreasyFork({',
  'Greasy Fork exact-source verification before delivery'
);

const postIndex = notifier.indexOf('const message = await postDiscord(');
const receiptIndex = notifier.indexOf('await uploadDiscordReceiptAsset({');
if (postIndex < 0 || receiptIndex <= postIndex) {
  fail('Discord receipt must be written only after a successful post');
}

requireText(
  repairWorkflow,
  'force_resend:',
  'repair force-resend input'
);
requireText(
  repairWorkflow,
  'contents: write',
  'repair receipt asset permission'
);
requireText(
  repairWorkflow,
  "FORCE_DISCORD_RESEND: ${{ inputs.force_resend && 'true' || 'false' }}",
  'repair force-resend environment'
);
requireText(
  repairWorkflow,
  'GITHUB_TOKEN: ${{ github.token }}',
  'repair GitHub token'
);
requireText(
  repairWorkflow,
  'node scripts/release-notify.mjs',
  'repair uses the canonical notifier'
);

const payloadStart = notifier.indexOf('function buildDiscordPayload({');
const payloadEnd = notifier.indexOf('\nasync function main()', payloadStart);
if (payloadStart < 0 || payloadEnd <= payloadStart) {
  fail('Unable to isolate canonical Discord payload builder');
}

const payload = notifier.slice(payloadStart, payloadEnd);

requireOrderedText(
  payload,
  [
    "username: 'Command Nexus Release Control'",
    'embeds: [',
    'color: COLOURS.command',
    'title: `🚨 ${PRODUCT_NAME} ${releaseTag} is live`',
    "name: 'Release'",
    "name: 'Channel'",
    "value: '**Production**'",
    "name: 'Status'",
    "value: '🟢 **LIVE**'",
    'color: COLOURS.mission',
    "title: '🧭 Mission Brief'",
    'description: missionBrief',
    'color: COLOURS.verified',
    "title: '✅ Deployment verified'",
    "name: 'GitHub'",
    '✅ Release published',
    '✅ Tag and source verified',
    "name: 'Greasy Fork'",
    '✅ Version',
    '✅ Served code matched',
    "name: 'Integrity'",
    '✅ Asset parity confirmed',
    '✅ SHA-256 validated',
    "name: 'Get the release'",
    '[Install / Update](${productPageUrl})',
    '[Release Notes](${releaseUrl})',
    '[TKB Scripts](${productPageUrl})',
    "name: 'Build signature'",
    'value: `\\`${recordedChecksum}\\``',
    '`Commit ${shortCommit} • `',
    "'Verified before notification'",
  ],
  'canonical three-embed release-card contract'
);

const colourCount = (payload.match(/color:\s*COLOURS\./g) || []).length;
if (colourCount !== 3) {
  fail(`Canonical Discord payload must contain exactly three colour-coded embeds; found ${colourCount}`);
}

const embedArrayCount = (payload.match(/embeds:\s*\[/g) || []).length;
if (embedArrayCount !== 1) {
  fail(`Canonical Discord payload must own exactly one embed array; found ${embedArrayCount}`);
}

for (const required of [
  'const MAX_MISSION_BRIEF_LENGTH = 1400;',
  'function formatMissionBrief(',
  'extractReleaseSection(changelog, version)',
  'Greasy Fork recognised the verified build in',
  'The notification was dispatched immediately after exact source parity was confirmed.',
]) {
  requireText(notifier, required, required);
}

const forbiddenReleaseVariants = [
  'Command-Nexus-Discord-Pending-GreasyFork-Receipt',
  'release_notice_greasy_fork_pending',
  'Sync pending',
  'External delivery status',
  'second notice may be sent',
  'Greasy Fork external synchronisation is still',
  'Post Discord release status and create receipt',
];

for (const file of workflowFiles) {
  if (/^temporary-.*\.ya?ml$/i.test(file.name)) {
    fail(`Temporary workflow must not remain in production: ${file.path}`);
  }

  for (const forbidden of forbiddenReleaseVariants) {
    if (file.source.includes(forbidden)) {
      fail(`Alternative Discord release state is forbidden in ${file.path}: ${forbidden}`);
    }
  }

  const constructsEmbedDirectly =
    file.source.includes('Command Nexus Release Control') ||
    /embeds:\s*\[/m.test(file.source) ||
    /target\.searchParams\.set\(['"]wait['"],\s*['"]true['"]\)/m.test(file.source) ||
    /\/messages\/\$\{?MESSAGE_ID\}?/m.test(file.source);

  if (constructsEmbedDirectly) {
    fail(
      `Workflow ${file.path} constructs or mutates Discord release messages directly. ` +
      'All release cards must pass through scripts/release-notify.mjs.'
    );
  }

  const receivesDiscordSecret =
    file.source.includes('DISCORD_RELEASE_WEBHOOK') ||
    file.source.includes('DISCORD_WEBHOOK_URL');
  const usesCanonicalNotifier =
    file.source.includes('node scripts/release-notify.mjs') ||
    file.source.includes('uses: ./.github/workflows/release.yml');

  if (receivesDiscordSecret && !usesCanonicalNotifier) {
    fail(
      `Workflow ${file.path} receives the Discord release webhook without ` +
      'using the canonical release notifier.'
    );
  }
}

for (const file of scriptFiles) {
  if (
    basename(file.path) === 'release-notify.mjs' ||
    basename(file.path) === 'check-release-notification-single-delivery.mjs'
  ) {
    continue;
  }

  for (const forbidden of forbiddenReleaseVariants) {
    if (file.source.includes(forbidden)) {
      fail(`Alternative Discord release state is forbidden in ${file.path}: ${forbidden}`);
    }
  }

  if (
    file.source.includes('Command Nexus Release Control') ||
    file.source.includes('DISCORD_WEBHOOK_URL') ||
    file.source.includes('DISCORD_RELEASE_WEBHOOK')
  ) {
    fail(
      `Script ${file.path} is an unauthorised Discord release-message owner. ` +
      'Only scripts/release-notify.mjs may build or post release cards.'
    );
  }
}

console.log(
  'Canonical three-embed and single-delivery Discord release notification checks passed.'
);
