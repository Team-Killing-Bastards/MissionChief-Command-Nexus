/* Native Home Response market rows, loaded on demand without retaining a game frame. */
(() => {
  'use strict';
  const match = location.pathname.match(/^\/buildings\/(\d+)(\/vehicles?(?:\/[^/]+)*)?\/?$/);
  if (!match || globalThis.__NEXUS_HOME_MARKET__ || globalThis.NexusSettings?.enabled('homeVehicleMarket') === false) return;
  const id = match[1], buildingPath = `/buildings/${id}`, pendingKey = 'nexusHomeVehiclePurchaseV1';
  const clean = (value,n=500) => String(value ?? '').replace(/\s+/g,' ').trim().slice(0,n);
  function visible() {
    if (document.hidden) return false;
    try { for(let w=window;;w=w.parent) {
      if (/^mcn-v3-(active-worker|pipeline-preload|retired-worker)-/.test(w.name || '') || w.frameElement?.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload],#mcn-v3-background-mission-worker')) return false;
      if(w===w.top) return true;
      const f=w.frameElement;if(!f||f.hidden||f.getAttribute('aria-hidden')==='true'||!f.getClientRects().length||w.parent.getComputedStyle(f).visibility==='hidden')return false;
    }} catch { return false; }
  }
  if (!visible()) return;
  // Native purchases may return to the market. Return only after its explicit
  // success notice; errors and unconfirmed results stay on the game's page.
  try {
    const pending=JSON.parse(sessionStorage.getItem(pendingKey)), ref=new URL(document.referrer || location.href);
    if(pending){sessionStorage.removeItem(pendingKey);
      const alerts=[...document.querySelectorAll('.alert')];
      if(match[2] && pending.id===id && Number.isFinite(pending.at) && Date.now()-pending.at>=0 && Date.now()-pending.at<120000 && ref.origin===location.origin && ref.pathname===buildingPath && !alerts.some(n=>n.matches('.alert-danger,.alert-error')) && alerts.some(n=>n.matches('.alert-success')&&/purchas|bought|vehicle|created/i.test(n.textContent))){location.replace(buildingPath);return;}
    }
  }catch{}
  if(match[2])return;
  const state=globalThis.__NEXUS_HOME_MARKET__={reads:0,rows:0,active:false};
  let root,body,status,filter,search,refresh,style,controller=null,epoch=0,busy=false,knownHome=null,entries=[];
  const el=(tag,text)=>{const n=document.createElement(tag);n.dataset.nexusComfort='1';if(text!==undefined)n.textContent=text;return n;};
  const localUrl=raw=>{try{const u=new URL(raw,location.origin);return u.origin===location.origin&&!u.username&&!u.password?u:null;}catch{return null;}};
  const purchaseUrl=raw=>{const u=localUrl(raw);return u&&u.pathname.startsWith(buildingPath+'/')&&/\/vehicles?(?:\/|$)/.test(u.pathname)&&!u.pathname.endsWith('/new')?u:null;};
  function hasSpace(){const label=[...document.querySelectorAll('dl.dl-horizontal dt')].find(n=>/^vehicles:?$/i.test(clean(n.textContent))),counts=clean(label?.nextElementSibling?.textContent).match(/^([\d,]+)\s+of\s+([\d,]+)/i);return !counts||Number(counts[1].replaceAll(',',''))<Number(counts[2].replaceAll(',',''));}
  function mount(){
    if(root?.isConnected)return;
    root=el('section');root.id='nx-home-market';root.className='nx-building-panel';root.append(el('h3','Nexus · Home Response vehicles'));
    const toolbar=el('div');toolbar.className='nx-home-market-toolbar';
    const label=el('label','Category ');filter=el('select');filter.setAttribute('aria-label','Vehicle category');label.append(filter);
    search=el('input');search.type='search';search.placeholder='Find a vehicle…';search.setAttribute('aria-label','Find a Home Response vehicle');
    refresh=el('button','Refresh vehicles');refresh.type='button';refresh.addEventListener('click',()=>{if(!busy)void load();});
    toolbar.append(label,search,refresh);root.append(toolbar);status=el('p');status.setAttribute('role','status');root.append(status);
    body=el('div');body.className='nx-home-market-scroll';root.append(body);
    const market=el('a','Full vehicle market');market.href=buildingPath+'/vehicles/new';root.append(market);
    const ext=document.getElementById('nx-expansions'),overview=document.getElementById('nx-building-overview');
    if(ext)ext.after(root);else if(overview){let column=overview.querySelector('.nx-building-right');if(!column){column=el('div');column.className='nx-building-right';overview.append(column);}column.append(root);}else(document.querySelector('dl.dl-horizontal')||document.querySelector('h1')||document.body).after(root);
    style=el('style');style.textContent=`
      #nx-home-market{min-width:0;box-sizing:border-box;padding:10px 12px;background:#102338;color:#e8f0fb;border:1px solid #7891aa;border-left:4px solid #579cc5;border-radius:5px;font:12px system-ui,sans-serif}
      #nx-home-market h3{font:600 13px system-ui,sans-serif;color:#b9e1fc;margin:0 0 9px}#nx-home-market p{font-size:11px;color:#cad7e5;margin:8px 0}
      #nx-home-market .nx-home-market-toolbar{display:flex;gap:7px;align-items:end;flex-wrap:wrap}#nx-home-market label{display:flex;flex-direction:column;gap:3px}#nx-home-market select,#nx-home-market input{max-width:100%;min-width:0;box-sizing:border-box;background:white;color:#17354b;border:1px solid #7891aa;border-radius:4px;padding:6px;font:inherit}
      #nx-home-market button,#nx-home-market .nx-buy{background:#1d415d;color:#eef5ff;border:1px solid #7193ac;border-radius:4px;font:inherit;padding:6px 8px;margin:2px;display:inline-block;white-space:normal;cursor:pointer;text-decoration:none}#nx-home-market :disabled{opacity:.55;cursor:default}#nx-home-market a{color:#a1dbff}
      #nx-home-market .nx-home-market-scroll{overflow-x:auto;max-height:420px;overflow-y:auto;overscroll-behavior:contain;margin:8px 0}#nx-home-market table{border-collapse:collapse;width:100%;font:11px system-ui,sans-serif}#nx-home-market th,#nx-home-market td{padding:7px 5px;border-bottom:1px solid #6685a14d;text-align:left;vertical-align:middle;overflow-wrap:anywhere}#nx-home-market th{color:#b9e1fc;background:#17354b;position:sticky;top:0}#nx-home-market form{margin:0;display:inline-block}#nx-home-market [hidden]{display:none!important}
      html[data-nexus-touch=true] #nx-home-market :is(button,select,input,.nx-buy){min-height:44px}html[data-nexus-desktop-phone] #nx-home-market{font-size:calc(12px * var(--nx-ui-scale,1))}html[data-nexus-desktop-phone] #nx-home-market :is(button,select,input,.nx-buy){font-size:inherit;min-height:calc(44px * var(--nx-ui-scale,1))}
      @media(max-width:500px){#nx-home-market table{font-size:11px}#nx-home-market th,#nx-home-market td{padding:7px 3px}#nx-home-market .nx-home-market-toolbar>*{max-width:100%}}
    `;document.head.append(style);filter.addEventListener('change',apply);search.addEventListener('input',apply);
    root.addEventListener('submit',event=>{if(!event.target.matches('form.nx-native-buy'))return;if(busy||!visible()||!hasSpace()){event.preventDefault();return;}const question=event.submitter?.dataset.confirm||event.target.dataset.confirm;if(question&&!confirm(question)){event.preventDefault();return;}busy=true;queueMicrotask(()=>{if(event.defaultPrevented){busy=false;return;}remember();});},true);
    root.addEventListener('click',event=>{const a=event.target.closest('a.nx-buy');if(!a)return;if(busy||!visible()||!hasSpace()){event.preventDefault();return;}if(a.dataset.confirm&&!confirm(a.dataset.confirm)){event.preventDefault();return;}busy=true;remember();});
  }
  function remember(){try{sessionStorage.setItem(pendingKey,JSON.stringify({id,at:Date.now()}));}catch{}refresh.disabled=true;status.textContent='Purchase submitted to the game…';}
  async function read(url,json=false){
    state.reads++;const response=await fetch(url,{credentials:'same-origin',redirect:'error',cache:'no-store',signal:controller.signal,headers:{Accept:json?'application/json':'text/html'}});
    if(!response.ok)throw Error(`Game response ${response.status}`);
    const reader=response.body.getReader(),decoder=new TextDecoder();let raw='',size=0;
    try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>4*1024*1024){await reader.cancel();throw Error('Market response is too large');}raw+=decoder.decode(part.value,{stream:true});}raw+=decoder.decode();}finally{reader.releaseLock();}
    return json?JSON.parse(raw):new DOMParser().parseFromString(raw,'text/html');
  }
  function category(row,doc){
    const pane=row.closest('.tab-pane,[data-category]');if(pane?.dataset.category)return clean(pane.dataset.category,80);
    if(pane?.id){const a=[...doc.querySelectorAll('a[href],button[data-target]')].find(a=>a.getAttribute('href')==='#'+pane.id||a.getAttribute('data-target')==='#'+pane.id);if(a)return clean(a.textContent,80);}
    const table=row.closest('table'),heads=[...(table?.tHead?.rows[0]?.cells||[])],index=heads.findIndex(n=>/category|service/i.test(n.textContent));if(index>=0&&row.cells[index])return clean(row.cells[index].textContent,80);
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
      const url=purchaseUrl(node.getAttribute('href')),label=clean(node.textContent,120),method=(node.getAttribute('data-method')||'get').toLowerCase();
      if(!url||!label||node.hasAttribute('onclick')||!['get','post'].includes(method)||!/(?:credits?|coins?|buy|purchase)/i.test(label))continue;
      const confirmation=clean(node.dataset.confirm,1000);
      if(method==='post'){
        if(!csrf||node.hasAttribute('data-params'))continue;
        const f=el('form');f.className='nx-native-buy';f.action=url.href;f.method='post';f.target='_self';if(confirmation)f.dataset.confirm=confirmation;
        const token=el('input');token.type='hidden';token.name='authenticity_token';token.value=csrf;
        const b=el('button',label);b.type='submit';b.className='nx-buy';b.disabled=disabled(node);f.append(token,b);result.push(f);
      }else if(disabled(node)){const b=el('button',label);b.type='button';b.disabled=true;result.push(b);}
      else{const a=el('a',label);a.className='nx-buy';a.href=url.href;a.target='_self';if(confirmation)a.dataset.confirm=confirmation;result.push(a);}
    }
    return result;
  }
  function render(doc){
    entries=[];body.replaceChildren();const table=el('table'),head=table.createTHead().insertRow();for(const title of ['Category','Vehicle','Price / purchase'])head.append(el('th',title));const tbody=table.createTBody();
    const alerts=[...doc.querySelectorAll('.alert-danger,.alert-warning,.alert-info')].map(n=>clean(n.textContent,350)).filter(Boolean);for(const text of alerts.slice(0,5))body.append(el('p',text));
    const seen=new Set();let inspected=0;
    for(const source of doc.querySelectorAll('table tbody tr')){
      if(++inspected>400)break;const buttons=controls(source,doc);
      const rawName=source.querySelector('[data-vehicle-name]')?.getAttribute('data-vehicle-name')||source.querySelector('td strong,td b,td h3,td h4')?.textContent||[...source.cells].find(c=>clean(c.textContent)&&!c.querySelector('form,button')&&!/credits?|coins?/i.test(c.textContent))?.textContent;
      const name=clean(rawName,180),group=category(source,doc);if(!name)continue;
      if(!buttons.length){const details=clean([...source.cells].slice(1).map(c=>c.textContent).join(' '),220);if(!/(credits?|coins?|unavailable|not enough|requires?|no (?:free )?space)/i.test(details))continue;const button=el('button',details);button.type='button';button.disabled=true;buttons.push(button);}
      const key=name+'|'+buttons.map(b=>b.action||b.href||b.textContent).join('|');if(seen.has(key))continue;seen.add(key);
      const row=tbody.insertRow();row.insertCell().textContent=group;row.insertCell().textContent=name;const cell=row.insertCell();cell.append(...buttons);entries.push({row,name,group});
    }
    state.rows=entries.length;body.append(table);const previous=filter.value;filter.replaceChildren();for(const value of ['',...[...new Set(entries.map(r=>r.group))].sort()]){const option=el('option',value||'All categories');option.value=value;filter.append(option);}if([...filter.options].some(o=>o.value===previous))filter.value=previous;
    if(!entries.length){table.remove();status.textContent='No inline purchase options are available in the game’s response. Use the full vehicle market for its availability details.';return;}apply();
  }
  function apply(){const q=clean(search.value).toLowerCase();let shown=0;for(const e of entries){e.row.hidden=!!filter.value&&filter.value!==e.group||!`${e.name} ${e.group}`.toLowerCase().includes(q);if(!e.row.hidden)shown++;}status.textContent=`${!hasSpace()?'No free vehicle space at this location. ':''}${shown} of ${entries.length} vehicles shown. Prices and availability are from the game.`;}
  async function load(){
    if(controller||busy||!visible())return;const ticket=++epoch;controller=new AbortController();const current=controller,timer=setTimeout(()=>current.abort(),15000);
    try{
      if(knownHome===null){const info=await read(`/api/buildings/${id}`,true);if(ticket!==epoch||!visible())return;if(String(info?.id)!==id||!['22',22].includes(info.building_type)){knownHome=false;return;}knownHome=true;}
      if(!knownHome)return;mount();refresh.disabled=filter.disabled=search.disabled=true;entries=[];state.rows=0;body.replaceChildren();status.textContent='Loading available vehicles…';
      const link=[...document.querySelectorAll('a[href]')].find(a=>!a.closest('#nx-home-market')&&localUrl(a.getAttribute('href'))?.pathname===buildingPath+'/vehicles/new');
      const doc=await read(link?localUrl(link.getAttribute('href')).href:buildingPath+'/vehicles/new');if(ticket===epoch&&visible())render(doc);
    }catch(error){if(ticket===epoch&&visible()&&root)status.textContent=`Vehicle table unavailable (${clean(error.message,100)}). You can still use the full market.`;}
    finally{clearTimeout(timer);if(controller===current)controller=null;if(ticket===epoch&&refresh&&!busy)refresh.disabled=filter.disabled=search.disabled=false;}
  }
  function stop(){epoch++;controller?.abort();controller=null;entries=[];busy=false;state.rows=0;state.active=false;root?.remove();style?.remove();root=body=status=filter=search=refresh=style=null;}
  function start(){if(!visible()||state.active)return;state.active=true;void load();}
  window.addEventListener('pagehide',stop);window.addEventListener('pageshow',start);window.addEventListener('focus',start);document.addEventListener('visibilitychange',()=>document.hidden?stop():start());start();
})();
