/* Small, event-driven coverage marks for native missing-vehicle counts; no fleet fetch or game hooks. */
(() => {
 'use strict';
  if (globalThis.NexusSettings?.enabled('requirementTicks') === false) return;
 if(!/^\/missions\/\d+\/?$/.test(location.pathname)||/^mcn-v3-(active-worker|pipeline-preload)-/.test(window.name||''))return;
 try{if(window.frameElement?.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload],#mcn-v3-background-mission-worker'))return;}catch{return;}
 if(window.__NEXUS_REQUIREMENT_TICKS__||!window.__NEXUS_REQUIREMENT_DATA__)return;
 const normal=value=>String(value??'').replace(/\s+/g,' ').trim().replace(/\.$/,'').toLowerCase(),rules=new Map(),byType=new Map(),byEquipment=new Map();
 for(const rule of __NEXUS_REQUIREMENT_DATA__){for(const label of rule.texts)rules.set(normal(label),rule);for(const [index,keys]of [[byType,rule.vehicles],[byEquipment,rule.equipment||[]]])for(const key of keys){if(!index.has(key))index.set(key,new Set());index.get(key).add(rule);}}
 const amount='(?:\\d{1,3}(?:,\\d{3})+|\\d+)',prefix=new RegExp(`^(${amount})x?\\s+(.+)$`,'i'),suffix=new RegExp(`^(.+):\\s*(${amount})x?$`,'i');
 let active=false,timer=null,serial=0,running=false,again=false,observers=new Map();
 const state=window.__NEXUS_REQUIREMENT_TICKS__={activate,suspend,refresh:schedule,split,supports:label=>!!parse(label),passes:0,lastCandidates:0,limited:false};
 function split(raw){return raw.split(/(?:,(?!\d{3}\b)|[;\n])\s*(?=\d[\d,]*x?\s+[^\d\s]|[^,;:\n]+:\s*\d)/i).map(s=>s.trim()).filter(Boolean).slice(0,60);}
 function parse(label){const value=String(label).replace(/\s+/g,' ').trim().replace(/\.$/,'');const first=value.match(prefix),last=first?null:value.match(suffix);if(!first&&!last)return null;const count=Number((first?first[1]:last[2]).replaceAll(',','')),rule=rules.get(normal(first?first[2]:last[1]));return count>0&&Number.isSafeInteger(count)&&rule?{count,rule}:null;}
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
  const previous=badge.querySelector('[data-nx-requirement-tick]');if(!covered){previous?.remove();return;}if(previous)return;
  const tick=document.createElement('span');tick.dataset.nxRequirementTick='1';tick.dataset.nexusComfort='1';tick.textContent='✓';tick.className='nx-requirement-tick';tick.setAttribute('role','img');tick.setAttribute('aria-label','Requirement covered by selected or en-route units');badge.append(tick);
 }
 async function refresh(){
  timer=null;if(!visible())return;if(running){again=true;return;}
  const badges=[...document.querySelectorAll('#nx-missing [data-nx-vehicle-requirement]')].slice(0,60);if(!badges.length)return;
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
    write(badge,picked+enRoute>=parsed.count,`${enRoute}${unit(enRoute)} en route + ${picked}${unit(picked)} selected / ${parsed.count} still required by the game. Units already on scene are accounted for by the game.${picked?' Selected units still need dispatch.':''}`);
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
 function activate(){if(!active){active=true;document.addEventListener('change',changed);document.addEventListener('click',selectedByControl);watch();schedule();}else watch();}
 function suspend(){active=false;serial++;clearTimeout(timer);timer=null;again=false;for(const {observer}of observers.values())observer.disconnect();observers.clear();document.removeEventListener('change',changed);document.removeEventListener('click',selectedByControl);for(const badge of document.querySelectorAll('#nx-missing [data-nx-vehicle-requirement]'))write(badge,false,'Coverage updates resume when this mission is visible.');}
})();
