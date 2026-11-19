/* Bounded transport recovery: retry reads, reconcile writes, never replay a purchase. */
(() => {
  'use strict';
  function create({onRecover=()=>{},readTimeout=6000,writeTimeout=12000,retryTimeout=12000}={}){
    const pending=new Map();let closed=false;
    const reads=new Set(['read','find','regions']);
    const send=p=>window.postMessage({source:'nexus-town-ui',id:p.id,action:p.action,...p.fields},location.origin);
    function finish(p,error,result){if(!pending.delete(p.id))return;clearTimeout(p.timer);error?p.reject(error):p.resolve(result);}
    function arm(p,ms){clearTimeout(p.timer);p.timer=setTimeout(()=>void expired(p),ms);}
    async function expired(p){
      if(!pending.has(p.id)||p.reconciling)return;
      if(reads.has(p.action)){
        if(p.attempts++===0){onRecover('Reconnecting to saved town state…');send(p);arm(p,retryTimeout);return;}
        finish(p,Error('Town state could not be read after reconnecting. No new purchase was sent. Reopen Home Response towns; if the extension was updated, reload the game.'));return;
      }
      // A missing save reply is not permission to send the save again. Read its result.
      p.reconciling=true;onRecover('Checking whether town progress was saved…');
      try{
        const state=await request('read',p.action==='journal'?{keys:[p.fields.key],includePlan:false}:{includeJournal:false});
        if(!pending.has(p.id))return;
        const matches=p.action==='journal'?(p.fields.value===null?state.journal[p.fields.key]==null:JSON.stringify(state.journal[p.fields.key])===JSON.stringify(p.fields.value)):
          p.action==='save'&&state.revision>p.fields.revision&&JSON.stringify(globalThis.NexusTownCore.plan(state.plan))===JSON.stringify(globalThis.NexusTownCore.plan(p.fields.plan));
        if(!matches)throw Error('Town progress save is unverified. No new purchase was sent. Reopen Home Response towns to check the current state.');
        finish(p,null,{ok:true,revision:state.revision,recovered:true});
      }catch(e){finish(p,e);}
    }
    function receive(event){
      const m=event.data;if(event.source!==window||event.origin!==location.origin||m?.source!=='nexus-town-result')return;
      const p=pending.get(m.id);if(!p)return;
      if(m.result?.ok){finish(p,null,m.result);return;}
      if(m.result?.retryable&&(!reads.has(p.action)||p.attempts===0)){clearTimeout(p.timer);void expired(p);return;}
      finish(p,Error(m.result?.error||'Town state service is unavailable. Reopen Home Response towns.'));
    }
    function request(action,fields={}){
      if(closed)return Promise.reject(Error('Town page closed.'));
      return new Promise((resolve,reject)=>{const p={id:crypto.randomUUID(),action,fields,resolve,reject,attempts:0};pending.set(p.id,p);send(p);arm(p,reads.has(action)?readTimeout:writeTimeout);});
    }
    window.addEventListener('message',receive);
    return {request,close(){closed=true;window.removeEventListener('message',receive);for(const p of pending.values())finish(p,Error('Town page closed.'));}};
  }
  globalThis.NexusTownClient={create};
})();
