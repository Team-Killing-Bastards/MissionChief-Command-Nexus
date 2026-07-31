#!/usr/bin/env python3
from pathlib import Path

ROOT = Path('.')
SOURCE_PATH = ROOT / 'src/missionchief-command-nexus.user.js'
PRELOAD_TEST_PATH = ROOT / 'scripts/check-mission-definition-personnel-preload.mjs'
TRAINED_TEST_PATH = ROOT / 'scripts/check-mission-definition-trained-personnel.mjs'
CHANGELOG_PATH = ROOT / 'CHANGELOG.md'

OLD_VERSION = '1.0.67'
NEW_VERSION = '1.0.68'
OLD_ENGINE = 'V10.6.130'
NEW_ENGINE = 'V10.6.131'

HELPER = r'''

    function extractMissionDefinitionRequiredPersonnelRows(
        doc,
        excludedTable = null
    ) {
        const rows = [];
        const rawRows = [];
        let requiredPersonnelRowFound = false;

        if (!doc) {
            return rows;
        }

        Array.from(
            doc.querySelectorAll(
                'table tbody tr, table tr'
            )
        ).forEach(tr => {
            if (
                excludedTable &&
                excludedTable.contains(tr)
            ) {
                return;
            }

            const cells = Array.from(
                tr.querySelectorAll('td')
            ).map(td => {
                return String(td.textContent || '')
                    .replace(/\s+/g, ' ')
                    .trim();
            });

            if (cells.length < 2) return;

            const rawRequirementName = cells[0];
            const cleanedName =
                cleanRequirementName(
                    rawRequirementName
                );

            // This exact gate accepts Required Personnel (including a
            // percentage suffix normalised by cleanRequirementName) while
            // rejecting the Reward and Precondition row Required Personnel
            // Available.
            if (
                !/^Personnel(?:\s+Requirements?)?$/i.test(
                    cleanedName
                )
            ) {
                return;
            }

            requiredPersonnelRowFound = true;

            const amountText = String(cells[1] || '')
                .replace(/\s+/g, ' ')
                .trim();

            rawRows.push({
                label: rawRequirementName,
                value: amountText
            });

            const trainedRequirements =
                getMissionDefinitionTrainedPersonnelRequirements(
                    rawRequirementName,
                    amountText
                );
            const sarRequirements =
                getMissionDefinitionSarPersonnelVehicleRequirements(
                    rawRequirementName,
                    amountText
                );

            if (trainedRequirements.length > 0) {
                rows.push({
                    unitName:
                        MF_TRAINED_PERSONNEL_ROW_NAME,
                    stillNeeded:
                        getTrainedPersonnelVehicleTarget(
                            trainedRequirements
                        ),
                    isTrainedPersonnelRequirement:
                        true,
                    personnelTrainingRequirements:
                        trainedRequirements,
                    missionDefinitionRequiredPersonnel:
                        true,
                    source:
                        'mission-definition-required-personnel'
                });
            }

            sarRequirements.forEach(conversion => {
                rows.push({
                    unitName:
                        conversion.unitName,
                    stillNeeded:
                        conversion.stillNeeded,
                    personnelRequirement:
                        conversion.personnelRequirement,
                    missionDefinitionRequiredPersonnel:
                        true,
                    source:
                        'mission-definition-required-personnel'
                });
            });

            if (
                mfDebugEnabled &&
                (
                    trainedRequirements.length > 0 ||
                    sarRequirements.length > 0
                )
            ) {
                const parts = [];

                if (trainedRequirements.length > 0) {
                    parts.push(
                        formatTrainedPersonnelRequirements(
                            trainedRequirements
                        )
                    );
                }

                sarRequirements.forEach(conversion => {
                    parts.push(
                        `${conversion.personnelRequirement} -> ${conversion.unitName} x${conversion.stillNeeded}`
                    );
                });

                debugLog(
                    'UNIT FINDER OTHER INFORMATION REQUIRED PERSONNEL',
                    parts.join(' | ')
                );
            }
        });

        try {
            Object.defineProperties(
                rows,
                {
                    missionDefinitionRequiredPersonnelFound: {
                        value: requiredPersonnelRowFound,
                        enumerable: false
                    },
                    rawMissionDefinitionRequiredPersonnelRows: {
                        value: rawRows,
                        enumerable: false
                    }
                }
            );
        } catch (_error) {}

        return rows;
    }
'''

SUPPLEMENT = r'''

        const supplementalPersonnelRows =
            extractMissionDefinitionRequiredPersonnelRows(
                doc,
                table
            );

        supplementalPersonnelRows.forEach(row => {
            rows.push(row);
        });

        if (
            Array.isArray(
                supplementalPersonnelRows
                    .rawMissionDefinitionRequiredPersonnelRows
            )
        ) {
            mfLastMissionDefinitionRawRows.push(
                ...supplementalPersonnelRows
                    .rawMissionDefinitionRequiredPersonnelRows
            );
        }
'''

