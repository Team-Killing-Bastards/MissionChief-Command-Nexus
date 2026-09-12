/* Nexus native overview: bounded page parse, responsive SVG; credit-page chrome settles briefly, no chart runtime. */
(() => {
  'use strict';
  if (globalThis.NexusSettings?.enabled('creditOverview') === false) return;
  if(!/^\/credits\/overview\/?$/.test(location.pathname)||/^mcn-v3-(active-worker|pipeline-preload)-/.test(window.name||''))return;
  try{if(window.frameElement?.matches('[data-mcn-v3-worker], [data-mcn-v3-pipeline-preload], #mcn-v3-background-mission-worker'))return;}catch{return;}
  if(window.__NEXUS_OVERVIEW__||!globalThis.NexusOverviewCore)return;
  const C=NexusOverviewCore,nf=new Intl.NumberFormat('en-GB');
  // Bind inferred dates to this document's load day, so reopening a hidden view after midnight cannot relabel old rows.
  const loadDay=new Date(performance.timeOrigin||Date.now()).toISOString().slice(0,10);
  const series=[{key:'revenue',label:'Revenue',color:'#28a828'},{key:'spending',label:'Spendings',color:'#a32323'},{key:'net',label:'Sum',color:'#74868f'}];
  const enabled=new Set(series.map(s=>s.key));
  let root=null,source=null,records=[],hidden=[],refs={},originalOnly=false;
  let pageChrome=null;
  const state=window.__NEXUS_OVERVIEW__={active:false,retainedDays:0,renderedBars:0,parses:0,missingRows:0,unreadableRows:0,mismatches:0,limited:false,inferredDates:false};
  const fmt=n=>n===null?'—':nf.format(n),dateLabel=iso=>iso.split('-').reverse().join('/');
  const tone=n=>n>0?'nx-overview-positive':n<0?'nx-overview-negative':'';
  function el(tag,value,cls){const n=document.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;}
  function link(label,href){const a=el('a',label);a.href=href;return a;}
  function button(label,action){const b=el('button',label);b.type='button';b.addEventListener('click',action);return b;}
  function svg(tag,attrs={},value){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(value!==undefined)n.textContent=value;return n;}
  function hide(node){if(!node||node===root||root.contains(node)||node.contains(root)||hidden.some(x=>x.node===node))return;hidden.push({node,value:node.hidden});node.hidden=true;node.classList.add('nx-overview-original');}
  function findSource(){
    const candidates=[];
    for(const table of document.querySelectorAll('table')){
      if(table.closest('#nx-overview')||!table.tBodies[0])continue;
      const rows=table.tBodies[0].rows,first=rows[0];
      const headers=Array.from(table.tHead?.rows?.[0]?.cells||[],c=>c.textContent);
      const map=C.columns(headers,first?.cells.length||headers.length);if(!map)continue;
      // Do not replace unrelated layout tables if a credit table is missing or ambiguous.
      if(!rows.length||Array.from({length:Math.min(rows.length,5)},(_,i)=>rows[i]).some(r=>[map.net,map.spending,map.revenue].some(i=>C.number(r.cells[i]?.textContent)!==null)))candidates.push({table,map});
    }
    return candidates.length===1?candidates[0]:null;
  }
  function start(){
    if(state.active||originalOnly||document.hidden)return;
    const found=findSource();if(!found)return;source=found.table;const all=source.tBodies[0].rows;
    if(all.length>366){state.limited=true;return;} // Preserve an unexpected large native table, rather than produce a misleading truncated chart.
    state.parses++;state.unreadableRows=0;state.missingRows=0;state.mismatches=0;state.limited=false;
    const end=C.date(source.getAttribute('data-end-date'))||loadDay;
    records=[];
    for(let i=0;i<all.length;i++){
      const tr=all[i],row=C.row(Array.from(tr.cells,c=>c.textContent),found.map,i,all.length,end,tr.getAttribute('data-date'));
      if(!row){state.unreadableRows++;continue;}
      if(row.missing)state.missingRows++;if(row.mismatch)state.mismatches++;records.push(row);
    }
    if(!records.length&&all.length)return;
    records.sort((a,b)=>a.date.localeCompare(b.date)||a.index-b.index);
    // Repeated dates are not merged or assigned invented days. Leave the original intact.
    if(new Set(records.map(r=>r.date)).size!==records.length){records=[];return;}
    state.retainedDays=records.length;state.inferredDates=records.some(r=>r.inferredDate);
    mount();state.active=true;drawTable();drawChart();
    hide(source);
    const header=document.querySelector('.page-header,h1');if(header&&!root.contains(header)&&!pageChrome?.ownsNavigation(header))hide(header);
    const details=[];if(state.missingRows)details.push(`${state.missingRows} rows contain unavailable values`);if(state.unreadableRows)details.push(`${state.unreadableRows} unreadable rows omitted`);if(state.mismatches)details.push(`${state.mismatches} sums differ from revenue plus spending; game values retained`);
    refs.coverage.textContent=`${records.length} days from the game overview. ${state.inferredDates?'Dates follow the game’s UTC day order.':'Dates supplied by the game.'}${details.length?` ${details.join(' · ')}.`:''} Refresh to retrieve newer figures.`;
  }
  function mount(){
    root=el('section');root.id='nx-overview';root.setAttribute('aria-label','Credits overview');
    const nav=el('nav',undefined,'nx-overview-nav'),navLinks=el('div');navLinks.append(link('Transactions','/credits'),link('Summary day','/credits/daily'),link('Coins protocol','/coins/list'));nav.append(el('strong','Credits'),navLinks);
    const heading=el('h1','Overview');const layout=el('div',undefined,'nx-overview-layout');
    const figure=el('figure');refs.chart=el('div',undefined,'nx-overview-chart');refs.chart.setAttribute('aria-label','Daily revenue, spending and net graph');
    refs.legend=el('div',undefined,'nx-overview-legend');
    for(const s of series){const b=button('',()=>{enabled.has(s.key)?enabled.delete(s.key):enabled.add(s.key);drawChart();});b.dataset.series=s.key;b.setAttribute('aria-pressed','true');const dot=el('span',undefined,'nx-overview-dot');dot.style.backgroundColor=s.color;b.append(dot,document.createTextNode(s.label));refs.legend.append(b);}
    refs.tooltip=el('figcaption','Point to a bar or focus it to see its exact value.','nx-overview-tooltip');refs.tooltip.setAttribute('aria-live','polite');figure.append(refs.chart,refs.legend,refs.tooltip);
    const tableWrap=el('div',undefined,'nx-overview-table-wrap');refs.table=el('table');refs.table.id='nx-overview-table';const head=el('thead'),row=el('tr');for(const label of ['Date','Revenue','Spendings','Sum']){const th=el('th',label);th.scope='col';row.append(th);}head.append(row);refs.body=el('tbody');refs.table.append(head,refs.body);tableWrap.append(refs.table);layout.append(figure,tableWrap);
    const footer=el('div',undefined,'nx-overview-footer');refs.coverage=el('p');footer.append(refs.coverage,button('Refresh game overview',()=>location.reload()),button('Show original game overview',()=>{originalOnly=true;dispose();}));
    root.append(nav,heading,layout,footer);source.before(root);
    pageChrome=globalThis.NexusCreditPageChrome?.mount({root,fallback:nav,source,mode:'overview',hide});
    let background=getComputedStyle(document.body).backgroundColor;const rgb=background.match(/[\d.]+/g)?.map(Number);const light=!rgb||background==='rgba(0, 0, 0, 0)'||(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>140);
    root.style.setProperty('--nx-overview-positive',light?'#237d2b':'#52bd5a');root.style.setProperty('--nx-overview-negative',light?'#b2372d':'#c56860');
  }
  function drawTable(){
    const frag=document.createDocumentFragment();
    for(const row of [...records].reverse()){const tr=el('tr');tr.dataset.date=row.date;tr.append(el('td',dateLabel(row.date)));for(const key of ['revenue','spending','net'])tr.append(el('td',row[key]===null?'—':`${fmt(row[key])} Credits`,`${tone(row[key])}${key==='net'?' nx-overview-net':''}`));frag.append(tr);}
    if(!records.length){const tr=el('tr'),td=el('td','No overview entries returned by the game.');td.colSpan=4;tr.append(td);frag.append(tr);}refs.body.replaceChildren(frag);
  }
  function drawChart(){
    const active=series.filter(s=>enabled.has(s.key));for(const b of refs.legend.querySelectorAll('button'))b.setAttribute('aria-pressed',String(enabled.has(b.dataset.series)));
    refs.tooltip.textContent='Point to a bar or focus it to see its exact value.';
    const width=Math.max(720,records.length*65+92),height=500,left=66,right=16,top=22,bottom=60,plotWidth=width-left-right,plotHeight=height-top-bottom;
    const plot=svg('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':'Revenue, spending and net by day. Exact values are also in the adjacent table.'});
    // Wide history scrolls horizontally; the common 9-day chart fits the left column.
    plot.style.minWidth=records.length>12?`${width}px`:'0';plot.append(svg('title',{},'Credits overview'));
    const scale=C.scale(records.flatMap(r=>active.map(s=>r[s.key]))),y=value=>top+(scale.max-value)/(scale.max-scale.min)*plotHeight;
    for(let value=scale.min,i=0;value<=scale.max+scale.step*.01&&i<12;value+=scale.step,i++){
      plot.append(svg('line',{x1:left,x2:width-right,y1:y(value),y2:y(value),class:value===0?'nx-overview-zero':'nx-overview-grid'}));
      const label=Math.abs(value)>=1e6?`${Number((value/1e6).toFixed(2))}M`:Math.abs(value)>=1e3?`${Number((value/1e3).toFixed(2))}k`:fmt(value);
      plot.append(svg('text',{x:left-8,y:y(value)+4,'text-anchor':'end',class:'nx-overview-axis'},label));
    }
    state.renderedBars=0;const slot=plotWidth/Math.max(1,records.length),barWidth=Math.min(17,slot*.76/Math.max(1,active.length)),groupWidth=barWidth*active.length;
    records.forEach((row,index)=>{
      const centre=left+slot*(index+.5);
      plot.append(svg('text',{x:centre,y:height-bottom+24,'text-anchor':'middle',class:'nx-overview-axis'},dateLabel(row.date)));
      active.forEach((s,j)=>{
        const value=row[s.key];if(value===null)return;
        const bar=svg('rect',{x:centre-groupWidth/2+j*barWidth+1,y:Math.min(y(0),y(value)),width:Math.max(1,barWidth-2),height:Math.max(1,Math.abs(y(value)-y(0))),rx:3,fill:s.color,stroke:'currentColor','stroke-opacity':.45,'stroke-width':1.3,tabindex:0,'aria-label':`${dateLabel(row.date)} · ${s.label}: ${fmt(value)} Credits`,'data-series':s.key,'data-value':value,'data-date':row.date,class:'nx-overview-bar'});
        const show=()=>{refs.tooltip.textContent=`${dateLabel(row.date)} · ${s.label}: ${fmt(value)} Credits`;for(const tr of refs.body.rows)tr.classList.toggle('nx-overview-highlight',tr.dataset.date===row.date);};
        bar.addEventListener('pointerenter',show);bar.addEventListener('focus',show);bar.addEventListener('click',show);bar.addEventListener('blur',()=>{for(const tr of refs.body.rows)tr.classList.remove('nx-overview-highlight');});bar.append(svg('title',{},`${dateLabel(row.date)} · ${s.label}: ${fmt(value)} Credits`));plot.append(bar);state.renderedBars++;
      });
    });
    if(!active.length||!records.length)plot.append(svg('text',{x:width/2,y:height/2,'text-anchor':'middle',class:'nx-overview-empty'},records.length?'Choose a series below to display it.':'No overview data returned.'));
    refs.chart.replaceChildren(plot);
  }
  function dispose(){pageChrome?.dispose();pageChrome=null;root?.remove();root=null;records=[];refs={};for(const h of hidden){h.node.hidden=h.value;h.node.classList.remove('nx-overview-original');}hidden=[];state.active=false;state.retainedDays=0;state.renderedBars=0;source=null;}
  const style=el('style');style.textContent=`
  .nx-overview-original{display:none!important}#nx-overview{color:inherit;font:inherit;margin:10px 0}#nx-overview *{box-sizing:border-box}#nx-overview [hidden]{display:none!important}#nx-overview a{color:inherit;text-decoration:none}#nx-overview button{font:inherit;cursor:pointer}#nx-overview :focus-visible{outline:2px solid #6bbcff;outline-offset:2px}
  #nx-overview .nx-overview-nav{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 22px;margin-bottom:26px;background:#ce3b25;border:1px solid #702415;border-radius:4px;color:white}#nx-overview .nx-overview-nav strong{font-size:22px}#nx-overview .nx-overview-nav div{display:flex;gap:28px}#nx-overview h1{font:inherit;font-size:40px;margin:0 0 22px}
  #nx-overview .nx-overview-layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:28px;align-items:start}#nx-overview figure{margin:0;min-width:0}#nx-overview .nx-overview-chart{overflow-x:auto}#nx-overview svg{display:block;width:100%;height:auto;color:inherit}#nx-overview .nx-overview-axis{fill:currentColor;font:10px Arial,sans-serif}#nx-overview .nx-overview-grid{stroke:currentColor;stroke-opacity:.18}#nx-overview .nx-overview-zero{stroke:currentColor;stroke-opacity:.55}#nx-overview .nx-overview-empty{fill:currentColor;font:16px Arial,sans-serif}#nx-overview .nx-overview-bar{cursor:default}#nx-overview .nx-overview-bar:hover,#nx-overview .nx-overview-bar:focus{stroke-opacity:1;stroke-width:2.5;outline:none;filter:brightness(1.15)}
  #nx-overview .nx-overview-legend{display:flex;justify-content:center;gap:20px;margin-top:8px}#nx-overview .nx-overview-legend button{border:0;background:transparent;color:inherit;padding:4px 6px;display:flex;align-items:center;gap:7px;font-size:13px}#nx-overview .nx-overview-dot{width:11px;height:11px;border-radius:50%;display:inline-block}#nx-overview .nx-overview-legend [aria-pressed=false]{opacity:.45;text-decoration:line-through}#nx-overview .nx-overview-tooltip{font-size:12px;min-height:25px;text-align:center;margin-top:12px;opacity:.85}
  #nx-overview .nx-overview-table-wrap{overflow-x:auto}#nx-overview table{width:100%;border-collapse:collapse}#nx-overview th,#nx-overview td{text-align:left;padding:14px 10px;border-bottom:1px solid #aaa;white-space:nowrap}#nx-overview thead{background:#0005}#nx-overview tbody tr:nth-child(2n){background:#0002}#nx-overview .nx-overview-positive{color:var(--nx-overview-positive)}#nx-overview .nx-overview-negative{color:var(--nx-overview-negative)}#nx-overview .nx-overview-net{font-weight:bold}#nx-overview tr.nx-overview-highlight{background:#7b9db733}#nx-overview .nx-overview-footer{margin-top:24px;font-size:12px;opacity:.9}#nx-overview .nx-overview-footer button{background:linear-gradient(#555,#222);color:white;border:1px solid #222;border-radius:4px;padding:5px 8px;margin-right:8px}
  @media(max-width:1050px){#nx-overview .nx-overview-layout{grid-template-columns:1fr}#nx-overview svg{max-height:540px}#nx-overview table{font-size:14px}}@media(max-width:600px){#nx-overview .nx-overview-nav{padding:12px;gap:10px}#nx-overview .nx-overview-nav div{gap:12px;font-size:12px}#nx-overview h1{font-size:30px}}
  `;document.head.append(style);
  window.addEventListener('pagehide',dispose);window.addEventListener('pageshow',start);window.addEventListener('focus',start);document.addEventListener('visibilitychange',()=>{if(document.hidden)dispose();else start();});start();
})();
