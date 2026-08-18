from pathlib import Path


def replace_once_in_file(path_string, old, new, label):
    path = Path(path_string)
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f'{label}: expected exactly one match, found {count}'
        )
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


source_path = Path('src/missionchief-command-nexus.user.js')
source = source_path.read_text(encoding='utf-8')
source_replacements = [
    (
        "const MF_MISSION_LOGGER_CLIENT_VERSION = '1.1.6';",
        "const MF_MISSION_LOGGER_CLIENT_VERSION = '1.1.7';",
        'logger client version',
    ),
    (
        "const MF_MISSION_LOGGER_MISSION_FINDER_VERSION =\n        '10.7.4';",
        "const MF_MISSION_LOGGER_MISSION_FINDER_VERSION =\n        '10.7.5';",
        'logger Mission Finder version',
    ),
    (
        "        wrapper.appendChild(panel);\n        wrapper.appendChild(loadPanel);\n        wrapper.appendChild(patientPanel);\n        wrapper.appendChild(trainedPanel);",
        "        wrapper.appendChild(panel);\n        wrapper.appendChild(loadPanel);\n        wrapper.appendChild(trainedPanel);\n        wrapper.appendChild(patientPanel);",
        'preserve Vehicle Load / Trained Personnel DOM adjacency',
    ),
]
for old, new, label in source_replacements:
    count = source.count(old)
    if count != 1:
        raise SystemExit(
            f'{label}: expected exactly one match, found {count}'
        )
    source = source.replace(old, new, 1)
source_path.write_text(source, encoding='utf-8')

replace_once_in_file(
    'src/README.md',
    '| Command Nexus version | `1.1.6` |\n| Mission Finder baseline | `V10.7.4` |',
    '| Command Nexus version | `1.1.7` |\n| Mission Finder baseline | `V10.7.5` |',
    'source README baseline',
)
replace_once_in_file(
    'docs/DEVELOPER_HANDOFF.md',
    '| Command Nexus version | `1.1.6` |\n| Mission Finder baseline | `V10.7.4` |',
    '| Command Nexus version | `1.1.7` |\n| Mission Finder baseline | `V10.7.5` |',
    'developer handoff baseline',
)
replace_once_in_file(
    'docs/ROADMAP.md',
    '## Current production baseline — v1.1.6\n\n- [x] Publish one canonical userscript on trusted `main`.\n- [x] Release Command Nexus `1.1.6` with Mission Finder `V10.7.4`.',
    '## Current production baseline — v1.1.7\n\n- [x] Publish one canonical userscript on trusted `main`.\n- [x] Release Command Nexus `1.1.7` with Mission Finder `V10.7.5`.',
    'roadmap baseline',
)
replace_once_in_file(
    'docs/MIGRATION.md',
    'The current Command Nexus `1.1.6` source retains versioned keys from both established engines.',
    'The current Command Nexus `1.1.7` source retains versioned keys from both established engines.',
    'migration current version',
)
replace_once_in_file(
    'docs/README.md',
    'The current production baseline is Command Nexus `1.1.6` with Mission Finder `V10.7.4`.',
    'The current production baseline is Command Nexus `1.1.7` with Mission Finder `V10.7.5`.',
    'docs index baseline',
)
replace_once_in_file(
    'docs/README.md',
    'Version `1.1.6` replaces device pairing with a private Apps Script URL plus selected-user logger profile, while retaining the default-off background patient transport worker and loss-resistant multi-batch drain.',
    'Version `1.1.7` adds a live attached Patient Transfers drawer for the default-off background patient transport worker, including pending/completed/failed run counters and bounded per-attempt failure diagnostics, while retaining the private Apps Script URL logger profile and loss-resistant multi-batch drain.',
    'docs index current release focus',
)

print('v1.1.7 source, compatibility markers and operational documentation aligned.')
