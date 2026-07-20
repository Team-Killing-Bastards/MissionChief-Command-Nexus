# MissionChief Command Nexus v1.0.3 Release Handover

**Handover date:** 20 July 2026  
**Runtime developer:** MartyBlyth  
**Urgent release follow-through:** Conroy1988  
**Tracking issue:** [#33 — Complete and verify v1.0.3 GitHub Release publication](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/33)

## Executive status

The **v1.0.3 runtime update is complete, validated and merged into `main`**. The remaining problem is limited to formal GitHub Release publication and the final deployment verification chain.

GitHub's own Actions and release-upload services repeatedly returned HTTP `502` and `503` responses while creating or uploading release assets. This was not a JavaScript syntax failure, userscript metadata failure, repository-integrity failure or deployment-secret failure.

### Current position

| Area | Status |
|---|---|
| Canonical v1.0.3 userscript on `main` | Complete |
| PR review and merge | Complete — PR #31 |
| Standard userscript validation | Passed |
| Repository integrity validation | Passed |
| v1.0.3 tag recreation | Passed during direct publisher |
| Release asset generation | Passed |
| GitHub Release asset upload | Blocked by repeated GitHub `502/503` responses |
| Published asset checksum verification | Not completed |
| Greasy Fork v1.0.3 parity verification | Not completed by release workflow |
| Discord verified-release notification | Not reached |

## Canonical runtime baseline

The authoritative source remains:

```text
src/missionchief-command-nexus.user.js
```

Verified source information:

```text
Command Nexus version: 1.0.3
Mission Finder baseline: V10.6.70
Unit, Station & Personnel Tools: V4.2.8
Git blob: 5ff10e85d8d5896a6e5adb7bf0efe2da03295786
File size: 1,013,726 bytes
SHA-256: 69fda9776646c5e76d25101a847bd69eb269db2b151daf181bd016784513c0c3
```

The metadata block on `main` reports:

```javascript
// @version      1.0.3
```

## Runtime work completed in v1.0.3

### Specialist-trained Police IRV protection

Ordinary Police Car and Police Officer attendance now uses a fail-closed selection path:

- Exact MissionChief IRV vehicle IDs are identified.
- The exact `/vehicles/{id}/zuweisung` page is checked.
- Assigned personnel must be present.
- Protected Police qualifications cause the IRV to be excluded from ordinary attendance.
- Unknown or unverifiable IRVs are rejected rather than treated as safe.
- Selected specialist IRVs do not count toward ordinary Police requirements.
- Generic Police group-button fallbacks cannot bypass the trained-personnel protection.

Protected specialist areas include Level 1 Public Order, Level 2 Public Order, Police Sergeant, Police Medic, Police Inspector, Roads Policing, Firearms, Mounted, Dog Handler, Drone, Police Search Advisor, Police Aviation, Railway Police, Mobile Operations Management, EOD, Bomb Disposal and Marine Bomb Disposal.

### Vehicle-list readiness protection

Auto Mode, Unit Finder and Mission Update now wait for a complete vehicle list before selection:

- vehicle list must be non-zero;
- vehicle checkbox-ID signature must stop changing;
- vehicle row count must stop changing;
- list must remain stable for a sustained settling period;
- Load Missing controls must be gone;
- visible loading indicators must be gone;
- timeouts stop selection and dispatch safely.

## Pull request and merge record

### Runtime pull request

- PR: [#31 — Protect trained Police IRVs and stabilise Auto Mode in v1.0.3](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/pull/31)
- Result: merged into `main`
- Merge result commit reported by GitHub: `7dc20bb0f898b544751f7b4623702eb23b1c512c`
- Final PR branch contained only:
  - `README.md`
  - `CHANGELOG.md`
  - `src/README.md`
  - `src/missionchief-command-nexus.user.js`

Both standard checks passed on the final PR commit:

```text
Validate userscript — success
Repository quality — success
```

### Obsolete trigger pull request

- PR: [#32 — Trigger v1.0.3 release publication](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/pull/32)
- Result: closed without merge
- Purpose: temporary workflow trigger only
- Runtime changes: none

## Release workflow attempts

## 1. Canonical release workflow

Workflow run:

```text
29708913434
```

Successful steps:

- Resolve and verify release context
- Validate repository and userscript
- Confirm changelog contains mission brief
- Confirm deployment configuration
- Prepare release asset, checksum and patch log

Failed step:

```text
Create or refresh GitHub release
```

Exact failure:

```text
HTTP 502: Error creating policy
https://uploads.github.com/.../MissionChief-Command-Nexus-1.0.3.user.js.sha256
```

The workflow therefore skipped:

- published release-asset verification;
- Greasy Fork deployment verification;
- Discord release notification.

## 2. Workflow-dispatch recovery attempts

The GitHub Actions workflow-dispatch endpoint repeatedly failed for `release.yml`:

```text
HTTP 503: No server is currently available to service your request
https://api.github.com/repos/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/release.yml
```

This prevented reliable redispatch through the normal `publish-release` input path.

## 3. Direct recovery publisher

Workflow run:

```text
29709540130
```

Successful steps:

- clean-main validation;
- userscript and repository checks;
- deployment secret and variable checks;
- clean `v1.0.3` tag recreation;
- release asset generation;
- checksum generation.

The clean-main commit observed when the tag was recreated was:

```text
15e09cb2f532585f4c323920a5985dc0e6c91bf3
```

Confirm the live remote tag target before final publication because later documentation/troubleshooting cleanup commits moved `main` forward without changing the userscript.

The publisher attempted release creation/upload 15 times and exhausted its retries.

Observed failures included:

```text
HTTP 502: Error creating policy
HTTP 503: No server is currently available to service your request
```

Both release assets were affected:

```text
MissionChief-Command-Nexus-1.0.3.user.js
MissionChief-Command-Nexus-1.0.3.user.js.sha256
```

A later retry returned:

```text
HTTP 422: Validation Failed
ReleaseAsset.name already exists
```

This confirms the GitHub Release/asset state became partial during the retries. The log also referenced:

```text
Release ID: 356462233
Release asset API ID observed: 482871619
```

Do not assume either asset is complete until it has been downloaded and verified.

## Root cause assessment

The evidence points to a GitHub service-side failure rather than a repository defect:

- validation passed repeatedly;
- deployment configuration passed;
- tag creation passed;
- asset generation passed;
- failures came from `uploads.github.com` and the GitHub Actions API;
- responses alternated between `502`, `503` and a duplicate-asset `422` after partial upload state was created.

## Repository cleanup state

Known one-time troubleshooting workflows were removed from `main` after use. The obsolete trigger PR was also closed without merge.

Before final release publication, confirm no file matching this pattern remains:

```text
.github/workflows/temporary-*.yml
```

No runtime rollback is required. The canonical v1.0.3 userscript should remain unchanged unless live MissionChief testing finds a separate runtime defect.

## Urgent recovery procedure

### 1. Confirm repository and tag state

```bash
git fetch origin main --tags --force
git rev-parse origin/main
git rev-list -n 1 v1.0.3
git show v1.0.3:src/missionchief-command-nexus.user.js \
  | sed -n 's#^//[[:space:]]*@version[[:space:]]*##p' \
  | head -n 1
```

Expected userscript version:

```text
1.0.3
```

Check that the tag commit contains no temporary workflow:

```bash
git ls-tree -r --name-only v1.0.3 \
  | grep '^.github/workflows/temporary-' || true
```

### 2. Inspect the partial release

```bash
gh release view v1.0.3 \
  --repo Team-Killing-Bastards/MissionChief-Command-Nexus \
  --json url,tagName,targetCommitish,isDraft,isPrerelease,assets
```

Look for:

- missing assets;
- duplicate names;
- zero-byte assets;
- an asset whose upload never completed;
- release target/tag mismatch.

### 3. Choose a clean recovery path

When the release is partial or inconsistent, remove it and its tag before recreating:

```bash
gh release delete v1.0.3 \
  --repo Team-Killing-Bastards/MissionChief-Command-Nexus \
  --yes \
  --cleanup-tag
```

Then use one of these routes after GitHub's service has recovered:

1. Run **Create GitHub release** with:
   - operation: `publish-release`
   - release tag: `v1.0.3`

2. Push a clean `v1.0.3` tag to the intended commit and allow the permanent tag-triggered workflow to run.

Do not move an existing valid tag silently. Delete and recreate it explicitly when the target is wrong.

### 4. Verify release assets

Required asset names:

```text
MissionChief-Command-Nexus-1.0.3.user.js
MissionChief-Command-Nexus-1.0.3.user.js.sha256
```

Download and validate:

```bash
rm -rf release-check
mkdir release-check

gh release download v1.0.3 \
  --repo Team-Killing-Bastards/MissionChief-Command-Nexus \
  --pattern 'MissionChief-Command-Nexus-1.0.3.user.js' \
  --pattern 'MissionChief-Command-Nexus-1.0.3.user.js.sha256' \
  --dir release-check \
  --clobber

cmp --silent \
  src/missionchief-command-nexus.user.js \
  release-check/MissionChief-Command-Nexus-1.0.3.user.js

cd release-check
sha256sum -c MissionChief-Command-Nexus-1.0.3.user.js.sha256
```

Expected SHA-256:

```text
69fda9776646c5e76d25101a847bd69eb269db2b151daf181bd016784513c0c3
```

### 5. Verify Greasy Fork

Confirm the Greasy Fork listing reports:

```text
Version 1.0.3
```

Compare Greasy Fork's served code with:

```text
https://raw.githubusercontent.com/Team-Killing-Bastards/MissionChief-Command-Nexus/main/src/missionchief-command-nexus.user.js
```

The release workflow's `scripts/release-notify.mjs` performs this verification before posting to Discord. Do not mark deployment complete from the version number alone; code parity must also pass.

### 6. Verify Discord notification

Once GitHub Release and Greasy Fork verification pass, run the permanent notification stage through the release workflow.

The Discord release post should confirm:

- deployment version `1.0.3`;
- GitHub update verified;
- Greasy Fork update verified;
- mission brief from the v1.0.3 changelog;
- build signature/checksum;
- install/update link;
- full release notes link;
- general Greasy Fork page link.

## Acceptance checklist

- [ ] Canonical source on `main` remains version `1.0.3`.
- [ ] Standard repository and userscript checks pass.
- [ ] No temporary troubleshooting workflows remain on `main`.
- [ ] `v1.0.3` tag points to the intended clean commit.
- [ ] GitHub Release `v1.0.3` exists and is not partial.
- [ ] `.user.js` asset downloads successfully.
- [ ] `.sha256` asset downloads successfully.
- [ ] Release asset matches the canonical source.
- [ ] SHA-256 verification passes.
- [ ] Greasy Fork serves version `1.0.3`.
- [ ] Greasy Fork source parity passes.
- [ ] Discord verified-release notification is delivered.
- [ ] Issue #33 contains the final release URL, commit, checksum and verification results.

## Important scope boundary

This handover covers **release publication only**. It does not reopen the completed v1.0.3 runtime implementation.

Any new MissionChief behaviour defect should be recorded separately with reproduction evidence. Existing examples include the Armed Police/ATC regression tracked in issue #30.
