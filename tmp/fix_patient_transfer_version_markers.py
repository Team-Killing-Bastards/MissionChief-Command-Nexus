from pathlib import Path

path = Path('src/missionchief-command-nexus.user.js')
source = path.read_text(encoding='utf-8')

replacements = [
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

for old, new, label in replacements:
    count = source.count(old)
    if count != 1:
        raise SystemExit(
            f'{label}: expected exactly one match, found {count}'
        )
    source = source.replace(old, new, 1)

path.write_text(source, encoding='utf-8')
print('v1.1.7 compatibility markers and panel order aligned.')
