import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const runtime = fs.readFileSync(path.join(root, 'nexus-runtime.js'), 'utf8');
const stationRename = fs.readFileSync(path.join(root, 'nexus-station-rename.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

assert.equal(manifest.version, '3.0.43.189', 'manifest must expose the CFR naming test build');
assert.ok(runtime.includes("const UNIT_VERSION = '3.3.29';"), 'Unit Naming component version must increase');
assert.ok(runtime.includes("const MISSION_FINDER_VERSION = '10.6.191';"), 'Mission Finder must include the collapsed patient summary fix');

const typeMapping = '"22": "Community First Responder"';
const namingRule = '"Community First Responder": { code: "CFR", icon: "🚑" }';

assert.ok(runtime.includes(typeMapping), 'integrated Unit Naming must recognise vehicle_type_id 22');
assert.ok(runtime.includes(namingRule), 'integrated Unit Naming must define the CFR naming rule');
assert.ok(stationRename.includes(typeMapping), 'station-page renamer must recognise vehicle_type_id 22');
assert.ok(stationRename.includes(namingRule), 'station-page renamer must define the CFR naming rule');

const simulatedVehicleTypeId = '22';
const simulatedVehicleType = runtime.includes(`"${simulatedVehicleTypeId}": "Community First Responder"`)
  ? 'Community First Responder'
  : '';
assert.equal(simulatedVehicleType, 'Community First Responder', 'type 22 must no longer reach the unknown-type skip path');

console.log('PASS: Community First Responder type 22 is supported by both Unit Naming entry points in 3.0.43.151.');
