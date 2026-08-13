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

expect(source.includes('// @version      1.0.110'), 'v1.0.71 metadata missing');
expect(source.includes('MISSION FINDER V10.6.153'), 'V10.6.134 header missing');

const addPanel = extractFunction('addPanel');
const createControlPanel = extractFunction('createControlPanel');
const injectStyles = extractFunction('injectStyles');

for (const token of [
  "'mf_control_collapsed_v10'",
  "'mf_vehicle_load_collapsed_v10'",
  "'mf_trained_personnel_collapsed_v2'",
  'savedVehicleLoadCollapsed == null\n            ? true',
]) {
  expect(source.includes(token), `Compact default contract missing ${token}`);
}

for (const token of [
  'function createCompactDisclosure(',
  'function createCompactActionDisclosure(',
  "'mc-compact-unit-status'",
  "'mc-compact-unit-log'",
  "'mc-compact-station-status'",
  "'mc-compact-station-log'",
  "'mc-compact-personnel-profile'",
  "'mc-compact-personnel-tools'",
  "'mc-compact-personnel-status'",
  "'mc-compact-personnel-station-report'",
  "'mc-compact-personnel-overall-report'",
  "'mc-compact-personnel-log'",
  "'mc_compact_disclosure_v1071_'",
]) {
  expect(addPanel.includes(token), `Disclosure contract missing ${token}`);
}

for (const token of [
  '/* Command Nexus compact operations panel V1.0.71. */',
  'width: min(360px, calc(100vw - 20px))',
  'width: min(390px, calc(100vw - 20px))',
  'grid-template-columns: repeat(4, minmax(0, 1fr))',
  '.mc-compact-disclosure-summary',
  '.mc-compact-action-disclosure',
  'max-height: 170px',
]) {
  expect(addPanel.includes(token), `Compact naming CSS missing ${token}`);
}

for (const token of [
  '/* Command Nexus compact mission shell V1.0.71. */',
  'width: min(390px, calc(100vw - 20px))',
  'grid-template-columns: repeat(3, minmax(0, 1fr))',
  '.mf-dashboard-utility-open:not(.mf2026-ios-safari)',
  ':is(#control-panel, #vehicle-load-list-box, #trained-personnel-box)',
  '.mf-compact-shell-collapsed:not(.mf2026-ios-safari)',
  'width: min(205px, calc(100vw - 20px))',
  '#mf-dashboard-brand {\n                display: none !important;',
]) {
  expect(injectStyles.includes(token), `Compact mission CSS missing ${token}`);
}

expect(
  createControlPanel.includes("'mf-compact-shell-collapsed'"),
  'Whole-shell collapsed state is not owned by Mission Control'
);
expect(
  createControlPanel.includes('scheduleMissionRequiredPersonnelPreload(0);'),
  'Required Personnel preload lifecycle changed'
);

for (const token of [
  "unitFinderBtn.id = 'unit-finder-box'",
  "missionUpdateBtn.id = 'mission-update-box'",
  "allyStealBtn.id = 'mf-ally-steal'",
  'triggerDispatchClick();',
  'triggerDispatchShareClick();',
  'toggleAutoMode();',
  'startMissionEventCollectibleCollector();',
  'stopMissionEventCollectibleCollector();',
]) {
  expect(source.includes(token), `Operational ownership missing ${token}`);
}

expect(
  source.includes('#mc-namer-panel:not(.mc-ios-safari)'),
  'Compact naming CSS must exclude iOS Safari'
);
expect(
  injectStyles.includes(
    '#mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)'
  ),
  'Compact mission CSS must exclude iOS Safari'
);
expect(
  source.includes('#mc-namer-panel.mc-ios-safari'),
  'Existing naming iOS geometry missing'
);
expect(
  source.includes('#mission-finder-wrapper.mf2026-iphone-safari'),
  'Existing iPhone mission geometry missing'
);

console.log(
  'Command Nexus V1.0.71 compact shell and progressive disclosure checks passed.'
);
