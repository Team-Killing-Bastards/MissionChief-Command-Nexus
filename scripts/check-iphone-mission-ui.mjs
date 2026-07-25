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

requireText('// @version      1.0.31', 'v1.0.31 metadata');
requireText(' * MODULE 2: MISSION FINDER V10.6.96', 'V10.6.96 module header');
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
requireText("'mf_iphone_native_picker_collapsed_v1'", 'native picker collapsed state');
requireText("'mission-finder-iphone-native-picker-styles'", 'document-owned native picker stylesheet');
requireText("'mission-finder-iphone-native-picker-toggle'", 'native picker disclosure control');
requireText('function applyMissionFinderIphoneNativePickerToDocument(', 'document-aware native picker enhancer');
requireText('function syncMissionFinderIphoneNativePickerSurfaces(', 'multi-document native picker synchroniser');
requireText('function cleanupMissionFinderIphoneNativePickerSurfaces()', 'native picker cleanup owner');
requireText("'a[search_attribute]'", 'native quick-select discovery');
requireText('grid-template-columns: repeat(2, minmax(0, 1fr))', 'two-column native quick-select grid');
requireText('mf-iphone-native-picker-collapsed', 'collapsed native picker presentation');
requireText('mf-iphone-native-picker-strip', 'horizontal native category strip');
requireText('display: contents !important', 'native picker structural flattening');
requireText('max-height: 46dvh', 'bounded native quick-select viewport');

requireText("'mf_control_collapsed_iphone_v3'", 'corrected iPhone Mission Control state key');
requireText("'mf_vehicle_load_collapsed_iphone_v3'", 'corrected iPhone Vehicle Load state key');
requireText("'mf_iphone_advanced_expanded_v2'", 'corrected iPhone advanced state key');
requireText("'mf_iphone_native_picker_collapsed_v2'", 'corrected native picker state key');
requireText("'mf_iphone_collapse_defaults_v1031'", 'one-time collapse-default migration');
requireText('function migrateMissionFinderIphoneCollapseDefaults()', 'collapse-default migration owner');
requirePattern(
  /MF_CONTROL_COLLAPSED_KEY,\s*'true'/,
  'Mission Control migration default'
);
requirePattern(
  /MF_VEHICLE_LOAD_COLLAPSED_KEY,\s*'true'/,
  'Vehicle Load migration default'
);
requirePattern(
  /MF_IPHONE_NATIVE_PICKER_COLLAPSED_KEY,\s*'true'/,
  'native picker migration default'
);
requireText('function getMissionFinderIphoneCloseControlGutter()', 'native close-control gutter resolver');
requireText('function syncMissionFinderIphoneCloseControlClearance(', 'close-control clearance synchroniser');
requireText("'--mf-iphone-close-gutter'", 'close-control CSS variable');
requireText('pointer-events: none', 'pointer-transparent iPhone wrapper');
requireText('pointer-events: auto', 'interactive iPhone panel children');
requireText('display: none !important', 'explicit collapsed body hiding');
requireText('consumeIphoneDisclosureEvent', 'deterministic iPhone disclosure ownership');
requireText('event.stopImmediatePropagation?.()', 'disclosure propagation guard');
requireText("dragHandle.setAttribute('role', 'button')", 'Mission Control title disclosure semantics');
requireText("loadTitle.setAttribute('role', 'button')", 'Vehicle Load title disclosure semantics');
requirePattern(
  /'aria-controls',\s*'mf-control-body'/,
  'Mission Control ARIA ownership'
);
requirePattern(
  /'aria-controls',\s*'mf-load-body'/,
  'Vehicle Load ARIA ownership'
);
requirePattern(
  /savedMissionControlCollapsed == null[\s\S]{0,150}isMissionFinderIphoneSafariWebsite\(\)/,
  'Mission Control defaults collapsed only on iPhone'
);
requirePattern(
  /#mission-finder-wrapper\.mf2026-iphone-safari #control-panel[\s\S]{0,300}var\(--mf-iphone-close-gutter, 48px\)/,
  'Mission Control reserves the native close-control corner'
);
requirePattern(
  /function resetMissionFinderIosPosition\([\s\S]{0,800}syncMissionFinderIphoneCloseControlClearance\(panel\)/,
  'viewport reset reconciles close-control clearance'
);
requirePattern(
  /function keepMissionFinderWindowOnScreen\([\s\S]{0,500}syncMissionFinderIphoneCloseControlClearance\(panel\)/,
  'visual viewport reconciliation preserves close-control clearance'
);
requirePattern(
  /function syncMissionFinderIphoneNativePickerSurfaces\([\s\S]{0,5000}getMissionAccessibleDocuments\(\s*true\s*\)[\s\S]{0,5000}applyMissionFinderIphoneNativePickerToDocument\(/,
  'native picker is applied to every accessible same-origin mission document'
);
requirePattern(
  /function ensureMissionFinderIphoneNativePickerStyles\(\s*candidateDocument\s*\)[\s\S]{0,12000}candidateDocument\.createElement\('style'\)[\s\S]{0,12000}candidateDocument\.head \|\|\s*candidateDocument\.documentElement/,
  'stylesheet is created inside the document that owns the native picker'
);
requirePattern(
  /const MF_MUTATION_VEHICLE_SELECTOR =[\s\S]{0,250}a\[search_attribute\]/,
  'native quick-selector replacement is covered by the existing mutation lifecycle'
);
requirePattern(
  /function flushMissionFinderMutationWork\(\)[\s\S]{0,5000}scheduleMissionFinderIphoneNativePickerSync\(/,
  'coalesced mission mutations resynchronise the native picker'
);
requirePattern(
  /function initialize\(\)[\s\S]{0,1200}scheduleMissionFinderIphoneNativePickerSync\(/,
  'mission initialization schedules the native picker enhancer'
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
  "await handleCombinedLogic();",
  "await handleAllySteal();",
  "handleMissionUpdateUnits(",
  "triggerDispatchClick();",
  "triggerDispatchShareClick();",
  "toggleAutoMode();"
]) {
  if (!control.includes(contract)) fail(`Action handler changed or missing: ${contract}`);
}

requirePattern(
  /#mission-finder-wrapper\.mf2026-iphone-safari[\s\S]{0,1800}border-radius: 14px/,
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
