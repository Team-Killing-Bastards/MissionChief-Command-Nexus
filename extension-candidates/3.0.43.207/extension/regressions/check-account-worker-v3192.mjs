import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=await readFile(new URL('../nexus-account-worker.mjs',import.meta.url),'utf8');
let listener,stored={},requests=[],duringFetch,loginOptions;
const runtime={id:'a'.repeat(32),getURL:f=>'chrome-extension://'+'a'.repeat(32)+'/'+f,onMessage:{addListener:fn=>listener=fn}};
const sandbox={URL,URLSearchParams,AbortSignal,TextEncoder,TextDecoder,Uint8Array,crypto:webcrypto,btoa,console,
 chrome:{runtime,storage:{local:{get:async keys=>{if(typeof keys==='string')return {[keys]:stored[keys]};return Object.fromEntries(keys.map(k=>[k,stored[k]]));},set:async v=>Object.assign(stored,structuredClone(v)),remove:async k=>delete stored[k]}},tabs:{create:async()=>{}},identity:{getRedirectURL:p=>'https://'+'a'.repeat(32)+'.chromiumapp.org/'+p,launchWebAuthFlow:async o=>{loginOptions=o;return 'https://'+'a'.repeat(32)+'.chromiumapp.org/discord#code=handoff';}}},
 fetch:async(url,options)=>{requests.push({url,options});await duringFetch?.();return new Response(JSON.stringify(url.endsWith('exchange')?{token:'T'.repeat(48),discordId:'123',username:'Test',expires:Date.now()/1000+3600}:{discordId:'123',cursor:0,rows:[]}));}
};
vm.runInNewContext(source.replace("import {COLLECTOR_URL} from './collector-core.mjs';","const COLLECTOR_URL='https://nexus.blyth.scot';"),sandbox);
const game={id:runtime.id,url:'https://www.missionchief.co.uk/',frameId:0,tab:{id:1}},admin={id:runtime.id,url:runtime.getURL('account.html')};
const send=(type,sender=game,extra={})=>new Promise(resolve=>listener({type:'NEXUS_ACCOUNT_'+type,...extra},sender,resolve));
assert.equal((await send('LOGIN')).ok,false);
assert.equal((await send('LOGIN',admin)).ok,true);
assert.equal(new URL(loginOptions.url).searchParams.get('challenge').length,43);
assert(!JSON.stringify(loginOptions).includes(stored.nexusDiscordAccountV1.token));
const status=await send('STATUS');assert(status.signedIn);assert(!('token' in status));assert.equal(status.redirect,undefined);
assert.equal((await send('STATUS',{...game,id:'evil'})).ok,false);
assert.equal((await send('SYNC',game,{body:{realm:'police.missionchief.co.uk',player:'1',rows:[]}})).ok,false);
assert.equal((await send('PREFS_SET',game,{key:'token',value:'oops'})).ok,false);
assert.equal((await send('SYNC',game,{body:{realm:'www.missionchief.co.uk',player:'1',cursor:0,rows:[]}})).ok,true);
assert.equal(requests.at(-1).options.headers.Authorization,'Bearer '+'T'.repeat(48));
duringFetch=async()=>delete stored.nexusDiscordAccountV1;
assert.equal((await send('SYNC',game,{body:{realm:'www.missionchief.co.uk',player:'1',cursor:0,rows:[]}})).ok,false);
assert.equal(stored.nexusDiscordAccountV1,undefined);
console.log('PASS: account-only OAuth, verifier challenge, sanitized status, sender and realm rejection, protected preference keys, authenticated sync and logout during request.');

duringFetch=null;await send('LOGIN',admin);assert.equal((await send('LOGOUT',{...game,id:'evil'})).ok,false);assert((await send('STATUS')).signedIn);assert.equal((await send('LOGOUT',game)).ok,true);assert.equal((await send('STATUS')).signedIn,false);console.log('PASS: trusted Tools sign-out revokes session; foreign sender cannot sign out.');
