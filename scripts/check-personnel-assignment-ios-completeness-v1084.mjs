#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(text, label = text) {
  if (!source.includes(text)) {
    fail(`Missing iOS Personnel Assignment contract: ${label}`);
  }
}

for (const required of [
  "const PERSONNEL_VERSION = '1.3.9';",
  "fileInput.id = 'mf-personnel-import-file';",
  "fileInput.type = 'file';",
  "fileInput.accept = '.json,application/json';",
  'fileInput.hidden = true;',
  "fileInput.setAttribute('aria-hidden', 'true');",
  'fileInput.tabIndex = -1;',
  "fileInput.style.display = 'none';",
  "importButton.id = 'mf-personnel-import';",
  "startButton.id = 'mf-personnel-start';",
  "pauseButton.id = 'mf-personnel-pause';",
  "stopButton.id = 'mf-personnel-stop';",
  "className: 'mf-personnel-tools-disclosure'",
  "'Tools and reports'",
  '#mf-personnel-import-file {',
  'display: none !important;',
  '#mf-personnel-panel details.mf-personnel-tools-disclosure:not([open])',
  '> .mf-compact-disclosure-content {',
  '#mf-personnel-panel details.mf-personnel-tools-disclosure[open]',
  '@media (max-width: 820px), (hover: none) and (pointer: coarse) {',
  'min-height: 44px !important;',
  'max-height: calc(',
  '100dvh',
  'env(safe-area-inset-top)',
  'env(safe-area-inset-bottom)',
  '-webkit-overflow-scrolling: touch;',
  '@media (max-width: 520px) {',
  '#mf-personnel-panel .mf-personnel-refresh-control {',
  'grid-column: 1 / -1 !important;',
]) {
  requireText(required);
}

const actionAppend = source.indexOf(
  'actionRow.append(\n' +
    '        refreshButton,\n' +
    '        fileInput,\n' +
    '        importButton,\n' +
    '        startButton,\n' +
    '        pauseButton,\n' +
    '        stopButton\n' +
    '    );'
);

if (actionAppend < 0) {
  fail(
    'Refresh, Import, Start, Pause and Stop controls must all remain ' +
      'mounted in the Personnel Assignment action row.'
  );
}

const hardeningStart = source.indexOf(
  '/* iOS Safari Personnel Assignment completeness contract. */'
);
const hardeningEnd = source.indexOf(
  '/* End iOS Safari Personnel Assignment completeness contract. */',
  hardeningStart
);

if (hardeningStart < 0 || hardeningEnd <= hardeningStart) {
  fail('Unable to isolate the permanent mobile-completeness CSS contract.');
}

const contract = source.slice(hardeningStart, hardeningEnd);

for (const selector of [
  '#mf-personnel-panel .mf-personnel-action-row',
  '#mf-personnel-panel .mf-personnel-action-row > .mf-button',
  '#mf-personnel-panel details.mf-personnel-tools-disclosure',
  '#mf-personnel-panel details.mf-personnel-tools-disclosure > summary',
  '#mf-personnel-panel .mf-personnel-tools-disclosure .mf-compact-tools-grid',
  '#mf-personnel-panel .mf-personnel-import-control',
  '#mf-personnel-panel .mf-personnel-start-control',
  '#mf-personnel-panel .mf-personnel-pause-control',
  '#mf-personnel-panel .mf-personnel-stop-control',
]) {
  if (!contract.includes(selector)) {
    fail(`Mobile completeness CSS does not protect ${selector}`);
  }
}

for (const forbidden of [
  '#mf-personnel-import { display: none',
  '#mf-personnel-start { display: none',
  '#mf-personnel-pause { display: none',
  '#mf-personnel-stop { display: none',
  '.mf-personnel-import-control { display: none',
  '.mf-personnel-start-control { display: none',
  '.mf-personnel-pause-control { display: none',
  '.mf-personnel-stop-control { display: none',
]) {
  if (source.includes(forbidden)) {
    fail(`Mobile feature-removal rule is forbidden: ${forbidden}`);
  }
}

const closedRule = contract.match(
  /details\.mf-personnel-tools-disclosure:not\(\[open\]\)[\s\S]*?> \.mf-compact-disclosure-content \{[\s\S]*?display:\s*none\s*!important;/
);
const openRule = contract.match(
  /details\.mf-personnel-tools-disclosure\[open\][\s\S]*?> \.mf-compact-disclosure-content \{[\s\S]*?display:\s*block\s*!important;/
);

if (!closedRule || !openRule) {
  fail(
    'Tools and reports must hide while closed and render normally while open.'
  );
}

console.log(
  'iOS Safari Personnel Assignment completeness contracts passed: ' +
    'Refresh, Import, Start, Pause, Stop and all Tools and reports remain ' +
    'present with safe-area scrolling and touch-sized controls.'
);
