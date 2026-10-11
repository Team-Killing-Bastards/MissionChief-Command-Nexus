import {CollectorClient} from './collector-client.mjs';
const client=new CollectorClient();
let draining=false,scheduled=null;
const captureStates=new Map();
function schedule(){if(scheduled)return;scheduled=setTimeout(()=>{scheduled=null;void drain();},1000);}
async function drain(force=false){if(draining)return;draining=true;try{const started=Date.now();let sent=0;while(sent<100&&Date.now()-started<20000){if(!await client.upload(force&&sent===0))return;sent++;await new Promise(resolve=>setTimeout(resolve,100));}schedule();}catch{}finally{draining=false;}}
function game(sender){try{return sender.frameId===0&&!!sender.tab&&['https://www.missionchief.co.uk','https://police.missionchief.co.uk'].includes(new URL(sender.url).origin);}catch{return false;}}
function admin(sender){return sender.url===chrome.runtime.getURL('collector.html');}
chrome.runtime.onMessage.addListener((m,s,reply)=>{
 if(!m?.type?.startsWith('NEXUS_COLLECTOR_'))return false;
 const action=async()=>{
  if(game(s)){
   if(m.type==='NEXUS_COLLECTOR_CAPTURE'){
    if(!Array.isArray(m.events)||m.events.length>30||JSON.stringify(m.events).length>500000)throw Error('Capture batch exceeded limits');
    const added=await client.store.capture(m.events);if(added)schedule();return {ok:true,added};
   }
   if(m.type==='NEXUS_COLLECTOR_IDENTITY'){await client.identify(m.identity);schedule();return {ok:true};}
   if(m.type==='NEXUS_COLLECTOR_SETTINGS_GAME'&&m.enabled===false){await client.store.update({enabled:false});return {ok:true};}
   if(m.type==='NEXUS_COLLECTOR_GAP'){await client.store.update({captureWarning:'Recording paused temporarily because local storage could not keep up. Some observations may be missing.'});return {ok:true};}
   if(m.type==='NEXUS_COLLECTOR_CAPTURE_STATE'){
    const now=Date.now();for(const [id,v] of captureStates)if(now-v.at>60000)captureStates.delete(id);
    if(captureStates.size<100||captureStates.has(s.tab.id))captureStates.set(s.tab.id,{at:now,paused:m.paused===true,saveError:m.saveError===true,queued:Math.max(0,Math.min(100000,Number(m.queued)||0))});
    return {ok:true};
   }
   if(m.type==='NEXUS_COLLECTOR_HEALTH'){const h=await client.status();return {ok:true,pending:h.pending,paired:h.paired,lastError:h.lastError,enabled:h.enabled,lastSuccess:h.lastSuccess,uploading:h.uploading,uploadError:h.uploadError,captureWarning:h.captureWarning,captureState:Date.now()-(captureStates.get(s.tab.id)?.at||0)<60000?captureStates.get(s.tab.id):null};}
   if(m.type==='NEXUS_COLLECTOR_OPEN'){await chrome.tabs.create({url:chrome.runtime.getURL('collector.html')});return {ok:true};}
  }
  if(!admin(s))return {ok:false,error:'Collector action unavailable'};
  if(m.type==='NEXUS_COLLECTOR_STATUS')return {ok:true,...await client.status()};
  if(m.type==='NEXUS_COLLECTOR_IMPORT_DEVICE'){await client.importDevice(m.device);void drain();return {ok:true};}
  if(m.type==='NEXUS_COLLECTOR_PAIR'){await client.pair(m.code,m.label);void drain();return {ok:true};}
  if(m.type==='NEXUS_COLLECTOR_RETRY'){void drain(true);return {ok:true};}
  if(m.type==='NEXUS_COLLECTOR_SETTINGS'){await client.store.update({enabled:m.enabled===true});schedule();return {ok:true};}
  if(m.type==='NEXUS_COLLECTOR_LABEL'){await client.store.update({deviceLabel:String(m.label||'').trim().slice(0,128)||'Nexus private browser'});return {ok:true};}
  if(m.type==='NEXUS_COLLECTOR_EXPORT')return {ok:true,events:await client.store.export()};
  return {ok:false};
 };
 action().then(reply,e=>reply({ok:false,error:admin(s)&&/^(Device import:|Pairing code rejected\.|Collector HTTP \d{3}$|Collector is busy\.|Collector timed out;|Open MissionChief first|Enter your private pairing code$|Pairing response was incomplete$|Pairing failed; check your connection$)/.test(e?.message||'')?e.message:'Collector action failed. Check pairing code, connection and local storage.'}));return true;
});
async function init(){await chrome.alarms.clear('nexus-analytics');await chrome.alarms.create('nexus-private-collector',{periodInMinutes:1});}
chrome.alarms.onAlarm.addListener(a=>{if(a.name==='nexus-private-collector')void drain();});
chrome.runtime.onStartup.addListener(()=>{void init().then(()=>drain()).catch(()=>{});});
chrome.runtime.onInstalled.addListener(()=>{void init().catch(()=>{});});
void init().catch(()=>{});
