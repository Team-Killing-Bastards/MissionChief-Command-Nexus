import './nexus-town-core.js';
const C=globalThis.NexusTownCore;
const validKey=key=>/^\d{1,16}:\d{1,3}$/.test(key)&&!!C.role(key.split(':')[1]);
export function createTownHandler(api,{load=async()=>{const data=await Promise.all(['nexus-naming-places.json','nexus-town-populations.json','nexus-town-regions.json'].map(async name=>{const r=await fetch(new URL(name,import.meta.url));if(!r.ok)throw Error('Town data unavailable.');return r.json();}));return {...data[0],populations:data[1].populations,regions:data[2]};}}={}) {
  let serial=Promise.resolve(),places;
  const ready=new Map(),data=()=>places??=(Promise.resolve().then(load).catch(e=>{places=null;throw e;}));
  async function ensure(scope){
    if(ready.has(scope))return ready.get(scope);
    const work=(async()=>{
      const metaKey='nexusTownPlanV2:'+scope,prefix='nexusTownJournalV2:'+scope+':';
      let meta=(await api.storage.local.get(metaKey))[metaKey];
      if(meta?.layout===2)return {metaKey,prefix};
      const legacyKey='nexusTownPlanV1:'+scope;
      const old=(await api.storage.local.get(legacyKey))[legacyKey]||{revision:0,plan:{schema:1,spacingMiles:10,towns:[]},journal:{}};
      const keys=Object.keys(old.journal||{});if(keys.length>2000||keys.some(key=>!validKey(key)))throw Error('Town build history is invalid. No purchase sent.');
      // Verify every copied checkpoint before marking migration ready. Leave V1 as a backup.
      const entries=Object.fromEntries(keys.map(key=>[prefix+key,old.journal[key]]));
      if(keys.length){await api.storage.local.set(entries);const copied=await api.storage.local.get(Object.keys(entries));for(const [key,value] of Object.entries(entries))if(JSON.stringify(copied[key])!==JSON.stringify(value))throw Error('Town build history could not be verified. No purchase sent.');}
      meta={layout:2,revision:old.revision,plan:C.plan(old.plan),journalKeys:keys};await api.storage.local.set({[metaKey]:meta});
      return {metaKey,prefix};
    })();
    ready.set(scope,work);work.catch(()=>ready.delete(scope));return work;
  }
  return (message,sender,reply)=>{
    if(message?.type!=='NEXUS_TOWN_PLAN')return false;
    let origin;try{origin=new URL(sender.url).origin;if(sender.id!==api.runtime.id||!sender.tab||sender.frameId!==0||!['https://www.missionchief.co.uk','https://police.missionchief.co.uk'].includes(origin)||!C.id(message.player))throw Error();}catch{reply({ok:false,error:'Open Home Response towns on the signed-in game map.'});return false;}
    const task=async()=>{
      if(JSON.stringify(message).length>180000)throw Error('Town plan is too large.');
      if(message.action==='regions')return {ok:true,regions:C.regions(await data()).map(({id,name,group,townIds})=>({id,name,group,count:townIds.length}))};
      if(message.action==='find')return {ok:true,plan:C.find(await data(),message.bounds,message.spacingMiles,message.area)};
      const {metaKey,prefix}=await ensure(origin+':'+message.player);
      const state=(await api.storage.local.get(metaKey))[metaKey];if(state?.layout!==2)throw Error('Saved town state is unavailable. Reopen Home Response towns.');
      if(message.action==='read'){
        const result={ok:true,revision:state.revision,...(message.includePlan===false?{}:{plan:state.plan})};
        if(message.includeJournal===false)return result;
        const keys=message.keys??state.journalKeys;
        if(!Array.isArray(keys)||keys.length>(message.keys?500:2000)||keys.some(key=>!validKey(key)))throw Error('Invalid town history request.');
        const values=keys.length?await api.storage.local.get(keys.map(key=>prefix+key)):{};
        result.journal=Object.fromEntries(keys.filter(key=>values[prefix+key]!=null).map(key=>[key,values[prefix+key]]));return result;
      }
      if(message.action==='save'){
        if(message.revision!==state.revision)throw Error('The town list changed in another tab. Reopen Home Response towns to load it.');
        const plan=C.plan(message.plan);
        if(['region','regions'].includes(plan.area?.kind)){
          const filter=C.areaFilter(await data(),plan.area);if(plan.towns.some(t=>!filter.accept(t)))throw Error('A saved town is outside the chosen regions. Find towns again.');plan.area=filter.area;
        }
        state.plan=plan;state.revision++;await api.storage.local.set({[metaKey]:state});return {ok:true,revision:state.revision};
      }
      if(message.action!=='journal')throw Error('Unknown town action.');
      if(!validKey(message.key))throw Error('Invalid town checkpoint.');
      const v=message.value;
      if(v!==null&&(!['building','vehicle','naming','done'].includes(v?.stage)||!v.site||v.site.key!==message.key||JSON.stringify(v).length>100000))throw Error('Invalid build checkpoint.');
      if(v?.stage==='naming'&&(!C.id(v.buildingId)||!C.id(v.vehicleId)||typeof v.caption!=='string'||!v.caption.trim()||v.caption.length>200||typeof v.attempted!=='boolean'||typeof v.token!=='string'||v.token.length>80))throw Error('Invalid vehicle naming checkpoint.');
      const writes={[prefix+message.key]:v};
      if(v!==null&&!state.journalKeys.includes(message.key)){
        if(state.journalKeys.length>=2000)throw Error('Town build history is full. No purchase sent.');
        state.journalKeys.push(message.key);writes[metaKey]=state;
      }else if(v===null&&state.journalKeys.includes(message.key)){state.journalKeys=state.journalKeys.filter(key=>key!==message.key);writes[metaKey]=state;}
      // Existing town progress writes only that town, not every previous town and plan.
      await api.storage.local.set(writes);return {ok:true,revision:state.revision};
    };
    const work=serial.then(task);serial=work.catch(()=>{});work.then(reply,error=>reply({ok:false,error:error.message}));return true;
  };
}
if(typeof chrome!=='undefined')chrome.runtime.onMessage.addListener(createTownHandler(chrome));
