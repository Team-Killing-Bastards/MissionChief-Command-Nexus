/* Fixed-purpose bridge: bounded map rectangle + selected Realism types can leave the game page. */
(()=>{
  if(/^mcn-v3-/.test(window.name))return;
  window.addEventListener('message',event=>{
    const m=event.data;if(event.source!==window||event.origin!==location.origin||m?.source!=='nexus-real-locations-ui'||typeof m.id!=='string'||m.id.length>80)return;
    if(!['load','cancel'].includes(m.action))return;
    const request={type:m.action==='load'?'NEXUS_REAL_LOCATIONS_LOAD':'NEXUS_REAL_LOCATIONS_CANCEL'};
    if(m.action==='load'){request.bounds=m.bounds;request.types=Array.isArray(m.types)?m.types.slice(0,20):[];}
    chrome.runtime.sendMessage(request).then(result=>window.postMessage({source:'nexus-real-locations-result',id:m.id,result},location.origin)).catch(()=>window.postMessage({source:'nexus-real-locations-result',id:m.id,result:{ok:false,error:'Reload MissionChief after enabling the updated Nexus extension.'}},location.origin));
  });
})();
