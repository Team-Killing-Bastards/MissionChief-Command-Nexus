#!/usr/bin/env python3
from __future__ import annotations

import re
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
    body_start = text.find('{', start)
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

        if character == '/' and (index == 0 or text[index - 1] in '=(,:;!&|?{}[]\n'):
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


def insert_before_function(text: str, name: str, addition: str) -> str:
    start, _ = find_js_function_range(text, name)
    return text[:start] + addition + text[start:]


def insert_after_function(text: str, name: str, addition: str) -> str:
    _, end = find_js_function_range(text, name)
    return text[:end] + addition + text[end:]


def replace_call_name_in_function(
    text: str,
    function_name: str,
    old_name: str,
    new_name: str,
) -> str:
    start, end = find_js_function_range(text, function_name)
    function_text = text[start:end]
    count = function_text.count(old_name)
    if count != 1:
        raise SystemExit(
            f'{function_name}: expected one {old_name} call, got {count}'
        )
    function_text = function_text.replace(old_name, new_name, 1)
    return text[:start] + function_text + text[end:]


source = SOURCE
source = replace_once(
    source,
    '// @version      1.0.100',
    '// @version      1.0.101',
    'userscript version',
)
source = replace_once(
    source,
    ' * MODULE 2: MISSION FINDER V10.6.149',
    ' * MODULE 2: MISSION FINDER V10.6.150',
    'Mission Finder version',
)

source = replace_once(
    source,
    "    const MF_HIGH_RISK_MISSING_PERSON_AMBULANCE_KEY =\n"
    "        'mf_high_risk_missing_person_ambulance_v1';\n"
    "    const MF_SHARE_CREDIT_THRESHOLD = 15000;",
    "    const MF_HIGH_RISK_MISSING_PERSON_AMBULANCE_KEY =\n"
    "        'mf_high_risk_missing_person_ambulance_v1';\n"
    "    const MF_AMBULANCE_OFFICER_THRESHOLD_ENABLED_KEY =\n"
    "        'mf_ambulance_officer_threshold_enabled_v1';\n"
    "    const MF_AMBULANCE_OFFICER_THRESHOLD_KEY =\n"
    "        'mf_ambulance_officer_threshold_v1';\n"
    "    const MF_AMBULANCE_OFFICER_THRESHOLD_DEFAULT = 5;\n"
    "    const MF_AMBULANCE_OFFICER_THRESHOLD_MIN = 0;\n"
    "    const MF_AMBULANCE_OFFICER_THRESHOLD_MAX = 99;\n"
    "    const MF_SHARE_CREDIT_THRESHOLD = 15000;",
    'Ambulance Officer setting constants',
)

source = replace_once(
    source,
    "    let mfAlwaysSendAmbulanceToHighRiskMissingPerson =\n"
    "        localStorage.getItem(\n"
    "            MF_HIGH_RISK_MISSING_PERSON_AMBULANCE_KEY\n"
    "        ) === 'true';\n\n"
    "    let mfStaffingBlockActive = false;",
    "    let mfAlwaysSendAmbulanceToHighRiskMissingPerson =\n"
    "        localStorage.getItem(\n"
    "            MF_HIGH_RISK_MISSING_PERSON_AMBULANCE_KEY\n"
    "        ) === 'true';\n"
    "    let mfAmbulanceOfficerThresholdEnabled =\n"
    "        localStorage.getItem(\n"
    "            MF_AMBULANCE_OFFICER_THRESHOLD_ENABLED_KEY\n"
    "        ) === 'true';\n"
    "    let mfAmbulanceOfficerThreshold =\n"
    "        normaliseConfiguredAmbulanceOfficerThreshold(\n"
    "            localStorage.getItem(\n"
    "                MF_AMBULANCE_OFFICER_THRESHOLD_KEY\n"
    "            )\n"
    "        );\n\n"
    "    let mfStaffingBlockActive = false;",
    'Ambulance Officer setting state',
)

