#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const scriptPath = path.join(root, 'src', 'missionchief-command-nexus.user.js');
const code = fs.readFileSync(scriptPath, 'utf8');
const forbiddenSourceSignatures = [
  'script.google.com',
  'script.googleusercontent.com',
  'Mission Analytics',
  'Sharing & Sync',
  'missionAnalytics',
  'MISSION_ANALYTICS',
  'activity recorder',
];
const sourceHits = forbiddenSourceSignatures.filter((signature) =>
  code.toLowerCase().includes(signature.toLowerCase())
);
if (sourceHits.length) {
  throw new Error(`Command Nexus must not contain the abandoned external logger stack: ${sourceHits.join(', ')}`);
}
for (const relative of ['integrations/google-apps-script', 'integrations/google-app-script']) {
  if (fs.existsSync(path.join(root, relative))) {
    throw new Error(`Command Nexus must not restore logger backend integration path: ${relative}`);
  }
}
console.log('External logger exclusion check passed.');
