#!/usr/bin/env python3
"""Parse every permanent GitHub Actions workflow as YAML."""

from __future__ import annotations

import sys
from pathlib import Path

try:
    import yaml
except ImportError as exc:  # pragma: no cover - exercised by the workflow setup
    raise SystemExit(
        "PyYAML is required. Install the pinned Repository Quality dependency first."
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW_DIRECTORY = ROOT / ".github/workflows"


def main() -> None:
    workflows = sorted(
        path
        for pattern in ("*.yml", "*.yaml")
        for path in WORKFLOW_DIRECTORY.glob(pattern)
        if path.is_file()
    )
    if not workflows:
        raise SystemExit("No permanent GitHub Actions workflow YAML files were found.")

    failed = False
    for path in workflows:
        relative_path = path.relative_to(ROOT)
        try:
            with path.open(encoding="utf-8") as handle:
                yaml.safe_load(handle)
        except yaml.YAMLError as exc:
            failed = True
            print(f"ERROR: {relative_path} is invalid YAML: {exc}", file=sys.stderr)
        else:
            print(f"Parsed {relative_path}")

    if failed:
        raise SystemExit(1)

    print(f"Parsed {len(workflows)} permanent workflow YAML files.")


if __name__ == "__main__":
    main()
