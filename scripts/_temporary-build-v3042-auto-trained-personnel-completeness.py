from pathlib import Path
import hashlib
import json
import subprocess

SOURCE = Path('src/missionchief-command-nexus.user.js')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def find_js_block_end(text: str, brace_start: int) -> int:
    depth = 0
    quote = ''
    escaped = False
    line_comment = False
    block_comment = False
    index = brace_start
    while index < len(text):
        char = text[index]
        nxt = text[index + 1] if index + 1 < len(text) else ''
        if line_comment:
            if char == '\n':
                line_comment = False
            index += 1
            continue
        if block_comment:
            if char == '*' and nxt == '/':
                block_comment = False
                index += 2
                continue
            index += 1
            continue
        if quote:
            if escaped:
                escaped = False
            elif char == '\\':
                escaped = True
            elif char == quote:
                quote = ''
            index += 1
            continue
        if char == '/' and nxt == '/':
            line_comment = True
            index += 2
            continue
        if char == '/' and nxt == '*':
            block_comment = True
            index += 2
            continue
        if char in "'\"`":
            quote = char
            index += 1
            continue
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return index
        index += 1
    raise SystemExit('Unable to find the end of the JavaScript block.')


source = SOURCE.read_text(encoding='utf-8')
if source.count('3.0.41') < 3:
    raise SystemExit('Expected the published 3.0.41 source baseline.')
if 'MISSION FINDER V10.6.178' not in source:
    raise SystemExit('Expected Mission Finder 10.6.178 baseline.')

source = source.replace('3.0.41', '3.0.42')
source = source.replace('10.6.178', '10.6.179')

old_trained_selection = '''                await refreshPoliceInspectorRegistryFromLiveVehicles(
                    requirements,
                    sourceLabel
                );
                const result =
                    selectVehiclesForTrainedPersonnelRequirements(
                        requirements,
                        sourceLabel
                    );
                const selectedCount =
                    result.selectedVehicleCount;'''
new_trained_selection = '''                await refreshPoliceInspectorRegistryFromLiveVehicles(
                    requirements,
                    sourceLabel
                );
                let result =
                    selectVehiclesForTrainedPersonnelRequirements(
                        requirements,
                        sourceLabel
                    );
                if (
                    !result.trainingSatisfied ||
                    !result.vehicleCoverageSatisfied
                ) {
                    if (mfDebugEnabled) {
                        debugLog(
                            'TRAINED PERSONNEL FINAL RETRY',
                            `${sourceLabel} | first verified pass remained short; waiting briefly, refreshing only unverified assignment pages and re-running the shared trained selector once.`
                        );
                    }
                    updateStatusBox(
                        'Unit Finder rechecking trained vehicle assignments once before blocking dispatch...'
                    );
                    await wait(250);
                    const retrySource =
                        `${sourceLabel} FINAL RETRY`;
                    await refreshPoliceInspectorRegistryFromLiveVehicles(
                        requirements,
                        retrySource
                    );
                    result =
                        selectVehiclesForTrainedPersonnelRequirements(
                            requirements,
                            retrySource
                        );
                }
                const selectedCount =
                    result.selectedVehicleCount;'''
source = replace_once(
    source,
    old_trained_selection,
    new_trained_selection,
    'bounded trained-personnel final retry',
)

run_auto_start = source.find('    async function runAutoModeLoop(')
if run_auto_start < 0:
    raise SystemExit('Unable to find runAutoModeLoop.')
non_ready_marker = '            if (!vehicleLoadState.ready) {'
non_ready_start = source.find(non_ready_marker, run_auto_start)
if non_ready_start < 0:
    raise SystemExit('Unable to find the final non-ready Auto Mode branch.')
non_ready_brace = source.find('{', non_ready_start)
non_ready_end = find_js_block_end(source, non_ready_brace)
old_non_ready_block = source[non_ready_start:non_ready_end + 1]
if 'Dispatching to skip mission' not in old_non_ready_block:
    raise SystemExit('The expected partial-dispatch branch was not found.')
