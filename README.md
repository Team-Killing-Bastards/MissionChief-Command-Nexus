<div align="center">

<img src="docs/media/readme-hero.svg" alt="MissionChief Command Nexus operational control system" width="100%">

# MissionChief Command Nexus

### Resource preparation, trained-personnel intelligence, mission matching and dispatch — in one MissionChief UK userscript.

<table>
<tr>
<td width="25%" align="center"><a href="https://greasyfork.org/en/scripts/587702-missionchief-command-nexus"><strong>⬇ INSTALL / UPDATE</strong><br><sub>Recommended Greasy Fork route</sub></a></td>
<td width="25%" align="center"><a href="src/missionchief-command-nexus.user.js"><strong>⌘ VIEW SOURCE</strong><br><sub>Canonical userscript</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/latest"><strong>◈ LATEST RELEASE</strong><br><sub>Verified assets and checksum</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues"><strong>⚠ ISSUES</strong><br><sub>Bugs, limitations and planned work</sub></a></td>
</tr>
</table>

**Current version:** `1.0.12` · **Release status:** Production · **Platform:** [MissionChief UK](https://www.missionchief.co.uk/) · **Licence:** [MIT](LICENSE)

[![Userscript validation](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/validate-userscript.yml/badge.svg)](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/validate-userscript.yml)
[![Repository quality](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/repository-quality.yml/badge.svg)](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/repository-quality.yml)

[What it is](#what-it-is) · [Install](#install) · [Workflows](#operational-workflows) · [Current capabilities](#current-v106-capabilities) · [Limitations](#known-limitations) · [Safety](#operational-safety) · [Release system](#release-and-quality-system) · [Development](#development-and-support)

</div>

---

## What it is

MissionChief Command Nexus combines two established MartyBlyth systems into one installable userscript:

- **Mission Finder** — mission requirements, trained-personnel matching, vehicle selection, Mission Update, Auto Mode, dispatch and continuation.
- **Unit, Station & Personnel Tools** — station naming, vehicle naming, personnel assignment, training intelligence and reporting.

The operational chain is:

```text
Stations → Vehicles → Personnel → Training Capability → Mission Requirements → Selection → Dispatch
```

Command Nexus is one distributed `.user.js` file with one metadata block and one outer installation guard. Internally, it deliberately retains two established runtime engines so resource administration and mission operations can start, fail and clean up independently.

The primary integration between those engines is the **vehicle-training register**. Personnel workflows can verify who is assigned to each vehicle and record that capability; mission selection can then use exact vehicle identity and training evidence instead of relying on a vehicle label alone.

> [!IMPORTANT]
> MissionChief Command Nexus is developed by **MartyBlyth**, the project creator, userscript author and technical owner. **Conroy1988 is the project helper** for repository setup, documentation and general support; he is **not a userscript developer**.

## Install

### Recommended — Greasy Fork

1. Install a userscript manager such as **Tampermonkey** or **Violentmonkey**.
2. Open **[MissionChief Command Nexus on Greasy Fork](https://greasyfork.org/en/scripts/587702-missionchief-command-nexus)**.
3. Select **Install this script** or **Update**.
4. Disable both legacy standalone scripts:
   - Mission Finder 2026 Trained Personal Update
   - MissionChief Unit, Station & Personnel Tools
5. Reload MissionChief.

> [!WARNING]
> Keep **one active Command Nexus installation only**. The two legacy scripts are already included and must not remain enabled beside Command Nexus.

### Canonical GitHub source

The authoritative repository source is:

**[Install or inspect the canonical `main` build](https://raw.githubusercontent.com/Team-Killing-Bastards/MissionChief-Command-Nexus/main/src/missionchief-command-nexus.user.js)**

Greasy Fork is the recommended update channel for normal users. The `main` branch file remains the project source of truth used for validation and release publication.

## Operational workflows

### 1. Resource administration

Command Nexus provides controlled administration workflows for stations, vehicles and personnel.

| Area | Current behaviour |
|---|---|
| **Station naming** | Generates and previews structured station names from available station and location data. |
| **Vehicle naming** | Applies repeatable captions and numbering across supported station and vehicle types. |
| **Scoped batch processing** | Processes a chosen station scope with progress, pause, resume and stop controls where supported. |
| **Personnel Assignment** | Finds trained personnel, plans eligible vehicle assignments, supports Preview and Live modes, then verifies submitted changes. |
| **Build Personnel Register** | Scans every discovered station type and each vehicle's own assignment page without changing assignments. |
| **Training register** | Stores verified vehicle/personnel capability for exact qualification-aware mission selection. |
| **Reporting** | Separates changed, skipped, failed, unfilled and genuine training-shortage outcomes. |

### 2. Mission operations

The mission engine reads the current mission state and attempts to select the capability still required.

| Area | Current behaviour |
|---|---|
| **Unit Finder** | Parses requirements and selects mapped vehicles and trained personnel. |
| **Mission Update** | Re-reads a mission after requirements change and adds newly required capability. |
| **Auto Mode** | Loads the complete vehicle list, evaluates requirements, selects resources, checks readiness and dispatches as a managed cycle. |
| **Live requirement preference** | Uses the live Mission Requirements table when available; older alert text is treated as fallback evidence. |
| **Patient demand** | Accounts for visible patients and ambulance demand when mission text alone is incomplete. |
| **Exact trained-vehicle matching** | Uses vehicle IDs and verified assignment/training data for specialist capability. |
| **Mission continuation** | Handles mission upgrades, queue continuation, unattended-mission recovery and visible patient or prisoner transport controls. |
| **Session diagnostics** | Records completed, skipped and blocked outcomes while guarding against stale missions and repeated dispatch. |

### 3. Complete vehicle-list loading

MissionChief can initially show only part of the available vehicle table. Before Unit Finder, Mission Update or Auto Mode selects anything, Command Nexus now:

1. Detects every visible `Load more vehicles` / `missing_vehicles_load` control.
2. Loads each `offset_page` sequentially.
3. Confirms that the vehicle IDs or row count actually changed.
4. Waits for loading controls and indicators to settle.
5. Requires the final non-zero vehicle list to remain ID-stable.
6. Fails closed when the mission changes, loading stalls or the bounded timeout is reached.

This prevents selection or dispatch from running against an incomplete vehicle list.

## Current v1.0.6 capabilities

Version `1.0.6` is the current canonical and tagged production build.

### Police

- Ordinary Police attendance is protected from consuming IRVs carrying specialist-trained officers.
- Police Officer upgrade rows convert at **two officers per normal Police IRV**.
- **Police Medic** requirements use exact IRVs containing two Police Medic-trained personnel.
- **Railway Police Officer** requirements use exact IRVs containing two Railway Police-trained personnel.
- **Armed Response Personnel (In Armed Vehicles)** uses type-25 Armed Traffic Cars with two personnel who each hold both Roads Policing and Firearms training.
- Exact assignment-page evidence is preferred; incomplete or structurally invalid scans fail closed rather than authorising a specialist decision.

### Medical

- Patient and ambulance demand is reconciled across repeated selection passes.
- Normal Ambulances require **one Critical Care-trained person** for Medical Critical Care assignment planning.
- Specialist medical capability is selected only where an explicit mapping and verified personnel evidence exist.

### Fire, rescue and specialist vehicles

- Seagoing Vessel requirements match exact **ALB / ABL / All-weather Lifeboat** display variants.
- ATV Carrier matching targets authoritative vehicle type `30`, including supported ATV and ATC Carrier display aliases without confusing it with Armed Traffic Cars.
- Live mission upgrades are re-read before additional selection.

### Personnel intelligence

- **Build Personnel Register** scans every station type and each discovered vehicle individually.
- Each vehicle's own assignment page is read before capability is recorded.
- The register builder is read-only: it does not rename vehicles or change personnel assignments.
- Personnel Assignment still supports Preview and Live workflows for implemented training profiles.

## Known limitations

Command Nexus is operational software, but it is not a claim that every MissionChief vehicle, training course or mission requirement has been mapped.

| Limitation | Current position |
|---|---|
| **Country coverage** | UK-specific. Other MissionChief country versions are not supported. |
| **Primary environment** | MissionChief UK desktop is the primary development and operational environment. |
| **Training-profile coverage** | Medical, Fire, Airfield, SAR, Mountain Rescue and Coastguard profile coverage is not yet complete. |
| **Fire specialist requirements** | Water Carrier, HazMat and ICCU matching remains blocked until the external Mission Requirements panel exposes stable usable requirement data. |
| **PSU personnel priority** | Personnel Assignment does not yet prioritise nine-seat Police Support Units before IRV fallback. |
| **Interface consolidation** | Command Nexus is one installation, but the two retained engines do not yet share one fully consolidated control surface, storage model or lifecycle framework. |
| **Mobile and Safari** | No broad support claim is made without device-specific testing evidence. |
| **Live-game variability** | MissionChief markup, labels and available controls can change independently of this project. |

Track confirmed gaps and planned work in:

- [Issue #17 — remaining medical training profiles](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/17)
- [Issue #18 — remaining Fire and Airfield profiles](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/18)
- [Issue #19 — remaining SAR, Mountain Rescue and Coastguard profiles](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/19)
- [Issue #20 — Water Carrier, HazMat and ICCU requirements](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/20)
- [Issue #43 — PSU-first trained-personnel assignment](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/43)

## Operational safety

Command Nexus can select and dispatch vehicles and can make bulk account changes through its administration tools. Use it as controlled automation, not as an infallible authority.

- Use **Preview** before naming or personnel-assignment writes.
- Test one small station scope before a large batch.
- Keep only one Command Nexus installation active.
- Build or refresh the Personnel Register before relying on exact specialist matching.
- Observe Auto Mode on representative missions before unattended use.
- Treat unsupported requirements and staffing shortages as blocking conditions.
- Review the [changelog](CHANGELOG.md) and [open issues](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues) before a large deployment.
- Stop and report any cross-mission selection, repeated dispatch or incorrect personnel assignment.

Supported URL patterns:

```text
https://www.missionchief.co.uk/*
https://police.missionchief.co.uk/*
```

## Architecture

```text
MissionChief Command Nexus
│
├── One metadata block and combined installation guard
│
├── Resource Administration Engine
│   ├── Station and vehicle naming
│   ├── Personnel Assignment
│   ├── Build Personnel Register
│   ├── Training profiles and exact assignment scans
│   └── Reports, persistence and cleanup
│
├── Shared vehicle-training register
│
└── Mission Operations Engine
    ├── Requirement and patient parsing
    ├── Complete vehicle-list loading
    ├── Exact vehicle and trained-personnel matching
    ├── Unit Finder and Mission Update
    ├── Auto Mode, dispatch and sharing
    └── Mission upgrades, queue and transport continuation
```

The project intentionally remains a single-file userscript distribution. Future consolidation is about safer shared contracts and a clearer interface—not splitting files merely for appearance.

See [Architecture](docs/ARCHITECTURE.md) and [Developer Handoff](docs/DEVELOPER_HANDOFF.md) for engineering detail.

## Release and quality system

`src/missionchief-command-nexus.user.js` on `main` is the authoritative source.

```text
Focused source change
        ↓
Version + changelog update
        ↓
Pull request validation and review
        ↓
Merge into trusted main
        ↓
Automatic unpublished-version detection
        ↓
Idempotent GitHub Release publication
        ↓
Asset download + SHA-256 verification
        ↓
Immutable GitHub source + Greasy Fork parity
        ↓
Discord release announcement
```

### Validation

The repository checks:

- JavaScript syntax.
- Required userscript metadata.
- Version consistency between source, README, source guide and changelog.
- Repository structure and required policy files.
- README links, anchors, hero artwork and GitHub-native badges.
- Sensitive attribution and source ownership requirements.

### Release publication

After a pull request is merged, the repository-quality workflow inspects the canonical version. When the matching release or required assets are missing, it invokes the permanent release workflow.

Publication is designed to be recoverable:

- Existing correct assets are recognised and retained.
- Partial, zero-byte, `starter` or checksum-mismatched assets are removed.
- Transient GitHub upload failures are retried with bounded backoff.
- Assets are uploaded serially and downloaded again for verification.
- The release remains a recoverable draft until every required asset is valid.
- Discord is notified only after the release, immutable GitHub source and Greasy Fork source all match.

| Release resource | Open |
|---|---|
| Latest GitHub Release | [Releases](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/latest) |
| Version history | [CHANGELOG.md](CHANGELOG.md) |
| Automatic release detection | [`.github/workflows/repository-quality.yml`](.github/workflows/repository-quality.yml) |
| Release workflow | [`.github/workflows/release.yml`](.github/workflows/release.yml) |
| Idempotent publisher | [`scripts/publish-release.mjs`](scripts/publish-release.mjs) |
| Deployment verifier and notifier | [`scripts/release-notify.mjs`](scripts/release-notify.mjs) |
| Full release procedure | [`docs/RELEASE_PROCESS.md`](docs/RELEASE_PROCESS.md) |

> [!CAUTION]
> Automated validation proves repository, metadata, packaging and deployment contracts. It does not replace live MissionChief testing for selection, dispatch, transport, naming or personnel assignment.

## Repository map

```text
.github/
├── CODEOWNERS
├── ISSUE_TEMPLATE/
└── workflows/
    ├── repository-quality.yml
    ├── validate-userscript.yml
    └── release.yml

docs/
├── README.md
├── DEVELOPER_HANDOFF.md
├── ARCHITECTURE.md
├── ROADMAP.md
├── TESTING.md
├── MIGRATION.md
├── RELEASE_PROCESS.md
├── GREASY_FORK_SETUP.md
└── media/readme-hero.svg

scripts/
├── check_repository.py
├── validate-userscript.mjs
├── prepare-release.mjs
├── publish-release.mjs
└── release-notify.mjs

src/
├── README.md
└── missionchief-command-nexus.user.js
```

## Development and support

**GitHub Issues is the authoritative development queue.** Active bugs, enhancements, priorities and acceptance criteria are deliberately kept out of static roadmap claims in this README.

<table>
<tr>
<td width="33%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues"><strong>📋 VIEW ISSUES</strong><br><sub>Authoritative work queue</sub></a></td>
<td width="33%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/new?template=bug_report.yml"><strong>🐞 REPORT A BUG</strong><br><sub>Include reproducible evidence</sub></a></td>
<td width="33%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/new?template=feature_request.yml"><strong>💡 REQUEST A FEATURE</strong><br><sub>Propose a scoped operational change</sub></a></td>
</tr>
</table>

| Resource | Purpose |
|---|---|
| [Documentation index](docs/README.md) | Engineering, migration, testing and release material |
| [Contributing guide](CONTRIBUTING.md) | Branch, evidence, validation and pull-request standards |
| [Testing strategy](docs/TESTING.md) | Automated checks and live regression expectations |
| [Migration guide](docs/MIGRATION.md) | Transition from the two legacy scripts |
| [Support policy](SUPPORT.md) | Correct support route |
| [Security policy](SECURITY.md) | Private reporting of sensitive vulnerabilities and credentials |
| [Code of Conduct](CODE_OF_CONDUCT.md) | Community participation standards |

## Ownership and attribution

| Person / group | Responsibility |
|---|---|
| **MartyBlyth** | Project creator, original userscript author, developer, technical owner and final source-code authority |
| **Conroy1988** | Project helper for repository setup, documentation and general support; not a userscript developer |
| **Team Killing Bastards** | GitHub organisation and project home |

The unified userscript originates from:

- Mission Finder 2026 Trained Personal Update
- MissionChief Unit, Station & Personnel Tools

They are now distributed together as **MissionChief Command Nexus** and should not be installed as companion scripts.

## Licence and disclaimer

MissionChief Command Nexus is distributed under the [MIT Licence](LICENSE).

Copyright © 2026 **MartyBlyth**.

MissionChief trademarks, game content and related material remain the property of their respective owners. MissionChief Command Nexus is an independent community userscript and is not affiliated with, endorsed by or officially supported by MissionChief or its operators.

Automation and bulk account changes remain the operator's responsibility.

---

<div align="center">

<strong>MissionChief Command Nexus</strong><br>
<sub>Prepare the capability. Read the mission. Dispatch with evidence.</sub>

[Install on Greasy Fork](https://greasyfork.org/en/scripts/587702-missionchief-command-nexus) · [Source](src/missionchief-command-nexus.user.js) · [Latest Release](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/latest) · [Changelog](CHANGELOG.md) · [Issues](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues)

</div>
