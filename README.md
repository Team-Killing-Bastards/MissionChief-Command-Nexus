<div align="center">

# MissionChief Command Nexus

### One userscript. One command layer. Total operational control.

MissionChief Command Nexus is a planned unified userscript for the UK version of [MissionChief](https://www.missionchief.co.uk/), combining intelligent mission dispatch with fleet, station and personnel administration.

![Development Status](https://img.shields.io/badge/status-pre--release-orange)
![Platform](https://img.shields.io/badge/platform-MissionChief%20UK-dc3545)
![Type](https://img.shields.io/badge/type-userscript-6f42c1)
![License](https://img.shields.io/badge/license-MIT-198754)

</div>

---

## Overview

MissionChief Command Nexus is being created by merging two established userscripts by **Martyblyth** into one coordinated operational toolkit:

| Existing userscript | Primary role |
|---|---|
| [Mission Finder 2026 Trained Personal Update](https://greasyfork.org/en/scripts/587607-mission-finder-2026-trained-personal-update/code) | Mission requirements, vehicle selection, staffing awareness, dispatch and mission automation |
| [MissionChief Unit, Station & Personnel Tools](https://greasyfork.org/en/scripts/587606-missionchief-unit-station-personnel-tools/code) | Unit naming, station naming, trained-personnel assignment, verification and reporting |

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
| Initial project documentation | ✅ Established |
| Source-script analysis | ✅ Complete |
| Unified userscript architecture | 🚧 Planned |
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

Do not install incomplete development files unless they are explicitly marked as a test build.

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

Development discussions, reproducible bug reports and targeted pull requests will be welcomed as the repository structure is established.

Useful reports should include:

- The affected MissionChief domain.
- The mission, station, vehicle or training profile involved.
- Expected behaviour.
- Actual behaviour.
- Reproduction steps.
- Relevant screenshots or console output with private information removed.

Large changes should be discussed in an issue before implementation so the unified architecture remains coherent.

---

## Project Team

- **Martyblyth** — original userscript author and lead developer.
- **Conroy1988** — repository creation, project presentation, documentation and release coordination.
- **Team Killing Bastards** — GitHub organisation and project home.

---

## Licence

The source userscripts are published under the **MIT Licence**. The unified project is intended to retain MIT licensing, with the final licence file to be included alongside the merged source.

---

<div align="center">

### MissionChief Command Nexus

**Build the resources. Understand the requirements. Dispatch with confidence.**

</div>
