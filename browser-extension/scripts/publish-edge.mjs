import fs from 'node:fs';
import crypto from 'node:crypto';
import {edgeClient} from './edge-api.mjs';
const env=process.env;
if(env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_EVENT_NAME==='pull_request') throw Error('Publishing is restricted to trusted main');
for(const key of ['EDGE_API_KEY','EDGE_CLIENT_ID','GITHUB_TOKEN','GITHUB_REPOSITORY','GITHUB_SHA']) if(!env[key]) throw Error(`Required GitHub secret/environment value missing: ${key}`);
const manifest=JSON.parse(fs.readFileSync('extension/manifest.json'));
const version=manifest.version, tag=`edge-v${version}`;
if(!/^\d+\.\d+\.\d+\.\d+$/.test(version))throw Error('Invalid release version');
const artifact=`Nexus-Extension-${version}.zip`, bytes=fs.readFileSync('release/'+artifact);
const hash=crypto.createHash('sha256').update(bytes).digest('hex');
if(hash!==JSON.parse(fs.readFileSync('audit/package.json')).sha256)throw Error('Verified ZIP changed');
const root=`https://api.github.com/repos/${env.GITHUB_REPOSITORY}`;
async function gh(path,method='GET',body) {
 const response=await fetch(root+path,{method,headers:{Authorization:`Bearer ${env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
 if(response.status===404&&method==='GET')return null;
 if(!response.ok)throw Error(`GitHub release request failed: HTTP ${response.status}`);
 return response.json();
}
let release=await gh('/releases/tags/'+tag);
if(!release) {
 // GitHub may expose an unpublished draft under an untagged placeholder.
 const drafts=(await gh('/releases?per_page=100')).filter(r=>r.draft&&r.name===`Edge ${version}`);
 if(drafts.length>1)throw Error('Multiple matching release drafts require inspection');
 release=drafts[0]||null;
}
let state=release?JSON.parse(release.body):{version,sha256:hash,commit:env.GITHUB_SHA,status:'prepared'};
if(state.sha256!==hash)throw Error('This extension version already has different release bytes. Increase the manifest version.');
if(state.status==='submitted') {
 if(release.draft)await gh('/releases/'+release.id,'PATCH',{tag_name:tag,target_commitish:state.commit,draft:false,make_latest:'false'});
 console.log(`${tag} already submitted; no duplicate upload.`);process.exit(0);
}
if(!release)release=await gh('/releases','POST',{tag_name:tag,target_commitish:env.GITHUB_SHA,name:`Edge ${version}`,draft:true,body:JSON.stringify(state,null,2)});
async function checkpoint(next) {
 state={...next};await gh('/releases/'+release.id,'PATCH',{body:JSON.stringify(state,null,2)});
 fs.writeFileSync('audit/edge-submission.json',JSON.stringify(state,null,2)+'\n');
}
if(!release.assets.some(a=>a.name===artifact)) {
 const target=new URL(release.upload_url.split('{')[0]);
 if(target.origin!=='https://uploads.github.com')throw Error('Unexpected GitHub asset endpoint');
 target.searchParams.set('name',artifact);
 const result=await fetch(target,{method:'POST',headers:{Authorization:`Bearer ${env.GITHUB_TOKEN}`,'Content-Type':'application/zip'},body:bytes,redirect:'error',signal:AbortSignal.timeout(90000)});
 if(!result.ok)throw Error(`GitHub package upload failed: HTTP ${result.status}`);
}
await edgeClient({key:env.EDGE_API_KEY,clientId:env.EDGE_CLIENT_ID,productId:'a6093637-b629-412b-801c-f56498a87d22',checkpoint}).submit(bytes,`MissionChief Command Nexus ${version}. Built and verified from ${env.GITHUB_SHA}. Same purpose and permissions; optional sharing remains opt-in.`,state);
state.status='submitted';await checkpoint(state);
await gh('/releases/'+release.id,'PATCH',{tag_name:tag,target_commitish:state.commit,draft:false,make_latest:'false'});
const message=`Edge ${version} submitted to Microsoft for review. Submission is not proof of store approval. ZIP SHA-256: ${hash}`;
console.log(message);
if(env.GITHUB_STEP_SUMMARY)fs.appendFileSync(env.GITHUB_STEP_SUMMARY,message+'\n');
