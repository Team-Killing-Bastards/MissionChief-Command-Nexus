/* On-demand area controls. Drawing listeners exist only while drawing. */
(() => {
  'use strict';
  const C=globalThis.NexusTownCore;
  const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  function create(host,{map,L,request,onChange,onStatus}) {
    let locked=true,disposed=false,drawing=false,points=[],polygon=[],overlay=null,catalog=null,loading=null,zoomWasEnabled=false,oldCursor='';const selected=new Map();
    const box=el('fieldset');box.className='nx-town-area';box.append(el('legend','Search area'));host.append(box);
    const mode=el('select');mode.setAttribute('aria-label','Town search area');for(const [v,t] of [['map','Visible map rectangle'],['region','Named councils / counties'],['polygon','Drawn boundary']])mode.append(new Option(t,v));box.append(mode);
    const regionBox=el('div'),search=el('input'),regions=el('div'),regionCount=el('p'),regionActions=el('div');search.type='search';search.placeholder='Search regions, e.g. Scottish Borders';search.setAttribute('aria-label','Search named regions');regions.setAttribute('aria-label','Named regions');regions.setAttribute('role','group');regions.style.cssText='max-height:160px;overflow:auto;border:1px solid #47627b;border-radius:5px;padding:5px';regionActions.className='nx-town-actions';
    const selectMatches=el('button','Select matching areas'),clearRegions=el('button','Clear areas');selectMatches.type=clearRegions.type='button';regionActions.append(selectMatches,clearRegions);regionBox.append(search,regionActions,regions,regionCount);box.append(regionBox);
    const drawingBox=el('div'),actions=el('div');actions.className='nx-town-actions';
    const btn=(text,fn)=>{const node=el('button',text);node.type='button';node.addEventListener('click',fn);actions.append(node);return node;};
    const start=btn('Draw boundary',()=>begin());
    const undo=btn('Undo point',()=>{points.pop();paint();refresh();});
    const finish=btn('Finish boundary',()=>{
      try{polygon=C.area({kind:'polygon',points}).points;end();paint();refresh();onChange();onStatus('Boundary ready. Click Find towns in chosen area to replace the saved town list.');}catch(e){onStatus(e.message);}
    });
    const cancel=btn('Cancel drawing',()=>cancelDraw());
    const show=btn('Show boundary',()=>{if(polygon.length)map.fitBounds(polygon,{padding:[35,35]});});
    drawingBox.append(actions);box.append(drawingBox);
    const help=el('p'),pointCount=el('small');box.append(help,pointCount);
    function refresh(){
      regionBox.hidden=mode.value!=='region';drawingBox.hidden=mode.value!=='polygon';
      help.textContent=mode.value==='region'?'Tick one or more areas. Search covers their combined area, with shared spacing and no repeated towns. UK towns use council boundaries; other regions use recorded town areas.':mode.value==='polygon'?'Click around the area on the map, then Finish boundary. Only town centres inside the outline are included. You can pan while drawing.':'Search the whole visible map rectangle. This can include neighbouring regions.';
      mode.disabled=locked||drawing;search.disabled=locked||!!loading;selectMatches.disabled=clearRegions.disabled=locked||!!loading||!catalog;regions.querySelectorAll('input').forEach(n=>n.disabled=locked||!!loading||!catalog);
      regionCount.textContent=selected.size+' areas selected'+(selected.size?' · '+[...selected.values()].slice(0,3).join(', ')+(selected.size>3?' + '+(selected.size-3)+' more':''):'');
      start.hidden=drawing;show.hidden=drawing||!polygon.length;undo.hidden=finish.hidden=cancel.hidden=!drawing;
      start.textContent=polygon.length?'Redraw boundary':'Draw boundary';start.disabled=show.disabled=locked;
      undo.disabled=locked||!points.length;finish.disabled=locked||points.length<3;cancel.disabled=locked;
      pointCount.textContent=drawing?points.length+' / 100 points · Finish closes the outline · Escape cancels':mode.value==='polygon'&&polygon.length?polygon.length+' points saved in this boundary':'';
    }
    const matches=()=>{const term=search.value.trim().toLocaleLowerCase('en-GB');return (catalog||[]).filter(r=>!term||`${r.name} ${r.group}`.toLocaleLowerCase('en-GB').includes(term));};
    function choices(){
      regions.replaceChildren();if(!catalog){regions.textContent='Loading regions…';return;}
      for(const r of matches()){
        const label=el('label'),check=el('input'),name=r.name+' — '+r.group;label.style.cssText='display:flex;align-items:center;gap:7px;margin:5px 0';check.type='checkbox';check.checked=selected.has(r.id);check.setAttribute('aria-label',name);
        check.addEventListener('change',()=>{check.checked?selected.set(r.id,name):selected.delete(r.id);refresh();onChange();});label.append(check,el('span',name));regions.append(label);
      }
      if(!regions.children.length)regions.textContent='No matching areas.';refresh();
    }
    async function ensureRegions(){
      if(catalog||disposed)return;
      if(!loading)loading=request('regions').then(r=>{if(!disposed){catalog=r.regions;for(const id of selected.keys()){const found=catalog.find(r=>r.id===id);if(found)selected.set(id,found.name+' — '+found.group);}choices();}}).catch(e=>{if(!disposed){regions.textContent='Could not load regions — reselect Named councils / counties.';onStatus(e.message);}}).finally(()=>{loading=null;if(!disposed)refresh();});
      refresh();await loading;
    }
    function paint(){
      overlay?.remove();overlay=null;if(disposed||mode.value!=='polygon')return;
      const shown=drawing?points:polygon;if(!shown.length)return;
      overlay=L.layerGroup().addTo(map);
      if(shown.length>=2)(shown.length>=3?L.polygon(shown,{color:'#ffcf66',weight:3,fillOpacity:.12,interactive:false}):L.polyline(shown,{color:'#ffcf66',weight:3,interactive:false})).addTo(overlay);
      if(drawing)for(const p of shown)L.circleMarker(p,{radius:5,color:'#ffcf66',fillOpacity:1,interactive:false}).addTo(overlay);
    }
    function click(event){
      if(!drawing||locked||disposed)return;
      if(points.length>=100){onStatus('The boundary has 100 points. Finish it or undo a point.');return;}
      const p=[Number(event.latlng.lat.toFixed(6)),Number(event.latlng.lng.toFixed(6))];
      if(p[0]<49||p[0]>62||p[1]<-12||p[1]>3){onStatus('Draw within the UK or Ireland map.');return;}
      if(points.some(q=>q[0]===p[0]&&q[1]===p[1]))return;
      points.push(p);paint();refresh();
    }
    function key(event){if(event.key==='Escape'&&drawing){event.preventDefault();event.stopPropagation();cancelDraw();}}
    function begin(){
      if(locked||drawing)return;drawing=true;points=[];zoomWasEnabled=!!map.doubleClickZoom?.enabled();map.doubleClickZoom?.disable();
      const node=map.getContainer();oldCursor=node.style.cursor;node.style.cursor='crosshair';map.on('click',click);document.addEventListener('keydown',key,true);paint();refresh();onChange();onStatus('Click points around the area, then Finish boundary.');
    }
    function end(){
      if(!drawing)return;drawing=false;map.off('click',click);document.removeEventListener('keydown',key,true);if(zoomWasEnabled)map.doubleClickZoom?.enable();map.getContainer().style.cursor=oldCursor;
    }
    function cancelDraw(){end();points=[];paint();refresh();onChange();onStatus('Drawing cancelled. The previous boundary and saved towns are unchanged.');}
    mode.addEventListener('change',()=>{paint();refresh();onChange();if(mode.value==='region')void ensureRegions();});
    search.addEventListener('input',choices);
    selectMatches.addEventListener('click',()=>{for(const r of matches())selected.set(r.id,r.name+' — '+r.group);choices();onChange();});clearRegions.addEventListener('click',()=>{selected.clear();choices();onChange();});
    refresh();
    return {
      async load(saved){const a=C.area(saved);mode.value=a.kind==='regions'?'region':a.kind;polygon=a.kind==='polygon'?a.points:[];selected.clear();for(const id of a.kind==='region'?[a.regionId]:a.kind==='regions'?a.regionIds:[])selected.set(id,a.name);if(mode.value==='region')await ensureRegions();paint();refresh();},
      value(){if(drawing)throw Error('Finish or cancel the drawn boundary first.');if(mode.value!=='region')return C.area(mode.value==='map'?{kind:'map'}:{kind:'polygon',points:polygon});const ids=[...selected.keys()].sort(),names=ids.map(id=>selected.get(id)),name=names.slice(0,3).join(' + ')+(names.length>3?' + '+(names.length-3)+' more areas':'');return C.area(ids.length===1?{kind:'region',regionId:ids[0],name}:{kind:'regions',regionIds:ids,name});},
      lock(value){locked=value;refresh();},
      get drawing(){return drawing;},
      dispose(){disposed=true;end();overlay?.remove();overlay=null;}
    };
  }
  globalThis.NexusTownAreaUI={create};
})();
