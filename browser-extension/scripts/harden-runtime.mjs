import fs from 'node:fs';
import { patchPersonnelScanner } from './personnel-scanner-patch.mjs';
import { patchMemoryRecovery } from './memory-recovery-patch.mjs';
import { patchIncomeCapture } from './income-capture-patch.mjs';
const source = 'reference/original-extension/nexus-runtime.js';
const version=JSON.parse(fs.readFileSync('extension/manifest.json','utf8')).version;
let runtime = fs.readFileSync(source,'utf8').replaceAll('\r\n','\n');
function replace(before, after, expected = 1) {
  const count = runtime.split(before).length - 1;
  if (count !== expected) throw Error(`Runtime patch expected ${expected} matches, found ${count}: ${before.slice(0,100)}`);
  runtime = runtime.split(before).join(after);
}
replace("  const alreadyRunning = Boolean(window.__MCN_V3_CONTROLLER__ || window.__MCN_BOOT_TRACE__);", `  // Store updates do not replace code already running in an open game tab.
  // Refuse a new child realm under a different parent build before any hooks,
  // storage ownership bridge, vehicle selection or transport code can start.
  let parentBuild = '';
  try {
    if (window.top !== window && window.top.location.origin === window.location.origin) {
      parentBuild = window.top.__NEXUS_EXTENSION__?.build || '';
    }
  } catch {}
  if (parentBuild && parentBuild !== '3.0.43.14') {
    window.__NEXUS_EXTENSION__ = Object.freeze({ build: '3.0.43.14', sourceVersion: '3.0.43',
      status: 'parent-build-mismatch', parentBuild, startedAt: Date.now() });
    try {
      window.top.dispatchEvent(new window.top.CustomEvent('nexus-extension-update-required-v1', {
        detail: 'Stop Auto Mode, then refresh MissionChief to finish the Nexus update.'
      }));
    } catch {}
    return;
  }
  const alreadyRunning = Boolean(window.__MCN_V3_CONTROLLER__ || window.__MCN_BOOT_TRACE__);`);
// Both the map logger and heavy mission runtime contain this installation body.
replace("  listen(window,'pagehide',dispose);", "  listen(window,'pagehide',event => { if (!event.persisted) dispose(); });", 2);
patchPersonnelScanner(replace);
patchMemoryRecovery(replace);
patchIncomeCapture(replace);
replace("const dispatchNext = /dispatch\\s*&\\s*next clicked/i.test(text);", `// A revisited mission can retain its dispatch claim after navigation cleared
// the controller watchdog. Preserve that claim and recover the queue instead
// of leaving the worker indefinitely waiting behind the duplicate guard.
if (/^auto mode:\\s*duplicate dispatch blocked for this mission\\./i.test(text)) {
armPostDispatchWatchdog(record, 'duplicate-dispatch-guard', text, now);
}
const dispatchNext = /dispatch\\s*&\\s*next clicked/i.test(text);`);
runtime = runtime.replaceAll('3.0.43.13',version).replaceAll('3.0.43.14',version);
fs.writeFileSync('extension/nexus-runtime.js',runtime);
console.log(`Built ${version} runtime from supplied .13 with guarded hardening and scanner patches.`);
