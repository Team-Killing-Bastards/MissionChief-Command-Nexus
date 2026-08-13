#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  if (start < 0) fail(`Unable to find ${name}`);
  const openParen = source.indexOf('(', start);
  let parenDepth = 0;
  let quote = '';
  let escaped = false;
  let closeParen = -1;
  for (let i = openParen; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '(') parenDepth += 1;
    else if (ch === ')' && --parenDepth === 0) { closeParen = i; break; }
  }
  const openBrace = source.indexOf('{', closeParen);
  let depth = 0;
  quote = '';
  escaped = false;
  for (let i = openBrace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(`Unterminated ${name}`);
}

expect(source.includes('// @version      1.0.110'), 'Expected Command Nexus 1.0.82');
expect(source.includes('MISSION FINDER V10.6.153'), 'Expected Mission Finder V10.6.143');
expect(source.includes('15 * 1000;'), 'Expected reduced idle scan cadence');

const eventDocuments = extractFunction('getMissionEventCollectibleDocuments');
expect(eventDocuments.includes('getMissionAccessibleDocuments(false)'), 'Event scanner must share the bounded document cache');
expect(!eventDocuments.includes("querySelectorAll('iframe')"), 'Event scanner must not independently walk every iframe');

const reconcile = extractFunction('reconcileMissionFinderFrameRuntimesFromTop');
expect(reconcile.includes('getMissionAccessibleDocuments(false)'), 'Frame supervisor must not force-refresh the document graph');

const syncWatchers = extractFunction('syncBackgroundAutomationWatchers');
for (const token of ['silentQueueRequired', 'transportWatcherRequired', 'postTransportWatcherRequired', 'stopSilentQueueWatcher()', 'stopPostTransportRehookWatcher()']) {
  expect(syncWatchers.includes(token), `Background watcher gating missing ${token}`);
}

const mutationFlush = extractFunction('flushMissionFinderMutationWork');
expect(mutationFlush.includes('scheduleTrainedPersonnelPanelRefresh()'), 'Mutation path must debounce the trained panel');
expect(!mutationFlush.includes('renderSelectedTrainedPersonnelPanel();'), 'Mutation path must not synchronously rebuild the trained panel');

const panel = extractFunction('renderSelectedTrainedPersonnelPanel');
expect(panel.includes('applyTrainedPersonnelPanelMarkupRender('), 'Trained panel must use unchanged-markup suppression');
expect(!panel.includes("summary.innerHTML = summaryParts.join('')"), 'Trained panel must not unconditionally rebuild summary DOM');

const liveRows = extractFunction('getLiveMissionTrainedPersonnelRequirementsForDisplay');
for (const token of ['mfLiveTrainedPersonnelDisplayCache', 'MF_LIVE_TRAINED_PERSONNEL_DISPLAY_CACHE_MS', 'cached.expiresAt']) {
  expect(liveRows.includes(token), `Live trained-personnel cache missing ${token}`);
}

const idleRecycle = extractFunction('shouldRecycleIdleMissionMemory');
expect(idleRecycle.includes('MF_RUNTIME_MEMORY_EMERGENCY_RECYCLE_THRESHOLD_BYTES'), 'Emergency recycle threshold missing');
expect(idleRecycle.includes('!emergencyRecycle'), 'Emergency recycle must bypass mutation-stability starvation');
expect(idleRecycle.includes('mfRuntimeMemoryLastActivityAt'), 'Emergency recycle must still require user idle time');

const softFlush = extractFunction('flushMissionFinderEphemeralMemory');
expect(softFlush.includes('invalidateLiveTrainedPersonnelDisplayCache()'), 'Soft flush must release live panel cache');
expect(softFlush.includes('!mfTransportOwnerModal.isConnected'), 'Soft flush must release detached transport modal references');

const observerCount = (source.match(/new\s+MutationObserver\s*\(/g) || []).length;
expect(observerCount === 2, `Expected exactly two permanent observers; found ${observerCount}`);

console.log('Runtime memory deep-dive contracts passed.');
