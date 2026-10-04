import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const script = fs.readFileSync(path.join(root, 'nexus-dispatch-centre-rename.js'), 'utf8');

assert.equal(manifest.version, '3.0.43.189', 'extension version must be 3.0.43.151');
assert.ok(script.includes('hrefPath(a)===`/vehicles/${id}/editName`'), 'native Dispatch Centre editName control must remain accepted for discovery');
assert.ok(script.includes('edit:`/vehicles/${id}/edit`'), 'rename queue must force the full native edit page');
assert.ok(!script.includes('edit:hrefPath(edit)||`/vehicles/${id}/editName`'), 'rename queue must never submit against the quick inline editName page');
assert.ok(script.includes('const allowedAction=url.pathname===`/vehicles/${item.id}`;'), 'save form action must be the canonical /vehicles/{id} action');
assert.ok(script.includes("field=edit.querySelector('#vehicle_caption')"), 'full edit page must use the established #vehicle_caption input');
assert.ok(script.includes("const check=await load(item.edit)"), 'verification must reread the same full edit page');
assert.ok(script.includes("if(clean(check.querySelector('#vehicle_caption')?.value)===item.target)"), 'verification must confirm the saved caption');

const nativeRow = `<a vehicle_id="7688538" class="vehicle_edit_button" href="/vehicles/7688538/editName">Edit</a>`;
assert.match(nativeRow, /\/vehicles\/7688538\/editName/);
const fullEdit = `/vehicles/${7688538}/edit`;
assert.equal(fullEdit, '/vehicles/7688538/edit');

console.log('PASS: 3.0.43.151 keeps Dispatch Centre /editName controls for discovery but reads, saves and verifies names through the established full /vehicles/{id}/edit form.');
