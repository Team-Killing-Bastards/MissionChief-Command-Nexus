/* Packaged data, loaded once on first naming fallback; never used by Auto Mode. */
export function makePlaceIndex(data){
 if(data?.format!==1||!Array.isArray(data.places)||data.places.length>60000)throw Error('Nearby-place data is unavailable.');
 const grid=new Map();for(const row of data.places){const [id,name,lat,lon,country]=row;if(!Number.isSafeInteger(id)||typeof name!=='string'||!name.trim()||name.length>120||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<49||lat>62||lon< -12||lon>3||!['GB','IE','IM','JE','GG'].includes(country))throw Error('Nearby-place data is invalid.');const key=Math.floor(lat*4)+':'+Math.floor(lon*4);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(row);}return grid;
}
export function nearestPlace(grid,lat,lon){
 if(typeof lat!=='number'||typeof lon!=='number'||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<49||lat>62||lon< -12||lon>3)throw Error('Coordinates are outside the supported naming area.');
 const rad=Math.PI/180,latSpan=25/110,lonSpan=25/(110*Math.cos((lat+latSpan)*rad));let best=null;
 for(let a=Math.floor((lat-latSpan)*4);a<=Math.floor((lat+latSpan)*4);a++)for(let b=Math.floor((lon-lonSpan)*4);b<=Math.floor((lon+lonSpan)*4);b++)for(const [id,name,pLat,pLon,country]of grid.get(a+':'+b)||[]){const h=Math.sin((pLat-lat)*rad/2)**2+Math.cos(lat*rad)*Math.cos(pLat*rad)*Math.sin((pLon-lon)*rad/2)**2,km=12742*Math.asin(Math.sqrt(Math.min(1,h)));if(km<=25&&(!best||km<best.distanceKm||(km===best.distanceKm&&id<best.id)))best={id,name,latitude:pLat,longitude:pLon,country,distanceKm:km,source:'GeoNames'};}
 return best;
}
export function createNamingHandler({load=async()=>{const r=await fetch(new URL('./nexus-naming-places.json',import.meta.url));if(!r.ok)throw Error('Nearby-place data could not load.');return r.json();}}={}){
 let indexPromise;const cache=new Map();
 return (message,sender,reply)=>{
  if(message?.type!=='NEXUS_NAMING_NEAREST_PLACE')return false;
  try{if(!sender.tab||!['https://www.missionchief.co.uk','https://police.missionchief.co.uk'].includes(new URL(sender.url).origin))return false;nearestPlace(new Map(),message.latitude,message.longitude);}catch(error){reply({ok:false,error:error.message});return false;}
  const key=message.latitude+':'+message.longitude;if(cache.has(key)){reply(cache.get(key));return false;}
  if(!indexPromise)indexPromise=Promise.resolve().then(load).then(makePlaceIndex).catch(e=>{indexPromise=null;throw e;});
  indexPromise.then(grid=>{const place=nearestPlace(grid,message.latitude,message.longitude),result=place?{ok:true,place}:{ok:false,error:'No mapped town or village within 25 km. Name left unchanged; review this station.'};cache.set(key,result);if(cache.size>512)cache.delete(cache.keys().next().value);reply(result);}).catch(e=>reply({ok:false,error:e.message}));return true;
 };
}
if(typeof chrome!=='undefined'&&chrome.runtime?.onMessage)chrome.runtime.onMessage.addListener(createNamingHandler());
