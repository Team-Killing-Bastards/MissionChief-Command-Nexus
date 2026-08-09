#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const SOURCE_PATH = 'src/missionchief-command-nexus.user.js';
const source = await readFile(SOURCE_PATH, 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireText(text, label) {
  if (!source.includes(text)) fail(`Missing iPhone Mission Finder UI contract: ${label}`);
}

function requirePattern(pattern, label) {
  if (!pattern.test(source)) fail(`Missing iPhone Mission Finder UI contract: ${label}`);
}

function extractFunction(name) {
  const pattern = new RegExp(`(?:^|\\n)[ \\t]*(?:async[ \\t]+)?function[ \\t]+${name}[ \\t]*\\([^)]*\\)[ \\t]*\\{`, 'm');
  const match = pattern.exec(source);
  if (!match) fail(`Unable to find function ${name}`);
  const start = match.index + (match[0].startsWith('\n') ? 1 : 0);
  const opening = source.lastIndexOf('{', match.index + match[0].length - 1);
  let depth = 0;
  let state = 'code';
  let quote = '';
  let escaped = false;

  for (let index = opening; index < source.length; index += 1) {
    const character = source[index];
    const following = source[index + 1] || '';
    if (state === 'line-comment') {
      if (character === '\n') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      if (character === '*' && following === '/') {
        state = 'code';
        index += 1;
      }
      continue;
    }
    if (state === 'string' || state === 'template') {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) {
        state = 'code';
        quote = '';
      }
      continue;
    }
    if (character === '/' && following === '/') {
      state = 'line-comment';
      index += 1;
      continue;
    }
    if (character === '/' && following === '*') {
      state = 'block-comment';
      index += 1;
      continue;
    }
    if (character === "'" || character === '"') {
      state = 'string';
      quote = character;
      continue;
    }
    if (character === '`') {
      state = 'template';
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  fail(`Unable to find end of ${name}`);
}

requireText('// @version      1.0.91', 'current userscript metadata');
requireText(' * MODULE 2: MISSION FINDER V10.6.144', 'current Mission Finder module header');
requireText('function getMissionFinderPhoneScreenShortSide()', 'physical phone-screen detector');
requireText('function isMissionFinderIphoneSafariWebsite()', 'strict iPhone Safari detector');
requireText("'mf_control_collapsed_iphone_v2'", 'separate iPhone control state');
requireText("'mf_vehicle_load_collapsed_iphone_v2'", 'separate iPhone load state');
requireText("'mf_iphone_advanced_expanded_v1'", 'advanced disclosure state');
requireText("'mf2026-iphone-safari'", 'iPhone-only wrapper class');
requireText("'mf2026-primary-actions'", 'compact action grid');
requireText("'mf-iphone-advanced-toggle'", 'advanced settings disclosure');
requireText('mf-control-advanced', 'advanced settings container');
requireText("if (!missionFinderIphoneSafari) {\n            makePanelDraggable", 'iPhone drag guard');
requireText('100dvh', 'dynamic viewport sizing');
requireText('env(safe-area-inset-top, 0px)', 'safe-area top sizing');
requireText('env(safe-area-inset-bottom, 0px)', 'safe-area bottom sizing');
requireText('backdrop-filter: blur(16px)', 'native compact card treatment');
requireText('max-height: 42dvh', 'bounded load-panel viewport');
requireText("'mission-finder-iphone-native-picker-styles'", 'document-owned passive native picker stylesheet');
requireText('function applyMissionFinderIphoneNativePickerToDocument(', 'document-aware passive picker styling');
requireText('function syncMissionFinderIphoneNativePickerSurfaces(', 'multi-document passive picker synchroniser');
requireText('function cleanupMissionFinderIphoneNativePickerSurfaces()', 'passive picker cleanup owner');
requireText("'a[search_attribute]'", 'native quick-select discovery');
requireText('table:has(a[search_attribute])', 'replacement-safe selector styling');
requireText('grid-template-columns: repeat(2, minmax(0, 1fr))', 'passive two-column native quick-select grid');
requireText('display: contents !important', 'passive table structural flattening');
requireText('max-height: 46dvh', 'bounded passive native quick-select viewport');
requireText("'mission-finder-iphone-native-picker-toggle'", 'legacy toggle cleanup only');

for (const forbidden of [
  "toggle.innerHTML =",
  "toggle.addEventListener(",
  "writeMissionFinderIphoneNativePickerCollapsed(",
  "readMissionFinderIphoneNativePickerCollapsed(",
  "updateMissionFinderIphoneNativePickerState(",
  "mfIphoneNativePickerDisclosureLockUntil",
  "mfIphoneNativePickerRenderState",
  "mf-iphone-native-picker-toggle-label",
  "mf-iphone-native-picker-toggle-icon",
  "Unit Quick Select ·"
]) {
  if (source.includes(forbidden)) {
    fail(`Active native picker enhancer remains: ${forbidden}`);
  }
}

requirePattern(
  /function applyMissionFinderIphoneNativePickerToDocument\([\s\S]{0,2200}querySelector\(\s*'a\[search_attribute\]'\s*\)[\s\S]{0,2200}ensureMissionFinderIphoneNativePickerStyles\([\s\S]{0,2200}documentElement\.classList\.add/,
  'passive styling applies without per-node native picker mutation'
);
requirePattern(
  /function ensureMissionFinderIphoneNativePickerStyles\([\s\S]{0,9000}candidateDocument\.createElement\('style'\)[\s\S]{0,9000}candidateDocument\.head \|\|\s*candidateDocument\.documentElement/,
  'passive stylesheet is created inside the native picker document'
);
requirePattern(
  /function cleanupMissionFinderIphoneNativePickerDocument\([\s\S]{0,5000}mission-finder-iphone-native-picker-toggle[\s\S]{0,5000}mf-iphone-native-picker-collapsed/,
  'legacy active-enhancer ownership is cleaned after update'
);
if (/function flushMissionFinderMutationWork\(\)[\s\S]{0,5000}scheduleMissionFinderIphoneNativePickerSync\(/.test(source)) {
  fail('main mutation flush must not reattach the passive native picker styling');
}
requireText('function getMissionFinderIphoneLauncherGeometry(', 'pure launcher geometry owner');
requireText('function setMissionFinderIphoneStablePixelProperty(', 'launcher placement hysteresis');
requireText('mfIphoneLauncherLastNativeCluster', 'stable native cluster cache');
requireText('const clearance = 16', 'native cluster clearance margin');
requireText('const fallbackRight = Math.max(', 'farther-left fallback geometry');
requireText('--mf-iphone-launcher-right: 112px', 'farther-left CSS fallback');

const geometrySource = extractFunction(
  'getMissionFinderIphoneLauncherGeometry'
);
const geometry = Function(
  `"use strict";\n${geometrySource}\nreturn getMissionFinderIphoneLauncherGeometry;`
)();
const panelRect = { left: 4, top: 4, right: 386, bottom: 840 };
const bounds = { left: 0, top: 0, right: 390, bottom: 844, width: 390, height: 844 };
const cluster = { left: 300, top: 68, right: 378, bottom: 104 };
const placed = geometry(panelRect, bounds, cluster, 48);
const launcherRightEdge = panelRect.right - placed.launcherRight;
if (launcherRightEdge > cluster.left - 16) {
  fail('launcher must clear the full native control cluster by at least 16px');
}
if (placed.launcherRight < 112) {
  fail('launcher must retain the farther-left conservative fallback');
}
const fallbackPlaced = geometry(panelRect, bounds, null, 48);
if (fallbackPlaced.launcherRight < 112) {
  fail('missing native controls must still position the launcher farther left');
}

requireText("'mf_iphone_two_button_launcher_v1032'", 'two-button launcher migration');
requireText('function getMissionFinderIphonePanelStateForToggle(', 'exclusive launcher state helper');
requireText("'mf-iphone-panel-launcher'", 'iPhone launcher container');
requireText("'mf-iphone-mission-launcher'", 'Mission launcher button');
requireText("'mf-iphone-vehicle-launcher'", 'Vehicle launcher button');
requireText("iphoneMissionLauncherButton.textContent =\n            'Mission'", 'exact Mission label');
requireText("iphoneVehicleLauncherButton.textContent =\n            'Vehicle'", 'exact Vehicle label');
requireText("toggleIphoneLauncherPanel('mission')", 'Mission launcher activation');
requireText("toggleIphoneLauncherPanel('vehicle')", 'Vehicle launcher activation');
requireText("'aria-pressed'", 'launcher pressed-state contract');
requireText('function getMissionFinderIphoneNativeControlContainer()', 'native control-container resolver');
requireText('function syncMissionFinderIphoneLauncherPlacement(', 'launcher placement synchroniser');
requireText("'.control-btn-container'", 'MissionChief native control cluster selector');
requireText("'--mf-iphone-launcher-right'", 'launcher right-position variable');
requireText("'--mf-iphone-panel-top'", 'expanded panel top variable');
requirePattern(
  /#mission-finder-wrapper\.mf2026-iphone-safari[\s\S]{0,12000}#mf-iphone-panel-launcher[\s\S]{0,4500}\.mf-iphone-launcher-button/,
  'launcher styling is strictly iPhone-scoped'
);
requirePattern(
  /#mission-finder-wrapper\.mf2026-iphone-safari[\s\S]{0,12000}\.mf2026-control-header-row,[\s\S]{0,300}\.mf2026-load-header-row[\s\S]{0,120}display: none !important/,
  'legacy iPhone bars are hidden'
);
requirePattern(
  /#control-panel\.mf2026-control-collapsed,[\s\S]{0,250}#vehicle-load-list-box\.mf2026-load-collapsed[\s\S]{0,120}display: none !important/,
  'closed panels disappear behind the launcher'
);
requirePattern(
  /function syncMissionFinderIphoneNativePickerSurfaces\([\s\S]{0,5000}getMissionAccessibleDocuments\(\s*true\s*\)[\s\S]{0,5000}applyMissionFinderIphoneNativePickerToDocument\(/,
  'passive picker styling reaches every accessible same-origin mission document'
);
requirePattern(
  /function ensureMissionFinderIphoneNativePickerStyles\(\s*candidateDocument\s*\)[\s\S]{0,12000}candidateDocument\.createElement\('style'\)[\s\S]{0,12000}candidateDocument\.head \|\|\s*candidateDocument\.documentElement/,
  'stylesheet is created inside the document that owns the native picker'
);
requirePattern(
  /function initialize\(\)[\s\S]{0,1200}scheduleMissionFinderIphoneNativePickerSync\(/,
  'mission initialization schedules passive picker stylesheet ownership'
);
requirePattern(
  /function cleanupMissionFinderRuntime\(\)[\s\S]{0,7000}cleanupMissionFinderIphoneNativePickerSurfaces\(\)/,
  'runtime cleanup removes cross-document native picker ownership'
);

const detectionSource = [
  extractFunction('isMissionFinderIosSafariWebsite'),
  extractFunction('getMissionFinderPhoneScreenShortSide'),
  extractFunction('isMissionFinderIphoneSafariWebsite')
].join('\n');

const detect = ({
  userAgent,
  platform,
  maxTouchPoints = 0,
  protocol = 'https:',
  screenWidth = 390,
  screenHeight = 844,
  innerWidth = screenWidth,
  visualViewportWidth = innerWidth,
  clientWidth = innerWidth
}) => Function(
  'navigator', 'location', 'window', 'document',
  `"use strict";
${detectionSource}
return isMissionFinderIphoneSafariWebsite();`
)(
  { userAgent, platform, maxTouchPoints },
  { protocol },
  { screen: { width: screenWidth, height: screenHeight }, innerWidth, visualViewport: { width: visualViewportWidth } },
  { documentElement: { clientWidth } }
);

const safariTail = 'AppleWebKit/605.1.15 Version/18.5 Mobile/15E148 Safari/604.1';
const desktopSafariUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.5 Safari/605.1.15';
if (!detect({ userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) ${safariTail}`, platform: 'iPhone' })) fail('iPhone Safari must receive the compact UI');
if (!detect({ userAgent: desktopSafariUa, platform: 'MacIntel', maxTouchPoints: 5, screenWidth: 393, screenHeight: 852, innerWidth: 980, visualViewportWidth: 980, clientWidth: 980 })) fail('iPhone Safari desktop-site MacIntel mode must receive the compact UI');
if (detect({ userAgent: `Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) ${safariTail}`, platform: 'iPad', maxTouchPoints: 5, screenWidth: 820, screenHeight: 1180 })) fail('iPad Safari must not receive the iPhone compact UI');
if (detect({ userAgent: desktopSafariUa, platform: 'MacIntel', maxTouchPoints: 5, screenWidth: 820, screenHeight: 1180, innerWidth: 500, visualViewportWidth: 500, clientWidth: 500 })) fail('iPad desktop-site and split-screen modes must remain outside the iPhone UI');
if (detect({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 CriOS/150.0 Mobile/15E148 Safari/604.1', platform: 'iPhone' })) fail('Chrome on iOS must remain outside the Safari-only UI');
if (detect({ userAgent: desktopSafariUa, platform: 'MacIntel', maxTouchPoints: 0, screenWidth: 1440, screenHeight: 900 })) fail('Desktop Safari must remain outside the iPhone UI');

const control = extractFunction('createControlPanel');
for (const contract of [
  "await runMissionFinderMemorySensitiveOperation(",
  "'manual Unit Finder'",
  "() => handleCombinedLogic()",
  "'manual Ally Steal'",
  "() => handleAllySteal()",
  "handleMissionUpdateUnits(",
  "triggerDispatchClick();",
  "triggerDispatchShareClick();",
  "toggleAutoMode();"
]) {
  if (!control.includes(contract)) fail(`Action handler or memory lock changed or missing: ${contract}`);
}

requirePattern(
  /#mission-finder-wrapper\.mf2026-iphone-safari[\s\S]{0,14000}\.mf2026-panel[\s\S]{0,500}border-radius: 14px/,
  'compact card CSS is scoped to the iPhone wrapper'
);
requirePattern(
  /#mission-finder-wrapper\.mf2026-iphone-safari[\s\S]{0,9000}#mf-iphone-advanced-toggle/,
  'advanced disclosure CSS is iPhone-scoped'
);
requirePattern(
  /#mission-finder-wrapper\.mf2026-iphone-safari[\s\S]{0,12000}\.mf2026-primary-actions/,
  'action-grid override is iPhone-scoped'
);
requirePattern(
  /\.mf2026-primary-actions #dispatch-share-box,[\s\S]{0,150}\.mf2026-primary-actions #auto-mode-box[\s\S]{0,100}grid-column: 1 \/ -1/,
  'desktop and iPad preserve the previous full-width action rows'
);

console.log('iPhone Safari Mission Finder UI checks passed.');
