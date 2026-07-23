#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const SOURCE_PATH = 'src/missionchief-command-nexus.user.js';
const source = await readFile(SOURCE_PATH, 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(text, label) {
  if (!source.includes(text)) {
    fail(`Missing iOS compatibility contract: ${label}`);
  }
}

function requirePattern(pattern, label) {
  if (!pattern.test(source)) {
    fail(`Missing iOS compatibility contract: ${label}`);
  }
}

function requireMinimum(text, minimum, label) {
  const count = source.split(text).length - 1;
  if (count < minimum) {
    fail(`${label} expected at least ${minimum} occurrences; found ${count}`);
  }
}

requireText(
  'const STATION_OVERVIEW_LINK_SELECTOR = [',
  'shared station-overview selector'
);
requireText(
  '.building_list_li a[href*="/buildings/"]',
  'responsive station-list selector'
);
requireText(
  'function getStationOverviewEntries(',
  'responsive station discovery'
);
requireText(
  'function findStationOverviewEntry(',
  'canonical station lookup'
);
requireMinimum(
  'getStationOverviewEntries()',
  5,
  'station-dependent workflows using shared discovery'
);

requirePattern(
  /function isStationOverviewScreen\(\)\s*\{[\s\S]{0,1200}getStationOverviewEntries\(\)[\s\S]{0,1200}isIosSafariWebsite\(\)/,
  'iOS-only responsive loader fallback'
);
requirePattern(
  /a\.lightbox-open\.list-group-item\.active\[href\*?=["']\/buildings\//,
  'desktop station-page guard'
);

requireText(
  'function ensureSingleNamingToolsPanel(',
  'single-panel enforcement'
);
requireText(
  "document.querySelectorAll('#mc-namer-panel')",
  'duplicate-panel enumeration'
);
requireText(
  'function installSingleNamingToolsPanelGuard(',
  'continuous single-panel guard'
);
requireText(
  "window.addEventListener('pageshow', enforce",
  'Safari bfcache single-panel enforcement'
);
requireText(
  "style.dataset.mcNamerStyle = 'true';",
  'single style-instance marker'
);

requireText(
  'function isRenderedStationOverviewEntry(',
  'rendered Stations-view detection'
);
requireText(
  'function removeNamingToolsPanelFromOffPage(',
  'off-page Resource Administration removal'
);
requireText(
  'function decideNamingToolsPanelLifecycle(',
  'panel lifecycle decision contract'
);
requireText(
  'function reconcileNamingToolsPanelLifecycle(',
  'persistent panel lifecycle reconciliation'
);
requireText(
  'TOOL_PANEL_VIEWPORT_CLEANUPS',
  'removed-panel viewport cleanup isolation'
);
requirePattern(
  /function isStationOverviewScreen\(\)[\s\S]{0,2200}isIosSafariWebsite\(\)[\s\S]{0,2200}isRenderedStationOverviewEntry\(/,
  'iOS rendered Stations-view visibility gate'
);
requirePattern(
  /function reconcileNamingToolsPanelLifecycle\(\)[\s\S]{0,2200}removeNamingToolsPanelFromOffPage\(\)[\s\S]{0,2200}init\(\)/,
  'off-page removal and Stations-view recreation'
);
requirePattern(
  /function initWhenReady\(\)\s*\{[\s\S]{0,500}installSingleNamingToolsPanelGuard\(\);[\s\S]{0,500}if \(isIosSafariWebsite\(\)\) return;/,
  'persistent iOS lifecycle guard installation'
);
requirePattern(
  /function installSingleNamingToolsPanelGuard\(\)[\s\S]{0,6500}observer\.observe\([\s\S]{0,1800}attributes:\s*true[\s\S]{0,1800}aria-hidden/,
  'responsive navigation DOM and visibility observation'
);
if (source.includes('installSingleNamingToolsPanelGuard(panel)')) {
  fail('Panel recreation must not install another global lifecycle guard');
}

requireText(
  'function createManagedStationIframe(',
  'same-origin station iframe fallback'
);
requireText(
  'function removeManagedStationIframe(',
  'managed iframe cleanup'
);
requireText(
  'async function openStationWorkflowIframe(',
  'shared station workflow opener'
);
requireText(
  'mc-namer-managed-station-iframe',
  'managed iframe identity'
);
requireMinimum(
  'openStationWorkflowIframe(',
  3,
  'station workflows using the shared iframe opener'
);

const forbiddenDesktopOnlySelector =
  "querySelectorAll('a.lightbox-open.list-group-item.active[href^=\"/buildings/\"]')";
if (source.includes(forbiddenDesktopOnlySelector)) {
  fail('A station-dependent feature still uses the obsolete desktop-only selector');
}

const panelIdAssignments = source.match(/\.id\s*=\s*['"]mc-namer-panel['"]/g) || [];
if (panelIdAssignments.length !== 1) {
  fail(`Expected exactly one menu creation site; found ${panelIdAssignments.length}`);
}

const lifecycleFunctionMatch = source.match(
  /function decideNamingToolsPanelLifecycle\([^)]*\)\s*\{[\s\S]*?\n    \}/
);
if (!lifecycleFunctionMatch) {
  fail('Unable to extract the panel lifecycle decision function');
}

let decideNamingToolsPanelLifecycle;
try {
  decideNamingToolsPanelLifecycle = Function(
    `"use strict"; ${lifecycleFunctionMatch[0]}; return decideNamingToolsPanelLifecycle;`
  )();
} catch (error) {
  fail(`Unable to evaluate the panel lifecycle decision function: ${error.message}`);
}

const lifecycleCases = [
  { input: [false, false, false], expected: 'dedupe', label: 'desktop outside Stations' },
  { input: [false, true, false], expected: 'dedupe', label: 'desktop Stations without panel' },
  { input: [true, false, false], expected: 'remove', label: 'iOS outside Stations without panel' },
  { input: [true, false, true], expected: 'remove', label: 'iOS outside Stations with panel' },
  { input: [true, true, false], expected: 'create', label: 'iOS Stations without panel' },
  { input: [true, true, true], expected: 'dedupe', label: 'iOS Stations with panel' }
];

for (const testCase of lifecycleCases) {
  const actual = decideNamingToolsPanelLifecycle(...testCase.input);
  if (actual !== testCase.expected) {
    fail(
      `Panel lifecycle ${testCase.label} expected ${testCase.expected}; found ${actual}`
    );
  }
}

requireText(
  'function isMissionFinderIosSafariWebsite(',
  'Mission Control iOS Safari detector'
);
requireText(
  'mf2026-ios-safari',
  'Mission Control iOS Safari wrapper class'
);
requireText(
  '#mission-finder-wrapper.mf2026-ios-safari',
  'Mission Control mobile layout'
);
requireText(
  'function getMissionFinderViewportBounds(',
  'Mission Control visual viewport bounds'
);
requireText(
  'function resetMissionFinderIosPosition(',
  'Mission Control safe-area reset'
);
requireText(
  'MF_CONTROL_COLLAPSED_KEY',
  'Mission Control iOS collapse storage isolation'
);
requireText(
  'MF_VEHICLE_LOAD_COLLAPSED_KEY',
  'Vehicle Load List iOS collapse storage isolation'
);
requirePattern(
  /function makePanelDraggable\(panel, dragHandle\)[\s\S]{0,16000}isMissionFinderIosSafariWebsite\(\)[\s\S]{0,16000}pointerdown/,
  'Mission Control pointer dragging'
);
requirePattern(
  /if \(!missionFinderIosSafari\)[\s\S]{0,1200}wrapper\.style\.left/,
  'desktop Mission Control positioning isolation'
);
requirePattern(
  /if \(missionFinderIosSafari\)[\s\S]{0,1000}resetMissionFinderIosPosition/,
  'iOS Mission Control top placement'
);
requireText(
  '#control-panel {\n                width: 260px;',
  'desktop Mission Control width preservation'
);
requireText(
  '#vehicle-load-list-box {\n                width: 300px;',
  'desktop Vehicle Load List width preservation'
);
requireText(
  "!/(?:CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(userAgent)",
  'Mission Control non-Safari browser exclusion'
);

console.log('iOS Safari compatibility regression checks passed.');
