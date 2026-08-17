# Command Nexus Documentation

This directory separates current operating guidance from versioned historical records. The current production baseline is Command Nexus `1.1.3` with Mission Finder `V10.7.1`.

## Current operational documentation

- [Developer Handoff](DEVELOPER_HANDOFF.md) — verified baseline, implementation shape, risks and safe resume workflow.
- [Architecture](ARCHITECTURE.md) — current runtime boundaries, safety contracts and consolidation direction.
- [Project Roadmap](ROADMAP.md) — completed production foundation and active engineering priorities.
- [Testing Strategy](TESTING.md) — complete automated gate, live workflow coverage and evidence rules.
- [Migration Guide](MIGRATION.md) — safe transition from legacy installations and rollback expectations.
- [Release Process](RELEASE_PROCESS.md) — versioning, approval, trusted-main reconciliation and completion records.
- [Greasy Fork Automated Release Setup](GREASY_FORK_SETUP.md) — synchronization configuration, verification and recovery.
- [MissionChief User Logger backend](../integrations/google-apps-script/README.md) — paired Google Apps Script deployment, workbook schema, backups and privacy boundary.

## Historical records

These files preserve the exact state and recovery context of a past version. They are not current operating instructions and should remain immutable except for a clearly marked archival correction.

- [v1.0.3 Release Handover](HANDOVER_V1_0_3_RELEASE.md) — historical release-blocker and recovery record.
- [v1.0.82 Discord Release Layout Incident](discord-release-layout-incident-v1.0.82.md) — historical notification incident and verification record.
- [Repository Automation Cleanup — 2026-08-16](repository-automation-cleanup-2026-08-16.md) — obsolete executable-artifact and stale pull-request classification record.

## Canonical project resources

- [Main README](../README.md)
- [Canonical userscript](../src/missionchief-command-nexus.user.js)
- [Source directory guide](../src/README.md)
- [Changelog](../CHANGELOG.md)
- [Contributing guide](../CONTRIBUTING.md)
- [Support policy](../SUPPORT.md)
- [Security policy](../SECURITY.md)
- [Active GitHub issues](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues)

## Authority and attribution

**MartyBlyth is the project developer, technical owner and final release authority.**  
**Conroy1988 assists with repository setup, documentation and general project support; he is not a userscript developer.**

Documentation must distinguish implemented code, executable regression coverage, live-tested evidence and release-approved behavior.
