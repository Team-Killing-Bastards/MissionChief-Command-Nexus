<div align="center">

<img src="docs/media/readme-hero.svg" alt="MissionChief Command Nexus operational control system" width="100%">

# MissionChief Command Nexus

### Resource preparation, trained-personnel intelligence, live mission matching, and dispatch—in one MissionChief UK userscript

<table>
<tr>
<td width="25%" align="center"><a href="https://greasyfork.org/en/scripts/587702-missionchief-command-nexus"><strong>⬇ INSTALL / UPDATE</strong><br><sub>Recommended Greasy Fork route</sub></a></td>
<td width="25%" align="center"><a href="src/missionchief-command-nexus.user.js"><strong>⌘ VIEW SOURCE</strong><br><sub>Canonical userscript</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/latest"><strong>◈ LATEST RELEASE</strong><br><sub>Verified source and assets</sub></a></td>
<td width="25%" align="center"><a href="https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues"><strong>⚠ ISSUES</strong><br><sub>Confirmed gaps and roadmap</sub></a></td>
</tr>
</table>

**Current version:** `1.0.19` · **Mission Finder engine:** `V10.6.84` · **Platform:** [MissionChief UK](https://www.missionchief.co.uk/) · **Licence:** [MIT](LICENSE)

[![Userscript validation](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/validate-userscript.yml/badge.svg)](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/validate-userscript.yml)
[![Repository quality](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/repository-quality.yml/badge.svg)](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/actions/workflows/repository-quality.yml)

[**What it is**](#what-it-is) · [**Install**](#install) · [**Workflows**](#operational-workflows) · [**v1.0.19**](#current-v1019-behaviour) · [**Safety**](#operational-safety) · [**Architecture**](#architecture) · [**Ownership**](#ownership-and-contributions) · [**Release system**](#release-and-quality-system)

</div>

---

## What it is

MissionChief Command Nexus unifies two established MartyBlyth systems into one maintained installation:

- **Mission Finder** — mission requirements, trained-personnel matching, vehicle selection, Mission Update, Auto Mode, dispatch, upgrades, and continuation.
- **Unit, Station & Personnel Tools** — station naming, vehicle naming, personnel assignment, training intelligence, and operational reporting.

```text
Stations → Vehicles → Personnel → Training Capability → Live Mission Demand → Selection → Dispatch
```

The distributed product is one `.user.js` file with one metadata block and one installation guard. Internally, the two mature runtime engines remain deliberately separated so resource administration and mission operations can initialise, fail, and clean up independently.

Their primary shared contract is the **vehicle-training register**. The administration engine can verify exactly which personnel are assigned to each vehicle; the mission engine can then select specialist capability using vehicle identity and evidence rather than a display name alone.

> [!IMPORTANT]
> **MartyBlyth remains the creator, principal userscript author, technical owner, and release authority.** **Conroy1988 supports repository infrastructure, documentation, validation, and general project operations. After identifying the Safari compatibility gap on the iPhone and iPad devices he uses, Conroy asked Marty for permission to contribute, then initiated, designed, and implemented the v1.0.15 iOS Safari compatibility layer, the v1.0.16 station-workflow hardening for the shared Unit, Station and Personnel menu, and the v1.0.18 iOS Safari Mission Control layout for the dispatch screen.** This scoped contribution does not change the project's overall ownership or release authority.

## Install

1. Install **Tampermonkey** or **Violentmonkey**.
2. Open [MissionChief Command Nexus on Greasy Fork](https://greasyfork.org/en/scripts/587702-missionchief-command-nexus).
3. Select **Install this script** or **Update**.
4. Disable both legacy standalone scripts:
   - Mission Finder 2026 Trained Personal Update
   - MissionChief Unit, Station & Personnel Tools
5. Reload MissionChief.

> [!WARNING]
> Keep **one active Command Nexus installation only**. Both legacy engines are already included and must not run beside the combined userscript.

The canonical source is [`src/missionchief-command-nexus.user.js`](src/missionchief-command-nexus.user.js) on `main`. Greasy Fork remains the supported public update channel.

## Operational workflows

### Resource administration

| Area | Current behaviour |
|---|---|
| **Station naming** | Generates and previews structured station names from available station and location data |
| **Vehicle naming** | Applies repeatable captions and numbering across supported station and vehicle types |
| **Scoped batch processing** | Operates on a chosen station scope with progress, pause, resume, and stop controls where supported |
| **Personnel Assignment** | Finds trained personnel, plans eligible assignments, supports Preview and Live modes, and verifies submitted changes |
| **Build Personnel Register** | Reads each discovered vehicle's assignment page without changing assignments |
| **Training register** | Stores exact verified vehicle/personnel capability for specialist mission matching |
| **Reporting** | Separates changed, skipped, failed, unfilled, and genuine training-shortage outcomes |

### Mission operations

| Area | Current behaviour |
|---|---|
| **Unit Finder** | Reads current mission demand and selects mapped vehicles and trained personnel |
| **Mission Update / Upgrade** | Re-reads live requirements and adds only the remaining actionable shortage |
| **Auto Mode** | Loads the complete vehicle list, evaluates demand, selects resources, validates readiness, and dispatches as a managed cycle |
| **Patient demand** | Reconciles visible patients and ambulance demand when static mission text is incomplete |
| **Exact specialist matching** | Uses vehicle IDs, assignment-page evidence, and required qualifications |
| **Continuation** | Handles upgrades, queue progression, unattended recovery, and patient/prisoner transport controls |
| **Diagnostics** | Records completed, skipped, blocked, and failed outcomes while guarding against stale missions and repeated dispatch |

### Complete vehicle-list loading

Before Unit Finder, Mission Update, or Auto Mode selects resources, Command Nexus:

1. detects every visible `Load more vehicles` / `missing_vehicles_load` control;
2. loads each `offset_page` sequentially;
3. confirms that vehicle IDs or row count changed;
4. waits for controls and loading indicators to settle;
5. requires the final non-zero list to remain ID-stable; and
6. fails closed when the mission changes, loading stalls, or the bounded timeout is reached.

This prevents selection against a partial MissionChief vehicle table.

## Current v1.0.19 behaviour

### Verified Fire training profiles

- Railway Fire: 2 trained personnel per exact type-107 RRU.
- Level 1 Incident Commander: 3 trained personnel per exact type-15 ICCU.
- HazMat Unit: 3 trained personnel per exact type-39 Fire OSU.
- BASU, Welfare and HazMat reuse one selected Fire OSU; type-86 SAR vans remain separate.
- `Fire, rescue or aerial appliance` requirements map to `Rescue Pump`.

High Volume Pump, Drone Operator, Co-Responder and Lifeguard remain disabled pending later evidence.

### iOS Safari website menus

The shared Resource Administration panel and the Mission Control dispatch panel now use dedicated layouts on the MissionChief website in Safari on iPhone and iPad.

- Responsive station-list markup is recognised without weakening the desktop station-page guard.
- Unit Naming, Station Naming, Personnel Assignment and Build Personnel Register all use the same responsive station discovery layer.
- Exactly one Command Nexus administration menu is retained after duplicate injection, Safari bfcache restoration or page-fragment replacement.
- Responsive `Details` links fall back to a hidden same-origin station iframe when MissionChief's desktop lightbox binding is unavailable, preventing navigation away from the Stations tab.
- The Resource Administration panel uses Safari safe-area insets, touch scrolling and pointer dragging.
- Mission Control opens at the safe-area top instead of the centre of the dispatch screen, stacks its panels to the mobile viewport width and keeps long content internally scrollable.
- Mission Control has a horizontal chevron collapse control; the Vehicle Load List defaults collapsed on first iOS Safari use and can be expanded independently.
- Mission Control supports pointer dragging and visual-viewport repositioning after Safari address-bar changes, rotation and bfcache restoration.
- Desktop Mission Control dimensions, saved coordinates, centring and mouse dragging remain on the existing desktop code path.
- iPad desktop-site mode is recognised through touch-capable `MacIntel` detection.
- Chrome, Firefox, Edge and native iOS webview/app wrappers are not treated as Safari website sessions.

> [!NOTE]
> This compatibility work was initiated, designed, and implemented by **[Conroy1988](https://github.com/Conroy1988)** after he identified the need in his own iPhone and iPad Safari workflow. Conroy requested permission to contribute and **[MartyBlyth](https://github.com/Martyblyth)** approved the contribution. The underlying Unit, Station and Personnel system and Mission Finder engine remain Marty's work.

### Live requirements are authoritative

When MissionChief exposes the visible Live Mission Requirements panel, Unit Finder and Mission Update treat it as the current authority instead of allowing stale mission-help rows to override the live mission state.

- Numeric `Still Needed` values are direct shortages.
- Bounded values such as `0-3` use their upper actionable bound.
- A literal unknown `?` falls back to `Required` as a total target and deducts existing matching selections.
- Numeric shortages are **not** reduced a second time by vehicles already selected.
- Successful selection clicks are included in final confirmation.
- Static mission-help remains a fallback only when no usable live requirements panel exists.

This prevents cases such as an old Major Foam Tender row replacing a current Rescue Support Vehicle demand, or a one-unit shortage producing a false two-unit warning.

### Police and trained-personnel matching

- Ordinary Police attendance is protected from unnecessarily consuming specialist IRVs.
- Police Officer upgrade rows convert at two officers per normal Police IRV.
- Police Medic and Railway Police requirements use exact trained personnel where mapped.
- Armed Personnel and Armed Response Personnel route to exact type-25 Armed Traffic Cars.
- Armed Traffic Car selection verifies Roads Policing plus Firearms capability.
- The preferred policy is two qualifying personnel, with the implemented bounded fallback preserved where applicable.

### Fire, rescue, maritime, and medical handling

- Generic type-66 `4x4 Vehicle` matching is restored.
- SAR Commander demand converts to Control Van capability.
- `Operational Support or SAR Vehicle` selects and verifies the exact type-86 Operational Support Van.
- Seagoing Vessel requirements recognise supported ALB / ABL / All-weather Lifeboat variants.
- ATV Carrier matching uses authoritative vehicle type `30` without confusing it with Armed Traffic Cars.
- Patient and ambulance demand is reconciled across repeated selection passes.
- Live mission upgrades are re-read before additional vehicles are selected.

### Personnel intelligence

- Build Personnel Register scans every discovered station type and vehicle individually.
- Each vehicle's own assignment page is read before capability is recorded.
- Register building is read-only.
- Personnel Assignment retains controlled Preview and Live workflows for implemented profiles.
- Structurally incomplete specialist evidence fails closed rather than authorising a guessed selection.

## Known limitations

Command Nexus is operational software, not a claim that every MissionChief UK vehicle, training course, mission, or markup variant is fully mapped.

| Limitation | Current position |
|---|---|
| **Country coverage** | MissionChief UK only |
| **Primary environment** | Desktop remains the principal operating target; the shared administration menu and Mission Control dispatch panel now have dedicated MissionChief website layouts in Safari on iPhone and iPad |
| **Training profiles** | Remaining Medical, Fire, Airfield, SAR, Mountain Rescue, and Coastguard profiles are tracked through issues |
| **External requirements data** | Some Fire specialist logic remains dependent on stable requirement data exposed by MissionChief or compatible panels |
| **PSU assignment priority** | Nine-seat Police Support Unit preference remains tracked work |
| **Interface consolidation** | One installation still contains two retained operational control surfaces |
| **Mobile and Safari** | iOS Safari website support covers the shared administration menu and the Mission Control dispatch panel; other Mission Finder surfaces remain desktop-first unless separately documented |
| **Live-game variability** | MissionChief markup and labels can change independently of this repository |

Use the [issue tracker](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues) as the authoritative development queue.

## Operational safety

Command Nexus can make bulk account changes and can select and dispatch vehicles. Use it as controlled automation.

- Use **Preview** before naming or personnel-assignment writes.
- Test a small station scope before a large batch.
- Refresh the Personnel Register before relying on specialist matching.
- Observe Auto Mode on representative missions before unattended use.
- Treat unsupported demand and staffing shortages as blocking conditions.
- Stop and report cross-mission selection, repeated dispatch, or incorrect personnel assignment.
- Review the [changelog](CHANGELOG.md) and open issues before major operational use.

Supported domains:

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
│   ├── Training profiles and assignment scans
│   └── Reports, persistence, and cleanup
│
├── Shared verified vehicle-training register
│
└── Mission Operations Engine
    ├── Live requirement and patient parsing
    ├── Complete vehicle-list loading
    ├── Exact vehicle and trained-personnel matching
    ├── Unit Finder and Mission Update
    ├── Auto Mode, dispatch, and sharing
    └── Upgrades, queue, and transport continuation
```

See [Architecture](docs/ARCHITECTURE.md) and [Developer Handoff](docs/DEVELOPER_HANDOFF.md) for deeper engineering detail.

## Ownership and contributions

Command Nexus remains **MartyBlyth's project**. Contributions are attributed at feature level so the repository records who delivered each piece of work without collapsing the project's ownership boundary.

| Contributor | Role and responsibility |
|---|---|
| **[MartyBlyth](https://github.com/Martyblyth)** | Creator and technical owner; original author of Mission Finder and the Unit, Station & Personnel systems; principal userscript development, technical direction, release decisions, and ongoing feature authority |
| **[Conroy1988](https://github.com/Conroy1988)** | Project helper for repository infrastructure, documentation, validation, and general operations; independently initiated the iOS Safari compatibility work, obtained Marty's permission to contribute, and designed and implemented the scoped v1.0.15 compatibility layer, the v1.0.16 station-workflow hardening and the v1.0.18 Mission Control iOS Safari layout |

## Release and quality system

```text
Focused source change
        ↓
Version and changelog update
        ↓
Pull request validation
        ↓
Merge to canonical main
        ↓
Unpublished-version detection
        ↓
Recoverable GitHub Release publication
        ↓
Asset download and SHA-256 verification
        ↓
GitHub source / release / Greasy Fork parity
        ↓
Discord release announcement
```

Repository validation covers:

- JavaScript syntax;
- userscript metadata and version consistency;
- required repository and policy files;
- README links, anchors, artwork, and badges;
- ownership and attribution requirements;
- release assets and checksum verification; and
- recovery from partial, empty, starter, or mismatched release assets.

Discord is notified only after the release, immutable GitHub source, and Greasy Fork source satisfy the release contract.

## Development and support

| Destination | Purpose |
|---|---|
| [Greasy Fork](https://greasyfork.org/en/scripts/587702-missionchief-command-nexus) | Supported installation and updates |
| [Latest release](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/latest) | Verified release assets |
| [Issues](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues) | Bugs, limitations, and planned work |
| [Changelog](CHANGELOG.md) | Version history |
| [Architecture](docs/ARCHITECTURE.md) | Runtime and integration design |
| [Developer Handoff](docs/DEVELOPER_HANDOFF.md) | Current source-development context |

<div align="center">

### One installation. Two proven engines. One operational chain.

**Created and technically owned by [MartyBlyth](https://github.com/Martyblyth).**  
Repository infrastructure, documentation, validation, and the independently initiated v1.0.15-v1.0.18 iOS Safari compatibility work by [Conroy1988](https://github.com/Conroy1988), contributed with Marty's permission.

</div>
