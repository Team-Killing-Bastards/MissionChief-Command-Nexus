const text=(v,n=240)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').slice(0,n);
const id=v=>/^\d{1,18}$/.test(String(v))?String(v):null;
const num=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
export function additional(input){
 const who={player:id(input?.player),username:text(input?.username,128)};
 if(!who.player||!who.username||!Number.isFinite(input.at))return null;
 const r=input.record||{},type=input.kind;let eventType,payload,mission=null,at=input.at,entity;
 if(type==='mission-location'){
  mission=id(r.missionId);if(!mission)return null;entity=mission;eventType='mission-location';
  const lat=num(r.latitude),lon=num(r.longitude),valid=lat!==null&&lon!==null&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
  payload={address:text(r.address),latitude:valid?lat:null,longitude:valid?lon:null,generatorStationId:id(r.generatorStationId),generatorStationName:text(r.generatorStationName),source:'mission-marker'};
  if(!payload.address&&!valid&&!payload.generatorStationId)return null;
 }else if(type==='income'){
  if(!r.transactionId||num(r.actualCredits)===null||num(r.actualCredits)<0||!Number.isFinite(Date.parse(r.transactionAt)))return null;
  eventType='income-transaction';at=Date.parse(r.transactionAt);mission=id(r.missionId);
  payload={transactionId:text(r.transactionId,180),transactionAt:new Date(at).toISOString(),actualCredits:num(r.actualCredits),actualCreditsSource:'credit-ledger',completionVerified:false};entity=payload.transactionId;
 }else if(type==='register'&&['building','vehicle','crew'].includes(r.entityType)){
  entity=id(r.entityId);if(!entity)return null;eventType='register-'+r.entityType;payload={entityId:entity};
  const fields=r.entityType==='building'?['name','typeId','dispatchCentreId','level','personnelCount','latitude','longitude','enabled','specialisation','specialisationActive','specialisationVerifiedAt']:r.entityType==='vehicle'?['name','typeId','stationId','maxCrew','latitude','longitude']:['stationId','assignedPersonnelCount','assignmentScanComplete','trainingProfilesComplete','verifiedAt'];
  for(const k of fields)if(r[k]!==undefined){if(['level','personnelCount','latitude','longitude','maxCrew','assignedPersonnelCount','verifiedAt','specialisationVerifiedAt'].includes(k))payload[k]=num(r[k]);else if(['enabled','specialisationActive','assignmentScanComplete','trainingProfilesComplete'].includes(k))payload[k]=typeof r[k]==='boolean'?r[k]:null;else payload[k]=text(r[k]);}
  if(r.entityType==='building')payload.extensions=Array.isArray(r.extensions)?r.extensions.slice(0,100).map(e=>({typeId:text(e.typeId,40),name:text(e.name),enabled:typeof e.enabled==='boolean'?e.enabled:null,availableAt:text(e.availableAt,80)})):[];
  if(r.entityType==='building'&&r.personnelTraining?.complete===true){
   const roster=r.personnelTraining,counts=Object.create(null),entries=Object.entries(roster.counts||{});
   const valid=Number.isSafeInteger(payload.personnelCount)&&payload.personnelCount>=0&&entries.length<=100&&entries.every(([k,v])=>/^[a-zA-Z0-9_]{1,100}$/.test(k)&&!['__proto__','constructor','prototype'].includes(k)&&Number.isSafeInteger(v)&&v>=0&&v<=payload.personnelCount);
   if(valid)for(const [k,v] of entries)counts[k]=v;
   // Keep explicit zeros for existing ambulance reports, alongside every service's codes.
   for(const k of ['special_operation_response','ems_mobile_command','critical_care'])if(!(k in counts))counts[k]=0;
   if(valid&&typeof roster.verifiedAt==='number'&&Number.isFinite(roster.verifiedAt))payload.personnelTraining={complete:true,verifiedAt:roster.verifiedAt,counts};
  }
  if(r.entityType==='crew'){
payload.trainingCounts=Object.create(null);for(const[k,v]of Object.entries(r.trainingCounts||{}).slice(0,100))if(/^[\w -]{1,100}$/.test(k)&&!['__proto__','constructor','prototype'].includes(k)&&num(v)!==null&&num(v)>=0)payload.trainingCounts[k]=num(v);}
 }else if(type==='register-snapshot'&&['building','vehicle'].includes(r.entityType)){
  if(!Array.isArray(r.ids)||r.ids.length>15000||r.ids.some(v=>!id(v)))return null;
  eventType='register-snapshot';entity=r.entityType;payload={entityType:r.entityType,ids:[...new Set(r.ids.map(id))].sort(),complete:true,verifiedAt:input.at};
 }else if(type==='capture-health'){
  eventType='capture-health';entity=text(r.area,40);payload={area:entity,state:text(r.state,40),message:text(r.message,400),page:num(r.page),oldestTransactionAt:text(r.oldestTransactionAt,80),checkedAt:input.at};
 }else return null;
 if(!Number.isFinite(new Date(at).getTime()))return null;
 const seenKey=JSON.stringify([who.player,eventType,entity]),fingerprint=type==='income'?seenKey:JSON.stringify(payload);
 return {who,event:{event_type:eventType,occurred_at:new Date(at).toISOString(),mission_id:mission,mission_name:['income','mission-location'].includes(type)?text(r.missionName):'',payload},seenKey,fingerprint,idKey:type==='income'?seenKey:null};
}
