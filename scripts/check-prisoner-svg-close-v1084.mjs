#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };

function requireText(token, label) {
  if (!source.includes(token)) fail(`Missing prisoner SVG close contract: ${label}`);
}

function extractFunction(name) {
  const pattern = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const match = pattern.exec(source);
  if (!match) fail(`Unable to locate function ${name}`);
  const start = match.index;
  const rest = source.slice(start + match[0].length);
  const next = /^\s*(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(/m.exec(rest);
  if (!next) return source.slice(start);
  return source.slice(start, start + match[0].length + next.index);
}

for (const [token, label] of [
  ['// @version      1.0.84', 'v1.0.84 metadata'],
  ['MISSION FINDER V10.6.144', 'Mission Finder V10.6.144'],
  ['function getAutoPrisonerReleaseCloseControl(', 'bounded close-control resolver'],
  ['svg[data-icon="xmark"]', 'Font Awesome data-icon marker'],
  ['svg.svg-inline--fa.fa-xmark', 'Font Awesome class marker'],
  ['button, a[href], [role="button"]', 'interactive parent resolution'],
  ['marker.parentElement || marker', 'bounded immediate-parent fallback'],
  ['modal.contains(control)', 'modal ownership boundary'],
  ['closeMarker,', 'live marker retained for fallback click'],
  ['current.closeButton.isConnected === false', 'stale Vue control rejection'],
  ['current.closeMarker !== current.closeButton', 'separate marker fallback'],
  ['current.closeMarker.isConnected !== false', 'live marker verification'],
  ['const MF_AUTO_PRISONER_RELEASE_RESULT_WAIT_MS = 10000;', 'result maximum wait retained'],
  ['const MF_AUTO_PRISONER_RELEASE_DISMISS_WAIT_MS = 8000;', 'dismiss maximum wait retained'],
  ['const MF_AUTO_PRISONER_RELEASE_DISMISS_CLOSE_WAIT_MS = 8000;', 'close maximum wait retained'],
]) requireText(token, label);

const resolver = extractFunction('getAutoPrisonerReleaseCloseControl');
for (const token of [
  'span.lightbox-close[title="Close"]',
  'svg[data-icon="xmark"]',
  'marker.closest?.(',
  'modal.contains(control)',
  'visible(control)',
]) {
  if (!resolver.includes(token)) fail(`Close resolver missing ${token}`);
}

const discovery = extractFunction('getVisibleAutoPrisonerReleaseDismissContexts');
for (const token of [
  '.vm--container .vm--modal svg[data-icon="xmark"]',
  '.vm--container .vm--modal svg.svg-inline--fa.fa-xmark',
  'marker.closest(',
  'resolveAutoPrisonerReleaseDismissContext({',
]) {
  if (!discovery.includes(token)) fail(`Scoped modal discovery missing ${token}`);
}
if (/candidateDocument\.querySelectorAll\(\s*['"]svg\[data-icon/.test(discovery)) {
  fail('Page-wide unscoped xmark discovery is forbidden');
}

const close = extractFunction('closeAutoPrisonerReleaseDismissAfterClick');
const markerClick = close.indexOf('realClickForQueueRestart(current.closeMarker);');
const syntheticClick = close.indexOf("for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'])");
const overlayClick = close.indexOf('realClickForQueueRestart(current.overlay);');
if (!(markerClick >= 0 && syntheticClick > markerClick && overlayClick > syntheticClick)) {
  fail('Close retries must use live marker, synthetic control events, then overlay fallback');
}
if (!close.includes("return 'stuck';")) fail('Fail-closed prisoner result stop is missing');

console.log('Prisoner Vue/Font Awesome SVG close ownership and retry contracts passed.');
