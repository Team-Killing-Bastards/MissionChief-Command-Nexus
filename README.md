<div align="center">

<img src="docs/media/readme-hero.svg" alt="MissionChief Command Nexus operational control system" width="100%">

# MissionChief Command Nexus

### Build the resources. Read the mission. Dispatch the right capability.

One MissionChief UK userscript for mission intelligence, vehicle selection, trained-personnel matching, unit and station naming, personnel assignment, dispatch automation and controlled release delivery.

<table>
<tr>
<td width="25%" align="center"><a href="https://greasyfork.org/en/scripts/587702-missionchief-command-nexus"><strong>⬇ INSTALL / UPDATE</strong><br><sub>Recommended Greasy Fork route</sub></a></td>
<td width="25%" align="center"><a href="src/missionchief-command-nexus.user.js"><strong>⌘ VIEW SOURCE</strong><br><sub>Canonical userscript on main</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/tag/v1.0.2"><strong>◈ CURRENT RELEASE</strong><br><sub>v1.0.2 assets and checksum</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/new/choose"><strong>⚠ REPORT A PROBLEM</strong><br><sub>Structured GitHub issue forms</sub></a></td>
</tr>
</table>

**Current version:** `1.0.2` · **Developer:** [MartyBlyth](https://github.com/Martyblyth) · **Platform:** [MissionChief UK](https://www.missionchief.co.uk/) · **Licence:** [MIT](LICENSE) · [⭐ Star the repository](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/stargazers)

[![Userscript validation](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/validate-userscript.yml/badge.svg)](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/validate-userscript.yml)
[![Repository quality](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/repository-quality.yml/badge.svg)](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/repository-quality.yml)

[Production status](#current-production-status) · [Install](#install) · [Capabilities](#implemented-capabilities) · [Known gaps](#current-development-queue) · [Release system](#release-and-deployment) · [Documentation](#repository-map) · [Support](#development-and-support)

</div>

---

## Current production status

<table>
<tr>
<td width="25%" align="center"><strong>PRODUCTION</strong><br><code>1.0.2</code><br><sub>Published 19 July 2026</sub></td>
<td width="25%" align="center"><strong>GITHUB</strong><br>✅ Release live<br><sub>Userscript + SHA-256 asset</sub></td>
<td width="25%" align="center"><strong>GREASY FORK</strong><br>✅ Source verified<br><sub>Exact normalized code parity</sub></td>
<td width="25%" align="center"><strong>DEVELOPMENT</strong><br><code>1.0.3</code><br><sub>Unreleased safety candidate</sub></td>
</tr>
</table>

**v1.0.2 is the current verified production release.** It validated the complete GitHub → Greasy Fork → Discord deployment chain and increased the unified userscript version from `1.0.1` to `1.0.2` without changing MissionChief runtime behaviour.

The production release was verified end to end:

- The `v1.0.2` tag points to the published source.
- The GitHub Release contains the installable `.user.js` asset and its SHA-256 checksum.
- The packaged asset matches the tagged userscript exactly.
- Greasy Fork serves version `1.0.2` with code parity against GitHub.
- Discord accepted the deployment notification after Greasy Fork verification.

| Production resource | Link |
|---|---|
| Recommended installer | [MissionChief Command Nexus on Greasy Fork](https://greasyfork.org/en/scripts/587702-missionchief-command-nexus) |
| GitHub Release | [MissionChief Command Nexus v1.0.2](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/tag/v1.0.2) |
| Canonical production source | [`src/missionchief-command-nexus.user.js`](src/missionchief-command-nexus.user.js) |
| Version history | [CHANGELOG.md](CHANGELOG.md) |

### Unreleased development candidate — v1.0.3

MartyBlyth has generated an active `v1.0.3` safety candidate on the branch [`agent/v1.0.3-trained-irv-auto-safety-auto`](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/tree/agent/v1.0.3-trained-irv-auto-safety-auto).

The candidate is focused on two safety-critical areas:

1. **Protect specialist-trained Police IRVs**
   - Ordinary Police Car and Police Officer attendance should use only exact-ID IRVs that are live-verified as staffed and do not carry protected specialist Police training.
   - Level 1, Level 2, Sergeant, Medic, Inspector and other specialist-trained Police IRVs should not be consumed by ordinary Police attendance.
   - The ordinary Police group-button fallback should not bypass exact vehicle-training protection.

2. **Stabilize Auto Mode and manual selection**
   - Auto Mode, Unit Finder and Mission Update should wait for a complete, non-zero, ID-stable vehicle list after loading finishes.
   - Selection and dispatch should stop safely when the vehicle list times out, remains empty or is still changing.

> [!WARNING]
> `v1.0.3` is **not a production release** and is not the recommended install route. Its branch must be reconciled with current `main`, reviewed, validated and released through the controlled publication process before users should install it.

> [!IMPORTANT]
> **MissionChief Command Nexus is developed by MartyBlyth.** Conroy1988 assists as a project helper with repository setup, documentation and general support only; he is not a userscript developer.

## What Command Nexus is

MissionChief separates operational work across stations, vehicle records, personnel assignments, training pages, mission requirements, patients and dispatch controls. Command Nexus joins those systems into one installation so the operational chain can be managed as a connected workflow:

```text
Stations → Vehicles → Trained Personnel → Mission Requirements → Dispatch
```

<table>
<tr>
<td width="25%" align="center"><strong>🏢 PREPARE</strong><br><sub>Standardise stations and vehicle identities.</sub></td>
<td width="25%" align="center"><strong>👥 QUALIFY</strong><br><sub>Assign trained personnel and build capability intelligence.</sub></td>
<td width="25%" align="center"><strong>🧠 INTERPRET</strong><br><sub>Read mission, patient and specialist-resource requirements.</sub></td>
<td width="25%" align="center"><strong>🚨 RESPOND</strong><br><sub>Select, validate, dispatch, share and continue.</sub></td>
</tr>
</table>

The unified script retains two established runtime engines inside one userscript rather than pretending they have already been rewritten into a single internal codebase. Shared training intelligence connects the administration and mission-selection workflows while startup isolation limits the impact of a fault in either retained engine.

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
> Run **one active Command Nexus installation only**. Do not keep either legacy standalone userscript enabled beside Command Nexus. The unified userscript contains duplicate-initialisation guards, but the supported configuration is one merged installation.

### Direct GitHub source

The main-branch source remains available for review and controlled installation:

**[Install the canonical GitHub build](https://raw.githubusercontent.com/Team-Killing-Bastards/MissionChief-Command-Nexus/main/src/missionchief-command-nexus.user.js)**

Greasy Fork is the recommended user-facing route because it provides the managed update channel. GitHub `main` remains the authoritative production-development source from which Greasy Fork synchronizes.

## Architecture

Command Nexus v1.0.2 is one userscript containing two runtime-isolated operational engines.

<table>
<tr>
<td width="50%" valign="top">

### 🏗️ Resource Administration Engine

Account and capability preparation:

- Bulk unit naming
- Station naming
- Personnel assignment
- Training-profile selection
- Preview and live assignment modes
- Pause, resume and stop controls
- Verification and shortfall reporting
- Persistent vehicle-training registry

</td>
<td width="50%" valign="top">

### 🚨 Mission Operations Engine

Live mission response:

- Mission requirement interpretation
- Unit Finder / Unit Selector
- Mission Update
- Patient and ambulance demand
- Trained-personnel-aware selection
- Dispatch and mission sharing
- Auto Mode
- Queue and transport continuation

</td>
</tr>
</table>

```text
MissionChief Command Nexus
│
├── Combined installation guard
│
├── Resource Administration Engine
│   ├── Unit and station naming
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

## Implemented capabilities

The following capability exists in the current production source. Individual missions, account configurations and training profiles still require live validation; implemented does not mean every possible MissionChief requirement is already mapped.

### Mission intelligence and response

| Capability | Current behaviour |
|---|---|
| **Unit Finder / Unit Selector** | Reads available mission requirements and attempts to select matching vehicle and personnel capability. |
| **Mission Update** | Re-reads live outstanding requirements as a mission develops and adds newly required capability. |
| **Live requirement preference** | Uses the live mission-requirements table when available rather than relying only on older alert text. |
| **Patient demand** | Detects patient demand and accounts for ambulance capacity when mission vehicle text alone is incomplete. |
| **Specialist medical handling** | Includes patient-linked specialist handling such as Critical Care and Ambulance Officer workflows where mapped. |
| **Training-aware selection** | Uses the shared vehicle-training registry so a base vehicle type is not automatically treated as fully qualified. |
| **Public-order reconciliation** | Coordinates overlapping trained-personnel requirements such as public-order levels and command roles where mappings exist. |
| **Auto Mode** | Runs mission analysis, selection, live updates, readiness checks and dispatch as a managed cycle. |
| **Dispatch and share** | Uses the appropriate dispatch route and records mission-sharing state. |
| **Mission changes** | Re-checks missions that upgrade or change after the initial selection pass. |
| **Queue continuation** | Continues through MissionChief mission navigation and supports unattended-mission restart logic. |
| **Transport handling** | Detects patient or prisoner transport screens and processes available continuation controls. |
| **Operational logging** | Records completed, skipped and blocked mission outcomes for the active session. |

### Resource administration

| Capability | Current behaviour |
|---|---|
| **Bulk unit naming** | Applies repeatable structured vehicle names across supported station and vehicle types. |
| **Station naming** | Generates and previews standardized station names from available station/location data. |
| **Scoped processing** | Processes controlled station scopes rather than applying unrestricted account-wide changes. |
| **Preview before write** | Shows planned changes before saving where the workflow provides preview mode. |
| **Pause, resume and stop** | Keeps long-running administrative batches controllable. |
| **Audit output** | Reports changed, skipped and failed records with relevant before/after information. |
| **Personnel assignment** | Detects trained personnel and matches them to eligible vehicles for supported profiles. |
| **Assignment verification** | Re-reads the live state after assignment rather than assuming a write succeeded. |
| **Shortfall reporting** | Distinguishes known personnel shortages from loading or verification failures where supported. |
| **Shared training registry** | Makes confirmed vehicle/personnel capability available to mission selection. |

### Reliability controls

- One combined installation guard plus retained module guards
- Independent module startup isolation
- Duplicate-panel prevention
- Mission-instance and stale-selection checks
- Listener, observer and timer lifecycle cleanup
- Bounded operational logging
- Versioned local and session storage keys
- Repository, userscript metadata and release validation

## Training and personnel coverage

Command Nexus already contains personnel-assignment and training-registry infrastructure, but complete profile coverage is **not** claimed.

### Current position

- Police, medical, fire, airfield, SAR, mountain-rescue and coastguard structures are represented to varying degrees.
- Supported profiles can participate in Preview and Live assignment workflows.
- The shared registry can be used by mission selection when an explicit requirement mapping exists.
- Some profile names may be visible before their complete vehicle, seat and live-assignment rules have been validated.

### Important distinction

A profile existing in Personnel Assignment does not automatically mean Unit Selector can satisfy a mission requirement with it. For example, Police Medic is represented as a training concept, but the current Unit Selector does not yet map an explicit **Police Medic** mission requirement to an eligible staffed unit.

> [!CAUTION]
> Treat profile coverage as evidence-based and profile-specific. Do not assume every MissionChief training course, service or specialist vehicle has a completed mapping merely because its service category exists in the interface.

## Current development queue

### Active release candidate

| Candidate | State | Scope |
|---|---|---|
| [`v1.0.3` trained-IRV and Auto Mode safety branch](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/tree/agent/v1.0.3-trained-irv-auto-safety-auto) | **Unreleased / requires reconciliation and review** | Protect specialist-trained Police IRVs from ordinary attendance and require a complete, stable vehicle list before selection or dispatch. |

### Tracked issues

| Issue | Status | Development scope |
|---|---|---|
| [#16 — Unit Selector does not map Police Medic requirements](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/16) | **High-priority bug** | Recognize Police Medic requirements, select a correctly staffed eligible police unit and report a clear qualification shortfall when unavailable. |
| [#17 — Complete remaining medical training profiles](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/17) | **Backlog** | Identify and implement the remaining medical profile identifiers, vehicle mappings, Preview/Live assignment and test cases. |
| [#18 — Complete remaining Fire and Airfield training profiles](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/18) | **Backlog** | Complete Fire and Airfield profile coverage while preserving correct service grouping and assignment verification. |
| [#19 — Complete remaining SAR, Mountain Rescue and Coastguard profiles](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/19) | **Backlog** | Complete the remaining specialist profile mappings and representative live validation. |
| [#20 — Map Water Carrier, HazMat and ICCU requirements](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/20) | **Blocked high-priority bug** | Await stable output from the external Mission Requirements box before implementing reliable specialist Fire mappings. |

The `v1.0.3` candidate protects specialist-trained IRVs from being used for ordinary Police attendance; it does **not** by itself complete the missing Police Medic mission-requirement mapping tracked in Issue #16.

Issue #20 is intentionally blocked. A fragile hard-coded workaround should not be introduced until the external Mission Requirements output exposes stable requirement wording or identifiers.

## Compatibility and safety

The current production userscript metadata targets:

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
- Treat Auto Mode as operational automation: observe it on representative missions before unattended use.
- Do not rely on unsupported requirement substitution when the script reports a mapping or staffing gap.
- Do not install unreleased candidate branches as though they were Greasy Fork production updates.

## Release and deployment

Command Nexus has a verified controlled release system rather than a simple tag-and-upload process.

```text
Source change or reviewed candidate
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
Exact source-parity verification
    ↓
Discord deployment announcement
```

### Release preparation

The `prepare-version` workflow path:

- Updates userscript and documentation version references through `scripts/prepare-release.mjs`.
- Runs userscript, metadata and repository checks before creating the release branch.
- Attempts to create the preparation pull request automatically.
- Falls back to a clear manual comparison link without producing a false red failure when GitHub organization policy prevents `GITHUB_TOKEN` from opening pull requests.

### Publication and verification

The `publish-release` path:

- Refuses to publish a tag that does not match the userscript `@version`.
- Requires the release commit to be contained in `main`.
- Packages the canonical userscript and generates a SHA-256 checksum.
- Creates or refreshes the matching GitHub Release.
- Downloads and re-validates the published release assets.
- Verifies GitHub source and Greasy Fork source against the tagged local source.
- Posts the Discord release announcement only after Greasy Fork serves the expected version and exact normalized code.

### Fast Greasy Fork recognition

The permanent release notifier checks Greasy Fork every **five seconds** for approximately five minutes. The Discord payload is prepared before polling begins. Once Greasy Fork passes both version and source-parity verification, the next external request is the Discord webhook post.

The Discord announcement is presented as three focused cards:

1. Release status and production availability
2. Mission Brief / release changes
3. Deployment verification, integrity signature and install links

| Release resource | Open |
|---|---|
| Release workflow | [`.github/workflows/release.yml`](.github/workflows/release.yml) |
| Release preparation helper | [`scripts/prepare-release.mjs`](scripts/prepare-release.mjs) |
| Deployment verifier/notifier | [`scripts/release-notify.mjs`](scripts/release-notify.mjs) |
| Release procedure | [`docs/RELEASE_PROCESS.md`](docs/RELEASE_PROCESS.md) |
| Greasy Fork setup | [`docs/GREASY_FORK_SETUP.md`](docs/GREASY_FORK_SETUP.md) |
| Current GitHub Release | [v1.0.2](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/tag/v1.0.2) |

> [!NOTE]
> Automated validation proves repository, metadata, packaging and deployment contracts. It does not replace live MissionChief regression testing for mission selection, dispatch, transport, bulk naming or personnel assignment.

## Repository map

```text
.github/
├── ISSUE_TEMPLATE/                         Structured bug and feature forms
├── workflows/
│   ├── repository-quality.yml              Documentation and repository integrity
│   ├── validate-userscript.yml             Source, metadata and version validation
│   ├── release.yml                         Prepare and publish release workflow
│   └── temporary-build-v103-safety-pr.yml  One-time v1.0.3 candidate builder
└── CODEOWNERS                              Technical ownership rules

docs/
├── README.md                    Documentation index
├── DEVELOPER_HANDOFF.md         Engineering handoff and risk context
├── ARCHITECTURE.md              Current and target architecture
├── ROADMAP.md                   Validation and development direction
├── TESTING.md                   Automated and live test strategy
├── MIGRATION.md                 Legacy-script migration and rollback
├── RELEASE_PROCESS.md           Controlled publication procedure
├── GREASY_FORK_SETUP.md         External synchronization setup
└── media/readme-hero.svg        Repository-hosted hero artwork

scripts/
├── check_repository.py          Repository and README integrity checks
├── validate-userscript.mjs      Userscript metadata and version checks
├── prepare-release.mjs          Idempotent release-version preparation
└── release-notify.mjs           Deployment parity and Discord notification

src/
├── README.md                    Canonical-source guide
└── missionchief-command-nexus.user.js
                                Installable production source
```

The temporary `v1.0.3` builder is development infrastructure, not part of the permanent release architecture. It should be removed when the candidate branch has completed its review/merge lifecycle.

### Documentation index

| Document | Purpose |
|---|---|
| [Documentation home](docs/README.md) | Entry point for engineering, migration and release material |
| [Developer handoff](docs/DEVELOPER_HANDOFF.md) | Original merged-baseline shape, risks and safe source-work context |
| [Architecture](docs/ARCHITECTURE.md) | Retained two-engine architecture and consolidation direction |
| [Roadmap](docs/ROADMAP.md) | Broader validation and engineering phases |
| [Testing strategy](docs/TESTING.md) | Automated checks, compatibility evidence and release blockers |
| [Migration guide](docs/MIGRATION.md) | Transition from the legacy standalone installations |
| [Release process](docs/RELEASE_PROCESS.md) | Versioning, approval, publication and verification controls |
| [Greasy Fork setup](docs/GREASY_FORK_SETUP.md) | Synchronization, webhook, rollback and troubleshooting |

## Development and support

Use GitHub Issues for reproducible defects and scoped enhancements. Keep reports focused on observed behaviour, expected behaviour, exact mission or station context, userscript version, browser/userscript manager and any relevant screenshots or logs.

<table>
<tr>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues"><strong>📋 ACTIVE ISSUES</strong><br><sub>Current bugs and roadmap work</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/new?template=bug_report.yml"><strong>🐞 REPORT A BUG</strong><br><sub>Reproducible failures</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/new?template=feature_request.yml"><strong>💡 REQUEST A FEATURE</strong><br><sub>Scoped product proposals</sub></a></td>
<td width="25%" align="center"><a href="SUPPORT.md"><strong>🛟 SUPPORT POLICY</strong><br><sub>Support routes and boundaries</sub></a></td>
</tr>
</table>

| Resource | Purpose |
|---|---|
| [Contributing guide](CONTRIBUTING.md) | Branch, validation, evidence and pull-request standards |
| [Support policy](SUPPORT.md) | Correct support route for defects, questions and security concerns |
| [Security policy](SECURITY.md) | Private handling of sensitive vulnerabilities and credentials |
| [Code of Conduct](CODE_OF_CONDUCT.md) | Community participation standards |
| [Changelog](CHANGELOG.md) | Published and unreleased project changes |

## Authority and attribution

| Person / group | Responsibility |
|---|---|
| **MartyBlyth** | Project creator, original userscript author, developer, technical owner and final release approver |
| **Conroy1988** | Project helper for repository setup, documentation and general support; not a userscript developer |
| **Team Killing Bastards** | GitHub organization and project home |

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

[Install production on Greasy Fork](https://greasyfork.org/en/scripts/587702-missionchief-command-nexus) · [Production source](src/missionchief-command-nexus.user.js) · [v1.0.2 Release](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/tag/v1.0.2) · [v1.0.3 Candidate](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/tree/agent/v1.0.3-trained-irv-auto-safety-auto) · [Issues](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues)

</div>
