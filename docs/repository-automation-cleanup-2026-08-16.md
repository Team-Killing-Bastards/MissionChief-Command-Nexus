# Repository Automation Cleanup — 2026-08-16

This is the historical audit record for issues [#297](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/297), [#298](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/298) and [#296](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/296). The reviewed production baseline was commit `a2a2f6ca61934419fda6eebf98437b713b02280d`, Command Nexus `1.0.122` and Mission Finder `V10.6.160`.

## Executable artifact classification

| Artifact | Classification and disposition |
|---|---|
| `.github/build-v1086-dispatch-centre-first.trigger` | One-use builder trigger; removed. |
| `.github/v1086-active-builder-trigger.txt` | One-use validation-job trigger; removed. |
| `.github/v1086-naming-build-trigger.txt` | One-use naming builder trigger; removed. |
| `.github/greasyfork-sync-trigger.txt` | Synthetic release-sync push marker with no recovery role; removed. |
| `.github/workflows/build-naming-dispatch-centres-v1086.yml` | Obsolete old-branch workflow referencing a missing builder; removed. |
| `.github/workflows/fix-readme-engine-v1084.yml` | Completed self-deleting correction workflow; removed. |
| `.github/workflows/inspect-v1051-receipt-failure.yml` | Completed release-specific inspection bound to an old PR/job; removed. |
| `.github/workflows/run-auto-patient-transport-v1053.yml` | Completed one-use feature builder; removed. |
| `scripts/apply-auto-patient-transport-v1053.py` | One-use patcher paired with the old builder; removed. |
| One-shot `build_v1086` job inside `validate-userscript.yml` | Obsolete branch-mutating job; removed. |

The separately named `build-v1086-dispatch-centre-first.yml`, `publish-v1051-once.yml` and `publish-v1052-once.yml` examples from #297 were already absent from the reviewed main tree. Their remaining historical role was represented by old pull requests, which were classified and closed rather than copied back into permanent automation.

## Permanent paths retained

- `repository-quality.yml` remains the trusted-main integrity and release-state hinge.
- `release.yml` remains the canonical idempotent publisher.
- `release-delivery-repair.yml` remains a permanent, manual recovery path rather than a version-specific repair.
- `validate-userscript.yml` remains the read-only userscript gate and now discovers every permanent `scripts/check-*.mjs` file automatically.
- `.github/RELEASE_RECONCILIATION.md` remains the operational release-recovery record.
- Version-suffixed `scripts/check-*.mjs` files remain when they protect permanent behavior. Their suffix records regression origin; they no longer assert the current release number.

## Open pull-request review

Every pull request open at review time was inspected before closure. Each received an explanatory GitHub comment linking its production replacement or completed release.

| Pull request | Classification and evidence |
|---|---|
| #114 | Read-only IRV diagnostic; current Police IRV behavior has a permanent regression. |
| #116 | Branch-only live-updater audit; correction shipped in v1.0.24 and later production main. |
| #119 | Superseded Police Officer feature branch with a temporary patcher; behavior shipped in v1.0.24 and evolved later. |
| #158 | Read-only trained-coverage diagnostic marker; optimizer behavior is permanently tested. |
| #191 | Completed v1.0.51 publication marker; release assets and Discord receipt already exist. |
| #192 | Superseded patient-transport branch; v1.0.52 shipped and exact anchor/iframe regressions remain. |
| #194 | Completed v1.0.52 one-shot publication workflow; verified release already exists. |
| #196 | Completed v1.0.53 publication marker; verified release already exists. |
| #248 | Diagnostic-only runtime-memory builders and reports; production behavior shipped with permanent memory regressions. |
| #257 | Temporary prisoner-close workflows/builders; corrected behavior shipped in v1.0.114 with permanent result-close coverage. |

Issue #263's temporary v1.0.86 builder is superseded by this cleanup and the permanent auto-discovered validation suite.

## Validation evidence

The cleanup passed:

- YAML parsing for every retained workflow.
- Canonical userscript JavaScript syntax.
- Central metadata and component-version validation.
- Every permanent `scripts/check-*.mjs` regression.
- Repository integrity and temporary-artifact rejection.
- Release-control regressions.
- `git diff --check`.

The canonical userscript was not changed. Command Nexus remains `1.0.122`; this repository-maintenance change must not produce a new Greasy Fork build, GitHub version or Discord release notification.
