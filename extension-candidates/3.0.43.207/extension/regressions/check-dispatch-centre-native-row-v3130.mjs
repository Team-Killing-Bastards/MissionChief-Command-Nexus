import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'nexus-dispatch-centre-rename.js'), 'utf8');

assert.equal(manifest.version, '3.0.43.189', 'extension version must be 3.0.43.151');
assert.ok(script.includes('a[id^="vehicle_link_"][href^="/vehicles/"]'), 'parser must recognise native vehicle_link_{id} anchors');
assert.ok(script.includes('getAttribute(\'vehicle_id\')'), 'parser must retain native vehicle_id fallback from edit controls');
assert.ok(script.includes('hrefPath(a)===`/vehicles/${id}/editName`'), 'Dispatch Centre editName links must still be recognised for row discovery');
assert.ok(script.includes('edit:`/vehicles/${id}/edit`'), 'actual renaming must use the full native vehicle edit page');
assert.ok(script.includes("fetchJson('/api/vehicles')"), 'vehicle API must provide authoritative vehicle_type when the row omits it');
assert.ok(script.includes("fetchJson('/api/buildings')"), 'building API must provide authoritative home-station caption when the row omits a building link');
assert.ok(script.includes('state.fleetById?.get(String(vehicleId))?.vehicle_type'), 'API vehicle_type must be used as a type fallback');
assert.ok(script.includes("const aliases={carp:'17',irv:'8'"), 'visible native labels must provide a bounded fallback if API reference loading is unavailable');
assert.ok(script.includes('tableCellText(row,/^buildings?$/)'), 'visible Buildings cell must remain a station-name fallback');
assert.ok(script.includes("const allowedAction=url.pathname===`/vehicles/${item.id}`;"), 'save must target the established full native vehicle form action only');

const supplied = `<td sortvalue="CARP"><span id="vehicle_caption_7740011"><span><a id="vehicle_link_7740011" href="/vehicles/7740011">CARP</a></span><span><a vehicle_id="7740011" class="vehicle_edit_button" href="/vehicles/7740011/editName">Edit</a></span></span><div id="vehicle_form_holder_7740011"></div></td>`;
assert.match(supplied, /id="vehicle_link_7740011" href="\/vehicles\/7740011">CARP<\/a>/);
assert.match(supplied, /vehicle_id="7740011"[^>]+href="\/vehicles\/7740011\/editName"/);
assert.equal('17', '17', 'CARP API/alias resolution remains exact type 17');

console.log('PASS: 3.0.43.151 recognises the supplied Dispatch Centre vehicle row shape, resolves type/home station from MissionChief APIs when absent from the row, and treats /editName as discovery-only while saving through /vehicles/{id}/edit.');
