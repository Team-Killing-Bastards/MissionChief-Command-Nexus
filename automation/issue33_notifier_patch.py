#!/usr/bin/env python3

from pathlib import Path

path = Path("scripts/release-notify.mjs")
text = path.read_text(encoding="utf-8")

old_constants = """const MAX_MISSION_BRIEF_LENGTH = 1400;
const GREASY_FORK_ATTEMPTS = 60;
const GREASY_FORK_WAIT_MS = 5_000;
"""
new_constants = """const MAX_MISSION_BRIEF_LENGTH = 1400;
const GITHUB_SOURCE_ATTEMPTS = 60;
const GITHUB_SOURCE_WAIT_MS = 5_000;
const GREASY_FORK_ATTEMPTS = 60;
const GREASY_FORK_WAIT_MS = 5_000;
"""

if old_constants not in text:
    raise SystemExit("Could not find notifier retry constants")
text = text.replace(old_constants, new_constants, 1)

verify_marker = "async function verifyGreasyFork({\n"
verify_github_source = """async function verifyGitHubSource({
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

"""

if verify_marker not in text:
    raise SystemExit("Could not find Greasy Fork verifier insertion point")
text = text.replace(
    verify_marker,
    verify_github_source + verify_marker,
    1,
)

old_inline_github = """  const encodedSourcePath =
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

"""

if old_inline_github not in text:
    raise SystemExit("Could not find inline GitHub raw-source verification")
text = text.replace(old_inline_github, "", 1)

old_greasy_call = """  const greasyForkVerification =
    await verifyGreasyFork({
      installUrl: greasyForkInstallUrl,
      expectedVersion: version,
      expectedNormalisedSource,
    });
"""
new_parallel_call = """  const [, greasyForkVerification] =
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
"""

if old_greasy_call not in text:
    raise SystemExit("Could not find Greasy Fork verification call")
text = text.replace(old_greasy_call, new_parallel_call, 1)

path.write_text(text, encoding="utf-8")
