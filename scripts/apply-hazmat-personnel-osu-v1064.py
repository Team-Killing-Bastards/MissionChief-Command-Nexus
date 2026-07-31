#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / 'src/missionchief-command-nexus.user.js'


def replace_exact(text: str, old: str, new: str, label: str, count: int = 1) -> str:
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f'{label}: expected {count} match(es), found {actual}')
    return text.replace(old, new, count)


source = SOURCE_PATH.read_text(encoding='utf-8')
source = replace_exact(
    source,
    '// @version      1.0.63',
    '// @version      1.0.64',
    'userscript version',
)
source = replace_exact(
    source,
    "const PERSONNEL_VERSION = '1.3.7';",
    "const PERSONNEL_VERSION = '1.3.8';",
    'Personnel Assignment version',
)
source = replace_exact(
    source,
    ' * MODULE 2: MISSION FINDER V10.6.126',
    ' * MODULE 2: MISSION FINDER V10.6.127',
    'Mission Finder version',
)
source = replace_exact(
    source,
    "id: 'fire_hazmat_osu', label: 'HazMat Unit',\n            vehicleTypeIds: ['39'], vehicleLabel: 'Operational Support Unit', target: 3,\n            trainingAll: ['gw_gefahrgut'], trainingLabel: 'HazMat Unit'",
    "id: 'fire_hazmat_osu', label: 'HazMat Unit',\n            vehicleTypeIds: ['39'], vehicleLabel: 'Operational Support Unit', target: 6,\n            trainingAll: ['gw_gefahrgut'], trainingLabel: 'HazMat Unit'",
    'Fire HazMat assignment target',
)
source = replace_exact(
    source,
    "'3 HazMat-trained personnel per OSU', 'LIVE: fills each exact type-39 Fire OSU with 3 gw_gefahrgut-trained personnel.",
    "'6 HazMat-trained personnel per OSU', 'LIVE: fills each exact type-39 Fire OSU with 6 gw_gefahrgut-trained personnel.",
    'Fire HazMat profile description',
)
source = replace_exact(
    source,
    'Fire OSUs with three HazMat personnel. BASU, Welfare and HazMat share one OSU.',
    'Fire OSUs with six HazMat personnel. BASU, Welfare and HazMat share one OSU.',
    'Mission Finder Fire capacity comment',
)
source = replace_exact(
    source,
    '    // V10.6.85: Fire cross-reference now maps the exact "Road Rail Unit"',
    "    // V10.6.127: Missing Personnel HazMat Unit quantities are trained staff totals.\n"
    "    // Six gw_gefahrgut-trained personnel fit one exact type-39 Fire OSU; ordinary\n"
    "    // HazMat vehicle requirements remain separate and keep their vehicle quantity.\n"
    '    // V10.6.85: Fire cross-reference now maps the exact "Road Rail Unit"',
    'Mission Finder v10.6.127 comment',
)

pattern_start = source.index('const MF_TRAINED_PERSONNEL_PATTERNS =')
pattern_end = source.index('\n\n    let mfKeepPanelPosition', pattern_start)
pattern_block = source[pattern_start:pattern_end]
armed_marker = """            {
                code:
                    'armed_response_personnel',"""
hazmat_pattern = """            {
                code:
                    'gw_gefahrgut',
                label:
                    'HazMat Unit',
                patterns: [
                    /(\\d+)\\s*(?:x\\s*)?HazMat\\s+Unit(?:s)?/gi,
                    /HazMat\\s+Unit(?:s)?\\s*(?:x\\s*)?(\\d+)/gi
                ]
            },
"""
pattern_block = replace_exact(
    pattern_block,
    armed_marker,
    hazmat_pattern + armed_marker,
    'HazMat trained-personnel pattern insertion',
)
source = source[:pattern_start] + pattern_block + source[pattern_end:]

