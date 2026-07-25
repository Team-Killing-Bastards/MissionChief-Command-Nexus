<div align="center">

<img src="docs/media/readme-hero.svg" alt="MissionChief Command Nexus operational command system" width="100%">

# MissionChief Command Nexus

### The operational control layer for MissionChief UK

**Prepare resources. Verify capability. Read live demand. Match exactly. Dispatch with control.**

<table>
<tr>
<td width="25%" align="center"><a href="https://greasyfork.org/en/scripts/587702-missionchief-command-nexus"><strong>⬇ INSTALL / UPDATE</strong><br><sub>Recommended Greasy Fork route</sub></a></td>
<td width="25%" align="center"><a href="src/missionchief-command-nexus.user.js"><strong>⌘ VIEW SOURCE</strong><br><sub>Canonical userscript on main</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/latest"><strong>◈ LATEST RELEASE</strong><br><sub>Verified assets and checksum</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues"><strong>⚠ COMMAND QUEUE</strong><br><sub>Bugs, gaps, and roadmap</sub></a></td>
</tr>
</table>

**Current version:** `1.0.23` · **Mission Finder engine:** `V10.6.88` · **Platform:** [MissionChief UK](https://www.missionchief.co.uk/) · **Licence:** [MIT](LICENSE)

[![Userscript validation](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/validate-userscript.yml/badge.svg)](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/validate-userscript.yml)
[![Repository quality](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/repository-quality.yml/badge.svg)](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/repository-quality.yml)

[**Command brief**](#command-brief) · [**Install**](#install-in-60-seconds) · [**Capability matrix**](#capability-matrix) · [**Operational chain**](#operational-chain) · [**Production status**](#current-production-capability) · [**Safety**](#safety-doctrine) · [**Architecture**](#system-architecture) · [**Ownership**](#ownership-and-contribution-record) · [**Release control**](#release-control)

</div>

---

## Command brief

MissionChief Command Nexus combines two proven MartyBlyth systems into one maintained MissionChief UK installation:

<table>
<tr>
<td width="50%" valign="top">

### 🛰️ Mission Operations Engine

- Live mission-requirement interpretation
- Complete vehicle-list loading
- Exact vehicle and trained-personnel matching
- Unit Finder and Mission Update
- Auto Mode, dispatch, upgrades, and continuation
- Patient, prisoner, and transport handling

</td>
<td width="50%" valign="top">

### 🛠️ Resource Administration Engine

- Unit naming and station naming
- Personnel planning, preview, and controlled assignment
- Shared trained-vehicle registry
- Station-class filtering and scoped runs
- Long-run iframe and lifecycle cleanup

</td>
</tr>
</table>

Command Nexus is not a generic browser macro. It is a requirement-aware operational system with explicit ownership boundaries, fail-closed safety checks, evidence-led vehicle selection, and a controlled publication chain.

---

## Install in 60 seconds

### 1. Install a userscript manager

Install Tampermonkey or another compatible userscript manager in a supported browser.

### 2. Install Command Nexus

Use the maintained distribution route:

**[Install or update from Greasy Fork](https://greasyfork.org/en/scripts/587702-missionchief-command-nexus)**

### 3. Confirm the version

Open the userscript manager and confirm that **MissionChief Command Nexus** matches the version shown at the top of this README.

### 4. Open MissionChief UK

Command Nexus supports:

- `https://www.missionchief.co.uk/*`
- `https://police.missionchief.co.uk/*`

Disable the old standalone scripts before enabling Command Nexus. Running both copies together can create duplicate panels and competing automation loops.

---

## Capability matrix

<table>
<thead>
<tr>
<th>Operational area</th>
<th>Current capability</th>
<th>Control principle</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Mission reading</strong></td>
<td>Static help attachments, live mission requirement tables, patient demand, update alerts, and transport state</td>
<td>Prefer the most current mission-owned source</td>
</tr>
<tr>
<td><strong>Vehicle selection</strong></td>
<td>Exact and alternative vehicle rules, type-aware matching, arrival ordering, complete-list loading, and retry reconciliation</td>
<td>Never infer a valid unit from an unsafe partial match</td>
</tr>
<tr>
<td><strong>Trained personnel</strong></td>
<td>Exact vehicle ID registry, live assignment-page verification, profile-specific requirements, two-person preference, and one-person fallback</td>
<td>Prove the people are assigned to the vehicle being selected</td>
</tr>
<tr>
<td><strong>Patients and transport</strong></td>
<td>Patient badge demand, critical-care handling, ambulance transport, nearest eligible destination, and controlled progression</td>
<td>Live patient state owns medical demand</td>
</tr>
<tr>
<td><strong>Resource administration</strong></td>
<td>Unit naming, station naming, personnel preview/assignment, register building, station filters, and class-scoped runs</td>
<td>Bulk actions remain explicit, reviewable, and stoppable</td>
</tr>
<tr>
<td><strong>Release control</strong></td>
<td>Automated validation, GitHub Release assets, checksums, Greasy Fork parity checks, and Discord delivery receipts</td>
<td>No release is complete until every publication target is verified</td>
</tr>
</tbody>
</table>

---

## Operational chain

```text
MissionChief UK
      │
      ▼
Read current mission state
      │
      ├── Static mission-help requirements
      ├── Live requirement table
      ├── Patient and transport state
      └── Missing vehicle/personnel alerts
      │
      ▼
Normalise operational demand
      │
      ├── Vehicle alternatives and strict type rules
      ├── Personnel-to-vehicle conversions
      └── Trained-profile requirements
      │
      ▼
Load and stabilise the complete vehicle list
      │
      ▼
Verify and select eligible units
      │
      ├── Exact vehicle IDs
      ├── Current assignment pages
      ├── Arrival ordering
      └── Existing selections
      │
      ▼
Reconcile remaining demand
      │
      ├── Mission Update
      ├── Retry after additional vehicle loading
      └── Fail-closed staffing/qualification guards
      │
      ▼
Dispatch / Dispatch & Share / controlled skip
```

---

## Current production capability

The current `main` userscript is a merged, installable Command Nexus build with:

- One standardized metadata block.
- One outer installation guard.
- Independently isolated Resource Administration and Mission Operations engines.
- Shared trained-vehicle registry support.
- Automated GitHub and Greasy Fork publication.
- Discord release notification with message receipt verification.

The authoritative distributable is:

```text
src/missionchief-command-nexus.user.js
```

Raw canonical source:

```text
https://raw.githubusercontent.com/Team-Killing-Bastards/MissionChief-Command-Nexus/main/src/missionchief-command-nexus.user.js
```

See [Source Directory](src/README.md), [Production Status](docs/PRODUCTION_STATUS.md), and [Developer Handoff](docs/DEVELOPER_HANDOFF.md) for the detailed baseline.

---

## Safety doctrine

Command Nexus follows four non-negotiable rules:

1. **Current mission state owns dispatch.** Previous mission iframes, alerts, selections, and cached requirements cannot satisfy the active mission.
2. **Exact evidence beats naming assumptions.** Trained personnel and strict specialist vehicles are verified from exact vehicle IDs or authoritative type information.
3. **Staffing faults do not trigger vehicle spam.** Missing personnel or qualifications stop duplicate selection attempts rather than sending additional vehicles blindly.
4. **Incomplete loading blocks selection.** Auto Mode cannot select or dispatch until the visible vehicle list and every additional page are stable.

High-risk changes involving dispatch, trained personnel, patient demand, bulk assignment, naming queues, or lifecycle cleanup require regression evidence before release.

---

## System architecture

```text
MissionChief Command Nexus
│
├── Resource Administration Engine
│   ├── Unit Naming Tool
│   ├── Station Naming Tool
│   ├── Personnel Assignment Tool
│   └── Shared vehicle-training registry writer
│
├── Mission Operations Engine
│   ├── Mission Finder
│   ├── Mission Update
│   ├── Auto Mode and dispatch controller
│   ├── Patient / prisoner / transport handlers
│   └── Shared vehicle-training registry reader
│
├── Validation layer
│   ├── Userscript metadata and syntax
│   ├── Repository integrity
│   ├── iOS Safari compatibility
│   └── Runtime hardening contracts
│
└── Release layer
    ├── GitHub tag and Release
    ├── Versioned userscript asset
    ├── SHA-256 checksum
    ├── Greasy Fork source parity
    └── Discord delivery receipt
```

The retained module guards and startup isolation are deliberate compatibility controls. Deeper interface and storage consolidation remains a future architectural task and must not be mixed into operational fixes without dedicated testing.

---

## Ownership and contribution record

| Area | Owner / contributor |
|---|---|
| Product direction, operational rules, source-code ownership, release approval | **MartyBlyth** |
| Original Command Nexus development and maintained userscript logic | **MartyBlyth** |
| Repository structure, documentation support, issue handling support | **Conroy1988** |
| MissionChief platform and game assets | Respective platform owners |

See [Attribution](ATTRIBUTION.md) for the permanent contribution record.

---

## Release control

The production release chain is designed to run automatically after a validated pull request is merged:

1. Validate JavaScript, userscript metadata, iOS Safari contracts, runtime-hardening contracts, and repository integrity.
2. Read the canonical `@version` from `main`.
3. Create or reconcile the matching Git tag and GitHub Release.
4. Upload the versioned userscript and SHA-256 checksum.
5. Download and verify both release assets independently.
6. Verify that Greasy Fork serves the exact canonical source.
7. Post the release embed to Discord and record the returned message and channel IDs.
8. Skip duplicate publication when an already-complete release is detected.

Release procedures and recovery guidance are documented in:

- [Release Process](docs/RELEASE_PROCESS.md)
- [Greasy Fork Setup](docs/GREASY_FORK_SETUP.md)
- [Release Runbook](docs/RELEASE_RUNBOOK.md)
- [Operations Runbook](docs/OPERATIONS_RUNBOOK.md)

---

## Development workflow

Before publishing a source change:

1. Branch from current `main`.
2. Change only the canonical userscript and required documentation.
3. Increase `@version`.
4. Add a dated changelog entry.
5. Run the repository validators.
6. Complete targeted MissionChief regression tests.
7. Open a pull request with the root cause, behaviour change, and rollback evidence.
8. Merge only after checks pass.

Do not configure Greasy Fork against a branch, pull-request ref, copied text file, or release asset. The only live synchronization source is the canonical userscript on `main`.

---

## Support and issue reporting

Use the repository issue tracker for:

- Incorrect vehicle selection.
- Missing requirement mappings.
- Trained-personnel verification failures.
- Mission Update or Auto Mode regressions.
- Naming or personnel-assignment issues.
- Long-run memory or lifecycle problems.

A useful issue report includes:

- Mission name and visible requirement wording.
- Expected units.
- Actual units selected or popup message.
- Browser and userscript-manager versions.
- Whether the failure occurred in Unit Finder, Mission Update, Auto Mode, or Resource Administration.
- Screenshots or exact HTML where available.

---

## Licence

MissionChief Command Nexus is released under the [MIT License](LICENSE). MissionChief and related game assets remain the property of their respective owners.
