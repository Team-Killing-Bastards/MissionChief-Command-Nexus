/* User-opened, read-only profile matching. Unknown evidence never hides a station. */
(() => {
  'use strict';
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const count=value=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:
    typeof value==='string'&&/^\d+$/.test(value)&&Number.isSafeInteger(Number(value))?Number(value):null;
  async function check(raw,station,{signal}={}){
    const C=globalThis.NexusStationProfilesCore,D=globalThis.NexusStationProfilesData;
    const profile=C.validate(raw,D),id=String(station.id),needs=(reason,detail)=>({matches:false,reason,detail});
    if(!/^[1-9]\d*$/.test(id))throw Error('Station identity unavailable.');
    async function read(path,json=false){
      signal?.throwIfAborted();
      const response=await fetch(path,{credentials:'same-origin',cache:'no-store',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});
      if(!response.ok)throw Error('Game check returned HTTP '+response.status);
      const text=await response.text();signal?.throwIfAborted();
      if(text.length>6*1024*1024)throw Error('Game response too large.');
      return json?JSON.parse(text):new DOMParser().parseFromString(text,'text/html');
    }
    if(await globalThis.NexusStationProfilesStore.pending('nexusStationProfilePending:'+id))throw Error('A previous profile change needs checking in this station.');
    signal?.throwIfAborted();
    const fleet=await read('/api/buildings/'+id+'/vehicles',true),plan=C.compare(profile,station,fleet,D);
    if(plan.buy.length)return needs('Missing profile vehicles',plan.buy.map(u=>(D.vehicles[u.type]?.name||u.type)+': '+(u.target-u.count)+' of '+u.target+' vehicles').join('; '));
    if(plan.remove.length||plan.blocked.length)return needs('Other vehicle types remain',[...plan.remove,...plan.blocked.map(row=>row.vehicle)].map(v=>(v.caption||'Vehicle #'+v.id)+' ('+(D.vehicles[v.vehicle_type]?.name||'type '+v.vehicle_type)+')').slice(0,5).join('; '));
    if(profile.maxLevel){
      const level=globalThis.NexusBuildingUpgradesCore.station(await read('/buildings/'+id),id);
      if(level.level===null)throw Error('Station level could not be checked.');
      if(level.expand)return needs('Station level needs upgrading','Current level '+level.level+'. Upgrade to maximum is selected and the game still offers expansion.');
    }
    for(const {vehicle,unit} of plan.allocation.assignments){
      if(!unit.crew)continue;
      const assigned=count(vehicle.assigned_personnel_count);
      if(assigned===null)throw Error('Assigned crew total unavailable for '+(vehicle.caption||vehicle.id));
      if(assigned<unit.crew)return needs('Crew target not met',(vehicle.caption||'Vehicle #'+vehicle.id)+': '+assigned+' of '+unit.crew+' assigned crew'+(unit.role?' · '+unit.role:''));
    }
    if(profile.rename){
      const base=await globalThis.NexusNaming.resolveBase(station.caption,id,station,{signal}),indices={};
      signal?.throwIfAborted();
      for(const vehicle of [...fleet].sort((a,b)=>Number(a.id)-Number(b.id))){
        const rule=D.naming[vehicle.vehicle_type],key=rule?.code||String(vehicle.vehicle_type);
        indices[key]=(indices[key]||0)+1;
        if(rule&&clean(vehicle.caption)!==C.vehicleCaption(vehicle,indices[key],base,D))return needs('Vehicle naming needs updating',(vehicle.caption||'Unnamed vehicle')+' → '+C.vehicleCaption(vehicle,indices[key],base,D));
      }
    }
    let reader;
    for(const {vehicle,unit} of plan.allocation.assignments){
      if(!unit.crew||!unit.training.length)continue;
      reader ||= globalThis.NexusPersonnelReaderFactory();
      const doc=await read('/vehicles/'+vehicle.id+'/zuweisung'),table=doc.querySelector('#personal_table');
      if(!table||[...doc.querySelectorAll('.pagination a[href]')].some(a=>!a.closest('.disabled,.active')))throw Error('Complete assigned training could not be checked.');
      const layout=reader.columns(table),bound=[],seen=new Set();
      for(const row of table.querySelectorAll('tbody tr')){
        const person=reader.read(row,layout,new Map(),String(vehicle.id));
        if(person?.vehicle===String(vehicle.id)){
          if(!person.identity||seen.has(person.identity))throw Error('Assigned personnel identity is missing or duplicated.');
          seen.add(person.identity);bound.push(person);
        }
      }
      if(bound.length!==count(vehicle.assigned_personnel_count)||bound.some(p=>!p.trainingKnown))throw Error('Assigned training changed or is incomplete.');
      const qualified=bound.filter(p=>reader.matches(p,unit.training)).length;
      if(qualified<unit.crew)return needs('Trained crew target not met',(vehicle.caption||'Vehicle #'+vehicle.id)+': '+qualified+' of '+unit.crew+' crew with '+unit.training.join(' + '));
    }
    signal?.throwIfAborted();
    return {matches:true,reason:'Already matches profile'};
  }
  globalThis.NexusProfileMatch=Object.freeze({check});
})();
