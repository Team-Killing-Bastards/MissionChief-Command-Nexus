/* Account-scoped local personnel database. All acknowledgements follow IDB commit. */
(() => {
 'use strict';
 if(window!==window.top){
  Object.defineProperty(window,'NexusPersonnelStore',{configurable:true,get:()=>window.top.NexusPersonnelStore});return;
 }
 if(window.NexusPersonnelStore)return;
 const legacyKey='mcPersonnelVehicleTrainingRegistry_v1', empty=()=>({schemaVersion:1,updatedAt:0,vehicles:{}});
 const who=()=>document.querySelector('#navbar_profile_link')?.getAttribute('href')?.match(/\/profile\/(\d+)/)?.[1]||'';
 let database,opening,profile='',loading,loaded=false,cache=empty(),raw=null,chain=Promise.resolve(),channel;
 const serial=fn=>{const p=chain.then(fn);chain=p.catch(()=>{});return p;};
 const scope=()=>{const player=who();if(!player)throw Error('Open MissionChief and sign in before loading the personnel register');return location.origin+':'+player;};
 const assertScope=p=>{if(scope()!==p)throw Error('Player changed; reopen the personnel register');};
 async function db(){
  if(database)return database;
  if(!opening)opening=new Promise((resolve,reject)=>{
   const r=indexedDB.open('nexus-personnel-register-v2',1);
   r.onupgradeneeded=()=>{const d=r.result,s=d.createObjectStore('vehicles',{keyPath:['profile','id']});s.createIndex('profile','profile');d.createObjectStore('meta');};
   r.onerror=r.onblocked=()=>reject(Error('Personnel database unavailable; close older game tabs and retry'));
   r.onsuccess=()=>{database=r.result;database.onversionchange=()=>{database.close();database=null;opening=null;loaded=false;};resolve(database);};
  }).catch(e=>{opening=null;throw e;});return opening;
 }
 async function transaction(p,change){
  const d=await db();assertScope(p);
  return new Promise((resolve,reject)=>{
   const t=d.transaction(['vehicles','meta'],'readwrite'),s=t.objectStore('vehicles'),m=t.objectStore('meta');let rows,meta,failure,result;
   const a=s.index('profile').getAll(p),b=m.get(p);
   const run=()=>{if(!rows||!meta)return;try{assertScope(p);result=change(s,m,rows,meta);m.put(meta,p);}catch(e){failure=e;t.abort();}};
   a.onsuccess=()=>{rows=a.result;run();};b.onsuccess=()=>{meta=b.result||{cursor:0};run();};
   t.oncomplete=()=>resolve(result);t.onabort=()=>reject(failure||Error('Personnel database save failed; existing records were kept'));t.onerror=()=>{};
  });
 }
 function notify(){
  raw=null;window.dispatchEvent(new StorageEvent('storage',{key:legacyKey}));
  window.dispatchEvent(new CustomEvent('nexus:personnel-store-updated',{detail:{player:who(),count:Object.keys(cache.vehicles).length}}));
 }
 async function reload(p){
  const d=await db();const result=await new Promise((resolve,reject)=>{const t=d.transaction('vehicles'),r=t.objectStore('vehicles').index('profile').getAll(p);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  assertScope(p);cache=empty();for(const row of result){cache.updatedAt=Math.max(cache.updatedAt,row.at);if(!row.deleted)cache.vehicles[row.id]=row.data;}
  loaded=true;notify();
 }
 function validate(reg){
  if(reg?.schemaVersion!==1||!reg.vehicles||typeof reg.vehicles!=='object'||Array.isArray(reg.vehicles)||Object.keys(reg.vehicles).length>30000)throw Error('Personnel register format not recognised');
  for(const [id,row]of Object.entries(reg.vehicles))if(!/^\d{1,18}$/.test(id)||!row||String(row.vehicleId)!==id||!Number.isFinite(row.updatedAt)||JSON.stringify(row).length>32000)throw Error('Invalid personnel vehicle record');
 }
 async function metaRead(p,key){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('meta'),r=t.objectStore('meta').get(key||p);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async function init(){
  const p=scope();if(p===profile&&loaded)return;
  if(p===profile&&loading)return loading;
  profile=p;loaded=false;cache=empty();raw=null;
  loading=serial(async()=>{
   const existingMeta=await metaRead(p);
   const liveLegacy=window.__NEXUS_REGISTER_PACK__?.readLegacy?.();
   const old=existingMeta?.migrated?null:(liveLegacy||await metaRead(p,'legacy-backup'));
   let legacy=null,owned=null;
   if(old){legacy=JSON.parse(old);validate(legacy);
    const response=await fetch('/api/vehicles',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Could not verify vehicle ownership for register migration');
    const fleet=await response.json();if(!Array.isArray(fleet)||fleet.some(v=>!/^\d+$/.test(String(v.id))))throw Error('Vehicle ownership response was incomplete');
    owned=new Set(fleet.map(v=>String(v.id)));
   }
   await transaction(p,(s,m,rows,meta)=>{
    const existing=new Map(rows.map(r=>[r.id,r]));
    for(const [id,data]of Object.entries(legacy?.vehicles||{}))if(owned.has(id)&&(!existing.has(id)||existing.get(id).at<data.updatedAt))s.put({profile:p,id,at:data.updatedAt,data,deleted:false,pending:true});
    meta.migrated=true;
   });
   assertScope(p);
   // Archive the unscoped original in IDB first. This retains other accounts' legacy
   // entries without letting them become the current player's training evidence.
   if(old){const d=await db();await new Promise((resolve,reject)=>{const t=d.transaction('meta','readwrite');t.objectStore('meta').put(old,'legacy-backup');t.oncomplete=resolve;t.onabort=()=>reject(t.error);});
    if(liveLegacy)window.__NEXUS_REGISTER_PACK__.removeLegacyIfEqual(liveLegacy);
   }
   await reload(p);
  });
  const job=loading;try{await job;}finally{if(loading===job)loading=null;}
 }
 async function ready(){if(!who())await new Promise((resolve,reject)=>{let ticks=0;const timer=setInterval(()=>{if(who()){clearInterval(timer);resolve();}else if(++ticks>=60){clearInterval(timer);reject(Error('Sign in to MissionChief to load the personnel register'));}},250);});await init();}
 async function readyFor(expected){await ready();if(who()!==expected)throw Error('Player changed; operation stopped');}
 async function write(reg,{replace=false}={}){
  const expectedPlayer=who();
  validate(reg);const copy=JSON.parse(JSON.stringify(reg));await readyFor(expectedPlayer);const p=profile;
  return serial(async()=>{
   await transaction(p,(s,m,rows)=>{
    const old=new Map(rows.map(r=>[r.id,r]));
    for(const [id,data]of Object.entries(copy.vehicles)){
     const prev=old.get(id);if(prev&&prev.at>data.updatedAt)continue;
     if(prev&&!prev.deleted&&JSON.stringify(prev.data)===JSON.stringify(data))continue;
     if(prev?.deleted&&prev.at>=data.updatedAt)continue;
     s.put({profile:p,id,at:data.updatedAt,data,deleted:false,pending:true});
    }
    if(replace)for(const prev of rows)if(!copy.vehicles[prev.id]&&!prev.deleted)s.put({profile:p,id:prev.id,at:Date.now(),deleted:true,pending:true});
   });await reload(p);channel?.postMessage(p);return true;
  });
 }
 async function remove(ids){await readyFor(who());const p=profile;return serial(async()=>{await transaction(p,(s)=>{for(const id of ids)if(/^\d+$/.test(String(id)))s.put({profile:p,id:String(id),at:Date.now(),deleted:true,pending:true});});await reload(p);channel?.postMessage(p);});}
 async function syncState(){await readyFor(who());const p=profile;return serial(()=>transaction(p,(s,m,rows,meta)=>({player:who(),realm:location.hostname,cursor:meta.cursor||0,rows:rows.filter(r=>r.pending).slice(0,100).map(({id,at,data,deleted})=>({id,at,deleted,data:deleted?null:data}))})));}
 async function applySync(response,sent){await readyFor(who());const p=profile;return serial(async()=>{
  const changed=await transaction(p,(s,m,rows,meta)=>{
   let changed=false;
   const old=new Map(rows.map(r=>[r.id,r]));
   for(const ack of sent){const row=old.get(ack.id);if(row&&row.at===ack.at&&JSON.stringify(row.data??null)===JSON.stringify(ack.data??null)&&row.deleted===ack.deleted){row.pending=false;s.put(row);}}
   for(const incoming of response.rows||[]){if(incoming.kind==='setting')continue;
    if(!/^\d{1,18}$/.test(incoming.id)||!Number.isSafeInteger(incoming.at)||incoming.at<0||typeof incoming.deleted!=='boolean'||(!incoming.deleted&&incoming.data?.updatedAt!==incoming.at))throw Error('Invalid downloaded vehicle record');
    const prev=old.get(incoming.id);if(prev&&prev.at>incoming.at)continue;if(prev?.pending&&prev.at===incoming.at)continue;
    if(!incoming.deleted)validate({schemaVersion:1,vehicles:{[incoming.id]:incoming.data}});
    if(prev&&prev.at===incoming.at&&prev.deleted===incoming.deleted&&JSON.stringify(prev.data??null)===JSON.stringify(incoming.data??null))continue;
    s.put({profile:p,id:incoming.id,at:incoming.at,data:incoming.deleted?undefined:incoming.data,deleted:incoming.deleted,pending:false});
    changed=true;
   }
   meta.cursor=response.cursor;meta.lastSync=Date.now();
   return changed;
  });if(changed){await reload(p);channel?.postMessage(p);}
 });}
 async function resetSync(owner){await readyFor(who());const p=profile;return serial(async()=>{if((await metaRead(p))?.syncOwner===owner)return;return transaction(p,(s,m,rows,meta)=>{if(meta.syncOwner===owner)return;meta.syncOwner=owner;meta.cursor=0;meta.settings={};for(const row of rows){row.pending=true;s.put(row);}});});}
 async function settings(change){await readyFor(who());const p=profile;return serial(async()=>{
  const d=await db();assertScope(p);
  return new Promise((resolve,reject)=>{
   const t=d.transaction('meta','readwrite'),s=t.objectStore('meta'),r=s.get(p);let result,failure;
   r.onsuccess=()=>{try{assertScope(p);const meta=r.result||{cursor:0};meta.settings ||= {};result=change(meta.settings);s.put(meta,p);}catch(e){failure=e;t.abort();}};
   t.oncomplete=()=>resolve(result);t.onabort=()=>reject(failure||Error('Profile settings could not be saved'));
  });
 });}
 window.NexusPersonnelStore=Object.freeze({ready,write,remove,syncState,applySync,resetSync,settings,
  readRaw(){if(!loaded||scope()!==profile)throw Error('Personnel register is still loading');return raw??(raw=JSON.stringify(cache));},
  get loaded(){return loaded&&scope()===profile;},get player(){return who();}
 });
 try{channel=new BroadcastChannel('nexus-personnel-register-v2');channel.onmessage=e=>{if(loaded&&e.data===profile)void serial(()=>reload(profile)).catch(()=>{});};}catch{}
 void ready().catch(()=>{});
 window.addEventListener('pagehide',()=>channel?.close(),{once:true});
})();
