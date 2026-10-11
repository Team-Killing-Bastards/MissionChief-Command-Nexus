/* Native building quotes. No guessed prices, remote code, coin actions or automatic scans. */
(()=>{'use strict';
 const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
 const field=(doc,name)=>[...doc.querySelectorAll('dt')].find(n=>clean(n.textContent).replace(/:$/,'')===name)?.nextElementSibling;
 const credits=text=>{const m=clean(text).match(/(?:^|\()([\d,]+)\s+Credits\b/i);if(!m)return null;const n=Number(m[1].replaceAll(',',''));return Number.isSafeInteger(n)&&n>=0?n:null;};
 function actionPath(href,id,kind){
  if(!/^\d+$/.test(String(id))||!href?.startsWith('/')||href.startsWith('//'))return null;
  const u=new URL(href,location.origin);if(u.origin!==location.origin||u.hash)return null;
  const keys=[...u.searchParams.keys()];if(new Set(keys).size!==keys.length)return null;
  if(kind==='level'&&u.pathname===`/buildings/${id}/expand_do/credits`&&keys.length===1&&keys[0]==='level'&&/^\d+$/.test(u.searchParams.get('level')))return u.pathname+u.search;
  if(kind==='extension'&&new RegExp(`^/buildings/${id}/extension/credits/\\d+$`).test(u.pathname)&&keys.every(k=>k==='redirect_building_id')&&(!keys.length||u.searchParams.get('redirect_building_id')===String(id)))return u.pathname+u.search;
  if(kind==='specialization'&&u.pathname==='/building_specializations'&&keys.length===3&&keys.every(k=>['building_id','pay_with','type'].includes(k))&&u.searchParams.get('building_id')===String(id)&&u.searchParams.get('pay_with')==='credits'&&/^[a-z0-9_]+$/.test(u.searchParams.get('type')||''))return u.pathname+u.search;
  return null;
 }
 const disabled=n=>n.matches('.disabled,[disabled],[aria-disabled="true"]')||!!n.closest('.disabled,[disabled]');
 function rows(doc,id,kind){
  const result=[],seen=new Set();const selector=kind==='extension'?'#ausbauten tbody tr':doc.querySelector('#specialization .specializations-desktop')?'#specialization .specializations-desktop tbody tr':'#specialization tbody tr';
  for(const row of doc.querySelectorAll(selector)){
   const name=clean(row.querySelector('td b,td strong')?.textContent);if(!name)continue;
   const a=[...row.querySelectorAll('a[href]')].find(a=>actionPath(a.getAttribute('href'),id,kind));
   const path=a&&actionPath(a.getAttribute('href'),id,kind),key=path?(kind==='extension'?new URL(path,location.origin).pathname.split('/').at(-1):new URL(path,location.origin).searchParams.get('type')):name;
   if(path&&seen.has(key))continue;if(path)seen.add(key);
   const cost=a?credits(a.textContent):null;
   const method=(a?.getAttribute('data-method')||'get').toLowerCase();
   const started=!!row.querySelector('.extension-timer,[data-end-time],.label-success,.label-danger,a[href*="/extension_ready/"],a[data-method="delete"][href^="/building_specializations/"]');
   const reason=clean([...row.querySelectorAll('.text-danger')].map(n=>n.textContent).join('; '));
   result.push({kind,key,name,path,cost,method,started,available:!!a&&!started&&!disabled(a)&&!reason&&cost!==null&&method==='post',reason:reason||(started?'Already built or under construction':!a?(started?'Already built or under construction':'Not offered by the game'):disabled(a)?'Game prerequisites not met':cost===null?'Credit price unavailable':method!=='post'?'Purchase method not recognised':'')});
  }
  return result;
 }
 function station(doc,id){
  const text=clean(field(doc,'Level')?.textContent),m=text.match(/^\d+/),level=m?Number(m[0]):null;
  if(!doc.querySelector('h1')||(level===null&&!doc.querySelector(`a[href="/buildings/${id}/edit"]`)))throw Error('Building page is unavailable or its level cannot be read.');
  return {id:String(id),name:clean(doc.querySelector('h1').textContent),level,expand:!!doc.querySelector(`a[href="/buildings/${id}/expand"]`),extensions:rows(doc,id,'extension'),specializations:rows(doc,id,'specialization')};
 }
 function levels(doc,id,current){
  const out=[];for(const block of doc.querySelectorAll('.price_level')){
   const target=Number(clean(field(block,'Expand to level')?.textContent));
   const a=[...block.querySelectorAll('a[href]')].find(n=>actionPath(n.getAttribute('href'),id,'level'));
   if(!a||disabled(a)||!Number.isInteger(target)||target<=current)continue;
   const cost=credits(a.textContent),path=actionPath(a.getAttribute('href'),id,'level');
   if(cost!==null)out.push({kind:'level',key:String(target),target,name:'Level '+target,cost,path,method:(a.getAttribute('data-method')||'get').toLowerCase(),available:true});
  }
  if(!out.length)throw Error('Native expansion prices could not be read; no level purchase will be sent.');
  // Native links encode the offered target minus one, independently of current level.
  if(out.some(x=>x.method!=='get'||Number(new URL(x.path,location.origin).searchParams.get('level'))!==x.target-1)||new Set(out.map(x=>x.target)).size!==out.length)throw Error('Expansion controls do not match the current level. Refresh the quotes.');
  return out;
 }
 function plan(quote,choice){
  const actions=[];if(choice.target!=null&&Number(choice.target)!==quote.level){const a=quote.levels.find(a=>a.target===Number(choice.target));if(!a)throw Error('Target level is no longer available.');actions.push(a);}
  for(const [key,list]of [['extensions',quote.extensions],['specializations',quote.specializations]])for(const selected of choice[key]||[]){const a=list.find(a=>a.key===selected);if(!a?.available)throw Error('Upgrade unavailable: '+(a?.name||selected)+(a?.reason?' — '+a.reason:''));actions.push(a);}
  return actions.map(a=>({...a,id:quote.id,building:quote.name}));
 }
 function purchaseWarning(doc,kind){
  const relevant=kind==='extension'?'#ausbauten':kind==='specialization'?'#specialization':null;
  return clean([...doc.querySelectorAll('.alert-danger')].filter(n=>{
   // The returned station page includes inactive tabs and their standing prerequisite warnings.
   if(n.closest('#building_complex,.building-complex-tab-container'))return false;
   const pane=n.closest('.tab-pane,#vehicle,#ausbauten,#specialization,#storage');
   return !pane||!!(relevant&&n.closest(relevant));
  }).map(n=>n.textContent).join(' '));
 }
 function verified(before,after,action){
  if(action.kind==='level')return after.level===action.target;
  const key=action.kind==='extension'?'extensions':'specializations';
  return after[key].filter(row=>row.name===action.name&&row.started).length>before[key].filter(row=>row.name===action.name&&row.started).length;
 }
 globalThis.NexusBuildingUpgradesCore={clean,credits,actionPath,station,levels,plan,purchaseWarning,verified};
})();
