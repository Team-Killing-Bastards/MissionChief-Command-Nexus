import {CHANGELOG_URL, notesSince, compareVersions} from './nexus-update-notes-data.mjs';

// Deliberately not part of account preferences or the game origin's localStorage.
const KEY='nexusUpdateNoticeV1', CLAIM='nexusUpdateNoticeClaimV1';
const version=chrome.runtime.getManifest().version;
let queue=Promise.resolve();
const serial=task=>{const next=queue.then(task);queue=next.catch(()=>{});return next;};
const read=async()=>(await chrome.storage.local.get(KEY))[KEY]||{};
const validSender=sender=>{
  try { return sender.frameId===0 && Number.isInteger(sender.tab?.id) &&
    ['https://www.missionchief.co.uk','https://police.missionchief.co.uk'].includes(new URL(sender.url).origin); }
  catch {return false;}
};

chrome.runtime.onInstalled.addListener(details=>{
  if(!['install','update'].includes(details.reason))return;
  void serial(async()=>{
    const saved=await read();
    if(details.reason==='install') {
      await chrome.storage.local.set({[KEY]:{seen:version}});
    } else if(compareVersions(version,details.previousVersion)>0 && compareVersions(saved.seen,version)<0) {
      // Preserve the earliest unseen version when several updates happen unopened.
      await chrome.storage.local.set({[KEY]:{seen:saved.seen||details.previousVersion||'0',pending:version}});
    }
    await chrome.storage.session.remove(CLAIM);
  }).catch(()=>{});
});

chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(!['NEXUS_UPDATES_CLAIM','NEXUS_UPDATES_SHOWN','NEXUS_UPDATES_RELEASE','NEXUS_UPDATES_READ'].includes(message?.type)||!validSender(sender))return false;
  void serial(async()=>{
    if(message.type==='NEXUS_UPDATES_READ')return {ok:true,version,changelog:CHANGELOG_URL,notes:notesSince(null,version)};
    const saved=await read();
    const claim=(await chrome.storage.session.get(CLAIM))[CLAIM];
    const owns=claim?.tab===sender.tab.id && claim?.document===sender.documentId && claim?.token===message.token && claim?.version===version;
    if(message.type==='NEXUS_UPDATES_RELEASE') {
      if(owns)await chrome.storage.session.remove(CLAIM);
      return {ok:true};
    }
    if(message.type==='NEXUS_UPDATES_SHOWN') {
      if(!owns)return {ok:false};
      await chrome.storage.local.set({[KEY]:{seen:version}});
      await chrome.storage.session.remove(CLAIM);
      return {ok:true};
    }
    if(!saved.pending || compareVersions(saved.seen,version)>=0 || saved.pending!==version)return {ok:true,show:false};
    if(claim?.until>Date.now())return {ok:true,show:false,retry:true};
    const token=crypto.randomUUID();
    await chrome.storage.session.set({[CLAIM]:{token,tab:sender.tab.id,document:sender.documentId,version,until:Date.now()+15000}});
    return {ok:true,show:true,token,version,from:saved.seen,changelog:CHANGELOG_URL,notes:notesSince(saved.seen,version)};
  }).then(reply,()=>reply({ok:false}));
  return true;
});
