#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const workflow = await readFile(
  '.github/workflows/repository-quality.yml',
  'utf8'
);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(text, label) {
  if (!workflow.includes(text)) {
    fail(`Missing automatic release contract: ${label}`);
  }
}

requireText(
  "push:\n    branches:\n      - main",
  'every main push starts repository release reconciliation'
);
requireText(
  "github.event_name == 'push' ||",
  'release-state job runs for main push events'
);
requireText(
  "github.event_name == 'workflow_dispatch'",
  'manual recovery remains available'
);
requireText(
  'uses: ./.github/workflows/release.yml',
  'canonical verified publisher remains authoritative'
);
requireText(
  "operation: publish-release",
  'publisher uses the permanent publish-release operation'
);
requireText(
  'DISCORD_RECEIPT_PREFIX="Command-Nexus-Discord-Receipt-${RELEASE_TAG}-"',
  'durable release completion receipt prefix'
);
requireText(
  'startsWith(\\"${DISCORD_RECEIPT_PREFIX}\\")',
  'release state checks for the Discord delivery receipt'
);
requireText(
  'GitHub Release, both verified assets and the Discord delivery receipt already exist',
  'release is complete only after verified Discord delivery'
);
requireText(
  'GitHub assets exist but the verified Discord delivery receipt is missing',
  'incomplete releases are retried after packaging'
);

if (workflow.includes('pull_request_target:')) {
  fail(
    'Release publication must use the single main-push path, not a second pull_request_target publisher'
  );
}

const publishGate =
  "if: needs.release-state.outputs.should_publish == 'true'";
const gateCount = workflow.split(publishGate).length - 1;
if (gateCount !== 1) {
  fail(
    `Expected exactly one automatic publish gate; found ${gateCount}`
  );
}

console.log(
  'Every-main-push release reconciliation and receipt-aware completion checks passed.'
);