if 'clickDispatchOnly()' not in old_non_ready_block:
    raise SystemExit('The old non-ready branch no longer contains its partial dispatch call.')

new_non_ready_block = '''            if (!vehicleLoadState.ready) {
                const staffingBlocked =
                    !!personnelQualificationAlert ||
                    mfStaffingBlockActive ||
                    vehicleLoadState.trainedPersonnelBlocked === true;
                if (staffingBlocked) {
                    const blockText =
                        String(
                            vehicleLoadState.trainedPersonnelBlockText ||
                            mfStaffingBlockText ||
                            personnelQualificationAlert ||
                            'Verified trained personnel are still missing.'
                        ).trim();
                    addMissionLogEntry(
                        'skipped',
                        getCurrentMissionName(),
                        'Verified trained-personnel shortage; dispatch blocked',
                        null
                    );
                    stopAutoMode(
                        `Auto stopped: ${blockText} Dispatch was not clicked.`
                    );
                    break;
                }
                changeDispatchBoxColor(false);
                const incompleteSelectionState =
                    getCurrentAutoDispatchSelectionState();
                const selectedCount =
                    Math.max(
                        0,
                        parseInt(
                            incompleteSelectionState?.selectedCount,
                            10
                        ) || 0
                    );
                addMissionLogEntry(
                    'skipped',
                    getCurrentMissionName(),
                    selectedCount > 0
                        ? 'Incomplete Unit Finder selection; no vehicles dispatched'
                        : 'Units not ready',
                    null
                );
                if (selectedCount === 0) {
                    stopAutoMode(
                        'Auto stopped: Unit Finder selected 0 vehicles after a full-list retry. The mission was not dispatched.'
                    );
                    break;
                }
                const incompleteRows =
                    (
                        Array.isArray(vehicleLoadState.rows)
                            ? vehicleLoadState.rows
                            : []
                    )
                        .map(row => {
                            const required =
                                Math.max(
                                    0,
                                    parseInt(row?.required, 10) || 0
                                );
                            const selected =
                                Math.max(
                                    0,
                                    parseInt(row?.selected, 10) || 0
                                );
                            return {
                                name:
                                    String(
                                        row?.originalName ||
                                        row?.mappedName ||
                                        'Requirement'
                                    ).trim(),
                                shortfall:
                                    Math.max(0, required - selected)
                            };
                        })
                        .filter(row => row.shortfall > 0)
                        .slice(0, 6)
                        .map(row => `${row.name} x${row.shortfall}`);
                const incompleteDetail =
                    incompleteRows.length > 0
                        ? ` Confirmed requirements still missing: ${incompleteRows.join(', ')}.`
                        : '';
                stopAutoMode(
                    `Auto stopped: Required mission resource is unavailable. Unit Finder selected ${selectedCount} vehicle${selectedCount === 1 ? '' : 's'}, but the mission is not fully covered.${incompleteDetail} No vehicles were dispatched.`
                );
                break;
            }'''
source = source[:non_ready_start] + new_non_ready_block + source[non_ready_end + 1:]

if 'Auto Mode: units not ready. Dispatching to skip mission...' in source:
    raise SystemExit('The old partial-dispatch status remains in the source.')
SOURCE.write_text(source, encoding='utf-8')

