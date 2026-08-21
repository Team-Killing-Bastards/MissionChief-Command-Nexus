#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const outputPath = 'src/missionchief-command-nexus.user.js';
const source = await readFile(outputPath, 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

try {
  new vm.Script(source, { filename: outputPath });
} catch (error) {
  fail(`Generated master has invalid JavaScript syntax: ${error.message}`);
}

const bytes = Buffer.byteLength(source, 'utf8');
expect(bytes < 2 * 1024 * 1024, `Generated master exceeds the 2 MiB userscript limit: ${bytes}`);
expect((source.match(/\/\/ ==UserScript==/g) || []).length === 1, 'Generated master must have exactly one userscript metadata start');
expect((source.match(/\/\/ ==\/UserScript==/g) || []).length === 1, 'Generated master must have exactly one userscript metadata end');
expect(source.includes('// @name         MissionChief Command Nexus'), 'V3 production name missing');
const metadataVersionLine = source.split(/\r?\n/).find(line => line.startsWith('// @' + 'version')) || '';
const metadataVersion = metadataVersionLine.trim().split(/\s+/).at(-1) || '';
expect(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(metadataVersion), 'Production version metadata missing');
expect(Number(metadataVersion.split('.')[0]) >= 3, 'Merged V3 source must remain on the V3-or-newer release line');
expect(source.includes('// @run-at       document-start'), 'Merged master must start at document-start for frame ownership');

const controllerIndex = source.indexOf('const VERSION =');
const deferredIndex = source.indexOf('const startEmbeddedCommandNexus = () => {');
const finderIndex = source.indexOf('MISSION FINDER V');
expect(controllerIndex >= 0, 'V3 controller body missing');
expect(source.includes(`const VERSION = '${metadataVersion}';`), 'V3 controller version must match userscript metadata');
expect(source.includes(`const MASTER_VERSION = '${metadataVersion}';`), 'V3 master version must match userscript metadata');
expect(deferredIndex > controllerIndex, 'Complete Command Nexus must be deferred after the controller');
expect(finderIndex > deferredIndex, 'Mission Finder must be embedded inside the document-end-compatible start boundary');
expect(source.includes("document.addEventListener('DOMContentLoaded', startEmbeddedCommandNexus, { once: true });"), 'Embedded Command Nexus DOM-ready boundary missing');

for (const [needle, label] of [
  ["const MF_AIRFIELD_OPERATIONS_SUPERVISOR_TYPE_ID = '80';", 'Airfield Operations Supervisor type 80'],
  ["const MF_SEARCH_DOG_UNIT_TYPE_ID = '102';", 'Rescue/Search Dog type 102'],
  ["const MF_NORMAL_AMBULANCE_TYPE_ID = '5';", 'Mission Upgrade Any vehicle ambulance type 5'],
  ['Maximum amount of cars to tow', 'maximum car towing rule'],
  ['Maximum amount of trucks to tow', 'maximum truck towing rule'],
  ['POST_DISPATCH_SOFT_RECOVERY_MS = 8000', '8-second post-dispatch soft recovery'],
  ['POST_DISPATCH_HARD_RECOVERY_MS = 16000', '16-second post-dispatch hard recovery'],
  ['preserveFinalDispatch: true', 'duplicate-dispatch guard preservation'],
  ['postDispatchPauseReason', 'transport-aware watchdog pause'],
  ['PIPELINE_TARGET_ROTATION_GRACE_MS = 6000', 'B/C rotation grace'],
  ['PIPELINE_READY_HANDOFF_GRACE_MS = 15000', 'ready B/C retention grace'],
  ['transportServiceCleared', 'balanced personal transport clearing'],
  ['RECOVERABLE_SHORTAGE_SKIP_ADVANCES = 20', '20-advance shortage cooldown'],
]) {
  expect(source.includes(needle), `Generated master is missing ${label}`);
}

expect(source.includes('mergedRuntime: true'), 'Diagnostics must identify the merged runtime');
expect(source.includes('pairedV2Required: false'), 'Diagnostics must declare that no paired V2 script is required');
expect(source.includes('if (managedFrameRole)'), 'A/B/C document-start ownership gate missing');
expect(source.includes('MF_V3_DORMANT_PRELOAD_BRIDGE_KEY'), 'Embedded Mission Finder dormant-preload bridge missing');
expect(source.includes('This controller NEVER clicks Dispatch itself') === false, 'Install build should not depend on the stripped design comment');

console.log(`PASS: V3 master merge is syntactically valid, single-install, ${bytes} bytes, and preserves ownership, recovery, transport and exact vehicle-rule contracts.`);
