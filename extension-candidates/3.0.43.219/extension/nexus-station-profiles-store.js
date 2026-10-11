/* Profiles use IndexedDB, independently of the game's small localStorage allowance. */
(()=>{'use strict';
 let opening;
 function db(){if(!opening)opening=new Promise((resolve,reject)=>{const r=indexedDB.open('nexus-building-profiles',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null;};resolve(r.result);};r.onerror=()=>{opening=null;reject(Error('Profile storage could not open. Check browser site-storage permissions.'));};});return opening;}
 async function get(key){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction('records','readonly'),r=t.objectStore('records').get(key);t.oncomplete=()=>resolve(r.result);t.onabort=t.onerror=()=>reject(Error('Profile storage could not be read.'));});}
 async function update(key,change){const d=await db();return new Promise((resolve,reject)=>{let value,error;const t=d.transaction('records','readwrite'),s=t.objectStore('records'),r=s.get(key);r.onsuccess=()=>{try{value=change(r.result);if(value===undefined)s.delete(key);else s.put(value,key);}catch(e){error=e;t.abort();}};t.oncomplete=()=>resolve(value);t.onabort=t.onerror=()=>reject(error||Error('Profile save failed. Your editor entries are still here; check available browser storage and try again.'));});}
 function legacy(key){const raw=localStorage.getItem(key);if(!raw)return null;try{return JSON.parse(raw);}catch{throw Error('Older saved profile data could not be read. It has been left untouched.');}}
 function validate(value){if(value.schema!==1||!Array.isArray(value.profiles))throw Error('Saved profile format could not be read.');return value;}
 async function read(key){let value=await get(key);if(!value){const old=legacy(key);value=await update(key,current=>current||validate(old||{schema:1,profiles:[]}));}return validate(value).profiles;}
 async function save(key,profile){await read(key);await update(key,value=>{const list=validate(value).profiles,index=list.findIndex(p=>p.id===profile.id);if(index<0)list.push(profile);else list[index]=profile;if(list.length>100)throw Error('Maximum 100 saved profiles.');return {schema:1,profiles:list};});return profile;}
 async function pending(key){return await get(key)||legacy(key);}
 async function checkpoint(key,value){await update(key,()=>value||undefined);if(!value)localStorage.removeItem(key);}
 globalThis.NexusStationProfilesStore={read,save,pending,checkpoint};
})();