Path('scripts/check-auto-trained-personnel-final-retry.mjs').write_text(r'''#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const signatures = [`async function ${name}(`, `function ${name}(`];
  const start = Math.min(...signatures.map(signature => {
    const index = source.indexOf(signature);
    return index < 0 ? Number.POSITIVE_INFINITY : index;
  }));
  assert.ok(Number.isFinite(start), `${name} must exist`);
  const brace = source.indexOf('{', source.indexOf(')', start));
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = brace; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
    if (lineComment) {
      if (character === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

const processRows = extractFunction('processRequirementRows');
const retryMarker = processRows.indexOf('TRAINED PERSONNEL FINAL RETRY');
assert.ok(retryMarker >= 0, 'trained requirements must expose one bounded final retry');
const refreshMatches = [...processRows.matchAll(/refreshPoliceInspectorRegistryFromLiveVehicles\s*\(/g)].map(match => match.index);
const selectionMatches = [...processRows.matchAll(/selectVehiclesForTrainedPersonnelRequirements\s*\(/g)].map(match => match.index);
assert.equal(refreshMatches.length, 2, 'trained processing must perform the normal refresh plus one final refresh');
assert.equal(selectionMatches.length, 2, 'trained processing must perform the normal selection plus one final selection');
assert.ok(refreshMatches[0] < selectionMatches[0], 'the first live refresh must precede the first selection');
assert.ok(selectionMatches[0] < retryMarker, 'the retry must only happen after the first selection remains short');
assert.ok(retryMarker < refreshMatches[1] && refreshMatches[1] < selectionMatches[1],
  'the final retry must refresh unverified assignments before selecting again');
assert.match(processRows, /await\s+wait\s*\(\s*250\s*\)/,
  'the retry must wait briefly for transient assignment-page failures to settle');
assert.match(processRows, /!result\.trainingSatisfied\s*\|\|\s*!result\.vehicleCoverageSatisfied/s,
  'both verified training and compatible vehicle capacity must be complete');

const normalise = extractFunction('normalisePublicOrderTrainedRequirements');
assert.match(normalise, /requirementType:\s*'armed_response_atc_vehicle'/s,
  'Armed Response must retain its dedicated Armed Traffic Car requirement');
assert.match(normalise, /eligibleVehicleTypeIds:\s*\[\s*'25'\s*\]/s,
  'Armed Response must remain restricted to exact type-25 Armed Traffic Cars');
assert.match(normalise, /requiredTrainingCodes:\s*\[\s*'traffic_police',\s*'swat'\s*\]/s,
  'Armed Traffic Car occupants must remain dual Roads Policing and Firearms qualified');

console.log('PASS: trained-personnel selection gets one bounded live retry without weakening exact Armed Traffic Car qualification rules.');
''', encoding='utf-8')

Path('scripts/check-auto-no-partial-incomplete-dispatch.mjs').write_text(r'''#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`async function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const brace = source.indexOf('{', source.indexOf(')', start));
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = brace; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  assert.fail(`${name} is unterminated`);
}

const autoLoop = extractFunction('runAutoModeLoop');
const start = autoLoop.indexOf('if (!vehicleLoadState.ready) {');
const end = autoLoop.indexOf("updateStatusBox('Auto Mode dispatching mission...');", start);
assert.ok(start >= 0 && end > start, 'the final non-ready dispatch gate must be isolatable');
const nonReady = autoLoop.slice(start, end);

assert.doesNotMatch(nonReady, /clickDispatchOnly\s*\(/,
  'an under-covered mission must never dispatch the partial checked set');
assert.doesNotMatch(nonReady, /clickMissionDispatchByValue\s*\(/,
  'an under-covered mission must never use the completed-dispatch route');
assert.doesNotMatch(nonReady, /claimAutoMissionDispatch\s*\(/,
  'an under-covered mission must not claim a dispatch it will not perform');
assert.doesNotMatch(nonReady, /MF_FINAL_QUEUE_DISPATCH_FLAG/,
  'an under-covered mission must not arm final-queue dispatch state');
assert.match(nonReady, /Required mission resource is unavailable/,
  'a partial selection must use the controller recoverable-resource-shortage wording');
assert.match(nonReady, /No vehicles were dispatched\./,
  'the stop reason must state that the partial selection was held');
assert.match(nonReady, /Unit Finder selected 0 vehicles after a full-list retry/,
  'the existing zero-selection fail-closed route must remain intact');
assert.ok(!source.includes('Auto Mode: units not ready. Dispatching to skip mission...'),
  'the old partial-dispatch status must be removed');

console.log('PASS: Auto Mode fails closed on incomplete coverage and never sends a partial vehicle set merely to skip the mission.');
''', encoding='utf-8')

