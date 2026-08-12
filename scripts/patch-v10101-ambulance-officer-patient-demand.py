#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / 'src/missionchief-command-nexus.user.js'
SOURCE = SOURCE_PATH.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def find_js_function_range(text: str, name: str) -> tuple[int, int]:
    markers = [f'function {name}(', f'async function {name}(']
    starts = [text.find(marker) for marker in markers]
    starts = [start for start in starts if start >= 0]
    if not starts:
        raise SystemExit(f'Unable to find JavaScript function {name}')

    start = min(starts)
    parameter_start = text.find('(', start)
    if parameter_start < 0:
        raise SystemExit(f'Unable to find parameters for {name}')

    parameter_depth = 0
    quote = ''
    escaped = False
    body_start = -1
    index = parameter_start
    while index < len(text):
        character = text[index]
        if quote:
            if escaped:
                escaped = False
            elif character == '\\':
                escaped = True
            elif character == quote:
                quote = ''
            index += 1
            continue
        if character in ('"', "'", '`'):
            quote = character
            index += 1
            continue
        if character == '(':
            parameter_depth += 1
        elif character == ')':
            parameter_depth -= 1
            if parameter_depth == 0:
                body_start = text.find('{', index)
                break
        index += 1

    if body_start < 0:
        raise SystemExit(f'Unable to find body for JavaScript function {name}')

    depth = 0
    quote = ''
    escaped = False
    line_comment = False
    block_comment = False
    regex = False
    regex_class = False
    index = body_start

    while index < len(text):
        character = text[index]
        next_character = text[index + 1] if index + 1 < len(text) else ''

        if line_comment:
            if character == '\n':
                line_comment = False
            index += 1
            continue

        if block_comment:
            if character == '*' and next_character == '/':
                block_comment = False
                index += 2
                continue
            index += 1
            continue

        if quote:
            if escaped:
                escaped = False
            elif character == '\\':
                escaped = True
            elif character == quote:
                quote = ''
            index += 1
            continue

        if regex:
            if escaped:
                escaped = False
            elif character == '\\':
                escaped = True
            elif character == '[':
                regex_class = True
            elif character == ']':
                regex_class = False
            elif character == '/' and not regex_class:
                regex = False
            index += 1
            continue

        if character == '/' and next_character == '/':
            line_comment = True
            index += 2
            continue
        if character == '/' and next_character == '*':
            block_comment = True
            index += 2
            continue
        if character in ('"', "'", '`'):
            quote = character
            index += 1
            continue
        if character == '/' and (
            index == 0 or text[index - 1] in '=(,:;!&|?{}[]\n'
        ):
            regex = True
            index += 1
            continue

        if character == '{':
            depth += 1
        elif character == '}':
            depth -= 1
            if depth == 0:
                return start, index + 1
        index += 1

    raise SystemExit(f'Unable to find end of JavaScript function {name}')


def replace_js_function(text: str, name: str, replacement: str) -> str:
    start, end = find_js_function_range(text, name)
    return text[:start] + replacement.rstrip() + text[end:]


def replace_once_in_function(
    text: str,
    function_name: str,
    old: str,
    new: str,
    label: str,
) -> str:
    start, end = find_js_function_range(text, function_name)
    function_text = text[start:end]
    function_text = replace_once(function_text, old, new, label)
    return text[:start] + function_text + text[end:]


if '// @version      1.0.101' not in SOURCE:
    raise SystemExit('Expected Command Nexus 1.0.101 candidate')
if ' * MODULE 2: MISSION FINDER V10.6.150' not in SOURCE:
    raise SystemExit('Expected Mission Finder V10.6.150 candidate')

already_patched = (
    'ambulanceOfficerThresholdAdditionalRows' in SOURCE
    and 'readUnitFinderPatientRequirementRows()\n        )' in SOURCE
)

