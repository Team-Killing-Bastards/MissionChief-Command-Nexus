import assert from 'node:assert/strict';
import { createToolStorageHandler, cleanToolPreferences } from '../extension/nexus-tools-storage.mjs';
const key = 'nexusNativeToolsV1:www.missionchief.co.uk';
const stored = { nexusAnalyticsV1: { private: 'queue' }, nexusDevice: 'private-device' };
const api = { runtime: { id: 'our-extension' }, storage: { local: {
  get: async keys => Object.fromEntries(keys.map(k => [k, stored[k]])),
  set: async values => Object.assign(stored, values)
} } };
const handler = createToolStorageHandler(api);
const sender = { id: 'our-extension', tab: { id: 1 }, frameId: 0, url: 'https://www.missionchief.co.uk/' };
const send = (message, source = sender) => new Promise((resolve, reject) => { if (handler(message, source, resolve) !== true) reject(Error('Rejected')); });
for (const invalid of [{ ...sender, id: 'other-extension' }, { ...sender, frameId: 1 }, { ...sender, tab: undefined }, { ...sender, url: 'https://evil.test/' }, { ...sender, url: 'http://www.missionchief.co.uk/' }]) {
  await assert.rejects(send({ type: 'NEXUS_TOOLS_GET' }, invalid), /Rejected/);
}
assert.equal(handler({ type: 'NEXUS_ANALYTICS_STATUS' }, sender, () => { throw Error('Unexpected reply'); }), false);
console.log('PASS native storage rejects foreign extensions, frames, origins and unrelated messages');
const result = await send({ type: 'NEXUS_TOOLS_GET', key: 'nexusAnalyticsV1' });
assert.deepEqual(result, { ok: true, data: null, legacy: [] });
const data = { showClock: true, mapLinks: true, device: 'overwrite', nexusAnalyticsV1: 'overwrite',
  groups: [{ name: 'Fire', types: [0, 1, 'evil', -1, null] }],
  favourites: [{ href: '/buildings/1', label: 'A' }, { href: '/buildings/1', label: 'Duplicate' }, { href: 'https://evil.test/', label: 'Bad' }, { href: '/vehicles/2/delete', label: 'Bad' }] };
assert.deepEqual(await send({ type: 'NEXUS_TOOLS_SAVE', key: 'nexusAnalyticsV1', data }), { ok: true });
assert.equal(stored.nexusDevice, 'private-device'); assert.deepEqual(stored.nexusAnalyticsV1, { private: 'queue' });
assert.deepEqual(stored[key].groups, [{ name: 'Fire', types: [0, 1] }]); assert.equal(stored[key].favourites.length, 1);
assert.deepEqual(Object.keys(stored[key]).sort(), ['favourites', 'groups', 'mapLinks', 'showClock']);
console.log('PASS caller cannot read/write telemetry, choose storage keys or persist unbounded/unsafe records');
const police = { ...sender, url: 'https://police.missionchief.co.uk/' };
assert.equal((await send({ type: 'NEXUS_TOOLS_GET' }, police)).data, null);
assert.deepEqual(await send({ type: 'NEXUS_TOOLS_SAVE', data: { oversized: 'x'.repeat(50001) } }), { ok: false });
assert.equal(cleanToolPreferences(null), null);
assert.equal(cleanToolPreferences({ groups: Array.from({ length: 100 }, () => ({ name: 'A', types: [1] })) }).groups.length, 12);
console.log('PASS hostname separation, preference validation and payload bounds');
const broken = createToolStorageHandler({ ...api, storage: { local: { get: async () => { throw Error('Unavailable'); } } } });
assert.deepEqual(await new Promise(resolve => broken({ type: 'NEXUS_TOOLS_GET' }, sender, resolve)), { ok: false });
console.log('PASS storage failure returns a safe error');
let opened=0;api.runtime.openOptionsPage=async()=>{opened++;};
assert.deepEqual(await send({type:'NEXUS_TOOLS_OPEN_OPTIONS'}),{ok:true});assert.equal(opened,1);
await assert.rejects(send({type:'NEXUS_TOOLS_OPEN_OPTIONS'},{...sender,frameId:1}),/Rejected/);
await assert.rejects(send({type:'NEXUS_TOOLS_OPEN_OPTIONS'},{...sender,url:'https://evil.test/'}),/Rejected/);
assert.equal(opened,1);console.log('PASS options shortcut opens only for an authorized top-level game content script');