new_helpers = r'''    function normaliseConfiguredAmbulanceOfficerThreshold(
        value
    ) {
        const parsed = Number.parseInt(
            String(value == null ? '' : value),
            10
        );

        if (!Number.isFinite(parsed)) {
            return MF_AMBULANCE_OFFICER_THRESHOLD_DEFAULT;
        }

        return Math.min(
            MF_AMBULANCE_OFFICER_THRESHOLD_MAX,
            Math.max(
                MF_AMBULANCE_OFFICER_THRESHOLD_MIN,
                parsed
            )
        );
    }

    function isAmbulanceOfficerRequirement(
        originalName,
        mappedName
    ) {
        return [originalName, mappedName].some(value => {
            const cleaned = String(value || '')
                .replace(/\s+/g, ' ')
                .trim();

            return /^(?:Required\s+)?(?:\d+\s+)?Ambulance Officers?$/i.test(
                cleaned
            );
        });
    }

    function addConfiguredAmbulanceOfficerThresholdRequirement(
        rows
    ) {
        const sourceRows =
            (Array.isArray(rows) ? rows : [])
                .filter(Boolean);

        if (!mfAmbulanceOfficerThresholdEnabled) {
            return sourceRows.slice();
        }

        const threshold =
            normaliseConfiguredAmbulanceOfficerThreshold(
                mfAmbulanceOfficerThreshold
            );
        const ambulanceCount = sourceRows.reduce(
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
            sourceRows.some(row => {
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
    }

'''
source = insert_before_function(
    source,
    'addConfiguredHighRiskMissingPersonAmbulanceRequirement',
    new_helpers,
)

fresh_rule_wrapper = r'''

    function applyConfiguredFreshMissionVehicleRequirements(
        rows
    ) {
        return addConfiguredAmbulanceOfficerThresholdRequirement(
            addConfiguredHighRiskMissingPersonAmbulanceRequirement(
                rows
            )
        );
    }
'''
source = insert_after_function(
    source,
    'addConfiguredHighRiskMissingPersonAmbulanceRequirement',
    fresh_rule_wrapper,
)

source = replace_call_name_in_function(
    source,
    'getPreloadedMissionVehicleRequirementsForDisplay',
    'addConfiguredHighRiskMissingPersonAmbulanceRequirement',
    'applyConfiguredFreshMissionVehicleRequirements',
)
source = replace_call_name_in_function(
    source,
    'processRequirementRows',
    'addConfiguredHighRiskMissingPersonAmbulanceRequirement',
    'applyConfiguredFreshMissionVehicleRequirements',
)

old_settings_end = '''            <div class="mf2026-small" style="margin-top:5px;">
                Applies to High Risk and Very High Risk Missing Person missions. Existing live shortages stay authoritative.
            </div>
        `;'''
new_settings_end = '''            <div class="mf2026-small" style="margin-top:5px;">
                Applies to High Risk and Very High Risk Missing Person missions. Existing live shortages stay authoritative.
            </div>
            <div class="mf2026-section-title" style="margin-top:12px;">Ambulance Officer</div>
            <label class="mf2026-checkbox-row mf-dashboard-toggle-row">
                <input id="mf-ambulance-officer-threshold-toggle"
                       type="checkbox"
                       ${mfAmbulanceOfficerThresholdEnabled ? 'checked' : ''}>
                <span>Automatically add 1 Ambulance Officer</span>
            </label>
            <label class="mf2026-small"
                   style="display:flex; align-items:center; gap:8px; margin-top:7px;">
                <span>When required Ambulances exceed</span>
                <input id="mf-ambulance-officer-threshold-input"
                       type="number"
                       inputmode="numeric"
                       min="${MF_AMBULANCE_OFFICER_THRESHOLD_MIN}"
                       max="${MF_AMBULANCE_OFFICER_THRESHOLD_MAX}"
                       step="1"
                       value="${mfAmbulanceOfficerThreshold}"
                       ${mfAmbulanceOfficerThresholdEnabled ? '' : 'disabled'}
                       style="width:72px; margin-left:auto;">
            </label>
            <div class="mf2026-small" style="margin-top:5px;">
                Example: 5 adds one Ambulance Officer when 6 or more Ambulances are required. Applies only to fresh Unit Finder demand; existing live shortages stay authoritative.
            </div>
        `;

        const ambulanceOfficerThresholdToggle =
            highRiskMissingPersonAmbulanceBox.querySelector(
                '#mf-ambulance-officer-threshold-toggle'
            );
        const ambulanceOfficerThresholdInput =
            highRiskMissingPersonAmbulanceBox.querySelector(
                '#mf-ambulance-officer-threshold-input'
            );

        if (ambulanceOfficerThresholdToggle) {
            ambulanceOfficerThresholdToggle.addEventListener(
                'change',
                function() {
                    mfAmbulanceOfficerThresholdEnabled =
                        this.checked === true;
                    localStorage.setItem(
                        MF_AMBULANCE_OFFICER_THRESHOLD_ENABLED_KEY,
                        String(
                            mfAmbulanceOfficerThresholdEnabled
                        )
                    );
                    if (ambulanceOfficerThresholdInput) {
                        ambulanceOfficerThresholdInput.disabled =
                            !mfAmbulanceOfficerThresholdEnabled;
                    }
                    renderVehicleLoadList();
                }
            );
        }

        if (ambulanceOfficerThresholdInput) {
            ambulanceOfficerThresholdInput.addEventListener(
                'change',
                function() {
                    mfAmbulanceOfficerThreshold =
                        normaliseConfiguredAmbulanceOfficerThreshold(
                            this.value
                        );
                    this.value = String(
                        mfAmbulanceOfficerThreshold
                    );
                    localStorage.setItem(
                        MF_AMBULANCE_OFFICER_THRESHOLD_KEY,
                        String(
                            mfAmbulanceOfficerThreshold
                        )
                    );
                    renderVehicleLoadList();
                }
            );
        }'''
