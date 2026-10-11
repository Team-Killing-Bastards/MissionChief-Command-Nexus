/* User-opened profile editor and explicit, reviewed station application. */
(()=>{'use strict';
 if(/^mcn-v3-/.test(window.name||''))return;
 const C=globalThis.NexusStationProfilesCore,D=globalThis.NexusStationProfilesData;if(!C||!D)return;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const player=()=>{try{return window.top.document.querySelector('#navbar_profile_link')?.getAttribute('href')?.match(/\/profile\/(\d+)/)?.[1]||'';}catch{return '';}};
 function key(){const id=player();if(!id)throw Error('Open the main game page to identify your player before using profiles.');return 'nexusStationProfilesV1:'+id;}
 const store=globalThis.NexusStationProfilesStore;
 async function read(){return store.read(key());}
 async function save(profile){const p=C.validate(profile,D);p.id=p.id||crypto.randomUUID();return store.save(key(),p);}
 function number(value,max){const n=el('input');n.type='number';n.min='0';n.max=String(max);n.value=String(value);n.style.width='70px';return n;}
 function mountEditor(root){
  root.replaceChildren();
  root.classList.add('nx-profile-editor');
  const style=el('style');
  style.textContent='.nx-profile-editor{color:#e6f1ff}.nx-profile-editor fieldset{min-width:0;background:#203a58;border:1px solid #5b86af;border-radius:9px;padding:14px;margin:20px 0}.nx-profile-editor legend{font-size:14px;font-weight:700;width:auto;color:inherit;border:0;padding:0 6px;margin:0}.nx-profile-editor .profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.nx-profile-editor .profile-field{display:flex;flex-direction:column;gap:7px;font-weight:600}.nx-profile-editor input:not([type=checkbox]),.nx-profile-editor select{box-sizing:border-box;max-width:100%;width:100%;background:#233e5e;color:#fff;border:1px solid #618db4;border-radius:5px;padding:9px}.nx-profile-editor input[type=checkbox]{width:17px;height:17px;accent-color:#32b8e8}.nx-profile-editor .profile-scroll{max-height:430px;overflow:auto;border:1px solid #567ea3;border-radius:7px}.nx-profile-editor table{border-collapse:collapse;width:100%;font-size:13px}.nx-profile-editor th{position:sticky;top:0;background:#2e4a6b;padding:10px;text-align:left;z-index:1}.nx-profile-editor td{border-top:1px solid #526c87;padding:9px;vertical-align:top}.nx-profile-editor small{display:block;color:#adc5df;padding-top:5px}.nx-profile-editor .profile-courses label{display:block;margin:6px 0}.nx-profile-editor .profile-courses{max-width:240px}.nx-profile-editor summary{cursor:pointer}.nx-profile-editor .profile-bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0}.nx-profile-editor .profile-bar input{max-width:320px}.nx-profile-editor .profile-role{min-width:125px}.nx-profile-editor .profile-row-action{white-space:nowrap}.nx-profile-editor button{margin-right:8px}@media(max-width:600px){.nx-profile-editor .profile-grid{grid-template-columns:1fr}.nx-profile-editor table{min-width:860px}}';
  root.append(style,el('h2','Building Profiles'),el('p','Create station fleet and staffing targets. Applying a profile is always reviewed from the station screen first.'));

  const saved=el('select'),name=el('input'),type=el('select'),rows=el('div'),note=el('p');
  note.setAttribute('role','status');
  name.placeholder='Profile name';name.maxLength=100;name.setAttribute('aria-label','Profile name');
  saved.setAttribute('aria-label','Saved profile');type.setAttribute('aria-label','Profile building type');
  const purpose=el('input'),naming=el('input');purpose.placeholder='Any / standard';purpose.maxLength=100;naming.type='checkbox';naming.checked=true;
  const toolbar=el('div');toolbar.className='profile-bar';toolbar.append(el('span','Saved profile'),saved);root.append(toolbar);
  const details=el('fieldset'),grid=el('div');details.append(el('legend','Profile details'));grid.className='profile-grid';
  for(const [text,input]of [['Profile name',name],['Profile type',type],['Specialisation / note (optional)',purpose]]){const label=el('label',text);label.className='profile-field';label.append(input);grid.append(label);}
  const namingLabel=el('label');namingLabel.append(naming,document.createTextNode(' Run Nexus vehicle naming'));grid.append(namingLabel);
  details.append(grid,el('small','Specialisation is a profile label. Applying a profile does not purchase or activate building extensions.'));
  root.append(details,rows);
  const button=el('button','Save profile');button.type='button';root.append(button,note);

  let profileId='',inputs=[];
  const multiRoleTypes=new Set(C.multiRoleTypes||[]);
  for(const [id,building]of Object.entries(D.buildings))type.append(new Option(building,id));

  async function choices(selected=''){
   saved.replaceChildren(new Option('New profile',''));
   for(const profile of await read())saved.append(new Option(profile.name+' · '+D.buildings[profile.buildingType],profile.id));
   saved.value=selected;
  }

  function draw(profile){
   rows.replaceChildren();inputs=[];
   const section=el('fieldset');section.append(el('legend','Vehicles and staffing'));
   const bar=el('div'),search=el('input');search.placeholder='Filter vehicles';search.setAttribute('aria-label','Filter vehicles');bar.className='profile-bar';
   bar.append(search,el('span','Tick Use, then set the target quantity. Crew is per vehicle.'));
   section.append(bar,el('small','Extra vehicles of allowed types stay. Existing crew stays. IRVs can be split into role groups such as Daily use, Inspectors and Search Advisors. Group counts are added together; trained groups are allocated first. Extra IRVs outside a split role target keep their current crew.'));
   const scroll=el('div'),table=el('table'),head=el('thead'),header=el('tr'),body=el('tbody');scroll.className='profile-scroll';
   for(const title of ['Use','Vehicle','Role / use','Units','Crew per unit','Assign crew','Required training',''])header.append(el('th',title));
   head.append(header);table.append(head,body);scroll.append(table);section.append(scroll);rows.append(section);

   const refreshSearch=()=>{
    const query=search.value.trim().toLowerCase();
    for(const row of body.children)row.hidden=!row.dataset.name.includes(query);
   };

   function refreshRoleButtons(vehicleType){
    const active=inputs.filter(input=>input.id===vehicleType&&input.line.isConnected);
    for(const input of active){if(input.addButton)input.addButton.disabled=active.length>=10;}
   }

   function addVehicleRow(id,vehicle,value=null,{primary=false,focusRole=false}={}){
    const repeatable=multiRoleTypes.has(id),line=el('tr'),enabled=el('input');line.dataset.type=id;
    enabled.type='checkbox';enabled.checked=!!value;enabled.setAttribute('aria-label','Use '+vehicle.name+(value?.role?' for '+value.role:''));

    const caption=el('div',vehicle.name);caption.append(el('small','Type ID '+id+' · max crew '+vehicle.max));
    const role=el('input');role.type='text';role.maxLength=60;role.className='profile-role';role.placeholder=repeatable?'e.g. Daily use':'Standard';role.value=String(value?.role||'');role.disabled=!repeatable;
    role.setAttribute('aria-label',vehicle.name+' role');

    const count=number(value?.count||1,100),crew=number(value?.crew||vehicle.max,vehicle.max),assign=el('input');
    assign.type='checkbox';assign.checked=!!value?.crew;assign.setAttribute('aria-label','Assign crew '+vehicle.name+(role.value?' for '+role.value:''));
    count.min='1';crew.min=vehicle.max===0?'0':'1';
    count.setAttribute('aria-label',vehicle.name+' vehicles'+(role.value?' for '+role.value:''));
    crew.setAttribute('aria-label',vehicle.name+' trained crew each'+(role.value?' for '+role.value:''));

    const trainingDetails=el('details'),trainingSummary=el('summary','Choose training');trainingDetails.append(trainingSummary);const trainings=[];
    const showTraining=()=>{const selected=trainings.filter(training=>training.cb.checked).map(training=>training.name);trainingSummary.textContent=selected.length?selected.join(', '):'None · choose';};
    for(const training of D.training){const label=el('label'),cb=el('input');cb.type='checkbox';cb.checked=(value?.training||vehicle.training||[]).includes(training);cb.onchange=showTraining;label.append(cb,document.createTextNode(' '+training));trainingDetails.append(label);trainings.push({name:training,cb});}
    showTraining();trainingDetails.className='profile-courses';

    const actionCell=el('td'),entry={id,enabled,role,count,crew,assign,trainings,line,addButton:null};
    if(repeatable&&primary){
     const add=el('button','+ Add IRV role');add.type='button';add.className='profile-row-action';entry.addButton=add;
     add.onclick=()=>{
      if(!enabled.checked){enabled.checked=true;sync();}
      if(!role.value.trim())role.value='Daily use';
      const created=addVehicleRow(id,vehicle,{role:'',count:1,crew:vehicle.max,training:[]},{primary:false,focusRole:true});
      const sameTypeRows=[...body.querySelectorAll('tr[data-type="'+id+'"]')].filter(row=>row!==created.line);
      const lastRow=sameTypeRows[sameTypeRows.length-1];if(lastRow)body.insertBefore(created.line,lastRow.nextSibling);
      const createdIndex=inputs.indexOf(created);if(createdIndex>=0)inputs.splice(createdIndex,1);
      let insertAt=inputs.length;for(let index=inputs.length-1;index>=0;index--){if(inputs[index].id===id){insertAt=index+1;break;}}inputs.splice(insertAt,0,created);
      refreshRoleButtons(id);refreshSearch();
     };
     actionCell.append(add);
    }else if(repeatable){
     const remove=el('button','Remove role');remove.type='button';remove.className='profile-row-action';
     remove.onclick=()=>{line.remove();refreshRoleButtons(id);refreshSearch();};
     actionCell.append(remove);
    }

    for(const node of [enabled,caption,role,count,crew,assign,trainingDetails]){const cell=el('td');cell.append(node);line.append(cell);}
    line.append(actionCell);body.append(line);inputs.push(entry);

    const updateSearchKey=()=>{line.dataset.name=(vehicle.name+' '+role.value).toLowerCase();refreshSearch();};
    const sync=()=>{
     count.disabled=!enabled.checked;
     role.disabled=!enabled.checked||!repeatable;
     assign.disabled=!enabled.checked||vehicle.max===0;
     crew.disabled=!enabled.checked||!assign.checked;
     for(const training of trainings)training.cb.disabled=!enabled.checked;
     line.style.opacity=enabled.checked?'1':'.8';
     updateSearchKey();
    };
    enabled.onchange=sync;assign.onchange=sync;role.oninput=()=>{enabled.setAttribute('aria-label','Use '+vehicle.name+(role.value?' for '+role.value:''));updateSearchKey();};sync();
    if(focusRole)setTimeout(()=>role.focus(),0);
    return entry;
   }

   for(const [id,vehicle]of Object.entries(D.vehicles).filter(([,vehicle])=>vehicle.buildings.includes(Number(type.value)))){
    const values=(profile?.units||[]).filter(unit=>unit.type===id);
    if(values.length){values.forEach((value,index)=>addVehicleRow(id,vehicle,value,{primary:index===0}));}
    else addVehicleRow(id,vehicle,null,{primary:true});
    refreshRoleButtons(id);
   }
   search.oninput=refreshSearch;
  }

  saved.onchange=async()=>{try{const profile=(await read()).find(item=>item.id===saved.value);profileId=profile?.id||'';name.value=profile?.name||'';purpose.value=profile?.specialisation||'';naming.checked=profile?.rename!==false;if(profile)type.value=profile.buildingType;draw(profile);note.textContent='';}catch(error){note.textContent=error.message;}};
  type.onchange=()=>draw(null);
  button.onclick=async()=>{
   button.disabled=true;
   try{
    const profile=await save({
     id:profileId,
     name:name.value,
     buildingType:type.value,
     specialisation:purpose.value,
     rename:naming.checked,
     units:inputs.filter(input=>input.line.isConnected&&input.enabled.checked).map(input=>({
      type:input.id,
      role:input.role.value,
      count:Number(input.count.value),
      crew:input.assign.checked?Number(input.crew.value):0,
      training:input.trainings.filter(training=>training.cb.checked).map(training=>training.name)
     }))
    });
    profileId=profile.id;await choices(profile.id);note.textContent='Saved '+profile.name+'. Open a matching station to review it.';
   }catch(error){note.textContent=error.message;}finally{button.disabled=false;}
  };
  draw(null);choices().catch(error=>note.textContent=error.message);
 }
 globalThis.NexusStationProfiles={mountEditor};
 const stationId=location.pathname.match(/^\/buildings\/(\d+)\/?$/)?.[1],engine=globalThis.NexusStationProfilesEngine;if(!stationId||!engine)return;
 const market=[...document.querySelectorAll('a')].find(a=>/Vehicle Market/i.test(a.textContent));if(!market)return;
 const bar=el('span');bar.id='nx-station-profile-picker';bar.style.cssText='display:inline-flex;align-items:center;gap:4px;flex-wrap:wrap;margin-left:6px;vertical-align:middle';
 const panel=el('section');panel.id='nx-station-profiles';panel.hidden=true;panel.style.cssText='background:#102638;color:#e4f3ff;border:1px solid #618aa0;padding:12px;margin:12px 0';
 const select=el('select'),refresh=el('button','↻'),review=el('button','Review'),note=el('p'),detail=el('div'),close=el('button','Close review');select.setAttribute('aria-label','Station profile');select.title='Building profile';select.style.maxWidth='220px';refresh.title='Refresh saved profiles';refresh.setAttribute('aria-label','Refresh saved profiles');
 for(const n of [select,refresh,review,close]){n.style.cssText+=';background:#244964;color:white;border:1px solid #7498b2;border-radius:4px;padding:4px 7px;font-size:12px';if(n.tagName==='BUTTON')n.type='button';}
 bar.append(select,review,refresh);(document.getElementById('nx-station-rename')||market).after(bar);
 panel.append(el('h4','Review building profile'),close,note,detail);bar.parentElement.append(panel);
 close.onclick=()=>{if(!busy)panel.hidden=true;};
 let station=null,fleet=null,busy=false,stop=false;
 window.addEventListener('pagehide',()=>{stop=true;});
 async function json(url){const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),15000);try{const r=await fetch(url,{credentials:'same-origin',cache:'no-store',redirect:'error',signal:ac.signal});if(!r.ok)throw Error('Game HTTP '+r.status);return await r.json();}finally{clearTimeout(timer);}}
 async function load(){const all=await json('/api/buildings');if(!Array.isArray(all))throw Error('Building list unavailable');station=all.find(x=>String(x.id)===stationId);if(!station)throw Error('Station identity unavailable');select.replaceChildren(new Option('Select profile…',''));for(const p of (await read()).filter(p=>p.buildingType===String(station.building_type)))select.append(new Option(p.name,p.id));review.disabled=select.options.length<=1;select.title=select.options.length>1?'Select a saved building profile':'Create a profile in Nexus Tools → Profiles';note.textContent=select.options.length>1?'Select a profile to compare with the current fleet.':'No profiles saved for '+(D.buildings[station.building_type]||'this building type')+'. Create one in Nexus Tools → Profiles.';}
 refresh.onclick=()=>load().catch(e=>{panel.hidden=false;note.textContent=e.message;});
 select.onchange=()=>{if(!busy){detail.replaceChildren();panel.hidden=true;review.disabled=!select.value;}};
 review.onclick=async()=>{if(busy)return;panel.hidden=false;review.disabled=true;detail.replaceChildren();try{if(!station)await load();const p=(await read()).find(p=>p.id===select.value);if(!p)throw Error('Select a saved profile.');const plan=await engine.review(p);detail.replaceChildren();
   const total=el('strong','Total missing vehicles: '+plan.cost.toLocaleString()+' credits'+(plan.unknownCost?' + unpriced types (skipped)':''));total.style.cssText='display:block;font-size:18px;margin:12px 0';detail.append(total);
   const quick=el('button','Quick buy missing vehicles · '+plan.cost.toLocaleString()+' credits');quick.type='button';quick.disabled=!plan.buy.length;detail.append(quick,el('p','Quick buy purchases missing vehicles only.'));
   const crewTargets=plan.profile.units.map(unit=>D.vehicles[unit.type].name+(unit.role?' — '+unit.role:'')+': '+unit.count+' vehicle'+(unit.count===1?'':'s')+' × '+unit.crew+' crew each'+(unit.training.length?' · '+unit.training.join(', '):' · no required training'));
   const roleAllocation=plan.profile.units.map(unit=>{const assigned=plan.allocation.assignments.filter(item=>item.unit===unit),groupCount=plan.profile.units.filter(other=>other.type===unit.type).length;return D.vehicles[unit.type].name+(unit.role?' — '+unit.role:'')+': '+(groupCount>1?assigned.length+'/'+unit.count:assigned.length+' current · target '+unit.count)+' vehicle'+(assigned.length===1?'':'s')+(assigned.length?' · '+assigned.map(item=>(item.vehicle.caption||('#'+item.vehicle.id))).join(', '):'');});
   for(const [heading,items]of [['Keep',plan.keep.map(v=>v.caption||D.vehicles[v.vehicle_type]?.name||String(v.id))],['Remove after approval',plan.remove.map(v=>(v.caption||String(v.id))+' · #'+v.id)],['Purchase with credits',plan.buy.map(v=>v.count+' × '+D.vehicles[v.type].name)],['Blocked',plan.blocked.map(x=>(x.vehicle.caption||x.vehicle.id)+' · '+x.reason)],['Crew targets',crewTargets],['Current role allocation',roleAllocation]]){detail.append(el('h4',heading));const list=el('ul');for(const text of items)list.append(el('li',text));if(!items.length)list.append(el('li','None'));detail.append(list);}
   for(const u of plan.buy)detail.append(el('p',D.vehicles[u.type].name+': '+(plan.offers[u.type]?plan.offers[u.type].price.toLocaleString()+' credits each; '+(plan.offers[u.type].enabled?'available now':'currently blocked by the game'):'no verified offer — skipped')));
   note.textContent='Review for '+plan.stationName+'. Maximum purchase spend: '+plan.cost.toLocaleString()+' credits.'+(plan.unknownCost?' Types with no verified price will be skipped.':'')+(plan.profile.rename?' Kept vehicles will use Nexus naming rules.':' Naming is off.')+' Existing crew bindings are kept; only empty seats are filled. Trained role groups are allocated first. When a vehicle type is split into roles, extra same-type vehicles stay with their crew unchanged.';
   const approval=el('label'),check=el('input');check.type='checkbox';approval.append(check,document.createTextNode(' I confirm permanent removal of the '+plan.remove.length+' listed vehicles and the purchases above.'));
   const apply=el('button','Confirm and apply profile'),halt=el('button','Stop'),log=el('div');apply.disabled=true;halt.hidden=true;check.onchange=()=>{apply.disabled=!check.checked;};detail.append(approval,el('br'),apply,halt,log);
   halt.onclick=()=>{stop=true;halt.disabled=true;note.textContent='Stopping after the current change is verified…';};
   const execute=async(buyOnly)=>{if(busy||(!buyOnly&&!check.checked))return;busy=true;stop=false;quick.disabled=true;apply.disabled=true;check.disabled=true;review.disabled=true;refresh.disabled=true;select.disabled=true;halt.hidden=false;
    try{await engine.apply(plan,text=>{log.append(el('p',text));note.textContent=text;},()=>stop||!panel.isConnected,buyOnly);}
    catch(e){note.textContent='Stopped: '+e.message;log.append(el('p',note.textContent));}
    finally{busy=false;review.disabled=false;refresh.disabled=false;select.disabled=false;halt.hidden=true;}
   };
   apply.onclick=()=>execute(false);quick.onclick=()=>execute(true);
  }catch(e){note.textContent=e.message;if(await store.pending('nexusStationProfilePending:'+stationId)){const reset=el('button','I checked the station — clear checkpoint');reset.onclick=async()=>{if(window.confirm('Only continue after checking this station in the game and confirming the earlier request is no longer pending. Clear the checkpoint and require a fresh review?')){await store.checkpoint('nexusStationProfilePending:'+stationId,null);detail.replaceChildren();note.textContent='Checkpoint cleared. Review current vehicles again before applying.';}};detail.append(reset);}}finally{review.disabled=false;}};
 load().catch(e=>{panel.hidden=false;note.textContent=e.message;});
})();
