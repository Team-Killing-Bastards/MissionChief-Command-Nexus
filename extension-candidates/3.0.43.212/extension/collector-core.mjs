import {additional} from './collector-capture.mjs';
import {cleanRecord} from './analytics-record.mjs';
export const COLLECTOR_URL='https://nexus.blyth.scot';
export const BATCH_LIMIT=50;
const trim=(v,n=240)=>typeof v==='string'?v.replace(/[\u0000-\u001f]/g,' ').slice(0,n):'';
export function identityOf(value){
 const player=String(value?.player||'');const username=trim(value?.username,128).trim();
 return /^\d{1,128}$/.test(player)&&username?{player,username}:null;
}
export function meaningful(input){
 const extra=additional(input);if(extra)return extra;
 const who=identityOf(input);if(!who||!Number.isFinite(input.at)||input.at<0)return null;
 const at=new Date(input.at);if(!Number.isFinite(at.getTime()))return null;
 let record,type;const mission=String(input.missionId||input.record?.missionId||'');
 if(input.kind==='mission'){
  record=cleanRecord(input.record);type=record?.eventType;
  if(!['mission-observed','mission-update','dispatch','dispatch-confirmed','unit-dispatch-confirmed','mission-completed','mission-disappeared','mission-credit','transport'].includes(type))return null;
  if(type==='dispatch')type='dispatch-attempt';
  if(type==='mission-credit'&&(!Number.isFinite(record.actualCredits)||!record.actualCreditsSource))return null;
 }else if(['status','lifecycle','recovery-attempt','recovery-result'].includes(input.kind)){
  const reason=trim(input.reason,600),phase=trim(input.phase,120),category=trim(input.category,120);
  if(/Worker lifecycle:|temporarily rotated mission|watchdog started before queue skip|failure persisted through watchdog/i.test(reason)||/RECOVERY|beforeunload|pagehide/i.test(phase))return null;
  if(phase==='MISSION_SKIPPED')type='mission-skipped';
  else if(/SHORTAGE|BLOCKED|FAILED/i.test(category+' '+phase))type='mission-blocked';else return null;
  const normalized=reason.split(' | ')[0].replace(/^(?:AUTO STOPPED:\s*|Auto stopped:\s*)+/i,'').replace(/\s*Dispatch was not clicked\.?$/i,'').trim();
  record={reason:normalized,phase,category,outcome:trim(input.outcome,120)};
  for(const key of ['selected','remaining'])if(Number.isFinite(input[key]))record[key]=input[key];
 }else return null;
 if(!/^\d+$/.test(mission))return null;
 const payload={};
 // Only explicit gameplay fields; never copy arbitrary objects, headers or inputs.
 for(const key of ['missionDefinitionId','ownership','generatorStationId','generatorStationName','dispatchMode','source','category','phase','reason','outcome','vehicleId','patientId','transactionId','correlationId','completionSource','actualCreditsSource','advertisedCredits','actualCredits','patientCount','prisonerCount','transportCount','durationMs','firstObservedAt','firstUnitSentAt','completedAt','transactionAt','completionVerified','dispatchConfirmed','requirements','units','selected','remaining','clientVersion'])if(record[key]!==undefined)payload[key]=record[key];
 // Missing credits remain missing/null; dispatch click is not server acceptance.
 if(type==='dispatch-attempt')payload.dispatchConfirmed=false;
 const name=trim(input.missionName||record.missionName,240);
 const event={event_type:type,occurred_at:at.toISOString(),mission_id:mission,mission_name:name,payload};
 if(JSON.stringify(event).length>100000)return null;
 const stateType=['mission-observed','mission-update','mission-skipped','mission-blocked','mission-completed','mission-disappeared'].includes(type);
 const statePayload=Object.fromEntries(Object.entries(payload).filter(([k])=>!['clientVersion','source','firstObservedAt','firstUnitSentAt','durationMs'].includes(k)));
 if(Array.isArray(statePayload.requirements))statePayload.requirements=[...statePayload.requirements].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 const fingerprint=JSON.stringify(type==='mission-observed'?[who.player,mission,type]:type==='mission-completed'?[who.player,mission,type,payload.completionVerified]:[who.player,mission,type,statePayload]);
 // State checks dedupe across reloads. Transaction IDs and dispatch event keys
 // provide retry-stable identities for discrete actions.
 const actionKey=type==='mission-credit'?String(record.transactionId||fingerprint):trim(input.eventKey,12000)||JSON.stringify([input.at,fingerprint]);
 return {who,event,seenKey:JSON.stringify([who.player,mission,type,stateType?'state':actionKey]),fingerprint:stateType?fingerprint:actionKey};
}
export function backoff(attempt,retryAfter='',now=Date.now(),random=Math.random){
 const seconds=Number(retryAfter),server=retryAfter?(Number.isFinite(seconds)?seconds*1000:Date.parse(retryAfter)-now):0;
 return now+Math.max(Math.min(3600000,15000*2**Math.min(attempt,8))*(.8+random()*.4),Number.isFinite(server)?server:0);
}
export function confirmedBatch(reply,count){
 // Filled from the collector's documented acknowledgement contract. Unknown
 // responses are never treated as an acknowledgement.
 return Number.isInteger(reply?.accepted)&&Number.isInteger(reply?.duplicates)&&reply.accepted>=0&&reply.duplicates>=0&&reply.accepted+reply.duplicates===count;
}
