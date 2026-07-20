<div align="center">

<img src="docs/media/readme-hero.svg" alt="MissionChief Command Nexus operational control system" width="100%">

# MissionChief Command Nexus

### Build the resources. Read the mission. Dispatch the right capability.

One MissionChief UK userscript for mission intelligence, vehicle selection, trained-personnel matching, unit and station naming, personnel assignment and dispatch automation.

<table>
<tr>
<td width="25%" align="center"><a href="https://greasyfork.org/en/scripts/587702-missionchief-command-nexus"><strong>⬇ INSTALL / UPDATE</strong><br><sub>Recommended Greasy Fork route</sub></a></td>
<td width="25%" align="center"><a href="src/missionchief-command-nexus.user.js"><strong>⌘ VIEW SOURCE</strong><br><sub>Canonical userscript</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/latest"><strong>◈ LATEST RELEASE</strong><br><sub>Assets and checksum</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues"><strong>⚠ ISSUES</strong><br><sub>Bugs and development work</sub></a></td>
</tr>
</table>

**Current version:** `1.0.6` · **Developer:** [MartyBlyth](https://github.com/Martyblyth) · **Platform:** [MissionChief UK](https://www.missionchief.co.uk/) · **Licence:** [MIT](LICENSE) · [⭐ Star the repository](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/stargazers)

[![Userscript validation](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/validate-userscript.yml/badge.svg)](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/validate-userscript.yml)
[![Repository quality](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/repository-quality.yml/badge.svg)](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/repository-quality.yml)

[Overview](#what-command-nexus-is) · [Install](#install) · [Capabilities](#implemented-capabilities) · [Safety](#compatibility-and-safety) · [Release system](#release-and-deployment) · [Development](#development-tracking) · [Documentation](#repository-map)

</div>

---

## What Command Nexus is

MissionChief separates operational work across stations, vehicle records, personnel assignments, training pages, mission requirements, patients and dispatch controls. Command Nexus joins those systems into one installation so the operational chain can be managed as a connected workflow:

```text
Stations → Vehicles → Trained Personnel → Mission Requirements → Dispatch
```

<table>
<tr>
<td width="25%" align="center"><strong>🏢 PREPARE</strong><br><sub>Standardise stations and vehicle identities.</sub></td>
<td width="25%" align="center"><strong>👥 QUALIFY</strong><br><sub>Assign trained personnel and record capability.</sub></td>
<td width="25%" align="center"><strong>🧠 INTERPRET</strong><br><sub>Read mission, patient and specialist requirements.</sub></td>
<td width="25%" align="center"><strong>🚨 RESPOND</strong><br><sub>Select, validate, dispatch and continue.</sub></td>
</tr>
</table>

Command Nexus is a single userscript containing two established runtime engines:

- **Resource Administration Engine** — unit naming, station naming, personnel assignment and training intelligence.
- **Mission Operations Engine** — requirement interpretation, vehicle selection, mission updates, dispatch and automation.

The engines remain isolated at runtime while sharing verified training intelligence where required. This reduces merge risk and prevents a fault in one engine from automatically blocking the other.

> [!IMPORTANT]
> **MissionChief Command Nexus is developed by MartyBlyth.** Conroy1988 assists as a project helper with repository setup, documentation and general support only; he is not a userscript developer.

## Install

### Recommended route — Greasy Fork

1. Install a userscript manager such as **Tampermonkey** or **Violentmonkey**.
2. Open **[MissionChief Command Nexus on Greasy Fork](https://greasyfork.org/en/scripts/587702-missionchief-command-nexus)**.
3. Select **Install this script** or **Update**.
4. Disable both legacy standalone scripts:
   - Mission Finder 2026 Trained Personal Update
   - MissionChief Unit, Station & Personnel Tools
5. Reload MissionChief.

> [!WARNING]
> Run **one active Command Nexus installation only**. Do not keep either legacy standalone userscript enabled beside Command Nexus. The merged userscript includes duplicate-initialisation guards, but the supported configuration is one Command Nexus installation.

### Direct GitHub source

The canonical main-branch source is also available for inspection and controlled installation:

**[Install the canonical GitHub build](https://raw.githubusercontent.com/Team-Killing-Bastards/MissionChief-Command-Nexus/main/src/missionchief-command-nexus.user.js)**

Greasy Fork is the recommended user-facing update channel. GitHub `main` remains the authoritative source used by the project release process.

## Architecture

```text
MissionChief Command Nexus
│
├── Combined installation guard
│
├── Resource Administration Engine
│   ├── Unit naming
│   ├── Station naming
│   ├── Personnel assignment
│   ├── Training profiles
│   ├── Shared training registry
│   └── Verification and reporting
│
└── Mission Operations Engine
    ├── Requirement and patient parsing
    ├── Vehicle and personnel matching
    ├── Unit Finder / Mission Update
    ├── Auto Mode and dispatch
    ├── Queue and transport continuation
    └── Operational logging and guards
```

### Resource Administration Engine

| Capability | Operational effect |
|---|---|
| **Bulk unit naming** | Applies repeatable structured vehicle names across supported station and vehicle types. |
| **Station naming** | Generates and previews standardised station names from available station and location data. |
| **Scoped processing** | Processes controlled station scopes rather than unrestricted account-wide changes. |
| **Preview before write** | Shows proposed changes before saving where the workflow provides preview mode. |
| **Pause, resume and stop** | Keeps long-running administrative batches controllable. |
| **Personnel assignment** | Detects trained personnel and matches them to eligible vehicles for supported profiles. |
| **Assignment verification** | Re-reads the live state after assignment rather than assuming a write succeeded. |
| **Training registry** | Records verified vehicle/personnel capability for qualification-aware mission selection. |
| **Audit output** | Reports changed, skipped, failed and unfilled records. |

### Mission Operations Engine

| Capability | Operational effect |
|---|---|
| **Unit Finder / Unit Selector** | Reads mission requirements and attempts to select matching vehicle and personnel capability. |
| **Mission Update** | Re-reads outstanding requirements as a mission develops and adds newly required capability. |
| **Live requirement preference** | Uses the live mission-requirements table when available rather than relying only on older alert text. |
| **Patient demand** | Detects patient demand and accounts for ambulance capacity where mission vehicle text is incomplete. |
| **Training-aware selection** | Uses the shared registry so a base vehicle type is not automatically treated as fully qualified. |
| **Specialist IRV protection** | Prevents protected specialist-trained Police IRVs from satisfying ordinary Police attendance requirements. |
| **Stable vehicle-list gate** | Waits for a complete, non-zero, ID-stable vehicle list before selection and dispatch. |
| **Auto Mode** | Runs mission analysis, selection, live updates, readiness checks and dispatch as a managed cycle. |
| **Dispatch and share** | Uses the appropriate dispatch route and records mission-sharing state. |
| **Mission changes** | Re-checks missions that upgrade or change after the first selection pass. |
| **Queue continuation** | Continues through MissionChief mission navigation and unattended-mission recovery logic. |
| **Transport handling** | Processes visible patient or prisoner transport continuation controls. |
| **Operational logging** | Records completed, skipped and blocked mission outcomes for the active session. |

## Implemented capabilities

The current userscript includes:

### Mission workflow

- Static mission vehicle and personnel requirement parsing
- Live Mission Update reconciliation
- Patient and visible patient-card counting
- Ambulance demand tracking across repeated selection passes
- Specialist medical handling where mapped
- Qualification-aware vehicle selection
- Stable available-vehicle loading and readiness checks
- Required-versus-selected load state
- Staffing and qualification shortage blocking
- Manual Unit Finder and Mission Update controls
- Automatic dispatch and mission sharing
- Mission-upgrade reprocessing
- Queue continuation and unattended-mission recovery
- Patient and prisoner transport continuation
- Duplicate mission, stale panel and repeated-dispatch guards
- Session mission logging and diagnostics

### Administration workflow

- Station discovery and ordered processing
- Unit-type mapping and structured captions
- Station-name generation and preview
- Per-station vehicle numbering
- Bulk rename progress, pause, resume and stop
- Before/after and skipped-item logs
- Personnel service and training-profile selection
- Trained-personnel availability scanning
- Vehicle-seat assignment targeting
- Assignment preview and verification
- Station-level and overall reports
- Registry pruning, quota protection and deferred persistence

### Reliability controls

- One combined installation guard plus retained module guards
- Independent module startup isolation
- Duplicate-panel prevention
- Mission-instance and stale-selection checks
- Listener, observer and timer lifecycle cleanup
- Cached DOM lookups and bounded logs
- Versioned local and session storage keys
- Repository, metadata, version and release validation

> [!NOTE]
> Implemented capability does not mean every MissionChief vehicle, training course or requirement is already mapped. Coverage is evidence-based and expands through tracked development work.

## Training and personnel coverage

Command Nexus contains personnel-assignment and training-registry infrastructure across Police, Medical, Fire, Airfield, SAR, Mountain Rescue and Coastguard categories.

Supported profiles can participate in Preview and Live assignment workflows, and verified capability can be shared with mission selection where an explicit requirement mapping exists.

A profile appearing in Personnel Assignment does not automatically mean Unit Selector can satisfy every mission requirement associated with that profile. Vehicle mappings, seat requirements and live behaviour must be validated individually.

For current bugs, incomplete mappings and approved enhancements, use the **[GitHub Issues tracker](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues)**.

## Compatibility and safety

The userscript targets:

- `https://www.missionchief.co.uk/*`
- `https://police.missionchief.co.uk/*`

| Environment | Current position |
|---|---|
| **MissionChief UK desktop** | Primary development and operational environment |
| **Tampermonkey** | Recommended userscript-manager route |
| **Violentmonkey** | Compatible route; validate account-specific batch workflows before large writes |
| **Safari userscript managers** | Not claimed as fully validated without device-specific evidence |
| **Other MissionChief countries** | Not supported by the current UK-specific names, requirements and vehicle mappings |

### Operational safeguards

- Use Preview mode before bulk naming or personnel assignment where available.
- Test a small station scope before a large administrative run.
- Keep only one Command Nexus installation active.
- Observe Auto Mode on representative missions before unattended use.
- Do not rely on unsupported requirement substitution when a mapping or staffing gap is reported.
- Review the changelog and open issues before deploying changes to a large account.

## Release and deployment

Command Nexus uses a controlled release process rather than an unverified tag-and-upload flow.

```text
Source change
    ↓
Version and changelog preparation
    ↓
Repository + userscript validation
    ↓
Release branch and pull request
    ↓
MartyBlyth technical approval
    ↓
Merge to main
    ↓
Greasy Fork synchronization
    ↓
GitHub tag + Release + SHA-256
    ↓
Source-parity verification
    ↓
Discord deployment announcement
```

### Release preparation

The release workflow:

- Updates synchronized version references through `scripts/prepare-release.mjs`.
- Runs userscript, metadata and repository checks before preparing a release branch.
- Attempts to create the preparation pull request automatically.
- Provides a manual comparison link when GitHub policy prevents Actions from creating the pull request.

### Publication and verification

Before announcing a deployment, the release system:

- Confirms that the tag matches the userscript `@version`.
- Requires the release commit to be contained in `main`.
- Packages the canonical userscript and generates a SHA-256 checksum.
- Creates the matching GitHub Release.
- Re-downloads and validates the published release assets.
- Compares the tagged source, GitHub source and Greasy Fork source.
- Posts to Discord immediately after Greasy Fork serves the expected version and matching code.

| Release resource | Open |
|---|---|
| Latest GitHub Release | [Releases](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/latest) |
| Version history | [CHANGELOG.md](CHANGELOG.md) |
| Release workflow | [`.github/workflows/release.yml`](.github/workflows/release.yml) |
| Release preparation helper | [`scripts/prepare-release.mjs`](scripts/prepare-release.mjs) |
| Deployment verifier/notifier | [`scripts/release-notify.mjs`](scripts/release-notify.mjs) |
| Release procedure | [`docs/RELEASE_PROCESS.md`](docs/RELEASE_PROCESS.md) |
| Greasy Fork setup | [`docs/GREASY_FORK_SETUP.md`](docs/GREASY_FORK_SETUP.md) |

> [!CAUTION]
> Automated validation proves repository, metadata, packaging and deployment contracts. It does not replace live MissionChief testing for mission selection, dispatch, transport, bulk naming or personnel assignment.

## Development tracking

**GitHub Issues is the authoritative development queue.**

The README intentionally does not duplicate active issue titles, priorities, candidate branches or short-lived implementation plans. Those details change more frequently than this document and belong in the tracker.

Use Issues to view or manage:

- Confirmed bugs
- Approved enhancements
- Blocked work
- Priorities and labels
- Current assignees
- Reproduction evidence
- Acceptance criteria
- Development and validation discussion

<table>
<tr>
<td width="33%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues"><strong>📋 VIEW ISSUES</strong><br><sub>Authoritative work queue</sub></a></td>
<td width="33%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/new?template=bug_report.yml"><strong>🐞 REPORT A BUG</strong><br><sub>Reproducible failures</sub></a></td>
<td width="33%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/new?template=feature_request.yml"><strong>💡 REQUEST A FEATURE</strong><br><sub>Scoped proposals</sub></a></td>
</tr>
</table>

## Repository map

```text
.github/
├── ISSUE_TEMPLATE/              Structured bug and feature forms
├── workflows/
│   ├── repository-quality.yml   Documentation and repository integrity
│   ├── validate-userscript.yml  Source, metadata and version validation
│   └── release.yml              Release preparation and publication
└── CODEOWNERS                   Technical ownership rules

docs/
├── README.md                    Documentation index
├── DEVELOPER_HANDOFF.md         Engineering handoff and risk context
├── ARCHITECTURE.md              Current and target architecture
├── ROADMAP.md                   Broader engineering direction
├── TESTING.md                   Automated and live test strategy
├── MIGRATION.md                 Legacy-script migration and rollback
├── RELEASE_PROCESS.md           Controlled publication procedure
├── GREASY_FORK_SETUP.md         External synchronization setup
└── media/readme-hero.svg        Repository-hosted hero artwork

scripts/
├── check_repository.py          Repository and README integrity checks
├── validate-userscript.mjs      Userscript metadata and version checks
├── prepare-release.mjs          Release-version preparation
└── release-notify.mjs           Deployment parity and Discord notification

src/
├── README.md                    Canonical-source guide
└── missionchief-command-nexus.user.js
                                Installable source
```

### Documentation index

| Document | Purpose |
|---|---|
| [Documentation home](docs/README.md) | Entry point for engineering, migration and release material |
| [Developer handoff](docs/DEVELOPER_HANDOFF.md) | Implementation shape, risks and safe source-work context |
| [Architecture](docs/ARCHITECTURE.md) | Retained two-engine architecture and consolidation direction |
| [Roadmap](docs/ROADMAP.md) | Broader engineering phases without replacing Issues |
| [Testing strategy](docs/TESTING.md) | Automated checks, compatibility evidence and release blockers |
| [Migration guide](docs/MIGRATION.md) | Transition from the legacy standalone installations |
| [Release process](docs/RELEASE_PROCESS.md) | Versioning, approval, publication and verification controls |
| [Greasy Fork setup](docs/GREASY_FORK_SETUP.md) | Synchronization, webhook, rollback and troubleshooting |

## Support and contribution

| Resource | Purpose |
|---|---|
| [Contributing guide](CONTRIBUTING.md) | Branch, validation, evidence and pull-request standards |
| [Support policy](SUPPORT.md) | Correct route for questions and operational support |
| [Security policy](SECURITY.md) | Private handling of sensitive vulnerabilities and credentials |
| [Code of Conduct](CODE_OF_CONDUCT.md) | Community participation standards |
| [Changelog](CHANGELOG.md) | Published project changes |

## Authority and attribution

| Person / group | Responsibility |
|---|---|
| **MartyBlyth** | Project creator, original userscript author, developer, technical owner and final release approver |
| **Conroy1988** | Project helper for repository setup, documentation and general support; not a userscript developer |
| **Team Killing Bastards** | GitHub organisation and project home |

The unified userscript originates from two established MartyBlyth systems:

- Mission Finder 2026 Trained Personal Update
- MissionChief Unit, Station & Personnel Tools

They are now distributed together as **MissionChief Command Nexus** and should not be installed as separate companion scripts.

## Licence and disclaimer

MissionChief Command Nexus is distributed under the [MIT Licence](LICENSE).

Copyright © 2026 **MartyBlyth**.

MissionChief trademarks, game content and related material remain the property of their respective owners. MissionChief Command Nexus is an independent community userscript and is not affiliated with, endorsed by or officially supported by MissionChief or its operators.

Automation and bulk account changes remain the operator's responsibility. Use controlled scopes, Preview mode and representative live testing before large or unattended runs.

---

<div align="center">

<strong>MissionChief Command Nexus</strong><br>
<sub>One installation. Every step from resource preparation to live dispatch.</sub>

[Install on Greasy Fork](https://greasyfork.org/en/scripts/587702-missionchief-command-nexus) · [Source](src/missionchief-command-nexus.user.js) · [Latest Release](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/latest) · [Changelog](CHANGELOG.md) · [Issues](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues)

</div>
