#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = bodyStart; index < source.length; index += 1) {
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
    if (character === '}' && --depth === 0) {
      return source.slice(start, index + 1);
    }
  }

  assert.fail(`Unterminated function ${name}`);
}

function runOverviewGate({
  standalone = false,
  frame = false,
  connected = true,
  desktopMatch = false
} = {}) {
  const context = {
    TOOL_IS_STANDALONE_STATION_OVERVIEW: standalone,
    TOOL_IS_STATION_OVERVIEW_FRAME: frame,
    getStationOverviewEntries: () => [{
      link: {
        isConnected: connected,
        matches: () => desktopMatch
      }
    }],
    isIosSafariWebsite: () => false,
    isRenderedStationOverviewEntry: () => false,
    result: null
  };

  vm.runInNewContext(
    `${extractFunction('isStationOverviewScreen')}\n` +
      'result = isStationOverviewScreen();',
    context
  );
  return context.result;
}

assert.ok(source.includes('// @version      1.0.122'));
assert.ok(source.includes("const UNIT_VERSION = '3.3.27';"));
assert.ok(source.includes("const STATION_VERSION = '1.3.22';"));

const startupStart = source.indexOf('const TOOL_IS_TOP_WINDOW');
const startupEnd = source.indexOf("const UNIT_VERSION = '3.3.27';", startupStart);
assert.ok(startupStart >= 0 && startupEnd > startupStart);
const startup = source.slice(startupStart, startupEnd);

for (const contract of [
  'const TOOL_IS_STATION_OVERVIEW_ROUTE',
  "String(location.pathname || '')",
  'const TOOL_IS_STANDALONE_STATION_OVERVIEW',
  'TOOL_IS_TOP_WINDOW &&',
  'TOOL_IS_STATION_OVERVIEW_ROUTE',
  'const TOOL_IS_STATION_OVERVIEW_FRAME',
  'window.top.location.origin !== location.origin'
]) {
  assert.ok(startup.includes(contract), `Missing popout startup contract: ${contract}`);
}
assert.equal(
  startup.includes('window.opener'),
  false,
  'Standalone Resource Administration must not depend on its opener'
);

assert.equal(
  runOverviewGate({ standalone: true, desktopMatch: false }),
  true,
  'Standalone /leitstellenansicht must accept its connected native station entry'
);
assert.equal(
  runOverviewGate({ frame: true, desktopMatch: false }),
  true,
  'Embedded same-origin /leitstellenansicht must retain its connected-entry gate'
);
assert.equal(
  runOverviewGate({ standalone: true, connected: false }),
  false,
  'Standalone route must still require a connected native station entry'
);
assert.equal(
  runOverviewGate({ desktopMatch: false }),
  false,
  'An unrelated top-level page must not inherit standalone overview authority'
);
assert.equal(
  runOverviewGate({ desktopMatch: true }),
  true,
  'The established desktop Stations lifecycle must remain supported'
);

const stationRename = extractFunction('processOneStationName');
const unitRun = extractFunction('processStations');
const unitRename = extractFunction('processStationVehicleQueue');

assert.ok(stationRename.includes('stationFetchDocument(station.href'));
assert.ok(stationRename.includes('submitBackgroundNativeForm('));
assert.ok(stationRename.includes('verifyStationNameSaved('));
assert.ok(unitRun.includes('unitFetchDocument(station.href'));
assert.ok(unitRename.includes('unitFetchDocument(item.editHref'));
assert.ok(unitRename.includes('submitBackgroundNativeForm('));
assert.ok(unitRename.includes('verifyUnitNameSaved('));

for (const block of [stationRename, unitRun, unitRename]) {
  for (const forbidden of [
    'window.opener',
    'window.open(',
    '.click(',
    'contentDocument',
    'openStationWorkflowIframe',
    'navigateUnitIframe'
  ]) {
    assert.equal(
      block.includes(forbidden),
      false,
      `Popout renamers must stay background-only: ${forbidden}`
    );
  }
}

console.log(
  'Standalone /leitstellenansicht background Station and Unit Naming contracts passed.'
);
