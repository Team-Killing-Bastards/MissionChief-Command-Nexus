import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const backend = await readFile(
  'integrations/google-apps-script/Code.gs',
  'utf8'
);

function extractFunction(name) {
  const start = backend.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = backend.indexOf('\n}\n\nfunction ', start);
  assert.notEqual(end, -1, `${name} must have a bounded source body`);
  return backend.slice(start, end + 2);
}

const clearBody = extractFunction('clearLoggerSheetData_');
assert.match(clearBody, /\.clearContent\(\)/);
assert.doesNotMatch(clearBody, /\.deleteRows\(/);

const createPlayerBody = extractFunction(
  'createMissionChiefPlayerPairing'
);
assert.match(
  createPlayerBody,
  /findActivePlayerByDisplayName_\(\s*players,\s*displayName\s*\)/
);
assert.match(createPlayerBody, /Create another device pairing/);

const helperStart = backend.indexOf(
  'function findActivePlayerByDisplayName_('
);
assert.notEqual(helperStart, -1);
const helperBody = backend.slice(helperStart);
assert.match(helperBody, /toLowerCase\(\)/);
assert.match(helperBody, /ACTIVE/);

assert.match(
  backend,
  /buildId: '1\.1\.6-private-profile-1'/
);

console.log(
  'Logger dashboard rebuild safety and duplicate-player guard verified.'
);
