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
for check in scripts/check-*.mjs; do node "$check"; done
python3 scripts/check_repository.py
git diff --check
```

The userscript pull-request workflow discovers and runs the complete permanent regression suite. It also requires a higher `@version` than the base branch when source code changes. Canonical release and component-version assertions belong only to `validate-userscript.mjs`; behavioral checks must remain version-agnostic.

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

1. Merge the approved source to trusted `main`.
2. Repository Quality validates trusted main and inspects the canonical version's release state.
3. If the version is already complete, reconciliation stops without duplicate assets or notifications.
4. If the version is new or incomplete, the reusable release workflow validates, packages and reconciles the release.
5. Greasy Fork synchronization fetches the raw canonical userscript and accepts only valid higher versions.
6. Verify the served version and code, then perform a clean install or update test.
7. Verify one Discord delivery receipt for the version.

A successful webhook or workflow response proves delivery activity, not correct publication. Verify the served source and recorded receipts directly.

## GitHub Release packaging

For a new canonical version, release reconciliation:

1. Requires a matching tag, for example `v1.0.123` for `@version 1.0.123`.
2. Confirms the tagged commit is contained in trusted `main`.
3. Runs repository, syntax, metadata and permanent regression validation.
4. Copies the canonical source to a versioned `.user.js` asset.
5. Generates and verifies the SHA-256 checksum asset.
6. Creates or repairs the GitHub Release idempotently.
7. Records the verified external-delivery outcome.

A GitHub tag or release does not by itself prove the external userscript was published. The approved `main` source, synchronization result and served-source verification together provide that evidence.

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

For every production release, record the pull request, merge commit, public version, tag, release URL, checksums, tested environments, Greasy Fork result, Discord receipt and approval outcome in the relevant GitHub issue or release record.

After a production release or an owner-approved operating-contract change, update the connected Google Memory Bank and Rules documents with what actually merged—not the planned state. Include the PR, merge commit, canonical versions, permanent regression or repository guard, delivery outcome and any rule that future work must preserve. Read the edited sections back to verify the records before declaring the work complete.

Repository-only maintenance must record that the canonical userscript was unchanged and that release reconciliation correctly avoided a duplicate publication.

Start with [Developer Handoff](DEVELOPER_HANDOFF.md) when resuming development.
