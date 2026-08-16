#!/usr/bin/env node
// Protect the complete Personnel Assignment control surface on iOS Safari.

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
  '<button id="mc-personnel-refresh">Refresh Stations</button>',
  '<button id="mc-personnel-build-register"',
  '<button id="mc-personnel-full-register"',
  '<button id="mc-personnel-export-register"',
  '<button id="mc-personnel-import-register"',
  '<input id="mc-personnel-import-register-file" type="file" accept="application/json,.json" hidden>',
  '<button id="mc-personnel-start">Start</button>',
  '<button id="mc-personnel-pause">Pause</button>',
  '<button id="mc-personnel-stop">Stop</button>',
  '<button id="mc-personnel-view-station-report">View Station Report</button>',
  '<button id="mc-personnel-copy-station">Copy Station Report</button>',
  '<button id="mc-personnel-copy">Copy Overall Report</button>',
  '<button id="mc-personnel-debug">Debug: OFF</button>',
  '<button id="mc-personnel-clear">Clear Log</button>',
  "'#mc-personnel-build-register'",
  "'#mc-personnel-full-register'",
  "'#mc-personnel-export-register'",
  "'#mc-personnel-import-register'",
  "'#mc-personnel-view-station-report'",
  "'#mc-personnel-copy-station'",
  "'#mc-personnel-copy'",
  "'#mc-personnel-debug'",
  "'#mc-personnel-clear'",
  "'Tools and reports'",
  "'mc-compact-personnel-tools'",
  'defaultOpen = false',
  'isIosSafariWebsite()',
  '/* iOS Safari Personnel Assignment completeness contract. */',
  '/* End iOS Safari Personnel Assignment completeness contract. */',
  '#mc-namer-panel.mc-ios-safari #mc-personnel-import-register-file {',
  'display: none !important;',
  '#mc-namer-panel.mc-ios-safari .mc-compact-disclosure {',
  '#mc-namer-panel.mc-ios-safari .mc-compact-disclosure-summary {',
  '#mc-namer-panel.mc-ios-safari .mc-compact-disclosure:not([open])',
  '> .mc-compact-disclosure-body {',
  '#mc-namer-panel.mc-ios-safari .mc-compact-disclosure[open]',
  '#mc-namer-panel.mc-ios-safari .mc-compact-action-disclosure[open]',
  'grid-template-columns: repeat(2, minmax(0, 1fr));',
  'min-height: 44px !important;',
  'max-height: calc(',
  '100dvh',
  'env(safe-area-inset-top',
  'env(safe-area-inset-bottom',
  '-webkit-overflow-scrolling: touch;',
]) {
  requireText(required);
}

const personnelToolsCall = source.match(
  /createCompactActionDisclosure\(\s*compactPersonnelView\?\.querySelector\('\.mc-nexus-action-bar'\),[\s\S]*?'Tools and reports',[\s\S]*?'mc-compact-personnel-tools',[\s\S]*?isIosSafariWebsite\(\)[\s\S]*?\);/
);

if (!personnelToolsCall) {
  fail(
    'Personnel tools must remain grouped, complete and default-open on iOS Safari.'
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
  '#mc-namer-panel.mc-ios-safari #mc-personnel-import-register-file',
  '#mc-namer-panel.mc-ios-safari .mc-nexus-action-bar',
  '#mc-namer-panel.mc-ios-safari .mc-nexus-action-bar > button',
  '#mc-namer-panel.mc-ios-safari #mc-personnel-refresh',
  '#mc-namer-panel.mc-ios-safari #mc-personnel-start',
  '#mc-namer-panel.mc-ios-safari .mc-compact-disclosure',
  '#mc-namer-panel.mc-ios-safari .mc-compact-disclosure-summary',
  '#mc-namer-panel.mc-ios-safari .mc-compact-action-disclosure[open]',
  '#mc-namer-panel.mc-ios-safari .mc-compact-action-disclosure button',
]) {
  if (!contract.includes(selector)) {
    fail(`Mobile completeness CSS does not protect ${selector}`);
  }
}

const hiddenInputRule = contract.match(
  /#mc-namer-panel\.mc-ios-safari #mc-personnel-import-register-file\s*\{[\s\S]*?display:\s*none\s*!important;/
);
const closedRule = contract.match(
  /\.mc-compact-disclosure:not\(\[open\]\)[\s\S]*?> \.mc-compact-disclosure-body\s*\{[\s\S]*?display:\s*none\s*!important;/
);
const openRule = contract.match(
  /\.mc-compact-disclosure\[open\][\s\S]*?> \.mc-compact-disclosure-body\s*\{[\s\S]*?display:\s*block\s*!important;/
);

if (!hiddenInputRule || !closedRule || !openRule) {
  fail(
    'The native file input and disclosure open/closed behaviour are not fail-safe.'
  );
}

for (const forbidden of [
  '#mc-personnel-import-register { display: none',
  '#mc-personnel-start { display: none',
  '#mc-personnel-pause { display: none',
  '#mc-personnel-stop { display: none',
]) {
  if (source.includes(forbidden)) {
    fail(`Mobile feature-removal rule is forbidden: ${forbidden}`);
  }
}

console.log(
  'iOS Safari Personnel Assignment completeness contracts passed: ' +
    'all primary actions and all register/report tools remain accessible; ' +
    'the native file input stays hidden; disclosures are styled and functional.'
);
