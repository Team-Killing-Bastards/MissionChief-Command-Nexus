/* Same-tab vehicle claims contain scalars only; no mission frames are retained. */
(() => {
  'use strict';
  let host;try{host=window.top;void host.location.origin;}catch{return;}
  if(window===host&&!host.NexusVehicleClaims){
    const claims=new Map();let lastPrune=0;
    const valid=id=>/^\d+$/.test(String(id));
    const prune=()=>{const now=Date.now();if(now-lastPrune<1000)return;lastPrune=now;for(const [id,r] of claims)if(r.until<=now)claims.delete(id);};
    host.NexusVehicleClaims=Object.freeze({
      claim(id,owner,ms=120000){prune();id=String(id);if(!valid(id)||typeof owner!=='string')return false;let old=claims.get(id);if(old&&old.until<=Date.now()){claims.delete(id);old=null;}if(old&&old.owner!==owner)return false;if(claims.size>=1000&&!old)return false;claims.set(id,{owner,until:Date.now()+Math.min(120000,Math.max(1000,ms))});return true;},
      held(id,owner){prune();const r=claims.get(String(id));return !!r&&r.until>Date.now()&&r.owner!==owner;},
      ids(owner){prune();return [...claims].filter(([,r])=>r.until>Date.now()&&r.owner!==owner).map(([id])=>id);},
      release(id,owner){if(claims.get(String(id))?.owner===owner)claims.delete(String(id));},
      releaseOwner(owner){for(const [id,r] of claims)if(r.owner===owner)claims.delete(id);}
    });
  }
  const api=host.NexusVehicleClaims;if(!api||window.frameElement?.hasAttribute('data-nx-alliance-worker'))return;
  const owner='personal:'+crypto.randomUUID();
  const vehicleId=box=>String(box.getAttribute('vehicle_id')||box.dataset.vehicleId||box.value||'');
  const protect=event=>{
    const box=event.target;if(!box?.matches?.('input.vehicle_checkbox'))return;
    const id=vehicleId(box);
    if(!box.checked){api.release(id,owner);return;}
    if(!api.claim(id,owner)){event.preventDefault();event.stopImmediatePropagation();if(event.type==='change')box.checked=false;}
  };
  document.addEventListener('click',protect,true);document.addEventListener('change',protect,true);
  window.addEventListener('pagehide',()=>api.releaseOwner(owner));
})();
