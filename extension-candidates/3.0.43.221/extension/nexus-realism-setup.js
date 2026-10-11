/* User-selected setup for a newly verified Realism building. No background queue. */
(()=>{'use strict';
 const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
 const pathFor=id=>{if(!/^\d+$/.test(String(id)))throw Error('Invalid building ID');return '/buildings/'+id;};
 async function read(path){const r=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Game returned HTTP '+r.status);return new DOMParser().parseFromString(await r.text(),'text/html');}
 function safePath(value,id){const url=new URL(value,location.origin);if(url.origin!==location.origin||!(url.pathname===pathFor(id)||url.pathname.startsWith(pathFor(id)+'/')))throw Error('Unexpected station action');return url.pathname+url.search;}
 function csrf(data,doc){if(data.get('authenticity_token'))return;const token=doc.querySelector('meta[name="csrf-token"]')?.content||document.querySelector('meta[name="csrf-token"]')?.content;if(token)data.set('authenticity_token',token);}
 async function submit(path,method,data,doc,id){
  path=safePath(path,id);method=method.toLowerCase();if(!['get','post','patch','put'].includes(method))throw Error('Unsupported station action');
  if(method!=='get'){data=data||new FormData();csrf(data,doc);if(method!=='post'){data.set('_method',method);method='post';}}
  const r=await fetch(path,{method:method.toUpperCase(),body:method==='get'?undefined:data,credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error('Game returned HTTP '+r.status+'; check the station before retrying');
 }
 function extensions(doc,id){
  return [...doc.querySelectorAll('#ausbauten tbody tr')].map(row=>{
   const name=clean(row.querySelector('b,strong')?.textContent);if(!name)return null;
   const purchase=[...row.querySelectorAll('a[href]')].find(a=>{try{const u=new URL(a.getAttribute('href'),location.origin);return u.origin===location.origin&&u.pathname.startsWith(pathFor(id)+'/extension/credits/')&&!a.matches('.disabled,[disabled],[aria-disabled="true"]');}catch{return false;}});
   return {name,purchase,price:clean(purchase?.textContent),started:!!row.querySelector('[data-end-time],a[href*="extension_ready"],.label-success,.label-danger')};
  }).filter(Boolean);
 }
 function serviceState(doc,id){const a=doc.querySelector(`a[href="${pathFor(id)}/active"]`);if(!a)return {value:null,link:null};const label=a.parentElement.querySelector('.label');const text=clean(label?.textContent||a.parentElement.textContent);return {value:/out of service|not in service|inactive/i.test(text)?'off':/in service/i.test(text)?'on':null,link:a};}
 async function options(buildingType,buildings){const sample=buildings.find(b=>String(b.building_type)===String(buildingType));if(!sample)return [];return [...new Map(extensions(await read(pathFor(sample.id)),sample.id).map(e=>[e.name,{name:e.name,price:e.price}])).values()];}
 async function apply(id,config,report){
  const base=pathFor(id),issues=[];
  const attempt=async(label,fn)=>{try{await fn();}catch(e){issues.push(label+': '+e.message);report(label+': '+e.message);}};
  if(config.personnelTarget!==''&&config.personnelTarget!=null)await attempt('Personnel target',async()=>{
   const target=Number(config.personnelTarget);if(!Number.isSafeInteger(target)||target<0||target>10000)throw Error('Enter a whole number from 0 to 10,000');
   const doc=await read(base+'/edit'),input=doc.querySelector('[name="building[personal_count_target]"]'),form=input?.form;if(!form)throw Error('This building does not offer a desired personnel target');
   const data=new FormData(form);data.set(input.name,String(target));await submit(form.getAttribute('action'),form.getAttribute('method')||'post',data,doc,id);
   const check=await read(base+'/edit');if(Number(check.querySelector('[name="building[personal_count_target]"]')?.value)!==target)throw Error('Save was not verified');report('Personnel target set to '+target);
  });
  if(['on','off'].includes(config.serviceStatus))await attempt('Service status',async()=>{
   const doc=await read(base),state=serviceState(doc,id);if(state.value===null)throw Error('Service status is unavailable for this building');
   if(state.value!==config.serviceStatus){await submit(state.link.getAttribute('href'),state.link.getAttribute('data-method')||'get',null,doc,id);if(serviceState(await read(base),id).value!==config.serviceStatus)throw Error('Switch was not verified; no second toggle sent');}
   report('Service '+(config.serviceStatus==='on'?'on':'off'));
  });
  for(const name of [...new Set(config.extensions||[])].slice(0,1))await attempt(name,async()=>{
   const doc=await read(base),rows=extensions(doc,id).filter(e=>e.name===name);
   if(rows.some(e=>e.started)){report(name+': already built or under construction');return;}
   const entry=rows.find(e=>e.purchase);if(!entry)throw Error('Credit purchase unavailable; check level, credits or construction requirements');
   await submit(entry.purchase.getAttribute('href'),entry.purchase.getAttribute('data-method')||'post',null,doc,id);
   const after=extensions(await read(base),id).filter(e=>e.name===name);if(!after.some(e=>e.started))throw Error('Construction was not verified; no retry sent');report(name+': construction started');
  });
  return issues;
 }
 globalThis.NexusRealismSetup={options,apply,extensions,serviceState};
})();
