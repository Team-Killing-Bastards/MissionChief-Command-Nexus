/* Saved staging-area fleet profiles and a user-initiated map placement flow. */
(()=>{'use strict';
  if(globalThis.NexusStagingProfiles)return;
  try{let frame=window;while(true){if(/^mcn-v3-/.test(frame.name||''))return;if(frame===frame.top)break;frame=frame.parent;}}catch{return;}
  const store=globalThis.NexusStationProfilesStore;
  const make=(tag,text,doc=document)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const player=()=>{try{return window.top.document.querySelector('#navbar_profile_link')?.getAttribute('href')?.match(/\/profile\/(\d+)/)?.[1]||'';}catch{return '';}};
  const key=()=>{const id=player();if(!id)throw Error('Open the main game page so Nexus can identify the player.');return 'nexusStagingProfilesV1:'+id;};
  const read=async()=>{if(!store)throw Error('Staging profile storage has not loaded. Refresh MissionChief.');return store.read(key());};
  const vehicleCatalog=()=>globalThis.NexusStationProfilesData?.vehicles||{};
  const daysAllowed=new Set([1,2,3,7]);
  const durationText=days=>days===1?'24 hours':`${days} days`;
  function validate(profile){
    const name=clean(profile.name).slice(0,100),days=Number(profile.days);
    if(!name)throw Error('Enter a staging profile name.');
    if(!daysAllowed.has(days))throw Error('Choose 24 hours, 2, 3 or 7 days.');
    const units=(profile.units||[]).map(row=>({type:String(row.type),count:Number(row.count)}));
    if(!units.length||units.some(row=>!vehicleCatalog()[row.type]||!Number.isSafeInteger(row.count)||row.count<1||row.count>100))throw Error('Choose at least one vehicle type and a quantity from 1 to 100.');
    if(units.reduce((sum,row)=>sum+row.count,0)>500)throw Error('A staging profile can request at most 500 vehicles.');
    return {id:profile.id||crypto.randomUUID(),name,days,buildingType:'14',units};
  }
  function mountEditor(root){
    if(root.querySelector('#nx-staging-profile-editor'))return;
    const section=make('section');section.id='nx-staging-profile-editor';section.style.cssText='margin:24px 0;padding:16px;background:#203a58;border:1px solid #5b86af;border-radius:9px;color:#e6f1ff';
    section.append(make('h2','Staging area profiles'),make('p','Save a duration and the number of each vehicle type to send. These profiles do not buy vehicles or assign crew.'));
    const saved=make('select'),name=make('input'),days=make('select'),search=make('input'),rows=make('div'),note=make('p'),save=make('button','Save staging profile');
    saved.setAttribute('aria-label','Saved staging profile');name.placeholder='Profile name';name.maxLength=100;search.placeholder='Filter vehicle types';search.setAttribute('aria-label','Filter staging vehicles');
    for(const [value,label] of [[1,'24 hours'],[2,'2 days'],[3,'3 days'],[7,'7 days']])days.append(new Option(label,String(value)));
    const fields=make('div');fields.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:12px 0';
    for(const [title,input] of [['Saved staging profile',saved],['Profile name',name],['Duration',days]]){const label=make('label',title);label.style.cssText='display:grid;gap:5px';label.append(input);fields.append(label);}
    section.append(fields,search,rows,save,note);root.append(section);note.setAttribute('role','status');
    for(const input of [saved,name,days,search])input.style.cssText='width:100%;background:#233e5e;color:white;border:1px solid #618db4;border-radius:5px;padding:7px;box-sizing:border-box';
    save.type='button';save.style.cssText='margin-top:12px;background:#24678b;color:#fff;border:1px solid #7baac5;border-radius:5px;padding:8px';
    rows.style.cssText='max-height:360px;overflow:auto;margin-top:10px';
    let profileId='';const inputs=[];
    for(const [id,v] of Object.entries(vehicleCatalog())){
      const line=make('label');line.style.cssText='display:grid;grid-template-columns:22px minmax(0,1fr) 68px;align-items:center;gap:8px;padding:5px;border-bottom:1px solid #526c87';line.dataset.name=(v.name+' '+id).toLowerCase();
      const check=make('input'),count=make('input');check.type='checkbox';count.type='number';count.min='1';count.max='100';count.value='1';count.disabled=true;count.setAttribute('aria-label',v.name+' quantity');count.style.cssText='width:64px;background:#233e5e;color:#fff;border:1px solid #618db4;padding:4px';
      check.onchange=()=>{count.disabled=!check.checked;};line.append(check,make('span',v.name+' · type '+id),count);rows.append(line);inputs.push({id,check,count});
    }
    search.oninput=()=>{const q=search.value.trim().toLowerCase();for(const line of rows.children)line.hidden=!line.dataset.name.includes(q);};
    async function choices(selected=''){saved.replaceChildren(new Option('New staging profile',''));for(const p of await read())saved.append(new Option(p.name+' · '+durationText(p.days),p.id));saved.value=selected;}
    saved.onchange=async()=>{try{const p=(await read()).find(row=>row.id===saved.value);profileId=p?.id||'';name.value=p?.name||'';days.value=String(p?.days||1);for(const row of inputs){const chosen=p?.units?.find(unit=>unit.type===row.id);row.check.checked=!!chosen;row.count.disabled=!chosen;row.count.value=String(chosen?.count||1);}note.textContent='';}catch(e){note.textContent=e.message;}};
    save.onclick=async()=>{save.disabled=true;try{if(!store)throw Error('Staging profile storage has not loaded. Refresh MissionChief.');const p=validate({id:profileId,name:name.value,days:days.value,units:inputs.filter(row=>row.check.checked).map(row=>({type:row.id,count:row.count.value}))});await store.save(key(),p);profileId=p.id;await choices(p.id);note.textContent='Saved '+p.name+'. Open the staging icon on the map to use it.';}catch(e){note.textContent=e.message;}finally{save.disabled=false;}};
    choices().catch(e=>note.textContent=e.message);
  }
  globalThis.NexusStagingProfiles={mountEditor};


})();
