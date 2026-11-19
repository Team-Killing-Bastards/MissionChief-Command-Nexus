/* Fixed-purpose bridge: bounded map rectangle + selected Realism types can leave the game page. */
(()=>{
  if(/^mcn-v3-/.test(window.name))return;
  if(window===window.top)window.addEventListener('message',event=>{
    const m=event.data;if(event.source!==window||event.origin!==location.origin||m?.source!=='nexus-town-ui'||typeof m.id!=='string'||m.id.length>80||!['read','regions','find','save','journal'].includes(m.action))return;
    const player=document.querySelector('#navbar_profile_link')?.getAttribute('href')?.match(/^\/profile\/(\d{1,16})$/)?.[1];
    const request={type:'NEXUS_TOWN_PLAN',player,action:m.action,bounds:m.bounds,spacingMiles:m.spacingMiles,area:m.area,plan:m.plan,revision:m.revision,key:m.key,value:m.value,keys:m.keys,includePlan:m.includePlan,includeJournal:m.includeJournal};
    const respond=result=>window.postMessage({source:'nexus-town-result',id:m.id,result},location.origin);
    Promise.resolve().then(()=>chrome.runtime.sendMessage(request)).then(result=>respond(result||{ok:false,retryable:true,error:'Town worker did not reply.'})).catch(error=>{
      const invalid=/context invalidated|extension.*(?:unloaded|disabled)|cannot read properties.*sendMessage/i.test(String(error?.message));
      respond({ok:false,retryable:!invalid,error:invalid?'Nexus was reloaded or disabled. Reload this MissionChief page to reconnect.':'The connection to saved town state was interrupted.'});
    });
  });
  window.addEventListener('message',event=>{
    const m=event.data;if(event.source!==window||event.origin!==location.origin||m?.source!=='nexus-real-locations-ui'||typeof m.id!=='string'||m.id.length>80)return;
    if(!['load','cancel'].includes(m.action))return;
    const request={type:m.action==='load'?'NEXUS_REAL_LOCATIONS_LOAD':'NEXUS_REAL_LOCATIONS_CANCEL'};
    if(m.action==='load'){request.bounds=m.bounds;request.types=Array.isArray(m.types)?m.types.slice(0,20):[];}
    chrome.runtime.sendMessage(request).then(result=>window.postMessage({source:'nexus-real-locations-result',id:m.id,result},location.origin)).catch(()=>window.postMessage({source:'nexus-real-locations-result',id:m.id,result:{ok:false,error:'Reload MissionChief after enabling the updated Nexus extension.'}},location.origin));
  });
})();
