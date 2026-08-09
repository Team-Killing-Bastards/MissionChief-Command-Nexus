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

expect(source.includes('// @version      1.0.88'), 'v1.0.79 metadata missing');
expect(source.includes('MISSION FINDER V10.6.144'), 'V10.6.139 header missing');
expect(
  source.includes('/* Vehicle drawer top alignment and motion V1.0.73. */'),
  'V1.0.73 drawer motion marker missing'
);
expect(
  /#vehicle-load-list-box\s*\{[\s\S]{0,120}top:\s*0;/.test(source),
  'Vehicle drawer is not top-aligned'
);
expect(
  source.includes('190ms cubic-bezier(0.22, 1, 0.36, 1)'),
  'Smooth drawer easing missing'
);
expect(
  source.includes('transform: translateX(-6px) scaleX(0.96)'),
  'Collapsed drawer tuck animation missing'
);
expect(
  source.includes('transform: translateX(0) scaleX(1)'),
  'Expanded drawer terminal transform missing'
);
expect(
  source.includes('@media (prefers-reduced-motion: reduce)'),
  'Reduced-motion contract missing'
);
expect(
  source.includes('transition-duration: 1ms !important'),
  'Reduced-motion transition override missing'
);

const panel = extractFunction('createControlPanel');
const unitIndex = panel.indexOf('primaryActions.appendChild(unitFinderBtn)');
const updateIndex = panel.indexOf('primaryActions.appendChild(missionUpdateBtn)');
const allyIndex = panel.indexOf('primaryActions.appendChild(allyStealBtn)');
const dispatchIndex = panel.indexOf('primaryActions.appendChild(dispatchBtn)');
expect(unitIndex >= 0, 'Unit Finder action append missing');
expect(updateIndex > unitIndex, 'Mission Update must follow Unit Finder');
expect(allyIndex > updateIndex, 'Ally Steal must follow Mission Update');
expect(dispatchIndex > allyIndex, 'Dispatch must follow Ally Steal');

expect(
  /missionUpdateBtn\.addEventListener\(\s*'click'/.test(panel),
  'Mission Update handler ownership missing'
);
expect(
  /allyStealBtn\.addEventListener\(\s*'click'/.test(panel),
  'Ally Steal handler ownership missing'
);
expect(
  /unitFinderBtn\.addEventListener\(\s*'click'/.test(panel),
  'Unit Finder handler ownership missing'
);
expect(panel.includes('triggerDispatchClick();'), 'Dispatch handler missing');
expect(panel.includes('triggerDispatchShareClick();'), 'Share handler missing');
expect(panel.includes('toggleAutoMode();'), 'Auto Mode handler missing');
expect(
  panel.includes('scheduleMissionRequiredPersonnelPreload(0);'),
  'Required Personnel preload mount lifecycle missing'
);

expect(
  source.includes('/* Attached Vehicle Load drawer V1.0.72. */'),
  'Attached Vehicle drawer base contract missing'
);
expect(
  source.includes('#mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari)'),
  'Desktop-only drawer selector isolation missing'
);
expect(
  source.includes('#mission-finder-wrapper.mf2026-iphone-safari'),
  'Existing iPhone geometry missing'
);

console.log(
  'Command Nexus V1.0.79 top-aligned animated Vehicle drawer and action-order checks passed.'
);
