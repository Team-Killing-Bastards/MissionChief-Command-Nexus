#!/usr/bin/env python3

import re
from pathlib import Path

path = Path("scripts/release-notify.mjs")
text = path.read_text(encoding="utf-8")

source_block = """const SOURCE_PATH =
  process.env.SOURCE_PATH ||
  'src/missionchief-command-nexus.user.js';

const CHANGELOG_PATH =
"""
replacement_source_block = """const SOURCE_PATH =
  process.env.SOURCE_PATH ||
  'src/missionchief-command-nexus.user.js';

const REPOSITORY_SOURCE_PATH =
  process.env.REPOSITORY_SOURCE_PATH ||
  'src/missionchief-command-nexus.user.js';

const CHANGELOG_PATH =
"""
if source_block not in text:
    raise SystemExit("Could not add repository source path")
text = text.replace(source_block, replacement_source_block, 1)

text = text.replace(
    "const GITHUB_SOURCE_ATTEMPTS = 60;\nconst GITHUB_SOURCE_WAIT_MS = 5_000;",
    "const GITHUB_SOURCE_ATTEMPTS = 12;\nconst GITHUB_SOURCE_WAIT_MS = 2_500;",
    1,
)

new_verifier = r'''async function verifyGitHubSource({
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

async function verifyGreasyFork({'''

text, count = re.subn(
    r"async function verifyGitHubSource\(\{.*?\n\}\n\nasync function verifyGreasyFork\(\{",
    new_verifier,
    text,
    count=1,
    flags=re.DOTALL,
)
if count != 1:
    raise SystemExit("Could not replace GitHub source verifier")

old_call = """      verifyGitHubSource({
        repository,
        releaseSha,
        sourcePath: SOURCE_PATH,
        expectedVersion: version,
        expectedNormalisedSource,
      }),
"""
new_call = """      verifyGitHubSource({
        repository,
        releaseSha,
        sourcePath: REPOSITORY_SOURCE_PATH,
        expectedVersion: version,
        expectedNormalisedSource,
      }),
"""
if old_call not in text:
    raise SystemExit("Could not update GitHub source verifier call")
text = text.replace(old_call, new_call, 1)

path.write_text(text, encoding="utf-8")
