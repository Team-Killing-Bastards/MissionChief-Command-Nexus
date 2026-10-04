import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'nexus-dispatch-centre-rename.js'), 'utf8');

assert.equal(manifest.version, '3.0.43.189', 'extension version must be 3.0.43.151');
assert.ok(script.includes('function vehicleTypeIdFromRow(row'), 'Dispatch Centre renamer must have a shared vehicle-type parser');
assert.ok(script.includes("path.match(/^\\/fahrzeugfarbe\\/(\\d+)\\/?$/)"), 'Dispatch Centre parser must accept native /fahrzeugfarbe/{typeId} links');
assert.ok(script.includes("row.querySelector('[vehicle_type_id]')"), 'legacy vehicle_type_id markers must remain supported');
assert.ok(script.includes("row.querySelector('[data-vehicle-type-id]')"), 'data vehicle type markers must be supported');
assert.ok(script.includes('function hrefPath(link)'), 'native links must be normalised safely');
assert.ok(script.includes("u.origin===location.origin?u.pathname:''"), 'renamer must reject cross-origin link paths');
assert.ok(script.includes('vehicleTypeIdFromRow(row,id)'), 'row parsing must use the broader type parser');
assert.ok(script.includes('"17": "Combined Aerial Rescue Pump"'), 'CARP mapping must remain available');
assert.ok(script.includes('"Combined Aerial Rescue Pump": { code: "CARP"'), 'CARP naming code must remain available');
assert.ok(script.includes('"22": "Community First Responder"'), 'CFR mapping must remain available');

console.log('PASS: 3.0.43.151 retains /fahrzeugfarbe/{id} vehicle type support alongside newer Dispatch Centre parsing fallbacks.');
