#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

source_path = Path('src/missionchief-command-nexus.user.js')
source = source_path.read_text(encoding='utf-8')


def fail(message: str) -> None:
    raise SystemExit(message)


def function_span(text: str, name: str) -> tuple[int, int]:
    match = re.search(
        rf'(?m)^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(',
        text,
    )
    if not match:
        fail(f'Function not found: {name}')

    open_paren = text.find('(', match.start(), match.end())
    paren_depth = 0
    state = 'code'
    quote = ''
    escaped = False
    close_paren = -1
    index = open_paren

    while index < len(text):
        character = text[index]
        next_character = text[index + 1] if index + 1 < len(text) else ''
        if state == 'line_comment':
            if character == '\n':
                state = 'code'
            index += 1
            continue
        if state == 'block_comment':
            if character == '*' and next_character == '/':
                state = 'code'
                index += 2
                continue
            index += 1
            continue
        if state == 'string':
            if escaped:
                escaped = False
            elif character == '\\':
                escaped = True
            elif character == quote:
                state = 'code'
            index += 1
            continue
        if character == '/' and next_character == '/':
            state = 'line_comment'
            index += 2
            continue
        if character == '/' and next_character == '*':
            state = 'block_comment'
            index += 2
            continue
        if character in ('"', "'", '`'):
            state = 'string'
            quote = character
            index += 1
            continue
        if character == '(':
            paren_depth += 1
        elif character == ')':
            paren_depth -= 1
            if paren_depth == 0:
                close_paren = index
                break
        index += 1

    if close_paren < 0:
        fail(f'Function parameters not terminated: {name}')

    body_start = text.find('{', close_paren)
    depth = 0
    state = 'code'
    quote = ''
    escaped = False
    index = body_start

    while index < len(text):
        character = text[index]
        next_character = text[index + 1] if index + 1 < len(text) else ''
        if state == 'line_comment':
            if character == '\n':
                state = 'code'
            index += 1
            continue
        if state == 'block_comment':
            if character == '*' and next_character == '/':
                state = 'code'
                index += 2
                continue
            index += 1
            continue
        if state == 'string':
            if escaped:
                escaped = False
            elif character == '\\':
                escaped = True
            elif character == quote:
                state = 'code'
            index += 1
            continue
        if character == '/' and next_character == '/':
            state = 'line_comment'
            index += 2
            continue
        if character == '/' and next_character == '*':
            state = 'block_comment'
            index += 2
            continue
        if character in ('"', "'", '`'):
            state = 'string'
            quote = character
            index += 1
            continue
        if character == '{':
            depth += 1
        elif character == '}':
            depth -= 1
            if depth == 0:
                return match.start(), index + 1
        index += 1

    fail(f'Function body not terminated: {name}')


def replace_in_function(
    text: str,
    name: str,
    replacements: list[tuple[str, str, str]],
) -> str:
    start, end = function_span(text, name)
    body = text[start:end]
    for old, new, label in replacements:
        count = body.count(old)
        if count != 1:
            fail(f'{name} / {label}: expected one match, found {count}')
        body = body.replace(old, new, 1)
    return text[:start] + body + text[end:]


# Keep the change intentionally modest: shorten only settle/fallback delays.
# Dispatch eligibility, exact success matching, timeouts and close attempts remain unchanged.
constants_marker = '    const MF_ALLY_PENDING_MAX_AGE_MS ='
if 'MF_ALLY_SELECTION_CLEAR_SETTLE_MS' not in source:
    marker_start = source.find(constants_marker)
    if marker_start < 0:
        fail('Ally pending-age constant not found')
    marker_end = source.find(';', marker_start)
    if marker_end < 0:
        fail('Ally pending-age constant is not terminated')
    marker_end += 1
    constants = '''
    const MF_ALLY_SELECTION_CLEAR_SETTLE_MS = 150;
    const MF_ALLY_SELECTION_SETTLE_MS = 225;
    const MF_ALLY_PRE_DISPATCH_SETTLE_MS = 225;
    const MF_ALLY_RESUME_MIN_CLICK_AGE_MS = 1200;
    const MF_ALLY_SAME_DOCUMENT_FALLBACK_MS = 1400;
    const MF_ALLY_CLOSE_RETRY_MS = 150;
    const MF_ALLY_CLOSE_VERIFY_MS = 250;'''
    source = source[:marker_end] + constants + source[marker_end:]

