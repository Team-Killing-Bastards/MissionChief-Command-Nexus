import {COLLECTOR_URL} from './collector-core.mjs';
const KEY='nexusDiscordAccountV1';let signing=false;
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const state=async()=>((await chrome.storage.local.get(KEY))[KEY]||{});
async function http(path,body,token){
 const response=await fetch(COLLECTOR_URL+path,{method:body?'POST':'GET',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok)throw Error(path.startsWith('/v1/account/discord/check?')&&response.status===400?'Nexus sign-in does not recognise this extension installation. Install the current fixed-ID Nexus release; a ZIP loaded without its public key gets a different ID on each PC.':response.status===401?'Sign in to Nexus with Discord':response.status===404||response.status===503?'The VPS account-sync update is not installed or configured yet':'Nexus sync returned HTTP '+response.status);
 const reader=response.body.getReader(),decoder=new TextDecoder();let text='',size=0;
 try{while(true){const v=await reader.read();if(v.done)break;size+=v.value.byteLength;if(size>4000000)throw Error('Nexus sync response exceeded its limit');text+=decoder.decode(v.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
 return JSON.parse(text);
}
const game=s=>{try{return s.id===chrome.runtime.id&&s.frameId===0&&!!s.tab&&['https://www.missionchief.co.uk','https://police.missionchief.co.uk'].includes(new URL(s.url).origin);}catch{return false;}};
const admin=s=>s.id===chrome.runtime.id&&s.url===chrome.runtime.getURL('account.html');
chrome.runtime.onMessage.addListener((m,s,reply)=>{
 if(!m?.type?.startsWith('NEXUS_ACCOUNT_'))return false;
 const action=async()=>{
  if(!game(s)&&!admin(s))throw Error('Account action unavailable');
  if(m.type==='NEXUS_ACCOUNT_OPEN'&&game(s)){await chrome.tabs.create({url:chrome.runtime.getURL('account.html')});return {ok:true};}
  if(m.type==='NEXUS_ACCOUNT_STATUS'){const a=await state();return {ok:true,signedIn:!!a.token&&a.expires*1000>Date.now(),discordId:a.discordId||'',username:a.username||'',enabled:a.enabled!==false,lastSync:a.lastSync||0,lastError:a.lastError||'',redirect:admin(s)?chrome.identity.getRedirectURL('discord'):undefined};}
  if(m.type==='NEXUS_ACCOUNT_LOGIN'&&admin(s)){
   if(signing)throw Error('Discord sign-in is already open');signing=true;
   try{
    const verifier=b64(crypto.getRandomValues(new Uint8Array(48))),challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)))),redirect=chrome.identity.getRedirectURL('discord');
    // Diagnose rejected installations before Chrome hides the HTTP error inside
    // "Authorization page could not be loaded". This check creates no login flow.
    try{await http('/v1/account/discord/check?'+new URLSearchParams({redirect}));}catch(e){
     if(/^(Nexus |Sign in |The VPS )/.test(e?.message||''))throw e;
     throw Error('Nexus sign-in service could not be reached. Check your connection and try again.');
    }
    let returned;
    try{returned=await chrome.identity.launchWebAuthFlow({url:COLLECTOR_URL+'/v1/account/discord/start?'+new URLSearchParams({redirect,challenge}),interactive:true});}
    catch(e){throw Error(/cancel|closed|did not approve/i.test(e?.message||'')?'Discord sign-in was cancelled. Click Sign in with Discord to try again.':'Discord sign-in could not open or finish in this browser. Check that Discord opens normally, then try again.');}
    const url=new URL(returned);if(url.origin+url.pathname!==redirect)throw Error('Unexpected Discord sign-in redirect');
    const code=new URLSearchParams(url.hash.slice(1)).get('code');if(!code)throw Error('Discord sign-in was cancelled');
    const result=await http('/v1/account/exchange',{code,verifier});
    if(!/^\d{1,32}$/.test(result.discordId)||typeof result.token!=='string'||result.token.length<32||!Number.isFinite(result.expires))throw Error('Nexus sign-in response was incomplete');
    await chrome.storage.local.set({[KEY]:{...result,enabled:true,lastSync:0,lastError:''}});return {ok:true};
   }finally{signing=false;}
  }
  if(m.type==='NEXUS_ACCOUNT_LOGOUT'&&(admin(s)||game(s))){const a=await state();await chrome.storage.local.remove(KEY);if(a.token)try{await http('/v1/account/logout',{},a.token);}catch{}return {ok:true};}
  if(m.type==='NEXUS_ACCOUNT_ENABLED'&&admin(s)){const a=await state();await chrome.storage.local.set({[KEY]:{...a,enabled:m.enabled===true}});return {ok:true};}
  if(m.type==='NEXUS_ACCOUNT_PREFS_GET'&&game(s)){
   const key='nexusNativeToolsV1:'+new URL(s.url).hostname,v=await chrome.storage.local.get([key,'nexusRequirementRulesV1']);return {ok:true,values:{tools:v[key]??null,rules:v.nexusRequirementRulesV1??null}};
  }
  if(m.type==='NEXUS_ACCOUNT_PREFS_SET'&&game(s)){
   const a=await state();if(!a.token||a.enabled===false)throw Error('Sign in before restoring cloud settings');
   const value=m.value;if(JSON.stringify(value).length>1000000)throw Error('Settings are too large');
   if(m.key==='rules'){
    const {validateRules}=await import('./rules-core.mjs');const valid=validateRules(value||{schema:1,rules:[]});await chrome.storage.local.set({nexusRequirementRulesV1:valid});
   }else if(m.key==='tools'){
    const {cleanToolPreferences}=await import('./nexus-tools-storage.mjs');const valid=cleanToolPreferences(value);if(value!==null&&!valid)throw Error('Tool preferences are invalid');
    await chrome.storage.local.set({['nexusNativeToolsV1:'+new URL(s.url).hostname]:valid});
   }else throw Error('Setting not supported');return {ok:true};
  }
  if(m.type==='NEXUS_ACCOUNT_SYNC'&&game(s)){
   const a=await state();if(!a.token||a.expires*1000<=Date.now())throw Error('Sign in to Nexus with Discord');if(a.enabled===false)throw Error('Cloud sync is paused');
   const body=m.body;if(body?.realm!==new URL(s.url).hostname||!/^\d{1,18}$/.test(String(body.player))||!Array.isArray(body.rows)||body.rows.length>100||JSON.stringify(body).length>1800000)throw Error('Sync request is invalid');
   try{const response=await http('/v1/account/sync',body,a.token);const latest=await state();if(latest.token!==a.token||latest.enabled===false)throw Error('Nexus account changed during sync');
    await chrome.storage.local.set({[KEY]:{...latest,lastSync:Date.now(),lastError:''}});return {ok:true,data:response};
   }catch(e){const latest=await state();if(latest.token===a.token)await chrome.storage.local.set({[KEY]:{...latest,lastError:e.message}});throw e;}
  }
  throw Error('Account action unavailable');
 };
 action().then(reply,e=>reply({ok:false,error:/^(Nexus |Sign in |Cloud sync|The VPS |Discord |Unexpected Discord|Tool preferences|Settings |Setting |Account )/.test(e?.message||'')?e.message:'Account operation failed; check the connection and try again'}));return true;
});
