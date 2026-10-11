import {automaticRegistration} from './collector-auto-register.mjs';
import {CollectorStore} from './collector-store.mjs';
import {COLLECTOR_URL, confirmedBatch, backoff, identityOf} from './collector-core.mjs';
export class CollectorClient {
 constructor(store=new CollectorStore(), request=globalThis.fetch.bind(globalThis)){this.store=store;this.request=request;this.busy=false;this.pairing=false;}
 async http(path,body,token){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await this.request(COLLECTOR_URL+path,{method:body?'POST':'GET',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});
   if(!response.ok){const e=Error('Collector HTTP '+response.status);e.status=response.status;e.retryAfter=response.headers.get('Retry-After');throw e;}
   const text=await response.text();if(text.length>4000)throw Error('Collector response too large');
   try{return JSON.parse(text);}catch{throw Error('Collector response was not valid JSON');}
  }catch(e){if(e.name==='AbortError')throw Error('Collector timed out; events remain saved');throw e;}finally{clearTimeout(timer);}
 }
 async identify(raw){const who=identityOf(raw);if(who)await this.store.update({identity:who});}
 async pair(code,label){
  code=typeof code==='string'?code.trim():code;
  if(this.pairing||this.busy)throw Error('Collector is busy; try again shortly');
  if(typeof code!=='string'||code.length<8||code.length>256)throw Error('Enter your private pairing code');
  this.pairing=true;
  try{
   const m=await this.store.meta();if(!m.identity)throw Error('Open MissionChief first so Nexus can read your player identity');
   const deviceLabel=String(label||m.deviceLabel).trim().slice(0,128)||'Nexus private browser';
   const r=await this.http('/v1/pair',{pairing_code:code,game_player_id:m.identity.player,username:m.identity.username,device_label:deviceLabel});
   if(typeof r.device_token!=='string'||r.device_token.length<16||r.device_token.length>256||typeof r.device_id!=='string')throw Error('Pairing response was incomplete');
   await this.store.update({token:r.device_token,deviceId:r.device_id,pairedPlayer:m.identity.player,deviceLabel,needsPair:false,lastError:'',attempts:0,nextAttempt:0});
  }catch(e){const message=e.status===401?'Pairing code rejected. Use the private bootstrap pairing code, not the reporting key.':e.status===429?'Collector is busy. Wait before pairing again.':/^(Collector |Pairing |Open MissionChief)/.test(e.message)?e.message:'Pairing failed; check your connection';await this.store.update({lastError:message});throw Error(message);}finally{this.pairing=false;}
 }
 async importDevice(d){
  if(this.busy||this.pairing)throw Error('Device import: wait for the current upload to finish.');
  if(d?.schema!==1||d.collector_url!==COLLECTOR_URL||!/^\d{1,18}$/.test(String(d.player))||typeof d.device_token!=='string'||d.device_token.length<16||d.device_token.length>256||typeof d.device_id!=='string'||d.device_id.length>128||!d.device_id)throw Error('Device import: invalid setup file.');
  this.pairing=true;try{const m=await this.store.meta();if(m.identity?.player!==String(d.player))throw Error('Device import: open MissionChief using the account this file belongs to first.');
   await this.store.update({token:d.device_token,deviceId:d.device_id,pairedPlayer:String(d.player),deviceLabel:String(d.device_label||'Laptop').slice(0,128),needsPair:false,lastError:'',attempts:0,nextAttempt:0});
  }finally{this.pairing=false;}
 }
 async upload(force=false){
  if(this.busy||this.pairing)return false;this.busy=true;
  try{
   let m=await this.store.meta();
   if(!m.enabled||!m.identity||(!force&&m.nextAttempt>Date.now()))return false;
   m=await automaticRegistration(this,m);
   if(!m.enabled||!m.token||m.needsPair||m.pairedPlayer!==m.identity?.player)return false;
   const batch=await this.store.batch(m.pairedPlayer,50);if(!batch.length)return false;
   const r=await this.http('/v1/events',{events:batch.map(({event_id,event_type,occurred_at,mission_id,mission_name,payload})=>({event_id,event_type,occurred_at,mission_id,mission_name,payload}))},m.token);
   if(!confirmedBatch(r,batch.length))throw Error('Collector did not confirm the complete batch; events remain saved');
   await this.store.ack(batch.map(x=>x.event_id));return true;
  }catch(e){
   const m=await this.store.meta(),attempts=(m.attempts||0)+1;
   // Never store provider bodies, request headers or arbitrary network errors.
   const lastError=/^(Collector |Pairing )/.test(e.message)?e.message:'Collector connection failed; events remain saved';
   await this.store.update({attempts,nextAttempt:backoff(attempts,e.retryAfter),lastError,needsPair:e.status===401||e.status===403||m.needsPair||false});return false;
  }finally{this.busy=false;}
 }
 async status(){const m=await this.store.meta();return {url:COLLECTOR_URL,enabled:m.enabled,identity:m.identity||null,deviceLabel:m.deviceLabel,paired:!!m.token&&!m.needsPair&&m.pairedPlayer===m.identity?.player,pairingState:m.needsPair?'Pair again':!m.identity?'Waiting for MissionChief':m.token&&m.pairedPlayer!==m.identity.player?'Different player: pair this account':m.token?'Paired':'Automatic registration pending',...(await this.store.stats()),lastSuccess:m.lastSuccess||0,uploadError:m.lastError||'',captureWarning:m.captureWarning||'',lastError:[m.lastError,m.captureWarning].filter(Boolean).join(' '),nextAttempt:m.nextAttempt||0,uploading:this.busy};}
}
