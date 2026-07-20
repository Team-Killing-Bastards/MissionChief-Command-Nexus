from pathlib import Path


def replace_exact(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label} expected exactly one match; found {count}")
    path.write_text(
        text.replace(old, new, 1),
        encoding="utf-8",
        newline="\n",
    )


source_path = Path("src/missionchief-command-nexus.user.js")
replace_exact(
    source_path,
    "// @version      1.0.3",
    "// @version      1.0.4",
    "Userscript metadata version",
)

readme_path = Path("README.md")
replace_exact(
    readme_path,
    "**Current version:** `1.0.3`",
    "**Current version:** `1.0.4`",
    "README current version",
)

source_readme_path = Path("src/README.md")
source_readme = source_readme_path.read_text(encoding="utf-8")
for old, new, label in (
    (
        "| Command Nexus version | `1.0.3` |",
        "| Command Nexus version | `1.0.4` |",
        "Source README Command Nexus version",
    ),
    (
        "| Mission Finder baseline | `V10.6.70` |",
        "| Mission Finder baseline | `V10.6.71` |",
        "Source README Mission Finder baseline",
    ),
):
    count = source_readme.count(old)
    if count != 1:
        raise SystemExit(f"{label} expected exactly one match; found {count}")
    source_readme = source_readme.replace(old, new, 1)

source_readme_path.write_text(
    source_readme,
    encoding="utf-8",
    newline="\n",
)

changelog_path = Path("CHANGELOG.md")
changelog = changelog_path.read_text(encoding="utf-8")
heading = "## [1.0.4] - 2026-07-20"
anchor = "## [1.0.3] - 2026-07-20"

if heading not in changelog:
    if changelog.count(anchor) != 1:
        raise SystemExit("CHANGELOG v1.0.3 anchor was not found exactly once")

    section = """## [1.0.4] - 2026-07-20

### Changed

- Auto Mode now activates every visible MissionChief `missing_vehicles_load` control before Unit Finder begins selecting vehicles.
- Increased the unified userscript version from `1.0.3` to `1.0.4` and the Mission Finder baseline from `V10.6.70` to `V10.6.71`.

### Fixed

- Fixed Auto Mode waiting on the `Vehicle display limited! Load more vehicles!` bar without clicking it.
- Added sequential `offset_page` loading so every additional vehicle page is requested, not only the first page.
- Added per-page progress checks using the vehicle ID and row-count signature, control replacement and loading-indicator state.
- Unit selection now starts only after the final load control has disappeared and the complete vehicle list remains stable.
- Loading fails closed when the mission changes, the control cannot be clicked, no progress occurs or the bounded timeout is reached.

"""
    changelog = changelog.replace(anchor, section + anchor, 1)

changelog_path.write_text(
    changelog,
    encoding="utf-8",
    newline="\n",
)

print("Updated v1.0.4 metadata, README baselines and changelog")
