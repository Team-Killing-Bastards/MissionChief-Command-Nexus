/* Only bounded upgrade checkpoints, scoped to the sender's game origin. */
export function createUpgradeAuditHandler(api){return(message,sender,reply)=>{
 if(!['NEXUS_UPGRADE_AUDIT_GET','NEXUS_UPGRADE_AUDIT_SAVE'].includes(message?.type))return false;
 try{
  const origin=new URL(sender.url).origin;
  if(sender.id!==api.runtime.id||sender.frameId!==0||!sender.tab||!['https://www.missionchief.co.uk','https://police.missionchief.co.uk'].includes(origin))return false;
  if(!/^\d{1,20}$/.test(message.player||''))throw Error('Player identity unavailable');
  const key='nexusBuildingUpgradeAuditV1:'+origin+':'+message.player;
  if(message.type==='NEXUS_UPGRADE_AUDIT_GET'){api.storage.local.get(key).then(data=>reply({ok:true,value:data[key]||null}),()=>reply({ok:false,error:'Upgrade checkpoint could not be read'}));return true;}
  const v=message.value;
  if(!v||!Array.isArray(v.entries)||v.entries.length>20000||JSON.stringify(v).length>3000000||v.entries.some(e=>!/^\d+$/.test(e.id)||!['pending','verified','uncertain'].includes(e.state)||!['level','extension','specialization'].includes(e.kind)||!Number.isSafeInteger(e.cost)||e.cost<0||typeof e.name!=='string'||e.name.length>200||typeof e.path!=='string'||e.path.length>300))throw Error('Invalid upgrade checkpoint');
  api.storage.local.set({[key]:v}).then(()=>reply({ok:true}),()=>reply({ok:false,error:'Upgrade checkpoint could not be saved'}));return true;
 }catch(e){reply({ok:false,error:e.message});return false;}
};}
if(globalThis.chrome?.runtime?.onMessage)chrome.runtime.onMessage.addListener(createUpgradeAuditHandler(chrome));
