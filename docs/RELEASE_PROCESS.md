# Release Process

Releases are controlled by **MartyBlyth**, the project developer. Repository and documentation assistance may be carried out by Conroy1988, but technical approval remains with MartyBlyth.

## Versioning

Use Semantic Versioning:

- `MAJOR`: incompatible behaviour or data changes.
- `MINOR`: backward-compatible functionality.
- `PATCH`: backward-compatible fixes.

The installable source must use `MAJOR.MINOR.PATCH` in its `@version` metadata. Every Greasy Fork publication requires a newer version than the currently published build.

## Authoritative source

The distributable file is:

```text
src/missionchief-command-nexus.user.js
```

Greasy Fork synchronizes from the raw `main` branch URL documented in [GREASY_FORK_SETUP.md](GREASY_FORK_SETUP.md). Feature branches and release assets are not publication sources.

## Pre-release checklist

- [ ] Intended source changes are complete.
- [ ] Userscript metadata version was increased and matches the intended release.
- [ ] Changelog entry is complete.
- [ ] JavaScript syntax and repository validation pass.
- [ ] Legacy-setting migration is tested where affected.
- [ ] Manual dispatch, patient and trained-personnel checks pass.
- [ ] Administrative preview and limited write tests pass.
- [ ] Long-session lifecycle checks pass.
- [ ] No debug logging or private information remains.
- [ ] Installation and update behaviour is tested from a clean profile.
- [ ] MartyBlyth approves the release candidate.

## Pull request validation

Source changes must pass:

```bash
node --check src/missionchief-command-nexus.user.js
node scripts/validate-userscript.mjs
python3 scripts/check_repository.py
```

The pull-request workflow also checks that a changed userscript has a higher `@version` than the base branch.

## Greasy Fork publication

Greasy Fork has no write API for direct unattended publishing. Publication uses its supported external synchronization and GitHub webhook flow:

1. Merge the approved pull request to `main`.
2. GitHub sends the repository push event to the private Greasy Fork webhook URL.
3. Greasy Fork fetches the raw `main` userscript.
4. Greasy Fork publishes the build when the metadata and newer version are valid.
5. Verify the served code, version and clean install/update path.

The one-time account and webhook setup is documented in [Greasy Fork Automated Release Setup](GREASY_FORK_SETUP.md).

## GitHub release

After the merged version is visible and verified on Greasy Fork:

1. Create the matching tag, for example `v1.0.1` for `@version 1.0.1`.
2. Push the tag.
3. The release workflow verifies that the tag exactly matches `@version`.
4. GitHub creates a release containing the installable `.user.js` file and SHA-256 checksum.
5. Verify the release artefacts match the approved source.

A GitHub tag/release does not publish to Greasy Fork. The merge to `main` and Greasy Fork webhook perform that publication.

## Release notes

Release notes should include:

- What changed.
- Why the change matters.
- Any migration steps.
- Known limitations.
- Tested environments.
- Exact checksum when supplied.

## Emergency rollback

Do not lower or reuse a published version. Restore the last known-good source on a new branch, increase the patch version, run all checks, merge it to `main`, and verify the resulting Greasy Fork update.

To suspend publication, deactivate the repository webhook and switch Greasy Fork synchronization to manual while the issue is investigated.

Do not announce functionality that is incomplete or unverified.
