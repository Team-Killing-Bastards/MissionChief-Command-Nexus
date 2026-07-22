#!/usr/bin/env python3
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


source_path = Path("src/missionchief-command-nexus.user.js")
source = source_path.read_text(encoding="utf-8")
source = replace_once(source, "// @version      1.0.18", "// @version      1.0.19", "userscript version")
source = replace_once(source, " * MODULE 2: MISSION FINDER V10.6.83", " * MODULE 2: MISSION FINDER V10.6.84", "Mission Finder version")

release_anchor = "    // V10.6.82: verified Fire profiles staff type-107 RRUs with two Railway Fire\n"
release_note = (
    "    // V10.6.84: the exact mission wording \"Fire, rescue or aerial appliance\"\n"
    "    // now maps to the existing Rescue Pump route.\n"
)
source = replace_once(source, release_anchor, release_note + release_anchor, "Mission Finder release note")

alias = '        "Fire, rescue or aerial appliance": "Rescue Pump",\n'
alias_anchor = '        "Aerial Appliance Trucks": "CARP",\n'
source = replace_once(source, alias_anchor, alias_anchor + alias, "Rescue Pump alias")
if source.count(alias) != 1:
    raise SystemExit(f"Rescue Pump alias count was {source.count(alias)}, expected 1")
source_path.write_text(source, encoding="utf-8", newline="\n")

changelog_path = Path("CHANGELOG.md")
changelog = changelog_path.read_text(encoding="utf-8")
release = """## [1.0.19] - 2026-07-22

### Fixed

- Mapped the exact `Fire, rescue or aerial appliance` mission requirement to `Rescue Pump`.

### Changed

- Mission Finder increased from `V10.6.83` to `V10.6.84`.

"""
changelog = replace_once(changelog, "## [1.0.18] - 2026-07-22", release + "## [1.0.18] - 2026-07-22", "changelog release")
changelog_path.write_text(changelog, encoding="utf-8", newline="\n")

readme_path = Path("README.md")
readme = readme_path.read_text(encoding="utf-8")
readme = replace_once(readme, "**Current version:** `1.0.18` · **Mission Finder engine:** `V10.6.83`", "**Current version:** `1.0.19` · **Mission Finder engine:** `V10.6.84`", "README version")
readme = replace_once(readme, "[**v1.0.18**](#current-v1018-behaviour)", "[**v1.0.19**](#current-v1019-behaviour)", "README navigation")
readme = replace_once(readme, "## Current v1.0.18 behaviour", "## Current v1.0.19 behaviour", "README heading")
bullet_anchor = "- BASU, Welfare and HazMat reuse one selected Fire OSU; type-86 SAR vans remain separate.\n"
bullet = "- `Fire, rescue or aerial appliance` requirements map to `Rescue Pump`.\n"
readme = replace_once(readme, bullet_anchor, bullet_anchor + bullet, "README Rescue Pump bullet")
readme_path.write_text(readme, encoding="utf-8", newline="\n")

source_readme_path = Path("src/README.md")
source_readme = source_readme_path.read_text(encoding="utf-8")
source_readme = replace_once(source_readme, "| Command Nexus version | `1.0.18` |", "| Command Nexus version | `1.0.19` |", "source README version")
source_readme = replace_once(source_readme, "| Mission Finder baseline | `V10.6.83` |", "| Mission Finder baseline | `V10.6.84` |", "source README Mission Finder")
source_readme_path.write_text(source_readme, encoding="utf-8", newline="\n")

print("v1.0.19 Rescue Pump hotfix built.")
