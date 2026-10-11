/* Read-only station evidence. Loaded in the game's MAIN world before collector-register.js. */
(() => {
 'use strict';
 if (window.__NEXUS_UPGRADE_DETAILS__) return;
 const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
 const number = value => /^\d+$/.test(String(value)) ? Number(value) : null;
 const field = (doc, label) => [...doc.querySelectorAll('dt')].find(el => clean(el.textContent).replace(/:$/, '') === label)?.nextElementSibling;
 function specialisation(doc) {
  const active = field(doc, 'Specialization active')?.querySelector('span');
  const generated = clean(field(doc, 'Generates')?.textContent);
  const value = clean(active?.textContent).toLowerCase();
  // Both facts come from the station itself; the extension flag is not authority.
  const name = generated.match(/(?:^|,\s*)([^,]+?)\s+(?:Missions\s+)?\(Speciali[sz]ation\)/i)?.[1]?.trim();
  if (!['yes', 'no'].includes(value) || !name) return {};
  return {specialisation:name, specialisationActive:value === 'yes'};
 }
 function personnel(doc, stationId, fleet, expected, verifiedAt) {
  const station = doc.querySelector('#back_to_building')?.getAttribute('href');
  if (station !== `/buildings/${stationId}`) throw Error('Staff page does not match this station.');
  const table = doc.querySelector('#personal_table');
  const headers = [...(table?.querySelectorAll('thead th') || [])].map(n => clean(n.textContent));
  const education = headers.indexOf('Education'), assignment = headers.indexOf('Assigned to');
  if (education < 0 || assignment < 0) throw Error('Staff table layout not recognised.');
  const declared = clean(field(doc, 'Amount')?.textContent).match(/^(\d+) people\b/);
  if (!declared || Number(declared[1]) !== expected) throw Error('Staff total changed; refresh station records.');
  const people = [...table.querySelectorAll('tbody tr')].filter(row => row.querySelector('input.personal-delete-checkbox'));
  if (people.length !== expected) throw Error('Incomplete staff roster; previous evidence retained.');
  const names = new Map(), vehicles = new Map(fleet.map(v => [String(v.id), {entityType:'crew',entityId:String(v.id),stationId:String(stationId),assignedPersonnelCount:0,assignmentScanComplete:true,trainingProfilesComplete:true,trainingCounts:Object.create(null),assignedTrainingProfiles:[],trainingCombinationCounts:Object.create(null),verifiedAt}]));
  for (const vehicle of fleet) { const name=clean(vehicle.caption); names.set(name,names.has(name)?null:String(vehicle.id)); }
  const seen = new Set(), counts = Object.create(null);
  for (const row of people) {
   const id = row.querySelector('input.personal-delete-checkbox').value;
   if (number(id) === null || seen.has(id)) throw Error('Staff identities incomplete or duplicated.');
   seen.add(id);
   const raw = row.getAttribute('data-filterable-by');
   if (raw === null || raw.length > 8000) throw Error('Training codes missing from staff roster.');
   const codes = JSON.parse(raw);
   if (!Array.isArray(codes) || codes.length > 100 || codes.some(code => typeof code !== 'string' || !/^[a-zA-Z0-9_]{1,100}$/.test(code) || ['__proto__','constructor','prototype'].includes(code))) throw Error('Training codes not recognised.');
   const unique = new Set(codes);
   for (const code of unique) counts[code]=(counts[code]||0)+1;
   // Only the Assigned to column proves binding. Status can show a temporary dispatch.
   const cell=row.cells[assignment];if(!cell)throw Error('Assigned vehicle column missing; previous records retained.');
   const assigned=clean(cell.textContent);
   let vehicleId=null;
   const links=[...(cell?.querySelectorAll('a[href]')||[])];
   if (links.length) {
    const ids=[...new Set(links.map(a=>a.getAttribute('href')?.match(/^\/vehicles\/(\d+)\/?$/)?.[1]))];
    if(ids.length!==1||!ids[0])throw Error('Ambiguous assigned vehicle.');
    vehicleId=ids[0];
   } else if (assigned && !/^(?:[-—]|unassigned|not assigned|none)$/i.test(assigned)) {
    vehicleId=names.get(assigned);if(!vehicleId)throw Error('Assigned vehicle cannot be matched safely.');
   }
   if(vehicleId){
    const vehicle=vehicles.get(vehicleId);if(!vehicle)throw Error('Assigned vehicle is outside this station fleet.');
    const profile=[...unique].sort();vehicle.assignedPersonnelCount++;vehicle.assignedTrainingProfiles.push(profile);
    for(const code of unique)vehicle.trainingCounts[code]=(vehicle.trainingCounts[code]||0)+1;
    const key=profile.join('+');if(profile.length>1)vehicle.trainingCombinationCounts[key]=(vehicle.trainingCombinationCounts[key]||0)+1;
    if(unique.has('traffic_police')&&unique.has('swat')&&key!=='swat+traffic_police')vehicle.trainingCombinationCounts['swat+traffic_police']=(vehicle.trainingCombinationCounts['swat+traffic_police']||0)+1;
   }
  }
  return {personnelTraining:{complete:true,verifiedAt,counts},crew:[...vehicles.values()]};
 }
 // No game writes. The scheduler captures bounded station batches. The collector supplies account checks
 // and the existing consent-controlled event transport; this reader returns only counts.
 window.__NEXUS_UPGRADE_DETAILS__ = {specialisation, personnel};
})();

