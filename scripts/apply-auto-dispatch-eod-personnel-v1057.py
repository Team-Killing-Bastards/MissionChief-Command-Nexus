#!/usr/bin/env python3
from pathlib import Path

SOURCE = Path('src/missionchief-command-nexus.user.js')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def insert_before(text, marker, addition, label):
    if text.count(marker) != 1:
        raise SystemExit(f'{label}: expected one marker, found {text.count(marker)}')
    return text.replace(marker, addition + marker, 1)


source = SOURCE.read_text(encoding='utf-8')

source = replace_once(
    source,
    '// @version      1.0.56',
    '// @version      1.0.57',
    'metadata version'
)
source = replace_once(
    source,
    'MODULE 2: MISSION FINDER V10.6.119',
    'MODULE 2: MISSION FINDER V10.6.120',
    'Mission Finder module version'
)
source = replace_once(
    source,
    "commandNexus: '1.0.56',",
    "commandNexus: '1.0.57',",
    'diagnostic Command Nexus version'
)
source = replace_once(
    source,
    "missionFinder: 'V10.6.119',",
    "missionFinder: 'V10.6.120',",
    'diagnostic Mission Finder version'
)
source = replace_once(
    source,
    'const MF_UNIT_FINDER_DIAGNOSTICS_LIMIT = 12;',
    'const MF_UNIT_FINDER_DIAGNOSTICS_LIMIT = 24;',
    'diagnostic history limit'
)

source = insert_before(
    source,
    '    function getAllMatchingVehicleCheckboxes(originalName, mappedName, includeChecked) {\n',
    r'''    function getEodResponseRequirementMode(
        originalName,
        mappedName
    ) {
        const values = [
            originalName,
            mappedName
        ].map(normaliseVehicleText);

        const normalEod = new Set([
            'eod response vehicle',
            'eod response vehicles',
            'required eod response vehicle',
            'required eod response vehicles'
        ]);
        const marineEod = new Set([
            'marine eod response vehicle',
            'marine eod response vehicles',
            'required marine eod response vehicle',
            'required marine eod response vehicles'
        ]);

        if (values.some(value => marineEod.has(value))) {
            return 'marine';
        }
        if (values.some(value => normalEod.has(value))) {
            return 'normal';
        }
        return '';
    }

    function isEodResponseVehicleCheckbox(input) {
        if (!input) return false;
        const typeIds = getVehicleTypeIdentifiers(input);
        if (typeIds.includes('110')) return true;
        if (typeIds.length > 0) return false;
        return getExtendedVehicleValues(input).some(value => {
            const normalised = normaliseVehicleText(value);
            return normalised === 'eod response vehicle' ||
                normalised === 'eod response vehicles';
        });
    }

    function isMarineEodResponseVehicleCheckbox(input) {
        if (!input) return false;
        const typeIds = getVehicleTypeIdentifiers(input);
        if (typeIds.includes('113')) return true;
        if (typeIds.length > 0) return false;
        return getExtendedVehicleValues(input).some(value => {
            const normalised = normaliseVehicleText(value);
            return normalised === 'marine eod response vehicle' ||
                normalised === 'marine eod response vehicles';
        });
    }

''',
    'EOD exact helpers'
)

source = replace_once(
    source,
    '''        if (isFireEngineRequirement(originalName, mappedName)) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => {
                    if (input.disabled) return false;
                    if (!includeChecked && input.checked) return false;
                    return isFireEngineVehicleCheckbox(input);
                })
            );
        }

        const candidates = getVehicleMatchCandidates(originalName, mappedName);''',
    '''        if (isFireEngineRequirement(originalName, mappedName)) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => {
                    if (input.disabled) return false;
                    if (!includeChecked && input.checked) return false;
                    return isFireEngineVehicleCheckbox(input);
                })
            );
        }

        const eodResponseMode =
            getEodResponseRequirementMode(
                originalName,
                mappedName
            );

        if (eodResponseMode) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => {
                    if (input.disabled) return false;
                    if (!includeChecked && input.checked) return false;
                    return eodResponseMode === 'marine'
                        ? isMarineEodResponseVehicleCheckbox(input)
                        : isEodResponseVehicleCheckbox(input);
                })
            );
        }

        const candidates = getVehicleMatchCandidates(originalName, mappedName);''',
    'EOD exact selection branch'
)

