#!/usr/bin/env node
import fs from 'node:fs';

const source = fs.readFileSync('src/missionchief-command-nexus.user.js', 'utf8');
const required = [
  '__MCN_V3_OWNERSHIP_TRACE__',
  "traceOwnership('activate')",
  "traceOwnership('deactivate')",
  "traceOwnership('promote')",
  "traceOwnership('demote')",
  "traceOwnershipBlock('get', key)",
  'snapshot.ownershipTrace',
  '__MCN_V3_LIFECYCLE_MARK__',
  'Worker lifecycle: ${normaliseText(stage)}',
  "['pageshow', 'pagehide', 'beforeunload']",
  "bootMark('visibilitychange'",
  '__MCN_V3_DIAGNOSTICS_SNAPSHOT__ = diagnosticsSnapshot',
  'exportVersion: 2',
  'lifecycleDiagnostics:',
  'localBootTrace:',
  'localOwnershipTrace:',
  'window.top.__MCN_V3_DIAGNOSTICS_SNAPSHOT__?.()',
];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`Missing lifecycle diagnostic marker: ${marker}`);
}
if (!/if \(managedFrameRole\) \{[\s\S]*?managedFrameRole === 'ACTIVE'[\s\S]*?return;\n\}/.test(source)) {
  throw new Error('The restored managed-frame admission contract changed unexpectedly.');
}
console.log('Worker lifecycle diagnostics regression passed.');