source = SOURCE
if not already_patched:
    threshold_helper = r'''    function addConfiguredAmbulanceOfficerThresholdRequirement(
        rows,
        additionalRows = []
    ) {
        const sourceRows =
            (Array.isArray(rows) ? rows : [])
                .filter(Boolean);
        const comparisonRows = [
            ...sourceRows,
            ...(Array.isArray(additionalRows)
                ? additionalRows.filter(Boolean)
                : [])
        ];

        if (!mfAmbulanceOfficerThresholdEnabled) {
            return sourceRows.slice();
        }

        const threshold =
            normaliseConfiguredAmbulanceOfficerThreshold(
                mfAmbulanceOfficerThreshold
            );
        const ambulanceCount = comparisonRows.reduce(
            (total, row) => {
                const originalName =
                    row.originalName ||
                    row.unitName ||
                    '';
                const mappedName =
                    row.unitName ||
                    resolveUnitName(originalName);

                if (
                    !isAmbulanceTransportRequest(
                        originalName,
                        mappedName
                    )
                ) {
                    return total;
                }

                return total + Math.max(
                    0,
                    Number(row.stillNeeded) || 0
                );
            },
            0
        );

        if (ambulanceCount <= threshold) {
            return sourceRows.slice();
        }

        const alreadyRequiresOfficer =
            comparisonRows.some(row => {
                const originalName =
                    row.originalName ||
                    row.unitName ||
                    '';
                const mappedName =
                    row.unitName ||
                    resolveUnitName(originalName);
                const quantity = Math.max(
                    0,
                    Number(row.stillNeeded) || 0
                );

                return (
                    quantity > 0 &&
                    isAmbulanceOfficerRequirement(
                        originalName,
                        mappedName
                    )
                );
            });

        if (alreadyRequiresOfficer) {
            return sourceRows.slice();
        }

        return [
            ...sourceRows,
            {
                unitName: 'Ambulance Officer',
                stillNeeded: 1,
                source:
                    'settings-ambulance-officer-threshold',
                configuredAmbulanceOfficerThreshold:
                    true,
                configuredAmbulanceCount:
                    ambulanceCount,
                configuredAmbulanceThreshold:
                    threshold
            }
        ];
    }'''
    source = replace_js_function(
        source,
        'addConfiguredAmbulanceOfficerThresholdRequirement',
        threshold_helper,
    )

    wrapper = r'''    function applyConfiguredFreshMissionVehicleRequirements(
        rows,
        additionalRows = []
    ) {
        return addConfiguredAmbulanceOfficerThresholdRequirement(
            addConfiguredHighRiskMissingPersonAmbulanceRequirement(
                rows
            ),
            additionalRows
        );
    }'''
    source = replace_js_function(
        source,
        'applyConfiguredFreshMissionVehicleRequirements',
        wrapper,
    )

    source = replace_once_in_function(
        source,
        'getPreloadedMissionVehicleRequirementsForDisplay',
        '''applyConfiguredFreshMissionVehicleRequirements(
            cache.rows
        )''',
        '''applyConfiguredFreshMissionVehicleRequirements(
            cache.rows,
            readUnitFinderPatientRequirementRows()
        )''',
        'Preloaded Vehicle Load patient total',
    )

    source = replace_once_in_function(
        source,
        'processRequirementRows',
        '''applyConfiguredFreshMissionVehicleRequirements(
                    requirementRows
                )''',
        '''applyConfiguredFreshMissionVehicleRequirements(
                    requirementRows,
                    options
                        .ambulanceOfficerThresholdAdditionalRows
                )''',
        'Fresh selection patient total',
    )

    combined_start, combined_end = find_js_function_range(
        source,
        'handleCombinedLogic',
    )
    combined = source[combined_start:combined_end]
    old_option = '''includeConfiguredHighRiskMissingPersonAmbulance:
                            true'''
    new_option = '''includeConfiguredHighRiskMissingPersonAmbulance:
                            true,
                        ambulanceOfficerThresholdAdditionalRows:
                            patientRequirementResult.rows'''
    option_count = combined.count(old_option)
    if option_count != 3:
        raise SystemExit(
            'Fresh patient-total option routes: expected exactly 3 matches, '
            f'got {option_count}'
        )
    combined = combined.replace(old_option, new_option)
    source = source[:combined_start] + combined + source[combined_end:]

    source = replace_once(
        source,
        'Example: 5 adds one Ambulance Officer when 6 or more Ambulances are required. Applies only to fresh Unit Finder demand; existing live shortages stay authoritative.',
        'Example: 5 adds one Ambulance Officer when 6 or more Ambulances are required. Counts fresh mission and current patient Ambulance requirements; existing live shortages stay authoritative.',
        'Settings patient-demand explanation',
    )

    SOURCE_PATH.write_text(source, encoding='utf-8')