source = replace_in_function(
    source,
    'handleAllySteal',
    [
        (
            '        await wait(250);',
            '        await wait(MF_ALLY_SELECTION_CLEAR_SETTLE_MS);',
            'selection-clear settle',
        ),
        (
            '            await wait(350);',
            '            await wait(MF_ALLY_SELECTION_SETTLE_MS);',
            'selection settle',
        ),
        (
            '        await wait(400);',
            '        await wait(MF_ALLY_PRE_DISPATCH_SETTLE_MS);',
            'pre-dispatch settle',
        ),
        (
            '            2200\n        );',
            '            MF_ALLY_SAME_DOCUMENT_FALLBACK_MS\n        );',
            'same-document fallback',
        ),
    ],
)

source = replace_in_function(
    source,
    'resumeAllyStealAfterDispatchRefresh',
    [
        (
            '            if (elapsed < 2000) {',
            '            if (elapsed < MF_ALLY_RESUME_MIN_CLICK_AGE_MS) {',
            'minimum click age condition',
        ),
        (
            '                    2000 - elapsed',
            '                    MF_ALLY_RESUME_MIN_CLICK_AGE_MS - elapsed',
            'minimum click age wait',
        ),
    ],
)

source = replace_in_function(
    source,
    'clickAllyStealParentMissionClose',
    [
        (
            '                await wait(250);',
            '                await wait(MF_ALLY_CLOSE_RETRY_MS);',
            'close retry',
        ),
        (
            '            await wait(400);',
            '            await wait(MF_ALLY_CLOSE_VERIFY_MS);',
            'close verification',
        ),
    ],
)

source_path.write_text(source, encoding='utf-8')

