#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { appendFile, readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const API_VERSION = '2022-11-28';
const USER_AGENT = 'MissionChief-Command-Nexus-Release-Publisher/1.0';
const DEFAULT_ATTEMPTS = 12;
const MUTATION_DELAY_MS = 1_100;
const TRANSIENT_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function parseArgs(argv) {
  const result = { assets: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];

    switch (argument) {
      case '--tag':
        result.tag = value;
        index += 1;
        break;
      case '--target':
        result.target = value;
        index += 1;
        break;
      case '--title':
        result.title = value;
        index += 1;
        break;
      case '--notes':
        result.notesPath = value;
        index += 1;
        break;
      case '--asset':
        result.assets.push(value);
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return result;
}

function requireValue(value, label) {
  if (!value?.trim()) {
    throw new Error(`Missing required value: ${label}`);
  }

  return value.trim();
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function normaliseUploadUrl(uploadUrl) {
  return uploadUrl.replace(/\{\?name,label\}$/, '');
}

function contentTypeFor(filename) {
  if (filename.endsWith('.user.js')) {
    return 'application/javascript; charset=utf-8';
  }

  if (filename.endsWith('.sha256') || filename.endsWith('.txt')) {
    return 'text/plain; charset=utf-8';
  }

  return 'application/octet-stream';
}

function backoffMilliseconds(attempt, response) {
  const retryAfter = Number(response?.headers?.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return retryAfter * 1_000;
  }

  const remaining = response?.headers?.get('x-ratelimit-remaining');
  const reset = Number(response?.headers?.get('x-ratelimit-reset'));
  if (remaining === '0' && Number.isFinite(reset)) {
    return Math.max(1_000, reset * 1_000 - Date.now() + 1_000);
  }

  const exponential = Math.min(30_000, 2_500 * 2 ** Math.min(attempt - 1, 4));
  const jitter = Math.floor(Math.random() * 1_000);
  return exponential + jitter;
}

function responseIsTransient(response) {
  return TRANSIENT_STATUS_CODES.has(response.status);
}

async function responseText(response) {
  try {
    return (await response.text()).slice(0, 2_000);
  } catch {
    return '<response body unavailable>';
  }
}

function apiHeaders(token, extra = {}) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': USER_AGENT,
    ...extra,
  };
}

async function requestWithRetry({
  url,
  token,
  method = 'GET',
  body,
  headers = {},
  expected = [200],
  attempts = DEFAULT_ATTEMPTS,
  label,
  allowNotFound = false,
}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response;

    try {
      response = await fetch(url, {
        method,
        headers: apiHeaders(token, headers),
        body,
        redirect: 'follow',
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === attempts) {
        throw new Error(`${label} failed after ${attempts} attempts: ${lastError.message}`);
      }

      const wait = backoffMilliseconds(attempt);
      console.log(`${label}: network failure on attempt ${attempt}/${attempts}; retrying in ${Math.ceil(wait / 1_000)}s.`);
      await sleep(wait);
      continue;
    }

    if (allowNotFound && response.status === 404) {
      return response;
    }

    if (expected.includes(response.status)) {
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
        await sleep(MUTATION_DELAY_MS);
      }
      return response;
    }

    const bodyText = await responseText(response);
    lastError = new Error(`${label} returned HTTP ${response.status}: ${bodyText}`);

    if (!responseIsTransient(response) || attempt === attempts) {
      throw lastError;
    }

    const wait = backoffMilliseconds(attempt, response);
    console.log(`${label}: GitHub returned HTTP ${response.status} on attempt ${attempt}/${attempts}; retrying in ${Math.ceil(wait / 1_000)}s.`);
    await sleep(wait);
  }

  throw lastError ?? new Error(`${label} failed`);
}

async function requestJson(options) {
  const response = await requestWithRetry(options);

  if (response.status === 204 || response.status === 404) {
    return null;
  }

  return response.json();
}

async function requestBuffer(options) {
  const response = await requestWithRetry(options);
  return Buffer.from(await response.arrayBuffer());
}

async function listReleases({ apiBase, repository, token }) {
  return requestJson({
    url: `${apiBase}/repos/${repository}/releases?per_page=100`,
    token,
    label: 'List releases',
  });
}

async function findReleaseByTag(context, tag) {
  const releases = await listReleases(context);
  return releases.find((release) => release.tag_name === tag) ?? null;
}

