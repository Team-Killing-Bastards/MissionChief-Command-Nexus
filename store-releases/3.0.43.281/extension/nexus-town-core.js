/* Town plans use packaged place coordinates. No network or timers. */
(() => {
  'use strict';
  const roles = Object.freeze([
    ['3','FO','Fire Officer'], ['34','AO','Ambulance Officer'], ['20','OTL','Operational Team Leader'],
    ['10','RRV','Rapid Response Vehicle'], ['12','DSU','Dog Support Unit'], ['21','GP','General Practitioner'],
    ['22','CFR','Community First Responder'], ['57','CRV','Coastguard Rescue Vehicle'], ['60','CGC','Coastguard Commander'],
    ['92','PSAR','Personal SAR Vehicle'], ['93','SAR','SAR 4x4'], ['95','MID','Community Midwife'],
    ['96','SPRRV','Specialist Paramedic RRV'], ['102','SDU','Search Dog Unit (SAR)']
  ].map(([type,code,name],index)=>Object.freeze({type,code,name,east:(index%3)*20,north:-Math.floor(index/3)*20})));
  const clean = s => String(s??'').replace(/\s+/g,' ').trim();
  const id = v => /^\d{1,16}$/.test(String(v)) ? String(v) : '';
  const role = type => {const r=roles.find(r=>r.type===String(type));if(!r)throw Error('Choose a Home Response vehicle.');return r;};
  function town(value) {
    if(!id(value?.id)||!clean(value.name)||clean(value.name).length>120||typeof value.latitude!=='number'||typeof value.longitude!=='number'||!Number.isFinite(value.latitude)||!Number.isFinite(value.longitude)||value.latitude<49||value.latitude>62||value.longitude< -12||value.longitude>3)throw Error('Invalid town in saved plan.');
    return {id:id(value.id),name:clean(value.name),latitude:value.latitude,longitude:value.longitude,selected:value.selected!==false};
  }
  function miles(v) {v=Number(v);if(![5,10,15].includes(v))throw Error('Choose 5, 10 or 15 miles.');return v;}
  function distance(a,b) {
    const r=Math.PI/180,h=Math.sin((b.latitude-a.latitude)*r/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin((b.longitude-a.longitude)*r/2)**2;
    return 6371000*2*Math.asin(Math.sqrt(Math.min(1,h)));
  }
  const coordinate = p => Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=49&&p[0]<=62&&p[1]>=-12&&p[1]<=3;
  const cross = (a,b,p) => (b[1]-a[1])*(p[0]-a[0])-(b[0]-a[0])*(p[1]-a[1]);
  const onSegment = (a,b,p) => Math.abs(cross(a,b,p))<1e-10&&p[0]>=Math.min(a[0],b[0])-1e-10&&p[0]<=Math.max(a[0],b[0])+1e-10&&p[1]>=Math.min(a[1],b[1])-1e-10&&p[1]<=Math.max(a[1],b[1])+1e-10;
  function intersects(a,b,c,d) {
    return onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b)||
      ((cross(a,b,c)>0)!==(cross(a,b,d)>0)&&(cross(c,d,a)>0)!==(cross(c,d,b)>0));
  }
  function area(value={kind:'map'}) {
    if(value?.kind==='map')return {kind:'map'};
    if(value?.kind==='region'){
      if(!/^[A-Z]{2}\.[A-Za-z0-9._-]{1,60}$/.test(value.regionId)||clean(value.name).length>200)throw Error('Choose a named region.');
      return {kind:'region',regionId:value.regionId,name:clean(value.name)};
    }
    if(value?.kind==='regions'){
      if(!Array.isArray(value.regionIds)||!value.regionIds.length||value.regionIds.length>300||value.regionIds.some(id=>!/^[A-Z]{2}\.[A-Za-z0-9._-]{1,60}$/.test(id))||clean(value.name).length>500)throw Error('Select one or more named regions.');
      return {kind:'regions',regionIds:[...new Set(value.regionIds)].sort(),name:clean(value.name)};
    }
    if(value?.kind!=='polygon'||!Array.isArray(value.points)||value.points.length<3||value.points.length>100||!value.points.every(coordinate))throw Error('Draw a boundary with 3 to 100 points on the UK or Ireland map.');
    const points=value.points.map(p=>[...p]);
    if(new Set(points.map(p=>p.join(','))).size!==points.length)throw Error('Boundary points must be different. Use Finish boundary to close the shape.');
    let sum=0;
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];sum+=a[1]*b[0]-b[1]*a[0];
      for(let j=i+1;j<points.length;j++){
        if(j===i+1||i===0&&j===points.length-1)continue;
        if(intersects(a,b,points[j],points[(j+1)%points.length]))throw Error('Boundary lines cross or touch. Undo points or draw a simpler shape.');
      }
    }
    if(Math.abs(sum)<1e-8)throw Error('Draw a boundary around an area, rather than a straight line.');
    return {kind:'polygon',points};
  }
  function inside(points,latitude,longitude) {
    const p=[latitude,longitude];let within=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[j],b=points[i];if(onSegment(a,b,p))return true;
      if((a[0]>latitude)!==(b[0]>latitude)&&longitude<(b[1]-a[1])*(latitude-a[0])/(b[0]-a[0])+a[1])within=!within;
    }
    return within;
  }
  function regions(data) {
    if(data?.regions?.format!==1||!Array.isArray(data.regions.regions)||data.regions.regions.length>1000)throw Error('Named-region data unavailable.');
    return data.regions.regions;
  }
  function areaFilter(data,value) {
    const a=area(value);
    if(a.kind==='region'||a.kind==='regions'){
      const selected=(a.kind==='region'?[a.regionId]:a.regionIds).map(id=>regions(data).find(r=>r.id===id));
      if(selected.some(r=>!r||!Array.isArray(r.townIds)))throw Error('This region is unavailable. Choose another region or draw a boundary.');
      const names=selected.map(r=>r.name+' — '+r.group);a.name=names.slice(0,3).join(' + ')+(names.length>3?' + '+(names.length-3)+' more areas':'');const ids=new Set(selected.flatMap(r=>r.townIds));
      return {area:a,accept:t=>ids.has(String(t.id))};
    }
    return {area:a,accept:t=>a.kind!=='polygon'||inside(a.points,t.latitude,t.longitude)};
  }
  function plan(value) {
    if(!value||value.schema!==1||!Array.isArray(value.towns)||value.towns.length>500)throw Error('Invalid saved town plan.');
    const towns=value.towns.map(town);if(new Set(towns.map(t=>t.id)).size!==towns.length)throw Error('Duplicate towns in plan.');
    const result={schema:1,spacingMiles:miles(value.spacingMiles),towns};
    // Old plans stay usable and keep exactly the same town coordinates and role keys.
    if(value.area!==undefined){result.area=area(value.area);if(result.area.kind==='polygon'&&towns.some(t=>!inside(result.area.points,t.latitude,t.longitude)))throw Error('A saved town is outside the drawn boundary. Find towns again.');}
    return result;
  }
  function find(data,bounds,spacing,selection) {
    spacing=miles(spacing);
    const filter=areaFilter(data,selection);let inView=()=>true;
    if(filter.area.kind==='map'){
      if(!Array.isArray(bounds)||bounds.length!==4||bounds.some(n=>typeof n!=='number'||!Number.isFinite(n)))throw Error('Map area is unavailable.');
      const [s,w,n,e]=bounds;if(s<49||n>62||w< -12||e>3||n<=s||e<=w||n-s>4||e-w>6)throw Error('Zoom in on a UK or Ireland map area to find towns.');
      inView=t=>t.latitude>=s&&t.latitude<=n&&t.longitude>=w&&t.longitude<=e;
    }
    if(data?.format!==1||!Array.isArray(data.places)||data.places.length>60000)throw Error('Town data unavailable.');
    // Filter before spacing: a large town outside the area must not suppress an inside town.
    const candidates=data.places.map(([id,name,latitude,longitude])=>({id,name,latitude,longitude})).filter(t=>t.name&&inView(t)&&filter.accept(t)).map(town);
    // Prefer larger settlements before filling rural gaps; ties are deterministic.
    const population=id=>Math.max(0,Number(data.populations?.[id])||0);
    candidates.sort((a,b)=>population(b.id)-population(a.id)||b.latitude-a.latitude||a.longitude-b.longitude||Number(a.id)-Number(b.id));
    const picked=[];
    for(const t of candidates)if(picked.every(p=>distance(t,p)>=spacing*1609.344)){picked.push(t);if(picked.length>500)throw Error('Too many towns; increase spacing or choose a smaller area.');}
    return {schema:1,spacingMiles:spacing,towns:picked,...(selection===undefined?{}:{area:filter.area})};
  }
  function site(t,type) {
    t=town(t);const r=role(type),suffix='-'+r.code;
    return {key:t.id+':'+r.type,townId:t.id,type:r.type,name:t.name.toLocaleUpperCase('en-GB').slice(0,40-suffix.length).trim()+suffix,
      latitude:Number((t.latitude+r.north/111195).toFixed(6)),longitude:Number((t.longitude+r.east/(111195*Math.cos(t.latitude*Math.PI/180))).toFixed(6))};
  }
  function match(b,s) {return String(b?.building_type)==='22'&&clean(b.caption).toLocaleUpperCase('en-GB')===s.name&&b.latitude!=null&&b.longitude!=null&&Number.isFinite(Number(b.latitude))&&Number.isFinite(Number(b.longitude))&&distance(s,{latitude:Number(b.latitude),longitude:Number(b.longitude)})<12;}
  globalThis.NexusTownCore=Object.freeze({roles,role,id,clean,town,miles,distance,area,inside,regions,areaFilter,plan,find,site,match});
})();
