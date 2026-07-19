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
    "docs/media/readme-hero.svg",
    "scripts/validate-userscript.mjs",
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
            r"developed by\s+\*{0,2}MartyBlyth\*{0,2}",
            "README must identify MartyBlyth as the developer",
        ),
        (
            r"Conroy1988.{0,180}project helper",
            "README must identify Conroy1988 as a project helper",
        ),
        (
            r"(?:Conroy1988|he).{0,220}not a userscript developer",
            "README must state that Conroy1988 is not a userscript developer",
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
    required_phrases = {
        "docs/DEVELOPER_HANDOFF.md": (
            "Current verified baseline",
            "What is not yet proven complete",
            "Safe first development workflow",
        ),
        "docs/ARCHITECTURE.md": (
            "Current architecture",
            "What remains separate",
            "Target architecture",
        ),
        "docs/ROADMAP.md": (
            "Current baseline — merged v1.0.1",
            "Phase 7 — First formal release",
        ),
        "docs/MIGRATION.md": (
            "Migration test matrix",
            "Rollback",
        ),
        "docs/TESTING.md": (
            "Automated validation",
            "Compatibility matrix",
            "Release-blocking failures",
        ),
    }

    for relative, phrases in required_phrases.items():
        text = (ROOT / relative).read_text(encoding="utf-8")
        for phrase in phrases:
            if phrase not in text:
                fail(f"{relative} is missing current-state section: {phrase!r}")

    stale_claims = (
        "unified codebase exists",
        "There is no unified installation package yet",
        "unified userscript has not yet been published from this repository",
    )
    documentation = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (ROOT / "docs").rglob("*.md")
    )
    for claim in stale_claims:
        if claim.lower() in documentation.lower():
            fail(f"Documentation still contains stale planning claim: {claim!r}")


def main() -> None:
    check_required_files()
    check_attribution()
    check_local_links()
    check_readme_anchors()
    check_readme_presentation()
    check_userscript_metadata_and_version()
    check_current_documentation()
    print("Repository integrity checks passed.")


if __name__ == "__main__":
    main()
