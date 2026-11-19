/* One explicit profile station at a time, using the normal station engine. */
(() => {
 'use strict';
 if(window===window.top)return;
 const id=location.pathname.match(/^\/buildings\/(\d+)\/?$/)?.[1],nonce=new URLSearchParams(location.hash.slice(1)).get('nexus-profile-batch');
 if(!id||!nonce||!/^[a-f0-9-]{36}$/.test(nonce)||window.name!=='nexus-profile-batch-'+nonce)return;
 const engine=globalThis.NexusStationProfilesEngine;if(!engine)return;
 let busy=false,stop=false,consumed=false;
 const send=(requestId,type,detail={})=>window.parent.postMessage({channel:'nexus-profile-batch-result',nonce,stationId:id,requestId,type,...detail},location.origin);
 window.addEventListener('pagehide',()=>{stop=true;});
 window.addEventListener('message',event=>{
  const m=event.data;if(event.origin!==location.origin||event.source!==window.parent||m?.channel!=='nexus-profile-batch-command'||m.nonce!==nonce||String(m.stationId)!==id)return;
  if(m.type==='stop'){stop=true;return;}
  if(m.type==='ready'){send(m.requestId,'ready',{crewReady:!!window.__NEXUS_ASSIGN_CREW__?.profileCrew});return;}
  if(m.type!=='apply'||busy||consumed||typeof m.requestId!=='string')return;
  busy=true;consumed=true;stop=false;
  void(async()=>{
    try{
      const progress=text=>send(m.requestId,'progress',{text:String(text).slice(0,1000)});
      const plan=engine.reconcileBatchApproval(await engine.review(m.profile,null,progress),m.approval,progress);
      if(Number.isSafeInteger(m.reviewedCost)&&plan.cost!==m.reviewedCost)progress('Credit estimate updated from '+m.reviewedCost.toLocaleString()+' to '+plan.cost.toLocaleString()+'. Continuing at current game prices.');
      if(stop){send(m.requestId,'done',{result:{spent:0,stopped:true}});return;}
      const result=await engine.apply(plan,progress,()=>stop,false,{allowCreditPriceChanges:true});
      send(m.requestId,'done',{result});
    }catch(error){send(m.requestId,'error',{error:String(error.message).slice(0,1200)});}
    finally{busy=false;}
  })();
 });
 send('', 'available');
})();
