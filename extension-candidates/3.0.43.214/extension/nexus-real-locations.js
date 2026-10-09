/* Nexus Realism Map floating launcher + draggable service panel + self-contained native building workflow + single-type Multi Build. */
(()=>{
  'use strict';
  if(window.__NEXUS_REAL_LOCATIONS_V158__)return;
  try{let w=window;while(true){if(/^mcn-v3-/.test(w.name))return;if(w===w.top)break;w=w.parent;}}catch{return;}
  window.__NEXUS_REAL_LOCATIONS_V158__=true;

  const typeOrder=[
    'fire_station','police_station','ambulance_station','disaster_response','dispatch_centre','hospital','prison','lifeguard_station','mountain_rescue','coastguard_station','lifeboat_station','clinic'
  ];
  const types={
    fire_station:{label:'Fire Stations',singular:'Fire Station',icon:'🚒',letter:'F',color:'#d64141',supported:true,buildingIds:['0','18'],building:[/\bfire\b.*\bstation\b/i,/firehouse/i,/^fire station$/i]},
    police_station:{label:'Police Stations',singular:'Police Station',icon:'👮',letter:'P',color:'#347dde',supported:true,buildingIds:['6','19','26'],building:[/\bpolice\b.*\bstation\b/i,/^police station$/i]},
    ambulance_station:{label:'Ambulance Stations',singular:'Ambulance Station',icon:'🚑',letter:'A',color:'#957000',supported:true,buildingIds:['2','20'],building:[/\bambulance\b.*\bstation\b/i,/^ambulance station$/i]},
    disaster_response:{label:'Disaster Response',singular:'Disaster Response',icon:'🚨',letter:'D',color:'#b13939',supported:false,building:[]},
    dispatch_centre:{label:'Control Centers',singular:'Dispatch Center',icon:'📡',letter:'C',color:'#52637c',supported:true,buildingIds:['7'],building:[/dispatch\s+cent(?:re|er)/i,/control\s+cent(?:re|er)/i]},
    hospital:{label:'Hospitals',singular:'Hospital',icon:'🏥',letter:'H',color:'#278751',supported:true,buildingIds:['4'],building:[/\bhospital\b/i]},
    prison:{label:'Prisons',singular:'Prison',icon:'🔒',letter:'R',color:'#555',supported:true,buildingIds:['16','36'],building:[/\bprison\b/i,/custody suite/i]},
    lifeguard_station:{label:'Lifeguard Stations',singular:'Lifeguard Station',icon:'🏖️',letter:'L',color:'#258da8',supported:false,building:[]},
    mountain_rescue:{label:'Mountain Rescue',singular:'Mountain Rescue Station',icon:'⛰️',letter:'M',color:'#8a6330',supported:true,buildingIds:['33'],building:[/mountain\s+rescue/i,/search\s+and\s+rescue/i]},
    coastguard_station:{label:'Coastguard Stations',singular:'Coastguard Rescue Station',icon:'⚓',letter:'G',color:'#a25cce',supported:true,buildingIds:['28'],building:[/coastguard/i]},
    lifeboat_station:{label:'RNLI Stations',singular:'Lifeboat Station',icon:'🚤',letter:'N',color:'#bf6420',supported:true,buildingIds:['27'],building:[/lifeboat/i,/rnli/i]},
    clinic:{label:'Doctors/Clinics',singular:'GP Surgery',icon:'🩺',letter:'D',color:'#4b8b77',supported:false,buildingIds:['32'],building:[/clinic/i,/doctor/i,/general practitioner/i,/gp surgery/i]}
  };
  const startingVehicles={
    fire_station:[['0','Water Ladder'],['1','Light 4X4 Pump (L4P)'],['16','Rescue Pump'],['17','CARP'],['37','WrL CAFS'],['38','RP CAFS']],
    police_station:[['8','Incident response vehicle']],
    ambulance_station:[['5','Ambulance'],['10','Rapid Response Vehicle']],
    dispatch_centre:[],hospital:[],prison:[],
    mountain_rescue:[['99','Mountain Rescue 4x4']],
    coastguard_station:[['57','CRV']],
    lifeboat_station:[['66','4x4 Vehicle']]
  };
  const preference='nexusRealismToggleTypesV2';
  const panelPosKey='nexusRealismFloatingPanelPositionV1';
  let enabled=new Set();
  try{const saved=JSON.parse(localStorage.getItem(preference));if(Array.isArray(saved))enabled=new Set(saved.filter(k=>types[k]?.supported));}catch{}

  let launcher=null,panel=null,toggleWrap=null,statusNode=null,observer=null,mountTimer=null,dragState=null;
  let buildFrame=null,buildFrameReady=false,buildFramePromise=null,buildFrameError='';
  let buildTemplateDoc=null,buildTemplatePromise=null,buildTemplateLoadedAt=0,buildTemplateError='';
  let dispatchCentreCache=null,dispatchCentrePromise=null;
  let map=null,realm=null,layer=null,mapStyle=null,requestId='',requestTimer=null,moveTimer=null,records=[];
  const cache=new Map(),markerRefs=new Map(),builtKeys=new Set();

  let multiMode=false,masterItem=null,masterKey='',masterService='',masterConfig=null,masterPanel=null;
  const batch=new Map();
  let batchRunning=false;

  const make=(tag,text,doc=document)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const itemKey=item=>`${item.source||'osm'}:${item.source_type||'item'}/${item.source_id??item.id??`${item.latitude},${item.longitude}`}`;
  const addressText=item=>{if(!item?.address||typeof item.address!=='object')return '';return [item.address.housename,item.address.housenumber,item.address.street,item.address.city,item.address.postcode].filter(Boolean).join(', ');};
  const primaryService=item=>{for(const key of typeOrder)if(enabled.has(key)&&item.services?.includes(key))return key;return item.services?.find(k=>types[k]?.supported)||'fire_station';};

  function mapContext(){try{let w=window;while(true){if(w.L?.layerGroup&&w.map?.getBounds&&w.map?.addLayer)return w;if(w===w.top)break;w=w.parent;}}catch{}return null;}
  function visible(node){if(!node?.isConnected||!node.getClientRects?.().length)return false;const s=getComputedStyle(node);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';}
  function findNewBuildingForm(doc=document,visibleOnly=false){
    if(!doc?.querySelectorAll)return null;
    const forms=[...doc.querySelectorAll('form')];
    const candidates=forms.filter(form=>{
      if(form.id==='new_building')return true;
      const action=form.getAttribute('action')||'';
      try{return /\/buildings\/?$/.test(new URL(action||location.href,location.href).pathname);}catch{return /\/buildings\/?$/.test(action);}
    });
    return visibleOnly?candidates.find(visible)||null:candidates[0]||null;
  }
  function buildingFormUrl(){
    const link=[...document.querySelectorAll('a[href]')].find(a=>/new building/i.test(clean(a.textContent))&&/\/buildings(?:\/new)?(?:$|[?#])/.test(a.href));
    try{return new URL(link?.href||'/buildings/new',location.href).href;}catch{return '/buildings/new';}
  }
  async function ensureBuildTemplate(force=false){
    if(!force&&buildTemplateDoc&&Date.now()-buildTemplateLoadedAt<60000&&findNewBuildingForm(buildTemplateDoc))return buildTemplateDoc;
    if(buildTemplatePromise)return buildTemplatePromise;
    buildTemplatePromise=(async()=>{
      buildTemplateError='';
      const url=buildingFormUrl();
      const response=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{Accept:'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw Error(`MissionChief New building form returned HTTP ${response.status}.`);
      const html=await response.text();
      const doc=new DOMParser().parseFromString(html,'text/html');
      const form=findNewBuildingForm(doc);
      if(!form)throw Error('MissionChief New building form was not present in the response.');
      buildTemplateDoc=doc;buildTemplateLoadedAt=Date.now();buildTemplateError='';
      return doc;
    })().catch(error=>{buildTemplateDoc=null;buildTemplateLoadedAt=0;buildTemplateError=error?.message||String(error);throw error;}).finally(()=>{buildTemplatePromise=null;});
    return buildTemplatePromise;
  }
  function ensureBuildFrame(){
    if(buildFrameReady&&buildFrame?.contentDocument&&findNewBuildingForm(buildFrame.contentDocument))return Promise.resolve(buildFrame);
    if(buildFramePromise)return buildFramePromise;
    buildFramePromise=new Promise((resolve,reject)=>{
      buildFrame?.remove();buildFrame=null;buildFrameReady=false;buildFrameError='';
      const frame=document.createElement('iframe');buildFrame=frame;frame.id='nx-realism-build-frame';frame.name='mcn-v3-realism-build-template';frame.setAttribute('data-mcn-v3-pipeline-preload','true');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
      frame.style.cssText='position:fixed!important;left:-12000px!important;top:-12000px!important;width:1180px!important;height:900px!important;opacity:0!important;pointer-events:none!important;border:0!important;z-index:-1!important;';
      const fail=message=>{buildFrameReady=false;buildFrameError=message;buildFramePromise=null;try{frame.remove();}catch{};if(buildFrame===frame)buildFrame=null;reject(new Error(message));};
      frame.addEventListener('load',()=>{try{const form=findNewBuildingForm(frame.contentDocument);if(!form)return fail('MissionChief New building form did not load.');buildFrameReady=true;buildFrameError='';resolve(frame);}catch(e){fail(e?.message||'Unable to read MissionChief New building form.');}},{once:true});
      frame.addEventListener('error',()=>fail('MissionChief New building form failed to load.'),{once:true});
      document.body.append(frame);frame.src=buildingFormUrl();
    });
    return buildFramePromise;
  }

  const style=make('style');
  style.id='nx-realism-map-style-v158';
  style.textContent=`
#nx-realism-launcher{float:left;margin:7px 4px 7px 0;width:38px;min-width:38px;height:36px;padding:0;display:grid;place-items:center;background:#153b57;border:1px solid #82bedb;border-radius:6px;color:#edf6ff;font:20px/1 system-ui;cursor:pointer;box-shadow:inset 0 1px 0 #ffffff20}
#nx-realism-launcher:hover{background:#1b4b6d}#nx-realism-launcher[aria-expanded="true"]{background:#2578a2;border-color:#a2dcff}
#nx-realism-panel{position:fixed;z-index:2147483646;top:108px;left:24px;width:360px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);overflow:hidden;display:flex;flex-direction:column;box-sizing:border-box;background:#102337;color:#e8f1fc;border:1px solid #54728d;border-radius:12px;box-shadow:0 12px 40px #0007;font:12px system-ui;text-align:left}
#nx-realism-panel[hidden]{display:none!important}#nx-realism-panel *{box-sizing:border-box}
#nx-realism-panel .nxrm-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid #36516b;background:#122b40;cursor:move;user-select:none;touch-action:none}
#nx-realism-panel .nxrm-heading{display:flex;align-items:center;gap:8px;min-width:0}#nx-realism-panel .nxrm-heading strong{font-size:14px;color:#f1f7ff}#nx-realism-panel .nxrm-heading span{font-size:18px}
#nx-realism-panel .nxrm-close{border:1px solid #607e98;background:#19374f;color:#fff;border-radius:5px;min-width:30px;height:30px;padding:0 8px;cursor:pointer}
#nx-realism-panel .nxrm-body{padding:10px;overflow:auto;overscroll-behavior:contain}
#nx-realism-toggles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
#nx-realism-toggles .nxrm-toggle{display:flex;align-items:center;justify-content:flex-start;gap:5px;min-height:32px;padding:5px 8px;border:1px solid #607e98;border-radius:5px;background:#19374f;color:#f1f7ff;cursor:pointer;font:600 11px system-ui;white-space:normal;text-align:left}
#nx-realism-toggles .nxrm-toggle:hover:not(:disabled){background:#234b69}#nx-realism-toggles .nxrm-toggle[aria-pressed="true"]{background:#317da7;border-color:#a2dcff}#nx-realism-toggles .nxrm-toggle:disabled{opacity:.38;cursor:not-allowed}
#nx-realism-panel .nxrm-actions{display:flex;gap:6px;margin-top:9px}#nx-realism-panel .nxrm-actions button{padding:6px 9px;background:#19374f;color:#fff;border:1px solid #607e98;border-radius:5px;cursor:pointer;font:600 11px system-ui}#nx-realism-panel .nxrm-actions button:hover{background:#234b69}
#nx-realism-panel .nxrm-status{font-size:10px;line-height:1.4;color:#c5d7e7;padding:7px 1px 0;white-space:normal}
.nx-real-pin{border:0!important;background:none!important}.nx-real-pin .nx-pin-core{position:relative;display:grid;place-items:center;width:28px;height:28px;border:2px solid white;border-radius:50%;color:white;font:bold 14px Arial,sans-serif;box-shadow:0 1px 5px #0008}.nx-real-pin .nx-pin-badge{position:absolute;right:-7px;top:-8px;display:grid;place-items:center;width:16px;height:16px;border-radius:50%;background:#1d8e43;border:2px solid #fff;color:#fff;font:bold 10px Arial,sans-serif;box-shadow:0 1px 3px #0008}.nx-real-pin.nx-incompatible{opacity:.35}.nx-real-pin.nx-master .nx-pin-core{outline:3px solid #f7ce35}.nx-real-pin.nx-built .nx-pin-core{outline:3px solid #39b967}
.nx-real-popup{color:#25313a;font:12px Arial,sans-serif;width:290px;max-width:290px}.nx-real-popup *{box-sizing:border-box}.nx-real-popup .nx-card-line{margin:4px 0;line-height:1.35}.nx-real-popup .nx-card-label{font-weight:700}.nx-real-popup .nx-card-links{display:flex;gap:5px;flex-wrap:wrap;margin:5px 0 8px}.nx-real-popup a{color:#0786c5;text-decoration:none}.nx-real-popup a:hover{text-decoration:underline}
.nx-real-build{margin-top:7px;border:2px solid #222;border-radius:4px;background:#fff;overflow:hidden}.nx-real-build summary{display:flex;align-items:center;justify-content:space-between;list-style:none;cursor:pointer;padding:5px 8px;background:#fafafa;font-weight:700;color:#363636}.nx-real-build summary::-webkit-details-marker{display:none}.nx-real-build summary:after{content:'Expand ▼';font-weight:400;font-size:10px}.nx-real-build[open] summary:after{content:'Collapse ▲'}.nx-real-build-body{padding:5px 7px 7px}.nx-real-field{display:grid;grid-template-columns:104px minmax(0,1fr);align-items:center;gap:5px;margin:0 0 4px;font-weight:700;font-size:11px;line-height:1.15}.nx-real-field>span{min-width:0}.nx-real-setup-hint{display:block;font-size:10px;line-height:1.3;margin:5px 0}.nx-real-results:empty{display:none}.nx-real-field select,.nx-real-field input[type="number"]{display:block;box-sizing:border-box;min-width:0;width:100%;height:23px;margin:0;border:1px solid #aaa;border-radius:3px;background:#fff;color:#333;padding:2px 5px;font:11px Arial,sans-serif}.nx-real-multi{display:flex;align-items:center;gap:5px;margin:5px 0;font-weight:700;font-size:11px;line-height:1.25}.nx-real-multi input{margin:0;flex:none}.nx-real-build-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.nx-real-build-actions button{border:0;border-radius:3px;padding:6px 9px;cursor:pointer;color:#fff;background:#43ad4d;font:11px Arial,sans-serif}.nx-real-build-actions button.nx-secondary{background:#64727d}.nx-real-build-actions button:disabled{opacity:.45;cursor:not-allowed}.nx-real-batch-note{font-size:10px;line-height:1.4;margin:4px 0;color:#3d4a53}.nx-real-results{max-height:110px;overflow:auto;margin-top:6px;border-top:1px solid #ddd;padding-top:5px;font-size:10px}.nx-real-result-ok{color:#287c35}.nx-real-result-fail{color:#a42323}.nx-real-master-badge{display:inline-block;margin-left:5px;padding:1px 5px;border-radius:3px;background:#f1c62e;color:#111;font-size:9px;font-weight:bold}
#nx-realism-master-panel{position:absolute;top:10px;right:10px;z-index:10000;width:310px;max-width:calc(100% - 20px);max-height:calc(100% - 20px);overflow:auto;background:#fff;border:1px solid #999;border-radius:12px;box-shadow:0 2px 10px #0007;padding:9px;color:#25313a;font:12px Arial,sans-serif}#nx-realism-master-panel .nx-real-popup{width:auto;max-width:none}
@media(max-width:620px){#nx-realism-panel{width:calc(100vw - 16px);left:8px;top:72px}#nx-realism-toggles{grid-template-columns:1fr}}
`;
  document.head?.append(style);

  function removeLegacyPanel(){document.querySelectorAll('#nx-real-locations,#nx-realism-map-portal,#nx-realism-inline').forEach(n=>n.remove());}
  function setStatus(text){if(statusNode)statusNode.textContent=text;}
  function selectedSupported(){return typeOrder.filter(k=>types[k]?.supported&&enabled.has(k));}
  function savePreference(){try{localStorage.setItem(preference,JSON.stringify([...enabled]));}catch{}}
  function clearLayer(){records=[];markerRefs.clear();if(layer)layer.clearLayers();}
  function cancelRequest(){if(requestId)window.postMessage({source:'nexus-real-locations-ui',id:requestId,action:'cancel'},location.origin);requestId='';clearTimeout(requestTimer);}

  function nativeControlBundle(docOverride=null){
    const form=findNewBuildingForm(docOverride)||findNewBuildingForm(buildTemplateDoc)||findNewBuildingForm(buildFrame?.contentDocument)||findNewBuildingForm(document,true);if(!form)return null;
    const selects=[...form.querySelectorAll('select')];
    const inputs=[...form.querySelectorAll('input,textarea')];
    const context=el=>clean(el?.closest?.('.form-group,.input-group,.row,div')?.textContent||'');
    const nameOf=el=>`${el?.name||''} ${el?.id||''}`.toLowerCase();
    const type=form.querySelector('#building_building_type,select[name="building[building_type]"]')||selects.find(s=>/building[_\[]?type|building_type/.test(nameOf(s)))||selects.find(s=>/type of building/i.test(context(s)))||null;
    const dispatch=form.querySelector('#building_leitstelle_building_id,select[name="building[leitstelle_building_id]"]')||selects.find(s=>/leitstelle|dispatch/.test(nameOf(s)))||selects.find(s=>/assigned dispatch/i.test(context(s)))||null;
    const start=form.querySelector('#building_vehicle_type,#building_start_vehicle_type,select[name="building[vehicle_type]"],select[name="building[start_vehicle_type]"]')||selects.find(s=>s!==type&&(/vehicle[_\[]?type|start.*vehicle/.test(nameOf(s))||/starting vehicle/i.test(context(s))))||null;
    const name=form.querySelector('#building_caption,input[name="building[caption]"]')||inputs.find(i=>/building.*(caption|name)|\bcaption\b/.test(nameOf(i)))||inputs.find(i=>/^\*?\s*name\b/i.test(context(i)))||null;
    const address=form.querySelector('#building_address,input[name="building[address]"]')||inputs.find(i=>/building.*address|\baddress\b/.test(nameOf(i)))||inputs.find(i=>/^address\b/i.test(context(i)))||null;
    const lat=form.querySelector('#building_latitude,input[name="building[latitude]"]')||inputs.find(i=>/building.*lat|latitude/.test(nameOf(i)))||null;
    const lon=form.querySelector('#building_longitude,input[name="building[longitude]"]')||inputs.find(i=>/building.*(lon|lng)|longitude/.test(nameOf(i)))||null;
    const submit=form.querySelector('button[type="submit"][name],input[type="submit"][name]')||null;
    return {form,type,dispatch,start,name,address,lat,lon,submit};
  }

  function copySelect(native,doc,placeholder){
    const s=doc.createElement('select');
    if(!native){s.append(new Option(placeholder||'Not available',''));s.disabled=true;return s;}
    for(const opt of native.options){const clone=doc.createElement('option');clone.value=opt.value;clone.textContent=opt.textContent;clone.disabled=opt.disabled;s.append(clone);}
    s.value=native.value;return s;
  }
  function canonicalBuilding(service){const cfg=types[service];const value=cfg?.buildingIds?.[0]||'';return {value,label:cfg?.singular||cfg?.label||'Building'};}
  function lockedTypeSelect(item,doc){
    const service=primaryService(item),resolved=canonicalBuilding(service),select=doc.createElement('select');
    select.append(new Option(resolved.label,resolved.value));select.value=resolved.value;select.disabled=true;select.dataset.lockedBuildingType=service;select.title='Building type is fixed by the selected Realism Map service';return select;
  }
  function startVehicleSelect(item,doc,seed){
    const service=primaryService(item),select=doc.createElement('select');select.append(new Option('No starting vehicle',''));
    for(const [value,label] of (startingVehicles[service]||[]))select.append(new Option(label,value));
    if(seed?.startValue&&[...select.options].some(o=>o.value===String(seed.startValue)))select.value=String(seed.startValue);
    return select;
  }
  function dispatchSelect(doc,seed){
    const select=doc.createElement('select');select.append(new Option('No Dispatch / Don\'t Assign',''));
    if(Array.isArray(dispatchCentreCache))for(const row of dispatchCentreCache)select.append(new Option(row.label,row.value));
    else{select.append(new Option('Loading Dispatch Centers…','__loading__'));select.value='__loading__';select.disabled=true;}
    if(seed?.dispatchValue&&[...select.options].some(o=>o.value===String(seed.dispatchValue)))select.value=String(seed.dispatchValue);
    return select;
  }
  async function ensureDispatchCentres(){
    if(Array.isArray(dispatchCentreCache))return dispatchCentreCache;if(dispatchCentrePromise)return dispatchCentrePromise;
    dispatchCentrePromise=fetchBuildings().then(rows=>{dispatchCentreCache=rows.filter(b=>String(b.building_type)==='7').map(b=>({value:String(b.id),label:clean(b.caption)||`Dispatch Center #${b.id}`})).sort((a,b)=>a.label.localeCompare(b.label));return dispatchCentreCache;}).finally(()=>{dispatchCentrePromise=null;});
    return dispatchCentrePromise;
  }
  function matchingOption(select,key){const ids=types[key]?.buildingIds||[],matchers=types[key]?.building||[];for(const o of select?.options||[])if(ids.includes(String(o.value)))return o;for(const o of select?.options||[]){const t=clean(o.textContent);if(matchers.some(re=>re.test(t)))return o;}return null;}
  function inferServiceFromBuilding(value,label){for(const key of typeOrder)if((types[key]?.buildingIds||[]).includes(String(value)))return key;for(const key of typeOrder)if((types[key]?.building||[]).some(re=>re.test(label)))return key;return '';}
  function configFromControls(controls){return {typeValue:controls.type.value,typeLabel:clean(controls.type.selectedOptions?.[0]?.textContent),dispatchValue:controls.dispatch?.value==='__loading__'?'':(controls.dispatch?.value||''),dispatchLabel:clean(controls.dispatch?.selectedOptions?.[0]?.textContent),startValue:controls.start?.value||'',startLabel:clean(controls.start?.selectedOptions?.[0]?.textContent),personnelTarget:controls.personnel?.value??'',serviceStatus:controls.service?.value||'on',extensions:controls.extensions?.value?[controls.extensions.value]:[]};}

  function setNativeSelect(native,value){if(!native)return;native.value=value;const E=native.ownerDocument?.defaultView?.Event||Event;native.dispatchEvent(new E('input',{bubbles:true}));native.dispatchEvent(new E('change',{bubbles:true}));}
  function refreshStartOptions(buildControls,key,config){
    const replacement=startVehicleSelect({services:[key]},buildControls.start.ownerDocument,config);replacement.className=buildControls.start.className;buildControls.start.replaceWith(replacement);buildControls.start=replacement;
    replacement.addEventListener('change',()=>{if(multiMode&&masterItem&&itemKey(masterItem)===buildControls.itemKey)syncMasterConfig(buildControls);});
  }

  function buildFormConfigFor(item,doc,seed){
    const type=lockedTypeSelect(item,doc),dispatch=dispatchSelect(doc,seed),start=startVehicleSelect(item,doc,seed);
    const personnel=doc.createElement('input');personnel.type='number';personnel.min='0';personnel.max='10000';personnel.step='1';personnel.placeholder='Game default';personnel.value=seed?.personnelTarget??'';
    const service=doc.createElement('select');service.append(new Option('On — in service','on'),new Option('Off — out of service','off'));service.value=seed?.serviceStatus||'on';
    const extensions=doc.createElement('select');extensions.append(new Option('None',''));extensions.title='Choose one extension, or None';
    const selected=seed?.extensions?.[0];if(selected){extensions.append(new Option(selected,selected));extensions.value=selected;}
    const controls={itemKey:itemKey(item),type,dispatch,start,personnel,service,extensions};return controls;
  }

  function compatible(item){if(!multiMode||!masterItem)return true;const service=inferServiceFromBuilding(masterConfig?.typeValue,masterConfig?.typeLabel||'')||masterService;return !!service&&item.services?.includes(service);}
  function syncMasterConfig(controls){
    const previous=inferServiceFromBuilding(masterConfig?.typeValue,masterConfig?.typeLabel||'')||masterService;
    masterConfig=configFromControls(controls);
    const next=inferServiceFromBuilding(masterConfig.typeValue,masterConfig.typeLabel)||masterService;
    if(multiMode&&masterItem&&previous!==next){for(const [key] of [...batch])if(key!==masterKey)batch.delete(key);masterService=next||masterService;setBatchMessage('Building type changed — batch reset to the master location.');render();}
    updateMasterPanelCount();
  }

  function row(doc,label,value){const p=doc.createElement('div');p.className='nx-card-line';const strong=doc.createElement('span');strong.className='nx-card-label';strong.textContent=label+': ';p.append(strong,doc.createTextNode(value||'—'));return p;}
  function link(doc,label,href){const a=doc.createElement('a');a.textContent=label;a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;}

  function locationCard(item,{master=false,forceOpen=false}={}){
    const d=realm?.document||document,box=d.createElement('div');box.className='nx-real-popup';
    const key=primaryService(item),cfg=types[key]||types.fire_station;
    const typeLine=row(d,'Type',`${cfg.icon} ${cfg.label}`);if(master){const badge=d.createElement('span');badge.className='nx-real-master-badge';badge.textContent='MASTER';typeLine.append(badge);}box.append(typeLine);
    box.append(row(d,'Status','✅ OSM listed'));
    box.append(row(d,'Name',intendedCaption(item)));
    if(clean(item.name).length>40)box.append(row(d,'Name limit','Shortened to fit the game’s 40-character limit'));
    const addr=addressText(item);if(addr)box.append(row(d,'Address',addr));
    box.append(row(d,'Coords',`${Number(item.latitude).toFixed(6)}, ${Number(item.longitude).toFixed(6)}${item.source_type&&item.source_id?` · OSM: ${item.source_type}/${item.source_id}`:''}`));
    const links=d.createElement('div');links.className='nx-card-links';
    if(item.source_type&&item.source_id)links.append(link(d,'OpenStreetMap',`https://www.openstreetmap.org/${item.source_type}/${item.source_id}`));
    links.append(link(d,'Google Maps',`https://www.google.com/maps?q=${encodeURIComponent(item.latitude+','+item.longitude)}`));box.append(links);

    const details=d.createElement('details');details.className='nx-real-build';details.open=!!forceOpen;
    const summary=d.createElement('summary');summary.textContent='🏗️ Build';details.append(summary);
    const body=d.createElement('div');body.className='nx-real-build-body';details.append(body);
    box.append(details);
    const service=primaryService(item),canonical=canonicalBuilding(service),builderAvailable=!!canonical.value;
    const seed=master&&masterConfig?masterConfig:null,controls=buildFormConfigFor(item,d,seed);
    const field=(labelText,select)=>{const label=d.createElement('label');label.className='nx-real-field';const caption=d.createElement('span');caption.textContent=labelText==='Extension — credits only'?'Extension':labelText;select.setAttribute('aria-label',labelText);label.append(caption,select);body.append(label);};
    field('Building Type',controls.type);field('Dispatch Center',controls.dispatch);field('Starting Vehicle',controls.start);field('Desired personnel',controls.personnel);field('Service status',controls.service);
    field('Extension — credits only',controls.extensions);controls.extensions.addEventListener('change',()=>{if(master)syncMasterConfig(controls);});
    const setupHint=d.createElement('small');setupHint.className='nx-real-setup-hint';setupHint.textContent='CAPITAL names · Extensions use credits and normal build times.';body.append(setupHint);

    const multi=d.createElement('label');multi.className='nx-real-multi';const check=d.createElement('input');check.type='checkbox';check.checked=master?multiMode:false;multi.append(check,d.createTextNode('Multi Build — same type'));body.append(multi);
    const note=d.createElement('div');note.className='nx-real-batch-note';note.dataset.batchNote='1';body.append(note);
    const actions=d.createElement('div');actions.className='nx-real-build-actions';
    const create=d.createElement('button');create.type='button';create.dataset.createBuild='1';actions.append(create);
    const clear=d.createElement('button');clear.type='button';clear.className='nx-secondary';clear.textContent='Clear selections';clear.hidden=!master;actions.append(clear);body.append(actions);
    const results=d.createElement('div');results.className='nx-real-results';results.dataset.results='1';body.append(results);

    if(!builderAvailable){controls.dispatch.disabled=true;controls.start.disabled=true;check.disabled=true;create.disabled=true;clear.disabled=true;note.textContent='No MissionChief building type is mapped for this Realism service yet.';return box;}
    ensureDispatchCentres().then(()=>{if(!box.isConnected)return;const current=controls.dispatch.value==='__loading__'?'':controls.dispatch.value;const replacement=dispatchSelect(d,{dispatchValue:current||seed?.dispatchValue||''});replacement.className=controls.dispatch.className;controls.dispatch.replaceWith(replacement);controls.dispatch=replacement;replacement.addEventListener('change',()=>{if(master)syncMasterConfig(controls);});}).catch(e=>{if(note.isConnected)note.textContent=`Dispatch Centers unavailable: ${e.message}`;});

    ensureDispatchCentres().then(()=>fetchBuildings()).then(rows=>globalThis.NexusRealismSetup.options(controls.type.value,rows)).then(options=>{
      if(!box.isConnected)return;const selected=controls.extensions.value;controls.extensions.replaceChildren(new Option('None',''));
      for(const option of options)controls.extensions.append(new Option(option.name+(option.price?' · '+option.price:' · price checked at new station'),option.name));
      if(options.some(option=>option.name===selected))controls.extensions.value=selected;
      controls.extensions.title=options.length?'Choose one extension, or None':'No extension list available for this building type';
      if(master)syncMasterConfig(controls);
    }).catch(e=>{if(box.isConnected)controls.extensions.title='Extension choices unavailable: '+e.message;});
    controls.personnel.addEventListener('change',()=>{if(master)syncMasterConfig(controls);});
    controls.service.addEventListener('change',()=>{if(master)syncMasterConfig(controls);});
    const updateLabels=()=>{
      const count=master&&multiMode?batch.size:1;create.textContent=master&&multiMode?`Create ${count} Building${count===1?'':'s'}`:'Create Building';
      note.textContent=master&&multiMode?`Master stays open while you pan. Click compatible map markers to add/remove them. Selected: ${batch.size}.`:"";
      create.disabled=!controls.type.value||batchRunning;
    };
    updateLabels();
    // Building type is locked to the selected Realism service; users only choose Dispatch Center / Starting Vehicle.
    controls.dispatch.addEventListener('change',()=>{if(master)syncMasterConfig(controls);});
    controls.start.addEventListener('change',()=>{if(master)syncMasterConfig(controls);});
    check.addEventListener('change',()=>{
      if(check.checked){enterMulti(item,configFromControls(controls));}
      else if(master||itemKey(item)===masterKey){exitMulti('Multi Build cancelled.');}
    });
    clear.addEventListener('click',()=>{if(master){for(const [k] of [...batch])if(k!==masterKey)batch.delete(k);setBatchMessage('Selections cleared to master only.');render();updateMasterPanelCount();}});
    create.addEventListener('click',async()=>{
      if(master)syncMasterConfig(controls);
      const config=master?masterConfig:configFromControls(controls);
      if(config.personnelTarget!==''&&(!/^\d+$/.test(config.personnelTarget)||Number(config.personnelTarget)>10000)){note.textContent='Desired personnel must be a whole number from 0 to 10,000.';return;}
      await runBuild(master&&multiMode?[...batch.values()]:[item],config,results,create);
    });
    controls.__updateLabels=updateLabels;
    return box;
  }

  function removeMasterPanel(){masterPanel?.remove();masterPanel=null;}
  function mountMasterPanel(){
    if(!multiMode||!masterItem||!map?.getContainer)return;
    removeMasterPanel();const d=realm.document,panel=d.createElement('div');panel.id='nx-realism-master-panel';panel.append(locationCard(masterItem,{master:true,forceOpen:true}));map.getContainer().append(panel);masterPanel=panel;
    try{realm.L.DomEvent.disableClickPropagation(panel);realm.L.DomEvent.disableScrollPropagation(panel);}catch{}
    updateMasterPanelCount();
  }
  function enterMulti(item,config){
    masterItem=item;masterKey=itemKey(item);masterService=inferServiceFromBuilding(config?.typeValue,config?.typeLabel||'')||primaryService(item);masterConfig=config;multiMode=true;batch.clear();batch.set(masterKey,item);
    try{map?.closePopup();}catch{};mountMasterPanel();setBatchMessage('Multi Build active. Pan the map and click compatible locations to select them.');render();
  }
  function exitMulti(message='Multi Build ended.'){
    multiMode=false;masterItem=null;masterKey='';masterService='';masterConfig=null;batch.clear();removeMasterPanel();setStatus(message);render();
  }
  function setBatchMessage(text){const n=masterPanel?.querySelector('[data-batch-note]');if(n)n.textContent=text;}
  function updateMasterPanelCount(){
    if(!masterPanel)return;const n=masterPanel.querySelector('[data-batch-note]'),b=masterPanel.querySelector('[data-create-build]');if(n)n.textContent=`Master stays open while you pan. Click compatible map markers to add/remove them. Selected: ${batch.size}.`;if(b)b.textContent=`Create ${batch.size} Building${batch.size===1?'':'s'}`;
  }
  function toggleBatch(item){
    const key=itemKey(item);if(key===masterKey)return;
    if(!compatible(item)){setBatchMessage(`Not selectable: active batch is ${masterConfig?.typeLabel||types[masterService]?.singular||'one building type'}.`);return;}
    batch.has(key)?batch.delete(key):batch.set(key,item);updateMasterPanelCount();render();
  }

  function ensureLayer(){realm=mapContext();if(!realm){setStatus('MissionChief map is not ready yet.');return false;}if(map===realm.map&&layer){if(multiMode&&!masterPanel?.isConnected)mountMasterPanel();return true;}
    if(map&&layer)try{map.removeLayer(layer);}catch{};if(map)try{map.off('moveend',onMove);}catch{};removeMasterPanel();mapStyle?.remove();mapStyle=null;
    map=realm.map;layer=realm.L.layerGroup().addTo(map);map.on('moveend',onMove);if(realm!==window){mapStyle=realm.document.createElement('style');mapStyle.textContent=style.textContent;realm.document.head.append(mapStyle);}if(multiMode)mountMasterPanel();return true;
  }

  function iconFor(item,key){
    const cfg=types[key]||types.fire_station,k=itemKey(item),selected=batch.has(k),master=k===masterKey,built=builtKeys.has(k),incompatible=multiMode&&!compatible(item);
    const cls=['nx-real-pin',master?'nx-master':'',built?'nx-built':'',incompatible?'nx-incompatible':''].filter(Boolean).join(' ');
    const badge=built?'✓':master?'★':selected?'✓':'';
    return realm.L.divIcon({className:cls,html:`<span class="nx-pin-core" style="background:${cfg.color}">${cfg.letter}${badge?`<b class="nx-pin-badge">${badge}</b>`:''}</span>`,iconSize:[34,34],iconAnchor:[17,17]});
  }

  function render(){
    if(!ensureLayer())return;layer.clearLayers();markerRefs.clear();let count=0;
    for(const item of records){if(!Array.isArray(item.services)||!item.services.some(s=>enabled.has(s)))continue;const key=primaryService(item),cfg=types[key]||types.fire_station,k=itemKey(item);const marker=realm.L.marker([item.latitude,item.longitude],{icon:iconFor(item,key),title:item.name||cfg.label,keyboard:true,bubblingMouseEvents:false});
      marker.on('click',()=>{if(multiMode&&masterItem){toggleBatch(item);return;}marker.bindPopup(locationCard(item),{maxWidth:330,minWidth:300,autoPan:true}).openPopup();});marker.addTo(layer);markerRefs.set(k,marker);count++;}
    setStatus(count?`${count} location${count===1?'':'s'} shown.${multiMode?` Multi Build: ${batch.size} selected.`:' Pan/zoom refreshes automatically.'}`:'No matching locations in this map area.');
  }

  function boundsKey(bounds,services){return bounds.map(v=>v.toFixed(3)).join(',')+'|'+services.join(',');}
  function loadVisible(){const services=selectedSupported();if(!services.length){cancelRequest();clearLayer();exitMulti('Choose one or more location types.');return;}if(!ensureLayer())return;
    const b=map.getBounds(),bounds=[b.getSouth(),b.getWest(),b.getNorth(),b.getEast()];if(bounds[2]-bounds[0]>4||bounds[3]-bounds[1]>6||bounds[3]<=bounds[1]){clearLayer();setStatus('Zoom in further to load Realism Map locations.');return;}
    const key=boundsKey(bounds,services);if(cache.has(key)){records=cache.get(key);render();return;}
    cancelRequest();requestId=Date.now()+'-'+Math.random().toString(36).slice(2);setStatus('Loading Nexus Realism Map…');window.postMessage({source:'nexus-real-locations-ui',id:requestId,action:'load',bounds,types:services},location.origin);requestTimer=setTimeout(()=>{requestId='';setStatus('Realism Map request timed out.');},8000);
  }
  function onMove(){clearTimeout(moveTimer);moveTimer=setTimeout(loadVisible,450);}
  window.addEventListener('message',event=>{const m=event.data;if(event.source!==window||event.origin!==location.origin||m?.source!=='nexus-real-locations-result'||!requestId||m.id!==requestId)return;requestId='';clearTimeout(requestTimer);if(!m.result?.ok){setStatus(m.result?.error||'Unable to load Realism Map locations.');return;}records=Array.isArray(m.result.locations)?m.result.locations.filter(r=>Number.isFinite(r.latitude)&&Number.isFinite(r.longitude)&&Array.isArray(r.services)):[];const key=m.result.cacheKey;if(key){cache.set(key,records);while(cache.size>20)cache.delete(cache.keys().next().value);}render();});

  async function fetchBuildings(){const r=await fetch('/api/buildings',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`Building verification HTTP ${r.status}`);const j=await r.json();if(!Array.isArray(j))throw Error('Building verification response was not a list');return j;}
  function extractBuildingRecords(payload){
    if(!payload)return[];if(Array.isArray(payload))return payload;if(Array.isArray(payload.buildings))return payload.buildings;if(Array.isArray(payload.result))return payload.result;if(Array.isArray(payload.data))return payload.data;
    if(typeof payload==='object'){const values=Object.values(payload),direct=values.filter(v=>v&&typeof v==='object'&&!Array.isArray(v));if(direct.some(v=>'latitude'in v&&'longitude'in v))return direct;for(const v of values){const nested=extractBuildingRecords(v);if(nested.length)return nested;}}
    return[];
  }
  async function fetchMapBuildings(){const r=await fetch('/building/buildings_json',{credentials:'same-origin',cache:'no-store',headers:{'X-Requested-With':'XMLHttpRequest'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`Map building verification HTTP ${r.status}`);return extractBuildingRecords(await r.json());}
  function buildingIdOf(b){return String(b?.id??b?.building_id??'');}
  function buildingTypeOf(b){return String(b?.building_type??b?.building_type_id??'');}
  function buildingCaptionOf(b){return clean(b?.caption??b?.name??b?.building_caption??'');}
  async function fetchVerificationBuildings(){
    const settled=await Promise.allSettled([fetchBuildings(),fetchMapBuildings()]),merged=new Map(),errors=[];
    for(const result of settled){if(result.status!=='fulfilled'){errors.push(result.reason?.message||String(result.reason));continue;}for(const b of result.value||[]){const id=buildingIdOf(b);if(!id)continue;const previous=merged.get(id)||{};merged.set(id,{...previous,...b,id,building_type:buildingTypeOf(b)||buildingTypeOf(previous),caption:buildingCaptionOf(b)||buildingCaptionOf(previous),latitude:b?.latitude??previous.latitude,longitude:b?.longitude??previous.longitude});}}
    if(!merged.size&&errors.length===settled.length)throw Error(errors.join(' · '));return [...merged.values()];
  }
  function distanceMeters(a,b){const rad=x=>x*Math.PI/180,R=6371000,dLat=rad(Number(b.latitude)-Number(a.latitude)),dLon=rad(Number(b.longitude)-Number(a.longitude)),la1=rad(Number(a.latitude)),la2=rad(Number(b.latitude));const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
  function setFormValue(data,el,value,fallback){if(el?.name)data.set(el.name,String(value??''));else if(fallback)data.set(fallback,String(value??''));}
  function csrf(data){if([...data.keys()].some(k=>/authenticity_token/i.test(k)))return;const token=document.querySelector('meta[name="csrf-token"]')?.content;if(token)data.set('authenticity_token',token);}
  function responseBuildingId(url){try{const m=new URL(url,location.href).pathname.match(/^\/buildings\/(\d+)(?:\/|$)/);return m?.[1]||'';}catch{return '';}}
  function responseDocumentBuildingId(doc,caption){
    for(const a of doc?.querySelectorAll?.('a[href*="/buildings/"]')||[]){const id=responseBuildingId(a.href);if(!id)continue;if(sameCaption(a.textContent,caption))return id;}
    return'';
  }
  function intendedCaption(item,maxLength=40){
    const name=clean(item.name||types[primaryService(item)]?.singular||'Nexus Realism location').toLocaleUpperCase('en-GB');
    const limit=Number.isSafeInteger(Number(maxLength))&&Number(maxLength)>0?Number(maxLength):40;
    if(name.length<=limit)return name;
    const clipped=name.slice(0,limit),space=clipped.lastIndexOf(' ');
    return (space>limit/2?clipped.slice(0,space):clipped).trim();
  }
  function sameCaption(a,b){return clean(a).toLocaleLowerCase()===clean(b).toLocaleLowerCase();}
  function updateMarkerVisual(item){const marker=markerRefs.get(itemKey(item));if(!marker)return;try{marker.setIcon(iconFor(item,primaryService(item)));}catch{}}
  function unverified(message){const e=new Error(message);e.uncertain=true;return e;}

  async function buildOne(item,config){
    if(!config?.typeValue)throw Error('No building type is mapped for this Realism location.');
    let templateDoc=null;
    try{templateDoc=await ensureBuildTemplate(true);}catch(templateError){
      try{await ensureBuildFrame();templateDoc=buildFrame?.contentDocument||null;}catch{}
      if(!templateDoc)throw Error(`MissionChief New building form could not be loaded. Build was not sent. ${templateError?.message||buildTemplateError||buildFrameError||''}`.trim());
    }
    const bundle=nativeControlBundle(templateDoc);if(!bundle?.form)throw Error('MissionChief New building form controls were unavailable. Build was not sent.');
    if(bundle.type&&![...bundle.type.options].some(o=>String(o.value)===String(config.typeValue)))throw Error(`${config.typeLabel||'Selected building type'} is not available in MissionChief's New building form. Build was not sent.`);

    // A pre-submit snapshot is essential: without it, an old nearby building can
    // be mistaken for this request's result. Never submit when it is unavailable.
    const before=await fetchVerificationBuildings();
    const caption=intendedCaption(item,bundle.name?.maxLength);
    const existing=before.filter(b=>buildingTypeOf(b)===String(config.typeValue)&&b.latitude!=null&&b.longitude!=null&&Number.isFinite(Number(b.latitude))&&Number.isFinite(Number(b.longitude))&&distanceMeters(item,b)<35&&sameCaption(buildingCaptionOf(b),caption));
    if(existing.length===1)return {...existing[0],alreadyExisting:true};
    if(existing.length>1)throw unverified('Multiple matching stations already exist at this location. No build was sent.');
    const beforeIds=new Set(before.map(buildingIdOf).filter(Boolean)),data=new FormData(bundle.form);csrf(data);
    setFormValue(data,bundle.type,config.typeValue,'building[building_type]');
    setFormValue(data,bundle.dispatch,config.dispatchValue,'building[leitstelle_building_id]');
    setFormValue(data,bundle.start,config.startValue,'building[vehicle_type]');
    setFormValue(data,bundle.name,caption,'building[caption]');
    setFormValue(data,bundle.address,addressText(item),'building[address]');
    setFormValue(data,bundle.lat,item.latitude,'building[latitude]');
    setFormValue(data,bundle.lon,item.longitude,'building[longitude]');
    for(const el of bundle.form.querySelectorAll('input[type="checkbox"]'))if(/build.*another/i.test(`${el.name||''} ${el.id||''} ${el.closest('label,div')?.textContent||''}`))if(el.name)data.delete(el.name);
    if(bundle.submit?.name&&!data.has(bundle.submit.name))data.set(bundle.submit.name,bundle.submit.value||clean(bundle.submit.textContent)||'Create building');

    const action=new URL(bundle.form.getAttribute('action')||'/buildings',location.href),method=(bundle.form.getAttribute('method')||'post').toUpperCase();let rejection='',responseId='',explicitSuccess='',responseStatus=0;
    try{
      const res=await fetch(action,{method,body:data,credentials:'same-origin',redirect:'follow',cache:'no-store',headers:{Accept:'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(30000)});const responseText=await res.text();
      responseStatus=res.status;
      const doc=new DOMParser().parseFromString(responseText,'text/html');responseId=responseBuildingId(res.url)||responseDocumentBuildingId(doc,caption);
      rejection=[...doc.querySelectorAll('.alert-danger,.alert-error,.alert-warning,#error_explanation,.has-error .help-block,.field_with_errors + .help-block,.invalid-feedback,.text-danger')].map(n=>clean(n.textContent)).filter(Boolean).join(' ').slice(0,500);
      explicitSuccess=[...doc.querySelectorAll('.alert-success,.alert-notice,#flash_notice,.toast-success')].map(n=>clean(n.textContent)).filter(Boolean).join(' ').slice(0,500);
      // MissionChief can create the building and then render its generic error
      // page. Neither a flash message nor a redirected URL proves creation.
    }catch(e){if(e?.uncertain)throw e;if(e?.name==='AbortError'||/timeout/i.test(e?.message||''))throw unverified('Build request timed out. Outcome is uncertain; no retry was sent.');throw unverified(`Build request could not be confirmed: ${e?.message||e}. No retry was sent.`);}

    let lastCandidates=[];
    for(let i=0;i<24;i++){
      await new Promise(r=>setTimeout(r,i<4?500:1000));let after;try{after=await fetchVerificationBuildings();}catch(e){if(i===23)throw unverified(`Build request was accepted but the game building lists could not be refreshed: ${e.message}. No retry was sent.`);continue;}
      if(responseId){const direct=after.find(b=>buildingIdOf(b)===String(responseId)&&!beforeIds.has(buildingIdOf(b)));if(direct&&buildingTypeOf(direct)===String(config.typeValue))return direct;}
      const candidates=after.filter(b=>!beforeIds.has(buildingIdOf(b))&&buildingTypeOf(b)===String(config.typeValue));lastCandidates=candidates;
      const strong=candidates.filter(b=>{const hasCoords=b.latitude!=null&&b.longitude!=null&&Number.isFinite(Number(b.latitude))&&Number.isFinite(Number(b.longitude));return hasCoords?distanceMeters(item,b)<350:sameCaption(buildingCaptionOf(b),caption);});
      if(strong.length===1)return strong[0];
      if(strong.length>1){const exactCaption=strong.filter(b=>sameCaption(buildingCaptionOf(b),caption));if(exactCaption.length===1)return exactCaption[0];throw unverified('Build result is ambiguous: multiple new matching buildings were detected. No retry was sent.');}
      // A new same-type station elsewhere is not evidence for this location.
    }
    throw unverified(`${rejection?`MissionChief displayed an error (${rejection}), but`:responseStatus>=400?`MissionChief returned HTTP ${responseStatus}, but`:explicitSuccess?'MissionChief displayed a success message, but':'Build submission returned, but'} no new matching station was verified${lastCandidates.length?` (${lastCandidates.length} new same-type stations seen elsewhere)`:''}. Check the game before retrying; no retry was sent.`);
  }

  async function runBuild(items,config,resultsNode,button){
    if(batchRunning)return;batchRunning=true;button.disabled=true;resultsNode.replaceChildren();const unique=[];const seen=new Set();for(const item of items){const k=itemKey(item);if(seen.has(k))continue;seen.add(k);unique.push(item);}let ok=0,fail=0,stopped=false;
    let existingCount=0,setupIncomplete=0;
    for(const [index,item] of unique.entries()){
      const line=resultsNode.ownerDocument.createElement('div');line.textContent=`${index+1}/${unique.length} ${item.name||'Unnamed location'} — building…`;resultsNode.append(line);resultsNode.scrollTop=resultsNode.scrollHeight;
      try{const built=await buildOne(item,config);if(built.alreadyExisting)existingCount++;else ok++;builtKeys.add(itemKey(item));line.className='nx-real-result-ok';const suffix=/^\d+$/.test(String(built?.id||''))?` #${built.id}`:'';line.textContent=`✓ ${item.name||'Unnamed location'} — ${built.alreadyExisting?'already exists; no build sent':'built'}${suffix}`;updateMarkerVisual(item);
        if(!built.alreadyExisting){const setupLog=resultsNode.ownerDocument.createElement('div');resultsNode.append(setupLog);const report=text=>{const message=resultsNode.ownerDocument.createElement('div');message.textContent='  '+text;setupLog.append(message);};try{const issues=await globalThis.NexusRealismSetup.apply(built.id,config,report);if(issues.length){setupIncomplete++;line.textContent+=' · setup incomplete';}}catch(e){setupIncomplete++;report('Station built; setup incomplete: '+e.message);}}
      }
      catch(e){fail++;line.className='nx-real-result-fail';line.textContent=`✗ ${item.name||'Unnamed location'} — ${e.message}`;if(e?.uncertain){stopped=true;const stop=resultsNode.ownerDocument.createElement('div');stop.className='nx-real-result-fail';stop.textContent='Batch stopped because the last build outcome is uncertain. Check MissionChief before trying that location again.';resultsNode.append(stop);break;}}
    }
    const summary=resultsNode.ownerDocument.createElement('div');summary.className=fail?'nx-real-result-fail':'nx-real-result-ok';summary.textContent=`Finished: ${ok} built${setupIncomplete?`, ${setupIncomplete} with setup incomplete`:''}${existingCount?`, ${existingCount} already existed`:''}${fail?`, ${fail} failed`:''}${stopped?' · stopped on uncertain outcome':''}.`;resultsNode.append(summary);batchRunning=false;button.disabled=false;setStatus(`Build run finished: ${ok} built${setupIncomplete?`, ${setupIncomplete} with setup incomplete`:''}${existingCount?`, ${existingCount} already existed`:''}${fail?`, ${fail} failed`:''}${stopped?' · stopped safely':''}.`);
  }

  function syncToggleButtons(){if(!toggleWrap)return;toggleWrap.querySelectorAll('button[data-realism-type]').forEach(button=>{const key=button.dataset.realismType;button.setAttribute('aria-pressed',enabled.has(key)?'true':'false');});}
  function updateLauncher(){if(!launcher)return;const count=selectedSupported().length;launcher.title=`Nexus Realism Map${count?` · ${count} active`:''}`;launcher.setAttribute('aria-label',launcher.title);}
  function createDirectToggles(){
    if(!panel||toggleWrap)return;const body=panel.querySelector('.nxrm-body');if(!body)return;toggleWrap=make('div');toggleWrap.id='nx-realism-toggles';
    for(const key of typeOrder){const cfg=types[key],button=make('button',`${cfg.icon} ${cfg.label}`);button.type='button';button.className='nxrm-toggle';button.dataset.realismType=key;button.disabled=!cfg.supported;button.setAttribute('aria-pressed',enabled.has(key)?'true':'false');if(!cfg.supported)button.title='Not yet available in the Nexus VPS dataset';button.addEventListener('click',()=>{if(!cfg.supported)return;if(multiMode&&masterItem&&masterItem.services?.includes(key)&&enabled.has(key)){setStatus('End Multi Build before hiding the active master service.');return;}enabled.has(key)?enabled.delete(key):enabled.add(key);savePreference();syncToggleButtons();updateLauncher();loadVisible();});toggleWrap.append(button);}
    body.append(toggleWrap);const actions=make('div');actions.className='nxrm-actions';const clear=make('button','Clear all');clear.type='button';clear.addEventListener('click',()=>{enabled.clear();savePreference();syncToggleButtons();updateLauncher();clearLayer();exitMulti('All Realism Map overlays cleared.');});const refresh=make('button','Refresh');refresh.type='button';refresh.addEventListener('click',()=>{cache.clear();loadVisible();});actions.append(clear,refresh);body.append(actions);statusNode=make('div','Choose one or more location types.');statusNode.className='nxrm-status';body.append(statusNode);const credit=make('div','© OpenStreetMap contributors · Nexus VPS/PostGIS');credit.className='nxrm-status';body.append(credit);updateLauncher();
  }
  function clampPanel(){if(!panel||panel.hidden)return;const r=panel.getBoundingClientRect(),maxX=Math.max(4,innerWidth-r.width-4),maxY=Math.max(4,innerHeight-r.height-4);const left=Math.min(maxX,Math.max(4,parseFloat(panel.style.left)||r.left||24)),top=Math.min(maxY,Math.max(4,parseFloat(panel.style.top)||r.top||108));panel.style.left=left+'px';panel.style.top=top+'px';panel.style.right='auto';}
  function savePanelPosition(){if(!panel)return;try{localStorage.setItem(panelPosKey,JSON.stringify({left:parseFloat(panel.style.left)||panel.getBoundingClientRect().left,top:parseFloat(panel.style.top)||panel.getBoundingClientRect().top}));}catch{}}
  function restorePanelPosition(){if(!panel)return;try{const saved=JSON.parse(localStorage.getItem(panelPosKey)||'null');if(Number.isFinite(saved?.left)&&Number.isFinite(saved?.top)){panel.style.left=saved.left+'px';panel.style.top=saved.top+'px';panel.style.right='auto';}}catch{}requestAnimationFrame(clampPanel);}
  function beginDrag(event){if(!panel||event.button!==0||event.target.closest('button,input,select,a'))return;const rect=panel.getBoundingClientRect();dragState={id:event.pointerId,dx:event.clientX-rect.left,dy:event.clientY-rect.top};event.currentTarget.setPointerCapture?.(event.pointerId);event.preventDefault();}
  function moveDrag(event){if(!dragState||event.pointerId!==dragState.id||!panel)return;panel.style.left=Math.max(4,event.clientX-dragState.dx)+'px';panel.style.top=Math.max(4,event.clientY-dragState.dy)+'px';panel.style.right='auto';clampPanel();}
  function endDrag(event){if(!dragState||event.pointerId!==dragState.id)return;dragState=null;savePanelPosition();}
  function openPanel(){if(!panel)return;panel.hidden=false;launcher?.setAttribute('aria-expanded','true');restorePanelPosition();syncToggleButtons();updateLauncher();if(selectedSupported().length)setTimeout(loadVisible,0);panel.querySelector('.nxrm-close')?.focus({preventScroll:true});}
  function closePanel(){if(!panel)return;panel.hidden=true;launcher?.setAttribute('aria-expanded','false');launcher?.focus({preventScroll:true});}
  function createPanel(){
    if(panel?.isConnected)return;panel=make('section');panel.id='nx-realism-panel';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','Nexus Realism Map');const header=make('div');header.className='nxrm-header';const heading=make('div');heading.className='nxrm-heading';heading.append(make('span','🗺️'),make('strong','Nexus Realism Map'));const close=make('button','×');close.type='button';close.className='nxrm-close';close.setAttribute('aria-label','Close Realism Map controls');close.addEventListener('click',closePanel);header.append(heading,close);header.addEventListener('pointerdown',beginDrag);header.addEventListener('pointermove',moveDrag);header.addEventListener('pointerup',endDrag);header.addEventListener('pointercancel',endDrag);panel.append(header);const body=make('div');body.className='nxrm-body';panel.append(body);panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closePanel();}});document.body.append(panel);toggleWrap=null;statusNode=null;createDirectToggles();restorePanelPosition();
  }
  function mountUI(){
    removeLegacyPanel();const alliance=document.getElementById('nx-alliance-launcher'),fallback=document.getElementById('mcn-v3-map-controller'),anchor=alliance||fallback;if(!anchor)return false;if(!launcher?.isConnected){launcher=make('button','🗺️');launcher.type='button';launcher.id='nx-realism-launcher';launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','nx-realism-panel');launcher.addEventListener('click',()=>panel?.hidden?openPanel():closePanel());}
    if(anchor.nextElementSibling!==launcher)anchor.insertAdjacentElement('afterend',launcher);createPanel();updateLauncher();return true;
  }
  function scheduleMount(){clearTimeout(mountTimer);mountTimer=setTimeout(()=>{if(mountUI()&&selectedSupported().length&&!layer)setTimeout(loadVisible,80);},120);}
  function start(){removeLegacyPanel();ensureBuildFrame().catch(()=>{});observer=new MutationObserver(()=>scheduleMount());observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('resize',clampPanel);scheduleMount();}
  window.addEventListener('pagehide',()=>{observer?.disconnect();clearTimeout(mountTimer);clearTimeout(moveTimer);cancelRequest();window.removeEventListener('resize',clampPanel);try{map?.off('moveend',onMove);}catch{};try{if(map&&layer)map.removeLayer(layer);}catch{};launcher?.remove();panel?.remove();removeMasterPanel();buildFrame?.remove();buildFrame=null;buildFrameReady=false;buildFramePromise=null;mapStyle?.remove();});
  start();
})();