threshold_path = ROOT / 'scripts/check-ambulance-officer-threshold-v10101.mjs'
threshold = threshold_path.read_text(encoding='utf-8')
if 'Mission and patient Ambulance rows must be combined' not in threshold:
    threshold = replace_once(
        threshold,
        """const existingOfficer = buildThresholdHelper({ enabled: true, threshold: 5 })([
  { unitName: 'Ambulance', stillNeeded: 7 },
  { unitName: 'Ambulance Officer', stillNeeded: 1 }
]);
expect(existingOfficer.filter(row => /Ambulance Officer/.test(row.unitName)).length === 1, 'Existing Ambulance Officer demand must prevent a duplicate');
""",
        """const combinedPatientDemand = buildThresholdHelper({ enabled: true, threshold: 5 })(
  [{ unitName: 'Ambulance', stillNeeded: 3 }],
  [{ unitName: 'Ambulance', stillNeeded: 3 }]
);
expect(combinedPatientDemand.some(row => row.configuredAmbulanceOfficerThreshold === true), 'Mission and patient Ambulance rows must be combined');
expect(combinedPatientDemand.find(row => row.configuredAmbulanceOfficerThreshold)?.configuredAmbulanceCount === 6, 'Combined diagnostic count must include patient Ambulance demand');

const existingOfficer = buildThresholdHelper({ enabled: true, threshold: 5 })([
  { unitName: 'Ambulance', stillNeeded: 7 },
  { unitName: 'Ambulance Officer', stillNeeded: 1 }
]);
expect(existingOfficer.filter(row => /Ambulance Officer/.test(row.unitName)).length === 1, 'Existing Ambulance Officer demand must prevent a duplicate');

const patientOfficer = buildThresholdHelper({ enabled: true, threshold: 5 })(
  [{ unitName: 'Ambulance', stillNeeded: 7 }],
  [{ unitName: 'Required Ambulance Officer', stillNeeded: 1 }]
);
expect(!patientOfficer.some(row => row.configuredAmbulanceOfficerThreshold === true), 'A patient Ambulance Officer requirement must prevent a duplicate configured Officer');
""",
        'Mission plus patient threshold tests',
    )

    threshold = replace_once(
        threshold,
        """expect(wrapper.includes('addConfiguredAmbulanceOfficerThresholdRequirement('), 'Fresh-rule wrapper must apply the Ambulance Officer rule');
expect(wrapper.indexOf('addConfiguredAmbulanceOfficerThresholdRequirement(') < wrapper.indexOf('addConfiguredHighRiskMissingPersonAmbulanceRequirement('), 'Ambulance Officer must evaluate the final rows after the high-risk Ambulance rule');

const preloaded = extractFunction('getPreloadedMissionVehicleRequirementsForDisplay');
expect(preloaded.includes('applyConfiguredFreshMissionVehicleRequirements(\\n            cache.rows\\n        )'), 'Preloaded Vehicle Load must show the configured Officer row');
expect(preloaded.includes('hasCurrentMissionVehicleRequirementAuthorityForDisplay()'), 'Live shortage authority must continue to suppress static configured display');
""",
        """expect(wrapper.includes('addConfiguredAmbulanceOfficerThresholdRequirement('), 'Fresh-rule wrapper must apply the Ambulance Officer rule');
expect(wrapper.includes('additionalRows = []'), 'Fresh-rule wrapper must accept current patient demand');
expect(wrapper.includes('additionalRows\\n        );'), 'Fresh-rule wrapper must forward patient rows to the threshold helper');
expect(wrapper.indexOf('addConfiguredAmbulanceOfficerThresholdRequirement(') < wrapper.indexOf('addConfiguredHighRiskMissingPersonAmbulanceRequirement('), 'Ambulance Officer must evaluate the final rows after the high-risk Ambulance rule');

const preloaded = extractFunction('getPreloadedMissionVehicleRequirementsForDisplay');
expect(preloaded.includes('applyConfiguredFreshMissionVehicleRequirements('), 'Preloaded Vehicle Load must show the configured Officer row');
expect(preloaded.includes('cache.rows'), 'Preloaded Vehicle Load must retain mission rows');
expect(preloaded.includes('readUnitFinderPatientRequirementRows()'), 'Preloaded Vehicle Load must include current patient Ambulance demand');
expect(preloaded.includes('hasCurrentMissionVehicleRequirementAuthorityForDisplay()'), 'Live shortage authority must continue to suppress static configured display');
""",
        'Wrapper and preload patient-total checks',
    )

    threshold = replace_once(
        threshold,
        """expect((combined.match(/includeConfiguredHighRiskMissingPersonAmbulance:/g) || []).length === 3, 'Fresh attachment, visible fallback and legacy fallback routes must keep the configured-rule opt-in');
const currentMissingIndex = combined.indexOf(\"'CURRENT MISSING REQUIREMENTS'\");
expect(currentMissingIndex >= 0, 'Current Missing Requirements route missing');
const currentMissingWindow = combined.slice(currentMissingIndex - 250, currentMissingIndex + 300);
expect(!currentMissingWindow.includes('includeConfiguredHighRiskMissingPersonAmbulance'), 'Current live shortages must not re-add a configured Ambulance Officer');
""",
        """expect((combined.match(/includeConfiguredHighRiskMissingPersonAmbulance:/g) || []).length === 3, 'Fresh attachment, visible fallback and legacy fallback routes must keep the configured-rule opt-in');
expect((combined.match(/ambulanceOfficerThresholdAdditionalRows:/g) || []).length === 3, 'All fresh Unit Finder routes must pass patient demand to the threshold');
expect((combined.match(/patientRequirementResult\\.rows/g) || []).length >= 3, 'Current patient rows must feed all fresh threshold routes');
const currentMissingIndex = combined.indexOf(\"'CURRENT MISSING REQUIREMENTS'\");
expect(currentMissingIndex >= 0, 'Current Missing Requirements route missing');
const currentMissingWindow = combined.slice(currentMissingIndex - 250, currentMissingIndex + 300);
expect(!currentMissingWindow.includes('includeConfiguredHighRiskMissingPersonAmbulance'), 'Current live shortages must not re-add a configured Ambulance Officer');
expect(!currentMissingWindow.includes('ambulanceOfficerThresholdAdditionalRows'), 'Current live shortages must not feed the fresh Ambulance Officer threshold');
""",
        'Fresh route patient-total checks',
    )

    threshold = threshold.replace(
        "PASS: user-set more-than-X Ambulance demand adds exactly one Ambulance Officer on fresh Unit Finder paths while preserving the existing high-risk rule and live-shortage authority.",
        "PASS: user-set more-than-X mission plus patient Ambulance demand adds exactly one Ambulance Officer on fresh Unit Finder paths while preserving the existing high-risk rule and live-shortage authority.",
    )
    threshold_path.write_text(threshold, encoding='utf-8')

