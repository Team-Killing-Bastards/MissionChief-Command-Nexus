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

function expect(value, message) {
  if (!value) fail(message);
}

function extractFunction(name) {
  const match = new RegExp(
    `(?:async\\s+)?function\\s+${name}\\s*\\(`
  ).exec(source);
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

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }

    if (character === '/' && next === '/') {
      const end = source.indexOf('\n', index + 2);
      index = end < 0 ? source.length : end;
      continue;
    }

    if (character === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end < 0) fail(`Unclosed comment in ${name}`);
      index = end + 1;
      continue;
    }

    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  fail(`Unable to extract ${name}`);
}

expect(
  source.includes('// @version      1.0.70'),
  'Command Nexus 1.0.70 metadata missing'
);
expect(
  source.includes('MISSION FINDER V10.6.133'),
  'Mission Finder V10.6.133 header missing'
);

const addPanel = extractFunction('addPanel');
const switchToolTab = extractFunction('switchToolTab');
const createControlPanel = extractFunction('createControlPanel');
const injectStyles = extractFunction('injectStyles');

for (const token of [
  '--nx-bg: #080d14',
  '--nx-surface: #0d141e',
  '--nx-accent: #5fc3e4',
  '--nx-success: #62c99a',
  '--nx-warning: #d7ad62',
  '--nx-danger: #db7d83',
  'font-variant-numeric: tabular-nums',
  'overflow-wrap: anywhere',
  'minmax(0, 1fr)',
  '@media (max-width: 1180px)',
  '@media (max-width: 900px)',
  '@media (max-width: 700px)',
]) {
  expect(source.includes(token), `Shared visual contract missing ${token}`);
}

for (const token of [
  'mc-nexus-brand-block',
  'MISSIONCHIEF COMMAND NEXUS',
  'mc-nexus-version-chip',
  '<span class="mc-nexus-tab-index">01</span><span>Unit Naming</span>',
  '<span class="mc-nexus-tab-index">02</span><span>Station Naming</span>',
  '<span class="mc-nexus-tab-index">03</span><span>Personnel</span>',
  'mc-nexus-config-card',
  'mc-nexus-status-card',
  'mc-nexus-action-bar',
  'mc-nexus-log',
  'mc-nexus-personnel-grid',
]) {
  expect(addPanel.includes(token), `Naming workspace contract missing ${token}`);
}

expect(
  !addPanel.includes('🚒 Unit Naming Tool'),
  'Decorative emoji Unit Naming tab must be removed'
);
expect(
  !addPanel.includes('🏢 Station Naming Tool'),
  'Decorative emoji Station Naming tab must be removed'
);
expect(
  !addPanel.includes('👥 Personnel Assignment'),
  'Decorative emoji Personnel tab must be removed'
);

for (const token of [
  "unitView.style.display = showUnit ? 'grid' : 'none'",
  "stationView.style.display = showStation ? 'grid' : 'none'",
  "personnelView.style.display = showPersonnel ? 'grid' : 'none'",
  "panel.dataset.activeTool = targetTab",
  "? 'Unit Naming'",
  "? 'Station Naming'",
  "'Personnel Assignment'",
  'headerVersion.textContent',
  'clampToolPanelToViewport(panel)',
]) {
  expect(
    switchToolTab.includes(token),
    `Responsive tool-tab contract missing ${token}`
  );
}

for (const token of [
  "dashboardBrand.id = 'mf-dashboard-brand'",
  'Operational command surface',
  'LIVE MISSION CONTEXT',
  '<span class="mf-dashboard-tab-icon">01</span>',
  '<span class="mf-dashboard-tab-icon">02</span>',
  '<span class="mf-dashboard-tab-icon">03</span>',
  'wrapper.appendChild(dashboardBrand)',
  "dragHandle.textContent = 'Mission'",
]) {
  expect(
    createControlPanel.includes(token),
    `Mission dashboard visual contract missing ${token}`
  );
}

for (const token of [
  '#mf-dashboard-brand',
  'grid-template-areas:',
  '"brand brand brand"',
  '"control load trained"',
  'flex-direction: row',
  '#mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)',
]) {
  expect(
    injectStyles.includes(token),
    `Mission dashboard CSS contract missing ${token}`
  );
}

// Operational IDs and event owners must remain unchanged.
for (const token of [
  "unitFinderBtn.id = 'unit-finder-box'",
  "allyStealBtn.id = 'mf-ally-steal'",
  "missionUpdateBtn.id = 'mission-update-box'",
  "dispatchBtn.id = 'dispatch-box'",
  "dispatchShareBtn.id = 'dispatch-share-box'",
  "autoModeBtn.id = 'auto-mode-box'",
  "unitFinderBtn.addEventListener('click'",
  "allyStealBtn.addEventListener('click'",
  "triggerDispatchClick()",
  "triggerDispatchShareClick()",
  "toggleAutoMode()",
  "MF_EVENT_SCANNER_ENABLED_KEY",
  "startMissionEventCollectibleCollector()",
  "stopMissionEventCollectibleCollector()",
]) {
  expect(source.includes(token), `Operational ownership missing ${token}`);
}

expect(
  createControlPanel.includes(
    'wrapper.appendChild(loadPanel);\n        wrapper.appendChild(trainedPanel);\n        document.body.appendChild(wrapper);\n\n        scheduleMissionRequiredPersonnelPreload(0);'
  ),
  'Required Personnel preload mount lifecycle changed'
);

// Shared styling must never absorb the established iOS geometry.
expect(
  source.includes('#mc-namer-panel:not(.mc-ios-safari)'),
  'Naming visual system must exclude iOS Safari geometry'
);
expect(
  injectStyles.includes(
    '#mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)'
  ),
  'Mission visual system must exclude iOS Safari geometry'
);
expect(
  source.includes('#mc-namer-panel.mc-ios-safari'),
  'Existing naming-tool iOS styling was removed'
);
expect(
  source.includes('#mission-finder-wrapper.mf2026-iphone-safari'),
  'Existing iPhone mission styling was removed'
);

console.log(
  'Command Nexus V1.0.70 visual system, responsive layout and ownership checks passed.'
);
