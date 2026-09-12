/* Nexus daily summary: one bounded parse per open; credit-page chrome settles briefly, no API polling. */
(() => {
  'use strict';
  if (globalThis.NexusSettings?.enabled('dailyCredits') === false) return;
  if (!/^\/credits\/daily\/?$/.test(location.pathname) || /^mcn-v3-(active-worker|pipeline-preload)-/.test(window.name || '')) return;
  try { if (window.frameElement?.matches('[data-mcn-v3-worker], [data-mcn-v3-pipeline-preload], #mcn-v3-background-mission-worker')) return; } catch { return; }
  if (window.__NEXUS_DAILY__ || !globalThis.NexusDailyCore || !globalThis.NexusDailyData) return;
  const C = NexusDailyCore, D = NexusDailyData, nf = new Intl.NumberFormat('en-GB', {maximumFractionDigits:2});
  const limit = 20000, perPage = 100;
  let source = null, root = null, rows = [], run = 0, loading = false, debounce = null, active = false, hiddenOriginals = [], originalOnly = false;
  let query = '', min = -Infinity, max = Infinity, sort = 'total', direction = -1, offset = 0;
  const selected = new Set(D.categories.map(c=>c.id));
  let refs = {};
  let pageChrome = null;
  const state = window.__NEXUS_DAILY__ = { active:false, retainedRows:0, renderedRows:0, sourceRows:0, invalidRows:0, parses:0, limited:false };
  const fmt = value => value === null ? '—' : nf.format(value);
  const signed = n => `${n > 0 ? '+' : ''}${fmt(n)}`;
  const tone = n => n>0 ? 'nx-daily-positive' : n<0 ? 'nx-daily-negative' : '';
  function el(tag, text, cls) { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; }
  function button(text, action, cls='nx-daily-button') { const n=el('button',text,cls); n.type='button'; n.addEventListener('click',action); return n; }
  function link(text, href) { const n=el('a',text); n.href=href; return n; }
  function hide(n) { if(!n || n===source || n.contains(root) || hiddenOriginals.some(x=>x.node===n))return; hiddenOriginals.push({node:n,hidden:n.hidden}); n.hidden=true; }
  function currentDate() {
    // The game's daily endpoint uses UTC page offsets, independently of the logger's London activity day.
    const header=document.querySelector('.page-header,h1');
    const label=header?.textContent || '';
    const iso=label.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/), british=label.match(/\b(\d{2})\/(\d{2})\/(20\d{2})\b/);
    const result=iso?.[0] || (british ? `${british[3]}-${british[2]}-${british[1]}` : C.date(new URLSearchParams(location.search).get('page')));
    return result ? result.split('-').reverse().join('/') : 'Game daily summary';
  }
  function mount() {
    root=el('section'); root.id='nx-daily'; root.setAttribute('aria-label','Daily credits summary');
    const nav=el('nav',undefined,'nx-daily-nav'), brand=el('strong','Credits'), links=el('div');
    links.append(link('Transactions','/credits'),link('Overview','/credits/overview'),link('Coins protocol','/coins/list')); nav.append(brand,links);
    const heading=el('div',undefined,'nx-daily-heading'); const title=el('h1',`Summary: ${currentDate()}`);
    const dates=el('div',undefined,'nx-daily-dates'); const page=Number(new URLSearchParams(location.search).get('page') || 0);
    for(const [label, next, disabled] of [['-1',page-1,page<=-7],['Today',0,page===0],['+1',page+1,page>=1]]) {
      const a=link(label,`/credits/daily?page=${next}`); a.className='nx-daily-button'; if(label!=='Today')a.classList.add('nx-daily-green');
      if(disabled || !C.date(String(next))) {a.removeAttribute('href'); a.setAttribute('aria-disabled','true');} dates.append(a);
    }
    refs.topTotals=el('div',undefined,'nx-daily-totals'); heading.append(title,dates,refs.topTotals);
    refs.badges=el('div',undefined,'nx-daily-badges'); refs.badges.setAttribute('aria-label','Category totals');
    const controls=el('div',undefined,'nx-daily-controls');
    for(const [name,label] of [['min','Min. Total credits'],['max','Max. Total credits']]) {
      const group=el('label',label); const input=el('input'); input.type='number'; input.step='1'; input.setAttribute('aria-label',label); input.placeholder='Any';
      input.addEventListener('input',()=>schedule()); refs[name]=input; group.append(input); controls.append(group);
    }
    const types=el('div',undefined,'nx-daily-types'); const typeHeading=el('div',undefined,'nx-daily-type-heading');
    typeHeading.append(el('strong','Entry types displayed'),button('Show all types',()=>{for(const c of D.categories)selected.add(c.id);changedTypes();}),button('Do not show types',()=>{selected.clear();changedTypes();}));
    refs.typeOptions=el('div',undefined,'nx-daily-type-options');
    for(const c of [...D.categories].sort((a,b)=>a.title.localeCompare(b.title))) {
      const label=el('label'), input=el('input'); input.type='checkbox'; input.checked=true; input.value=c.id;
      input.addEventListener('change',()=>{input.checked?selected.add(c.id):selected.delete(c.id);offset=0;render();}); label.append(input,document.createTextNode(c.title)); refs.typeOptions.append(label);
    }
    types.append(typeHeading,refs.typeOptions); refs.count=el('span',undefined,'nx-daily-count'); refs.count.setAttribute('role','status'); controls.append(types,refs.count);
    const searchRow=el('div',undefined,'nx-daily-search-row'); refs.error=el('span'); refs.error.setAttribute('role','status'); refs.search=el('input'); refs.search.type='search'; refs.search.maxLength=120; refs.search.placeholder='Search'; refs.search.setAttribute('aria-label','Search credit descriptions or amounts'); refs.search.addEventListener('input',()=>schedule());
    searchRow.append(refs.error,refs.search);
    const wrap=el('div',undefined,'nx-daily-table-wrap'), table=el('table'); table.id='nx-daily-table'; const thead=el('thead'), headRow=el('tr'); refs.sortHeaders={};
    for(const [key,label] of [['total','Total'],['average','Ø'],['count','Amount'],['desc','Description']]) {
      const th=el('th'); th.scope='col'; refs.sortHeaders[key]=th;
      const b=button(label,()=>{if(sort===key)direction*=-1;else{sort=key;direction=key==='desc'?1:-1;}offset=0;render();},'nx-daily-sort'); b.setAttribute('aria-label',`Sort by ${label==='Ø'?'average':label.toLowerCase()}`);th.append(b);headRow.append(th);
    }
    refs.body=el('tbody'); refs.foot=el('tfoot'); thead.append(headRow);table.append(thead,refs.body,refs.foot);wrap.append(table);
    refs.paging=el('div',undefined,'nx-daily-paging');
    refs.coverage=el('p',undefined,'nx-daily-coverage');
    const bottom=el('div',undefined,'nx-daily-bottom'); bottom.append(refs.coverage,button('Refresh game summary',()=>location.reload()),button('Show original game table',()=>{originalOnly=true;dispose();}));
    root.append(nav,heading,refs.badges,controls,searchRow,wrap,refs.paging,bottom); source.before(root);
    pageChrome=globalThis.NexusCreditPageChrome?.mount({root,fallback:nav,source,mode:'daily',hide});
    const header=document.querySelector('.page-header,h1'); if(header && !root.contains(header)&&!pageChrome?.ownsNavigation(header))hide(header);
    const bg=getComputedStyle(document.body).backgroundColor;
    if(bg && bg!=='rgba(0, 0, 0, 0)' && bg!=='transparent')root.style.setProperty('--nx-daily-bg',bg);
  }
  function changedTypes() { for(const input of refs.typeOptions.querySelectorAll('input'))input.checked=selected.has(input.value);offset=0;render(); }
  function schedule() {clearTimeout(debounce);debounce=setTimeout(()=>{debounce=null;offset=0;render();},120);}
  function render() {
    if(!active || !root)return;
    const minValue=refs.min.value===''?-Infinity:C.number(refs.min.value,true),maxValue=refs.max.value===''?Infinity:C.number(refs.max.value,true);
    if(minValue===null || maxValue===null || refs.min.validity.badInput || refs.max.validity.badInput || minValue>maxValue) {refs.error.textContent='Enter a valid minimum and maximum.';return;}
    refs.error.textContent='';min=minValue;max=maxValue;query=refs.search.value;
    const filtered=C.filter(rows,{query,min,max,types:selected,sort,direction});const sum=C.totals(filtered);
    offset=Math.min(offset,Math.max(0,Math.floor((filtered.length-1)/perPage)*perPage));
    const fragment=document.createDocumentFragment();
    for(const row of filtered.slice(offset,offset+perPage)) {const tr=el('tr'); tr.append(el('td',`${fmt(row.total)} Credits`,tone(row.total)),el('td',`${fmt(row.average)} Credits`,tone(row.total)),el('td',`${fmt(row.count)}x`),el('td',row.desc));fragment.append(tr);}
    if(!filtered.length) {const tr=el('tr'),td=el('td','No entries match these filters.');td.colSpan=4;tr.append(td);fragment.append(tr);}
    refs.body.replaceChildren(fragment);state.renderedRows=Math.min(filtered.length,perPage);
    const foot=el('tr');foot.append(el('td',`${fmt(sum.net)} Credits`,tone(sum.net)),el('td',sum.average===null?'—':`${fmt(sum.average)} Credits`,tone(sum.net)),el('td',`${fmt(sum.count)}x`),el('td','Filtered totals · weighted average'));
    refs.foot.replaceChildren(foot);refs.count.textContent=`${fmt(filtered.length)} filtered entries`;
    for(const [key,th] of Object.entries(refs.sortHeaders))th.setAttribute('aria-sort',key===sort?(direction===1?'ascending':'descending'):'none');
    refs.paging.replaceChildren();
    if(filtered.length>perPage) {const prev=button('Previous rows',()=>{offset-=perPage;render();}),next=button('Next rows',()=>{offset+=perPage;render();});prev.disabled=offset===0;next.disabled=offset+perPage>=filtered.length;refs.paging.append(prev,el('span',`${offset+1}–${Math.min(offset+perPage,filtered.length)} of ${fmt(filtered.length)}`),next);}
  }
  function showTotals() {
    const sum=C.totals(rows); refs.topTotals.replaceChildren();
    for(const [label,n] of [['Income',sum.income],['Spending',sum.spending],['Net',sum.net]]) {const item=el('span',signed(n),tone(n));item.title=label;item.setAttribute('aria-label',`${label}: ${fmt(n)}`);refs.topTotals.append(item);}
    refs.badges.replaceChildren();
    for(const group of C.categories(rows,D.categories)) { const b=button('',()=>{selected.clear();selected.add(group.id);changedTypes();},'nx-daily-badge');b.title=`Filter ${group.title}. Categories can overlap; daily totals count each row once.`;
      const name=el('span',group.title);name.style.backgroundColor=group.backgroundColor;name.style.color=group.textColor;
      b.append(name,el('span',`${fmt(group.total)} (${fmt(group.count)}x)`,tone(group.total)));refs.badges.append(b);}
    const partial=state.invalidRows || state.limited;
    refs.coverage.textContent=`${partial?'Partial totals · ':''}${fmt(rows.length)} game summary rows${state.invalidRows?` · ${state.invalidRows} unreadable rows excluded`:''}${state.limited?' · safety limit reached; use the original table for the complete view':''}. Game day uses UTC. Categories can overlap. Figures refresh when this page is opened.`;
    if(partial)refs.topTotals.setAttribute('aria-label','Partial totals from readable rows');
  }
  async function start() {
    // Native lightboxes may keep their iframe CSS-hidden until its document finishes loading.
    // This is a one-time, page-local parse; there is no background refresh or polling to start.
    if(active||loading||originalOnly||document.hidden)return;
    source=document.getElementById('daily_table');if(!source?.tBodies?.length)return;
    const ticket=++run;loading=true;state.parses++;state.invalidRows=0;state.limited=false;state.sourceRows=source.tBodies[0].rows.length;
    const classify=C.classifier(D); let parsed=[];let textSize=0;
    try {
      for(let i=0;i<state.sourceRows;i++) {
        if(i%200===0) {await new Promise(resolve=>setTimeout(resolve,0));if(ticket!==run)return;}
        if(i>=limit||textSize>4*1024*1024){state.limited=true;break;}
        const tr=source.tBodies[0].rows[i];const cells=Array.from(tr.cells,c=>c.textContent);textSize+=cells.reduce((n,s)=>n+s.length,0);
        if(cells.length===1 && /no (?:entries|transactions|credits)/i.test(cells[0]))continue;
        const row=C.entry(cells,classify,i);if(row)parsed.push(row);else state.invalidRows++;
      }
      if(ticket!==run)return;
      rows=parsed;state.retainedRows=rows.length;
      if(!rows.length && state.invalidRows) {loading=false;return;}
      C.totals(rows);mount();active=true;state.active=true;showTotals();render();
      hiddenOriginals.push({node:source,hidden:source.hidden});source.hidden=true;
    } catch(error) {
      dispose();const note=el('p','Nexus could not enhance this summary. The original game table is available.');note.id='nx-daily-error';source?.before(note);
    } finally {if(ticket===run)loading=false;}
  }
  function dispose() {
    pageChrome?.dispose();pageChrome=null;
    run++;loading=false;active=false;clearTimeout(debounce);debounce=null;rows=[];state.active=false;state.retainedRows=0;state.renderedRows=0;
    root?.remove();root=null;refs={};for(const item of hiddenOriginals)item.node.hidden=item.hidden;hiddenOriginals=[];
  }
  const style=el('style');style.textContent=`
  #nx-daily{--nx-daily-bg:transparent;color:inherit;font:inherit;margin:10px 0}#nx-daily *{box-sizing:border-box}#nx-daily [hidden]{display:none!important}
  #nx-daily a{color:inherit;text-decoration:none}#nx-daily button,#nx-daily input{font:inherit}#nx-daily button,#nx-daily a[href]{cursor:pointer}#nx-daily :focus-visible{outline:2px solid #61bbff;outline-offset:2px}
  #nx-daily .nx-daily-nav{display:flex;align-items:center;justify-content:space-between;background:#ce3b25;color:#fff;border:1px solid #702415;border-radius:4px;padding:18px 22px;gap:20px;margin-bottom:22px}#nx-daily .nx-daily-nav strong{font-size:22px}#nx-daily .nx-daily-nav div{display:flex;gap:28px}
  #nx-daily .nx-daily-heading{display:flex;align-items:center;gap:15px;flex-wrap:wrap;margin-bottom:15px}#nx-daily h1{font:inherit;font-size:34px;margin:0}#nx-daily .nx-daily-dates{display:flex;gap:8px}#nx-daily .nx-daily-button{display:inline-block;background:linear-gradient(#555,#222);border:1px solid #222;border-radius:4px;color:#fff;padding:6px 10px}#nx-daily .nx-daily-green{background:linear-gradient(#64ba60,#397e36)}#nx-daily [aria-disabled=true],#nx-daily button:disabled{opacity:.55;cursor:default}#nx-daily .nx-daily-totals{font-size:24px;display:flex;gap:12px}#nx-daily .nx-daily-totals span+span{border-left:1px solid #888;padding-left:12px}
  #nx-daily .nx-daily-positive{color:#4fbd59}#nx-daily .nx-daily-negative{color:#c96a60}#nx-daily .nx-daily-badges{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:20px}#nx-daily .nx-daily-badge{display:flex;padding:0;border:1px solid #aaa;border-radius:4px;background:transparent;color:inherit;overflow:hidden}#nx-daily .nx-daily-badge span{padding:5px 10px}#nx-daily .nx-daily-badge span+span{font-weight:600;background:#0002}
  #nx-daily .nx-daily-controls{display:flex;align-items:flex-end;gap:14px}#nx-daily .nx-daily-controls>label{width:110px;flex-shrink:0;font-weight:bold}#nx-daily input[type=number]{display:block;width:100%;padding:8px;margin-top:6px;border:1px solid #999;border-radius:4px;background:#fff;color:#222}#nx-daily .nx-daily-types{flex:1}#nx-daily .nx-daily-type-heading{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px}#nx-daily .nx-daily-type-heading button{font-size:12px;padding:3px 6px}#nx-daily .nx-daily-type-options{border:1px solid #8886;border-radius:4px;padding:8px;display:flex;gap:6px 14px;flex-wrap:wrap}#nx-daily .nx-daily-type-options label{font-weight:normal;white-space:nowrap;cursor:pointer}#nx-daily .nx-daily-type-options input{margin-right:5px}#nx-daily .nx-daily-count{max-width:95px;align-self:center}#nx-daily .nx-daily-search-row{display:flex;justify-content:space-between;margin:12px 0 8px;gap:15px}#nx-daily input[type=search]{background:#fff;color:#222;border:1px solid #999;padding:6px 10px;min-width:240px}#nx-daily .nx-daily-search-row [role=status]{color:#c96a60}
  #nx-daily table{width:100%;border-collapse:collapse}#nx-daily th,#nx-daily td{text-align:left;padding:12px 10px;border-bottom:1px solid #aaa;vertical-align:top}#nx-daily thead{background:#0005}#nx-daily .nx-daily-sort{color:inherit;background:none;border:0;padding:0;text-align:left;width:100%;font-weight:bold}#nx-daily th[aria-sort=ascending] button:after{content:' ▲';float:right}#nx-daily th[aria-sort=descending] button:after{content:' ▼';float:right}#nx-daily th[aria-sort=none] button:after{content:' ↕';float:right;color:#aaa}#nx-daily td:nth-child(-n+3){white-space:nowrap}#nx-daily td:last-child{overflow-wrap:anywhere}#nx-daily tbody tr:nth-child(2n){background:#0001}#nx-daily tfoot{font-weight:bold}#nx-daily .nx-daily-table-wrap{overflow-x:auto}#nx-daily .nx-daily-paging{display:flex;gap:14px;justify-content:flex-end;align-items:center;margin-top:12px}#nx-daily .nx-daily-coverage{font-size:12px;opacity:.8}#nx-daily .nx-daily-bottom{margin-top:12px}#nx-daily .nx-daily-bottom button{font-size:12px;margin-right:8px}
  @media(prefers-color-scheme:light){#nx-daily .nx-daily-positive{color:#238331}#nx-daily .nx-daily-negative{color:#b44037}}
  @media(max-width:850px){#nx-daily .nx-daily-controls{flex-wrap:wrap}#nx-daily .nx-daily-types{flex-basis:100%}#nx-daily h1{font-size:26px}#nx-daily .nx-daily-totals{font-size:21px}#nx-daily .nx-daily-nav{padding:12px}#nx-daily .nx-daily-nav div{gap:12px}#nx-daily .nx-daily-nav a{font-size:14px}}
  `;document.head.append(style);
  window.addEventListener('pagehide',dispose);window.addEventListener('pageshow',()=>void start());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)dispose();else void start();});window.addEventListener('focus',()=>void start());
  void start();
})();
