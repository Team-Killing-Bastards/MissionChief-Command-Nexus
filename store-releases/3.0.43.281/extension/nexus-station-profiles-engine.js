/* Explicit station profile execution; a read-only factory serves the bulk review. */
(()=>{'use strict';
 function create(id,{readOnly=false}={}){
 if(!/^[1-9]\d*$/.test(String(id)))throw Error('Station identity unavailable');id=String(id);
 const C=globalThis.NexusStationProfilesCore,D=globalThis.NexusStationProfilesData;
 const clean=x=>String(x??'').replace(/\s+/g,' ').trim(),parse=raw=>new DOMParser().parseFromString(raw,'text/html');
 async function request(path,options={}){const u=new URL(path,location.origin);if(u.origin!==location.origin)throw Error('Unexpected game destination');const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),20000);try{const r=await fetch(u.href,{credentials:'same-origin',cache:'no-store',redirect:'follow',...options,signal:ac.signal});if(new URL(r.url||u.href).origin!==location.origin||!r.ok)throw Error('Game request failed: HTTP '+r.status);const text=await r.text();if(text.length>6*1024*1024)throw Error('Game response too large');return text;}finally{clearTimeout(timer);}}
 const json=async path=>JSON.parse(await request(path)),html=async path=>parse(await request(path));
 const journalKey='nexusStationProfilePending:'+id;
 const store=globalThis.NexusStationProfilesStore;
 async function journal(value){await store.checkpoint(journalKey,value);}
 async function checkPending(){const p=await store.pending(journalKey);if(!p)return;if(readOnly)throw Error('A previous profile change needs checking. Open this station’s profile review before starting another batch.');if(p.kind==='level'&&globalThis.NexusBuildingUpgradesCore.station(await html('/buildings/'+id),id).level>=p.target){await journal(null);return;}const rows=await fleet();if(p.kind==='delete'&&!rows.some(v=>String(v.id)===p.id)){await removeRegister(p.id);await journal(null);return;}if(p.kind==='buy'){const added=rows.filter(v=>!p.before.includes(String(v.id)));if(added.length===1&&String(added[0].vehicle_type)===p.type){await journal(null);return;}}throw Error('An earlier '+p.kind+' request has an unverified outcome. No further changes will be sent. Check the station in the game before clearing its profile checkpoint.');}
 async function fleet(){const rows=await json('/api/buildings/'+id+'/vehicles');if(!Array.isArray(rows)||rows.some(v=>String(v.building_id)!==id))throw Error('Station fleet unavailable');return rows;}
 function market(doc){const result={};for(const a of doc.querySelectorAll('a.buy-vehicle-btn[href]')){const u=new URL(a.getAttribute('href'),location.origin),m=u.pathname.match(/^\/buildings\/(\d+)\/vehicle\/(\d+)\/(\d+)\/credits$/);if(!m||m[1]!==id||m[2]!==id||u.origin!==location.origin||u.searchParams.get('building')!==id)continue;const price=clean(a.textContent).match(/^([\d,]+) Credits$/i),card=a.closest('.vehicle_type'),capacity=clean(card?.textContent).match(/Max\. Crew:\s*(\d+)/i);if(!price||!card)continue;const max=capacity?Number(capacity[1]):D.vehicles[m[3]]?.max===0?0:null,cost=Number(price[1].replace(/,/g,''));if(max===null||max>100||!Number.isSafeInteger(cost)||cost<0)continue;result[m[3]]={href:u.pathname+u.search,price:cost,max,enabled:!a.matches('.disabled,[disabled],[aria-disabled="true"]'),name:clean(card.querySelector('h3')?.textContent)};}return result;}
 function token(doc){const value=doc.querySelector('meta[name="csrf-token"]')?.content||document.querySelector('meta[name="csrf-token"]')?.content;if(!value)throw Error('Game security token unavailable');return value;}
 function profileTypeTarget(profile,type){return profile.units.filter(unit=>unit.type===String(type)).reduce((sum,unit)=>sum+unit.count,0);}
 function roleLabel(unit){return clean(unit.role)||D.vehicles[unit.type]?.name||('Type '+unit.type);}
 async function levelQuote(){
  const U=globalThis.NexusBuildingUpgradesCore;if(!U)throw Error('Level reader unavailable; refresh Nexus.');
  const current=U.station(await html('/buildings/'+id),id);if(current.level===null)throw Error('This building does not offer a readable station level.');
  if(!current.expand)return {current:current.level,target:current.level,cost:0,action:null};
  const page=await html('/buildings/'+id+'/expand'),levels=U.levels(page,id,current.level);
  const offered=[...page.querySelectorAll('.price_level dt')].filter(n=>clean(n.textContent).replace(/:$/,'')==='Expand to level').map(n=>Number(clean(n.nextElementSibling?.textContent))).filter(n=>Number.isSafeInteger(n)&&n>current.level);
  const maximum=Math.max(...offered),action=levels.find(a=>a.target===maximum);
  if(!action)throw Error('The maximum station level cannot currently be bought with credits. Check this station in the game.');
  return {current:current.level,target:action.target,cost:action.cost,action};
 }
 async function review(profile,inventory=null,report=()=>{}){report('Checking previous profile changes…');await checkPending();report('Checking station identity…');const stations=inventory||await json('/api/buildings');if(!Array.isArray(stations))throw Error('Station list unavailable');const station=stations.find(b=>String(b.id)===id);if(!station)throw Error('Station identity unavailable');report('Checking '+station.caption+' vehicles…');const plan=C.compare(profile,station,await fleet(),D);report('Checking vehicle prices…');const offers=market(await html('/buildings/'+id+'/vehicles/new'));plan.offers=offers;plan.stationName=station.caption;plan.vehicleCost=plan.buy.reduce((sum,u)=>sum+(offers[u.type]?.price||0)*u.count,0);if(plan.profile.maxLevel)report('Checking maximum station level and price…');plan.level=plan.profile.maxLevel?await levelQuote():null;plan.cost=plan.vehicleCost+(plan.level?.cost||0);if(!Number.isSafeInteger(plan.cost)||plan.cost<0)throw Error('Profile price exceeds the supported limit.');plan.unknownCost=plan.buy.some(u=>!offers[u.type]);return plan;}
 function approvalKey(plan,{allowCreditPriceChanges=false}={}){
  const level=allowCreditPriceChanges&&plan.level?{...plan.level,cost:undefined,action:plan.level.action?{...plan.level.action,cost:undefined}:null}:plan.level;
  // Owned identities/types determine quantities; dispatch/return state is checked
  // live before each removal, rename and crew action, not frozen at bulk review.
  const signature=allowCreditPriceChanges?JSON.stringify(JSON.parse(plan.signature).map(row=>row.slice(0,2))):plan.signature;
  return JSON.stringify({stationId:plan.stationId,profile:plan.profile,signature,cost:allowCreditPriceChanges?undefined:plan.cost,unknownCost:plan.unknownCost,level,buy:plan.buy,remove:plan.remove.map(v=>String(v.id)),offers:plan.buy.map(u=>[u.type,allowCreditPriceChanges?undefined:plan.offers[u.type]?.price,plan.offers[u.type]?.max])});
 }
 function reconcileBatchApproval(plan,approval,report=()=>{}){
  let approved;try{approved=JSON.parse(approval);}catch{throw Error('Profile review is unreadable. Review this station again; no changes sent.');}
  const current=JSON.parse(approvalKey(plan,{allowCreditPriceChanges:true}));
  if(!approved||!Array.isArray(approved.remove)||approved.remove.some(id=>typeof id!=='string'||!/^\d+$/.test(id))||new Set(approved.remove).size!==approved.remove.length)throw Error('Profile removal approval is invalid. Review again; no changes sent.');
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  let change='';
  if(current.stationId!==approved.stationId)change='Station identity changed';
  else if(!same(current.profile,approved.profile))change='The selected profile or its unit and crew targets changed';
  else if(current.signature!==approved.signature){
   let detail='';try{const old=new Map(JSON.parse(approved.signature)),fresh=new Map(JSON.parse(current.signature)),added=[...fresh.keys()].filter(id=>!old.has(id)),removed=[...old.keys()].filter(id=>!fresh.has(id)),types=[...fresh.keys()].filter(id=>old.has(id)&&old.get(id)!==fresh.get(id));detail=[added.length?'added '+added.slice(0,4).map(id=>'#'+id).join(', '):'',removed.length?'removed '+removed.slice(0,4).map(id=>'#'+id).join(', '):'',types.length?'changed type '+types.slice(0,4).map(id=>'#'+id).join(', '):''].filter(Boolean).join('; ');}catch{}
   change='Station vehicle identities or types changed'+(detail?' ('+detail+')':'');
  }else if(!same(current.level,approved.level))change='Station level or maximum-level offer changed (now '+(current.level?current.level.current+' → '+current.level.target:'keep level')+')';
  else if(current.unknownCost||current.unknownCost!==approved.unknownCost)change='A required vehicle no longer has a verified credit offer';
  else if(!same(current.buy,approved.buy))change='Required vehicle purchase quantities changed';
  else if(!same(current.offers,approved.offers))change='Required vehicle offers or crew capacities changed';
  if(change)throw Error(change+' since review. Review this station again; no changes sent.');
  const approvedIds=new Set(approved.remove),availableIds=new Set(plan.remove.map(v=>String(v.id)));
  const newlyAvailable=plan.remove.filter(v=>!approvedIds.has(String(v.id))),nowAway=approved.remove.filter(id=>!availableIds.has(id));
  // Returning vehicles were not necessarily listed for permanent removal. Never
  // expand that list implicitly; an approved vehicle that left is also untouched.
  plan.remove=plan.remove.filter(v=>approvedIds.has(String(v.id)));
  if(nowAway.length)report(nowAway.length+' reviewed removal(s) are now away or unavailable; left in place.');
  if(newlyAvailable.length)report(newlyAvailable.length+' returned vehicle(s) were not approved for removal; left in place. Review again if you want them removed.');
  return plan;
 }
 async function removeRegister(vehicleId){await window.top.NexusPersonnelStore.remove([String(vehicleId)]);}
 async function rename(v,index,stationName,cancelled){const rule=D.naming[v.vehicle_type];if(!rule)return 'No naming rule — left unchanged';const caption=C.vehicleCaption(v,index,stationName,D);
  const edit=await html('/vehicles/'+v.id+'/edit'),field=edit.querySelector('#vehicle_caption'),form=field?.closest('form'),url=new URL(form?.getAttribute('action')||'/',location.origin);
  if(!form||url.origin!==location.origin||url.pathname!=='/vehicles/'+v.id||form.method.toUpperCase()!=='POST'||form.querySelector('[name="_method"]')?.value!=='patch')throw Error('Vehicle edit form changed');
  if(clean(field.value)===caption)return 'Already named';const body=new FormData(form);body.set(field.name,caption);if(cancelled())return 'Stopped';await request(url.href,{method:'POST',body,headers:{'X-CSRF-Token':token(edit)}});const after=await html('/vehicles/'+v.id+'/edit');if(clean(after.querySelector('#vehicle_caption')?.value)!==caption)throw Error('Rename outcome uncertain; stopped without retry');return caption;
 }
 async function apply(plan,report,cancelled,buyOnly=false,{allowCreditPriceChanges=false}={}){
  if(readOnly)throw Error('This profile reader cannot execute changes.');
  if(!navigator.locks)throw Error('This browser cannot safely lock station changes');
  return navigator.locks.request('nexus-building-mutations',{ifAvailable:true},async globalLock=>{
  if(!globalLock)throw Error('Another building or training operation is active.');
  return navigator.locks.request('nexus-station-profile-'+id,{ifAvailable:true},async lock=>{
   if(!lock)throw Error('Another profile operation is running for this station');
   if(!buyOnly&&!window.__NEXUS_ASSIGN_CREW__?.profileCrew)throw Error('Crew assignment module unavailable; refresh the game');
   if(window.__NEXUS_ASSIGN_CREW__?.isRunning()||document.getElementById('nx-station-rename')?.textContent==='Stop renaming')throw Error('Wait for the existing naming or crew operation to finish');
   window.__NEXUS_PROFILE_BUSY__=true;
   try{
   const fresh=await review(plan.profile,null,report);
   if(allowCreditPriceChanges){reconcileBatchApproval(fresh,approvalKey(plan,{allowCreditPriceChanges:true}),report);plan={...plan,remove:fresh.remove};}
   else if(fresh.signature!==plan.signature)throw Error('Station fleet changed. Review the new plan before confirming.');
   let spent=0;
   if(plan.profile.maxLevel){
    const level=fresh.level,approved=plan.level;
    if(!approved||level.target!==approved.target||(!allowCreditPriceChanges&&level.cost>approved.cost)||level.action?.path!==approved.action?.path)throw Error('Station level'+(allowCreditPriceChanges?'':' or price')+' changed. Review again; no purchase sent.');
    if(level.action&&!cancelled()){
      const U=globalThis.NexusBuildingUpgradesCore,path=U.actionPath(level.action.path,id,'level');if(!path||level.action.method!=='get')throw Error('Level purchase control changed.');
      report('Upgrading '+fresh.stationName+' from level '+level.current+' to '+level.target+' · '+level.cost.toLocaleString()+' credits');
      await journal({kind:'level',target:level.target,at:Date.now()});if(cancelled()){await journal(null);return {spent,stopped:true};}
      let responseError;try{await request(path);}catch(error){responseError=error;}
      const after=U.station(await html('/buildings/'+id),id);if(after.level!==level.target)throw Error('Level purchase outcome uncertain; no retry sent. '+(responseError?.message||''));await journal(null);spent+=level.cost;report('Level '+level.target+' verified. Applying profile vehicles next.');
    }
   }
   for(const initial of buyOnly?[]:plan.remove){if(cancelled())break;const rows=await fleet(),v=rows.find(x=>String(x.id)===String(initial.id));if(!v){report('Vehicle '+initial.id+' already absent; no deletion sent');continue;}
    if(v.vehicle_type!==initial.vehicle_type||v.fms_real!==2||v.mission_id||(v.target_type==='mission'&&v.target_id)){report(v.caption+': removal skipped — vehicle state changed');continue;}
    const page=await html('/vehicles/'+v.id),link=[...page.querySelectorAll('a[data-method="delete"]')].find(a=>a.getAttribute('href')==='/vehicles/'+v.id);
    if(!link||!link.getAttribute('data-confirm')){report(v.caption+': native delete control unavailable; left unchanged');continue;}
    const now=await json('/api/vehicles/'+v.id);if(String(now.building_id)!==id||now.fms_real!==2||now.mission_id||(now.target_type==='mission'&&now.target_id)||now.vehicle_type!==v.vehicle_type){report(v.caption+': removal skipped — vehicle changed');continue;}
    const csrf=token(page);if(cancelled())break;await journal({kind:'delete',id:String(v.id),at:Date.now()});await request(link.getAttribute('href'),{method:'POST',headers:{'X-CSRF-Token':csrf,'Content-Type':'application/x-www-form-urlencoded'},body:'_method=delete'});
    if((await fleet()).some(x=>String(x.id)===String(v.id)))throw Error('Deletion not verified for '+v.caption+'; no retry sent');await removeRegister(v.id);await journal(null);report('Removed '+v.caption+' (#'+v.id+')');
   }
   for(const wanted of plan.buy){for(let n=0;n<wanted.count&&!cancelled();n++){
    const before=await fleet(),have=before.filter(v=>String(v.vehicle_type)===wanted.type).length,goal=profileTypeTarget(plan.profile,wanted.type);if(have>=goal)break;
    const marketPage=await html('/buildings/'+id+'/vehicles/new'),offer=market(marketPage)[wanted.type],approved=plan.offers[wanted.type];
    if(!offer||!approved||!offer.enabled){report(D.vehicles[wanted.type].name+': purchase unavailable — check bays, extension and credits');break;}
    if(!allowCreditPriceChanges&&(offer.price>approved.price||spent+offer.price>plan.cost)){report(offer.name+': price changed — review again');break;}
    if(!Number.isSafeInteger(spent+offer.price))throw Error('Credit total exceeds the supported limit.');
    if(allowCreditPriceChanges&&offer.price!==approved.price)report(offer.name+': credit price updated from '+approved.price.toLocaleString()+' to '+offer.price.toLocaleString()+'. Continuing at the current game price.');
    // The native enabled credit offer is authoritative, as in Home Response quick buy.
    // Market fragments do not reliably include the navbar credit balance.
    if(cancelled())break;await journal({kind:'buy',type:wanted.type,before:before.map(v=>String(v.id)),at:Date.now()});await request(offer.href);const after=await fleet(),old=new Set(before.map(v=>String(v.id))),added=after.filter(v=>!old.has(String(v.id)));
    if(added.length!==1||String(added[0].vehicle_type)!==wanted.type)throw Error('Purchase outcome uncertain for '+offer.name+'; stopped without retrying');await journal(null);spent+=offer.price;report('Bought '+offer.name+' (#'+added[0].id+') · '+offer.price.toLocaleString()+' credits');
   }}
   if(buyOnly){report((cancelled()?'Stopped':'Quick buy finished')+' · '+spent.toLocaleString()+' credits spent.');return {spent,stopped:cancelled()};}
   let namingBase='';if(plan.profile.rename&&!cancelled()){try{namingBase=await globalThis.NexusNaming.resolveBase(plan.stationName,id);}catch(error){report('Naming needs review: '+error.message);}}
   const rows=await fleet(),counts={},targets=[],profileTypes=new Set(plan.profile.units.map(unit=>unit.type));
   const allocation=C.allocate(plan.profile,rows,D),assignmentByVehicle=new Map(allocation.assignments.map(item=>[String(item.vehicle.id),item.unit]));
   for(const shortage of allocation.shortages)report(D.vehicles[shortage.unit.type].name+' — '+roleLabel(shortage.unit)+': '+shortage.count+' role vehicle'+(shortage.count===1?' is':'s are')+' unavailable; crew target not applied.');
   for(const v of rows.sort((a,b)=>a.id-b.id)){if(!profileTypes.has(String(v.vehicle_type)))continue;const unit=assignmentByVehicle.get(String(v.id)),key=D.naming[v.vehicle_type]?.code||String(v.vehicle_type);counts[key]=(counts[key]||0)+1;
    if(cancelled())break;if(v.fms_real!==2||v.mission_id||(v.target_type==='mission'&&v.target_id)){report(v.caption+': naming and crew skipped — vehicle away or on mission');continue;}
    const now=await json('/api/vehicles/'+v.id);if(String(now.building_id)!==id||now.fms_real!==2||now.mission_id||(now.target_type==='mission'&&now.target_id)){report(v.caption+': changed during checks; skipped');continue;}
    if(plan.profile.rename&&namingBase)report('Vehicle '+v.id+': '+await rename(v,counts[key],namingBase,cancelled));
    if(!unit){report((v.caption||D.vehicles[v.vehicle_type]?.name||('Vehicle '+v.id))+': extra allowed vehicle — existing crew left unchanged');continue;}
    report((v.caption||D.vehicles[v.vehicle_type]?.name||('Vehicle '+v.id))+': role '+roleLabel(unit)+' · '+unit.crew+' crew'+(unit.training.length?' · '+unit.training.join(', '):' · no required training'));
    targets.push({id:v.id,crew:unit.crew,training:unit.training,max:plan.offers[unit.type]?.max??D.vehicles[unit.type].max,role:roleLabel(unit)});
   }
   if(!cancelled())await window.__NEXUS_ASSIGN_CREW__.profileCrew(targets,report,cancelled);
   report((cancelled()?'Stopped':'Profile pass finished')+' · '+spent.toLocaleString()+' credits spent. Read any blocked steps above.');
   return {spent,stopped:cancelled(),missingVehicles:allocation.shortages.reduce((n,s)=>n+s.count,0)};
   }finally{window.__NEXUS_PROFILE_BUSY__=false;}
  });
  });
 }
 return {review,apply,market,approvalKey,reconcileBatchApproval};
 }
 globalThis.NexusStationProfilesEngineFactory={create};
 const id=location.pathname.match(/^\/buildings\/(\d+)\/?$/)?.[1];if(id&&!/^mcn-v3-/.test(window.name||''))globalThis.NexusStationProfilesEngine=create(id);
})();

