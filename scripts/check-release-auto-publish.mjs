#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const workflow = await readFile(
  '.github/workflows/repository-quality.yml',
  'utf8'
);
const publisher = await readFile(
  '.github/workflows/release.yml',
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

function requirePublisherText(text, label) {
  if (!publisher.includes(text)) {
    fail(`Missing publisher release-source contract: ${label}`);
  }
}

requireText(
  "push:\n    branches:\n      - main",
  'normal main pushes can reconcile release state'
);
requireText(
  "pull_request_target:\n    types:\n      - closed",
  'trusted merged-PR close events reconcile release state'
);
requireText(
  "github.event_name == 'pull_request_target' &&",
  'release-state job recognises trusted PR close events'
);
requireText(
  "github.event.pull_request.merged == true) ||",
  'closed but unmerged PRs cannot publish'
);
requireText(
  "github.event_name == 'push' ||",
  'release-state job retains main-push recovery'
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
  'operation: publish-release',
  'publisher uses the permanent publish-release operation'
);
requireText(
  'DISCORD_RECEIPT_PREFIX="Command-Nexus-Discord-Receipt-${RELEASE_TAG}-"',
  'durable release completion receipt prefix'
);
requireText(
  'startswith(',
  'release state checks release assets for the Discord delivery receipt prefix'
);
requireText(
  'GitHub Release, both verified assets and the Discord delivery receipt already exist',
  'release is complete only after verified Discord delivery'
);
requireText(
  'GitHub assets exist but the verified Discord delivery receipt is missing',
  'incomplete releases are retried after packaging'
);

// A reusable publisher inherits the caller's github event. A normal push to
// main must therefore not be mistaken for an immutable tag-push event.
requirePublisherText(
  'EVENT_REF: ${{ github.ref }}',
  'publisher captures the original event ref as well as the event name'
);
requirePublisherText(
  'if [[ "${EVENT_NAME}" == "push" && "${EVENT_REF}" == refs/tags/* ]]; then',
  'only refs/tags/* pushes enter tag-event resolution'
);
requirePublisherText(
  'IS_TAG_EVENT=true',
  'publisher records a real tag-event decision'
);
requirePublisherText(
  'RELEASE_TAG="${EVENT_REF#refs/tags/}"',
  'real tag events derive the immutable tag from refs/tags/*'
);
requirePublisherText(
  'if [[ "${IS_TAG_EVENT}" == "true" ]]; then',
  'missing-tag failure is restricted to a real tag event'
);
requirePublisherText(
  'RELEASE_TAG="${REQUESTED_TAG#refs/tags/}"',
  'ordinary main pushes continue with the requested canonical release tag'
);

const obsoletePushOnlyGate = 'if [[ "${EVENT_NAME}" == "push" ]]; then';
if (publisher.includes(obsoletePushOnlyGate)) {
  fail(
    'Publisher still treats every push, including refs/heads/main, as a tag event.'
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

const publisherCount = workflow.split(
  'uses: ./.github/workflows/release.yml'
).length - 1;
if (publisherCount !== 1) {
  fail(
    `Expected exactly one canonical release publisher; found ${publisherCount}`
  );
}

console.log(
  'Merged-PR, main-push and manual release reconciliation with tag-safe immutable-source and receipt-aware completion checks passed.'
);
