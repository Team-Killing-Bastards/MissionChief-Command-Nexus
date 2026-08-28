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
requirePattern(
  /window\.addEventListener\(\s*['"]pageshow['"]\s*,\s*enforce/,
  'Safari bfcache single-panel enforcement'
);
requireText(
  "style.dataset.mcNamerStyle = 'true';",
  'single style-instance marker'
);

requireText(
  'async function stationFetchDocument(',
  'background Station Naming reads'
);
requireText(
  'async function unitFetchDocument(',
  'background Unit Naming reads'
);
requireText(
  'function prepareBackgroundNativeForm(',
  'native background edit forms'
);

for (const forbiddenNamingFrameToken of [
  'function createManagedStationIframe(',
  'async function openStationWorkflowIframe(',
  'mc-namer-managed-station-iframe'
]) {
  if (source.includes(forbiddenNamingFrameToken)) {
    fail(`Naming must remain background-only on iOS: ${forbiddenNamingFrameToken}`);
  }
}

const forbiddenDesktopOnlySelector =
  "querySelectorAll('a.lightbox-open.list-group-item.active[href^=\"/buildings/\"]')";
if (source.includes(forbiddenDesktopOnlySelector)) {
  fail('A station-dependent feature still uses the obsolete desktop-only selector');
}

const panelIdAssignments = source.match(/\.id\s*=\s*['"]mc-namer-panel['"]/g) || [];
if (panelIdAssignments.length !== 1) {
  fail(`Expected exactly one menu creation site; found ${panelIdAssignments.length}`);
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
requirePattern(
  /#control-panel\s*{\s*width:\s*260px;/,
  'desktop Mission Control width preservation'
);
requirePattern(
  /#vehicle-load-list-box\s*{\s*width:\s*300px;/,
  'desktop Vehicle Load List width preservation'
);
requireText(
  "!/(?:CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo)/i.test(userAgent)",
  'Mission Control non-Safari browser exclusion'
);

console.log('iOS Safari compatibility regression checks passed.');