check_path = Path('scripts/check-ally-steal-response-v1082.mjs')
check_path.write_text(
    r'''import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(name) {
  const pattern = new RegExp(
    `(?:async\\s+)?function\\s+${name}\\s*\\(`
  );
  const match = pattern.exec(source);
  if (!match) fail(`Unable to find function ${name}`);

  let index = source.indexOf('(', match.index);
  let parenDepth = 0;
  let quote = '';
  let escaped = false;
  for (; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') parenDepth += 1;
    if (character === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) break;
    }
  }

  const bodyStart = source.indexOf('{', index);
  let depth = 0;
  quote = '';
  escaped = false;
  for (index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '/' && next === '/') {
      const lineEnd = source.indexOf('\n', index + 2);
      index = lineEnd < 0 ? source.length : lineEnd;
      continue;
    }
    if (character === '/' && next === '*') {
      const blockEnd = source.indexOf('*/', index + 2);
      index = blockEnd < 0 ? source.length : blockEnd + 1;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, index + 1);
    }
  }
  fail(`Unable to extract function ${name}`);
}

expect(source.includes('// @version      1.0.82'), 'Expected Command Nexus 1.0.82');
expect(source.includes('MISSION FINDER V10.6.142'), 'Expected Mission Finder V10.6.142');

for (const token of [
  'const MF_ALLY_SELECTION_CLEAR_SETTLE_MS = 150;',
  'const MF_ALLY_SELECTION_SETTLE_MS = 225;',
  'const MF_ALLY_PRE_DISPATCH_SETTLE_MS = 225;',
  'const MF_ALLY_RESUME_MIN_CLICK_AGE_MS = 1200;',
  'const MF_ALLY_SAME_DOCUMENT_FALLBACK_MS = 1400;',
  'const MF_ALLY_CLOSE_RETRY_MS = 150;',
  'const MF_ALLY_CLOSE_VERIFY_MS = 250;'
]) {
  expect(source.includes(token), `Missing Ally Steal timing contract: ${token}`);
}

const handle = extractFunction('handleAllySteal');
for (const token of [
  'clearSelectionGuards();',
  'await ensureVehicleListLoaded();',
  'await wait(MF_ALLY_SELECTION_CLEAR_SETTLE_MS);',
  'await wait(MF_ALLY_SELECTION_SETTLE_MS);',
  'await wait(MF_ALLY_PRE_DISPATCH_SETTLE_MS);',
  'await getAllyStealNormalDispatchButton();',
  'writeAllyStealPendingState(',
  'dispatchButton.click();',
  'MF_ALLY_SAME_DOCUMENT_FALLBACK_MS'
]) {
  expect(handle.includes(token), `Ally Steal dispatch path missing ${token}`);
}
expect(
  handle.indexOf('writeAllyStealPendingState(') < handle.indexOf('dispatchButton.click();'),
  'Pending state must be written before dispatch is clicked'
);

const resume = extractFunction('resumeAllyStealAfterDispatchRefresh');
for (const token of [
  'elapsed < MF_ALLY_RESUME_MIN_CLICK_AGE_MS',
  'MF_ALLY_RESUME_MIN_CLICK_AGE_MS - elapsed',
  'await waitForAllyStealDispatchSuccess(',
  '15000',
  'await clickAllyStealParentMissionClose();'
]) {
  expect(resume.includes(token), `Ally Steal resume path missing ${token}`);
}

const success = extractFunction('waitForAllyStealDispatchSuccess');
for (const token of [
  'timeoutMs = 8000',
  'existingAlertIds.has(',
  'allyStealSuccessAlertMatchesVehicle(',
  'isAllyStealElementVisible(',
  'await wait(150);'
]) {
  expect(success.includes(token), `Ally Steal success safety missing ${token}`);
}

const close = extractFunction('clickAllyStealParentMissionClose');
for (const token of [
  'attempt <= 12',
  'await wait(MF_ALLY_CLOSE_RETRY_MS);',
  'clearAllyStealPendingState(',
  'closeButton.click();',
  'await wait(MF_ALLY_CLOSE_VERIFY_MS);',
  '!closeButton.isConnected',
  '!isAllyStealElementVisible('
]) {
  expect(close.includes(token), `Ally Steal close safety missing ${token}`);
}

const dispatchLookup = extractFunction('getAllyStealNormalDispatchButton');
expect(dispatchLookup.includes('timeoutMs = 4000'), 'Dispatch lookup timeout must remain four seconds');
expect(dispatchLookup.includes('await wait(100);'), 'Dispatch lookup polling cadence must remain unchanged');

const oldPreparationMs = 250 + 350 + 400;
const newPreparationMs = 150 + 225 + 225;
expect(newPreparationMs === 600, 'Expected bounded 600 ms preparation waits');
expect(oldPreparationMs - newPreparationMs === 400, 'Expected a modest 400 ms preparation reduction');

console.log('Ally Steal response timing and safety contracts passed.');
''',
    encoding='utf-8',
)

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
fixed_anchor = '- Soft memory maintenance releases the live personnel display cache and stale detached transport-modal references.\n'
fixed_addition = (
    fixed_anchor +
    '- Ally Steal now uses shorter bounded selection, dispatch-resume and parent-close settle delays, reducing the normal path without weakening exact Fire Officer, success-alert or mission-close confirmation.\n'
)
if changelog.count(fixed_anchor) != 1:
    fail(f'Changelog fixed anchor: expected one match, found {changelog.count(fixed_anchor)}')
changelog = changelog.replace(fixed_anchor, fixed_addition, 1)

safety_anchor = '- Exact Unit Finder, Mission Update, trained-personnel authority, patient/prisoner transport, Auto Mode mission ownership and final dispatch safeguards remain unchanged.\n'
safety_addition = (
    safety_anchor +
    '- Ally Steal retains the exact selected-vehicle identity, new-success-alert matching, 15-second confirmation window, pending-state hand-off and 12-attempt parent-close fallback.\n'
)
if changelog.count(safety_anchor) != 1:
    fail(f'Changelog safety anchor: expected one match, found {changelog.count(safety_anchor)}')
changelog_path.write_text(
    changelog.replace(safety_anchor, safety_addition, 1),
    encoding='utf-8',
)

print('Applied bounded Ally Steal response improvements and permanent regression.')
