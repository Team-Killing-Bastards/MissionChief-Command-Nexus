export const categories=['fire_station','police_station','ambulance_station','dispatch_centre','hospital','prison','mountain_rescue','coastguard_station','lifeboat_station'];
export function cleanBounds(value){
  if(!Array.isArray(value)||value.length!==4||!value.every(Number.isFinite))throw Error('Move to a local area and try again.');
  const [s,w,n,e]=value;
  if(s < -85 || n > 85 || w < -180 || e > 180 || n<=s || e<=w || n-s>4 || e-w>6)throw Error('Zoom in to a smaller area, then load locations.');
  return value.map(v=>Number(v.toFixed(5)));
}
export function cleanTypes(value){
  if(!Array.isArray(value))return [];
  return [...new Set(value.filter(v=>categories.includes(v)))].slice(0,categories.length);
}
export function apiUrl(bounds,types,limit=2000){
  const [s,w,n,e]=cleanBounds(bounds),selected=cleanTypes(types);if(!selected.length)throw Error('Choose at least one Realism Map type.');
  const u=new URL('https://nexus.blyth.scot/v1/realism/locations');u.searchParams.set('north',n);u.searchParams.set('south',s);u.searchParams.set('east',e);u.searchParams.set('west',w);u.searchParams.set('types',selected.join(','));u.searchParams.set('limit',String(Math.max(1,Math.min(5000,limit))));return u.toString();
}
