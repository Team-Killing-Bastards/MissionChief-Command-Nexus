import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const root=process.env.NEXUS_CANDIDATE_ROOT||fileURLToPath(new URL('./extension/',import.meta.url));let now=10000;const c=vm.createContext({location:{origin:'fixture'},Date:{now:()=>now},crypto:{randomUUID:()=> 'personal'},document:{addEventListener(){}},addEventListener(){}});vm.runInContext('window=globalThis;window.top=window;',c);
vm.runInContext(fs.readFileSync(root+'/nexus-vehicle-claims.js','utf8'),c);const api=c.NexusVehicleClaims;
assert(api.claim('1','alliance',1000));assert(!api.claim('1','personal'));assert(api.held('1','personal'));api.release('1','personal');assert(api.held('1','personal'));now+=1001;assert(!api.held('1','personal'));assert(api.claim('1','personal'));assert(!api.held('1','personal'));api.releaseOwner('personal');assert.equal(api.ids().length,0);
assert(!api.claim('frame','owner'));assert(!api.claim('2',{}));for(let i=1;i<=1000;i++)assert(api.claim(String(i),'alliance'));assert(!api.claim('1001','alliance'));assert.equal(api.ids('personal').length,1000);api.releaseOwner('alliance');assert.equal(api.ids().length,0);
console.log('PASS: vehicle claims reject other owners, expire, release safely, validate scalar IDs and remain bounded to 1,000 entries.');
