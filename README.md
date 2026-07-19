<div align="center">

# MissionChief Command Nexus

### One userscript. One command layer. Total operational control.

MissionChief Command Nexus is a planned unified userscript for the UK version of [MissionChief](https://www.missionchief.co.uk/), combining intelligent mission dispatch with fleet, station and personnel administration.

![Development Status](https://img.shields.io/badge/status-pre--release-orange)
![Platform](https://img.shields.io/badge/platform-MissionChief%20UK-dc3545)
![Type](https://img.shields.io/badge/type-userscript-6f42c1)
[![License](https://img.shields.io/badge/license-MIT-198754)](LICENSE)

[Roadmap](docs/ROADMAP.md) • [Architecture](docs/ARCHITECTURE.md) • [Testing](docs/TESTING.md) • [Migration](docs/MIGRATION.md) • [Contributing](CONTRIBUTING.md) • [Support](SUPPORT.md)

</div>

---

## Overview

MissionChief Command Nexus is being created by merging two established userscripts developed by **MartyBlyth** into one coordinated operational toolkit:

| Existing userscript | Primary role |
|---|---|
| [Mission Finder 2026 Trained Personal Update](https://greasyfork.org/en/scripts/587607-mission-finder-2026-trained-personal-update/code) | Mission requirements, vehicle selection, staffing awareness, dispatch and mission automation |
| [MissionChief Unit, Station & Personnel Tools](https://greasyfork.org/en/scripts/587606-missionchief-unit-station-personnel-tools/code) | Unit naming, station naming, trained-personnel assignment, verification and reporting |

> [!NOTE]
> **Development attribution:** MissionChief Command Nexus is developed by **MartyBlyth**. **Conroy1988 is a project helper only**, assisting with repository setup, documentation and general support; he is not a developer of the userscript.

The merged project is intended to connect the full operational chain:

```text
Stations → Vehicles → Trained Personnel → Mission Requirements → Dispatch
```

Rather than maintaining separate tools with separate interfaces and lifecycle logic, Command Nexus will provide one userscript, one project identity and one coordinated control system.

## Why “Command Nexus”?

A **nexus** is the point where separate systems connect.

This project links the administrative side of MissionChief—stations, vehicles and qualified personnel—with the live operational side—mission requirements, unit selection, patient demand and dispatch.

That connection is the core purpose of the project.

---

## Planned Core Capabilities

### 🚨 Mission intelligence and dispatch

- Read mission vehicle and personnel requirements from MissionChief mission data.
- Read live requirement updates as incidents develop.
- Select suitable available vehicles against required quantities and capabilities.
- Account for patients, ambulances, critical-care demand and specialist resources.
- Recognise trained-personnel requirements and qualification-sensitive vehicles.
- Support manual **Unit Finder**, **Mission Update**, **Dispatch** and **Dispatch & Share** workflows.
- Display required-versus-selected vehicle progress in a live vehicle load panel.
- Assist with alliance mission participation and resource selection.

### ⚙️ Mission automation

- Process missions through an automated operating mode.
- Re-check missions that upgrade after initial dispatch.
- Handle mission progression and queue continuation.
- Support configurable queue-restart behaviour.
- Track transport and post-dispatch continuation states.
- Maintain session-level progress information.
- Control long-running observers, timers and interface updates to reduce performance degradation during extended sessions.

### 🚒 Fleet administration

- Scan stations and their assigned vehicles.
- Apply consistent unit naming across selected station types.
- Process one station or multiple matching stations from a chosen starting point.
- Pause, resume and stop batch operations.
- Track progress, renamed units, skipped records and processing logs.

### 🏢 Station administration

- Generate structured station names using available station and location information.
- Preview proposed changes before saving them.
- Rename one station or process multiple matching stations.
- Show before-and-after names, address data, progress and skipped entries.

### 👥 Personnel and training management

- Scan relevant stations, vehicles and personnel assignments.
- Match trained personnel to vehicles that require specific qualifications.
- Preview assignments without changing game data.
- Assign personnel and verify the resulting station state.
- Identify genuine training shortages separately from assignment or verification failures.
- Produce detailed station and overall run reports.
- Support medical Critical Care requirements and a broad range of verified Police training profiles.
- Maintain a shared training registry so mission selection can recognise vehicles carrying appropriately trained personnel.

---

## The Integrated Advantage

The most important benefit is not simply having fewer installed scripts.

Command Nexus is designed so the administrative tools can supply operational intelligence to the mission system. Personnel assignments and training records can inform which vehicles are genuinely suitable for qualification-sensitive missions, reducing blind vehicle selection and exposing real staffing shortfalls before dispatch.

```text
Configure resources once
        ↓
Build reliable training intelligence
        ↓
Use that intelligence during mission selection
        ↓
Dispatch the right capability—not merely the right vehicle label
```

---

## Development Status

> [!IMPORTANT]
> **MissionChief Command Nexus is currently in pre-release development.** The unified userscript has not yet been published from this repository.

| Component | Status |
|---|---|
| GitHub organisation and repository | ✅ Established |
| Project documentation and governance | ✅ Established |
| Source-script analysis | ✅ Complete |
| Architecture direction | ✅ Documented |
| Script merge and compatibility work | 🚧 Pending |
| Integrated testing | ⏳ Pending |
| First GitHub release | ⏳ Pending |
| Unified Greasy Fork release | ⏳ Pending |

Until the first integrated release is published, the two existing Greasy Fork scripts remain the active source implementations.

---

## Intended Architecture

The merged script will be organised as coordinated modules rather than one uncontrolled block of code:

```text
MissionChief Command Nexus
├── Core runtime and lifecycle management
├── Shared configuration and persistent storage
├── Unified interface and navigation
├── Mission requirement intelligence
├── Vehicle matching and dispatch control
├── Queue, upgrade and transport automation
├── Unit naming engine
├── Station naming engine
├── Personnel and training engine
├── Training registry and shared capability data
└── Reporting, diagnostics and release metadata
```

The merge should preserve the proven behaviour of both source scripts while eliminating duplicated interfaces, global state, observers, timers and storage handling wherever possible.

See the full [Architecture Direction](docs/ARCHITECTURE.md).

---

## Merge Priorities

1. Preserve the working behaviour of both original scripts.
2. Establish a single safe initialization and cleanup lifecycle.
3. Prevent duplicate panels, listeners, observers and background timers.
4. Retain or safely migrate existing user preferences and training-registry data.
5. Create one coherent interface without hiding advanced controls.
6. Keep preview modes available before any bulk rename or personnel assignment.
7. Validate mission selection against patient and trained-personnel requirements.
8. Test extended sessions for memory growth and repeated-render issues.
9. Introduce consistent versioning, changelogs and release packaging.
10. Publish a controlled GitHub release before replacing the separate installations.

The phased plan is maintained in the [Project Roadmap](docs/ROADMAP.md).

---

## Project Resources

| Resource | Purpose |
|---|---|
| [Documentation index](docs/README.md) | Central navigation for project documentation |
| [Architecture](docs/ARCHITECTURE.md) | Proposed modules, lifecycle, shared state and storage design |
| [Roadmap](docs/ROADMAP.md) | Phased development path to the first release |
| [Testing strategy](docs/TESTING.md) | Safety, correctness, compatibility and stability checks |
| [Migration plan](docs/MIGRATION.md) | Transition from the two separate scripts |
| [Release process](docs/RELEASE_PROCESS.md) | Versioning, approval, packaging and publication |
| [Changelog](CHANGELOG.md) | User-visible project and release history |
| [Contributing](CONTRIBUTING.md) | Standards for issues and pull requests |
| [Support](SUPPORT.md) | Required information and support boundaries |
| [Security](SECURITY.md) | Sensitive-reporting policy |
| [Code of Conduct](CODE_OF_CONDUCT.md) | Community participation standards |

---

## Repository Structure

```text
MissionChief-Command-Nexus/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── CODEOWNERS
│   └── pull_request_template.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MIGRATION.md
│   ├── RELEASE_PROCESS.md
│   ├── ROADMAP.md
│   └── TESTING.md
├── src/
│   └── README.md
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
├── SUPPORT.md
└── README.md
```

The `src` directory is reserved for the unified userscript developed by MartyBlyth.

---

## Supported Environment

The existing source scripts target:

- `https://www.missionchief.co.uk/*`
- `https://police.missionchief.co.uk/*`

The completed project will require a userscript manager such as:

- Tampermonkey
- Violentmonkey
- Greasemonkey
- Userscripts for Safari

Exact browser and device support will be documented after integrated testing.

---

## Installation

There is no unified installation package yet.

When the first release is ready, this section will provide:

- A direct userscript installation link.
- GitHub Release downloads.
- Greasy Fork installation and update support.
- Upgrade guidance for users of the two original scripts.
- Migration notes for saved settings and personnel-training data.

Do not install incomplete development files unless they are explicitly marked as a test build. See the [Migration Plan](docs/MIGRATION.md) before replacing either original script.

---

## Safety and Responsible Use

Command Nexus can eventually perform actions that alter MissionChief data or initiate operational workflows, including vehicle naming, station naming, personnel assignment and dispatch.

- Use **Preview** modes before bulk changes.
- Test new releases on a limited scope before running large batches.
- Review selected vehicles before dispatch while testing pre-release builds.
- Keep account-specific naming conventions and operational policies under your own control.
- Automation remains the operator’s responsibility.

> [!CAUTION]
> This is an independent community project. It is not affiliated with, endorsed by or officially supported by MissionChief or its operators. Use it at your own risk and in accordance with the game’s rules.

---

## Contributing

Development discussions, reproducible bug reports and targeted pull requests are welcome.

- Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting work.
- Use the structured [issue forms](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/new/choose).
- Review the [testing strategy](docs/TESTING.md) for validation expectations.
- Discuss large architectural changes before implementation.

MartyBlyth remains the final technical authority for source-code decisions and releases.

---

## Project Team

- **MartyBlyth** — project creator, original userscript author and developer.
- **Conroy1988** — project helper, assisting with repository setup, documentation and general support. He is not a developer of the userscript.
- **Team Killing Bastards** — GitHub organisation and project home.

---

## Licence

MissionChief Command Nexus is licensed under the [MIT Licence](LICENSE).

Copyright © 2026 **MartyBlyth**.

---

<div align="center">

### MissionChief Command Nexus

**Build the resources. Understand the requirements. Dispatch with confidence.**

</div>
