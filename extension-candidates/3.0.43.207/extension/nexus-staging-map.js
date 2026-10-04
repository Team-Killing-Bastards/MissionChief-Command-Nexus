/* Saved staging-area fleet profiles and a user-initiated map placement flow. */
(()=>{'use strict';
  if(globalThis.__NEXUS_STAGING_MAP__)return; globalThis.__NEXUS_STAGING_MAP__=true;
  try{let frame=window;while(true){if(/^mcn-v3-/.test(frame.name||''))return;if(frame===frame.top)break;frame=frame.parent;}}catch{return;}
  const store=globalThis.NexusStationProfilesStore;
  const make=(tag,text,doc=document)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
  const player=()=>{try{let frame=window;while(true){const id=frame.document.querySelector('#navbar_profile_link')?.getAttribute('href')?.match(/\/profile\/(\d+)/)?.[1];if(id)return id;if(frame===frame.top)break;frame=frame.parent;}}catch{}return '';};
  const key=()=>{const id=player();if(!id)throw Error('Open the main game page so Nexus can identify the player.');return 'nexusStagingProfilesV1:'+id;};
  async function readDirect(profileKey){
    let database;
    try{
      const provider=window.top.indexedDB;
      if(!provider)throw Error('Browser profile storage is unavailable.');
      database=await new Promise((resolve,reject)=>{const request=provider.open('nexus-building-profiles',1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('records'))request.result.createObjectStore('records');};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Profile database could not open.'));});
      const value=await new Promise((resolve,reject)=>{const transaction=database.transaction('records','readonly'),request=transaction.objectStore('records').get(profileKey);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Saved profiles could not be read.'));});
      if(!value)return[];
      if(value.schema!==1||!Array.isArray(value.profiles))throw Error('Saved staging profile format is invalid.');
      return value.profiles;
    }finally{database?.close();}
  }
  const read=async()=>store?store.read(key()):readDirect(key());
  const vehicleCatalog=()=>globalThis.NexusStationProfilesData?.vehicles||{};
  const daysAllowed=new Set([1,2,3,7]);
  const durationText=days=>days===1?'24 hours':`${days} days`;
  function validate(profile){
    const name=clean(profile.name).slice(0,100),days=Number(profile.days);
    if(!name)throw Error('Enter a staging profile name.');
    if(!daysAllowed.has(days))throw Error('Choose 24 hours, 2, 3 or 7 days.');
    const units=(profile.units||[]).map(row=>({type:String(row.type),count:Number(row.count)}));
    if(!units.length||units.some(row=>!/^\d{1,4}$/.test(row.type)||!Number.isSafeInteger(row.count)||row.count<1||row.count>100))throw Error('Choose at least one vehicle type and a quantity from 1 to 100.');
    if(units.reduce((sum,row)=>sum+row.count,0)>500)throw Error('A staging profile can request at most 500 vehicles.');
    return {id:profile.id||crypto.randomUUID(),name,days,buildingType:'14',units};
  }
  // The editor runs in the extension's isolated world. The map workflow runs
  // in MAIN, where MissionChief exposes its Leaflet map object.

  const style=make('style');style.textContent=`#nx-staging-launcher{float:left;margin:7px 4px 7px 0;width:38px;height:36px;padding:0;display:grid;place-items:center;background:#431951;border:1px solid #d5a1e5;border-radius:6px;cursor:pointer}#nx-staging-launcher img{width:26px;height:26px;object-fit:contain}#nx-staging-panel{position:fixed;z-index:2147483646;top:108px;left:70px;width:330px;max-width:calc(100vw - 20px);padding:12px;box-sizing:border-box;background:#18283d;color:#f1f5fc;border:1px solid #8a6ba0;border-radius:10px;box-shadow:0 10px 30px #0008;font:12px system-ui}#nx-staging-panel[hidden]{display:none!important}#nx-staging-panel select,#nx-staging-panel input{width:100%;box-sizing:border-box;margin:5px 0 9px;padding:7px;background:#263f59;color:#fff;border:1px solid #70869d;border-radius:5px}#nx-staging-panel button{margin:5px 5px 5px 0;padding:7px;background:#395d78;color:#fff;border:1px solid #8ca6bb;border-radius:5px;cursor:pointer}#nx-staging-panel button:disabled{opacity:.5;cursor:not-allowed}#nx-staging-panel p{line-height:1.4;white-space:pre-wrap}`;document.head.append(style);
  let launcher,panel,select,place,commit,status,coords=null,marker=null,placing=false,busy=false,observer,activeMap=null;
  function mapContext(){try{let frame=window;while(true){if(frame.L?.marker&&frame.map?.on)return frame;if(frame===frame.top)break;frame=frame.parent;}}catch{}return null;}
  function statusText(text){if(status)status.textContent=text;}
  function endPlacement(){if(placing){activeMap?.off('click',onMapClick);placing=false;}if(place)place.textContent='Choose point on map';}
  function onMapClick(event){if(!placing)return;endPlacement();coords={latitude:Number(event.latlng.lat),longitude:Number(event.latlng.lng)};if(marker)activeMap?.removeLayer(marker);const context=mapContext();marker=context?.L.marker([coords.latitude,coords.longitude]).addTo(context.map)||null;statusText(`Point selected: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}. Review the profile, then press Build and send.`);commit.disabled=false;}
  async function refreshProfiles(){const selected=select.value;select.replaceChildren(new Option('Choose a staging profile…',''));place.disabled=true;commit.disabled=true;const profiles=await read();for(const p of profiles)select.append(new Option(`${p.name} · ${durationText(p.days)} · ${p.units.reduce((sum,u)=>sum+u.count,0)} units`,p.id));select.value=[...select.options].some(o=>o.value===selected)?selected:'';place.disabled=!select.value;commit.disabled=!select.value||!coords;statusText(profiles.length?`Select a staging profile, then choose its point on the map. ${profiles.length} saved profile${profiles.length===1?'':'s'} available.`:'No staging profiles saved for this player. Open Nexus Tools → Profiles and use the Staging area profiles section to create one.');}
  function mount(){const anchor=document.getElementById('nx-realism-launcher')||document.getElementById('nx-alliance-launcher');if(!anchor)return;
    if(!launcher){launcher=make('button');launcher.id='nx-staging-launcher';launcher.type='button';launcher.title='Staging area profiles';launcher.setAttribute('aria-label','Staging area profiles');const image=make('img');image.src='/images/building_bereitstellungsraum.png';image.alt='';launcher.append(image);launcher.onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)refreshProfiles().catch(e=>{place.disabled=true;commit.disabled=true;statusText('Profiles could not load: '+e.message);});else endPlacement();};}
    if(anchor.nextElementSibling!==launcher)anchor.after(launcher);
    if(panel?.isConnected)return;panel=make('section');panel.id='nx-staging-panel';panel.hidden=true;panel.append(make('h3','Staging area'));
    const label=make('label','Profile');select=make('select');label.append(select);panel.append(label);
    const actions=make('div');place=make('button','Choose point on map');commit=make('button','Build and send');const close=make('button','Close');place.disabled=true;commit.disabled=true;actions.append(place,commit,close);panel.append(actions);
    status=make('p','Create a profile in Nexus Tools → Profiles, then choose a point on the map.');status.setAttribute('role','status');panel.append(status);document.body.append(panel);
    select.onchange=()=>{place.disabled=!select.value;commit.disabled=!select.value||!coords;};
    place.onclick=()=>{if(busy)return;endPlacement();const context=mapContext();if(!context){statusText('The game map is still loading. Try again when it appears.');return;}activeMap=context.map;placing=true;activeMap.on('click',onMapClick);place.textContent='Click the map…';statusText('Click the map where the staging area should be built.');};
    close.onclick=()=>{if(busy)return;endPlacement();panel.hidden=true;};
    commit.onclick=()=>run().catch(e=>statusText('Stopped: '+e.message));
  }
  observer=new MutationObserver(()=>mount());observer.observe(document.documentElement,{childList:true,subtree:true});mount();
  window.addEventListener('pagehide',()=>{observer.disconnect();endPlacement();if(marker)activeMap?.removeLayer(marker);});

  async function getHtml(url){const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{Accept:'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error(`MissionChief returned HTTP ${response.status} for ${url}.`);return new DOMParser().parseFromString(await response.text(),'text/html');}
  async function buildings(timeout=10000){const r=await fetch('/api/buildings',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(timeout)});if(!r.ok)throw Error('Building register HTTP '+r.status);const data=await r.json();if(!Array.isArray(data))throw Error('Building register was not a list.');return data;}
  function mapRecords(payload){if(!payload)return[];if(Array.isArray(payload))return payload;for(const key of ['buildings','result','data'])if(Array.isArray(payload[key]))return payload[key];if(typeof payload==='object'){const values=Object.values(payload);if(values.some(value=>value&&typeof value==='object'&&!Array.isArray(value)&&('latitude'in value||'building_type'in value)))return values;for(const value of values){const nested=mapRecords(value);if(nested.length)return nested;}}return[];}
  async function mapBuildings(timeout=10000){const r=await fetch('/building/buildings_json',{credentials:'same-origin',cache:'no-store',headers:{'X-Requested-With':'XMLHttpRequest'},signal:AbortSignal.timeout(timeout)});if(!r.ok)throw Error('Map building register HTTP '+r.status);return mapRecords(await r.json());}
  const idOf=b=>String(b?.id??b?.building_id??'');
  const typeOf=b=>String(b?.building_type??b?.building_type_id??'');
  const captionOf=b=>clean(b?.caption??b?.name??b?.building_caption??'');
  async function verificationBuildings(timeout=10000){const result=await Promise.allSettled([buildings(timeout),mapBuildings(timeout)]),merged=new Map();for(const response of result){if(response.status!=='fulfilled')continue;for(const b of response.value){const id=idOf(b);if(!id)continue;const old=merged.get(id)||{};merged.set(id,{...old,...b,id,building_type:typeOf(b)||typeOf(old),caption:captionOf(b)||captionOf(old),latitude:b.latitude??old.latitude,longitude:b.longitude??old.longitude});}}if(result.every(response=>response.status==='rejected'))throw Error('Both game building lists were unavailable.');return [...merged.values()];}
  function distance(a,b){const x=(Number(b.latitude)-a.latitude)*111000,y=(Number(b.longitude)-a.longitude)*111000*Math.cos(a.latitude*Math.PI/180);return Math.hypot(x,y);}
  const captionFor=p=>p.name+' · Staging';
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function nativeBuildFrame(){
    const frame=make('iframe');frame.id='nx-staging-build-frame';frame.name='mcn-v3-staging-build';frame.setAttribute('data-mcn-v3-pipeline-preload','true');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
    frame.style.cssText='position:fixed;left:-12000px;top:-12000px;width:1180px;height:900px;pointer-events:none;border:0';
    try{await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('The game building form did not finish loading. No build was sent.')),25000);
      frame.addEventListener('load',()=>{try{if(!frame.contentDocument?.querySelector('form#new_building,form[action="/buildings"]'))throw Error('The game building form is unavailable. Check your game login. No build was sent.');clearTimeout(timer);resolve();}catch(e){clearTimeout(timer);reject(e);}},{once:true});
      frame.addEventListener('error',()=>{clearTimeout(timer);reject(Error('The game building form failed to load. No build was sent.'));},{once:true});
      frame.src='/buildings/new';document.body.append(frame);
    });return frame;}catch(e){frame.remove();throw e;}
  }
  function nativeCreditsButton(form){
    // The standalone game form has no jQuery/CSS setup: every type's button can
    // be visible. Select the observed staging submitter, never a different type.
    const staging=form.querySelector('input#build_credits_14[type="submit"],button#build_credits_14[type="submit"]');
    if(staging){if(!staging.disabled&&/credits/i.test(staging.value||staging.textContent)&&!/coins/i.test(staging.value||staging.textContent))return staging;throw Error('The game did not expose one available credits/free build button. No build was sent.');}
    const controls=[...form.querySelectorAll('button,input[type="submit"],input[type="button"],a.btn')].filter(el=>!el.disabled&&el.getClientRects().length&&el.ownerDocument.defaultView.getComputedStyle(el).visibility!=='hidden');
    const label=el=>clean(el.textContent||el.value||el.getAttribute('title'));
    const allowed=controls.filter(el=>!(/coins?/i.test(label(el)))&&!el.querySelector('[class*="coin"],img[src*="coin"]'));
    const credits=allowed.filter(el=>/credits?|\bfree\b/i.test(label(el)));
    if(credits.length===1)return credits[0];
    const generic=allowed.filter(el=>/^(build|create|construct)(\s|$)/i.test(label(el))&&!/another/i.test(label(el)));
    if(generic.length===1)return generic[0];
    throw Error('The game did not expose one available credits/free build button. No build was sent.');
  }
  function frameBuildResult(frame,beforeIds,caption){
    try{const doc=frame.contentDocument,heading=doc?.querySelector('h1[building_type="14"]');
      if(!heading||clean(heading.textContent).toLowerCase()!==caption.toLowerCase())return '';
      const form=doc.querySelector('form[action*="/buildings/alarm/"]');
      const id=form?.getAttribute('action')?.match(/\/buildings\/alarm\/(\d+)(?:$|[/?#])/)?.[1];
      return id&&!beforeIds.has(id)?id:'';
    }catch{return '';}
  }
  async function createStaging(profile,point){
    const caption=captionFor(profile),before=await verificationBuildings();
    const existing=before.filter(b=>typeOf(b)==='14'&&captionOf(b).toLowerCase()===caption.toLowerCase()&&b.latitude!=null&&b.longitude!=null&&distance(point,b)<35);
    if(existing.length===1)return {id:String(existing[0].id),existing:true};
    if(existing.length>1)throw Error('Multiple matching staging areas already exist here. Nothing was submitted.');
    const beforeIds=new Set(before.map(idOf));
    statusText('Loading the game building form and selecting Staging area…');
    const frame=await nativeBuildFrame();
    try{
    let form=frame.contentDocument.querySelector('form#new_building,form[action="/buildings"]');
    const type=form.querySelector('#building_building_type,select[name="building[building_type]"]');
    if(!type||![...type.options].some(o=>o.value==='14'&&!o.disabled))throw Error('Staging area is not available in the native building form. No build was sent.');
    // Run the game's type-change handlers before choosing its live build button.
    // Detached HTML + fetch skipped those handlers and the native submit/click code.
    type.value='14';type.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));await pause(500);
    form=frame.contentDocument.querySelector('form#new_building,form[action="/buildings"]');if(!form)throw Error('The staging building form changed unexpectedly. No build was sent.');
    const set=(selector,value)=>{const el=form.querySelector(selector);if(!el)throw Error('A required native building field is unavailable. No build was sent.');el.value=String(value);el.dispatchEvent(new frame.contentWindow.Event('input',{bubbles:true}));el.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));};
    set('#building_name,input[name="building[name]"],#building_caption,input[name="building[caption]"]',caption);
    set('#building_latitude,input[name="building[latitude]"]',point.latitude);
    set('#building_longitude,input[name="building[longitude]"]',point.longitude);
    for(const selector of ['#build_with_coins','#build_as_alliance']){const flag=form.querySelector(selector);if(flag)flag.value='';}
    if(form.querySelector('#building_building_type,select[name="building[building_type]"]')?.value!=='14')throw Error('The game did not keep Staging area selected. No build was sent.');
    for(const el of form.querySelectorAll('input[type="checkbox"]'))if(/build.*another/i.test(`${el.name} ${el.id} ${el.closest('label,div')?.textContent||''}`)){el.checked=false;el.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true}));}
    const action=new URL(form.getAttribute('action')||'/buildings',location.href);
    if(action.origin!==location.origin||action.pathname!=='/buildings'||(form.method||'').toLowerCase()!=='post')throw Error('The native building destination is unexpected. No build was sent.');
    const button=nativeCreditsButton(form);
    if(!form.checkValidity())throw Error('The game building form has incomplete fields: '+[...form.elements].filter(el=>el.willValidate&&!el.validity.valid).map(el=>el.labels?.[0]?.textContent||el.name).map(clean).join(', ')+'. No build was sent.');
    statusText('Pressing the game’s '+clean(button.textContent||button.value)+' button once…');
    button.click();
    const deadline=Date.now()+30000;let attempt=0,error='';
    while(Date.now()<deadline){attempt++;await pause(attempt<5?600:1000);
      const direct=frameBuildResult(frame,beforeIds,caption);if(direct)return {id:direct,existing:false};
      try{error=[...frame.contentDocument.querySelectorAll('.alert-danger,.alert-error,#error_explanation,.invalid-feedback,.text-danger')].map(node=>clean(node.textContent)).filter(Boolean).join(' ').slice(0,350);}catch{}
      statusText(`Native build button pressed. Checking the result (${attempt})…`);
      let after;try{after=await verificationBuildings(Math.min(5000,Math.max(1,deadline-Date.now())));}catch{continue;}
      const found=after.filter(b=>!beforeIds.has(idOf(b))&&typeOf(b)==='14'&&b.latitude!=null&&b.longitude!=null&&distance(point,b)<75&&captionOf(b).toLowerCase()===caption.toLowerCase());
      if(found.length===1)return {id:String(found[0].id),existing:false};
      if(found.length>1)throw Error('Multiple new matching staging areas appeared. Check the game; no retry was sent.');
    }
    throw Error(`The native build did not produce a verified staging area within 30 seconds.${error?' MissionChief said: '+error:''} Check the game before trying again; no retry was sent.`);
    }finally{frame.remove();}
  }
  async function setDuration(id,days){
    const path=`/buildings/${id}/bereitstellung-verlaengern${days===1?'':`?days=${days}`}`;
    const page=await getHtml(`/buildings/${id}`),link=page.querySelector(`a[href="${path}"]`);if(!link)throw Error('The game did not offer the chosen staging duration.');
    const r=await fetch(path,{credentials:'same-origin',cache:'no-store',redirect:'follow',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Duration request returned HTTP '+r.status+'. Check the staging area before retrying.');
    const refreshed=await getHtml(`/buildings/${id}`);const script=[...refreshed.querySelectorAll('script')].map(n=>n.textContent).join('\n');const timer=script.match(/registerEducationTimer\("education_schooling_-1",\s*"education_schooling_-1",\s*(\d{13})\)/);
    if(!timer||Number(timer[1])-Date.now()<(days-0.2)*86400000)throw Error('The selected duration could not be verified. Check the staging area before sending units.');
  }
  async function findUnits(id,profile){
    const wanted=new Map(profile.units.map(u=>[String(u.type),Number(u.count)])),found=new Map(),seen=new Set();let first=null,next=`/buildings/${id}`;
    for(let page=0;next&&page<20;page++){
      const doc=await getHtml(next);first||=doc;
      const form=doc.querySelector(`form[action="/buildings/alarm/${id}"]`);if(!form)throw Error('The native staging dispatch form is unavailable. No units were sent.');
      for(const box of form.querySelectorAll('input.vehicle_checkbox[name="vehicle_ids[]"]')){
        const type=String(box.getAttribute('vehicle_type_id')||''),vehicleId=String(box.value);
        if(!wanted.has(type)||seen.has(vehicleId)||box.disabled||box.getAttribute('fms')!=='2'||box.getAttribute('at_staging_area')==='true')continue;
        seen.add(vehicleId);const list=found.get(type)||[];if(list.length<wanted.get(type)){list.push(vehicleId);found.set(type,list);}
      }
      if([...wanted].every(([type,count])=>(found.get(type)||[]).length>=count))break;
      const nextLink=doc.querySelector('a[rel="next"]');const url=nextLink?new URL(nextLink.getAttribute('href'),location.href):null;
      next=url&&url.origin===location.origin&&url.pathname===`/buildings/${id}`?url.pathname+url.search:null;
    }
    return {form:first.querySelector(`form[action="/buildings/alarm/${id}"]`),found,wanted,ids:[...found.values()].flat()};
  }
  async function sendUnits(id,profile){
    const plan=await findUnits(id,profile),missing=[...plan.wanted].filter(([type,count])=>(plan.found.get(type)||[]).length<count).map(([type,count])=>`${vehicleCatalog()[type]?.name||type}: ${(plan.found.get(type)||[]).length}/${count}`);
    if(!plan.ids.length)throw Error('Staging area built, but no requested vehicles are available. No dispatch was sent.');
    if(missing.length)throw Error('Staging area built; no units sent because the full profile is unavailable: '+missing.join(', '));
    const data=new FormData(plan.form);data.delete('vehicle_ids[]');for(const vehicleId of plan.ids)data.append('vehicle_ids[]',vehicleId);
    if(![...data.keys()].some(k=>/authenticity_token/.test(k))){const token=document.querySelector('meta[name="csrf-token"]')?.content;if(token)data.set('authenticity_token',token);}
    const action=new URL(plan.form.getAttribute('action'),location.href);if(action.origin!==location.origin||action.pathname!==`/buildings/alarm/${id}`)throw Error('Native staging dispatch destination changed. No units were sent.');
    statusText(`Staging area ready. Sending ${plan.ids.length} units once…`);
    let response;try{response=await fetch(action,{method:'POST',body:data,credentials:'same-origin',redirect:'follow',cache:'no-store',signal:AbortSignal.timeout(30000)});}catch{throw Error('Unit dispatch outcome is uncertain. Check the staging area; no retry was sent.');}
    const doc=new DOMParser().parseFromString(await response.text(),'text/html'),error=clean(doc.querySelector('.alert-danger,.alert-error,#error_explanation')?.textContent);
    if(!response.ok||error)throw Error(`Unit dispatch outcome is uncertain${error?': '+error:'.' } Check the staging area; no retry was sent.`);
    return plan.ids.length;
  }
  async function run(){if(busy||!coords||!select.value)return;busy=true;commit.disabled=true;place.disabled=true;select.disabled=true;
    try{const profile=(await read()).find(p=>p.id===select.value);if(!profile)throw Error('Select a saved staging profile.');const checked=validate(profile),point={...coords};
      const staging=await createStaging(checked,point);statusText(`${staging.existing?'Existing':'New'} staging area #${staging.id} verified. Setting ${durationText(checked.days)}…`);
      await setDuration(staging.id,checked.days);const sent=await sendUnits(staging.id,checked);
      statusText(`Staging area #${staging.id} built or found; ${durationText(checked.days)} set. Dispatch request sent for ${sent} units. Check their arrival in the game.`);
      if(marker){activeMap?.removeLayer(marker);marker=null;}coords=null;
    }catch(e){statusText('Stopped: '+e.message);}finally{busy=false;place.disabled=!select.value;select.disabled=false;commit.disabled=!select.value||!coords;}
  }
})();