# Update the one intentional component-version lock used by the endurance contract.
endurance = Path('scripts/check-v3-12-hour-endurance-telemetry.mjs')
endurance_text = endurance.read_text(encoding='utf-8')
endurance_text = replace_once(
    endurance_text,
    "const MISSION_FINDER_VERSION = '10.6.178';",
    "const MISSION_FINDER_VERSION = '10.6.179';",
    '12-hour endurance Mission Finder version lock',
)
endurance.write_text(endurance_text, encoding='utf-8')

changelog = Path('CHANGELOG.md')
changelog_text = changelog.read_text(encoding='utf-8')
entry = '''## [3.0.42] - 2026-09-02

### Fixed

- Give trained-personnel selection one bounded final live assignment refresh and selector pass before Auto Mode declares a verified shortage. Failed or incomplete assignment-page reads can therefore recover in the same Auto cycle instead of requiring a second manual Unit Finder click.
- Stop Auto Mode from dispatching a partial checked vehicle set merely to skip an under-covered mission. Zero-selection and partial-selection failures now remain fail-closed and are handed back to the controller for normal shortage quarantine and retry.
- Preserve the exact Armed Response contract: type-25 Armed Traffic Cars only, with each counted occupant holding both Roads Policing and Firearms qualifications.
- Add permanent regressions for the trained-personnel retry and the no-partial-dispatch gate.
- Increase Command Nexus from `3.0.41` to `3.0.42` and Mission Finder from `10.6.178` to `10.6.179`.

'''
if '## [3.0.42]' not in changelog_text:
    changelog_text = changelog_text.replace('## [Unreleased]\n\n', '## [Unreleased]\n\n' + entry, 1)
changelog.write_text(changelog_text, encoding='utf-8')

for filename in [
    'README.md',
    'src/README.md',
    'docs/ARCHITECTURE.md',
    'docs/DEVELOPER_HANDOFF.md',
    'docs/MIGRATION.md',
    'docs/README.md',
    'docs/ROADMAP.md',
]:
    path = Path(filename)
    text = path.read_text(encoding='utf-8')
    text = text.replace('3.0.41', '3.0.42')
    text = text.replace('10.6.178', '10.6.179')
    path.write_text(text, encoding='utf-8')

# Sanitised evidence from the screenshot/report; no account, station or vehicle identifiers are retained.
evidence_path = Path('docs/evidence/auto-armed-personnel-and-partial-dispatch-v3.0.41-2026-09-02.md')
evidence_path.write_text('''# Auto Armed Response false shortage and partial dispatch — v3.0.41

## Source

Owner report and MissionChief requirement-table screenshot supplied on 2 September 2026.

## Observed behaviour

The representative Police mission required six Police Cars, one Dog Support Unit and six Armed Response Personnel in armed vehicles. Auto Mode reported insufficient Armed Response personnel, while an immediate manual Unit Finder run found the required units.

The owner also reported a wider increase in missions being only partly dispatched and then requiring a manual top-up.

## Code finding

The shared trained-personnel path performed a single live assignment-page pass before failing closed. A transient failed or incomplete assignment-page response therefore required another Unit Finder run to retry the unverified vehicles.

Separately, the Auto Mode final gate deliberately dispatched any non-zero partial selection when `vehicleLoadState.ready` was false, using the partial dispatch as a way to move past the mission. That directly explains missions being sent short and later requesting top-ups.

## Correction

Command Nexus 3.0.42 / Mission Finder 10.6.179 gives trained-personnel selection one bounded final refresh and selector pass. It also removes partial skip dispatch entirely: incomplete missions stop without sending any checked vehicles, allowing the controller to quarantine and retry them normally.

The established Armed Response safety rule is unchanged: only exact type-25 Armed Traffic Cars count, and counted occupants must hold both Roads Policing and Firearms qualifications.

## Live acceptance

1. Run the representative six-person Armed Response mission in Auto Mode and confirm it completes without needing a second manual Unit Finder click when sufficient eligible staff are genuinely available.
2. Exercise an intentionally under-covered mission and confirm Auto Mode sends zero vehicles, records a recoverable shortage and advances through the normal controller skip path.
3. Confirm genuine trained-personnel shortages still block Dispatch.
''', encoding='utf-8')

