/* Nexus mission reward labels. Scoped DOM updates; never call dispatch or logger snapshots. */
(() => {
  'use strict';
  if (globalThis.NexusSettings?.enabled('missionRewards') === false) return;
  if(window!==window.top||location.pathname!=='/'||/^mcn-v3-(active-worker|pipeline-preload)-/.test(window.name||''))return;
  if(window.__NEXUS_MISSION_REWARDS__||!globalThis.NexusMissionRewardsData?.enabled)return;
  const data=NexusMissionRewardsData.credits,selector='.missionSideBarEntry',own='[data-nx-mission-reward]';
  const nf=new Intl.NumberFormat('en-GB'),pending=new Set();
  let root=null,observer=null,parentObserver=null,timer=null,discovery=null,walker=null,scanAgain=false,attempts=0;
  let seen=new WeakMap(),active=false;
  const state=window.__NEXUS_MISSION_REWARDS__={active:false,decorated:0,updated:0,examined:0,pending:0,scanning:false,flushes:0,maxFlushMs:0};
  function typeKey(card){
    const type=(card.getAttribute('mission_type_id')||card.getAttribute('data-mission-type-id')||'').trim();
    const parts=type.match(/^(\d+)(?:-(\d+))?(?:\/([a-z0-9]+))?$/i);if(!parts)return null;
    let index=parts[2]||'',addition=parts[3]||'';
    const overlay=card.getAttribute('data-overlay-index'),additive=card.getAttribute('data-additive-overlays');
    if(overlay&&overlay!=='null'){if(!/^\d+$/.test(overlay))return null;index=overlay;}
    if(additive&&additive!=='null'){if(!/^[a-z0-9]{1,16}$/i.test(additive))return null;addition=additive;}
    return `${parts[1]}${index?`-${index}`:''}${addition?`/${addition}`:''}`;
  }
  function liveEstimate(card){
    const raw=card.getAttribute('data-sortable-by')||card.getAttribute('data-sortable_by');if(!raw||raw.length>2048)return null;
    try{const value=JSON.parse(raw)?.average_credits;const n=typeof value==='number'?value:typeof value==='string'&&/^\d+$/.test(value)?Number(value):null;return Number.isSafeInteger(n)&&n>=0?n:null;}catch{return null;}
  }
  function decorate(card){
    if(!card.isConnected||!root?.contains(card))return;
    const bar=card.querySelector('div[id^="mission_bar_outer_"]'),wrap=bar?.parentElement;
    if(!bar||!wrap||wrap===card)return;
    state.examined++;
    const type=typeKey(card),live=liveEstimate(card),reference=type===null?null:data[type];
    const value=live??(Number.isSafeInteger(reference)&&reference>=0?reference:null);
    const caption=`≈ ${value===null?'—':nf.format(value)}`;
    const title=value===null?'Estimated mission reward unavailable for this mission type.':`Estimated mission reward${live===null?` for mission type ${type}`:' advertised by the game'}. Actual payout can differ.`;
    let badge=card.querySelector(own);
    const previous=seen.get(card);
    if(previous?.bar===bar&&previous?.badge===badge&&badge?.parentElement===wrap&&badge.textContent===caption&&badge.title===title)return;
    if(!badge){badge=document.createElement('span');badge.dataset.nxMissionReward='1';badge.className='nx-mission-reward';state.decorated++;}
    if(badge.parentElement!==wrap||badge.nextElementSibling!==bar)bar.before(badge);
    if(badge.textContent!==caption)badge.textContent=caption;
    if(badge.title!==title)badge.title=title;
    badge.setAttribute('aria-label',value===null?'Estimated mission reward unavailable':`Estimated mission reward: ${nf.format(value)} credits`);
    wrap.classList.add('nx-mission-reward-line');bar.classList.add('nx-mission-reward-bar');
    seen.set(card,{bar,badge});state.updated++;
  }
  function enqueue(card){if(!card||!card.matches?.(selector))return;if(pending.size<500)pending.add(card);else scanAgain=true;state.pending=pending.size;schedule();}
  function beginScan(){if(root){walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT);state.scanning=true;}}
  function schedule(){if(active&&!timer)timer=setTimeout(flush,40);}
  function flush(){
    timer=null;if(!active||document.hidden)return;
    if(!root?.isConnected){connect();return;}
    const start=performance.now();state.flushes++;let n=0;
    while(pending.size&&n++<100&&performance.now()-start<5){const card=pending.values().next().value;pending.delete(card);decorate(card);}
    if(scanAgain&&!walker){scanAgain=false;beginScan();}
    n=0;
    while(walker&&n++<200&&performance.now()-start<5){const node=walker.nextNode();if(!node){walker=null;state.scanning=false;break;}if(node.matches(selector))decorate(node);}
    state.pending=pending.size;state.maxFlushMs=Math.max(state.maxFlushMs,Math.round((performance.now()-start)*100)/100);
    if(pending.size||walker||scanAgain)timer=setTimeout(flush,16);
  }
  function changed(records){
    for(const record of records){
      if(record.type==='attributes'){enqueue(record.target.matches(selector)?record.target:record.target.closest(selector));continue;}
      const target=record.target.nodeType===1?record.target:record.target.parentElement;
      if(target?.closest(own))continue;
      let structural=false;
      for(const node of record.addedNodes){
        if(node.nodeType!==1||node.matches(own))continue;
        structural=true;
        if(node.matches(selector))enqueue(node);
        else if(!target?.closest(selector)){
          // Mission-list groups can be inserted as a subtree; one bounded scan handles them.
          scanAgain=true;schedule();
        }
      }
      if(structural||Array.from(record.removedNodes).some(node=>node.nodeType===1&&(node.matches?.(own)||node.id?.startsWith('mission_bar_outer_'))))enqueue(target?.closest(selector));
    }
  }
  function disconnect(){
    observer?.disconnect();parentObserver?.disconnect();observer=null;parentObserver=null;clearTimeout(timer);clearTimeout(discovery);timer=null;discovery=null;
    pending.clear();walker=null;scanAgain=false;root=null;active=false;state.active=false;state.pending=0;state.scanning=false;
  }
  function connect(){
    if(document.hidden)return;
    const found=document.getElementById('missions-panel-body');
    if(active&&root===found&&root.isConnected)return;
    disconnect();
    if(!found){if(attempts++<60)discovery=setTimeout(connect,500);return;}
    attempts=0;root=found;active=true;state.active=true;
    observer=new MutationObserver(changed);observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['mission_type_id','data-mission-type-id','data-overlay-index','data-additive-overlays','data-sortable-by','data-sortable_by']});
    if(root.parentElement){parentObserver=new MutationObserver(()=>{if(!root?.isConnected)connect();});parentObserver.observe(root.parentElement,{childList:true});}
    beginScan();schedule();
  }
  const style=document.createElement('style');style.textContent=`
  .nx-mission-reward-line{display:flex!important;align-items:center;gap:7px}
  .nx-mission-reward{display:inline-block;flex:0 0 auto;white-space:nowrap;font-size:12px;font-weight:700;line-height:20px;color:inherit}
  .nx-mission-reward-line>.nx-mission-reward-bar{flex:1 1 auto;min-width:0;width:auto!important}
  `;document.head.append(style);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)disconnect();else connect();});window.addEventListener('pagehide',()=>{disconnect();seen=new WeakMap();});window.addEventListener('pageshow',connect);window.addEventListener('focus',connect);connect();
})();
