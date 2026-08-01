#!/usr/bin/env python3
from __future__ import annotations

import base64
import gzip
import hashlib
import shlex
import subprocess
import tempfile
from pathlib import Path

SOURCE = Path('src/missionchief-command-nexus.user.js')
PART_DIR = Path('.github/builders')
PART_NAMES = [
    'runtime-memory-v1074.patch.b64.00',
    'runtime-memory-v1074.patch.b64.01',
    'runtime-memory-v1074.patch.b64.02',
    'runtime-memory-v1074.patch.b64.03',
]
EXPECTED_GZIP_SHA256 = (
    'f8b601fed29f30ca9d6582a49a00469530df07d70031badc04e6fefb833f35a6'
)
EXPECTED_PATCH_SHA256 = (
    '6bc4513e7e371bdf1f3c0abdbd4257d930becd6b2f2dedd860d5410b80a177d7'
)
EXPECTED_SOURCE_SHA256 = (
    'f965161f9494d9955febc23e1e648e01877fae570842a800a8e83954b9ca70dd'
)
EXPECTED_PATHS = {
    '.github/workflows/validate-userscript.yml',
    'CHANGELOG.md',
    'README.md',
    'scripts/check-auto-dispatch-eod-required-personnel.mjs',
    'scripts/check-auto-memory-lifecycle.mjs',
    'scripts/check-auto-memory-recycle.mjs',
    'scripts/check-auto-patient-transport-anchor.mjs',
    'scripts/check-auto-patient-transport-iframe.mjs',
    'scripts/check-auto-prisoner-cell-gate.mjs',
    'scripts/check-bulk-trained-register-update.mjs',
    'scripts/check-compact-nexus-ui-v1071.mjs',
    'scripts/check-fast-personnel-register.mjs',
    'scripts/check-fire-engine-update-mapping.mjs',
    'scripts/check-hazmat-osu-issue-215.mjs',
    'scripts/check-hazmat-personnel-osu.mjs',
    'scripts/check-hems-ambulance-eta-priority.mjs',
    'scripts/check-initial-trained-personnel-authority.mjs',
    'scripts/check-ios-mission-requirements-source.mjs',
    'scripts/check-iphone-mission-ui.mjs',
    'scripts/check-missing-on-mission-authority.mjs',
    'scripts/check-missing-requirements-priority.mjs',
    'scripts/check-mission-dashboard-v1069.mjs',
    'scripts/check-mission-definition-personnel-preload.mjs',
    'scripts/check-mission-definition-trained-personnel.mjs',
    'scripts/check-mission-update-single-pass.mjs',
    'scripts/check-nexus-visual-system-v1070.mjs',
    'scripts/check-open-issues-batch.mjs',
    'scripts/check-personnel-register-transfer.mjs',
    'scripts/check-police-irv-fallback.mjs',
    'scripts/check-police-search-advisor-register.mjs',
    'scripts/check-road-rail-rru-mapping.mjs',
    'scripts/check-runtime-memory-maintenance-v1074.mjs',
    'scripts/check-saved-position-helper-copy.mjs',
    'scripts/check-trained-coverage-optimizer.mjs',
    'scripts/check-trained-personnel-panel.mjs',
    'scripts/check-unit-finder-diagnostic-export.mjs',
    'scripts/check-vehicle-drawer-animation-v1073.mjs',
    'scripts/check-vehicle-load-drawer-v1072.mjs',
    'src/README.md',
    'src/missionchief-command-nexus.user.js',
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_source() -> str:
    return SOURCE.read_text(encoding='utf-8')


def validate_candidate() -> None:
    source = read_source()
    if '// @version      1.0.74' not in source:
        raise SystemExit('Candidate does not contain Command Nexus 1.0.74')
    if 'MISSION FINDER V10.6.137' not in source:
        raise SystemExit('Candidate does not contain Mission Finder V10.6.137')
    source_hash = sha256(SOURCE.read_bytes())
    if source_hash != EXPECTED_SOURCE_SHA256:
        raise SystemExit(
            f'Candidate source checksum mismatch: {source_hash}'
        )


source = read_source()
if '// @version      1.0.74' in source:
    validate_candidate()
    print('Runtime memory maintenance v1.0.74 is already applied.')
    raise SystemExit(0)

if (
    '// @version      1.0.73' not in source
    or 'MISSION FINDER V10.6.136' not in source
):
    raise SystemExit(
        'Expected exact production 1.0.73 / V10.6.136 source baseline'
    )

part_paths = [PART_DIR / name for name in PART_NAMES]
missing = [str(path) for path in part_paths if not path.is_file()]
if missing:
    raise SystemExit(f'Missing payload parts: {missing}')

encoded = ''.join(path.read_text(encoding='ascii') for path in part_paths)
try:
    compressed = base64.b64decode(encoded, validate=True)
except Exception as error:
    raise SystemExit(f'Invalid base64 patch payload: {error}') from error

compressed_hash = sha256(compressed)
if compressed_hash != EXPECTED_GZIP_SHA256:
    raise SystemExit(
        f'Compressed patch checksum mismatch: {compressed_hash}'
    )

try:
    patch_bytes = gzip.decompress(compressed)
except Exception as error:
    raise SystemExit(f'Unable to decompress patch payload: {error}') from error

patch_hash = sha256(patch_bytes)
if patch_hash != EXPECTED_PATCH_SHA256:
    raise SystemExit(f'Patch checksum mismatch: {patch_hash}')

patch_text = patch_bytes.decode('utf-8')
actual_paths: set[str] = set()
for line in patch_text.splitlines():
    if not line.startswith('diff -ruN '):
        continue
    tokens = shlex.split(line)
    if len(tokens) < 3:
        raise SystemExit(f'Invalid diff header: {line}')
    new_path = tokens[-1]
    prefix = 'mc-repo-snapshot/'
    if not new_path.startswith(prefix):
        raise SystemExit(f'Unexpected target prefix: {new_path}')
    relative_path = new_path[len(prefix):]
    if (
        not relative_path
        or relative_path.startswith('/')
        or '..' in Path(relative_path).parts
    ):
        raise SystemExit(f'Unsafe patch path: {relative_path}')
    actual_paths.add(relative_path)

if actual_paths != EXPECTED_PATHS:
    missing_paths = sorted(EXPECTED_PATHS - actual_paths)
    extra_paths = sorted(actual_paths - EXPECTED_PATHS)
    raise SystemExit(
        f'Patch path contract mismatch; missing={missing_paths}; extra={extra_paths}'
    )

with tempfile.NamedTemporaryFile(
    prefix='runtime-memory-v1074-',
    suffix='.patch',
    delete=False,
) as patch_file:
    patch_file.write(patch_bytes)
    patch_path = Path(patch_file.name)

try:
    command = [
        'patch',
        '-p1',
        '--batch',
        '--forward',
        '-i',
        str(patch_path),
    ]
    subprocess.run(
        [*command[:4], '--dry-run', *command[4:]],
        check=True,
    )
    subprocess.run(command, check=True)
finally:
    patch_path.unlink(missing_ok=True)

rejects = sorted(Path('.').rglob('*.rej'))
if rejects:
    raise SystemExit(f'Patch produced reject files: {rejects}')

validate_candidate()
print(
    'Applied exact Command Nexus 1.0.74 / Mission Finder V10.6.137 '
    'runtime memory maintenance patch.'
)