source = replace_once(
    source,
    '''        if (isFireEngineRequirement(originalName, mappedName)) {
            return getVehicleCheckboxSnapshot().filter(input => (
                input.checked &&
                isFireEngineVehicleCheckbox(input)
            )).length;
        }

        const candidates = getVehicleMatchCandidates(originalName, mappedName);''',
    '''        if (isFireEngineRequirement(originalName, mappedName)) {
            return getVehicleCheckboxSnapshot().filter(input => (
                input.checked &&
                isFireEngineVehicleCheckbox(input)
            )).length;
        }

        const eodResponseMode =
            getEodResponseRequirementMode(
                originalName,
                mappedName
            );

        if (eodResponseMode) {
            return getVehicleCheckboxSnapshot().filter(input => {
                if (!input.checked) return false;
                return eodResponseMode === 'marine'
                    ? isMarineEodResponseVehicleCheckbox(input)
                    : isEodResponseVehicleCheckbox(input);
            }).length;
        }

        const candidates = getVehicleMatchCandidates(originalName, mappedName);''',
    'EOD exact selected-count branch'
)

source = insert_before(
    source,
    '    function getSearchAdvisorTrainedVehicleRequirement(\n',
    r'''    function getMissionDefinitionSarPersonnelVehicleRequirements(
        requirementName,
        personnelText
    ) {
        const cleanedName =
            cleanRequirementName(requirementName);

        // Only the mission-definition "Required Personnel" row is actionable.
        // "Required Personnel Available" belongs to Reward and Precondition and
        // must never create dispatch demand.
        if (!/^Personnel(?:\s+Requirements?)?$/i.test(cleanedName)) {
            return [];
        }

        const input = String(personnelText || '')
            .replace(/[×✕]/g, 'x')
            .replace(/\s+/g, ' ')
            .trim();

        if (!input) return [];

        const definitions = [
            {
                name: 'Search Technician',
                patterns: [
                    /(\d+)\s*(?:x\s*)?Search\s+Technician(?:s)?/gi,
                    /Search\s+Technician(?:s)?\s*(?:x\s*)?(\d+)/gi
                ]
            },
            {
                name: 'SAR Commander',
                patterns: [
                    /(\d+)\s*(?:x\s*)?SAR\s+Commander(?:s)?/gi,
                    /SAR\s+Commander(?:s)?\s*(?:x\s*)?(\d+)/gi
                ]
            }
        ];

        const conversions = [];

        definitions.forEach(definition => {
            let maximumRequired = 0;

            definition.patterns.forEach(pattern => {
                pattern.lastIndex = 0;
                let match;

                while ((match = pattern.exec(input))) {
                    const patternIsPrefix =
                        pattern.source.startsWith('(\\d+)');
                    const trailingText = input.slice(pattern.lastIndex);

                    if (
                        !patternIsPrefix &&
                        /^\s*x(?=\s|[A-Za-z])/i.test(trailingText)
                    ) {
                        continue;
                    }

                    maximumRequired = Math.max(
                        maximumRequired,
                        Math.max(0, parseInt(match[1], 10) || 0)
                    );
                }
            });

            if (maximumRequired <= 0) return;

            const conversion =
                getSarPersonnelVehicleRequirement(
                    definition.name,
                    maximumRequired
                );

            if (conversion) conversions.push(conversion);
        });

        return conversions;
    }

''',
    'composite SAR personnel helper'
)

