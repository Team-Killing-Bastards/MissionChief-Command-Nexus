/* Optional diagnostic storage cannot crowd out operational state. MAIN world, before runtime. */
(() => {
 'use strict';
 if (globalThis.__NEXUS_STORAGE_GUARD__) return;
 let local; try { local = localStorage; } catch { return; }
 const proto = Storage.prototype, get = proto.getItem, set = proto.setItem, remove = proto.removeItem;
 const limits = new Map([['mf_unit_finder_diagnostics_v1',180000],['mf_staffing_failure_history_v1',60000],['mf_issue_recorder_v1',60000]]);
 const obsolete = key => /^nexus-full-missions-v1:\d+$/.test(key);
 const quota = error => error?.name === 'QuotaExceededError' || error?.code === 22;
 function report(event) {
  try {
   const host = window.top;
   const health = host.__NEXUS_STORAGE_HEALTH__ ||= host.JSON.parse('{"build":"3.0.43.70","events":[],"quotaRecoveries":0,"optionalWritesDropped":0}');
   // Parse in the top realm: never keep a worker object/prototype alive in this history.
   health.events.push(host.JSON.parse(JSON.stringify({at:Date.now(),...event})));
   if (health.events.length > 40) health.events.shift();
   if(event.action==='quota-recovered')health.quotaRecoveries++;
   if(event.action==='optional-write-dropped')health.optionalWritesDropped++;
  } catch {}
 }
 function bounded(raw,limit) {
  if(raw.length <= limit)return raw;
  try {
   let rows = JSON.parse(raw);
   if(!Array.isArray(rows))return '[]';
   rows=rows.slice(-120);
   let encoded=JSON.stringify(rows);
   while(encoded.length > limit && rows.length){rows.shift();encoded=JSON.stringify(rows);}
   return encoded;
  } catch { return '[]'; }
 }
 function inventory() {
  let totalChars=0,known=[];
  for(let i=0;i<local.length;i++){
   const key=local.key(i),value=get.call(local,key)||'';
   totalChars+=key.length+value.length;
   if(/^(?:mf_|nexus|mcPersonnel)/i.test(key))known.push({key,chars:value.length});
  }
  return {totalChars,known:known.sort((a,b)=>b.chars-a.chars).slice(0,24)};
 }
 function compact(emergency=false) {
  const keys=Array.from({length:local.length},(_,i)=>local.key(i));
  for(const key of keys){
   if(obsolete(key)){
    const chars=(get.call(local,key)||'').length;remove.call(local,key);
    report({action:'obsolete-cache-removed',key,chars});
   }else if(limits.has(key)){
    const raw=get.call(local,key)||'';
    if(emergency){remove.call(local,key);report({action:'diagnostic-history-released',key,chars:raw.length});continue;}
    const next=bounded(raw,limits.get(key));
    if(next!==raw){
     // Removing before the smaller write also works when storage is already full.
     remove.call(local,key);
     try{set.call(local,key,next);}catch(error){if(!quota(error))throw error;}
     report({action:'diagnostic-history-trimmed',key,beforeChars:raw.length,afterChars:next.length});
    }
   }
  }
 }
 proto.setItem=function(key,value){
  if(arguments.length<2 || typeof key==='symbol' || typeof value==='symbol')return set.apply(this,arguments);
  if(this!==local)return set.call(this,key,value);
  key=String(key);value=String(value);
  // This cache was never read on startup; the current map and durable analytics own the data.
  if(obsolete(key)){remove.call(local,key);return;}
  if(limits.has(key))value=bounded(value,limits.get(key));
  try{return set.call(this,key,value);}catch(error){
   if(!quota(error))throw error;
   report({action:'quota-exceeded',key,requestedChars:value.length,...inventory()});
   // Only disposable diagnostic data is eligible for reclamation, never settings/registers/locks.
   compact(true);
   try{const result=set.call(this,key,value);report({action:'quota-recovered',key});return result;}catch(retry){
    if(limits.has(key)&&quota(retry)){report({action:'optional-write-dropped',key});return;}
    // Operational writes must remain observable failures, not false saved-state confirmations.
    throw retry;
   }
  }
 };
 globalThis.__NEXUS_STORAGE_GUARD__={snapshot:()=>({inventory:inventory(),health:window.top.__NEXUS_STORAGE_HEALTH__||null})};
 try{const before=inventory();compact();report({action:'startup-inventory',before,after:inventory()});}catch(error){report({action:'storage-maintenance-failed',name:error.name});}
})();