/* Independent, bounded inventory and personnel capture. Never awaited by game workers. */
(()=>{
 if(window!==window.top||window.__NEXUS_REGISTER_CAPTURE__)return;
 const BATCH=30,DUE_MS=10*60000,INVENTORY_MS=15*60000;
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const who=()=>{const p=document.querySelector('#navbar_profile_link');return {player:p?.getAttribute('href')?.match(/\/profile\/(\d+)/)?.[1],username:p?.textContent.trim()};};
 const count=v=>v!=null&&v!==''&&Number.isFinite(Number(v))?Number(v):undefined;
 const emit=(kind,record,owner=who())=>{if(owner.player)window.dispatchEvent(new CustomEvent('nexus-analytics-event-v1',{detail:JSON.stringify({kind,...owner,at:Date.now(),record})}));};
 const health=(area,state,message,owner=who())=>emit('capture-health',{area,state,message},owner);
 let busy=false,scanning=false,crewDirty=false,timer,button,reportingEnabled=false,paused=false,stopped=false,closed=false;
 let inventory=null,upgradeOwner='',upgradeRecords={},assignmentEpoch=0;
 const controllers=new Set();
 const personnelBusy=()=>window.__NEXUS_PROFILE_BUSY__||window.__NEXUS_PERSONNEL_OPERATION_BUSY__?.();
 const permitted=()=>!closed&&!paused&&!stopped&&reportingEnabled&&navigator.onLine&&location.pathname==='/'&&!!who().player;
 const check=owner=>{if(closed||paused||stopped||!reportingEnabled||who().player!==owner.player)throw Error('Register capture paused or player changed; previous records retained.');};
 const status=(text,title)=>{if(button){button.textContent='Register sync: '+text;if(title)button.title=title;}};
 window.addEventListener('nexus-analytics-control-v1',e=>{try{
  const c=JSON.parse(e.detail);paused=c.enabled===false;reportingEnabled=c.reportingEnabled===true;
  if(paused||!reportingEnabled){for(const c of controllers)c.abort();if(!busy)status('paused');}
  else if(!busy&&!stopped)status('automatic');
 }catch{}});
 async function response(url,owner,html=false){
  check(owner);const c=new AbortController();controllers.add(c);const timer=setTimeout(()=>c.abort(),15000);
  try{
   const r=await fetch(url,{credentials:'same-origin',redirect:'error',cache:'no-store',signal:c.signal,headers:{Accept:html?'text/html':'application/json'}});
   if(!r.ok)throw Error('Game register HTTP '+r.status+'; previous records retained.');
   const text=await r.text();check(owner);if(text.length>(html?4000000:12000000))throw Error('Game page exceeds capture limit.');
   if(html){await sleep(500);return new DOMParser().parseFromString(text,'text/html');}
  const data=JSON.parse(text),ids=new Set();
   if(!Array.isArray(data)||data.length>15000||data.some(v=>!/^\d+$/.test(String(v.id))||ids.has(String(v.id))||!ids.add(String(v.id))))throw Error('Incomplete or unsupported game register response');
   return data;
  }finally{clearTimeout(timer);controllers.delete(c);}
 }
 async function getInventory(owner,force=false){
  if(!force&&inventory?.player===owner.player&&Date.now()-inventory.at<INVENTORY_MS)return inventory;
  const buildings=await response('/api/buildings',owner),vehicles=await response('/api/vehicles',owner);check(owner);
  const fleets=new Map();for(const v of vehicles){const id=String(v.building_id);if(!fleets.has(id))fleets.set(id,[]);fleets.get(id).push(v);}
  inventory={player:owner.player,at:Date.now(),buildings,vehicles,fleets,ids:new Set(vehicles.map(v=>String(v.id)))};
  return inventory;
 }
 // Keep the existing account-scoped evidence database; new crew profiles live only in
 // NexusPersonnelStore, avoiding a second growing copy of the full personnel register.
 const upgradeKey=owner=>'nexus-upgrade-evidence-v1:'+owner.player;
 async function upgradeDb(owner,value,write=false){
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nexus-upgrade-evidence',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>resolve(r.result);r.onerror=r.onblocked=()=>reject(Error('Station evidence database unavailable'));});
  try{return await new Promise((resolve,reject)=>{check(owner);const t=db.transaction('records',write?'readwrite':'readonly'),s=t.objectStore('records'),r=write?s.put(value,upgradeKey(owner)):s.get(upgradeKey(owner));t.oncomplete=()=>resolve(write?value:r.result);t.onabort=()=>reject(Error('Station evidence could not be saved'));});}finally{db.close();}
 }
 async function loadUpgrades(owner){
  if(upgradeOwner===owner.player)return;
  let data=await upgradeDb(owner);check(owner);
  if(!data){const legacy=localStorage.getItem(upgradeKey(owner));if(legacy&&legacy.length<4000000){data=JSON.parse(legacy);await upgradeDb(owner,data,true);check(owner);if(localStorage.getItem(upgradeKey(owner))===legacy)localStorage.removeItem(upgradeKey(owner));}}
  upgradeRecords=data&&typeof data==='object'&&!Array.isArray(data)?data:{};upgradeOwner=owner.player;
 }
 function buildingRow(b,extra={}){return {entityType:'building',entityId:b.id,name:b.caption,typeId:b.building_type,dispatchCentreId:b.leitstelle_building_id,level:count(b.level),personnelCount:count(b.personal_count),latitude:count(b.latitude),longitude:count(b.longitude),enabled:typeof b.enabled==='boolean'?b.enabled:undefined,extensions:(Array.isArray(b.extensions)?b.extensions:[]).map(e=>({typeId:e.type_id??e.type,name:e.caption??e.name,enabled:e.enabled,availableAt:e.available_at})),specialisation:typeof b.specialization==='string'?b.specialization:undefined,...extra};}
 const vehicleRow=v=>({entityType:'vehicle',entityId:v.id,name:v.caption,typeId:v.vehicle_type,stationId:v.building_id,maxCrew:count(v.max_personnel),latitude:count(v.latitude),longitude:count(v.longitude)});
 function crewRows(){
  const raw=window.NexusPersonnelStore.readRaw();if(raw.length>24000000)throw Error('Crew register exceeds reporting capture limit.');
  const r=JSON.parse(raw);if(r.schemaVersion!==1||!r.vehicles)throw Error('Crew register format not recognised.');
  // Dashboard receives counts only. Discord account sync separately carries the
  // verified per-person training combinations needed by local dispatch decisions.
  return Object.values(r.vehicles).map(v=>({entityType:'crew',entityId:v.vehicleId,stationId:v.stationHref?.match(/\/buildings\/(\d+)/)?.[1],assignedPersonnelCount:v.assignedPersonnelCount,assignmentScanComplete:v.assignmentScanComplete,trainingProfilesComplete:v.trainingProfilesComplete,trainingCounts:v.trainingCounts,verifiedAt:v.updatedAt}));
 }
 function upgradeCrew(owner,row){
  const records=upgradeOwner===owner.player?upgradeRecords:{};
  const candidates=(row.stationId==null?Object.values(records):[records[String(row.stationId)]])
   .flatMap(record=>record?.crew||[]).filter(c=>String(c.entityId)===String(row.entityId));
  const current=candidates.length===1?candidates[0]:null;
  return current&&current.verifiedAt>Number(row.verifiedAt||0)?current:row;
 }
 async function sendRows(rows,owner){for(let i=0;i<rows.length;i++){check(owner);emit('register',rows[i],owner);if(i%15===14)await sleep(150);}}
 async function sync(crewOnly=false){
  if(busy||!permitted())return;
  const player=who().player;
  if(!navigator.locks){status('check needed','Register updates need browser locking support.');return;}
  return navigator.locks.request('nexus-ambulance-capture:'+player,{ifAvailable:true},async lock=>{
  if(!lock||busy||!permitted()||who().player!==player)return;
  busy=true;const owner=who();status('saving…');
  try{
   // Another game tab may have captured newer station evidence since this tab loaded.
   // Share the detail-scan lock and reload committed evidence before exporting inventory.
   await window.NexusPersonnelStore.ready();check(owner);upgradeOwner='';await loadUpgrades(owner);const inv=await getInventory(owner,!crewOnly);
   if(!crewOnly){
    for(const type of ['building','vehicle']){
     const data=type==='building'?inv.buildings:inv.vehicles;
     await sendRows(data.map(v=>type==='building'?buildingRow(v,upgradeRecords[String(v.id)]?.building):vehicleRow(v)),owner);
     check(owner);emit('register-snapshot',{entityType:type,ids:data.map(v=>String(v.id))},owner);await sleep(1000);
    }
   }
   await sendRows(crewRows().map(row=>upgradeCrew(owner,row)).filter(v=>inv.ids.has(String(v.entityId))),owner);
   health('registers','saved','All-service inventory and saved crew observations queued. Detailed personnel checks continue in background batches.',owner);status('saved');
  }catch(e){if(who().player===owner.player){const p=stopped||paused||!reportingEnabled;health('registers',p?'paused':'error',e.message,owner);status(p?'paused':'check needed',e.message);}}
  finally{busy=false;scheduleDirty();}
  });
 }
 function scheduleDirty(){if(crewDirty&&!closed){crewDirty=false;clearTimeout(timer);timer=setTimeout(()=>void sync(true),3000);}}
 function changed(){assignmentEpoch++;if(busy){crewDirty=true;return;}clearTimeout(timer);timer=setTimeout(()=>void sync(true),3000);}
 window.addEventListener('mc-personnel-training-registry-updated',changed);
 function localRow(b,v,crew){return {
  vehicleId:String(v.id),vehicleName:String(v.caption||''),vehicleTypeId:String(v.vehicle_type??''),stationName:String(b.caption||''),stationHref:'/buildings/'+b.id,
  assignedPersonnelCount:crew.assignedPersonnelCount,assignmentScanComplete:true,trainingProfilesComplete:true,
  trainingCounts:crew.trainingCounts,assignedTrainingProfiles:crew.assignedTrainingProfiles,trainingCombinationCounts:crew.trainingCombinationCounts,
  personnelRowsSeen:Number(b.personal_count),updatedAt:crew.verifiedAt,source:'personnel-register-exact-background-all-services'
 };}
 async function scan(requestedStation=''){
  if(busy||!permitted()||personnelBusy())return;
  const player=who().player;
  // One detail scanner per player across tabs; without locking use inventory only.
  if(!navigator.locks){status('inventory only','Automatic staff checks need browser locking support.');return;}
  return navigator.locks.request('nexus-ambulance-capture:'+player,{ifAvailable:true},async lock=>{
   if(!lock||busy||!permitted()||personnelBusy()||who().player!==player)return;
   busy=true;scanning=true;const owner=who(),warnings=[],captured={};let saved=0;
   try{
    await window.NexusPersonnelStore.ready();check(owner);upgradeOwner='';await loadUpgrades(owner);
    const inv=await getInventory(owner,Date.now()-Number(inventory?.at||0)>=60000),cache=upgradeRecords,now=Date.now();
    const ownedBuildings=new Set(inv.buildings.map(b=>String(b.id)));
    for(const id of Object.keys(cache))if(!ownedBuildings.has(id))delete cache[id];
    // No building-type whitelist: future services and unstaffed vehicle bases are
    // included automatically. Empty buildings remain in the inventory snapshot.
    const candidates=inv.buildings.filter(b=>Number(b.personal_count)>0||(inv.fleets.get(String(b.id))||[]).length);
    const needle=String(requestedStation||'').trim().toLowerCase();
    const selected=needle?inv.buildings.filter(b=>String(b.id)===needle||String(b.caption||'').trim().toLowerCase()===needle):[];
    if(needle&&selected.length!==1){status('check needed',selected.length?'Several owned stations have that name. Enter its building ID instead.':'No owned station matches that name or building ID.');return;}
    // Committed attempts share the automatic allowance across tabs and reloads.
    const recent=Object.values(cache).filter(r=>now-Number(r.lastAttempt||0)<60000).length;
    const allowance=Math.max(0,BATCH-recent);
    if(!needle&&!allowance){status('waiting','Automatic checks resume on the next minute tick; up to 30 stations per minute across game tabs.');return;}
    const due=needle?selected:candidates.filter(b=>now-Number(cache[String(b.id)]?.lastAttempt||0)>=DUE_MS)
     .sort((a,b)=>Number(cache[String(a.id)]?.lastAttempt||0)-Number(cache[String(b.id)]?.lastAttempt||0)).slice(0,allowance);
    if(!due.length){
     const unverified=candidates.filter(b=>Number(cache[String(b.id)]?.lastSuccess||0)<Number(cache[String(b.id)]?.lastAttempt||0)).length;
     status(unverified?'check needed':'up to date',unverified?`${unverified} buildings need another staff check. Previous records are retained; failed checks become eligible again after 10 minutes.`:'All staffed buildings and vehicle bases checked recently. Empty buildings are covered by inventory updates.');return;
    }
    for(const b of due){
     if(!permitted()||personnelBusy())break;check(owner);
     const id=String(b.id),epoch=assignmentEpoch,started=Date.now();
     cache[id]={...cache[id],lastAttempt:started};await upgradeDb(owner,cache,true);
     status('checking '+(saved+1)+'/'+due.length,`Checking ${b.caption||id}. All services; up to ${BATCH} buildings per minute. Click to pause background register updates.`);
     try{
      const station=await response('/buildings/'+id,owner,true);
      if(!permitted()||personnelBusy()||assignmentEpoch!==epoch)throw Error('Personnel changed during scan; previous records retained.');
      const roster=await response('/buildings/'+id+'/personals',owner,true),fleet=inv.fleets.get(id)||[];
      const special=window.__NEXUS_UPGRADE_DETAILS__.specialisation(station);
      // Start time, not end time: a concurrent verified assignment or cloud record
      // must win over this earlier observation when local records are merged.
      let details;
      try{details=window.__NEXUS_UPGRADE_DETAILS__.personnel(roster,id,fleet,Number(b.personal_count),started);}
      catch(e){warnings.push(`${b.caption||id}: ${e.message}`);}
      check(owner);if(!permitted()||personnelBusy()||assignmentEpoch!==epoch)throw Error('Personnel changed during scan; previous records retained.');
      const prior=cache[id],building={...prior?.building,...special};
      if(special.specialisation)building.specialisationVerifiedAt=started;
      if(details)building.personnelTraining=details.personnelTraining;
      if(details){
       const rows=Object.fromEntries(details.crew.map(c=>[c.entityId,localRow(b,fleet.find(v=>String(v.id)===c.entityId),c)]));
       // Commit before publishing a successful station result. Never replace other stations.
       await window.NexusPersonnelStore.write({schemaVersion:1,vehicles:rows});check(owner);
       Object.assign(captured,rows);
      }
      cache[id]={lastAttempt:started,lastSuccess:details?started:prior?.lastSuccess,building,...(!details&&prior?.crew?{crew:prior.crew}:{})};
      if(JSON.stringify(cache).length>12000000)throw Error('Station evidence exceeds storage limit.');
      await upgradeDb(owner,cache,true);check(owner);
      await sendRows([buildingRow(b,building)],owner);if(details)saved++;
     }catch(e){
      check(owner);warnings.push(`${b.caption||id}: ${e.message}`);
      if(!permitted()||personnelBusy())break;
     }
    }
    // Read committed records back: a newer write during capture must also win in reporting.
    if(Object.keys(captured).length){await sendRows(crewRows().filter(row=>captured[row.entityId]&&inv.ids.has(row.entityId)),owner);}
    const remaining=candidates.filter(b=>!cache[String(b.id)]?.lastSuccess).length;
    const message=`${saved} buildings checked; ${remaining} await their first complete staff check. ${warnings.length?`${warnings.length} checks need attention. ${warnings[0]}`:'Staff and unit records saved locally; existing Discord sync transfers them.'}`;
    health('upgrade-details',warnings.length?'warning':'saved',message,owner);
    status(stopped?'paused':warnings.length?'check needed':'saved',message+' Click to refresh inventory and check the next batch.');
   }catch(e){if(who().player===owner.player){const p=stopped||paused||!reportingEnabled;health('upgrade-details',p?'paused':'error',e.message,owner);status(p?'paused':'check needed',e.message);}}
   finally{scanning=false;busy=false;scheduleDirty();}
  });
 }
 window.__NEXUS_REGISTER_CAPTURE__={sync};
 function start(){
  if(closed)return;const p=document.querySelector('#navbar_profile_link');if(!p){timer=setTimeout(start,5000);return;}
  button=document.createElement('button');button.type='button';
  button.style.cssText='background:#18374d;color:#e6f3ff;border:1px solid #5b8198;border-radius:4px;padding:5px 8px;margin:3px;font-size:11px';
  status('automatic','All buildings and vehicles are included. Staffed buildings and vehicle bases are checked automatically at up to 30 per minute across game tabs while reporting is enabled. Large estates take longer than 10 minutes. Click to refresh inventory and check the next batch.');
  button.onclick=()=>{
   if(busy){stopped=true;for(const c of controllers)c.abort();status('paused','Click to resume background register updates.');return;}
   stopped=false;if(!reportingEnabled||paused){status('paused','Enable reporting in Nexus settings to collect and upload register observations.');return;}
   void sync().then(()=>scan());
  };p.parentElement.append(button);
  const stationCheck=document.createElement('button');stationCheck.type='button';stationCheck.textContent='Check a station';stationCheck.style.cssText=button.style.cssText;
  stationCheck.onclick=()=>{
   if(busy||personnelBusy()){status('checking','Wait for the current register or personnel check to finish, then check the station.');return;}
   if(!permitted()){status('paused','Resume register updates and enable reporting before checking a station.');return;}
   const name=window.prompt('Enter the exact station name or building ID to check now.');
   if(name?.trim())void scan(name.trim());
  };p.parentElement.append(stationCheck);
  const initialAuto=setTimeout(()=>void scan(),60000),repeatAuto=setInterval(()=>void scan(),60000),initialRegisters=setTimeout(()=>void sync(),20000),repeatRegisters=setInterval(()=>void sync(),INVENTORY_MS);
  window.addEventListener('pagehide',()=>{closed=true;clearTimeout(timer);clearTimeout(initialAuto);clearInterval(repeatAuto);clearTimeout(initialRegisters);clearInterval(repeatRegisters);for(const c of controllers)c.abort();inventory=null;upgradeRecords={};},{once:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
