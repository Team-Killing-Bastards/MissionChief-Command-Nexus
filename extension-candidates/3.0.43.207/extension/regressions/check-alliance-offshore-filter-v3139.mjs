import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const coreSource = fs.readFileSync(path.join(root, 'nexus-alliance-core.js'), 'utf8');
const supportSource = fs.readFileSync(path.join(root, 'nexus-alliance-support.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

assert.equal(manifest.version, '3.0.43.189');

assert.match(coreSource, /const missionTypeId = id\(entry\.getAttribute\('mission_type_id'\)/, 'alliance parser must read the native mission_type_id');
assert.match(coreSource, /item\.offshore=isOffshoreMission\(item\)/, 'parsed alliance missions must be tagged before the support table filters them');

const context = vm.createContext({ globalThis: {} });
vm.runInContext(coreSource, context);
const C = context.globalThis.NexusAllianceCore;
assert.ok(C, 'Alliance core must export NexusAllianceCore');

const oceanOnly = ['544','553','554','561','562','598','600','761','766','787'];
assert.deepEqual(Array.from(C.offshoreOnlyMissionTypeIds), oceanOnly, 'Ocean-only mission definition list must stay explicit and reviewable');
for (const id of oceanOnly) assert.equal(C.isOffshoreMissionType(id), true, `mission type ${id} must be excluded as Ocean-only`);

// These two current Ocean Rescue definitions explicitly allow Regular + Ocean vehicles,
// so they must remain available to the normal Nexus alliance support flow.
for (const id of ['599','743']) assert.equal(C.isOffshoreMissionType(id), false, `mixed Regular + Ocean mission ${id} must remain visible`);

assert.equal(C.isOffshoreMission({ missionTypeId: '999999', name: 'Future Offshore Rescue' }), false, 'unknown mission types must fail open rather than hide a mission by name alone');
assert.equal(C.isOffshoreMission({ missionTypeId: '599', name: 'EPIRB Activation (Marina)' }), false, 'Marina mixed mission must not be hidden');
assert.equal(C.isOffshoreMission({ missionTypeId: '743', name: 'High Risk Missing Person (Coastal)' }), false, 'Coastal mixed mission must not be hidden');

assert.match(supportSource, /filter\(item=>item\.credits!==0&&!item\.offshore\)/, 'Nexus alliance table must filter Ocean-only rows before rendering/select-all');
assert.match(supportSource, /if\(C\.isOffshoreMission\(item\)\)/, 'dispatch path must fail closed if an excluded mission somehow reaches support()');
assert.match(supportSource, /if\(C\.isOffshoreMission\(fresh\)\)throw Error\('This mission is restricted to Ocean vehicles/, 'fresh pre-dispatch recheck must block an Ocean-only mission');

console.log('PASS: 3.0.43.151 excludes Ocean-only/offshore missions from the Nexus alliance mission table while keeping Regular + Ocean missions available.');
