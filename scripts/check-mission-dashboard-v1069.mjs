#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (value, message) => { if (!value) fail(message); };

function extractFunction(name) {
  const match = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  if (!match) fail(`Unable to find ${name}`);
  const start = match.index;
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') { quote = character; continue; }
    if (character === '/' && next === '/') { const end = source.indexOf('\n', index + 2); index = end < 0 ? source.length : end; continue; }
    if (character === '/' && next === '*') { const end = source.indexOf('*/', index + 2); if (end < 0) fail(`Unclosed comment in ${name}`); index = end + 1; continue; }
    if (character === '{') depth += 1;
    if (character === '}') { depth -= 1; if (depth === 0) return source.slice(start, index + 1); }
  }
  fail(`Unable to extract ${name}`);
}

expect(source.includes('// @version      1.0.81'), 'Command Nexus 1.0.69 metadata missing');
expect(source.includes('MISSION FINDER V10.6.141'), 'Mission Finder V10.6.139 header missing');
const panel = extractFunction('createControlPanel');
const startScanner = extractFunction('startMissionEventCollectibleCollector');
const styles = extractFunction('injectStyles');

for (const token of [
  "dashboardRail.id = 'mf-dashboard-rail'",
  'data-mf-dashboard-tab="mission"',
  'data-mf-dashboard-tab="settings"',
  'data-mf-dashboard-tab="diagnostics"',
  "settingsPane.id = 'mf-dashboard-settings-pane'",
  "diagnosticsPane.id = 'mf-dashboard-diagnostics-pane'",
  'settingsPane.appendChild(advancedBody)',
  'diagnosticsPane.appendChild(diagnosticsBtn)',
  "eventScannerBox.id = 'mf-event-scanner-box'",
  "MF_EVENT_SCANNER_ENABLED_KEY",
  'startMissionEventCollectibleCollector()',
  'stopMissionEventCollectibleCollector()',
  'MissionChief Nexus V${dashboardVersion} · MIT · Martblyth',
]) expect(panel.includes(token) || source.includes(token), `Dashboard contract missing ${token}`);

expect(startScanner.includes('!mfEventScannerEnabled'), 'Event collector must obey the user Event Scanner switch');
expect(styles.includes('mf-dashboard-utility-open'), 'Integrated dashboard layout CSS missing');
expect(styles.includes('#mf-dashboard-footer'), 'Dashboard footer CSS missing');

const primaryStart = panel.indexOf("primaryActions.className");
const primaryEnd = panel.indexOf('controlBody.appendChild(primaryActions)', primaryStart);
const primaryBlock = panel.slice(primaryStart, primaryEnd);
expect(!primaryBlock.includes('primaryActions.appendChild(diagnosticsBtn);\n        controlBody'), 'Diagnostics must not remain an unconditional Mission Control action');
expect(panel.indexOf('settingsPane.appendChild(advancedBody)') < panel.indexOf('const unitFinderBtn'), 'Settings ownership must be established before action creation');
expect(panel.includes('wrapper.appendChild(loadPanel);\n        wrapper.appendChild(trainedPanel);\n        document.body.appendChild(wrapper);\n\n        scheduleMissionRequiredPersonnelPreload(0);'), 'Required Personnel preload lifecycle must remain intact');

console.log('Mission dashboard V10.6.132 ownership and lifecycle checks passed.');
