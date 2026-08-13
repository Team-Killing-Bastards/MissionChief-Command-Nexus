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

expect(source.includes('// @version      1.0.107'), 'v1.0.72 metadata missing');
expect(source.includes('MISSION FINDER V10.6.153'), 'V10.6.135 header missing');

const control = extractFunction('createControlPanel');
const styles = extractFunction('injectStyles');

for (const token of [
  "'mf-vehicle-drawer-open'",
  "loadTitle.setAttribute('role', 'button')",
  "loadTitle.tabIndex = 0",
  'toggleVehicleLoadCollapsed();',
  'event.preventDefault();',
  'event.stopPropagation();',
]) {
  expect(control.includes(token), `Vehicle disclosure ownership missing ${token}`);
}

for (const token of [
  '/* Attached Vehicle Load drawer V1.0.72. */',
  'left: calc(100% - 1px)',
  'border-left: 0',
  'width: 29px',
  'height: 96px',
  'writing-mode: vertical-rl',
  'transform: rotate(180deg)',
  'width: min(286px, calc(100vw - 430px))',
  'max-height: calc(100vh - 94px)',
  '.mf-dashboard-utility-open:not(.mf2026-ios-safari)',
  '.mf-compact-shell-collapsed:not(.mf2026-ios-safari)',
]) {
  expect(styles.includes(token), `Vehicle drawer CSS missing ${token}`);
}

expect(
  /#vehicle-load-list-box\.mf2026-load-collapsed[\s\S]{0,500}display: block !important/.test(styles),
  'Collapsed Vehicle tab must remain visible as an attached drawer handle'
);
expect(
  /#vehicle-load-list-box:not\(\.mf2026-load-collapsed\)[\s\S]{0,500}width: min\(286px/.test(styles),
  'Expanded Vehicle drawer width contract missing'
);
expect(
  source.includes("savedVehicleLoadCollapsed == null\n            ? true"),
  'Vehicle drawer must remain collapsed by default'
);
expect(
  source.includes('#mission-finder-wrapper.mf2026-iphone-safari'),
  'Existing iPhone vehicle launcher geometry missing'
);
expect(
  styles.includes('#mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)'),
  'Attached drawer must remain desktop/tablet-only'
);

for (const token of [
  'scheduleMissionRequiredPersonnelPreload(0);',
  "unitFinderBtn.addEventListener('click'",
  'triggerDispatchClick();',
  'triggerDispatchShareClick();',
  'toggleAutoMode();',
]) {
  expect(source.includes(token), `Operational ownership missing ${token}`);
}

console.log('Attached Vehicle Load drawer V1.0.72 checks passed.');
