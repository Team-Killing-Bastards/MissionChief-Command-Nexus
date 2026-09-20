#!/usr/bin/env python3
"""Permanent repository checks for the Nexus Realism Phase 1 backend."""

from __future__ import annotations

import py_compile
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "server" / "realism"

REQUIRED = [
    BASE / "README.md",
    BASE / "collector" / "realism.py",
    BASE / "sql" / "bootstrap.sql",
    BASE / "osm" / "nexus-emergency.lua",
    BASE / "osm" / "promote-realism.sql",
    BASE / "osm" / "import-great-britain.sh",
    BASE / "osm" / "import-scotland.sh",
    BASE / "osm" / "validate-realism.sh",
    BASE / "ROLLBACK.md",
]

ALLOWED_TYPES = {
    "fire_station",
    "ambulance_station",
    "police_station",
    "hospital",
    "prison",
    "lifeboat_station",
    "coastguard_station",
    "mountain_rescue",
    "dispatch_centre",
}

for path in REQUIRED:
    if not path.is_file():
        raise SystemExit(f"Missing Realism source file: {path.relative_to(ROOT)}")

py_compile.compile(str(BASE / "collector" / "realism.py"), doraise=True)

for shell_script in [
    BASE / "osm" / "import-great-britain.sh",
    BASE / "osm" / "import-scotland.sh",
    BASE / "osm" / "validate-realism.sh",
]:
    subprocess.run(["bash", "-n", str(shell_script)], check=True)

api = (BASE / "collector" / "realism.py").read_text()
promotion = (BASE / "osm" / "promote-realism.sql").read_text()
bootstrap = (BASE / "sql" / "bootstrap.sql").read_text()
lua = (BASE / "osm" / "nexus-emergency.lua").read_text()

for service_type in ALLOWED_TYPES:
    if service_type not in api:
        raise SystemExit(f"Realism API lost allowed type: {service_type}")
    if service_type not in promotion:
        raise SystemExit(f"Promotion classifier lost type: {service_type}")

for required_sql in [
    "CREATE EXTENSION IF NOT EXISTS postgis",
    "CREATE EXTENSION IF NOT EXISTS hstore",
    "geometry(Point, 4326)",
    "realism.location_services",
    "realism.import_runs",
]:
    if required_sql not in bootstrap:
        raise SystemExit(f"Realism bootstrap lost contract: {required_sql}")

for required_lua in [
    "nexus_emergency_nodes",
    "nexus_emergency_ways",
    "nexus_emergency_relations",
    "dispatch_name and emergency_operator",
]:
    if required_lua not in lua:
        raise SystemExit(f"OSM Flex filter lost contract: {required_lua}")

for path in BASE.rglob("*"):
    if not path.is_file():
        continue
    lower = path.name.lower()
    if lower.endswith(".osm.pbf") or lower.endswith(".dump") or lower == ".env":
        raise SystemExit(f"Forbidden runtime/data file committed: {path.relative_to(ROOT)}")
    if "password" in lower or "secret" in lower or lower.endswith(".key"):
        raise SystemExit(f"Potential secret file committed: {path.relative_to(ROOT)}")

print("Realism Phase 1 source validation passed.")
