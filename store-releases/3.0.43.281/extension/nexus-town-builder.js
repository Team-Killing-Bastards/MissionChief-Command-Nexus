/* On-demand Home Response purchases. Each mutation is journalled before sending. */
(() => {
  'use strict';
  const C=globalThis.NexusTownCore, clean=C.clean;
  const blocked=n=>!n||n.matches('.disabled,[disabled],[aria-disabled="true"]');
  function price(text){const m=clean(text).match(/^(?:Build )?([\d,]+) Credits$/i);const n=m?Number(m[1].replaceAll(',','')):NaN;if(!Number.isSafeInteger(n)||n<0)throw Error('Credit price unavailable.');return n;}
  function local(path){const u=new URL(path,location.origin);if(u.origin!==location.origin||u.username||u.password)throw Error('Unexpected game destination.');return u;}
  function buildingForm(doc){
    const form=doc.querySelector('form#new_building'),button=doc.querySelector('#build_credits_22'),type=form?.querySelector('[name="building[building_type]"]');
    if(!form||!type||![...type.options].some(o=>o.value==='22')||blocked(button)||button.form!==form||local(form.getAttribute('action')).pathname!=='/buildings'||(form.method||'').toLowerCase()!=='post')throw Error('Home Response credit build control is unavailable.');
    const field=name=>form.querySelector('[name="'+name+'"]');
    if(!field('building[name]')||!field('building[latitude]')||!field('building[longitude]'))throw Error('Home Response form fields are unavailable.');
    return {form,button,cost:price(button.value||button.textContent),field};
  }
  function offer(doc,id,type){
    id=C.id(id);type=C.role(type).type;
    for(const a of doc.querySelectorAll('a.buy-vehicle-btn[href]')){
      const u=local(a.getAttribute('href'));if(u.pathname!==`/buildings/${id}/vehicle/${id}/${type}/credits`||u.searchParams.get('building')!==id||!a.closest('.vehicle_type'))continue;
      return {path:u.pathname+u.search,cost:price(a.textContent),enabled:!blocked(a)};
    }
    throw Error(C.role(type).name+' has no native credit offer at this Home Response Location.');
  }
  function create({request,fetchImpl=fetch,delay=ms=>new Promise(r=>setTimeout(r,ms))}){
    async function read(path,json=false){const u=local(path),r=await fetchImpl(u.href,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok||new URL(r.url||u.href).origin!==location.origin)throw Error('Game read failed: HTTP '+r.status);return json?r.json():new DOMParser().parseFromString(await r.text(),'text/html');}
    async function buildings(){const rows=await read('/api/buildings',true);if(!Array.isArray(rows)||rows.some(b=>!C.id(b.id)))throw Error('Building list unavailable.');return rows;}
    async function fleet(id){const rows=await read('/api/buildings/'+C.id(id)+'/vehicles',true);if(!Array.isArray(rows)||rows.some(v=>!C.id(v.id)||String(v.building_id)!==String(id)))throw Error('Station fleet unavailable.');return rows;}
    const journal=(site,value)=>request('journal',{key:site.key,value});
    const history=async site=>(await request('read',{keys:[site.key],includePlan:false})).journal[site.key];
    function vehicleCaption(site){
      const name=globalThis.NexusUnitNaming?.caption({stationName:site.name,buildingTypeId:22,vehicleTypeId:site.type,index:1});
      if(!name)throw Error('Vehicle naming rules are unavailable. Reload the updated Nexus extension before building.');return name;
    }
    const namingRecord=(site,buildingId,vehicleId)=>({stage:'naming',site,buildingId:String(buildingId),vehicleId:String(vehicleId),caption:vehicleCaption(site),attempted:false,token:crypto.randomUUID()});
    const hold=message=>Object.assign(Error(message),{townHeld:true});
    function recoverySite(site,saved){
      if(!['building','vehicle','naming','done'].includes(saved?.stage))return site;
      const old=saved.site;
      if(!old||old.key!==site.key||old.townId!==site.townId||old.type!==site.type||saved.stage==='done'&&!C.id(saved.buildingId))throw hold('Earlier build record does not identify this town and vehicle type. Check it before building.');
      try{C.town({id:old.townId,name:old.name,latitude:old.latitude,longitude:old.longitude});}catch{throw hold('Earlier build position is unavailable. Check the saved location before building.');}
      return {...old};
    }
    // Cache only within one read-only review/check. Never reuse fleets after a purchase.
    function fleetReader(){const pending=new Map();return id=>{const key=String(id);if(!pending.has(key))pending.set(key,fleet(key));return pending.get(key);};}
    const position=b=>({latitude:Number(b.latitude),longitude:Number(b.longitude)});
    const near=(a,b,metres)=>a&&b&&Number.isFinite(Number(b.latitude))&&Number.isFinite(Number(b.longitude))&&C.distance(a,position(b))<metres;
    const sameSite=(a,b)=>a&&b&&a.key===b.key&&a.townId===b.townId&&a.type===b.type&&a.name===b.name&&near(a,b,0.5);
    const townName=name=>clean(globalThis.NexusUnitNaming?.base(name)||name).toUpperCase();
    function townStations(rows){
      const byId=new Map(),byName=new Map();
      for(const b of rows){if(String(b.building_type)!=='22')continue;byId.set(String(b.id),b);const name=townName(b.caption);if(!byName.has(name))byName.set(name,[]);byName.get(name).push(b);}
      return {byId,byName};
    }
    async function existingRole(town,site,stations,saved,readFleet){
      // Finish an interrupted purchase/name at its verified site before calling it complete.
      if(['vehicle','naming'].includes(saved?.stage)&&saved.site?.key===site.key)return null;
      const names=new Set([townName(town.name),...C.roles.map(r=>townName(C.site(town,r.type).name))]);
      const matches=new Map(),recorded=stations.byId.get(saved?.buildingId);
      if(saved?.site?.townId===site.townId&&saved.site.type===site.type&&near(saved.site,recorded,12))matches.set(String(recorded.id),recorded);
      for(const name of names)for(const b of stations.byName.get(name)||[])if(near(town,b,2000))matches.set(String(b.id),b);
      const candidates=[...matches.values()].sort((a,b)=>Number(C.match(b,site))-Number(C.match(a,site)));
      for(const station of candidates){
        const unit=(await readFleet(station.id)).find(v=>String(v.vehicle_type)===site.type);
        if(unit)return {station,unit};
      }
      return null;
    }
    function excludedItem(town,site,match){return {town,site,buildingId:String(match.station.id),existingName:clean(match.station.caption),vehicleId:String(match.unit.id),caption:String(match.unit.caption||''),build:false,buy:false,rename:false,excluded:true,cost:0};}
    function heldItem(town,site,error){return {town,site,held:true,reason:error.message,build:false,buy:false,rename:false,cost:0};}
    async function lookup(site,rows,history,readFleet=fleet,town){
      if(history&&!sameSite(history.site,site))throw hold('This town has an earlier build at a different position, but no matching vehicle was verified there. Check the saved town before continuing.');
      if(history?.stage==='building'){
        if(!Array.isArray(history.before))throw hold('Earlier building record is incomplete. Check the saved location before building.');
        const before=new Set(history.before.map(String)),names=new Set([townName(site.name),townName(town?.name)]);
        // Reuse an existing location; never repeat the earlier build. Names may have
        // changed after purchase, and game coordinates may differ from the saved plan.
        const exact=rows.filter(b=>C.match(b,site)),candidates=exact.length?exact:rows.filter(b=>String(b.building_type)==='22'&&(
          !before.has(String(b.id))&&near(site,b,12)||town&&names.has(townName(b.caption))&&near(town,b,2000)));
        const found=[];
        for(const b of candidates){const units=await readFleet(b.id);if(!units.length||units.some(v=>String(v.vehicle_type)===site.type))found.push(b);}
        if(found.length!==1)throw hold(found.length?'Several locations could match the earlier build. Check these locations; no duplicate build will be sent.':candidates.length?'The earlier Home Response location has another vehicle type. Left unchanged.':'Earlier building request is still unverified: no matching location was found. Check the game, then review again. No duplicate build will be sent.');
        site.latitude=Number(found[0].latitude);site.longitude=Number(found[0].longitude);
        const done={stage:'done',site:{...site},buildingId:String(found[0].id)};await journal(site,done);return found[0];
      }
      if(history?.buildingId){
        const found=rows.find(b=>String(b.id)===history.buildingId);
        if(!found||String(found.building_type)!=='22'||!near(site,found,12))throw hold('Previously built location was removed or moved. Check it in the game before continuing.');
        if(history.stage==='vehicle'){
          const units=await readFleet(found.id),added=units.filter(v=>!history.before.includes(String(v.id)));
          if(added.length!==1||String(added[0].vehicle_type)!==site.type)throw hold('Earlier vehicle purchase is still unverified. No second purchase will be sent.');
          await journal(site,namingRecord(site,found.id,added[0].id));
        }
        return found;
      }
      const exact=rows.filter(b=>C.match(b,site));if(exact.length>1)throw hold('Multiple matching Home Response locations exist. Check the game.');
      if(!exact.length&&rows.some(b=>String(b.building_type)==='22'&&Number.isFinite(Number(b.latitude))&&Number.isFinite(Number(b.longitude))&&C.distance(site,{latitude:Number(b.latitude),longitude:Number(b.longitude)})<12))throw hold('An unrecognised Home Response location already occupies this position. Check its name before building; no duplicate sent.');return exact[0]||null;
    }
    async function needed(site,station){
      if(!station)return true;
      const units=await fleet(station.id);
      if(units.some(v=>String(v.vehicle_type)===site.type))return false;
      if(units.length)throw Error('The matching Home Response Location already has another vehicle. Left unchanged.');return true;
    }
    async function namingUnit(site,station){
      const units=(await fleet(station.id)).filter(v=>String(v.vehicle_type)===site.type);
      if(units.length!==1)throw Error(site.name+': expected one matching vehicle before naming. Review this station again.');return units[0];
    }
    async function inspect(site,station,readFleet=fleet){
      if(!station)return {buy:true,unit:null};
      const units=await readFleet(station.id),matching=units.filter(v=>String(v.vehicle_type)===site.type);
      if(matching.length>1)throw hold('Expected one matching vehicle before naming. Review this station again.');
      if(matching.length)return {buy:false,unit:matching[0]};
      if(units.length)throw hold('The matching Home Response Location already has another vehicle. Left unchanged.');return {buy:true,unit:null};
    }
    async function review(plan,type,dispatch,report=()=>{},cancelled=()=>false){
      plan=C.plan(plan);const role=C.role(type);if(dispatch&&!C.id(dispatch))throw Error('Choose a valid dispatch centre.');
      const towns=plan.towns.filter(t=>t.selected),sites=towns.map(t=>C.site(t,type));if(!sites.length)throw Error('Select at least one town.');
      const readFleet=fleetReader();
      const initial=await Promise.allSettled([request('read',{keys:sites.map(s=>s.key),includePlan:false}),buildings(),read('/buildings/new')]);
      const failed=initial.find(r=>r.status==='rejected');if(failed)throw failed.reason;
      const [state,rows,doc]=initial.map(r=>r.value),form=buildingForm(doc),stations=townStations(rows);
      const dc=form.field('building[leitstelle_building_id]');if(dispatch&&(!dc||![...dc.options].some(o=>o.value===dispatch)))throw Error('Dispatch centre is no longer available.');
      const sample=rows.find(b=>String(b.building_type)==='22');
      if(!sample)throw Error('Create your first Home Response Location in the game, then review again so Nexus can read its vehicle market.');
      const market=offer(await read('/buildings/'+sample.id+'/vehicles/new'),sample.id,role.type),items=new Array(sites.length);let next=0,error;
      // Three read-only station checks at a time. Purchases remain strictly sequential.
      const scan=async()=>{while(next<sites.length&&!error){const index=next++,town=towns[index];let site=sites[index];try{
        if(cancelled())throw Error('Review stopped.');report('Checking '+site.name+'…');
        const previous=state.journal[site.key],existing=await existingRole(town,site,stations,previous,readFleet);
        if(existing){items[index]=excludedItem(town,site,existing);report(site.name+' — '+role.code+' already exists at '+items[index].existingName+'; unticked for this role.');continue;}
        site=recoverySite(site,previous);const caption=vehicleCaption(site),station=await lookup(site,rows,previous,readFleet,town),{buy,unit}=await inspect(site,station,readFleet);
        if(previous?.stage==='building'&&station)report(site.name+' — existing location recovered; no new building needed.');
        const saved=previous?.stage==='vehicle'?await history(site):previous;
        if(saved?.stage==='naming'&&unit&&String(unit.id)!==saved.vehicleId)throw hold('The vehicle waiting for its name has changed. No replacement will be bought.');
        items[index]={town,site,buildingId:station?String(station.id):'',build:!station,buy,caption,rename:buy||String(unit.caption||'').trim()!==caption,vehicleId:unit?String(unit.id):'',beforeName:unit?String(unit.caption||'').trim():'',namingToken:saved?.stage==='naming'?saved.token:'',cost:(station?0:form.cost)+(buy?market.cost:0)};
      }catch(e){if(e.townHeld){items[index]=heldItem(town,site,e);report(site.name+' — Held: '+e.message);}else error??=Error(site.name+': '+(e?.message||String(e)));}}};
      await Promise.all(Array.from({length:Math.min(3,sites.length)},scan));if(error)throw error;
      return {items,role,dispatch,held:items.filter(i=>i.held).length,buildingCost:form.cost,vehicleCost:market.cost,total:items.reduce((n,i)=>n+i.cost,0)};
    }
    async function verify(check,message){
      for(let i=0;i<3;i++){if(i)await delay(700);try{const result=await check();if(result)return result;}catch{}}
      throw Error(message+' No retry was sent. Review again to check its outcome.');
    }
    async function mutate(path,options){try{await fetchImpl(local(path).href,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(30000),...options});}catch{} /* Readback is authoritative even after a lost response. */}
    function namingForm(doc,vehicleId,caption){
      const field=doc.querySelector('#vehicle_caption'),form=field?.closest('form'),raw=form?.getAttribute('action'),action=raw?local(raw):null;
      if(!field||field.disabled||field.readOnly||field.name!=='vehicle[caption]'||!form||action?.pathname!=='/vehicles/'+vehicleId||action.search||form.method.toLowerCase()!=='post'||form.querySelector('[name="_method"]')?.value.toLowerCase()!=='patch')throw Error('Vehicle name form does not match the purchased vehicle.');
      if(field.maxLength>=0&&caption.length>field.maxLength)throw Error('The Renamer name exceeds the game name limit. Vehicle retained; no shortened name was sent.');
      const token=form.querySelector('[name="authenticity_token"]')?.value||doc.querySelector('meta[name="csrf-token"]')?.content;
      if(!token)throw Error('Vehicle name save token is unavailable.');
      // Submit only the name and native save metadata; staffing and other settings are not rewritten.
      const body=new FormData();body.set('authenticity_token',token);body.set('_method','patch');body.set(field.name,caption);
      const submit=form.querySelector('input[type="submit"],button[type="submit"]');if(submit?.name&&!submit.disabled)body.set(submit.name,submit.value);
      return {path:action.pathname,body,token,current:field.value.trim()};
    }
    async function nameVehicle(item,station,report,cancelled){
      if(cancelled())return false;
      const {site}=item,unit=await namingUnit(site,station),id=String(unit.id),saved=await history(site);
      if(item.vehicleId&&id!==item.vehicleId||saved?.stage==='naming'&&id!==saved.vehicleId)throw Error(site.name+': vehicle changed after review. No naming save sent.');
      const caption=vehicleCaption(site);if(caption!==item.caption)throw Error('Vehicle naming rules changed. Review again.');
      const prepared=namingForm(await read('/vehicles/'+id+'/edit'),id,caption);
      if(prepared.current===caption){await journal(site,{stage:'done',site,buildingId:String(station.id),vehicleId:id,caption});report('Name verified: '+caption);return true;}
      if(item.buy&&!item.vehicleId&&saved?.stage!=='naming')throw Error(site.name+': a different vehicle appeared after review. Review again before naming it.');
      if(saved?.stage==='naming'&&saved.attempted&&saved.token!==item.namingToken)throw Error('The previous name save is unverified. Review again to retry naming only; no vehicle will be bought.');
      if(item.vehicleId&&prepared.current!==item.beforeName)throw Error(site.name+': vehicle name changed after review. Review again before replacing it.');
      if(cancelled())return false;
      const pending={...namingRecord(site,station.id,id),attempted:true};await journal(site,pending);
      if(cancelled()){await journal(site,{...pending,attempted:false});return false;}
      report('Naming '+caption+'…');await mutate(prepared.path,{method:'POST',body:prepared.body,headers:{'X-CSRF-Token':prepared.token,Accept:'text/html,application/xhtml+xml'}});
      await verify(async()=>namingForm(await read('/vehicles/'+id+'/edit'),id,caption).current===caption,site.name+': vehicle bought but its name was not verified.');
      await journal(site,{stage:'done',site,buildingId:String(station.id),vehicleId:id,caption});report('Name verified: '+caption);return true;
    }
    async function run(quote,report=()=>{},cancelled=()=>false,onExisting=()=>{}){
      if(!navigator.locks)throw Error('Reload the game to enable build coordination.');
      return navigator.locks.request('nexus-building-mutations',{ifAvailable:true},async lock=>{
        if(!lock)throw Error('Another building tool is running. Wait for it to finish.');
        let spent=0,completed=0,skipped=0,held=0;
        for(const item of quote.items){
          if(cancelled())break;
          if(item.held){held++;report(item.site.name+' — Held: '+item.reason);continue;}
          if(!item.build&&!item.buy&&!item.rename){completed++;skipped++;report(item.site.name+' — already complete; skipped.');continue;}
          const {site}=item;report('Checking '+site.name+'…');
          const [saved,rows]=await Promise.all([history(site),buildings()]),readFleet=fleetReader();
          const existing=await existingRole(item.town,site,townStations(rows),saved,readFleet);
          if(existing){const excluded=excludedItem(item.town,site,existing);completed++;skipped++;report(site.name+' — '+quote.role.code+' already exists at '+excluded.existingName+'; unticked for this role.');onExisting(excluded);continue;}
          let station;try{station=await lookup(site,rows,saved,readFleet,item.town);}catch(e){if(!e.townHeld)throw e;held++;const blocked=heldItem(item.town,site,e);onExisting(blocked);report(site.name+' — Held: '+e.message);continue;}
          if(!station){
            if(!item.build)throw Error(site.name+': station changed after review. Review again.');
            const doc=await read('/buildings/new'),b=buildingForm(doc);
            if(b.cost>quote.buildingCost||spent+b.cost>quote.total)throw Error('Building credit price increased. Review again.');
            const data=new FormData(b.form),set=(key,value)=>{const field=b.field(key);if(!field)throw Error('Required building control missing: '+key);data.set(key,value);};
            set('building[building_type]','22');set('building[name]',site.name);set('building[latitude]',String(site.latitude));set('building[longitude]',String(site.longitude));
            const dc=b.field('building[leitstelle_building_id]');if(quote.dispatch&&(!dc||![...dc.options].some(o=>o.value===quote.dispatch)))throw Error('Dispatch centre is unavailable.');if(dc)data.set(dc.name,quote.dispatch);
            if(b.field('building[address]'))data.set('building[address]',site.name);
            // Native credit/personal build form leaves both flags empty.
            data.set('build_with_coins','');data.set('build_as_alliance','');data.delete('build_another');data.set(b.button.name,b.button.value);
            const token=b.form.querySelector('[name="authenticity_token"]')?.value||doc.querySelector('meta[name="csrf-token"]')?.content;if(!token)throw Error('Game build token unavailable. No purchase sent.');
            if(!data.get('authenticity_token'))data.set('authenticity_token',token);
            if(cancelled())break;
            const pending={stage:'building',site,before:rows.filter(b=>String(b.building_type)==='22').map(b=>String(b.id))};await journal(site,pending);
            if(cancelled()){await journal(site,null);break;}
            report('Building '+site.name+'…');await mutate(b.form.getAttribute('action'),{method:'POST',body:data});spent+=b.cost;
            station=await verify(async()=>{const after=await buildings(),found=after.filter(b=>!pending.before.includes(String(b.id))&&C.match(b,site));return found.length===1?found[0]:null;},site.name+': building was not verified.');
            await journal(site,{stage:'done',site,buildingId:String(station.id)});
          }
          if(cancelled())break;
          if(await needed(site,station)){
            if(!item.buy)throw Error(site.name+': vehicle changed since review. Review again.');
            const doc=await read('/buildings/'+station.id+'/vehicles/new'),o=offer(doc,station.id,site.type);
            if(!o.enabled)throw Error(site.name+': selected vehicle is unavailable in the game.');
            if(o.cost>quote.vehicleCost||spent+o.cost>quote.total)throw Error('Vehicle credit price increased. Review again.');
            const before=await fleet(station.id);if(before.length)throw Error('Station fleet changed. Review again.');
            if(cancelled())break;
            const pending={stage:'vehicle',site,buildingId:String(station.id),before:before.map(v=>String(v.id))};await journal(site,pending);
            if(cancelled()){await journal(site,{stage:'done',site,buildingId:String(station.id)});break;}
            report('Buying '+quote.role.name+' at '+site.name+'…');await mutate(o.path,{method:'GET'});spent+=o.cost;
            const bought=await verify(async()=>{const added=(await fleet(station.id)).filter(v=>!pending.before.includes(String(v.id)));return added.length===1&&String(added[0].vehicle_type)===site.type?added[0]:null;},site.name+': vehicle purchase was not verified.');
            await journal(site,namingRecord(site,station.id,bought.id));
          }
          if(!await nameVehicle(item,station,report,cancelled))break;
          completed++;report(site.name+' — location, '+quote.role.code+' and vehicle name verified.');
        }
        return {spent,completed,skipped,held,stopped:cancelled()};
      });
    }
    return {review,run,buildings};
  }
  globalThis.NexusTownBuilder={create,buildingForm,offer,price};
})();
