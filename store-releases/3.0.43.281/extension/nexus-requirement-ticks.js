/* Small, event-driven coverage marks for native missing-vehicle counts; no fleet fetch or game hooks. */
(() => {
 'use strict';
 const ticksEnabled=globalThis.NexusSettings?.enabled('requirementTicks') !== false;
 const buttonsEnabled=globalThis.NexusSettings?.enabled('requirementButtons') !== false;
 if(!ticksEnabled&&!buttonsEnabled)return;
 if(!/^\/missions\/\d+\/?$/.test(location.pathname)||/^mcn-v3-(active-worker|pipeline-preload)-/.test(window.name||''))return;
 try{if(window.frameElement?.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload],#mcn-v3-background-mission-worker'))return;}catch{return;}
 if(window.__NEXUS_REQUIREMENT_TICKS__||!window.__NEXUS_REQUIREMENT_DATA__)return;
 const normal=value=>String(value??'').replace(/\s+/g,' ').trim().replace(/\.$/,'').toLowerCase(),rules=new Map(),byType=new Map(),byEquipment=new Map();
 for(const rule of __NEXUS_REQUIREMENT_DATA__){for(const label of rule.texts)rules.set(normal(label),rule);for(const [index,keys]of [[byType,rule.vehicles],[byEquipment,rule.equipment||[]]])for(const key of keys){if(!index.has(key))index.set(key,new Set());index.get(key).add(rule);}}
 const amount='(?:\\d{1,3}(?:,\\d{3})+|\\d+)',prefix=new RegExp(`^(${amount})x?\\s+(.+)$`,'i'),suffix=new RegExp(`^(.+):\\s*(${amount})x?$`,'i');
 let active=false,timer=null,serial=0,running=false,again=false,observers=new Map();
 let selecting=false,action=0;
 const customRules=new Map();
 const state=window.__NEXUS_REQUIREMENT_TICKS__={activate,suspend,refresh:schedule,split,supports:label=>!!parse(label),buttonsEnabled,passes:0,lastCandidates:0,limited:false};
 function split(raw){return raw.split(/(?:,(?!\d{3}\b)|[;\n])\s*(?=\d[\d,]*x?\s+[^\d\s]|[^,;:\n]+:\s*\d)/i).map(s=>s.trim()).filter(Boolean).slice(0,60);}
 function parse(label){
  const value=String(label).replace(/\s+/g,' ').trim().replace(/\.$/,'');const first=value.match(prefix),last=first?null:value.match(suffix);if(!first&&!last)return null;
  const count=Number((first?first[1]:last[2]).replaceAll(',','')),name=first?first[2]:last[1];let rule=rules.get(normal(name));
  const custom=window.__NEXUS_RULES__?.lookup(name);
  if(custom){
   const key=normal(name)+':'+custom.vehicleTypeId;
   if(!customRules.has(key)){
    const type=Number(custom.vehicleTypeId),capacity=rule?.capacityByType?.[type];
    const mapped={texts:[name],vehicles:[type],...(capacity?{capacityByType:{[type]:capacity},capacityUnit:rule.capacityUnit}:{})};
    customRules.set(key,mapped);if(!byType.has(type))byType.set(type,new Set());byType.get(type).add(mapped);
   }
   rule=customRules.get(key);
  }
  return count>0&&Number.isSafeInteger(count)&&rule?{count,rule,name}:null;
 }
 function visible(){if(!active||document.hidden)return false;try{let win=window;while(win!==win.top){const frame=win.frameElement;if(!frame||frame.getAttribute('aria-hidden')==='true')return false;const css=win.parent.getComputedStyle(frame);if(css.display==='none'||css.visibility==='hidden'||!frame.getClientRects().length)return false;win=win.parent;}}catch{return false;}return true;}
 function identity(node){
  for(const raw of [node.getAttribute('value'),node.getAttribute('vehicle_id'),node.getAttribute('data-vehicle-id')])if(/^\d+$/.test(raw||''))return raw;
  const own=node.id.match(/^vehicle(?:_sort|_row)?_(\d+)$/)?.[1];if(own)return own;
  const row=node.closest('tr')||node;
  for(const raw of [row.getAttribute('vehicle_id'),row.getAttribute('data-vehicle-id'),row.id.match(/^vehicle(?:_sort|_row)?_(\d+)$/)?.[1]])if(/^\d+$/.test(raw||''))return raw;
  for(const anchor of row.querySelectorAll('a[href*="/vehicles/"]')){try{const url=new URL(anchor.getAttribute('href'),location.origin),id=url.pathname.match(/^\/vehicles\/(\d+)\/?$/)?.[1];if(id&&url.origin===location.origin)return id;}catch{}}
  return null;
 }
 function unit(node){const id=identity(node),raw=node.getAttribute('vehicle_type_id')??node.querySelector('[vehicle_type_id]')?.getAttribute('vehicle_type_id');if(!id||!/^\d+$/.test(raw||''))return null;
  const equipment=new Set((node.getAttribute('data-equipment-types')||'').split(',').filter(Boolean));for(const span of node.querySelectorAll('[data-equipment-type]'))equipment.add(span.getAttribute('data-equipment-type'));
  return {id,type:Number(raw),equipment};
 }
 function write(badge,covered,description){
  badge.classList.toggle('nx-requirement-covered',covered);badge.title=description;
  if(covered){badge.classList.remove('nx-requirement-short');badge.querySelector('[data-nx-requirement-shortfall]')?.remove();}
  const previous=badge.querySelector('[data-nx-requirement-tick]');if(!covered||!ticksEnabled){previous?.remove();return;}if(previous)return;
  const tick=document.createElement('span');tick.dataset.nxRequirementTick='1';tick.dataset.nexusComfort='1';tick.textContent='✓';tick.className='nx-requirement-tick';tick.setAttribute('role','img');tick.setAttribute('aria-label','Requirement covered by selected or en-route units');badge.append(tick);
 }
 async function refresh(){
  timer=null;if(!visible())return;if(running){again=true;return;}
   const badges=[...document.querySelectorAll('#nx-missing [data-nx-vehicle-requirement]')].slice(0,60);if(!badges.length)return;
   // Register any saved exact-type rules before accumulating coverage.
   for(const badge of badges)parse(badge.dataset.nxVehicleRequirement);
  running=true;const ticket=serial;
  try{
   // Native missing counts already subtract units on scene. Exclude them, including rows in transition.
   const scene=[...document.querySelectorAll('#mission_vehicle_at_mission tbody tr')],driving=[...document.querySelectorAll('#mission_vehicle_driving tbody tr')],selected=[...document.querySelectorAll('#vehicle_show_table_all input.vehicle_checkbox:checked,#occupied input.vehicle_checkbox:checked')];
   state.lastCandidates=scene.length+driving.length+selected.length;state.limited=state.lastCandidates>15000;
   if(state.limited){for(const badge of badges)write(badge,false,'Coverage not verified: vehicle list is too large.');return;}
   const atScene=new Set(),units=new Map();let work=0;
   async function yieldIfNeeded(){if(++work%100===0){await new Promise(resolve=>setTimeout(resolve,0));return ticket===serial&&visible();}return true;}
   for(const row of scene){if(!await yieldIfNeeded())return;const id=identity(row);if(id)atScene.add(id);}
   for(const [items,kind]of [[driving,'en route'],[selected,'selected']])for(const node of items){if(!await yieldIfNeeded())return;if(kind==='selected'&&node.disabled)continue;const entry=unit(node);if(!entry||atScene.has(entry.id)||units.has(entry.id))continue;units.set(entry.id,{...entry,kind});}
   const counts=new Map();
   for(const entry of units.values()){if(!await yieldIfNeeded())return;const matching=new Set(byType.get(entry.type)||[]);for(const equipment of entry.equipment)for(const rule of byEquipment.get(equipment)||[])matching.add(rule);for(const rule of matching){if(!counts.has(rule))counts.set(rule,{picked:0,enRoute:0});const capacity=rule.capacityByType?rule.capacityByType[entry.type]:1;if(Number.isSafeInteger(capacity)&&capacity>0)counts.get(rule)[entry.kind==='selected'?'picked':'enRoute']+=capacity;}}
   if(ticket!==serial||!visible())return;
   for(const badge of badges){if(!badge.isConnected)continue;const parsed=parse(badge.dataset.nxVehicleRequirement);if(!parsed){write(badge,false,'Coverage not verified for this requirement.');continue;}
    const {picked=0,enRoute=0}=counts.get(parsed.rule)||{};
    const unit=count=>parsed.rule.capacityUnit?` ${count===1&&parsed.rule.capacityUnit==='car spaces'?'car space':parsed.rule.capacityUnit}`:'';
    write(badge,picked+enRoute>=parsed.count,`${enRoute}${unit(enRoute)} en route + ${picked}${unit(picked)} selected / ${parsed.count} still required by the game. Units already on scene are accounted for by the game.${picked?' Selected units still need dispatch.':''}${badge.matches('button')?' Click to select any remaining units.':''}`);
   }
   state.passes++;
  }finally{running=false;if(again){again=false;schedule();}}
 }
 function schedule(){if(!active)return;serial++;if(timer!==null||!visible())return;timer=setTimeout(()=>void refresh(),120);}
 function watch(){
  const targets=[['vehicle_amount','counter'],['mission_vehicle_driving','rows'],['mission_vehicle_at_mission','rows'],['occupied','selection'],['vehicle_show_table_all','selection']];
  for(const [id,kind]of targets){const target=document.getElementById(id),previous=observers.get(id);if(previous?.node===target)continue;previous?.observer.disconnect();observers.delete(id);if(!target)continue;
   const observer=new MutationObserver(records=>{
    if(!visible())return;
    const relevant=kind==='counter'||records.some(record=>record.type==='attributes'||[...record.addedNodes,...record.removedNodes].some(node=>node.nodeType===1&&(node.matches('tr,tbody,input.vehicle_checkbox,[data-equipment-type]')||node.querySelector?.('tr,input.vehicle_checkbox,[data-equipment-type]'))));
    if(relevant)schedule();
   });
   observer.observe(target,kind==='counter'?{childList:true,subtree:true,characterData:true}:{childList:true,subtree:true,attributes:true,attributeFilter:['checked','disabled','vehicle_type_id','data-equipment-types','data-equipment-type']});observers.set(id,{node:target,observer});
  }
 }
 function changed(event){if(event.target.matches?.('input.vehicle_checkbox'))schedule();}
 function selectedByControl(event){if(event.target.closest?.('#mission-aao-group .aao,#mission-aao-group .vehicle_group'))schedule();}
 function contribution(entry,rule){
  if(!entry||(!rule.vehicles.includes(entry.type)&&!(rule.equipment||[]).some(type=>entry.equipment.has(type))))return 0;
  const weight=rule.capacityByType?rule.capacityByType[entry.type]:1;return Number.isSafeInteger(weight)&&weight>0?weight:0;
 }
 function coverage(rule){
  const scene=[...document.querySelectorAll('#mission_vehicle_at_mission tbody tr')],driving=[...document.querySelectorAll('#mission_vehicle_driving tbody tr')],selected=[...document.querySelectorAll('#vehicle_show_table_all input.vehicle_checkbox:checked,#occupied input.vehicle_checkbox:checked')];
  if(scene.length+driving.length+selected.length>15000)throw Error('Vehicle list is too large. Use the game selection controls.');
  const excluded=new Set(scene.map(identity).filter(Boolean)),seen=new Set(excluded);let total=0;
  for(const node of [...driving,...selected]){
   if(node.matches('input')&&node.disabled)continue;
   const id=identity(node);if(id&&seen.has(id))continue;
   const entry=unit(node);
   if(id&&!entry)throw Error('Some selected or incoming units have no vehicle type. Check them in the game before adding more units.');
   if(!entry)continue;seen.add(entry.id);total+=contribution(entry,rule);
  }
  return {total,seen};
 }
 function feedback(badge,message,shortfall=0){
  const panel=badge.closest('#nx-missing');if(!panel)return;
  let status=panel.querySelector('[data-nx-requirement-status]');
  if(!status){status=document.createElement('div');status.dataset.nxRequirementStatus='1';status.dataset.nexusComfort='1';status.setAttribute('role','status');status.setAttribute('aria-live','polite');panel.append(status);}
  status.textContent=message;
  badge.classList.toggle('nx-requirement-short',shortfall>0);badge.querySelector('[data-nx-requirement-shortfall]')?.remove();
  if(shortfall){const mark=document.createElement('span');mark.dataset.nxRequirementShortfall='1';mark.dataset.nexusComfort='1';mark.textContent=` ! ${shortfall} short`;badge.append(mark);}
 }
 async function selectRequirement(event){
  const badge=event.target.closest?.('#nx-missing button[data-nx-vehicle-requirement]');
  if(!badge||!buttonsEnabled||!event.isTrusted||!visible())return;
  event.preventDefault();event.stopPropagation();if(selecting)return;
  const parsed=parse(badge.dataset.nxVehicleRequirement),api=window.__NEXUS_MANUAL_REQUIREMENT_SELECTION__;
  if(!parsed)return;
  if(!api){feedback(badge,'Unit selector is still loading. Refresh this mission if it does not become available.');return;}
  const label=badge.dataset.nxVehicleRequirement,ticket=++action,missionPath=location.pathname,source=document.getElementById('missing_text'),sourceText=source?.textContent;selecting=true;
  const valid=()=>ticket===action&&visible()&&badge.isConnected&&badge.dataset.nxVehicleRequirement===label&&location.pathname===missionPath&&document.getElementById('missing_text')===source&&source?.textContent===sourceText;
  for(const button of document.querySelectorAll('#nx-missing button[data-nx-vehicle-requirement]'))button.setAttribute('aria-disabled','true');
  badge.setAttribute('aria-busy','true');feedback(badge,`Selecting ${parsed.name}…`);
  try{
   // Let the pressed state paint; selection only runs as a consequence of this click.
   await new Promise(resolve=>setTimeout(resolve,0));if(!valid())return;
   const {nodes,blocked}=api.candidates(parsed.name);if(blocked)throw Error(blocked);
   let added=0,attempts=0;
   for(const node of nodes){
    if(!valid())return;
    // Re-read selected and incoming IDs after every native click, including any
    // coupled selections made by the game (for example a trailer's towing unit).
    const current=coverage(parsed.rule);if(current.total>=parsed.count)break;
    const entry=unit(node);if(!entry||current.seen.has(entry.id)||!contribution(entry,parsed.rule)||node.checked||node.disabled||!node.isConnected)continue;
    const result=api.select(node);if(result.blocked)throw Error(result.blocked);if(result.selected)added++;
    if(++attempts>=100)break;
    await new Promise(resolve=>setTimeout(resolve,0));
   }
   if(!valid())return;
   const current=coverage(parsed.rule),shortfall=Math.max(0,parsed.count-current.total);
   write(badge,!shortfall,`${Math.min(current.total,parsed.count)} / ${parsed.count} covered by selected or incoming units. Selected units still need dispatch.`);
   feedback(badge,shortfall?`${parsed.name}: selected ${added} more; ${shortfall} still needed. Load more vehicles or check availability, then click again.`:`${parsed.name}: ${added?'selected '+added+' more.':'already covered.'} Ready for you to dispatch.`,shortfall);
  }catch(error){if(valid())feedback(badge,String(error.message||'Could not select units. Try again.'));}
  finally{selecting=false;badge.removeAttribute('aria-busy');for(const button of document.querySelectorAll('#nx-missing button[data-nx-vehicle-requirement]'))button.removeAttribute('aria-disabled');schedule();}
 }
 function activate(){if(!active){active=true;document.addEventListener('change',changed);document.addEventListener('click',selectedByControl);if(buttonsEnabled)document.addEventListener('click',selectRequirement);watch();schedule();}else watch();}
 function suspend(){active=false;serial++;action++;clearTimeout(timer);timer=null;again=false;for(const {observer}of observers.values())observer.disconnect();observers.clear();document.removeEventListener('change',changed);document.removeEventListener('click',selectedByControl);document.removeEventListener('click',selectRequirement);for(const badge of document.querySelectorAll('#nx-missing [data-nx-vehicle-requirement]'))write(badge,false,'Coverage updates resume when this mission is visible.');}
})();