async function createOrStageRelease(context, { tag, target, title, notes }) {
  let release = await findReleaseByTag(context, tag);

  if (!release) {
    console.log(`Creating draft release ${tag}.`);

    try {
      release = await requestJson({
        url: `${context.apiBase}/repos/${context.repository}/releases`,
        token: context.token,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag_name: tag,
          target_commitish: target,
          name: title,
          body: notes,
          draft: true,
          prerelease: false,
          generate_release_notes: false,
        }),
        expected: [201],
        label: `Create draft release ${tag}`,
      });
    } catch (error) {
      if (!String(error).includes('HTTP 422')) {
        throw error;
      }

      console.log(`Release ${tag} appeared during creation; reconciling existing record.`);
      release = await findReleaseByTag(context, tag);
      if (!release) {
        throw error;
      }
    }
  }

  if (release.immutable) {
    throw new Error(`Release ${tag} is immutable and cannot be reconciled automatically.`);
  }

  console.log(`Staging release ${tag} as draft while assets are reconciled.`);
  release = await requestJson({
    url: `${context.apiBase}/repos/${context.repository}/releases/${release.id}`,
    token: context.token,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: title,
      body: notes,
      draft: true,
      prerelease: false,
    }),
    expected: [200],
    label: `Stage release ${tag}`,
  });

  return release;
}

async function listAssets(context, releaseId) {
  return requestJson({
    url: `${context.apiBase}/repos/${context.repository}/releases/${releaseId}/assets?per_page=100`,
    token: context.token,
    label: `List assets for release ${releaseId}`,
  });
}

async function deleteAsset(context, asset) {
  console.log(`Deleting stale release asset ${asset.name} (id ${asset.id}, state ${asset.state}, size ${asset.size}).`);

  await requestWithRetry({
    url: `${context.apiBase}/repos/${context.repository}/releases/assets/${asset.id}`,
    token: context.token,
    method: 'DELETE',
    expected: [204, 404],
    label: `Delete release asset ${asset.name}`,
  });
}

async function downloadAsset(context, asset) {
  return requestBuffer({
    url: `${context.apiBase}/repos/${context.repository}/releases/assets/${asset.id}`,
    token: context.token,
    headers: { Accept: 'application/octet-stream' },
    expected: [200],
    label: `Download release asset ${asset.name}`,
  });
}

