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

console.log('iOS Safari compatibility regression checks passed.');