evidence_index = Path('docs/evidence/README.md')
evidence_index_text = evidence_index.read_text(encoding='utf-8')
evidence_line = '- [Auto Armed Response false shortage and partial dispatch — v3.0.41](auto-armed-personnel-and-partial-dispatch-v3.0.41-2026-09-02.md)\n'
if evidence_line not in evidence_index_text:
    evidence_index_text = evidence_index_text.rstrip() + '\n' + evidence_line
evidence_index.write_text(evidence_index_text, encoding='utf-8')

source_bytes = SOURCE.stat().st_size
source_sha = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
if source_bytes >= 2 * 1024 * 1024:
    raise SystemExit(f'Candidate exceeds the 2 MiB userscript ceiling: {source_bytes}')

state_path = Path('project-state.json')
state = json.loads(state_path.read_text(encoding='utf-8'))
state['lastUpdated'] = '2026-09-02'
state['canonical']['status'] = 'candidate'
state['canonical']['version'] = '3.0.42'
state['canonical']['sourceBytes'] = source_bytes
state['canonical']['sourceSha256'] = source_sha
state['canonical']['components']['missionFinder'] = '10.6.179'

evidence_id = 'RUN-2026-09-02-V3041-ARMED-AUTO'
if not any(item.get('id') == evidence_id for item in state.get('evidence', [])):
    state['evidence'].append({
        'id': evidence_id,
        'title': 'Auto Armed Response false shortage and partial dispatch',
        'file': str(evidence_path),
        'kind': 'sanitised-summary',
        'supports': [
            'bounded trained-personnel final retry',
            'no partial dispatch on incomplete coverage',
        ],
    })

risk_id = 'RISK-LIVE-002'
if not any(item.get('id') == risk_id for item in state.get('knownRisks', [])):
    state['knownRisks'].append({
        'id': risk_id,
        'severity': 'medium',
        'summary': 'The 3.0.42 trained-personnel final retry and no-partial-dispatch gate require live Auto Mode validation.',
        'mitigation': 'Run a fully staffed Armed Response mission and an intentionally under-covered mission; confirm the first completes in one Auto cycle and the second dispatches zero vehicles before controller quarantine.',
    })
state['handover']['nextAction'] = 'Live-validate the 3.0.42 Armed Response retry and no-partial-dispatch behaviour, then continue GitHub issue #396 with the read-only runtime-retention audit.'
if str(evidence_path) not in state['handover']['readOrder']:
    state['handover']['readOrder'].insert(-1, str(evidence_path))
state_path.write_text(json.dumps(state, indent=2) + '\n', encoding='utf-8')
subprocess.run(['node', 'scripts/render-project-state.mjs'], check=True)

# Remove every inspection/build artefact before validation and commit.
for path in Path('.').glob('.tmp-v3042-*'):
    path.unlink()
Path('.github/workflows/_temporary-v3042-trained-dispatch-inspection.yml').unlink(missing_ok=True)
Path('scripts/_temporary-build-v3042-auto-trained-personnel-completeness.py').unlink(missing_ok=True)

print(f'Candidate userscript size: {source_bytes} bytes')
print(f'Candidate SHA-256: {source_sha}')
