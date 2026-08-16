#!/usr/bin/env python3
"""Repository integrity checks for MissionChief Command Nexus."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = (
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "SUPPORT.md",
    "CODE_OF_CONDUCT.md",
    ".github/CODEOWNERS",
    ".github/pull_request_template.md",
    ".github/ISSUE_TEMPLATE/bug_report.yml",
    ".github/ISSUE_TEMPLATE/feature_request.yml",
    ".github/workflows/repository-quality.yml",
    ".github/workflows/validate-userscript.yml",
    ".github/workflows/release.yml",
    "docs/README.md",
    "docs/DEVELOPER_HANDOFF.md",
    "docs/ARCHITECTURE.md",
    "docs/ROADMAP.md",
    "docs/TESTING.md",
    "docs/MIGRATION.md",
    "docs/RELEASE_PROCESS.md",
    "docs/GREASY_FORK_SETUP.md",
    "docs/repository-automation-cleanup-2026-08-16.md",
    "docs/media/readme-hero.svg",
    "scripts/validate-userscript.mjs",
    "scripts/check-version-agnostic-regressions.mjs",
    "scripts/check-ios-compatibility.mjs",
    "src/README.md",
    "src/missionchief-command-nexus.user.js",
)

MARKDOWN_LINK = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")
HTML_LINK = re.compile(
    r"<(?:a|img)\b[^>]*?\b(?:href|src)=[\"']([^\"']+)[\"']",
    re.IGNORECASE,
)
HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*#*\s*$", re.MULTILINE)
HTML_TAG = re.compile(r"<[^>]+>")
USERSCRIPT_VERSION = re.compile(r"^//\s*@version\s+(\S+)\s*$", re.MULTILINE)
README_VERSION = re.compile(r"\*\*Current version:\*\*\s*`([^`]+)`")
SOURCE_README_VERSION = re.compile(r"\|\s*Command Nexus version\s*\|\s*`([^`]+)`\s*\|")
CHANGELOG_VERSION = re.compile(r"^##\s+\[([^\]]+)\]", re.MULTILINE)
MISSION_FINDER_VERSION = re.compile(
    r"MODULE 2: MISSION FINDER V(\d+(?:\.\d+){2})"
)
RESOURCE_ADMIN_VERSION = re.compile(
    r"MODULE 1: UNIT, STATION & PERSONNEL TOOLS V(\d+(?:\.\d+){2})"
)
COMPONENT_VERSIONS = {
    "Unit Naming": re.compile(r"const UNIT_VERSION = '(\d+(?:\.\d+){2})';"),
    "Station Naming": re.compile(r"const STATION_VERSION = '(\d+(?:\.\d+){2})';"),
    "Personnel Assignment": re.compile(
        r"const PERSONNEL_VERSION = '(\d+(?:\.\d+){2})';"
    ),
}


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def check_required_files() -> None:
    missing = [path for path in REQUIRED_FILES if not (ROOT / path).is_file()]
    if missing:
        fail("Missing required files: " + ", ".join(missing))


def check_attribution() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    licence = (ROOT / "LICENSE").read_text(encoding="utf-8")
    userscript = (ROOT / "src/missionchief-command-nexus.user.js").read_text(
        encoding="utf-8"
    )

    required_patterns = (
        (
            r"MartyBlyth.{0,220}creator",
            "README must identify MartyBlyth as the project creator",
        ),
        (
            r"MartyBlyth.{0,220}technical owner",
            "README must identify MartyBlyth as the technical owner",
        ),
        (
            r"MartyBlyth.{0,220}release authority",
            "README must identify MartyBlyth as the release authority",
        ),
        (
            r"Conroy1988.{0,220}project helper",
            "README must identify Conroy1988 as a project helper",
        ),
        (
            r"Conroy1988.{0,420}iOS Safari compatibility",
            "README must attribute the scoped iOS Safari contribution to Conroy1988",
        ),
        (
            r"(?:MartyBlyth's project|does not change the project's overall ownership)",
            "README must preserve MartyBlyth's overall project ownership",
        ),
    )
    for pattern, message in required_patterns:
        if not re.search(pattern, readme, re.IGNORECASE | re.DOTALL):
            fail(message)

    if "Copyright (c) 2026 MartyBlyth" not in licence:
        fail("MIT Licence attribution must name MartyBlyth")

    if not re.search(
        r"^//\s*@author\s+MartyBlyth\s*$",
        userscript,
        re.MULTILINE,
    ):
        fail("Canonical userscript metadata must name MartyBlyth as @author")


def extract_targets(text: str) -> list[str]:
    targets = MARKDOWN_LINK.findall(text)
    targets.extend(HTML_LINK.findall(text))
    return targets


def normalise_target(raw_target: str) -> str:
    target = raw_target.strip().strip("<>")
    if target.startswith(("http://", "https://", "mailto:", "#")):
        return target
    return target.split(maxsplit=1)[0]


def check_local_links() -> None:
    broken: list[str] = []

    for markdown_file in ROOT.rglob("*.md"):
        text = markdown_file.read_text(encoding="utf-8")
        for raw_target in extract_targets(text):
            target = normalise_target(raw_target)
            parsed = urlparse(target)

            if parsed.scheme or target.startswith(("#", "mailto:")):
                continue

            path_part = unquote(target.split("#", 1)[0])
            if not path_part:
                continue

            resolved = (markdown_file.parent / path_part).resolve()
            try:
                resolved.relative_to(ROOT)
            except ValueError:
                broken.append(
                    f"{markdown_file.relative_to(ROOT)} -> {target} "
                    "(outside repository)"
                )
                continue

            if not resolved.exists():
                broken.append(f"{markdown_file.relative_to(ROOT)} -> {target}")

    if broken:
        fail("Broken local README/document links:\n  " + "\n  ".join(sorted(set(broken))))


def github_heading_slug(text: str) -> str:
    text = HTML_TAG.sub("", text)
    text = text.replace("`", "").strip().lower()
    text = re.sub(r"[^\w\- ]", "", text, flags=re.UNICODE)
    text = re.sub(r"\s+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


def check_readme_anchors() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    anchors = {
        github_heading_slug(match.group(2))
        for match in HEADING.finditer(readme)
        if github_heading_slug(match.group(2))
    }

    broken = []
    for raw_target in extract_targets(readme):
        target = normalise_target(raw_target)
        if not target.startswith("#"):
            continue
        anchor = unquote(target[1:]).lower()
        if anchor and anchor not in anchors:
            broken.append(target)

    if broken:
        fail("Broken README section links: " + ", ".join(sorted(set(broken))))


def check_readme_presentation() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")

    if 'src="docs/media/readme-hero.svg"' not in readme:
        fail("README must use the repository-hosted Command Nexus hero artwork")

    if "img.shields.io" in readme:
        fail(
            "README must not depend on external Shields.io presentation badges; "
            "use repository-hosted or GitHub-native presentation"
        )

    if "actions/workflows/validate-userscript.yml/badge.svg" not in readme:
        fail("README must display the GitHub-native userscript validation badge")

    if "actions/workflows/repository-quality.yml/badge.svg" not in readme:
        fail("README must display the GitHub-native repository quality badge")


def read_canonical_version() -> str:
    canonical = (ROOT / "src/missionchief-command-nexus.user.js").read_text(
        encoding="utf-8"
    )
    match = USERSCRIPT_VERSION.search(canonical)
    if not match:
        fail("Canonical userscript has no readable @version")
    return match.group(1)


def read_canonical_component_versions() -> dict[str, str]:
    canonical = (ROOT / "src/missionchief-command-nexus.user.js").read_text(
        encoding="utf-8"
    )
    patterns = {
        "Resource Administration": RESOURCE_ADMIN_VERSION,
        "Mission Finder": MISSION_FINDER_VERSION,
        **COMPONENT_VERSIONS,
    }
    versions: dict[str, str] = {}
    for label, pattern in patterns.items():
        matches = pattern.findall(canonical)
        if len(matches) != 1:
            fail(f"Canonical userscript must contain exactly one {label} version")
        versions[label] = matches[0]
    return versions


def check_userscript_metadata_and_version() -> None:
    scripts = sorted(ROOT.rglob("*.user.js"))
    if not scripts:
        fail("Canonical .user.js source is missing")

    required_fields = ("@name", "@namespace", "@version", "@license", "@match")

    for script in scripts:
        text = script.read_text(encoding="utf-8")
        relative = script.relative_to(ROOT)

        if text.count("// ==UserScript==") != 1 or text.count("// ==/UserScript==") != 1:
            fail(f"{relative} must contain exactly one userscript metadata block")

        for field in required_fields:
            if field not in text:
                fail(f"{relative} is missing required metadata field {field}")

    canonical_version = read_canonical_version()
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    source_readme = (ROOT / "src/README.md").read_text(encoding="utf-8")
    changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")

    readme_match = README_VERSION.search(readme)
    source_match = SOURCE_README_VERSION.search(source_readme)
    released_versions = {
        version for version in CHANGELOG_VERSION.findall(changelog) if version != "Unreleased"
    }

    if not readme_match:
        fail("README has no Current version field")
    if not source_match:
        fail("src/README.md has no Command Nexus version field")
    if readme_match.group(1) != canonical_version:
        fail(
            "README version does not match canonical userscript: "
            f"{readme_match.group(1)} != {canonical_version}"
        )
    if source_match.group(1) != canonical_version:
        fail(
            "Source directory version does not match canonical userscript: "
            f"{source_match.group(1)} != {canonical_version}"
        )
    if canonical_version not in released_versions:
        fail(f"CHANGELOG.md has no release section for canonical version {canonical_version}")


def check_current_documentation() -> None:
    canonical_version = read_canonical_version()
    component_versions = read_canonical_component_versions()
    mission_finder = component_versions["Mission Finder"]

    required_phrases = {
        "docs/DEVELOPER_HANDOFF.md": (
            "Current verified baseline",
            "What is not yet proven complete",
            "Safe first development workflow",
            f"| Command Nexus version | `{canonical_version}` |",
            f"| Mission Finder baseline | `V{mission_finder}` |",
        ),
        "docs/ARCHITECTURE.md": (
            "Current architecture",
            "What remains separate",
            "Target architecture",
            f"Command Nexus v{canonical_version}",
            f"Mission Finder `V{mission_finder}`",
        ),
        "docs/ROADMAP.md": (
            f"Current production baseline — v{canonical_version}",
            f"Mission Finder `V{mission_finder}`",
            "Phase 7 — Formal release (completed)",
        ),
        "docs/MIGRATION.md": (
            "Migration test matrix",
            "Rollback",
            f"Command Nexus `{canonical_version}`",
        ),
        "docs/TESTING.md": (
            "Automated validation",
            "Compatibility matrix",
            "Release-blocking failures",
            "check-version-agnostic-regressions.mjs",
        ),
        "docs/README.md": (
            "Current operational documentation",
            "Historical records",
            f"Command Nexus `{canonical_version}` with Mission Finder `V{mission_finder}`",
        ),
        "docs/RELEASE_PROCESS.md": (
            "Google Memory Bank and Rules documents",
            "Repository-only maintenance",
        ),
    }

    for relative, phrases in required_phrases.items():
        text = (ROOT / relative).read_text(encoding="utf-8")
        for phrase in phrases:
            if phrase not in text:
                fail(f"{relative} is missing current-state section: {phrase!r}")

    operational_files = tuple(ROOT / relative for relative in required_phrases)
    operational_docs = "\n".join(
        path.read_text(encoding="utf-8") for path in operational_files
    )
    stale_patterns = (
        (r"\bv1\.0\.1(?!\d)", "v1.0.1 presented in current operating guidance"),
        (r"\bV10\.6\.69\b", "the imported Mission Finder baseline"),
        (r"Current baseline — merged", "the pre-release roadmap baseline"),
        (r"urgent publication status", "the historical v1.0.3 blocker"),
        (r"before the first formal release", "the pre-release migration gate"),
        (r"There is no unified installation package yet", "the pre-merge package state"),
        (
            r"unified userscript has not yet been published from this repository",
            "the pre-publication state",
        ),
    )
    for pattern, label in stale_patterns:
        if re.search(pattern, operational_docs, re.IGNORECASE):
            fail(f"Current documentation still contains {label}")


def check_no_temporary_executables() -> None:
    forbidden_patterns = (
        (".github", re.compile(r".*(?:trigger.*\.txt|\.trigger)$", re.IGNORECASE)),
        (
            ".github/workflows",
            re.compile(
                r"(?:build|fix|inspect|run)-.*-v\d+\.ya?ml$", re.IGNORECASE
            ),
        ),
        (
            "scripts",
            re.compile(
                r"(?:apply|build|repair)-.*-v\d+\.(?:js|mjs|py)$", re.IGNORECASE
            ),
        ),
    )
    violations: list[str] = []
    for relative_root, pattern in forbidden_patterns:
        directory = ROOT / relative_root
        if not directory.exists():
            continue
        for path in directory.iterdir():
            if path.is_file() and pattern.fullmatch(path.name):
                violations.append(str(path.relative_to(ROOT)))

    if violations:
        fail(
            "Temporary one-use executable artifacts must not be tracked:\n  "
            + "\n  ".join(sorted(violations))
        )

    validation_workflow = (
        ROOT / ".github/workflows/validate-userscript.yml"
    ).read_text(encoding="utf-8")
    if "for check in scripts/check-*.mjs" not in validation_workflow:
        fail("Userscript validation workflow must run the complete regression suite")
    if re.search(r"^\s{2}build_v\d+:\s*$", validation_workflow, re.MULTILINE):
        fail("Userscript validation workflow must not contain one-shot version builders")


def main() -> None:
    check_required_files()
    check_attribution()
    check_local_links()
    check_readme_anchors()
    check_readme_presentation()
    check_userscript_metadata_and_version()
    check_current_documentation()
    check_no_temporary_executables()
    print("Repository integrity checks passed.")


if __name__ == "__main__":
    main()
