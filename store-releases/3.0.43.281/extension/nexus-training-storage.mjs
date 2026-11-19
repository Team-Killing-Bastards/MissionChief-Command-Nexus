/* Training checkpoints only; general extension storage remains private. */
const TYPES=new Set(['NEXUS_TRAINING_GET','NEXUS_TRAINING_SAVE']);
const validId=v=>typeof v==='string'&&/^[1-9]\d{0,19}$/.test(v);
const bounded=(v,n)=>typeof v==='string'&&v.length>0&&v.length<=n;
const count=v=>Number.isSafeInteger(v)&&v>=0&&v<=10000000;
export function validateTrainingCheckpoint(v,origin,player){
 if(!v||JSON.stringify(v).length>100000||v.version!==1||v.origin!==origin||v.player!==player||!bounded(v.runId,64)||!Number.isSafeInteger(v.at)||v.at<=0||!count(v.confirmedCourses)||!count(v.confirmedPeople))throw Error('Invalid training progress');
 if(v.pending!==null){const p=v.pending;if(!p||!validId(p.academyId)||!bounded(p.name,300)||!Number.isSafeInteger(p.at)||p.at<=0||!p.course||!bounded(p.course.key,100)||!bounded(p.course.label,200)||!/^[a-z0-9_]{1,100}$/.test(p.course.key)||!Array.isArray(p.people)||!p.people.length||p.people.length>1000||p.people.some(x=>!validId(x.id)||!validId(x.stationId))||new Set(p.people.map(x=>x.id)).size!==p.people.length)throw Error('Invalid pending training course');}
 // Round-trip the small record only; no caller-supplied storage keys are used.
 const pending=v.pending===null?null:{academyId:v.pending.academyId,name:v.pending.name,course:{key:v.pending.course.key,label:v.pending.course.label},people:v.pending.people.map(p=>({id:p.id,stationId:p.stationId})),at:v.pending.at};
 return {version:1,origin,player,runId:v.runId,at:v.at,confirmedPeople:v.confirmedPeople,confirmedCourses:v.confirmedCourses,pending};
}
export function createTrainingStorageHandler(api){let serial=Promise.resolve();return(message,sender,reply)=>{
 if(!TYPES.has(message?.type))return false;
 let origin;try{origin=new URL(sender.url).origin;if(sender.id!==api.runtime.id||sender.frameId!==0||!sender.tab||!['https://www.missionchief.co.uk','https://police.missionchief.co.uk'].includes(origin))return false;}catch{return false;}
 if(!validId(message.player)){reply({ok:false,error:'Training player identity is unavailable.'});return false;}
 const key='nexusTrainingBatchV1:'+origin+':'+message.player;
 const task=async()=>{
  if(message.type==='NEXUS_TRAINING_GET'){const value=(await api.storage.local.get(key))[key];return {ok:true,value:value?validateTrainingCheckpoint(value,origin,message.player):null};}
  const value=validateTrainingCheckpoint(message.value,origin,message.player);await api.storage.local.set({[key]:value});return {ok:true};
 };
 const work=serial.then(task);serial=work.catch(()=>{});work.then(reply,()=>reply({ok:false,error:'Training progress could not be read or saved. No further course will be sent.'}));return true;
};}
if(globalThis.chrome?.runtime?.onMessage)chrome.runtime.onMessage.addListener(createTrainingStorageHandler(chrome));