async function assetMatches(context, asset, localAsset) {
  if (asset.state !== 'uploaded' || Number(asset.size) !== localAsset.size) {
    return false;
  }

  if (asset.digest && asset.digest !== `sha256:${localAsset.sha256}`) {
    return false;
  }

  try {
    const downloaded = await downloadAsset(context, asset);
    return downloaded.length === localAsset.size && sha256(downloaded) === localAsset.sha256;
  } catch (error) {
    console.log(`Could not verify existing asset ${asset.name}: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function uploadAssetOnce(context, release, localAsset) {
  const uploadUrl = new URL(normaliseUploadUrl(release.upload_url));
  uploadUrl.searchParams.set('name', localAsset.name);

  let response;
  try {
    response = await fetch(uploadUrl, {
      method: 'POST',
      headers: apiHeaders(context.token, {
        Accept: 'application/vnd.github+json',
        'Content-Type': localAsset.contentType,
        'Content-Length': String(localAsset.size),
      }),
      body: localAsset.buffer,
      redirect: 'follow',
    });
  } catch (error) {
    return {
      ok: false,
      transient: true,
      status: 0,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  if (response.status === 201) {
    const asset = await response.json();
    await sleep(MUTATION_DELAY_MS);
    return { ok: true, asset };
  }

  return {
    ok: false,
    transient: responseIsTransient(response) || response.status === 422,
    status: response.status,
    response,
    message: await responseText(response),
  };
}

async function ensureAsset(context, release, localAsset) {
  for (let cycle = 1; cycle <= DEFAULT_ATTEMPTS; cycle += 1) {
    const assets = await listAssets(context, release.id);
    const matches = assets.filter((asset) => asset.name === localAsset.name);

    for (const asset of matches) {
      if (await assetMatches(context, asset, localAsset)) {
        console.log(`Release asset ${localAsset.name} is already complete and verified.`);
        return asset;
      }
    }

    for (const asset of matches) {
      await deleteAsset(context, asset);
    }

    console.log(`Uploading ${localAsset.name} (cycle ${cycle}/${DEFAULT_ATTEMPTS}).`);
    const result = await uploadAssetOnce(context, release, localAsset);

    if (result.ok) {
      const refreshedAssets = await listAssets(context, release.id);
      const uploaded = refreshedAssets.find((asset) => asset.name === localAsset.name);

      if (uploaded && await assetMatches(context, uploaded, localAsset)) {
        console.log(`Uploaded and verified ${localAsset.name}.`);
        return uploaded;
      }

      console.log(`Upload response for ${localAsset.name} was not yet verifiable; reconciling.`);
    } else {
      console.log(`Upload of ${localAsset.name} returned ${result.status || 'a network error'}: ${result.message}`);

      if (!result.transient) {
        throw new Error(`Upload of ${localAsset.name} failed permanently: ${result.message}`);
      }
    }

    if (cycle < DEFAULT_ATTEMPTS) {
      const wait = backoffMilliseconds(cycle, result.response);
      console.log(`Waiting ${Math.ceil(wait / 1_000)}s before reconciling ${localAsset.name}.`);
      await sleep(wait);
    }
  }

  throw new Error(`Could not upload and verify ${localAsset.name} after ${DEFAULT_ATTEMPTS} reconciliation cycles.`);
}

async function publishRelease(context, release, { tag, target, title, notes }) {
  console.log(`Publishing fully verified release ${tag}.`);

  return requestJson({
    url: `${context.apiBase}/repos/${context.repository}/releases/${release.id}`,
    token: context.token,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: title,
      body: notes,
      draft: false,
      prerelease: false,
    }),
    expected: [200],
    label: `Publish release ${tag}`,
  });
}

async function verifyPublishedRelease(context, release, localAssets) {
  const current = await findReleaseByTag(context, release.tag_name);

  if (!current) {
    throw new Error(`Published release ${release.tag_name} could not be retrieved.`);
  }

  if (current.draft || current.prerelease) {
    throw new Error(`Release ${release.tag_name} is not a normal published release.`);
  }

  const assets = await listAssets(context, current.id);

  for (const localAsset of localAssets) {
    const remote = assets.find((asset) => asset.name === localAsset.name);
    if (!remote || !await assetMatches(context, remote, localAsset)) {
      throw new Error(`Published release asset ${localAsset.name} failed final verification.`);
    }
  }

  return current;
}

async function writeOutputs(release, localAssets) {
  const outputPath = process.env.GITHUB_OUTPUT;
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;

  if (outputPath) {
    const lines = [
      `release_url=${release.html_url}`,
      `release_id=${release.id}`,
      ...localAssets.map((asset, index) => `asset_${index + 1}_sha256=${asset.sha256}`),
    ];
    await appendFile(outputPath, `${lines.join('\n')}\n`, 'utf8');
  }

  if (summaryPath) {
    const summary = [
      '### GitHub Release publication verified',
      `- Release: ${release.html_url}`,
      `- Tag: \`${release.tag_name}\``,
      ...localAssets.map((asset) => `- \`${asset.name}\`: \`${asset.sha256}\``),
      '',
    ];
    await appendFile(summaryPath, summary.join('\n'), 'utf8');
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = requireValue(process.env.GITHUB_TOKEN || process.env.GH_TOKEN, 'GITHUB_TOKEN or GH_TOKEN');
  const repository = requireValue(process.env.GITHUB_REPOSITORY, 'GITHUB_REPOSITORY');
  const tag = requireValue(args.tag, '--tag');
  const target = requireValue(args.target, '--target');
  const title = requireValue(args.title, '--title');
  const notesPath = requireValue(args.notesPath, '--notes');

  if (args.assets.length === 0) {
    throw new Error('At least one --asset is required.');
  }

  const notes = await readFile(notesPath, 'utf8');
  const localAssets = await Promise.all(args.assets.map(async (path) => {
    const buffer = await readFile(path);
    return {
      path,
      name: basename(path),
      buffer,
      size: buffer.length,
      sha256: sha256(buffer),
      contentType: contentTypeFor(path),
    };
  }));

  const context = {
    apiBase: process.env.GITHUB_API_URL || 'https://api.github.com',
    repository,
    token,
  };

  const release = await createOrStageRelease(context, { tag, target, title, notes });

  try {
    for (const asset of localAssets) {
      await ensureAsset(context, release, asset);
    }

    const published = await publishRelease(context, release, { tag, target, title, notes });
    const verified = await verifyPublishedRelease(context, published, localAssets);
    await writeOutputs(verified, localAssets);
    console.log(`Release ${tag} published and verified: ${verified.html_url}`);
  } catch (error) {
    console.error(`Release ${tag} was left as a draft because publication did not complete safely.`);
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
