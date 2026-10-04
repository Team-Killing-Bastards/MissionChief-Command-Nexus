import {apiUrl,cleanBounds,cleanTypes} from './nexus-real-locations-core.mjs';
export function createRealismHandler({fetchImpl=fetch}={}){
  const jobs=new Map();
  return (message,sender,reply)=>{
    if(!['NEXUS_REAL_LOCATIONS_LOAD','NEXUS_REAL_LOCATIONS_CANCEL'].includes(message?.type))return false;
    try{if(!sender.tab||!['https://www.missionchief.co.uk','https://police.missionchief.co.uk'].includes(new URL(sender.url).origin))return false;}catch{return false;}
    const owner=sender.tab.id+':'+sender.frameId;
    if(message.type==='NEXUS_REAL_LOCATIONS_CANCEL'){jobs.get(owner)?.abort?.();jobs.delete(owner);reply({ok:true});return false;}
    let bounds,types,url;try{bounds=cleanBounds(message.bounds);types=cleanTypes(message.types);url=apiUrl(bounds,types);}catch(e){reply({ok:false,error:e.message});return false;}
    const controller=new AbortController(),job={abort:()=>controller.abort()};jobs.get(owner)?.abort?.();jobs.set(owner,job);
    fetchImpl(url,{signal:controller.signal,cache:'no-store'}).then(async response=>{if(!response.ok)throw Error('Nexus Realism server returned '+response.status+'.');const data=await response.json();if(!data||!Array.isArray(data.locations))throw Error('Nexus Realism server returned invalid data.');const locations=data.locations.slice(0,5000).map(row=>({id:row.id,source:row.source,source_type:row.source_type,source_id:row.source_id,name:row.name||'',latitude:Number(row.latitude),longitude:Number(row.longitude),address:row.address||{},services:Array.isArray(row.services)?row.services.filter(s=>types.includes(s)):[]})).filter(row=>Number.isFinite(row.latitude)&&Number.isFinite(row.longitude)&&row.services.length);return {ok:true,locations,bounds:data.bounds||{},types,cacheKey:bounds.map(v=>v.toFixed(3)).join(',')+'|'+types.join(',')};}).then(result=>{if(jobs.get(owner)!==job)return reply({ok:false,error:'Search cancelled.'});reply(result);}).catch(e=>{if(e?.name==='AbortError')return reply({ok:false,error:'Search cancelled.'});reply({ok:false,error:e?.message||'Unable to load Nexus Realism Map.'});}).finally(()=>{if(jobs.get(owner)===job)jobs.delete(owner);});return true;
  };
}
if(typeof chrome!=='undefined'&&chrome.runtime?.onMessage)chrome.runtime.onMessage.addListener(createRealismHandler());