normalise_start = source.index('    function normalisePublicOrderTrainedRequirements(')
normalise_end = source.index('\n    function ', normalise_start + 20)
normalise = source[normalise_start:normalise_end]
normalise = replace_exact(
    normalise,
    """        const searchAdvisorRequired =
            findRequired('search_and_rescue');

        const normalised =""",
    """        const searchAdvisorRequired =
            findRequired('search_and_rescue');

        const hazMatRequired =
            findRequired('gw_gefahrgut');

        const normalised =""",
    'HazMat personnel total',
)
normalise = replace_exact(
    normalise,
    """                    requirement.code !==
                        'search_and_rescue'
""",
    """                    requirement.code !==
                        'search_and_rescue' &&
                    requirement.code !==
                        'gw_gefahrgut'
""",
    'HazMat raw requirement filter',
)
hazmat_requirement = """
        addTrainedVehicleRequirement({
            code:
                'gw_gefahrgut',
            label:
                'HazMat-trained Fire OSU',
            personnelRequired:
                hazMatRequired,
            requirementType:
                'fire_hazmat_osu_trained_vehicle',
            eligibleVehicleTypeIds: [
                '39'
            ],
            vehicleCapacityByType: {
                '39': 6
            },
            preferredVehicleTypeIds: [
                '39'
            ],
            requiredTrainingCodes: [
                'gw_gefahrgut'
            ]
        });

"""
normalise = replace_exact(
    normalise,
    '        if (armedResponseRequired > 0) {',
    hazmat_requirement + '        if (armedResponseRequired > 0) {',
    'HazMat trained OSU normalization',
)
source = source[:normalise_start] + normalise + source[normalise_end:]
SOURCE_PATH.write_text(source, encoding='utf-8')

# Keep every permanent current-version assertion aligned. Changelog history is
# deliberately excluded so older releases remain immutable.
for path in sorted((ROOT / 'scripts').glob('*.mjs')):
    text = path.read_text(encoding='utf-8')
    updated = text.replace('1.0.63', '1.0.64').replace('V10.6.126', 'V10.6.127')
    updated = updated.replace("PERSONNEL_VERSION = '1.3.7'", "PERSONNEL_VERSION = '1.3.8'")
    if updated != text:
        path.write_text(updated, encoding='utf-8')

for relative in ('README.md', 'src/README.md'):
    path = ROOT / relative
    text = path.read_text(encoding='utf-8')
    updated = text.replace('`1.0.63`', '`1.0.64`').replace('`V10.6.126`', '`V10.6.127`')
    updated = updated.replace(
        'HazMat Unit: 3 trained personnel per exact type-39 Fire OSU.',
        'HazMat Unit: 6 trained personnel per exact type-39 Fire OSU.',
    )
    updated = updated.replace('3 HazMat-trained personnel per OSU', '6 HazMat-trained personnel per OSU')
    updated = updated.replace('3 gw_gefahrgut-trained personnel', '6 gw_gefahrgut-trained personnel')
    path.write_text(updated, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
release_marker = '## [1.0.63] - 2026-07-31\n'
release_entry = """## [1.0.64] - 2026-07-31

### Fixed

- `Missing Personnel: Nx HazMat Unit` is now interpreted as a HazMat-trained personnel shortage rather than an ordinary vehicle quantity.
- HazMat personnel demand now uses six `gw_gefahrgut`-trained staff per exact type-39 Fire Operational Support Unit, so four missing staff select one OSU and seven select two.
- The Fire HazMat Personnel Assignment profile now fills six trained staff per OSU, keeping the verified Personnel Register and Mission Finder coverage calculation aligned.
- Ordinary HazMat vehicle requirements remain separate, retain their exact vehicle quantity and continue to reject type-7 HazMat Units and type-86 Operational Support Vans.

### Changed engine baseline

- Mission Finder increased from `V10.6.126` to `V10.6.127`.
- Personnel Assignment increased from `1.3.7` to `1.3.8`.

"""
changelog = replace_exact(
    changelog,
    release_marker,
    release_entry + release_marker,
    'v1.0.64 changelog insertion',
)
changelog_path.write_text(changelog, encoding='utf-8')

workflow_path = ROOT / '.github/workflows/validate-userscript.yml'
workflow = workflow_path.read_text(encoding='utf-8')
workflow = workflow.replace(
    '# Includes mission-definition trained-personnel, selected-trained-personnel UI, HazMat-to-OSU,',
    '# Includes mission-definition trained-personnel, selected-trained-personnel UI, HazMat vehicle/personnel-to-OSU,',
)
path_marker = "      - 'scripts/check-hazmat-osu-issue-215.mjs'\n"
workflow = replace_exact(
    workflow,
    path_marker,
    path_marker + "      - 'scripts/check-hazmat-personnel-osu.mjs'\n",
    'HazMat personnel CI path registration',
    count=2,
)
step_marker = """      - name: Validate Issue 215 HazMat to exact OSU mapping
        run: node scripts/check-hazmat-osu-issue-215.mjs

"""
workflow = replace_exact(
    workflow,
    step_marker,
    step_marker + """      - name: Validate HazMat Missing Personnel OSU capacity
        run: node scripts/check-hazmat-personnel-osu.mjs

""",
    'HazMat personnel CI step registration',
)
workflow_path.write_text(workflow, encoding='utf-8')

print('Applied v1.0.64 HazMat trained-personnel OSU correction.')
