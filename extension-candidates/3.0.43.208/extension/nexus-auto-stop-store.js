/* Keep the stop explanation visible to the controller even when site storage is full. */
(() => {
 'use strict';
 if(globalThis.NexusAutoStopStore)return;
 const key='mf_auto_stop_record_v10_6_153', slot='__NEXUS_AUTO_STOP_RAW__';
 let host;try{host=window.top;void host.location.origin;}catch{host=window;}
 const valid=raw=>{try{const r=JSON.parse(raw);return r&&typeof r.reason==='string'&&Number.isFinite(r.stoppedAt)?r:null;}catch{return null;}};
 globalThis.NexusAutoStopStore=Object.freeze({
  read(){
   // A string belongs to no worker realm and cannot retain a disposed mission frame.
   if(typeof host[slot]==='string')return host[slot];
   let newest=null,raw='';
   for(const storageName of ['localStorage','sessionStorage'])try{
    const candidate=window[storageName].getItem(key),record=valid(candidate);
    if(record&&(!newest||record.stoppedAt>newest.stoppedAt)){newest=record;raw=candidate;}
   }catch{}
   return raw;
  },
  write(raw){
   if(!valid(raw))throw Error('Invalid Auto Mode stop record');
   host[slot]=String(raw);
   for(const storageName of ['sessionStorage','localStorage'])try{window[storageName].setItem(key,raw);}catch{}
  },
  clear(){
   host[slot]='';
   for(const storageName of ['sessionStorage','localStorage'])try{window[storageName].removeItem(key);}catch{}
  }
 });
})();