source = replace_once(
    source,
    '''                const missionDefinitionPersonnelRequirements =
                    getMissionDefinitionTrainedPersonnelRequirements(
                        rawRequirementName,
                        amountText
                    );

                if (
                    missionDefinitionPersonnelRequirements.length > 0
                ) {
                    rows.push({
                        unitName:
                            MF_TRAINED_PERSONNEL_ROW_NAME,
                        stillNeeded:
                            getTrainedPersonnelVehicleTarget(
                                missionDefinitionPersonnelRequirements
                            ),
                        isTrainedPersonnelRequirement:
                            true,
                        personnelTrainingRequirements:
                            missionDefinitionPersonnelRequirements,
                        missionDefinitionRequiredPersonnel:
                            true,
                        source:
                            'mission-definition-required-personnel'
                    });

                    if (mfDebugEnabled) {
                        debugLog(
                            'UNIT FINDER REQUIRED PERSONNEL',
                            formatTrainedPersonnelRequirements(
                                missionDefinitionPersonnelRequirements
                            )
                        );
                    }

                    return;
                }''',
    '''                const missionDefinitionPersonnelRequirements =
                    getMissionDefinitionTrainedPersonnelRequirements(
                        rawRequirementName,
                        amountText
                    );
                const missionDefinitionSarPersonnelRequirements =
                    getMissionDefinitionSarPersonnelVehicleRequirements(
                        rawRequirementName,
                        amountText
                    );

                if (
                    missionDefinitionPersonnelRequirements.length > 0 ||
                    missionDefinitionSarPersonnelRequirements.length > 0
                ) {
                    if (
                        missionDefinitionPersonnelRequirements.length > 0
                    ) {
                        rows.push({
                            unitName:
                                MF_TRAINED_PERSONNEL_ROW_NAME,
                            stillNeeded:
                                getTrainedPersonnelVehicleTarget(
                                    missionDefinitionPersonnelRequirements
                                ),
                            isTrainedPersonnelRequirement:
                                true,
                            personnelTrainingRequirements:
                                missionDefinitionPersonnelRequirements,
                            missionDefinitionRequiredPersonnel:
                                true,
                            source:
                                'mission-definition-required-personnel'
                        });
                    }

                    missionDefinitionSarPersonnelRequirements
                        .forEach(conversion => {
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

                    if (mfDebugEnabled) {
                        const parts = [];
                        if (
                            missionDefinitionPersonnelRequirements.length > 0
                        ) {
                            parts.push(
                                formatTrainedPersonnelRequirements(
                                    missionDefinitionPersonnelRequirements
                                )
                            );
                        }
                        missionDefinitionSarPersonnelRequirements
                            .forEach(conversion => {
                                parts.push(
                                    `${conversion.personnelRequirement} -> ${conversion.unitName} x${conversion.stillNeeded}`
                                );
                            });
                        debugLog(
                            'UNIT FINDER REQUIRED PERSONNEL',
                            parts.join(' | ')
                        );
                    }

                    return;
                }''',
    'composite Required Personnel extraction'
)

source = replace_once(
    source,
    '''                // Use one fixed snapshot, exactly as the manual Mission Update
                // button does when clicked.
                const postUnitFinderUpdateRows =
                    readMissionUpdateRows();

                autoMissionUpdateRowsHandled =
                    postUnitFinderUpdateRows.length;

                clearSelectionGuards();

                await preparePoliceVehicleSafetyForRows(
                    postUnitFinderUpdateRows,
                    'AUTO MISSION UPDATE'
                );

                const updated =
                    handleMissionUpdateUnits(
                        false,
                        postUnitFinderUpdateRows
                    );

                if (updated) {
                    await waitForFastDispatchReadiness(
                        'mission update fix',
                        {
                            minimumWait: 100,
                            stableFor: 250,
                            timeout: 900
                        }
                    );
                }''',
    '''                // Only an explicit current Missing Vehicles/Personnel row may
                // add units after the initial attachment pass. A visible copy of the
                // full mission-definition table is not a Mission Update and must not
                // select the complete requirement set for a second time.
                const postUnitFinderUpdateRows =
                    readMissionUpdateRows();
                const postUnitFinderExplicitMissingRows =
                    getExplicitCurrentMissingRequirementRows(
                        postUnitFinderUpdateRows
                    );

                autoMissionUpdateRowsHandled =
                    postUnitFinderExplicitMissingRows.length;

                if (
                    postUnitFinderExplicitMissingRows.length > 0
                ) {
                    clearSelectionGuards();

                    await preparePoliceVehicleSafetyForRows(
                        postUnitFinderExplicitMissingRows,
                        'AUTO MISSION UPDATE'
                    );

                    const updated =
                        handleMissionUpdateUnits(
                            false,
                            postUnitFinderExplicitMissingRows
                        );

                    if (updated) {
                        await waitForFastDispatchReadiness(
                            'mission update fix',
                            {
                                minimumWait: 100,
                                stableFor: 250,
                                timeout: 900
                            }
                        );
                    }
                } else if (mfDebugEnabled) {
                    debugLog(
                        'AUTO MISSION UPDATE SKIP',
                        'No explicit current Missing Vehicles/Personnel rows; the full definition table was not reprocessed.'
                    );
                }''',
    'Auto Mode duplicate full-table pass'
)