source = replace_once(
    source,
    old_settings_end,
    new_settings_end,
    'Settings Ambulance Officer controls',
)

# Add the new setting values to the existing diagnostics object without
# changing the established high-risk field or mission classifier diagnostics.
diagnostic_marker = 'alwaysSendAmbulanceToHighRiskMissingPerson:'
if source.count(diagnostic_marker) != 1:
    raise SystemExit(
        'Diagnostic settings marker: expected exactly one occurrence, got '
        f'{source.count(diagnostic_marker)}'
    )
diagnostic_index = source.index(diagnostic_marker)
diagnostic_line_start = source.rfind('\n', 0, diagnostic_index) + 1
diagnostic_indent = source[diagnostic_line_start:diagnostic_index]
diagnostic_addition = (
    f'{diagnostic_indent}ambulanceOfficerThresholdEnabled:\n'
    f'{diagnostic_indent}    mfAmbulanceOfficerThresholdEnabled,\n'
    f'{diagnostic_indent}ambulanceOfficerThreshold:\n'
    f'{diagnostic_indent}    mfAmbulanceOfficerThreshold,\n'
)
source = (
    source[:diagnostic_line_start]
    + diagnostic_addition
    + source[diagnostic_line_start:]
)

SOURCE_PATH.write_text(source, encoding='utf-8')

# Keep permanent checks that were already pinned to the immediately previous
# production baseline aligned with this candidate.
for path in (ROOT / 'scripts').glob('check-*.mjs'):
    text = path.read_text(encoding='utf-8')
    text = text.replace('// @version      1.0.100', '// @version      1.0.101')
    text = text.replace('MISSION FINDER V10.6.149', 'MISSION FINDER V10.6.150')
    text = text.replace('Mission Finder V10.6.149', 'Mission Finder V10.6.150')
    text = text.replace('Expected Command Nexus 1.0.100', 'Expected Command Nexus 1.0.101')
    text = text.replace('Expected Mission Finder V10.6.149', 'Expected Mission Finder V10.6.150')
    path.write_text(text, encoding='utf-8')

high_risk_path = ROOT / 'scripts/check-high-risk-missing-person-ambulance-v1076.mjs'
high_risk = high_risk_path.read_text(encoding='utf-8')
high_risk = replace_once(
    high_risk,
    "import fs from 'node:fs';\n",
    "import fs from 'node:fs';\nawait import('./check-ambulance-officer-threshold-v10101.mjs');\n",
    'Ambulance Officer regression chain',
)
high_risk = high_risk.replace(
    "source.includes('// @version      1.0.96')",
    "source.includes('// @version      1.0.101')",
)
high_risk = high_risk.replace(
    "source.includes('MISSION FINDER V10.6.145')",
    "source.includes('MISSION FINDER V10.6.150')",
)
high_risk = replace_once(
    high_risk,
    "preloadedDisplay.includes('addConfiguredHighRiskMissingPersonAmbulanceRequirement(\\n            cache.rows\\n        )')",
    "preloadedDisplay.includes('applyConfiguredFreshMissionVehicleRequirements(\\n            cache.rows\\n        )')",
    'High-risk preloaded wrapper expectation',
)
high_risk = replace_once(
    high_risk,
    "  'addConfiguredHighRiskMissingPersonAmbulanceRequirement(',\n",
    "  'applyConfiguredFreshMissionVehicleRequirements(',\n",
    'High-risk process wrapper expectation',
)
high_risk_path.write_text(high_risk, encoding='utf-8')

