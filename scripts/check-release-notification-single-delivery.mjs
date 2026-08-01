#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const [releaseWorkflow, repairWorkflow, repositoryQuality, notifier] =
  await Promise.all([
    readFile('.github/workflows/release.yml', 'utf8'),
    readFile('.github/workflows/release-delivery-repair.yml', 'utf8'),
    readFile('.github/workflows/repository-quality.yml', 'utf8'),
    readFile('scripts/release-notify.mjs', 'utf8'),
  ]);

for (const required of [
  "const PRODUCT_PAGE_URL =",
  "https://tkb-gaming.scot/mission-chief-scripts/command-nexus/",
  "[Install / Update](${productPageUrl})",
  "[TKB Scripts](${productPageUrl})",
]) {
  if (!notifier.includes(required)) {
    fail(`release notifier is missing the TKB landing-page contract: ${required}`);
  }
}

if (notifier.includes("[Install / Update](${greasyForkInstallUrl})")) {
  fail('release notifier must not bypass the Command Nexus TKB landing page');
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(source, text, label) {
  if (!source.includes(text)) {
    fail(`Missing single-delivery contract: ${label}`);
  }
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

const postIndex = notifier.indexOf(
  'const message = await postDiscord('
);
const receiptIndex = notifier.indexOf(
  'await uploadDiscordReceiptAsset({'
);
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

console.log(
  'Single-delivery Discord release notification checks passed.'
);
