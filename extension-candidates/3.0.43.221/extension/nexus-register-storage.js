/* Legacy register decoding and compatibility reads from the durable database. */
(()=>{'use strict';
 const key='mcPersonnelVehicleTrainingRegistry_v1',prefix='NEXUS-REGISTER-PACK-1\n';
 const names=['vehicleId','vehicleName','vehicleTypeId','stationName','stationHref','assignedPersonnelCount','assignmentScanComplete','personnelRowsSeen','trainingCounts','trainingCombinationCounts','assignedTrainingProfiles','trainingProfilesComplete','updatedAt','source','schemaVersion','vehicles','personnel-register-exact-assign-crew','personnel-register-exact-','swat+traffic_police'];
 const tokens=names.map((_,i)=>String.fromCharCode(0xe000+i));
 function legacyPack(raw){if(tokens.some(t=>raw.includes(t)))return raw;let value=raw;names.forEach((n,i)=>{value=value.split(JSON.stringify(n)).join(tokens[i]);});return value.length+prefix.length<raw.length?prefix+value:raw;}
 function legacyUnpack(raw){if(typeof raw!=='string'||!raw.startsWith(prefix))return raw;let value=raw.slice(prefix.length);names.forEach((n,i)=>{value=value.split(tokens[i]).join(JSON.stringify(n));});return value;}

 const compactPrefix='NEXUS-REGISTER-PACK-2\n', limit=63000;
 // Bounded LZW dictionary. Code units skip controls/surrogates so browser storage
 // preserves the payload. The original JSON is recovered byte-for-byte as a JS string.
 const encodeCode=n=>String.fromCharCode(n+32+(n+32>=0xd800?0x800:0));
 const decodeCode=c=>{const n=c.charCodeAt(0);return n-(n>=0xe000?0x800:0)-32;};
 function pack(raw){
  if(!raw)return raw;
  const alphabet=[...new Set(raw.split(''))];
  if(alphabet.length>=limit)return legacyPack(raw);
  const dictionary=new Map(alphabet.map((c,i)=>[c,i]));let next=alphabet.length,word='',out=[];
  for(let i=0;i<raw.length;i++){
   const c=raw[i],combined=word+c;
   if(dictionary.has(combined)){word=combined;continue;}
   out.push(encodeCode(dictionary.get(word)));
   if(next<limit)dictionary.set(combined,next++);
   word=c;
  }
  if(word)out.push(encodeCode(dictionary.get(word)));
  const packed=compactPrefix+JSON.stringify(alphabet.join(''))+'\n'+out.join('');
  return packed.length<raw.length?packed:legacyPack(raw);
 }
 function unpack(raw){
  if(typeof raw!=='string'||!raw.startsWith(compactPrefix))return legacyUnpack(raw);
  const split=raw.indexOf('\n',compactPrefix.length);
  if(split<0)throw Error('Training register compression header is invalid');
  const dictionary=JSON.parse(raw.slice(compactPrefix.length,split)).split('');
  let next=dictionary.length,word='',out=[];
  for(let i=split+1;i<raw.length;i++){
   const code=decodeCode(raw[i]);
   const entry=dictionary[code] ?? (code===next&&word?word+word[0]:null);
   if(entry===null||entry===undefined)throw Error('Training register compressed data is invalid');
   out.push(entry);
   if(word&&next<limit)dictionary[next++]=word+entry[0];
   word=entry;
  }
  return out.join('');
 }
 const proto=Storage.prototype,get=proto.getItem,set=proto.setItem;let local;try{local=localStorage;}catch{return;}
 // One bounded snapshot: still read authoritative storage every time, but only
 // expand it when the stored value changes (including writes from other tabs).
 let cachedStored,cachedDecoded;
 proto.getItem=function(k){if(this===local&&String(k)===key&&window.NexusPersonnelStore)return window.NexusPersonnelStore.readRaw();const raw=get.call(this,k);if(this!==local||String(k)!==key)return raw;if(raw!==cachedStored){cachedDecoded=unpack(raw);cachedStored=raw;}return cachedDecoded;};
 proto.setItem=function(k,v){if(this!==local||String(k)!==key)return set.call(this,k,v);if(window.NexusPersonnelStore)throw Error('Personnel register writes must use the durable database');const decoded=String(v),stored=decoded===cachedDecoded?cachedStored:pack(decoded);const result=set.call(this,k,stored);cachedStored=stored;cachedDecoded=decoded;return result;};
 window.__NEXUS_REGISTER_PACK__={pack,unpack,readLegacy:()=>unpack(get.call(local,key)),removeLegacyIfEqual:raw=>{if(unpack(get.call(local,key))===raw){local.removeItem(key);cachedStored=cachedDecoded=undefined;}}};
 // The IDB migration copies the verified records before removing this legacy value.
 // Do not recompress a large register on the game thread during startup.
})();