CHANGELOG_ENTRY = '''## [1.0.68] - 2026-07-31

### Fixed

- Corrected mission-load trained-personnel extraction to read the exact **Required Personnel** row from the mission definition's separate **Other information** table.
- Continued to exclude **Required Personnel Available**, which is only a spawn/precondition value and must not create dispatch demand.
- Merged trained-staff requirements into the same mission-bound preload snapshot as ordinary vehicle requirements, so the Trained Personnel panel can show `0 / required` before Unit Finder runs and update as units are selected.
- Allowed a valid Required Personnel source to initialise the requirement cache even when no separate Vehicle and Personnel Requirements table exists.
- Added cross-table regression coverage using distinct Reward and Precondition, Vehicle and Personnel Requirements, and Other information tables.

### Changed engine baseline

- Mission Finder increased from `V10.6.130` to `V10.6.131`.
- Personnel Assignment remains `1.3.8`.


'''


def replace_versions(path: Path) -> None:
    if not path.exists():
        return
    text = path.read_text(encoding='utf-8')
    updated = text.replace(OLD_VERSION, NEW_VERSION).replace(OLD_ENGINE, NEW_ENGINE)
    if updated != text:
        path.write_text(updated, encoding='utf-8')


source = SOURCE_PATH.read_text(encoding='utf-8')

# Insert the cross-table extractor directly before the existing fetched-document
# extractor. This leaves ordinary vehicle-table parsing untouched.
marker = '    function extractLiveMissionRequirementRows(html) {'
if 'function extractMissionDefinitionRequiredPersonnelRows(' not in source:
    if marker not in source:
        raise SystemExit('Unable to find extractLiveMissionRequirementRows insertion point')
    source = source.replace(marker, HELPER + '\n' + marker, 1)

# Read the exact Required Personnel row from every other mission-definition
# table after the ordinary vehicle table has been processed.
supplement_anchor = '''                }
            });
        }

        extractTowCarRequirementRows(doc).forEach(row => rows.push(row));'''
if 'const supplementalPersonnelRows =' not in source:
    if supplement_anchor not in source:
        raise SystemExit('Unable to find supplemental personnel insertion point')
    source = source.replace(
        supplement_anchor,
        '''                }
            });
        }
''' + SUPPLEMENT + '''
        extractTowCarRequirementRows(doc).forEach(row => rows.push(row));''',
        1
    )

# The fetched document is authoritative when either the ordinary vehicle table
# or the exact Required Personnel row was found.
old_found = '''                    missionRequirementTableFound: {
                        value: Boolean(table),
                        enumerable: false
                    },'''
new_found = '''                    missionRequirementTableFound: {
                        value: Boolean(
                            table ||
                            supplementalPersonnelRows
                                .missionDefinitionRequiredPersonnelFound
                        ),
                        enumerable: false
                    },'''
if old_found in source:
    source = source.replace(old_found, new_found, 1)
elif new_found not in source:
    raise SystemExit('Unable to update mission requirement source-found contract')

SOURCE_PATH.write_text(source, encoding='utf-8')

# Update current metadata expectations throughout the active regression suite.
replace_versions(SOURCE_PATH)
replace_versions(ROOT / 'README.md')
replace_versions(ROOT / 'src/README.md')
for path in (ROOT / 'scripts').glob('*.mjs'):
    replace_versions(path)

