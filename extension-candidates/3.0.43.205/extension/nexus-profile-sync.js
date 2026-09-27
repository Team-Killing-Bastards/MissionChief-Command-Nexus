/* Background account sync; never part of the dispatch decision path. */
(() => {
 'use strict';if(window!==window.top||location.pathname!=='/')return;
 let id=0,busy=false,settingsChanged=false,lastMessage='Personnel register: loading local database…';const pending=new Map(),store=window.NexusPersonnelStore;
 function call(action,extra={}){const key=String(++id);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(key);reject(Error('Nexus sync timed out; local records are safe'));},25000);pending.set(key,{resolve,reject,timer});window.dispatchEvent(new CustomEvent('nexus:account-request',{detail:JSON.stringify({id:key,action,...extra})}));});}
 window.addEventListener('nexus:account-response',e=>{let m;try{m=JSON.parse(e.detail);}catch{return;}const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.result?.ok?p.resolve(m.result):p.reject(Error(m.result?.error||'Nexus sync failed'));});
 const localKeys=()=>[...new Set([...(window.NexusSettings?.runtime||[]).map(s=>s.key),'nexusConveniencesV1','nexusManualTransportShortcutsV1','nexusAllianceSupportVehicleV1','nexusAllianceValueSort','nexusRealismToggleTypesV2','nexusDispatchCentreVehicleRenamerV1','nexusToolsPanelSizeV1','nexusRealismFloatingPanelPositionV1','mf_panel_left_v10_4_0','mf_panel_top_v10_4_0','mcPersonnelProfile_v410','mcPersonnelService_v410','mcPersonnelUnitsRequired_v423'])];
 const allowed=key=>key==='profile:station'||key==='profile:staging'||key==='extension:tools'||key==='extension:rules'||(key.startsWith('local:')&&localKeys().includes(key.slice(6)));
 const safelyIdle=()=>!window.__NEXUS_AUTO_DISPATCH_BUSY__?.()&&!window.__NEXUS_ALLIANCE_SUPPORT__?.busy&&!window.__NEXUS_PROFILE_BUSY__&&!window.__NEXUS_PERSONNEL_OPERATION_BUSY__?.();
 async function profileDb(key,value,write=false){
  const d=await new Promise((resolve,reject)=>{const r=indexedDB.open('nexus-building-profiles',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  try{return await new Promise((resolve,reject)=>{const t=d.transaction('records',write?'readwrite':'readonly'),s=t.objectStore('records'),r=write?s.put(value,key):s.get(key);t.oncomplete=()=>resolve(write?value:r.result);t.onabort=()=>reject(t.error);});}finally{d.close();}
 }
 async function readValues(){
  const player=store.player,values={};for(const key of localKeys())values['local:'+key]=localStorage.getItem(key);
  for(const [name,prefix]of [['station','nexusStationProfilesV1:'],['staging','nexusStagingProfilesV1:']]){const value=await profileDb(prefix+player);values['profile:'+name]=value||null;}
  const ext=await call('PREFS_GET');for(const k of ['tools','rules'])values['extension:'+k]=ext.values[k]??null;
  if(store.player!==player)throw Error('Player changed during settings capture');
  return values;
 }
 async function capture(){
  const values=await readValues();
  return store.settings(meta=>{
   for(const [key,value]of Object.entries(values)){
    const encoded=JSON.stringify(value);if(encoded.length>1000000)continue;
    const old=meta[key];if(old?.apply){
     if(JSON.stringify(old.localValue??null)!==encoded)meta[key]={value,at:Math.max(Date.now(),old.at+1),pending:true};
     continue;
    }
    if(!old)meta[key]={value,at:0,pending:value!==null};
    else if(JSON.stringify(old.value)!==encoded)meta[key]={value,at:Math.max(Date.now(),old.at+1),pending:true};
   }
   return Object.entries(meta).filter(([key,r])=>allowed(key)&&r.pending).slice(0,100).map(([key,r])=>({kind:'setting',id:key,at:r.at,deleted:r.value===null,data:r.value}));
  });
 }
 async function applySettings(){
  if(!safelyIdle())return;
  const player=store.player;
  const changes=await store.settings(meta=>Object.entries(meta).filter(([key,r])=>allowed(key)&&r.apply));
  for(const [key,row]of changes){
   if(store.player!==player)throw Error('Player changed; settings restore stopped');
   if(!safelyIdle())break;
   const value=row.value;if(JSON.stringify(value).length>1000000)throw Error('Downloaded settings exceeded the limit');
   if(key.startsWith('local:')){
    const name=key.slice(6),spec=window.NexusSettings?.runtime.find(s=>s.key===name);
    if(value!==null&&typeof value!=='string')throw Error('Downloaded preference is invalid');
    if(spec&&value!==null){if(typeof spec.fallback==='boolean'?!['true','false'].includes(value):!Number.isInteger(Number(value))||Number(value)<spec.min||Number(value)>spec.max)throw Error('Downloaded preference is outside its allowed range');}
    if(value===null)localStorage.removeItem(name);else localStorage.setItem(name,value);
   }else if(key.startsWith('profile:')){
    if(value!==null&&(value.schema!==1||!Array.isArray(value.profiles)||value.profiles.length>100))throw Error('Downloaded profiles are invalid');
    await profileDb((key==='profile:station'?'nexusStationProfilesV1:':'nexusStagingProfilesV1:')+player,value||{schema:1,profiles:[]},true);
   }else await call('PREFS_SET',{key:key.slice(10),value});
   if(store.player!==player)throw Error('Player changed; settings restore stopped');
   await store.settings(meta=>{if(meta[key]?.at===row.at&&JSON.stringify(meta[key].value)===JSON.stringify(value))meta[key].apply=false;});settingsChanged=true;
  }
 }
 function show(text){lastMessage=text;window.dispatchEvent(new CustomEvent('nexus:profile-sync-status',{detail:JSON.stringify({message:lastMessage,busy})}));}
 // Explicit settings choices use a separate read cursor and never apply vehicle rows.
 async function chooseSettings(mode){
  if(busy||!['device','cloud'].includes(mode))return;
  busy=true;show(mode==='device'?'Preparing device settings…':'Reading saved cloud settings…');
  try{
   if(!safelyIdle())throw Error('Stop Auto Mode and other Nexus operations before choosing settings');
   await store.ready();const account=await call('STATUS');
   if(!account.signedIn||!account.enabled)throw Error('Sign in and enable sync before choosing settings');
   const player=store.player;await store.resetSync(account.discordId);
   const baseline=await readValues(),baselineText=JSON.stringify(baseline);
   async function guard(){
    const current=await call('STATUS');
    if(!current.signedIn||!current.enabled||current.discordId!==account.discordId||store.player!==player)throw Error('Account changed; settings choice stopped');
    if(!safelyIdle())throw Error('Nexus started working; settings choice stopped');
   }
   const remote=new Map();let cursor=0,complete=false,total=0;
   for(let page=0;page<650;page++){
    await guard();show('Reading saved cloud settings · page '+(page+1));
    const response=(await call('SYNC',{body:{player,realm:location.hostname,cursor,rows:[]}})).data;
    await guard();
    if(!Array.isArray(response.rows)||response.rows.length>100||!Number.isSafeInteger(response.cursor)||response.cursor<cursor||response.discordId!==account.discordId||(response.more&&response.cursor===cursor))throw Error('Nexus settings response was invalid');
    for(const row of response.rows){
     if(row.kind!=='setting'||!allowed(row.id))continue;
     if(!Number.isSafeInteger(row.at)||row.at<0||typeof row.deleted!=='boolean')throw Error('Saved cloud setting is invalid');
     const bytes=JSON.stringify(row).length;total+=bytes;if(bytes>1001000||total>12000000)throw Error('Saved cloud settings exceed the safe restore size');
     remote.set(row.id,row);
    }
    cursor=response.cursor;if(!response.more){complete=true;break;}
    await new Promise(resolve=>setTimeout(resolve,50));
   }
   if(!complete)throw Error('Cloud settings read did not finish; try again later');
   await guard();
   if(JSON.stringify(await readValues())!==baselineText)throw Error('Device settings changed during the request; choose again to use the latest settings');
   if(mode==='cloud'){
    if(!remote.size){show('No saved cloud settings for this player yet. Device settings retained.');return;}
    // Validate the entire local/profile portion before staging any changes.
    for(const [key,row]of remote){
     const value=row.deleted?null:row.data;
     if(JSON.stringify(value).length>1000000)throw Error('Downloaded settings exceeded the limit');
     if(key.startsWith('local:')){
      const spec=window.NexusSettings?.runtime.find(s=>s.key===key.slice(6));
      if(value!==null&&typeof value!=='string')throw Error('Downloaded preference is invalid');
      if(spec&&value!==null&&(typeof spec.fallback==='boolean'?!['true','false'].includes(value):!Number.isInteger(Number(value))||Number(value)<spec.min||Number(value)>spec.max))throw Error('Downloaded preference is outside its allowed range');
     }else if(key.startsWith('profile:')&&value!==null&&(value.schema!==1||!Array.isArray(value.profiles)||value.profiles.length>100))throw Error('Downloaded profiles are invalid');
    }
    await store.settings(meta=>{for(const [key,row]of remote)meta[key]={value:row.deleted?null:row.data,at:row.at,pending:false,apply:true,localValue:baseline[key]??null};});
    await guard();await applySettings();
    const waiting=await store.settings(meta=>Object.entries(meta).some(([key,row])=>allowed(key)&&row.apply));
    show(waiting?'Cloud settings downloaded; remaining changes wait until Nexus is idle.':'Saved cloud settings applied · Reopen game pages to use them');
   }else{
    const rows=Object.entries(baseline).filter(([key])=>allowed(key)).map(([key,value])=>{
     if(JSON.stringify(value).length>1000000)throw Error('Device setting exceeds the supported size');
     return {kind:'setting',id:key,at:Math.max(Date.now(),(remote.get(key)?.at||0)+1),deleted:value===null,data:value};
    });
    for(let index=0;index<rows.length;){
     await guard();if(JSON.stringify(await readValues())!==baselineText)throw Error('Device settings changed; remaining settings were not sent. Choose again to save the latest settings');
     const batch=[];let bytes=0;
     while(index<rows.length&&batch.length<100){const next=new TextEncoder().encode(JSON.stringify(rows[index])).byteLength;if(next>1400000)throw Error('Device setting exceeds the upload size');if(batch.length&&bytes+next>1400000)break;bytes+=next;batch.push(rows[index++]);}
     show('Saving device settings to your account…');
     const reply=(await call('SYNC',{body:{player,realm:location.hostname,cursor,rows:batch}})).data;
     await guard();if(reply.discordId!==account.discordId)throw Error('Account changed; settings save stopped');
     // Record what was sent so a concurrent newer local edit is recognised next sync.
     await store.settings(meta=>{for(const row of batch)meta[row.id]={value:row.data,at:row.at,pending:false,apply:false};});
    }
    // Verify the saved values, including any concurrent writes from other browsers.
    const verified=new Map();let verifiedComplete=false;
    for(let page=0;page<650;page++){
     await guard();const response=(await call('SYNC',{body:{player,realm:location.hostname,cursor,rows:[]}})).data;
     await guard();
     if(!Array.isArray(response.rows)||response.rows.length>100||!Number.isSafeInteger(response.cursor)||response.cursor<cursor||response.discordId!==account.discordId||(response.more&&response.cursor===cursor))throw Error('Could not verify saved device settings');
     for(const row of response.rows)if(row.kind==='setting'&&allowed(row.id))verified.set(row.id,row);
     cursor=response.cursor;if(!response.more){verifiedComplete=true;break;}
    }
    if(!verifiedComplete||rows.some(sent=>{const saved=verified.get(sent.id);return !saved||saved.deleted!==sent.deleted||JSON.stringify(saved.deleted?null:saved.data)!==JSON.stringify(sent.data);}))throw Error('Cloud settings changed during saving; choose again to resolve the difference');
    show('Device settings kept and saved to your account · Personnel register unchanged');
   }
  }catch(error){show(error.message+' · Personnel register retained');}
  finally{busy=false;show(lastMessage);}
 }
 async function sync(manual=false){
  if(busy)return;busy=true;show('Preparing profile sync…');
  try{
   await store.ready();const account=await call('STATUS');if(!account.signedIn){show('Register saved locally · Sign in to sync');return;}if(!account.enabled){show('Cloud sync paused · Local register ready');return;}
   const player=store.player;await store.resetSync(account.discordId);show('Syncing register and settings…');
   for(let page=0;page<650;page++){
    if(store.player!==player)throw Error('Player changed; sync stopped');
    const local=await store.syncState(),prefs=await capture(),rows=[];let bytes=0;
    for(const row of [...local.rows,...prefs]){const size=new TextEncoder().encode(JSON.stringify(row)).byteLength;if(rows.length>=100||bytes+size>1500000)break;rows.push(row);bytes+=size;}
    const response=(await call('SYNC',{body:{player:local.player,realm:local.realm,cursor:local.cursor,rows}})).data;
    const accountNow=await call('STATUS');if(!accountNow.signedIn||!accountNow.enabled||accountNow.discordId!==account.discordId||store.player!==player)throw Error('Account changed; sync stopped');
    if(!Array.isArray(response.rows)||response.rows.length>100||!Number.isSafeInteger(response.cursor)||response.cursor<0||response.discordId!==account.discordId)throw Error('Nexus sync response was invalid');
    // Capture edits made while the network request was in flight before merging.
    await capture();
    if(store.player!==player)throw Error('Player changed; sync stopped');
    // Commit downloaded settings before advancing the shared server cursor.
    await store.settings(meta=>{
     for(const sent of rows.filter(r=>r.kind==='setting'))if(meta[sent.id]?.at===sent.at&&JSON.stringify(meta[sent.id].value)===JSON.stringify(sent.data))meta[sent.id].pending=false;
     for(const row of response.rows.filter(r=>r.kind==='setting'))if(allowed(row.id)){
      const previous=meta[row.id];if(previous&&(previous.at>row.at||(previous.pending&&previous.at===row.at&&row.at!==0)))continue;
      const value=row.deleted?null:row.data,changed=!previous||JSON.stringify(previous.value)!==JSON.stringify(value);
      meta[row.id]={value,at:row.at,pending:false,apply:changed||previous?.apply===true,localValue:previous?.apply?previous.localValue:(previous?.value??null)};
     }
    });
    await store.applySync(response,rows.filter(r=>r.kind!=='setting'));
    await applySettings();
    const moreLocal=(await store.syncState()).rows.length||(await capture()).length;
    if(!response.more&&!moreLocal){show('Synced '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+(settingsChanged?' · Reopen game pages for restored settings':''));return;}
    await new Promise(resolve=>setTimeout(resolve,250));
   }
   show('Sync paused after a large batch; remaining records will resume next cycle');
  }catch(error){show(error.message+' · Local register retained');}finally{busy=false;show(lastMessage);}
 }
 window.addEventListener('nexus:profile-sync-now',()=>void sync(true));
 window.addEventListener('nexus:profile-settings-choice',event=>void chooseSettings(event.detail));
 window.addEventListener('nexus:profile-sync-status-request',()=>show(lastMessage));
 void store.ready().then(()=>show('Local register ready.')).catch(e=>show(e.message));
 const initial=setTimeout(()=>void sync(),15000);
 const periodic=setInterval(()=>void sync(),600000);
 window.addEventListener('pagehide',()=>{clearTimeout(initial);clearInterval(periodic);for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Game page closed'));}pending.clear();},{once:true});
 window.__NEXUS_PROFILE_SYNC__={sync,chooseSettings};
})();
