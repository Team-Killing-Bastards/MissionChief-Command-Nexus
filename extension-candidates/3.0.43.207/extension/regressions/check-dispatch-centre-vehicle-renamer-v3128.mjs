import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'nexus-dispatch-centre-rename.js'), 'utf8');
const overview = fs.readFileSync(path.join(root, 'nexus-building-overview.js'), 'utf8');
const stationRename = fs.readFileSync(path.join(root, 'nexus-station-rename.js'), 'utf8');

assert.equal(manifest.version, '3.0.43.189', 'extension version must be 3.0.43.151');
const mainScripts = manifest.content_scripts.flatMap(entry => entry.js || []);
assert.ok(mainScripts.includes('nexus-dispatch-centre-rename.js'), 'Dispatch Centre renamer must be loaded');
assert.ok(mainScripts.indexOf('nexus-dispatch-centre-rename.js') > mainScripts.indexOf('nexus-building-overview.js'), 'Dispatch Centre renamer must load after building overview support');

assert.ok(script.includes("return type==='7';"), 'feature must be scoped to MissionChief building type 7');
assert.ok(script.includes("document.getElementById('nx-expansions')?.remove()"), 'Dispatch Centre must remove Building extensions card');
assert.ok(script.includes("Nexus · Dispatch Centre Vehicle Renamer"), 'Dispatch Centre renamer card must be present');
assert.ok(script.includes("stationLink=links.find(a=>/^\\/buildings\\/\\d+"), 'renamer must read each vehicle home station from its row');
assert.ok(script.includes("Numbering runs separately for each vehicle type across the current rename scope."), 'Dispatch Centre per-type numbering scope must be explicit');

for (const token of ['{station}', '{stationFull}', '{stationPrefix}', '{unitPrefix}', '{number}', '{typeId}']) {
  assert.ok(script.includes(token), `template token ${token} must be supported/documented`);
}
for (const label of ['Emotes', 'Station Name', 'Station Prefix', 'Unit Prefix', 'Number', 'Preview changes', 'Rename vehicles']) {
  assert.ok(script.includes(label), `${label} control must exist`);
}
assert.ok(script.includes("confirm(`Rename ${plan.length}"), 'bulk rename must require confirmation');
assert.ok(script.includes("Native edit form changed"), 'renaming must use and validate the native vehicle edit form');
assert.ok(script.includes("Save not verified"), 'renaming must verify saved names');
assert.ok(script.includes("window.__NEXUS_DISPATCH_CENTRE_RENAMER__"), 'single-instance protection must be present');
assert.ok(script.includes("const STORAGE='nexusDispatchCentreVehicleRenamerV1'"), 'naming configuration must persist');
assert.ok(script.includes("const TYPES="), 'existing vehicle type mapping must be embedded');
assert.ok(script.includes('"22": "Community First Responder"'), 'CFR type 22 mapping must remain supported');
assert.ok(script.includes('"Community First Responder": { code: "CFR"'), 'CFR naming rule must remain CFR');

assert.ok(overview.includes("Nexus · Building extensions"), 'ordinary station Building extensions implementation must remain in baseline');
assert.ok(stationRename.includes("button.textContent='Rename vehicles'"), 'ordinary station quick renamer must remain intact');
assert.ok(script.includes("document.getElementById('nx-station-rename')"), 'Dispatch Centre must suppress the ordinary-station quick renamer only after type-7 detection');

console.log('PASS: 3.0.43.151 adds a Dispatch Centre-only configurable vehicle renamer while preserving ordinary station naming and building-extension behaviour.');