# Register the production cross-table contract in the preload regression.
preload = PRELOAD_TEST_PATH.read_text(encoding='utf-8')
if "'cross-table Required Personnel extractor'" not in preload:
    contract_anchor = "requireText('function getPreloadedMissionTrainedPersonnelRequirements(', 'required-course panel model');\n"
    contract = (
        contract_anchor +
        "requireText('function extractMissionDefinitionRequiredPersonnelRows(', 'cross-table Required Personnel extractor');\n" +
        "requireText('rawMissionDefinitionRequiredPersonnelRows', 'cross-table raw-row evidence');\n"
    )
    if contract_anchor not in preload:
        raise SystemExit('Unable to add preload cross-table contract')
    preload = preload.replace(contract_anchor, contract, 1)

    insertion = r'''

const crossTableExtractor = extractFunction(
  'extractMissionDefinitionRequiredPersonnelRows'
);
for (const token of [
  "doc.querySelectorAll(",
  "'table tbody tr, table tr'",
  'excludedTable.contains(tr)',
  'getMissionDefinitionTrainedPersonnelRequirements(',
  'getMissionDefinitionSarPersonnelVehicleRequirements(',
  'missionDefinitionRequiredPersonnelFound',
  'rawMissionDefinitionRequiredPersonnelRows',
]) {
  if (!crossTableExtractor.includes(token)) {
    fail(`Cross-table Required Personnel extractor missing ${token}`);
  }
}

const liveExtractor = extractFunction('extractLiveMissionRequirementRows');
for (const token of [
  'extractMissionDefinitionRequiredPersonnelRows(',
  'const supplementalPersonnelRows =',
  '.rawMissionDefinitionRequiredPersonnelRows',
  '.missionDefinitionRequiredPersonnelFound',
]) {
  if (!liveExtractor.includes(token)) {
    fail(`Live mission extractor missing cross-table contract ${token}`);
  }
}

const crossTableFixture = `
<table>
  <thead><tr><th>Reward and Precondition</th><th>Value</th></tr></thead>
  <tbody><tr><td>Required Personnel Available</td><td>60x Level 2 Public Order Officer 15x Police Medic</td></tr></tbody>
</table>
<table>
  <thead><tr><th>Vehicle and Personnel Requirements</th><th>Value</th></tr></thead>
  <tbody><tr><td>Required Police Cars</td><td>6</td></tr></tbody>
</table>
<table>
  <thead><tr><th>Other information</th><th>Value</th></tr></thead>
  <tbody><tr><td>Required Personnel</td><td>27x Level 2 Public Order Officer<br>6x Police Medic<br>6x Police Sergeant<br>3x Police Inspector</td></tr></tbody>
</table>`;

const fixtureRows = Array.from(
  crossTableFixture.matchAll(/<tr>[\s\S]*?<td>([\s\S]*?)<\/td>[\s\S]*?<td>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi)
).map(match => ({
  label: match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  value: match[2].replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').trim(),
}));

const actionableFixtureRows = fixtureRows
  .map(row => ({
    row,
    parsed: runtime.getMissionDefinitionTrainedPersonnelRequirements(
      row.label,
      row.value
    ),
  }))
  .filter(item => item.parsed.length > 0);

if (actionableFixtureRows.length !== 1) {
  fail(`Expected only Other information Required Personnel to be actionable, found ${actionableFixtureRows.length}`);
}
if (actionableFixtureRows[0].row.label !== 'Required Personnel') {
  fail(`Wrong cross-table row accepted: ${actionableFixtureRows[0].row.label}`);
}
const crossTableCodes = new Map(
  actionableFixtureRows[0].parsed.map(item => [item.code, item.required])
);
for (const [code, amount] of [
  ['level_2_public_order', 27],
  ['police_medic', 6],
  ['police_sergeant', 6],
  ['police_inspector', 3],
]) {
  if (crossTableCodes.get(code) !== amount) {
    fail(`Cross-table fixture expected ${code}=${amount}, found ${crossTableCodes.get(code)}`);
  }
}
'''
    final_log = "\nconsole.log('Mission Required Personnel preload checks passed.');\n"
    if final_log not in preload:
        raise SystemExit('Unable to append cross-table preload regression')
    preload = preload.replace(final_log, insertion + final_log, 1)

PRELOAD_TEST_PATH.write_text(preload, encoding='utf-8')

# Add explicit suffix and precondition boundaries to the parser regression.
trained = TRAINED_TEST_PATH.read_text(encoding='utf-8')
if 'percentageSuffix' not in trained:
    anchor = '''const wrongRow = runtime.getMissionDefinitionTrainedPersonnelRequirements(
  'Required Vehicles',
  cellText
);
if (wrongRow.length !== 0) {
  fail('Non-personnel mission rows must not enter the trained-personnel parser');
}
'''
    addition = anchor + '''
const percentageSuffix = runtime.getMissionDefinitionTrainedPersonnelRequirements(
  'Required Personnel (100%)',
  '2x Police Medic'
);
if (percentageSuffix[0]?.code !== 'police_medic' || percentageSuffix[0]?.required !== 2) {
  fail('Required Personnel percentage suffix must remain actionable');
}

const availableRow = runtime.getMissionDefinitionTrainedPersonnelRequirements(
  'Required Personnel Available',
  '20x Police Medic'
);
if (availableRow.length !== 0) {
  fail('Required Personnel Available must remain excluded');
}
'''
    if anchor not in trained:
        raise SystemExit('Unable to add parser boundary regression')
    trained = trained.replace(anchor, addition, 1)
TRAINED_TEST_PATH.write_text(trained, encoding='utf-8')

changelog = CHANGELOG_PATH.read_text(encoding='utf-8')
if '## [1.0.68]' not in changelog:
    insertion_point = changelog.find('## [')
    if insertion_point < 0:
        raise SystemExit('Unable to find changelog release insertion point')
    changelog = changelog[:insertion_point] + CHANGELOG_ENTRY + changelog[insertion_point:]
    CHANGELOG_PATH.write_text(changelog, encoding='utf-8')

print('Applied Command Nexus 1.0.68 Required Personnel cross-table load fix.')