high_risk_path = ROOT / 'scripts/check-high-risk-missing-person-ambulance-v1076.mjs'
high_risk = high_risk_path.read_text(encoding='utf-8')
old_high_risk_check = """expect(
  preloadedDisplay.includes('applyConfiguredFreshMissionVehicleRequirements(\\n            cache.rows\\n        )'),
  'Preloaded Vehicle Load display must include the configured Ambulance row'
);"""
new_high_risk_check = """expect(
  preloadedDisplay.includes('applyConfiguredFreshMissionVehicleRequirements(') &&
    preloadedDisplay.includes('cache.rows') &&
    preloadedDisplay.includes('readUnitFinderPatientRequirementRows()'),
  'Preloaded Vehicle Load display must include configured fresh mission and patient demand'
);"""
if old_high_risk_check in high_risk:
    high_risk = replace_once(
        high_risk,
        old_high_risk_check,
        new_high_risk_check,
        'High-risk preload patient-total check',
    )
    high_risk_path.write_text(high_risk, encoding='utf-8')
elif new_high_risk_check not in high_risk:
    raise SystemExit('High-risk preload regression shape was not recognised')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
old_changelog = '- Multiple ordinary Ambulance rows are summed, an existing positive Ambulance Officer requirement prevents duplication, and the configured row appears in the preloaded Vehicle Load display.'
new_changelog = '- Multiple ordinary Ambulance rows are summed across fresh mission and current patient requirements, an existing positive Ambulance Officer requirement in either source prevents duplication, and the configured row appears in the preloaded Vehicle Load display.'
if old_changelog in changelog:
    changelog = replace_once(
        changelog,
        old_changelog,
        new_changelog,
        'CHANGELOG patient-total wording',
    )
elif new_changelog not in changelog:
    raise SystemExit('CHANGELOG Ambulance Officer wording was not recognised')
changelog_path.write_text(changelog, encoding='utf-8')

trigger = ROOT / 'scripts/.v10101-ambulance-officer-patient-total-trigger'
if trigger.exists():
    trigger.unlink()

print('Patched v1.0.101 Ambulance Officer threshold to count mission plus patient demand.')