regression_path = ROOT / 'scripts/check-ambulance-officer-threshold-v10101.mjs'
regression_path.write_text(r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const markers = [`function ${name}(`, `async function ${name}(`];
  const starts = markers.map(marker => source.indexOf(marker)).filter(index => index >= 0);
  if (!starts.length) fail(`Unable to find ${name}`);
  const start = Math.min(...starts);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false, regex = false, regexClass = false;
  for (let i = brace; i < source.length; i += 1) {
    const c = source[i], n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (regex) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === '[') regexClass = true;
      if (c === ']') regexClass = false;
      if (c === '/' && !regexClass) regex = false;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '/' && /[=(,:;!&|?{}\[\]\n]/.test(source[i - 1] || '\n')) { regex = true; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(`Unterminated ${name}`);
}

expect(source.includes('// @version      1.0.101'), 'Expected Command Nexus 1.0.101');
expect(source.includes(' * MODULE 2: MISSION FINDER V10.6.150'), 'Expected Mission Finder V10.6.150');

for (const token of [
  "'mf_high_risk_missing_person_ambulance_v1'",
  'mf-high-risk-missing-person-ambulance-toggle',
  'Always include 1 Ambulance in Unit Finder',
  "'mf_ambulance_officer_threshold_enabled_v1'",
  "'mf_ambulance_officer_threshold_v1'",
  'MF_AMBULANCE_OFFICER_THRESHOLD_DEFAULT = 5',
  'MF_AMBULANCE_OFFICER_THRESHOLD_MIN = 0',
  'MF_AMBULANCE_OFFICER_THRESHOLD_MAX = 99',
  'mf-ambulance-officer-threshold-toggle',
  'mf-ambulance-officer-threshold-input',
  'Automatically add 1 Ambulance Officer',
  'When required Ambulances exceed',
  'Example: 5 adds one Ambulance Officer when 6 or more Ambulances are required.',
  'MF_AMBULANCE_OFFICER_THRESHOLD_ENABLED_KEY',
  'MF_AMBULANCE_OFFICER_THRESHOLD_KEY',
  'renderVehicleLoadList();'
]) expect(source.includes(token), `Settings contract missing ${token}`);

const normaliser = extractFunction('normaliseConfiguredAmbulanceOfficerThreshold');
const normaliseContext = {
  MF_AMBULANCE_OFFICER_THRESHOLD_DEFAULT: 5,
  MF_AMBULANCE_OFFICER_THRESHOLD_MIN: 0,
  MF_AMBULANCE_OFFICER_THRESHOLD_MAX: 99,
  result: null
};
vm.runInNewContext(
  `${normaliser}\nresult = [` +
  `normaliseConfiguredAmbulanceOfficerThreshold(null),` +
  `normaliseConfiguredAmbulanceOfficerThreshold(''),` +
  `normaliseConfiguredAmbulanceOfficerThreshold('-4'),` +
  `normaliseConfiguredAmbulanceOfficerThreshold('0'),` +
  `normaliseConfiguredAmbulanceOfficerThreshold('6'),` +
  `normaliseConfiguredAmbulanceOfficerThreshold('120')` +
  `];`,
  normaliseContext
);
expect(JSON.stringify(normaliseContext.result) === JSON.stringify([5, 5, 0, 0, 6, 99]), `Threshold normalisation failed: ${JSON.stringify(normaliseContext.result)}`);

const officerMatcher = extractFunction('isAmbulanceOfficerRequirement');
const officerContext = { result: null };
vm.runInNewContext(
  `${officerMatcher}\nresult = {` +
  ` yes: ['Ambulance Officer', 'Ambulance Officers', 'Required Ambulance Officer', '2 Ambulance Officers'].map(value => isAmbulanceOfficerRequirement(value, value)),` +
  ` no: ['Ambulance', 'Ambulances', 'Ambulance Officer Training', 'Police Officer'].map(value => isAmbulanceOfficerRequirement(value, value))` +
  `};`,
  officerContext
);
expect(officerContext.result.yes.every(Boolean), `Officer alias rejected: ${JSON.stringify(officerContext.result.yes)}`);
expect(officerContext.result.no.every(value => value === false), `Non-officer alias captured: ${JSON.stringify(officerContext.result.no)}`);

const thresholdHelper = extractFunction('addConfiguredAmbulanceOfficerThresholdRequirement');
function buildThresholdHelper({ enabled, threshold }) {
  return new Function(
    'mfAmbulanceOfficerThresholdEnabled',
    'mfAmbulanceOfficerThreshold',
    'normaliseConfiguredAmbulanceOfficerThreshold',
    'isAmbulanceTransportRequest',
    'isAmbulanceOfficerRequirement',
    'resolveUnitName',
    `${thresholdHelper}; return addConfiguredAmbulanceOfficerThresholdRequirement;`
  )(
    enabled,
    threshold,
    value => Math.min(99, Math.max(0, Number.parseInt(String(value), 10) || 0)),
    (originalName, mappedName) => {
      const values = [originalName, mappedName].map(value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim());
      return values.some(value => value === 'ambulance' || value === 'ambulances' || value === 'ambulance x 01');
    },
    (originalName, mappedName) => [originalName, mappedName].some(value => /^(?:required\s+)?(?:\d+\s+)?ambulance officers?$/i.test(String(value || '').trim())),
    value => value
  );
}

const base = [{ unitName: 'Police Car', stillNeeded: 2 }];
const disabled = buildThresholdHelper({ enabled: false, threshold: 5 })([
  ...base,
  { unitName: 'Ambulance', stillNeeded: 8 }
]);
expect(disabled.length === 2, 'Disabled setting must not add an Ambulance Officer');

const exact = buildThresholdHelper({ enabled: true, threshold: 5 })([
  ...base,
  { unitName: 'Ambulance', stillNeeded: 5 }
]);
expect(!exact.some(row => row.configuredAmbulanceOfficerThreshold), 'Exactly X Ambulances must not trigger a more-than-X rule');

const over = buildThresholdHelper({ enabled: true, threshold: 5 })([
  ...base,
  { unitName: 'Ambulance', stillNeeded: 6 }
]);
const configured = over.filter(row => row.configuredAmbulanceOfficerThreshold === true);
expect(configured.length === 1, 'More than X Ambulances must add exactly one configured Officer');
expect(configured[0].unitName === 'Ambulance Officer' && configured[0].stillNeeded === 1, 'Configured row must request one Ambulance Officer');
expect(configured[0].configuredAmbulanceCount === 6 && configured[0].configuredAmbulanceThreshold === 5, 'Configured diagnostics must record count and threshold');

const summed = buildThresholdHelper({ enabled: true, threshold: 5 })([
  { unitName: 'Ambulance', stillNeeded: 3 },
  { unitName: 'Ambulances', stillNeeded: 3 }
]);
expect(summed.some(row => row.configuredAmbulanceOfficerThreshold === true), 'Multiple Ambulance rows must be summed');

const existingOfficer = buildThresholdHelper({ enabled: true, threshold: 5 })([
  { unitName: 'Ambulance', stillNeeded: 7 },
  { unitName: 'Ambulance Officer', stillNeeded: 1 }
]);
expect(existingOfficer.filter(row => /Ambulance Officer/.test(row.unitName)).length === 1, 'Existing Ambulance Officer demand must prevent a duplicate');

const zeroOfficer = buildThresholdHelper({ enabled: true, threshold: 0 })([
  { unitName: 'Ambulance', stillNeeded: 1 }
]);
expect(zeroOfficer.some(row => row.configuredAmbulanceOfficerThreshold === true), 'Threshold zero must allow an Officer for any positive Ambulance demand');

const wrapper = extractFunction('applyConfiguredFreshMissionVehicleRequirements');
expect(wrapper.includes('addConfiguredHighRiskMissingPersonAmbulanceRequirement('), 'Fresh-rule wrapper must preserve the high-risk Ambulance rule');
expect(wrapper.includes('addConfiguredAmbulanceOfficerThresholdRequirement('), 'Fresh-rule wrapper must apply the Ambulance Officer rule');
expect(wrapper.indexOf('addConfiguredAmbulanceOfficerThresholdRequirement(') < wrapper.indexOf('addConfiguredHighRiskMissingPersonAmbulanceRequirement('), 'Ambulance Officer must evaluate the final rows after the high-risk Ambulance rule');

const preloaded = extractFunction('getPreloadedMissionVehicleRequirementsForDisplay');
expect(preloaded.includes('applyConfiguredFreshMissionVehicleRequirements(\n            cache.rows\n        )'), 'Preloaded Vehicle Load must show the configured Officer row');
expect(preloaded.includes('hasCurrentMissionVehicleRequirementAuthorityForDisplay()'), 'Live shortage authority must continue to suppress static configured display');

const processRows = extractFunction('processRequirementRows');
expect(processRows.includes('includeConfiguredHighRiskMissingPersonAmbulance === true'), 'Fresh Unit Finder gate must remain present');
expect(processRows.includes('applyConfiguredFreshMissionVehicleRequirements('), 'Fresh Unit Finder gate must apply both settings rules');
expect(processRows.indexOf('normaliseOperationalRequirementRows(') < processRows.indexOf('applyConfiguredFreshMissionVehicleRequirements('), 'Configured rules must run after requirement authority normalisation');

const combined = extractFunction('handleCombinedLogic');
expect((combined.match(/includeConfiguredHighRiskMissingPersonAmbulance:/g) || []).length === 3, 'Fresh attachment, visible fallback and legacy fallback routes must keep the configured-rule opt-in');
const currentMissingIndex = combined.indexOf("'CURRENT MISSING REQUIREMENTS'");
expect(currentMissingIndex >= 0, 'Current Missing Requirements route missing');
const currentMissingWindow = combined.slice(currentMissingIndex - 250, currentMissingIndex + 300);
expect(!currentMissingWindow.includes('includeConfiguredHighRiskMissingPersonAmbulance'), 'Current live shortages must not re-add a configured Ambulance Officer');

for (const token of [
  'ambulanceOfficerThresholdEnabled:',
  'ambulanceOfficerThreshold:',
  'alwaysSendAmbulanceToHighRiskMissingPerson:',
  'highRiskMissingPersonMission:'
]) expect(source.includes(token), `Diagnostic contract missing ${token}`);

console.log('PASS: user-set more-than-X Ambulance demand adds exactly one Ambulance Officer on fresh Unit Finder paths while preserving the existing high-risk rule and live-shortage authority.');
''', encoding='utf-8')

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(readme, '**Current version:** `1.0.100`', '**Current version:** `1.0.101`', 'README version')
readme = replace_once(readme, '**Mission Finder engine:** `V10.6.149`', '**Mission Finder engine:** `V10.6.150`', 'README Mission Finder')
readme_path.write_text(readme, encoding='utf-8')

src_readme_path = ROOT / 'src/README.md'
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = replace_once(src_readme, '| Command Nexus version | `1.0.100` |', '| Command Nexus version | `1.0.101` |', 'src README version')
src_readme = replace_once(src_readme, '| Mission Finder baseline | `V10.6.149` |', '| Mission Finder baseline | `V10.6.150` |', 'src README Mission Finder')
src_readme_path.write_text(src_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## [1.0.101] - 2026-08-12

### Added

- Added a new Settings checkbox, **Automatically add 1 Ambulance Officer**, alongside the existing High-risk Missing Person Ambulance rule.
- Added a user-set numeric threshold from `0` to `99`, defaulting to `5` while the rule remains disabled by default.
- On fresh Unit Finder and Auto Mode requirement loads, one **Ambulance Officer** is added when the final ordinary Ambulance demand is strictly greater than the configured threshold. Example: threshold `5` triggers at `6` Ambulances.
- Multiple ordinary Ambulance rows are summed, an existing positive Ambulance Officer requirement prevents duplication, and the configured row appears in the preloaded Vehicle Load display.

### Preserved safety and authority

- The existing **Always include 1 Ambulance in Unit Finder** option for High Risk and Very High Risk Missing Person missions remains unchanged and fully covered.
- The Ambulance Officer threshold evaluates after the high-risk rule, so any configured high-risk Ambulance is included in the final Ambulance count.
- Current Missing Vehicles, Missing Personnel, Mission Update and other live shortage sources remain authoritative and never re-add the configured Officer.
- Both settings default off and persist independently in local storage.

### Regression coverage

- Added `scripts/check-ambulance-officer-threshold-v10101.mjs` for settings persistence, threshold bounds, strict more-than comparison, summed Ambulance demand, duplicate protection, fresh-path gating, Vehicle Load display and diagnostics.
- Chained the new regression through `scripts/check-high-risk-missing-person-ambulance-v1076.mjs`, which continues to prove the original high-risk rule.

### Changed engine baseline

- Command Nexus increased from `1.0.100` to `1.0.101`.
- Mission Finder increased from `V10.6.149` to `V10.6.150`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

'''
changelog = replace_once(changelog, '## [1.0.100] - 2026-08-11\n', entry + '## [1.0.100] - 2026-08-11\n', 'CHANGELOG insertion')
changelog_path.write_text(changelog, encoding='utf-8')

trigger = ROOT / 'scripts/.v10101-ambulance-officer-threshold-build-trigger'
if trigger.exists():
    trigger.unlink()

print('Built Command Nexus 1.0.101 Ambulance Officer threshold candidate.')
