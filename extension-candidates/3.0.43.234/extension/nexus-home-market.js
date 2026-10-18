/* Native Home Response market rows, loaded on demand without retaining a game frame. */
(() => {
  'use strict';
  const match = location.pathname.match(/^\/buildings\/(\d+)(\/vehicles?(?:\/[^/]+)*)?\/?$/);
  if (!match || globalThis.__NEXUS_HOME_MARKET__ || globalThis.NexusSettings?.enabled('homeVehicleMarket') === false) return;
  const id = match[1], buildingPath = `/buildings/${id}`, pendingKey = 'nexusHomeVehiclePurchaseV1', nextKey = 'nexusHomeVehicleBuyNextV1';
  const clean = (value,n=500) => String(value ?? '').replace(/\s+/g,' ').trim().slice(0,n);
  function buildingDestination(raw) {
    if(typeof raw!=='string'||!raw)return null;
    try{const u=new URL(raw,location.origin),target=u.pathname.match(/^\/buildings\/(\d+)\/?$/);return u.origin===location.origin&&!u.username&&!u.password&&target&&target[1]!==id?u.pathname+u.search:null;}catch{return null;}
  }
  function nextBuilding() {
    for(const a of document.querySelectorAll('a[href]')){
      if(a.closest('#nx-home-market,.disabled,[hidden],.hidden')||a.getAttribute('aria-disabled')==='true')continue;
      if(/^next building$/i.test(clean(a.textContent))||/^next building$/i.test(clean(a.title))){const next=buildingDestination(a.getAttribute('href'));if(next)return next;}
    }
    return null;
  }
  function visible() {
    if (document.hidden) return false;
    try { for(let w=window;;w=w.parent) {
      if (/^mcn-v3-(active-worker|pipeline-preload|retired-worker)-/.test(w.name || '') || w.frameElement?.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload],#mcn-v3-background-mission-worker')) return false;
      if(w===w.top) return true;
      const f=w.frameElement;if(!f||f.hidden||f.getAttribute('aria-hidden')==='true'||!f.getClientRects().length||w.parent.getComputedStyle(f).visibility==='hidden')return false;
    }} catch { return false; }
  }
  if (!visible()) return;
  // Navigation consumes one purchase intent and requires the native success
  // notice. Merely opening a building or changing the toggle cannot advance it.
  try {
    const pending=JSON.parse(sessionStorage.getItem(pendingKey)), ref=new URL(document.referrer || location.href);
    if(pending){sessionStorage.removeItem(pendingKey);
      const alerts=[...document.querySelectorAll('.alert')];
      if(pending.id===id && Number.isFinite(pending.at) && Date.now()-pending.at>=0 && Date.now()-pending.at<120000 && ref.origin===location.origin && ref.pathname===buildingPath && !alerts.some(n=>n.matches('.alert-danger,.alert-error')) && alerts.some(n=>n.matches('.alert-success')&&/purchas|bought|vehicle|created/i.test(n.textContent))){const next=buildingDestination(pending.next);if(next||match[2]){location.replace(next||buildingPath);return;}}
    }
  }catch{}
  if(match[2])return;
  const state=globalThis.__NEXUS_HOME_MARKET__={reads:0,rows:0,active:false};
  let root,body,status,refresh,buyNext,style,controller=null,epoch=0,busy=false,knownHome=null,entries=[];
  const el=(tag,text)=>{const n=document.createElement(tag);n.dataset.nexusComfort='1';if(text!==undefined)n.textContent=text;return n;};
  const localUrl=raw=>{try{const u=new URL(raw,location.origin);return u.origin===location.origin&&!u.username&&!u.password?u:null;}catch{return null;}};
  const purchaseUrl=raw=>{const u=localUrl(raw);if(!u||!u.pathname.startsWith(buildingPath+'/')||!/\/vehicles?(?:\/|$)/.test(u.pathname)||u.pathname.endsWith('/new'))return null;const nested=u.pathname.match(/\/vehicle\/(\d+)\//)?.[1];return nested&&nested!==id||u.searchParams.has('building')&&u.searchParams.get('building')!==id?null:u;};
  function hasSpace(){const label=[...document.querySelectorAll('dl.dl-horizontal dt')].find(n=>/^vehicles:?$/i.test(clean(n.textContent))),counts=clean(label?.nextElementSibling?.textContent).match(/^([\d,]+)\s+of\s+([\d,]+)/i);return !counts||Number(counts[1].replaceAll(',',''))<Number(counts[2].replaceAll(',',''));}
  function mount(){
    if(root?.isConnected)return;
    root=el('section');root.id='nx-home-market';root.className='nx-building-panel';const header=el('div');header.className='nx-home-market-head';header.append(el('h3','Nexus · Home Response vehicles'));root.append(header);
    const toolbar=el('div');toolbar.className='nx-home-market-toolbar';
    const nextLabel=el('label');nextLabel.className='nx-home-buy-next';buyNext=el('input');buyNext.type='checkbox';buyNext.setAttribute('role','switch');
    try{buyNext.checked=localStorage.getItem(nextKey)==='true';}catch{}
    buyNext.disabled=!nextBuilding();nextLabel.title=buyNext.disabled?'No next building link is available.':'After a successful purchase, open the game’s next building.';
    buyNext.addEventListener('change',()=>{try{localStorage.setItem(nextKey,String(buyNext.checked));}catch{}});
    nextLabel.append(buyNext,document.createTextNode('Buy and next building'));toolbar.append(nextLabel);
    refresh=el('button','Refresh vehicles');refresh.type='button';refresh.addEventListener('click',()=>{if(!busy)void load();});
    status=el('p');status.setAttribute('role','status');root.append(status);
    body=el('div');body.className='nx-home-market-strip';body.setAttribute('role','list');body.setAttribute('aria-label','Vehicles to buy');root.append(body);
    const market=el('a','Full vehicle market');market.href=buildingPath+'/vehicles/new';toolbar.append(refresh,market);header.append(toolbar);
    const overview=document.getElementById('nx-building-overview');
    if(overview)overview.append(root);else(document.querySelector('dl.dl-horizontal')||document.querySelector('h1')||document.body).after(root);
    style=el('style');style.textContent=`
      #nx-home-market{grid-column:1/-1;min-width:0;width:100%;box-sizing:border-box;padding:10px 12px;background:#102338;color:#e8f0fb;border:1px solid #7891aa;border-left:4px solid #579cc5;border-radius:5px;font:12px system-ui,sans-serif}
      #nx-home-market .nx-home-market-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}#nx-home-market h3{font:600 13px system-ui,sans-serif;color:#b9e1fc;margin:0}#nx-home-market p{font-size:11px;color:#cad7e5;margin:8px 0}
      #nx-home-market .nx-home-market-toolbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap}#nx-home-market p:empty{display:none}
      #nx-home-market .nx-home-buy-next{display:inline-flex;align-items:center;gap:7px;margin:0;cursor:pointer;font-size:12px}#nx-home-market .nx-home-buy-next input{appearance:none;position:relative;box-sizing:border-box;width:34px;height:20px;flex:none;margin:0;border:1px solid #7193ac;border-radius:12px;background:#344b61;cursor:pointer}#nx-home-market .nx-home-buy-next input::after{content:'';position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#edf6ff}#nx-home-market .nx-home-buy-next input:checked{background:#287fab}#nx-home-market .nx-home-buy-next input:checked::after{left:16px}#nx-home-market .nx-home-buy-next input:focus-visible{outline:2px solid #b9e1fc;outline-offset:3px}
      #nx-home-market button,#nx-home-market .nx-buy{background:#1d415d;color:#eef5ff;border:1px solid #7193ac;border-radius:4px;font:inherit;padding:6px 8px;margin:2px;display:inline-block;white-space:normal;cursor:pointer;text-decoration:none}#nx-home-market :disabled{opacity:.55;cursor:default}#nx-home-market a{color:#a1dbff}
      #nx-home-market .nx-home-market-strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,130px),1fr));gap:8px;margin:8px 0 10px}#nx-home-market .nx-home-offer{min-width:0;display:flex;flex-direction:column;gap:4px}#nx-home-market .nx-home-offer form{margin:0;display:flex;flex:1;flex-direction:column}#nx-home-market .nx-home-offer :is(button,.nx-buy){box-sizing:border-box;display:flex;flex:1;flex-direction:column;justify-content:center;align-items:center;gap:4px;width:100%;min-height:52px;margin:0;padding:8px;text-align:center;overflow-wrap:anywhere}#nx-home-market .nx-unit-name{font-size:1em;font-weight:600;line-height:1.2}#nx-home-market .nx-unit-price{font-size:.82em;font-weight:400;line-height:1.2;color:#cad7e5}#nx-home-market [hidden]{display:none!important}
      html[data-nexus-touch=true] #nx-home-market :is(button,.nx-buy){min-height:44px}html[data-nexus-desktop-phone] #nx-home-market{font-size:calc(12px * var(--nx-ui-scale,1))}html[data-nexus-desktop-phone] #nx-home-market .nx-home-market-strip{grid-template-columns:repeat(auto-fill,minmax(min(100%,calc(130px * var(--nx-ui-scale,1))),1fr));gap:calc(8px * var(--nx-ui-scale,1))}html[data-nexus-desktop-phone] #nx-home-market :is(button,.nx-buy){font-size:inherit;min-height:calc(44px * var(--nx-ui-scale,1))}
      html[data-nexus-touch=true] #nx-home-market .nx-home-buy-next{min-height:44px}html[data-nexus-desktop-phone] #nx-home-market .nx-home-buy-next{font-size:inherit;min-height:calc(44px * var(--nx-ui-scale,1))}html[data-nexus-desktop-phone] #nx-home-market .nx-home-buy-next input{transform:scale(var(--nx-ui-scale,1));margin-inline:calc(17px * (var(--nx-ui-scale,1) - 1))}
      @media(max-width:500px){#nx-home-market .nx-home-market-toolbar>*{max-width:100%}}
    `;document.head.append(style);
    root.addEventListener('submit',event=>{if(!event.target.matches('form.nx-native-buy'))return;if(busy||!visible()||!hasSpace()){event.preventDefault();return;}const question=event.submitter?.dataset.confirm||event.target.dataset.confirm;if(question&&!confirm(question)){event.preventDefault();return;}busy=true;queueMicrotask(()=>{if(event.defaultPrevented){busy=false;return;}remember();});},true);
    root.addEventListener('click',event=>{const a=event.target.closest('a.nx-buy');if(!a)return;if(busy||!visible()||!hasSpace()){event.preventDefault();return;}if(a.dataset.confirm&&!confirm(a.dataset.confirm)){event.preventDefault();return;}busy=true;remember();});
  }
  function remember(){const next=buyNext.checked?nextBuilding():null;try{sessionStorage.setItem(pendingKey,JSON.stringify({id,at:Date.now(),next}));}catch{}buyNext.disabled=true;refresh.disabled=true;status.textContent=next?'Purchase submitted — opening the next building after confirmation…':'Purchase submitted to the game…';}
  async function read(url,json=false){
    state.reads++;const response=await fetch(url,{credentials:'same-origin',redirect:'error',cache:'no-store',signal:controller.signal,headers:{Accept:json?'application/json':'text/html'}});
    if(!response.ok)throw Error(`Game response ${response.status}`);
    const reader=response.body.getReader(),decoder=new TextDecoder();let raw='',size=0;
    try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>4*1024*1024){await reader.cancel();throw Error('Market response is too large');}raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}
    return json?JSON.parse(raw):new DOMParser().parseFromString(raw,'text/html');
  }
  function category(row,doc){
    const sub=row.closest('.vehicle-market-subcategory'),heading=sub?.querySelector('h2,h3,h4');if(heading&&!heading.closest('.vehicle_type'))return clean(heading.textContent,80);
    const pane=row.closest('.tab-pane,[data-category]');if(pane?.dataset.category)return clean(pane.dataset.category,80);
    if(pane?.id){const a=[...doc.querySelectorAll('a[href],button[data-target]')].find(a=>a.getAttribute('href')==='#'+pane.id||a.getAttribute('data-target')==='#'+pane.id);if(a)return clean(a.textContent,80);}
    const table=row.closest('table'),heads=[...(table?.tHead?.rows[0]?.cells||[])],index=heads.findIndex(n=>/category|service/i.test(n.textContent));if(index>=0&&row.cells?.[index])return clean(row.cells[index].textContent,80);
    let prev=table?.previousElementSibling;for(let i=0;prev&&i<5;i++,prev=prev.previousElementSibling)if(prev.matches('h2,h3,h4'))return clean(prev.textContent,80);
    return 'Home response';
  }
  function disabled(node){return !hasSpace()||node.disabled||node.getAttribute('aria-disabled')==='true'||!!node.closest('.disabled,[disabled],[hidden],.hidden')||/display\s*:\s*none/i.test(node.getAttribute('style')||'');}
  function sanitise(node){
    node.querySelectorAll('script,style,link,iframe,object,embed,meta,base,input[type=file],input[type=password]').forEach(n=>n.remove());
    for(const n of [node,...node.querySelectorAll('*')])for(const a of [...n.attributes])if(/^on/i.test(a.name)||['id','form','formaction','formmethod','formtarget','target','data-remote','data-method','data-disable-with'].includes(a.name))n.removeAttribute(a.name);
  }
  function controls(row,doc){
    const result=[],seenForms=new Set(),csrf=doc.querySelector('meta[name=csrf-token]')?.content||document.querySelector('meta[name=csrf-token]')?.content;
    for(const node of row.querySelectorAll('a[href],input[type=submit],button[type=submit],form button:not([type])')){
      const form=node.closest('form');
      if(form){
        if(seenForms.has(form)||!row.contains(form)||!purchaseUrl(form.getAttribute('action'))||form.getAttribute('method')?.toLowerCase()!=='post'||form.querySelector('[onclick],[formaction],[formmethod],[formtarget],input[type=file],input[type=password]'))continue;
        seenForms.add(form);const copy=form.cloneNode(true);sanitise(copy);copy.action=purchaseUrl(form.getAttribute('action')).href;copy.method='post';copy.target='_self';copy.classList.add('nx-native-buy');
        if(!copy.querySelector('input[name=authenticity_token]')){if(!csrf)continue;const token=el('input');token.type='hidden';token.name='authenticity_token';token.value=csrf;copy.append(token);}
        for(const b of copy.querySelectorAll('button,input[type=submit]')){b.classList.add('nx-buy');b.disabled=b.disabled||disabled(form);}
        result.push(copy);continue;
      }
      const url=purchaseUrl(node.getAttribute('href')),text=clean(node.textContent,120),method=(node.getAttribute('data-method')||'get').toLowerCase();
      // Native markets use .vehicle_type cards and numeric, icon-labelled links.
      // Currency comes from the supplied action; never invent a purchase URL.
      const currency=url?.pathname.match(/\/(credits|coins)\/?$/)?.[1]||(/\bcoins?\b/i.test(text)?'coins':/\bcredits?\b/i.test(text)?'credits':'');
      if(!url||node.hasAttribute('onclick')||!['get','post'].includes(method)||!(node.matches('.buy-vehicle-btn')&&currency||/(?:credits?|coins?|buy|purchase)/i.test(text)))continue;
      const price=text||clean(node.getAttribute('title'),120);if(!price||!/[\d]/.test(price))continue;
      const label='Buy · '+price.replace(/^buy\s*[·:—-]?\s*/i,'')+(currency&&!/credits?|coins?/i.test(price)?' '+currency:'');
      const confirmation=clean(node.dataset.confirm,1000);
      if(method==='post'){
        if(!csrf||node.hasAttribute('data-params'))continue;
        const f=el('form');f.className='nx-native-buy';f.dataset.currency=currency;f.action=url.href;f.method='post';f.target='_self';if(confirmation)f.dataset.confirm=confirmation;
        const token=el('input');token.type='hidden';token.name='authenticity_token';token.value=csrf;
        const b=el('button',label);b.type='submit';b.className='nx-buy';b.disabled=disabled(node);f.append(token,b);result.push(f);
      }else if(disabled(node)){const b=el('button',label);b.dataset.currency=currency;b.type='button';b.disabled=true;result.push(b);}
      else{const a=el('a',label);a.dataset.currency=currency;a.className='nx-buy';a.href=url.href;a.target='_self';if(confirmation)a.dataset.confirm=confirmation;result.push(a);}
    }
    return result;
  }
  function render(doc){
    entries=[];body.replaceChildren();
    const seen=new Set();let inspected=0;
    const cards=[...doc.querySelectorAll('.vehicle_type')];
    const sources=cards.length?cards:[...doc.querySelectorAll('table tbody tr')];
    for(const source of sources){
      if(++inspected>400)break;let buttons=controls(source,doc);
      const rawName=source.querySelector('[data-vehicle-name]')?.getAttribute('data-vehicle-name')||source.querySelector('h3,h4,td strong,td b')?.textContent||[...(source.cells||[])].find(c=>clean(c.textContent)&&!c.querySelector('form,button')&&!/credits?|coins?/i.test(c.textContent))?.textContent;
      const name=clean(rawName,180),group=category(source,doc);if(!name)continue;
      if(cards.length&&buttons.length){const credit=buttons.find(b=>b.dataset.currency==='credits'),hasCredit=source.querySelector('a.buy-vehicle-btn[href*="/credits"]');buttons=credit?[credit]:hasCredit?[]:[buttons[0]];}
      if(!buttons.length){const details=clean(cards.length?source.textContent:[...(source.cells||[])].slice(1).map(c=>c.textContent).join(' '),220);if(!cards.length&&!/(credits?|coins?|unavailable|not enough|requires?|no (?:free )?space)/i.test(details))continue;const button=el('button','Unavailable');button.title=details;button.type='button';button.disabled=true;buttons.push(button);}
      const key=name+'|'+buttons.map(b=>b.action||b.href||b.textContent).join('|');if(seen.has(key))continue;seen.add(key);
      const offer=el('div');offer.className='nx-home-offer';offer.setAttribute('role','listitem');offer.title=group;
      for(const control of buttons){
        const targets=control.matches('form')?[...control.querySelectorAll('button,input[type=submit]')]:[control];
        for(let target of targets){
          const price=clean(target.tagName==='INPUT'?target.value:target.textContent,160).replace(/^buy\s*[·:—-]?\s*/i,'');
          if(target.tagName==='INPUT'){
            const button=el('button');for(const attr of [...target.attributes])button.setAttribute(attr.name,attr.value);button.type='submit';button.value=target.value;target.replaceWith(button);target=button;
          }
          const label=el('span',name);label.className='nx-unit-name';const cost=el('small',price);cost.className='nx-unit-price';target.replaceChildren(label,cost);target.setAttribute('aria-label',`${name} ${price}`);target.title=[group,target.title].filter(Boolean).join(' · ');
        }
        offer.append(control);
      }
      body.append(offer);entries.push({row:offer,name,group});
    }
    state.rows=entries.length;
    if(!entries.length){status.textContent='Vehicle options could not be read. Refresh or use the full vehicle market.';return;}
    status.textContent=hasSpace()?'':'No free vehicle space at this location.';
  }
  async function load(){
    if(controller||busy||!visible())return;const ticket=++epoch;controller=new AbortController();const current=controller,timer=setTimeout(()=>current.abort(),15000);
    try{
      if(knownHome===null){const info=await read(`/api/buildings/${id}`,true);if(ticket!==epoch||!visible())return;if(String(info?.id)!==id||!['22',22].includes(info.building_type)){knownHome=false;return;}knownHome=true;}
      if(!knownHome)return;mount();refresh.disabled=true;entries=[];state.rows=0;body.replaceChildren();status.textContent='Loading available vehicles…';
      const link=[...document.querySelectorAll('a[href]')].find(a=>!a.closest('#nx-home-market')&&localUrl(a.getAttribute('href'))?.pathname===buildingPath+'/vehicles/new');
      const doc=await read(link?localUrl(link.getAttribute('href')).href:buildingPath+'/vehicles/new');if(ticket===epoch&&visible())render(doc);
    }catch(error){if(ticket===epoch&&visible()&&root)status.textContent=`Vehicle table unavailable (${clean(error.message,100)}). You can still use the full market.`;}
    finally{clearTimeout(timer);if(controller===current)controller=null;if(ticket===epoch&&refresh&&!busy)refresh.disabled=false;}
  }
  function stop(){epoch++;controller?.abort();controller=null;entries=[];busy=false;state.rows=0;state.active=false;root?.remove();style?.remove();root=body=status=refresh=buyNext=style=null;}
  function start(){if(!visible()||state.active)return;state.active=true;void load();}
  window.addEventListener('pagehide',stop);window.addEventListener('pageshow',start);window.addEventListener('focus',start);document.addEventListener('visibilitychange',()=>document.hidden?stop():start());start();
})();
