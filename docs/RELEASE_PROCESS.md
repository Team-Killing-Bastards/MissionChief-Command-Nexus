# Release Process

Releases are controlled by **MartyBlyth**, the project developer. Repository and documentation assistance may be carried out by Conroy1988, but technical approval remains with MartyBlyth.

## Versioning

Use Semantic Versioning once release development begins:

- `MAJOR`: incompatible behaviour or data changes.
- `MINOR`: backward-compatible functionality.
- `PATCH`: backward-compatible fixes.

Pre-release identifiers may be used for testing, for example `1.0.0-alpha.1` or `1.0.0-rc.1`.

## Pre-release checklist

- [ ] Intended source changes are complete.
- [ ] Userscript metadata version matches the release version.
- [ ] Changelog entry is complete.
- [ ] Legacy-setting migration is tested where affected.
- [ ] Manual dispatch, patient and trained-personnel checks pass.
- [ ] Administrative preview and limited write tests pass.
- [ ] Long-session lifecycle checks pass.
- [ ] No debug logging or private information remains.
- [ ] Installation and update behaviour is tested from a clean profile.
- [ ] MartyBlyth approves the release candidate.

## Packaging

The release should contain:

- The installable `.user.js` file.
- Source commit reference.
- Release notes describing user-visible changes.
- Migration or compatibility warnings.
- SHA-256 checksum of the installable file where practical.

## GitHub release

1. Merge or approve the release candidate.
2. Update `CHANGELOG.md` with the release date.
3. Create an annotated version tag.
4. Publish a GitHub pre-release until validation is complete.
5. Attach the userscript artefact and checksum.
6. Verify the published file matches the approved source.
7. Promote to a stable release only after final approval.

## Greasy Fork publication

After GitHub verification:

1. Confirm metadata and licence compatibility.
2. Publish or update the unified Greasy Fork listing.
3. Verify the served userscript version and content.
4. Test a clean installation and update path.
5. Link the GitHub source, support and issue pages.

## Release notes

Release notes should include:

- What changed.
- Why the change matters.
- Any migration steps.
- Known limitations.
- Tested environments.
- Exact checksum when supplied.

Do not announce functionality that is incomplete or unverified.
