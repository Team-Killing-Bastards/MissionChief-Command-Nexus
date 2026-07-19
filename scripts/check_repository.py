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
    "docs/ARCHITECTURE.md",
    "docs/ROADMAP.md",
    "docs/TESTING.md",
    "docs/MIGRATION.md",
    "docs/RELEASE_PROCESS.md",
)

MARKDOWN_LINK = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")


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

    required_readme_phrases = (
        "developed by **MartyBlyth**",
        "Conroy1988 is a project helper only",
        "he is not a developer of the userscript",
    )
    for phrase in required_readme_phrases:
        if phrase not in readme:
            fail(f"README attribution is missing required phrase: {phrase!r}")

    if "Copyright (c) 2026 MartyBlyth" not in licence:
        fail("MIT Licence attribution must name MartyBlyth")


def check_local_markdown_links() -> None:
    broken: list[str] = []

    for markdown_file in ROOT.rglob("*.md"):
        text = markdown_file.read_text(encoding="utf-8")
        for raw_target in MARKDOWN_LINK.findall(text):
            target = raw_target.strip().split(maxsplit=1)[0].strip("<>")
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
                broken.append(f"{markdown_file.relative_to(ROOT)} -> {target} (outside repository)")
                continue

            if not resolved.exists():
                broken.append(f"{markdown_file.relative_to(ROOT)} -> {target}")

    if broken:
        fail("Broken local Markdown links:\n  " + "\n  ".join(sorted(broken)))


def check_userscript_metadata() -> None:
    scripts = sorted(ROOT.rglob("*.user.js"))
    if not scripts:
        print("No .user.js source present yet; metadata checks skipped.")
        return

    required_fields = ("@name", "@namespace", "@version", "@license", "@match")

    for script in scripts:
        text = script.read_text(encoding="utf-8")
        relative = script.relative_to(ROOT)

        if text.count("// ==UserScript==") != 1 or text.count("// ==/UserScript==") != 1:
            fail(f"{relative} must contain exactly one userscript metadata block")

        for field in required_fields:
            if field not in text:
                fail(f"{relative} is missing required metadata field {field}")


def main() -> None:
    check_required_files()
    check_attribution()
    check_local_markdown_links()
    check_userscript_metadata()
    print("Repository integrity checks passed.")


if __name__ == "__main__":
    main()