source = replace_once(
    source,
    '''        if (!hasUsefulData) return snapshot;

        const signature = JSON.stringify({''',
    '''        if (!hasUsefulData) return snapshot;

        const emptyMissionUpdateSnapshot =
            reason === 'not-ready' &&
            snapshot.requirementContext.mode === 'mission-update' &&
            snapshot.requirementContext.suppliedRows.length === 0 &&
            snapshot.requirementContext.processedRows.length === 0 &&
            snapshot.requirementContext.currentLiveRequirementRows.length === 0 &&
            snapshot.requirementContext.visibleAlerts.length === 0 &&
            snapshot.selectionSummary.vehicleLoadState.rows.length === 0;

        if (emptyMissionUpdateSnapshot) return snapshot;

        const signature = JSON.stringify({''',
    'empty diagnostic snapshot suppression'
)

SOURCE.write_text(source, encoding='utf-8')

# Keep public baselines aligned without rewriting historical changelog entries.
readme = Path('README.md')
text = readme.read_text(encoding='utf-8')
text = text.replace('**Current version:** `1.0.56` · **Mission Finder engine:** `V10.6.117`',
                    '**Current version:** `1.0.57` · **Mission Finder engine:** `V10.6.120`')
readme.write_text(text, encoding='utf-8')

src_readme = Path('src/README.md')
text = src_readme.read_text(encoding='utf-8')
text = text.replace('| Command Nexus version | `1.0.56` |',
                    '| Command Nexus version | `1.0.57` |')
text = text.replace('| Mission Finder baseline | `V10.6.117` |',
                    '| Mission Finder baseline | `V10.6.120` |')
src_readme.write_text(text, encoding='utf-8')

for script in Path('scripts').glob('check-*.mjs'):
    text = script.read_text(encoding='utf-8')
    text = text.replace('1.0.56', '1.0.57')
    text = text.replace('V10.6.119', 'V10.6.120')
    script.write_text(text, encoding='utf-8')

changelog = Path('CHANGELOG.md')
text = changelog.read_text(encoding='utf-8')
section = '''## [1.0.57] - 2026-07-29

### Fixed

- Auto Mode now runs the mission-definition requirement set once. Its post-Unit Finder Mission Update pass accepts only explicit current **Missing Vehicles** or **Missing Personnel** rows, preventing complete double dispatches.
- Normal **EOD Response Vehicles** use exact MissionChief vehicle type `110`; **Marine EOD Response Vehicles** remain separate on type `113` and can no longer satisfy one another through substring matching.
- Composite **Required Personnel** rows now retain Search Advisor trained-profile demand while also converting Search Technicians and SAR Commanders to their established SARTEC and Control Van capacities.
- **Required Personnel Available** remains a mission precondition and is deliberately excluded from dispatch demand.

### Diagnostics

- Empty post-selection Mission Update snapshots are no longer stored, and diagnostic history capacity increased from 12 to 24 useful attempts.

### Changed engine baseline

- Mission Finder increased from `V10.6.119` to `V10.6.120`.
- Personnel Assignment remains `1.3.7`.

'''
text = replace_once(text, '## [1.0.56] - 2026-07-29\n', section + '## [1.0.56] - 2026-07-29\n', 'changelog insertion')
changelog.write_text(text, encoding='utf-8')

