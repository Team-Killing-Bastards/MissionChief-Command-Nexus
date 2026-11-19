/* Naming helpers: no lookup, scan or timer until a naming action requests one. */
(() => {
 'use strict';
 const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
 const stripId=value=>clean(value).replace(/\s*\[[a-z\d_-]{6,}\]\s*$/i,'').trim();
 const placeholder=value=>{const s=stripId(value).replace(/(?:[-_#\s]*\d+)$/,'').trim();return !s||/^(?:unnamed|unknown|new (?:building|station)|building|station|home\s*response(?:\s*location)?|(?:small |large )?(?:fire|ambulance|police)(?: station| base)?(?: \(small(?: station)?\))?|medical helicopter station|(?:fire|police|medical) (?:academy|training cent(?:re|er))|hospital|urgent treatment cent(?:re|er)|gp surgery|hart base|coastguard(?: rescue)? station|lifeboat station|lifeguard station|search and rescue hq|mountain rescue station|recovery cent(?:re|er)|bomb disposal hq)$/i.test(s);};
 const area=value=>{const s=stripId(value);return s.length<=120&&/\p{L}/u.test(s)&&!/[<>\[\]{}]/.test(s)&&!placeholder(s)&&! /^(?:United Kingdom|UK|Great Britain|Britain|Ireland|Scotland|England|Wales|Northern Ireland|Unknown|undefined|null)$/i.test(s)?s:'';};
 function coordinates(lat,lon){if(lat==null||lon==null||typeof lat==='boolean'||typeof lon==='boolean'||String(lat).trim()===''||String(lon).trim()==='')return null;lat=Number(lat);lon=Number(lon);return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=49&&lat<=62&&lon>=-12&&lon<=3?{latitude:lat,longitude:lon}:null;}
 let inventory=null,inventoryAt=0,inflight=null;
 async function locate(id,provided){
  const direct=coordinates(provided?.latitude,provided?.longitude);if(direct)return direct;
  if(!/^[1-9]\d*$/.test(String(id)))throw Error('Station coordinates unavailable. Name left unchanged.');
  if(!inventory||Date.now()-inventoryAt>60000){if(!inflight)inflight=(async()=>{const r=await fetch('/api/buildings',{credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Station coordinate lookup returned HTTP '+r.status);const rows=await r.json();if(!Array.isArray(rows)||rows.length>20000)throw Error('Station coordinate list unavailable.');inventory=new Map(rows.map(b=>[String(b.id),coordinates(b.latitude,b.longitude)]));inventoryAt=Date.now();})().finally(()=>{inflight=null;});await inflight;}
  const point=inventory.get(String(id));if(!point)throw Error('No verified coordinates for this station. Name left unchanged.');return point;
 }
 function nearest(point,{signal}={}){
  const coords=coordinates(point?.latitude,point?.longitude);if(!coords)return Promise.reject(Error('Station coordinates are outside the supported naming area.'));
  return new Promise((resolve,reject)=>{const id=crypto.randomUUID();let timer;const finish=(error,value)=>{clearTimeout(timer);window.removeEventListener('message',receive);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};const abort=()=>finish(new DOMException('Naming lookup cancelled','AbortError'));
   const receive=event=>{const m=event.data;if(event.source!==window||event.origin!==location.origin||m?.source!=='nexus-naming-place-result'||m.id!==id)return;const p=m.result?.place;if(!m.result?.ok||!area(p?.name)||!Number.isFinite(p.distanceKm)||p.distanceKm>25){finish(Error(m.result?.error||'No nearby town or village could be verified. Name left unchanged.'));return;}finish(null,{...p,name:area(p.name)});};
   if(signal?.aborted){abort();return;}window.addEventListener('message',receive);signal?.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>finish(Error('Nearby-place lookup timed out. Name left unchanged.')),12000);window.postMessage({source:'nexus-naming-place',id,...coords},location.origin);
  });
 }
 async function resolveBase(name,id,provided,options={}){const cleaned=stripId(name);if(!placeholder(cleaned))return cleaned;const point=await locate(id,provided);if(options.signal?.aborted)throw new DOMException('Naming lookup cancelled','AbortError');const place=await nearest(point,options);return place.name.replace(/\band\b/gi,'&').toUpperCase();}
 globalThis.NexusNaming={stripId,placeholder,area,coordinates,locate,nearest,resolveBase};
})();
