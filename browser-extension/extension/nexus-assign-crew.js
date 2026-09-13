/* User-triggered specialist crew assignment for the current building only. */
(() => {
  'use strict';
  const buildingId=location.pathname.match(/^\/buildings\/(\d+)\/?$/)?.[1];
  if(!buildingId||window.__NEXUS_ASSIGN_CREW__)return;
  try {let w=window;while(true){if(/^mcn-v3-(active-worker|pipeline-preload|retired-worker)-/.test(w.name||''))return;if(w===w.top)break;if(w.frameElement?.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload]'))return;w=w.parent;}}catch{return;}
  let running=false,stopped=false,message='',button,status,stopButton,refresh;
  const P=window.__NEXUS_PERSONNEL_READER__,D=window.__NEXUS_BUILDING_DATA__;
  if(!P||!D)return;
  const clean=x=>String(x||'').replace(/\s+/g,' ').trim();
  const integer=x=>x!==null&&x!==undefined&&x!==''&&Number.isSafeInteger(Number(x))&&Number(x)>=0?Number(x):null;
  function registerWriter(){let host=window;try{host=window.top;}catch{}const writer=host.__NEXUS_CREW_REGISTER__||window.__NEXUS_CREW_REGISTER__;if(!writer)throw Error('Training register writer unavailable; refresh the main game page');writer.ready();return writer;}
  function saveRegister(v,page){
    const labels=new Map();for(const type of Object.values(D))for(const rule of type.training)for(const label of [rule.name,...rule.aliases])labels.set(clean(label).toLowerCase(),rule.key);
    const profiles=page.rows.filter(p=>p.boundHere).map(p=>{if(!p.person.trainingKnown)throw Error('Assigned crew training could not be verified for the register');return [...new Set(p.person.training.map(label=>{const code=labels.get(clean(label).toLowerCase());if(!code)throw Error('Unrecognised crew training; register update stopped');return code;}))].sort();});
    registerWriter().save({vehicleId:String(v.id),vehicleTypeId:String(v.vehicle_type),buildingId,vehicleName:v.caption,stationName:clean(document.querySelector('h1')?.textContent),rowsSeen:page.rows.length,profiles});
  }
  const enabled=n=>!n.hidden&&!n.disabled&&!n.closest('[hidden],.hidden,.d-none')&&!/display\s*:\s*none|visibility\s*:\s*hidden/i.test(n.getAttribute('style')||'');
  const personId=row=>String(row.getAttribute('personal_id')||row.dataset.personalId||row.querySelector('[personal_id]')?.getAttribute('personal_id')||row.querySelector('[data-personal-id]')?.getAttribute('data-personal-id')||row.id.match(/^person(?:al)?_(\d+)$/)?.[1]||row.querySelector('input.personal-delete-checkbox')?.value||row.querySelector('a[href*="/personals/"]')?.getAttribute('href')?.match(/\/personals\/(\d+)/)?.[1]||row.querySelector('[href*="/zuweisungDo/"]')?.getAttribute('href')?.match(/\/zuweisungDo\/(\d+)/)?.[1]||'');
  function update(text=message){message=text;if(status)status.textContent=text;if(button)button.disabled=running;if(stopButton)stopButton.hidden=!running;}
  async function request(url,options={}){
    const parsed=new URL(url,location.origin);if(parsed.origin!==location.origin)throw Error('Unexpected assignment destination');
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
    try {const response=await fetch(parsed.href,{credentials:'same-origin',cache:'no-store',redirect:'error',...options,signal:abort.signal});
      if(!response.ok)throw Error(`Game returned HTTP ${response.status}`);
      const reader=response.body.getReader(),decoder=new TextDecoder();let raw='',size=0;
      try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>4*1024*1024){await reader.cancel();throw Error('Game response too large');}raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}return raw;
    }finally{clearTimeout(timer);}
  }
  const html=async url=>new DOMParser().parseFromString(await request(url),'text/html');
  function tableRows(doc){
    const table=doc.querySelector('#personal_table');if(!table)throw Error('Personnel table unavailable');
    if([...doc.querySelectorAll('.pagination a[href]')].some(a=>!a.closest('.disabled,.active')))throw Error('Personnel list is paginated; assignments stopped');
    return {table,rows:[...table.querySelectorAll('tbody tr')],layout:P.columns(table)};
  }
  function assignment(doc,vehicle){
    const {table,rows,layout}=tableRows(doc),parsed=[];const seen=new Set();
    for(const row of rows){const id=personId(row),person=P.read(row,layout,new Map(),String(vehicle.id));if(!person)continue;
      if(!/^\d+$/.test(id)||seen.has(id))throw Error('Personnel identities could not be verified');seen.add(id);
      const controls=[...row.querySelectorAll('a,button,input[type=submit]')].filter(enabled);
      const boundHere=controls.some(n=>n.classList.contains('btn-assigned')||/remove\s+binding/i.test(clean(n.textContent||n.value)));
      const elsewhere=controls.some(n=>n.classList.contains('btn-warning'))||(person.bound&&person.vehicle!==String(vehicle.id));
      const action=controls.find(n=>n.classList.contains('btn-success')&&!n.classList.contains('btn-assigned'));
      const raw=action?.getAttribute('href')||action?.getAttribute('formaction');let href='';
      if(raw){const u=new URL(raw,location.origin);if(u.origin===location.origin&&u.pathname===`/vehicles/${vehicle.id}/zuweisungDo/${id}`&&!u.search&&!u.hash)href=u.pathname;}
      parsed.push({id,person,boundHere,available:!boundHere&&!elsewhere&&!!href,href});
    }
    if(!parsed.length&&!/no (?:personnel|employees|staff)/i.test(table.textContent))throw Error('Personnel rows not recognised');
    return {rows:parsed,count:parsed.filter(p=>p.boundHere).length,csrf:doc.querySelector('meta[name="csrf-token"]')?.content||document.querySelector('meta[name="csrf-token"]')?.content||''};
  }
  async function vehicleNow(id){
    const v=JSON.parse(await request(`/api/vehicles/${id}`));
    if(String(v.id)!==String(id)||String(v.building_id)!==buildingId)throw Error('Vehicle no longer belongs to this station');
    const type=D[v.vehicle_type],max=integer(v.max_personnel_override)??type?.max;
    if(!type||!Number.isInteger(max)||max<1||max>100)throw Error(`Vehicle ${id}: capacity unavailable`);
    return {...v,max,type,fms_real:integer(v.fms_real),assigned_personnel_count:integer(v.assigned_personnel_count)};
  }
  async function run(){
    if(running)return;running=true;stopped=false;let assigned=0,checked=0;const results=[],registered=new Set();
    update('Reading current station vehicles and trained staff…');
    try {
      registerWriter();
      const fleet=JSON.parse(await request(`/api/buildings/${buildingId}/vehicles`));if(!Array.isArray(fleet))throw Error('Vehicle list unavailable');
      const doc=await html(`/buildings/${buildingId}/personals`),list=tableRows(doc),free=new Map();
      for(const row of list.rows){const p=P.read(row,list.layout),id=personId(row);if(p&&!p.bound&&p.trainingKnown&&p.training.length&&/^\d+$/.test(id))free.set(id,p);}
      const vehicles=fleet.filter(v=>String(v.building_id)===buildingId&&integer(v.fms_real)!==null&&integer(v.fms_real)!==6&&D[v.vehicle_type]?.training.length&&D[v.vehicle_type].max>0);
      vehicles.sort((a,b)=>D[b.vehicle_type].training.length-D[a.vehicle_type].training.length||a.id-b.id);
      for(const initial of vehicles){
        if(stopped)break;checked++;let added=0;
        while(!stopped){
          const v=await vehicleNow(initial.id);if(v.fms_real===6)break;
          const page=assignment(await html(`/vehicles/${v.id}/zuweisung`),v);
          if(v.assigned_personnel_count!==null&&page.count!==v.assigned_personnel_count)throw Error('Crew changed while reading; stopped to avoid an incorrect assignment');
          const required=v.type.training.map(rule=>rule.name),qualified=page.rows.filter(p=>p.boundHere&&P.matches(p.person,required)).length;
          if(page.count>=v.max){saveRegister(v,page);registered.add(v.id);results.push(`${clean(v.caption)||v.type.name}: ${page.count}/${v.max}${qualified<page.count?' — check existing crew training':''}`);break;}
          const candidates=page.rows.filter(p=>p.available&&free.has(p.id)&&P.matches(p.person,required)&&P.matches(free.get(p.id),required));
          candidates.sort((a,b)=>a.person.training.length-b.person.training.length||Number(a.id)-Number(b.id));
          const candidate=candidates[0];if(!candidate){saveRegister(v,page);registered.add(v.id);results.push(`${clean(v.caption)||v.type.name}: ${page.count}/${v.max} — no suitable unassigned trained staff`);break;}
          if(!page.csrf)throw Error('Assignment security token unavailable');
          if(stopped)break;
          registerWriter();
          update(`Vehicle ${checked}/${vehicles.length}: ${clean(v.caption)||v.type.name} · ${assigned} crew assigned…`);
          // Never retry a mutation. Re-read the authoritative binding after the one POST.
          await request(candidate.href,{method:'POST',headers:{'X-CSRF-Token':page.csrf,'X-Requested-With':'XMLHttpRequest','Accept':'text/html'}});
          const after=assignment(await html(`/vehicles/${v.id}/zuweisung`),v);
          if(!after.rows.some(p=>p.id===candidate.id&&p.boundHere)||after.count!==page.count+1)throw Error('Assignment outcome could not be verified; stopped without retrying');
          free.delete(candidate.id);assigned++;added++;
          saveRegister(v,after);registered.add(v.id);
          if(added>v.max)throw Error('Vehicle assignment limit reached');
        }
      }
      update(`${stopped?'Stopped':'Finished'}: ${assigned} crew assigned across ${checked} checked vehicles. Register updated for ${registered.size} vehicles.${!vehicles.length?' No active specialist vehicles to fill.':''}${results.length?' '+results.join(' · '):''}`);
    }catch(error){update(`Stopped: ${assigned} crew assignments verified. ${clean(error.message)}. Refresh before trying again.`);}
    finally{running=false;update();refresh?.();}
  }
  function mount(panel,onRefresh){
    refresh=onRefresh;button=document.createElement('button');button.type='button';button.id='nx-assign-crew';button.textContent='Assign crew';button.style.marginLeft='8px';button.title='Fill active specialist vehicles with suitable unassigned trained staff from this station';button.addEventListener('click',run);
    stopButton=document.createElement('button');stopButton.type='button';stopButton.textContent='Stop assigning';stopButton.style.marginLeft='8px';stopButton.addEventListener('click',()=>{stopped=true;update('Stopping after the current assignment is checked…');});
    status=document.createElement('p');status.id='nx-assign-crew-status';status.setAttribute('role','status');panel.append(button,stopButton);panel.parentElement.append(status);update();
  }
  window.addEventListener('pagehide',()=>{stopped=true;});
  async function readCoverage(fleet,signal){
    const coverage={};
    for(const v of fleet){
      if(signal?.aborted)break;
      if(Number(v.status)===6||!D[v.type]?.training.length||D[v.type].max===0)continue;
      try{const page=assignment(await html(`/vehicles/${v.id}/zuweisung`),v);const bound=page.rows.filter(p=>p.boundHere);
        if(bound.every(p=>p.person.trainingKnown))coverage[String(v.id)]={assigned:page.count,people:bound.map(p=>({training:p.person.training}))};
      }catch{/* Leave this vehicle unverified rather than guessing its crew. */}
    }
    return coverage;
  }
  window.__NEXUS_ASSIGN_CREW__={mount,readCoverage};
})();
