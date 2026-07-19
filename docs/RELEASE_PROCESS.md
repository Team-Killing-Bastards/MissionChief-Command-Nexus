# Release Process

Releases are controlled by **MartyBlyth**, the project developer and final technical authority. Conroy1988 may assist with repository administration, documentation, packaging verification and release presentation; that assistance does not constitute technical approval.

## Versioning

Command Nexus uses Semantic Versioning:

- `MAJOR`: incompatible behaviour, storage or migration changes.
- `MINOR`: backward-compatible functionality.
- `PATCH`: backward-compatible fixes.

The canonical userscript must use `MAJOR.MINOR.PATCH` in `@version`. Every externally synchronized publication requires a version higher than the currently served build.

Documentation-only and repository-administration changes do not require a userscript version increase unless `src/missionchief-command-nexus.user.js` changes.

## Authoritative source

The only distributable source is:

```text
src/missionchief-command-nexus.user.js
```

External synchronization must fetch the raw `main` file documented in [GREASY_FORK_SETUP.md](GREASY_FORK_SETUP.md). Feature branches, pull-request refs, copied text files and GitHub Release assets are not live publication sources.

## Development path

Substantial source work should use a focused branch and pull request even though trusted organisation owners retain direct `main` push access.

```text
Current main
    ↓
Focused source branch
    ↓
Version increase + changelog
    ↓
Automated and live validation
    ↓
MartyBlyth approval
    ↓
Approved main source
```

Direct `main` commits are appropriate for agreed maintenance, documentation and emergencies, but they do not remove the need for versioning, validation or technical approval when userscript behaviour changes.

## Required automated checks

Run from the repository root:

```bash
node --check src/missionchief-command-nexus.user.js
node scripts/validate-userscript.mjs
python3 scripts/check_repository.py
```

The userscript pull-request workflow also requires a higher `@version` than the base branch when source code changes.

## Required live checks

Select the relevant tests from [TESTING.md](TESTING.md). A release candidate must cover, where affected:

- Manual Unit Finder and Mission Update.
- Patient and ambulance demand.
- Specialist medical demand.
- Trained-personnel and qualification-sensitive missions.
- Dispatch, Dispatch & Share and Auto Mode.
- Mission upgrades.
- Queue and transport continuation.
- Preview and bounded administrative writes.
- Personnel assignment and verification.
- Stop, cancellation and navigation cleanup.
- Legacy migration and rollback.
- Long-session stability.

Record exact domains, browsers, userscript managers, operating systems and interacting scripts.

## Release-candidate checklist

- [ ] Intended source changes are complete.
- [ ] `@version` is increased and correct.
- [ ] `CHANGELOG.md` is complete.
- [ ] Automated checks pass.
- [ ] Required live regression checks pass.
- [ ] Migration and stored-data impact are tested.
- [ ] Known limitations and compatibility evidence are documented.
- [ ] No credentials, webhook URLs, account data or temporary debug output remain.
- [ ] Clean installation and update behaviour are verified.
- [ ] The exact approved source commit is recorded.
- [ ] MartyBlyth approves the release candidate.

## External synchronization

The supported publication flow is:

1. Put the approved source on `main`.
2. GitHub sends the configured push event to the private synchronization webhook.
3. The external service fetches the raw canonical userscript.
4. A new build is published only when its metadata and higher version are valid.
5. Verify the served version and code.
6. Perform a clean install or update test from the public route.

A successful webhook response proves delivery, not correct publication. Verify the served source directly.

## GitHub Release packaging

After the approved version is visible and verified through the public update route:

1. Create the matching tag, for example `v1.0.2` for `@version 1.0.2`.
2. Push the tag.
3. The release workflow checks that the tagged commit is contained in `main`.
4. The workflow runs repository and userscript validation.
5. The workflow checks that the tag exactly matches `@version`.
6. The workflow copies the canonical source to a versioned `.user.js` asset.
7. The workflow generates a SHA-256 checksum file.
8. GitHub creates the release from the verified existing tag.
9. Verify both assets against the approved source.

A GitHub tag or release does not publish the external userscript. The approved `main` source and synchronization webhook perform that publication.

## Release notes

Release notes must include:

- User-visible changes and why they matter.
- Migration and stored-data impact.
- Tested MissionChief domains.
- Tested browsers and userscript managers.
- Interacting scripts used during testing.
- Known limitations and unsupported environments.
- Exact source commit.
- Exact asset checksum.
- Rollback guidance.

## Emergency stop and rollback

To suspend automatic external publication:

1. Deactivate the repository synchronization webhook.
2. Switch external synchronization to manual where available.
3. Investigate on a branch.

Do not lower or reuse a published version. Restore the last known-good behaviour in a new, higher patch version, run all required checks, obtain approval, publish through `main`, and verify the resulting update.

For a serious live defect, prioritize stopping unsafe dispatch, repeated submissions, bulk writes or stored-data changes over preserving automation continuity.

## Completion record

Update the [master v1.0.x tracker](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/10) with the source commit, public version, tag, release URL, checksum, tested environments and approval outcome.

Start with [Developer Handoff](DEVELOPER_HANDOFF.md) when resuming development.
