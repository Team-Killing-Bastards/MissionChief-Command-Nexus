<div align="center">

<img src="docs/media/readme-hero.svg" alt="MissionChief Command Nexus operational control system" width="100%">

# MissionChief Command Nexus

### Build the resources. Read the mission. Dispatch the right capability.

Mission intelligence · Automated vehicle selection · Patient demand · Trained-personnel matching · Unit and station naming · Personnel assignment

<table>
<tr>
<td width="25%" align="center"><a href="https://raw.githubusercontent.com/Team-Killing-Bastards/MissionChief-Command-Nexus/main/src/missionchief-command-nexus.user.js"><strong>⬇ INSTALL CURRENT BUILD</strong><br><sub>Canonical userscript</sub></a></td>
<td width="25%" align="center"><a href="src/missionchief-command-nexus.user.js"><strong>⌘ VIEW SOURCE</strong><br><sub>Inspect the live code</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases"><strong>◈ OPEN RELEASES</strong><br><sub>Versioned archives</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/new/choose"><strong>⚠ REPORT A BUG</strong><br><sub>Structured issue form</sub></a></td>
</tr>
</table>

**Current version:** `1.0.1` · **Developer:** [MartyBlyth](https://github.com/Martyblyth) · **Platform:** [MissionChief UK](https://www.missionchief.co.uk/) · **Licence:** [MIT](LICENSE) · [⭐ Star the repository](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/stargazers)

[![Userscript validation](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/validate-userscript.yml/badge.svg)](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/validate-userscript.yml)
[![Repository quality](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/repository-quality.yml/badge.svg)](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/repository-quality.yml)

[Why it exists](#why-command-nexus-exists) · [Install](#install-in-under-a-minute) · [Mission operations](#mission-intelligence-and-dispatch) · [Resource administration](#resource-administration) · [Training intelligence](#trained-personnel-intelligence) · [Release confidence](#release-confidence) · [Support](#support-and-development)

</div>

---

## Why Command Nexus exists

MissionChief separates the operational chain across station pages, vehicle records, personnel assignments, mission requirements, patient alerts and dispatch controls. That fragmentation makes it difficult to answer the question that matters most:

> **Do I have the right vehicle, carrying the right people, ready for this mission right now?**

**MissionChief Command Nexus connects that entire chain in one userscript.** It combines MartyBlyth's mission-selection and automation engine with his unit, station and trained-personnel administration suite, preserving the proven behaviour of both systems inside one installation.

<table>
<tr>
<td width="25%" align="center"><strong>🏢 Build the structure</strong><br><sub>Standardise stations and fleet identities across large accounts.</sub></td>
<td width="25%" align="center"><strong>👥 Load the capability</strong><br><sub>Assign trained personnel and maintain verified vehicle-training intelligence.</sub></td>
<td width="25%" align="center"><strong>🧠 Read the incident</strong><br><sub>Interpret vehicle, patient, live-update and qualification requirements.</sub></td>
<td width="25%" align="center"><strong>🚨 Execute the response</strong><br><sub>Select, validate, dispatch, share and continue through the mission queue.</sub></td>
</tr>
</table>

```text
Stations → Vehicles → Trained Personnel → Mission Requirements → Dispatch
```

> [!IMPORTANT]
> **MissionChief Command Nexus is developed by MartyBlyth.** Conroy1988 assists as a project helper with repository setup, documentation and general support only; he is not a userscript developer.

## Install in under a minute

1. Install a userscript manager such as **Tampermonkey** or **Violentmonkey**.
2. Open the canonical installer:

   **[Install MissionChief Command Nexus](https://raw.githubusercontent.com/Team-Killing-Bastards/MissionChief-Command-Nexus/main/src/missionchief-command-nexus.user.js)**

3. Confirm the userscript installation.
4. Disable the two legacy standalone scripts to prevent duplicate interfaces or automation engines.
5. Reload MissionChief.

> [!WARNING]
> Do not run Command Nexus alongside the old standalone Mission Finder or Unit, Station & Personnel scripts. The merged userscript contains both systems and includes duplicate-initialisation guards, but the clean supported configuration is **one active Command Nexus installation**.

| Need | Open |
|---|---|
| Install or update | [Canonical userscript](https://raw.githubusercontent.com/Team-Killing-Bastards/MissionChief-Command-Nexus/main/src/missionchief-command-nexus.user.js) |
| Review the source | [`src/missionchief-command-nexus.user.js`](src/missionchief-command-nexus.user.js) |
| Check changes | [Changelog](CHANGELOG.md) |
| Read migration guidance | [Migration plan](docs/MIGRATION.md) |
| Report a problem | [Issue forms](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/new/choose) |

## One installation. Two operational engines.

Command Nexus v1.0.1 is a single userscript containing two runtime-isolated systems:

<table>
<tr>
<td width="50%" valign="top">

### 🏗️ Resource Administration Engine

Controls the account foundation:

- Unit naming
- Station naming
- Personnel and training assignment
- Preview, pause, resume and stop controls
- Verification reports and training-shortfall detection
- Persistent vehicle-training registry

</td>
<td width="50%" valign="top">

### 🚨 Mission Operations Engine

Controls live incident response:

- Mission requirement interpretation
- Unit Finder and Mission Update
- Patient and ambulance demand
- Trained-personnel-aware selection
- Dispatch, sharing and Auto Mode
- Queue continuation and transport handling

</td>
</tr>
</table>

The modules are protected by a single combined installation guard. Startup faults are isolated so a failure in one engine is reported without automatically preventing the other engine from loading.

---

## Mission intelligence and dispatch

| Capability | Operational effect |
|---|---|
| **Unit Finder** | Reads the mission's vehicle and personnel requirements, loads the available fleet and selects matching units. |
| **Mission Update** | Re-reads live missing requirements as an incident develops and adds only the outstanding capability. |
| **Live-requirements authority** | Uses the live mission-requirements table as the primary source when present, avoiding stale legacy alerts. |
| **Patient demand** | Detects patient counts and selects ambulance capacity even when the displayed vehicle requirements omit it. |
| **Specialist medical demand** | Handles Critical Care, Ambulance Officer and other patient-linked specialist requirements only when the live mission state requires them. |
| **Qualification-aware selection** | Uses the shared training registry to distinguish a matching vehicle type from a genuinely qualified vehicle. |
| **Public-order reconciliation** | Collapses overlapping Level 1, Level 2, Sergeant and Inspector requirements into controlled trained-personnel selection. |
| **Mission Auto Mode** | Runs requirement analysis, vehicle selection, live updates, validation and dispatch as one managed mission cycle. |
| **Dispatch & Share** | Chooses the appropriate dispatch path and records whether the mission was shared. |
| **Mission upgrades** | Re-checks missions that change after the initial selection instead of assuming the original requirements remain complete. |
| **Queue continuation** | Uses MissionChief's next-mission workflow and can restart from unattended missions after reaching a configurable threshold. |
| **Transport handling** | Detects patient or prisoner transport screens and processes visible Approach/send controls before continuing. |
| **Ally Steal** | Provides a deliberately separate targeted Fire Officer workflow without running normal mission requirement selection. |
| **Operational logging** | Tracks completed and skipped missions, readiness failures, credits and automation state for the active session. |

> [!TIP]
> Manual controls remain available when full Auto Mode is not appropriate. Use Unit Finder and Mission Update for assisted dispatch while retaining final operator control.

## Resource administration

### Fleet and station control

| Capability | Operational effect |
|---|---|
| **Bulk unit naming** | Applies structured, repeatable vehicle names across selected station types. |
| **Station naming** | Generates and previews standardised station names using available station and location data. |
| **Scoped batch processing** | Processes one station or a defined sequence rather than making uncontrolled account-wide changes. |
| **Preview before write** | Shows proposed changes before saving where the workflow supports modification. |
| **Pause, resume and stop** | Keeps long-running administration controllable during large batches. |
| **Progress and audit output** | Records renamed, skipped and failed records with before-and-after information. |

### Personnel assignment

| Capability | Operational effect |
|---|---|
| **Training-profile selection** | Chooses the required service and qualification profile before assignment begins. |
| **Vehicle-seat targeting** | Matches trained personnel to the vehicles and seat counts required by the selected profile. |
| **Assignment verification** | Re-reads the station state after changes instead of assuming the write succeeded. |
| **Shortfall detection** | Separates genuine training shortages from page-loading, assignment or verification failures. |
| **Station and overall reports** | Produces detailed results for each processed station and the complete run. |
| **Shared training registry** | Makes verified vehicle/personnel capability available to the Mission Operations Engine. |

---

## Trained-personnel intelligence

Command Nexus does not treat every vehicle of the same base type as operationally identical. Its training registry records verified capability against vehicle identity so mission selection can favour the unit that actually carries the necessary personnel.

### Current medical intelligence

- Critical Care personnel assignment for ambulances
- Configurable trained-personnel requirements per target vehicle
- Patient-linked ambulance and specialist medical selection

### Current police intelligence

<table>
<tr>
<td width="33%" valign="top">

**Public order and command**

- Level 1 Public Order
- Level 2 Public Order
- Police Sergeant
- Police Medic
- Police Inspector

</td>
<td width="33%" valign="top">

**Specialist operations**

- Roads Policing
- Firearms
- Mounted Officer
- Dog Handler
- Drone Operator
- Police Search Advisor
- Police Aviation

</td>
<td width="33%" valign="top">

**Railway and EOD**

- Railway Police Officer
- Mobile Operations Management
- EOD Commander
- Bomb Disposal
- Marine Bomb Disposal

</td>
</tr>
</table>

> [!NOTE]
> Some service profiles may appear as preview-only until their vehicle mappings and seat requirements have been verified. Command Nexus keeps those profiles visibly separate from live assignment rules.

## Complete capability inventory

<details>
<summary><strong>Open the full Command Nexus operational inventory</strong></summary>

### Mission workflow

- Static mission vehicle and personnel requirement parsing
- Live Mission Update requirement reconciliation
- Patient badge and visible patient-card counting
- Ambulance requirement tracking across repeated selection passes
- Critical-care and specialist medical handling
- Trained-personnel registry preparation before mission selection
- Available-vehicle loading and stable-list detection
- Required-versus-selected vehicle load state
- Dispatch readiness and inline problem-alert detection
- Staffing/qualification shortage blocking
- Manual Unit Finder and Mission Update controls
- Automatic dispatch and mission sharing
- Mission-upgrade reprocessing
- Final-queue detection and unattended-mission restart
- Patient and prisoner transport continuation
- Duplicate mission, stale panel and repeated-dispatch guards
- Session mission logging and debug diagnostics

### Administration workflow

- Station discovery and ordered processing
- Unit-type mapping and structured captions
- Station-name generation and preview
- Per-station vehicle numbering
- Bulk rename progress, pause, resume and stop
- Before/after and skipped-item logs
- Personnel service and profile selection
- Trained-personnel availability scanning
- Vehicle-seat assignment targeting
- Assignment preview and verification
- Station-level and overall reports
- Registry pruning, quota protection and deferred persistence

### Reliability controls

- Single merged-installation guard
- Independent module startup isolation
- Duplicate panel prevention
- Mission-instance ownership checks
- Lifecycle cleanup for listeners, observers and timers
- Cached DOM lookups and bounded logs
- Stale mission and stale selection guards
- Versioned local and session storage keys

</details>

---

## Built for the UK MissionChief environment

The current userscript targets:

- `https://www.missionchief.co.uk/*`
- `https://police.missionchief.co.uk/*`

| Environment | Current position |
|---|---|
| **Desktop browsers** | Primary development and operational environment |
| **Tampermonkey** | Supported installation route |
| **Violentmonkey** | Compatible userscript-manager route; validate account-specific workflows before large batches |
| **Safari userscript managers** | Not claimed as fully validated until evidence-based device testing is complete |
| **Other MissionChief countries** | Not supported by the current UK-specific requirement and vehicle mappings |

## Release confidence

Command Nexus is no longer a README-only merge proposal. The canonical repository now contains the unified userscript, validation tooling, Greasy Fork synchronization guidance and automated release packaging.

<table>
<tr>
<td width="25%" align="center"><strong>1 · Validate</strong><br><sub>JavaScript syntax, metadata, version rules, file size and repository integrity.</sub></td>
<td width="25%" align="center"><strong>2 · Approve</strong><br><sub>MartyBlyth retains final technical and release authority.</sub></td>
<td width="25%" align="center"><strong>3 · Synchronise</strong><br><sub>Approved main-branch source drives the external distribution path.</sub></td>
<td width="25%" align="center"><strong>4 · Archive</strong><br><sub>Version tags package the userscript with a SHA-256 checksum.</sub></td>
</tr>
</table>

```text
Focused source change
        ↓
Version increase and changelog
        ↓
Userscript validation + repository integrity
        ↓
Manual MissionChief regression checks
        ↓
MartyBlyth approval
        ↓
Approved main-branch source
        ↓
Greasy Fork synchronization
        ↓
Version tag → GitHub Release + SHA-256
```

| Release resource | Open |
|---|---|
| Canonical userscript | [`src/missionchief-command-nexus.user.js`](src/missionchief-command-nexus.user.js) |
| Version history | [CHANGELOG.md](CHANGELOG.md) |
| Release procedure | [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md) |
| Greasy Fork synchronization | [docs/GREASY_FORK_SETUP.md](docs/GREASY_FORK_SETUP.md) |
| Validation workflow | [Userscript validation](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/validate-userscript.yml) |
| Packaged releases | [GitHub Releases](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases) |

> [!CAUTION]
> A green automated check proves source and repository rules passed. It does not replace live MissionChief testing for dispatch, bulk renaming, personnel assignment or transport behaviour.

## Architecture and repository map

<details>
<summary><strong>View the internal architecture</strong></summary>

```text
MissionChief Command Nexus userscript
│
├── Combined installation guard
│
├── Resource Administration Engine
│   ├── Unit naming
│   ├── Station naming
│   ├── Personnel assignment
│   ├── Training profiles
│   ├── Shared training registry
│   └── Reports and lifecycle cleanup
│
└── Mission Operations Engine
    ├── Requirement parsing
    ├── Patient and specialist demand
    ├── Vehicle and personnel matching
    ├── Unit Finder and Mission Update
    ├── Auto Mode and dispatch
    ├── Queue and transport continuation
    └── Mission logging and diagnostics
```

The current merged build intentionally retains runtime isolation between the two established engines. This reduces merge risk while allowing shared training intelligence to move from personnel administration into qualification-aware mission selection.

</details>

<details>
<summary><strong>View the repository structure</strong></summary>

```text
.github/
├── ISSUE_TEMPLATE/          Structured bug and feature forms
├── workflows/               Validation and release automation
└── CODEOWNERS               Technical ownership rules

docs/
├── media/                   README and documentation artwork
├── ARCHITECTURE.md          Architecture direction
├── GREASY_FORK_SETUP.md     Distribution synchronization guide
├── MIGRATION.md             Legacy-script migration guidance
├── RELEASE_PROCESS.md       Controlled release procedure
├── ROADMAP.md               Planned engineering work
└── TESTING.md               Regression and stability strategy

scripts/
├── check_repository.py      Repository integrity validation
└── validate-userscript.mjs  Metadata, syntax-adjacent and version validation

src/
└── missionchief-command-nexus.user.js  Canonical installable source
```

</details>

## Support and development

Use the route that matches the request. Reproducible defects belong in Issues; source changes should follow the repository contribution and validation controls.

<table>
<tr>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues"><strong>📋 ACTIVE WORK</strong><br><sub>Open issues and delivery queue</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/new?template=bug_report.yml"><strong>🐞 REPORT A BUG</strong><br><sub>Reproducible defects</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/new?template=feature_request.yml"><strong>💡 REQUEST A FEATURE</strong><br><sub>Scoped product proposals</sub></a></td>
<td width="25%" align="center"><a href="SUPPORT.md"><strong>🛟 SUPPORT POLICY</strong><br><sub>Help and support boundaries</sub></a></td>
</tr>
</table>

| Resource | Purpose |
|---|---|
| [Contributing guide](CONTRIBUTING.md) | Standards for issues, branches, validation and pull requests |
| [Testing strategy](docs/TESTING.md) | Correctness, safety, compatibility and long-session checks |
| [Migration plan](docs/MIGRATION.md) | Transition from the two old standalone installations |
| [Security policy](SECURITY.md) | Private handling of sensitive vulnerabilities and credentials |
| [Code of Conduct](CODE_OF_CONDUCT.md) | Community participation standards |
| [Master release tracker](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/10) | Coordinated path for the unified release line |

## Project authority and attribution

| Person | Responsibility |
|---|---|
| **MartyBlyth** | Project creator, original userscript author, developer, technical owner and final release approver |
| **Conroy1988** | Project helper for repository setup, documentation and general support; not a userscript developer |
| **Team Killing Bastards** | GitHub organisation and project home |

The unified script originates from two established MartyBlyth systems:

- Mission Finder 2026 Trained Personal Update
- MissionChief Unit, Station & Personnel Tools

Those systems are now distributed together as **MissionChief Command Nexus**. They are no longer presented here as two separate products to install.

## Licence and disclaimer

MissionChief Command Nexus is distributed under the [MIT Licence](LICENSE).

Copyright © 2026 **MartyBlyth**.

MissionChief trademarks, game content and related material remain the property of their respective owners. MissionChief Command Nexus is an independent community userscript and is not affiliated with, endorsed by or officially supported by MissionChief or its operators.

Automation and bulk account changes remain the operator's responsibility. Use preview and controlled-scope workflows before large administrative runs.

---

<div align="center">

<strong>MissionChief Command Nexus</strong><br>
<sub>One installation. Every step from resource preparation to live dispatch.</sub>

[Install](https://raw.githubusercontent.com/Team-Killing-Bastards/MissionChief-Command-Nexus/main/src/missionchief-command-nexus.user.js) · [Source](src/missionchief-command-nexus.user.js) · [Changelog](CHANGELOG.md) · [Issues](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues) · [Releases](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases)

</div>
