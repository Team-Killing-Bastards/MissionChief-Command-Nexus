/* Fixed local gazetteer query; no URL, account data or credentials cross this bridge. */
(() => {
 'use strict';if(/^mcn-v3-/.test(window.name||''))return;let pending=0;
 window.addEventListener('message',event=>{
  const m=event.data;if(event.source!==window||event.origin!==location.origin||m?.source!=='nexus-naming-place'||typeof m.id!=='string'||m.id.length>80)return;
  if(!Number.isFinite(m.latitude)||!Number.isFinite(m.longitude))return;
  const send=result=>window.postMessage({source:'nexus-naming-place-result',id:m.id,result},location.origin);
  if(pending>=2){send({ok:false,error:'Another naming lookup is still running.'});return;}pending++;
  chrome.runtime.sendMessage({type:'NEXUS_NAMING_NEAREST_PLACE',latitude:m.latitude,longitude:m.longitude}).then(send).catch(()=>send({ok:false,error:'Reload MissionChief after updating Nexus.'})).finally(()=>pending--);
 });
})();