regression = Path('scripts/check-auto-dispatch-eod-required-personnel.mjs')
regression.write_text(r'''#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) fail(`Missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  fail(`Unterminated function ${name}`);
}

expect(source.includes('// @version      1.0.57'), 'Expected Command Nexus 1.0.57');
expect(source.includes('MISSION FINDER V10.6.120'), 'Expected Mission Finder V10.6.120');
expect(source.includes('getExplicitCurrentMissingRequirementRows(\n                        postUnitFinderUpdateRows'),
  'Auto Mode must filter the post-Unit Finder snapshot to explicit missing rows');
expect(source.includes('postUnitFinderExplicitMissingRows.length > 0'),
  'Auto Mode must skip its update pass when there is no explicit shortage');
expect(source.includes('postUnitFinderExplicitMissingRows\n                        );'),
  'Auto Mode must pass only explicit missing rows to Mission Update');
expect(!source.includes('handleMissionUpdateUnits(\n                        false,\n                        postUnitFinderUpdateRows'),
  'Auto Mode must not reprocess the full post-Unit Finder table');

const eodMode = vm.runInNewContext(`(${extractFunction('getEodResponseRequirementMode')})`, {
  normaliseVehicleText: value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim(),
  Set,
});
expect(eodMode('EOD Response Vehicles', 'EOD Response Vehicles') === 'normal',
  'Normal EOD requirement mode was not recognised');
expect(eodMode('Marine EOD Response Vehicles', 'Marine EOD Response Vehicles') === 'marine',
  'Marine EOD requirement mode was not recognised');
expect(source.includes("typeIds.includes('110')"), 'Normal EOD must use exact type 110');
expect(source.includes("typeIds.includes('113')"), 'Marine EOD must use exact type 113');

const compositeSar = vm.runInNewContext(
  `(${extractFunction('getMissionDefinitionSarPersonnelVehicleRequirements')})`,
  {
    cleanRequirementName: value => String(value || '').replace(/^Required\s+/i, '').trim(),
    getSarPersonnelVehicleRequirement: (name, required) => ({
      unitName: name === 'SAR Commander' ? 'Control Van' : 'SARTEC',
      stillNeeded: Math.ceil(required / (name === 'SAR Commander' ? 2 : 4)),
      personnelRequirement: `${required} ${name}${required === 1 ? '' : 's'}`,
    }),
    String,
    Math,
    Number,
    parseInt,
  }
);

const composite = compositeSar(
  'Required Personnel',
  '1x Search Advisor 2x SAR Commander 4x Search Technicians'
);
expect(composite.length === 2, 'Expected SAR Commander and Search Technician conversions');
expect(composite.some(item => item.unitName === 'Control Van' && item.stillNeeded === 1),
  '2 SAR Commanders must require one Control Van');
expect(composite.some(item => item.unitName === 'SARTEC' && item.stillNeeded === 1),
  '4 Search Technicians must require one SARTEC');
expect(compositeSar('Required Personnel Available', '2x SAR Commander').length === 0,
  'Required Personnel Available must remain a precondition only');
expect(source.includes("code:\n                    'search_and_rescue'"),
  'Search Advisor must remain in trained-profile parsing');
expect(source.includes('missionDefinitionRequiredPersonnel:\n                                    true'),
  'Composite SAR rows must retain mission-definition authority');
expect(source.includes('const MF_UNIT_FINDER_DIAGNOSTICS_LIMIT = 24;'),
  'Diagnostic history limit must be 24');
expect(source.includes('emptyMissionUpdateSnapshot'),
  'Empty Mission Update diagnostic snapshots must be suppressed');

console.log('Auto duplicate, EOD separation and Required Personnel regression passed.');
''', encoding='utf-8')

print('Applied v1.0.57 Auto Mode, EOD and Required Personnel fixes.')
