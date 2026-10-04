(()=>{
 const clean=v=>String(v||'').replace(/\s+/g,' ').trim().slice(0,180);
 const number=v=>/^\d+$/.test(String(v||''))?String(v):'';
 const id=(link,type)=>link?.getAttribute('href')?.match(new RegExp('/'+type+'/(\\d+)(?:[/?#]|$)'))?.[1]||'';
 const owner=()=>{try{return window.top.__NEXUS_COLLECTOR_GAME__;}catch{return null;}};
 const pending=new Map(),seen=new WeakSet();
 const locations=new Map();
 const api={
  location(m,row,who){
   try{
    if(window!==window.top)return owner()?.location(m,row,who);
    const missionId=number(m?.id??m?.mission_id??row?.getAttribute('mission_id')??row?.id?.match(/^mission_(\d+)$/)?.[1]);
    if(!missionId||!who?.player)return;
    const coordinate=(v,limit)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Math.abs(Number(v))<=limit?Number(v):null;
    const record={missionId,missionName:clean(m?.caption||m?.name),address:clean(m?.address||row?.getAttribute('data-address')),
     latitude:coordinate(m?.latitude??m?.lat,90),longitude:coordinate(m?.longitude??m?.lng??m?.lon,180),
     generatorStationId:number(m?.generator_building_id??m?.generated_by_building_id),
     generatorStationName:clean(m?.generator_building_name||m?.generated_by_name),source:'mission-marker'};
    if(record.latitude===null||record.longitude===null)record.latitude=record.longitude=null;
    if(!record.address&&record.latitude===null&&!record.generatorStationId)return;
    const key=String(who.player)+':'+missionId,old=locations.get(key);
    // Partial sidebar refreshes must not erase coordinates already observed.
    if(old)for(const k of ['address','latitude','longitude','generatorStationId','generatorStationName'])if(record[k]===null||record[k]==='')record[k]=old[k];
    if(JSON.stringify(old)===JSON.stringify(record))return;
    locations.set(key,record);while(locations.size>10000)locations.delete(locations.keys().next().value);
    window.dispatchEvent(new CustomEvent('nexus-analytics-event-v1',{detail:JSON.stringify({kind:'mission-location',...who,at:Date.now(),record})}));
   }catch{} // Optional reporting cannot interrupt the game's marker or worker.
  },

  unit(cb,vehicleId){const row=cb.closest('tr'),vehicle=[...row?.querySelectorAll('a[href*="/vehicles/"]')||[]].find(a=>id(a,'vehicles')===String(vehicleId)&&clean(a.textContent)),station=row?.querySelector('a[href*="/buildings/"]');return {vehicleId:number(vehicleId),vehicleTypeId:number(cb.getAttribute('vehicle_type_id')),vehicleName:clean(vehicle?.textContent||cb.getAttribute('vehicle_caption')),vehicleTypeName:clean(cb.getAttribute('vehicle_type_caption')||row?.querySelector('.vehicle_type_caption')?.textContent),stationId:id(station,'buildings')||number(cb.getAttribute('building_id')),stationName:clean(station?.textContent),status:clean(cb.getAttribute('status')||row?.querySelector('.vehicle_status')?.textContent)};},
  missionName(missionId){try{if(location.pathname==='/missions/'+missionId){const title=document.querySelector('#mission_general_info')?.getAttribute('data-mission-title')||document.querySelector('#missionH1,#mission_caption,#mission_general_info h1,.mission_title,.mission-title,h1')?.textContent;if(clean(title))return clean(title);}const row=window.top.document.getElementById('mission_'+missionId);return clean(row?.querySelector('.missionSideBarEntrySearchHelper')?.textContent||[...row?.querySelectorAll('a[href*="/missions/"]')||[]].find(a=>clean(a.textContent)&&!/^dispatch$/i.test(clean(a.textContent)))?.textContent);}catch{return ''; }},
  attempt(record,who){
   if(window!==window.top)return owner()?.attempt(record,who);
   // Mission frames are short lived. Even a nested array or identity object
   // from that realm keeps its closed document alive through its prototype.
   // Recreate the report in the owning page before retaining it for confirmation.
   let copy;try{copy=JSON.parse(JSON.stringify({record,who}));}catch{return '';}
   if(!copy.record||typeof copy.record!=='object'||Array.isArray(copy.record))return '';
   const key=crypto.randomUUID();
   pending.set(key,{record:{...copy.record,correlationId:key},who:copy.who,at:Date.now(),confirmed:new Set()});
   while(pending.size>100)pending.delete(pending.keys().next().value);
   return key;
  },
  confirm(vehicleId){if(window!==window.top)return owner()?.confirm(vehicleId);const candidates=[...pending.entries()].filter(([,p])=>Date.now()-p.at<120000&&p.record.units?.some(u=>u.vehicleId===vehicleId));if(candidates.length!==1)return;const [key,p]=candidates[0];if(p.confirmed.has(vehicleId))return;p.confirmed.add(vehicleId);
   const emit=(eventType,units)=>window.dispatchEvent(new CustomEvent('nexus-analytics-event-v1',{detail:JSON.stringify({kind:'mission',...p.who,at:Date.now(),eventKey:key+':'+eventType+':'+vehicleId,missionId:p.record.missionId,missionName:p.record.missionName,record:{...p.record,eventType,units,dispatchConfirmed:true,source:'native-vehicle-dispatch-success',correlationId:key}})}));
   emit('unit-dispatch-confirmed',p.record.units.filter(u=>u.vehicleId===vehicleId));
   if(p.confirmed.size===p.record.units.length){emit('dispatch-confirmed',p.record.units);pending.delete(key);}
  }
 };
 window.__NEXUS_COLLECTOR_GAME__=api;
 const inspect=()=>{for(const a of [...document.querySelectorAll('.alert.alert-success,[id^="alert_success_"]')].slice(0,30)){if(seen.has(a))continue;seen.add(a);if(!/has successfully been dispatched\.?/i.test(a.textContent||''))continue;const vehicleId=id(a.querySelector('a[href*="/vehicles/"]'),'vehicles');if(vehicleId)api.confirm(vehicleId);}for(const[k,p]of pending)if(Date.now()-p.at>120000)pending.delete(k);};
 // Existing alerts are not evidence of a new send. Only future alerts count.
 for(const a of document.querySelectorAll('.alert.alert-success,[id^="alert_success_"]'))seen.add(a);
 setInterval(inspect,1500);
})();
