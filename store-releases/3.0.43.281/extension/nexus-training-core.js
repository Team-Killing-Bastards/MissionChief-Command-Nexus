/* Training 1.3.1: untrained default, station filters and academy allocation. */
(() => {
  'use strict';
  const text=v=>String(v??'').replace(/\s+/g,' ').trim();
  const id=v=>/^\d+$/.test(String(v??''))&&Number(v)>0?String(v):null;
  const defaults=Object.freeze({level_2_public_order:'level_1_public_order',police_sergeant:'level_1_public_order',police_medic:'level_1_public_order',police_inspector:'level_1_public_order',swat:'traffic_police'});
  const academyTypes=new Set([1,3,8,29]);
  // These are UK building types, not station-name guesses. Native course
  // admission still determines which of the filtered stations can attend.
  const stationGroups=Object.freeze([
    {value:'service:medical',label:'All medical stations',types:[2,4,5,20,21,22,25,32]},
    {value:'service:fire',label:'All fire stations',types:[0,18]},
    {value:'service:police',label:'All police stations',types:[6,13,16,19,26,36]},
    {value:'service:rescue',label:'All coastal & rescue stations',types:[27,28,30,31,33,37]}
  ]);
  const stationTypeKey=value=>/^(?:0|[1-9]\d*)$/.test(String(value??''))?'type:'+value:'unknown';
  function stationTypeMatches(value,filter){
    if(!filter)return true;
    const key=stationTypeKey(value),group=stationGroups.find(g=>g.value===filter);
    return group?key!=='unknown'&&group.types.includes(Number(value)):key===filter;
  }
  function stationTypeOptions(stations,labels={}){
    const types=[...new Set(stations.map(s=>stationTypeKey(s.building_type)))];
    const services=stationGroups.filter(g=>stations.some(s=>stationTypeMatches(s.building_type,g.value))).map(({value,label})=>({value,label}));
    const individual=types.map(value=>({value,label:value==='unknown'?'Type unavailable':text(labels[value.slice(5)])||'Building type '+value.slice(5)})).sort((a,b)=>a.label.localeCompare(b.label,'en-GB',{numeric:true}));
    return {services,individual};
  }
  const courseName=v=>text(v).toLowerCase().replace(/\([^)]*\)/g,'').replace(/\b(training|course)\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  function courseChoices(doc){return [...(doc.querySelector('select[name="education_select"]')?.options||[])].filter(o=>!o.disabled&&/^[a-z0-9_]+:\d+$/.test(o.value)).map(o=>({value:o.value,key:o.value.split(':')[0],label:text(o.textContent)}));}
  function academy(doc, buildingId, origin) {
    const path='/buildings/'+id(buildingId)+'/education';
    const form=[...doc.forms].find(f=>{try{const u=new URL(f.getAttribute('action'),origin);return u.origin===origin&&u.pathname===path&&f.method.toLowerCase()==='post'&&!u.search;}catch{return false;}});
    if(!form)throw Error('This academy has no available course form. It may have no free classrooms.');
    const select=form.querySelector('select[name="education_select"]'),rooms=form.querySelector('select[name="building_rooms_use"]');
    if(select?.disabled||rooms?.disabled)throw Error('The academy’s course or classroom control is unavailable.');
    const courses=courseChoices(form);
    const roomValues=[...(rooms?.options||[])].filter(o=>!o.disabled&&/^[1-9]\d*$/.test(o.value)).map(o=>Number(o.value)).filter(n=>n<=100);
    // The native game omits this selector when exactly one room is free.
    if(!rooms&&text(form.querySelector('#schooling_free')?.textContent)==='10')roomValues.push(1);
    const csrf=form.querySelector('input[name="authenticity_token"]')?.value;
    const privateNow=form.querySelector('select[name="alliance[duration]"] option[value="0"]');
    const free=form.querySelector('select[name="alliance[cost]"] option[value="0"]');
    const submit=form.querySelector('input[type="submit"][name="commit"]');
    if(!courses.length||!roomValues.length||!csrf||!privateNow||!free||!submit||submit.disabled)throw Error('The game’s training form is incomplete or unavailable. Open the academy to check it.');
    const stations=new Map();
    for(const panel of form.querySelectorAll('.building_list[building_id]')){
      const stationId=id(panel.getAttribute('building_id')),heading=panel.querySelector('.personal-select-heading');
      const expected='/buildings/'+stationId+'/schooling_personal_select';
      if(stationId&&heading?.getAttribute('href')===expected)stations.set(stationId,{id:stationId,path:expected});
    }
    return {id:String(buildingId),path,courses,rooms:roomValues.sort((a,b)=>a-b),capacity:Math.max(...roomValues)*10,hasRoomSelector:!!rooms,csrf,commit:submit.value,stations};
  }
  function personnel(doc, stationId) {
    const table=doc.querySelector('table[id="personal_table_'+id(stationId)+'"]');
    if(!table)throw Error('The station’s course personnel table was not returned.');
    const heads=[...table.querySelectorAll('thead th')].map(h=>text(h.textContent).toLowerCase());
    const nameCol=heads.indexOf('name'),educationCol=heads.findIndex(h=>/^(education|training)$/.test(h)),assignedCol=heads.findIndex(h=>/^assigned to$/.test(h));
    if(nameCol<0||educationCol<0||assignedCol<0)throw Error('Personnel columns are not recognised.');
    const people=[],seen=new Set();let unavailable=0;
    for(const row of table.querySelectorAll('tbody tr')){
      if(!row.cells?.length)continue;
      const box=row.querySelector('input[type="checkbox"][name="personal_ids[]"]');
      if(!box||box.disabled||/currently not available|in training|being trained/i.test(row.textContent)){unavailable++;continue;}
      const personId=id(box.value);
      if(!personId||box.getAttribute('building_id')!==String(stationId)||seen.has(personId))throw Error('Personnel identity is missing or duplicated.');
      seen.add(personId);
      const qualifications=[...box.attributes].filter(a=>a.value==='true'&&/^[a-z][a-z0-9_]*$/.test(a.name)&&!['checked','disabled','available'].includes(a.name)).map(a=>a.name);
      const assigned=row.cells[assignedCol],links=[...assigned.querySelectorAll('a[href]')];
      const vehicle=links.map(a=>a.getAttribute('href').match(/^\/vehicles\/(\d+)\/?$/)?.[1]).filter(Boolean);
      const bindingKnown=vehicle.length===1||(!text(assigned.textContent)&&!links.length);
      people.push({id:personId,stationId:String(stationId),name:text(row.cells[nameCol]?.textContent),qualifications,education:text(row.cells[educationCol]?.textContent),trainingKnown:[...box.attributes].some(a=>a.value==='false'||a.value==='true'),vehicleId:vehicle.length===1?vehicle[0]:null,bindingKnown});
    }
    return {people,unavailable};
  }
  function vehicleMap(vehicles){
    if(!Array.isArray(vehicles))throw Error('Vehicle availability could not be read.');
    const map=new Map();for(const v of vehicles){const key=id(v.id);if(key){if(map.has(key))throw Error('Duplicate vehicle identity.');map.set(key,v);}}return map;
  }
  function exclusion(person, vehicles, target, prior, rostered) {
    if(!person.trainingKnown)return 'training unknown';
    if(person.qualifications.includes(target))return 'already trained';
    if(prior&&!person.qualifications.includes(prior))return 'starting qualification missing';
    // A course's admission checkboxes may omit qualifications from another
    // service. Prove no completed training against the full roster as well.
    if(!prior){
      if(!Array.isArray(rostered?.qualifications))return 'complete training record unavailable';
      if(person.qualifications.length||rostered.qualifications.length)return 'has existing training';
    }
    if(!person.bindingKnown)return 'vehicle assignment unknown';
    if(person.vehicleId){
      const v=vehicles.get(person.vehicleId),status=v?.fms_real??v?.fms;
      if(!v||String(v.building_id)!==person.stationId)return 'vehicle assignment unknown';
      if(Number(status)!==2||v.mission_id||v.target_id||v.target_type==='mission')return 'vehicle away or on a mission';
    }
    return '';
  }
  function select(stations, vehicles, target, prior, perStation){
    if(!Number.isInteger(perStation)||perStation<1||perStation>1000)throw Error('Enter 1–1,000 people per station.');
    if(!/^[a-z0-9_]+$/.test(target)||prior===target)throw Error('Choose a different starting qualification from the new course.');
    const used=new Set(),results=[];
    for(const station of stations){
      const reasons={},eligible=[],rosterById=new Map((station.roster||[]).map(p=>[p.id,p]));
      for(const person of station.people){
        if(used.has(person.id))throw Error('The same person appears in more than one station.');used.add(person.id);
        const reason=exclusion(person,vehicles,target,prior,rosterById.get(person.id));if(reason)reasons[reason]=(reasons[reason]||0)+1;else eligible.push(person);
      }
      eligible.sort((a,b)=>a.qualifications.length-b.qualifications.length||Number(a.id)-Number(b.id));
      results.push({id:station.id,name:station.name,people:eligible.slice(0,perStation),available:eligible.length,requested:perStation,unavailable:station.unavailable,reasons});
    }
    return results;
  }
  function roster(doc,stationId,courses){
    const table=doc.querySelector('#personal_table');if(!table)throw Error('The complete station roster was not returned.');
    const heads=[...table.querySelectorAll('thead th')].map(n=>text(n.textContent).toLowerCase()),nameCol=heads.indexOf('name'),educationCol=heads.findIndex(n=>/^(education|training)$/.test(n)),statusCol=heads.indexOf('status');
    if(nameCol<0||educationCol<0||statusCol<0)throw Error('The station roster columns have changed.');
    const people=[],seen=new Set();
    for(const row of table.querySelectorAll('tbody tr')){
      if(!row.cells.length)continue;
      const pid=id(row.querySelector('input.personal-delete-checkbox')?.value)||id(row.querySelector('a[href^="/personals/"]')?.getAttribute('href')?.match(/^\/personals\/(\d+)/)?.[1]);
      if(!pid||seen.has(pid))throw Error('Roster identity is missing or duplicated.');seen.add(pid);
      let qualifications;const raw=row.getAttribute('data-filterable-by');
      try{qualifications=raw===null&&!text(row.cells[educationCol]?.textContent)?[]:JSON.parse(raw);if(!Array.isArray(qualifications)||qualifications.some(q=>typeof q!=='string'||!/^[a-z0-9_]+$/.test(q)))throw Error();}catch{throw Error('Complete qualification data is unavailable for '+text(row.cells[nameCol]?.textContent)+'.');}
      const status=row.cells[statusCol],statusText=text(status?.textContent),refs=[...status.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(p=>/^\/schoolings\/\d+\/?$/.test(p));
      const pending=refs.length>0||/\b(training|education|school|schooling|course)\b/i.test(statusText);
      const pendingKeys=(courses||[]).filter(c=>{const label=courseName(c.label),hay=courseName(statusText);return label.length>=4&&(' '+hay+' ').includes(' '+label+' ');}).map(c=>c.key);
      people.push({id:pid,stationId:String(stationId),name:text(row.cells[nameCol]?.textContent),qualifications,pending,pendingKeys,coursePaths:[...new Set(refs)],status:statusText});
    }
    const expected=[...doc.querySelectorAll('dt')].find(n=>/^amount:?$/i.test(text(n.textContent)))?.nextElementSibling?.textContent?.match(/([\d,]+)\s+people/i)?.[1];
    if(expected&&Number(expected.replaceAll(',',''))!==people.length)throw Error('Only part of the station roster was returned.');
    if(doc.querySelector('a[rel="next"],.pagination .next:not(.disabled) a'))throw Error('The roster is paginated; a complete count is required.');
    return people;
  }
  function counts(people,target){
    return {qualified:people.filter(p=>p.qualifications.includes(target)).length,pending:people.filter(p=>!p.qualifications.includes(target)&&p.pendingKeys.includes(target)).length,unknownPending:people.filter(p=>p.pending&&!p.pendingKeys.length&&!p.qualifications.includes(target)).length};
  }
  function requestCount(mode,amount,totals){
    if(!['add','topup'].includes(mode)||!Number.isInteger(amount)||amount<1||amount>1000)throw Error('Enter 1–1,000 people and select Add or Top up.');
    if(mode==='topup'&&totals.unknownPending)throw Error('A current course could not be identified. Top up is held to avoid training extra people.');
    return mode==='add'?amount:Math.max(0,amount-totals.qualified-totals.pending);
  }
  function stationPlan(station,vehicles,target,prior,mode,amount,manualIds=null){
    const totals=counts(station.roster,target),requested=requestCount(mode,amount,totals);
    if(manualIds!==null&&(!Array.isArray(manualIds)||new Set(manualIds).size!==manualIds.length||manualIds.length>requested))throw Error('Manual staff choices exceed this station’s requested training amount.');
    if(!requested)return {id:station.id,name:station.name,people:[],unavailable:station.unavailable,requested:0,available:0,reasons:{},totals,manual:manualIds!==null};
    const rosterById=new Map(station.roster.map(p=>[p.id,p]));
    if(station.people.some(p=>!rosterById.has(p.id)))throw Error('The roster and available personnel list disagree. Scan this station again.');
    const people=station.people.filter(p=>!rosterById.get(p.id).pending&&!rosterById.get(p.id).qualifications.includes(target));
    const plan=select([{...station,people}],vehicles,target,prior,Math.max(1,requested))[0];
    if(manualIds!==null){const byId=new Map(people.map(p=>[p.id,p]));plan.people=manualIds.map(pid=>{const person=byId.get(pid);if(!person||exclusion(person,vehicles,target,prior,rosterById.get(pid)))throw Error('A manually selected person is no longer eligible. Open the station’s staff list and update the selection.');return person;});plan.requested=manualIds.length;plan.manual=true;}
    return {...plan,totals};
  }
  function allocate(stations,academies,target){
    const seen=new Set();for(const station of stations)for(const person of station.people){if(seen.has(person.id))throw Error('A person appears more than once in the training plan.');seen.add(person.id);}
    const candidates=academies.filter(a=>a.capacity>0&&a.courses.some(c=>c.key===target)).sort((a,b)=>b.capacity-a.capacity||a.id.localeCompare(b.id));
    const size=stations.length+candidates.length+2,sink=size-1,graph=Array.from({length:size},()=>[]);
    const edge=(from,to,cap)=>{const forward={to,cap,initial:cap,reverse:graph[to].length};graph[from].push(forward);graph[to].push({to:from,cap:0,initial:0,reverse:graph[from].length-1});return forward;};
    const edges=[];stations.forEach((s,i)=>{edge(0,i+1,s.people.length);edges[i]=candidates.map((a,j)=>a.stations.has(s.id)?edge(i+1,stations.length+j+1,s.people.length):null);});
    candidates.forEach((a,j)=>edge(stations.length+j+1,sink,a.capacity));
    // Levelled flow avoids rescanning every station/academy edge for each person.
    while(true){const level=Array(size).fill(-1),queue=[0];level[0]=0;for(let i=0;i<queue.length;i++)for(const e of graph[queue[i]])if(e.cap>0&&level[e.to]<0){level[e.to]=level[queue[i]]+1;queue.push(e.to);}if(level[sink]<0)break;
      const next=Array(size).fill(0);function push(node,limit){if(node===sink)return limit;for(;next[node]<graph[node].length;next[node]++){const e=graph[node][next[node]];if(e.cap<=0||level[e.to]!==level[node]+1)continue;const sent=push(e.to,Math.min(limit,e.cap));if(sent){e.cap-=sent;graph[e.to][e.reverse].cap+=sent;return sent;}}return 0;}
      while(push(0,Infinity)>0){}
    }
    const batches=candidates.map(a=>({academyId:a.id,name:a.name,people:[],course:a.courses.find(c=>c.key===target),rooms:0,capacity:a.capacity})),unallocated=[];
    stations.forEach((s,i)=>{let offset=0;edges[i].forEach((e,j)=>{if(!e)return;const count=e.initial-e.cap;batches[j].people.push(...s.people.slice(offset,offset+count));offset+=count;});unallocated.push({id:s.id,name:s.name,count:s.people.length-offset});});
    for(let j=0;j<batches.length;j++)batches[j].rooms=candidates[j].rooms.find(n=>n*10>=batches[j].people.length)||0;
    return {batches:batches.filter(b=>b.people.length),unallocated,capacity:candidates.reduce((n,a)=>n+a.capacity,0)};
  }
  function enrolmentVerified(people,rosters,target){return people.every(p=>{const current=rosters.get(p.stationId)?.find(x=>x.id===p.id);return current&&(current.qualifications.includes(target)||current.pendingKeys.includes(target));});}
  function courseMatches(doc,course){return [...doc.querySelectorAll('h1,h2,h3')].some(h=>{const wanted=courseName(course.label),heading=courseName(h.textContent);return wanted.length>=4&&(' '+heading+' ').includes(' '+wanted+' ');});}
  globalThis.NexusTrainingCore=Object.freeze({version:'1.3.1',text,id,defaults,academyTypes,stationTypeMatches,stationTypeOptions,academy,courseChoices,personnel,vehicleMap,exclusion,select,roster,counts,requestCount,stationPlan,allocate,enrolmentVerified,courseMatches});
})();
