from pathlib import Path

notify_path = Path('scripts/release-notify.mjs')
release_path = Path('.github/workflows/release.yml')
repair_path = Path('.github/workflows/release-delivery-repair.yml')

notify = notify_path.read_text(encoding='utf-8')

old_import = "import { readFile } from 'node:fs/promises';"
new_import = "import { appendFile, readFile } from 'node:fs/promises';"
if notify.count(old_import) != 1:
    raise SystemExit(f'fs import anchor count: {notify.count(old_import)}')
notify = notify.replace(old_import, new_import, 1)

old_post = '''async function postDiscord(webhookUrl, payload) {
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
'''
new_post = '''async function inspectDiscordWebhook(webhookUrl) {
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
        `- Release: \\`${releaseTag}\\``,
        `- Webhook name: ${webhook.name}`,
        `- Guild ID: \\`${webhook.guildId || 'not returned'}\\``,
        `- Channel ID: \\`${message.channelId}\\``,
        `- Message ID: \\`${message.messageId}\\``,
        '',
      ].join('\\n'),
      'utf8'
    );
  }
}
'''
if notify.count(old_post) != 1:
    raise SystemExit(f'postDiscord anchor count: {notify.count(old_post)}')
notify = notify.replace(old_post, new_post, 1)

old_call = '''  await postDiscord(
    discordWebhookUrl,
    payload
  );

  console.log(
    `Discord release notification posted ` +
    `for ${releaseTag}`
  );
'''
new_call = '''  const webhook = await inspectDiscordWebhook(
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
'''
if notify.count(old_call) != 1:
    raise SystemExit(f'Discord call anchor count: {notify.count(old_call)}')
notify = notify.replace(old_call, new_call, 1)
notify_path.write_text(notify, encoding='utf-8', newline='\n')

release = release_path.read_text(encoding='utf-8')
old_step_name = '      - name: Verify deployment and notify Discord\n'
new_step_name = '      - name: Verify deployment, post Discord and record receipt\n'
if release.count(old_step_name) != 1:
    raise SystemExit(f'release step anchor count: {release.count(old_step_name)}')
release = release.replace(old_step_name, new_step_name, 1)
release_path.write_text(release, encoding='utf-8', newline='\n')

repair = '''name: Repair release delivery

on:
  pull_request_target:
    types:
      - closed
  workflow_dispatch:
    inputs:
      release_tag:
        description: Release tag to resend, such as v1.0.8. Leave blank for the current main version.
        required: false
        type: string

permissions:
  contents: read

jobs:
  resend:
    name: Resend release and capture Discord receipt
    if: >-
      github.event_name == 'workflow_dispatch' ||
      (github.event.pull_request.merged == true &&
       github.event.pull_request.head.ref == 'agent/release-delivery-receipt')
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Check out trusted main
        uses: actions/checkout@v6
        with:
          fetch-depth: 0
          ref: main

      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '24'
          package-manager-cache: false

      - name: Resolve release source and assets
        env:
          GH_TOKEN: ${{ github.token }}
          REQUESTED_TAG: ${{ inputs.release_tag }}
        shell: bash
        run: |
          set -euo pipefail
          git fetch origin main --tags --force

          RELEASE_TAG="${REQUESTED_TAG#refs/tags/}"
          if [[ -z "${RELEASE_TAG}" ]]; then
            VERSION="$(node scripts/validate-userscript.mjs --print-version)"
            RELEASE_TAG="v${VERSION}"
          elif [[ "${RELEASE_TAG}" != v* ]]; then
            RELEASE_TAG="v${RELEASE_TAG}"
          fi

          RELEASE_SHA="$(git rev-list -n 1 "${RELEASE_TAG}")"
          VERSION="${RELEASE_TAG#v}"
          ASSET="MissionChief-Command-Nexus-${VERSION}.user.js"

          rm -rf release-source release-check
          git worktree add --force --detach release-source "${RELEASE_SHA}"
          mkdir release-check
          gh release download "${RELEASE_TAG}" \
            --pattern "${ASSET}" \
            --pattern "${ASSET}.sha256" \
            --dir release-check \
            --clobber
          cp "release-check/${ASSET}" "${ASSET}"
          cp "release-check/${ASSET}.sha256" "${ASSET}.sha256"

          echo "RELEASE_TAG=${RELEASE_TAG}" >> "${GITHUB_ENV}"
          echo "RELEASE_SHA=${RELEASE_SHA}" >> "${GITHUB_ENV}"

      - name: Confirm stored webhook identity
        env:
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_RELEASE_WEBHOOK }}
          EXPECTED_WEBHOOK_SHA256: fd3a7dd1184be610bc5a0fbe8024e8838220574b15d46c8a7594d7e72c1676ec
        shell: bash
        run: |
          set -euo pipefail
          if [[ -z "${DISCORD_WEBHOOK_URL}" ]]; then
            echo 'Missing DISCORD_RELEASE_WEBHOOK repository secret.'
            exit 1
          fi
          ACTUAL_HASH="$(printf '%s' "${DISCORD_WEBHOOK_URL}" | sha256sum | awk '{print $1}')"
          if [[ "${ACTUAL_HASH}" == "${EXPECTED_WEBHOOK_SHA256}" ]]; then
            echo 'Stored GitHub secret matches the originally configured Discord webhook.'
            echo '- Stored webhook matches original configuration: `yes`' >> "${GITHUB_STEP_SUMMARY}"
          else
            echo '::warning title=Discord webhook changed::The stored GitHub secret does not match the originally configured webhook.'
            echo '- Stored webhook matches original configuration: `no`' >> "${GITHUB_STEP_SUMMARY}"
          fi

      - name: Resend release and require Discord delivery receipt
        env:
          DISCORD_WEBHOOK_URL: ${{ secrets.DISCORD_RELEASE_WEBHOOK }}
          GREASYFORK_INSTALL_URL: ${{ vars.GREASYFORK_INSTALL_URL }}
          GREASYFORK_PAGE_URL: ${{ vars.GREASYFORK_PAGE_URL }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          RELEASE_TAG: ${{ env.RELEASE_TAG }}
          RELEASE_SHA: ${{ env.RELEASE_SHA }}
          SOURCE_PATH: release-source/src/missionchief-command-nexus.user.js
          CHANGELOG_PATH: release-source/CHANGELOG.md
          PRODUCT_NAME: MissionChief Command Nexus
        run: node scripts/release-notify.mjs
'''
repair_path.write_text(repair, encoding='utf-8', newline='\n')

print('Added release delivery receipt verification and repair workflow')
