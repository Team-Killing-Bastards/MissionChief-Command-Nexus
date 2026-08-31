# Contributing to MissionChief Command Nexus

MissionChief Command Nexus is developed and technically owned by **MartyBlyth**. Community reports, sanitized testing evidence, documentation improvements and focused pull requests are welcome.

**Conroy1988 provides repository, documentation and general project support; he is not a userscript developer.**

## Start with the current baseline

Before changing source code:

1. Read [Current Project State](docs/PROJECT_STATE.md) and its linked accepted decisions.
2. Read [Developer Handoff](docs/DEVELOPER_HANDOFF.md).
3. Read the relevant open issue and the [master v1.0.x tracker](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/10).
4. Pull the latest `main` branch.
5. Confirm the current version in `src/missionchief-command-nexus.user.js`.
6. Record current behaviour in the same MissionChief environment before modifying it.

## Repository workflow

Trusted organisation owners retain direct `main` push access for maintenance and emergency work. Substantial userscript development should still use a focused branch and pull request because the PR workflow provides version-increase validation, review context and an evidence record.

Recommended branch names:

```text
feature/<short-description>
fix/<short-description>
docs/<short-description>
chore/<short-description>
```

Avoid combining unrelated source, formatting and documentation work in one pull request.

## Canonical source

The installable source is:

```text
src/missionchief-command-nexus.user.js
```

Do not add a second distributable userscript, duplicate metadata block or alternative production source without prior technical agreement.

## Current project-state maintenance

`project-state.json` is the machine-readable operating index. Edit it whenever a release, accepted operating contract, current evidence, risk or next work changes. Then run:

```bash
node scripts/render-project-state.mjs
node scripts/check-project-state.mjs
```

Do not hand-edit `docs/PROJECT_STATE.md`; it is generated. Important architectural changes require a new or superseding ADR in `docs/decisions/`. Raw diagnostics belong outside current state; add only a sanitised summary under `docs/evidence/` when the evidence must remain durable.

## Source changes

Every source change intended for publication must:

- Increase `@version` using `MAJOR.MINOR.PATCH`.
- Update `CHANGELOG.md` with user-visible behaviour.
- Preserve MartyBlyth as the userscript `@author` unless he explicitly changes that metadata.
- Preserve existing stored settings or include a documented migration and rollback path.
- Avoid credentials, account data, webhook URLs and private alliance information.
- Avoid unnecessary global variables, observers, timers and full-page DOM scans.
- Include cancellation and cleanup for new long-running work.
- Include sanitized validation evidence.

Documentation-only and repository-administration changes must not increase the userscript version unless the userscript source also changes.

## Required local checks

Run from the repository root:

```bash
node --check src/missionchief-command-nexus.user.js
node scripts/validate-userscript.mjs
node scripts/render-project-state.mjs --check
node scripts/check-project-state.mjs
for check in scripts/check-*.mjs; do node "$check"; done
python3 scripts/check_repository.py
```

Pull requests that change the userscript also fail when `@version` is not higher than the base branch.

## Live validation

Record:

- Command Nexus version and commit.
- MissionChief domain.
- Browser and version.
- Userscript manager and version.
- Operating system or device.
- Other enabled userscripts.
- Exact reproduction or test steps.
- Expected and actual behaviour.
- Whether the workflow was preview, manual assisted, automatic or a live write.

Use the smallest safe scope first. Preview administrative changes before writes, and test manual mission controls before Auto Mode.

## High-risk areas

Changes involving these systems require explicit risk and rollback notes:

- Dispatch and repeated-submission guards.
- Patients, ambulances and specialist medical demand.
- Trained-personnel matching and the shared registry.
- Personnel assignment and verification.
- Bulk station or vehicle naming.
- Storage keys and legacy migration.
- Queue continuation and transport handling.
- Mission-instance ownership.
- Observers, listeners, intervals, timeouts and navigation cleanup.

## Bug reports

A useful bug report includes:

- One reproducible problem.
- Exact environment and version information.
- Minimal reproduction steps.
- Expected and actual behaviour.
- Sanitized console output where relevant.
- Whether the issue persists with other userscripts disabled.
- Whether the issue can dispatch, rename, assign or modify stored data incorrectly.

Security-sensitive reports must follow [SECURITY.md](SECURITY.md) rather than a public issue.

## Pull requests

Use the repository template and include:

- User impact and technical rationale.
- Linked issue where applicable.
- Exact validation commands.
- Live test environment and result.
- Storage or migration impact.
- Lifecycle and performance impact.
- Failure modes and rollback.
- Sanitized evidence.

MartyBlyth remains the final technical approver for userscript source and releases.

## Development principles

- Protect proven behaviour before refactoring it.
- Distinguish implemented code from tested behaviour.
- Treat mission selection, personnel training and stored user data as high risk.
- Keep preview and bounded-scope controls available.
- Prevent duplicate interfaces and background work.
- Prefer event-driven or scoped observation over repeated full-page scanning.
- Do not claim compatibility without evidence.
- Do not release merely because automated checks are green.

## Attribution and licence

Describe each contribution accurately. Repository administration, documentation or testing assistance must not be represented as userscript authorship unless source code was actually authored.

By contributing, you agree that your contribution may be distributed under the repository's [MIT Licence](LICENSE).
