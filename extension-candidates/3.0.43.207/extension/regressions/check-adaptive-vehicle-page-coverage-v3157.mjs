import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const runtime = fs.readFileSync(path.join(root, 'nexus-runtime.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

assert.equal(manifest.version, '3.0.43.191');
assert.match(runtime, /const MISSION_FINDER_VERSION = '10\.6\.191';/);
assert.match(runtime, /function nexusMakeSelectiveProbe\(requirementPromise, options = \{\}\)/);
assert.match(runtime, /getAllMatchingVehicleCheckboxes\(name, mapped, false\)\.filter/,
  'adaptive coverage must use the normal Unit Finder vehicle matcher');
assert.doesNotMatch(runtime, /specialist custom rule/,
  'specialist rules must no longer be automatically excluded from the adaptive coverage test');
assert.match(runtime, /sourceLabel: 'current live shortages'/,
  'explicit current shortages must be eligible for adaptive loading');
assert.match(runtime, /allowCurrentAuthority: true/);
assert.match(runtime, /applyFreshConfiguredRules: false/);
assert.match(runtime, /sourceLabel: 'fresh mission requirements'/,
  'fresh mission-definition requirements must retain adaptive loading');
assert.match(runtime, /canStopEarly: autoSelectiveProbe/,
  'Auto Mode must pass the adaptive probe into the sequential page loader');
assert.match(runtime, /patient requirement requires full search/,
  'patient requirements must remain on the complete-list path');
assert.match(runtime, /trained\/personnel requirement requires full search/,
  'trained/personnel requirements must remain on the complete-list path');
assert.match(runtime, /allowRemainingControl:true/,
  'early-stop stability must allow MissionChief to retain a remaining Load More control');
assert.match(runtime, /if \(nexusUsedPartialList && !vehicleLoadState\.ready &&/,
  'partial selection must retain the full-list retry gate');
assert.match(runtime, /Full-list selection fallback/,
  'partial selection failure must still rerun Unit Finder after complete loading');
assert.match(runtime, /Adaptive vehicle loading stopped early:/,
  'live status must expose an early-stop result for testing');
assert.match(runtime, /Adaptive vehicle check:/,
  'live status must expose the reason for loading the next page');

console.log('PASS: 3.0.43.189 adaptively checks vehicle coverage page-by-page in Auto Mode while preserving patient/trained full-load safety and full-list retry before dispatch.');
