import fs from 'node:fs';
import crypto from 'node:crypto';
import {serviceToken,chromeClient,decide,itemId} from './chrome-api.mjs';
const env=process.env;
if(env.GITHUB_REF!=='refs/heads/main'||env.GITHUB_EVENT_NAME==='pull_request')throw Error('Chrome publishing is restricted to trusted main');
for(const key of ['CHROME_SERVICE_ACCOUNT_JSON','GITHUB_TOKEN','GITHUB_REPOSITORY','GITHUB_SHA'])if(!env[key])throw Error(`Missing ${key}`);
const token=await serviceToken(JSON.parse(env.CHROME_SERVICE_ACCOUNT_JSON));
const client=chromeClient(token);
if(process.argv.includes('--check')) {
  const status=await client.status();
  if(status.itemId!==itemId)throw Error('Unexpected Chrome listing');
  console.log(JSON.stringify({itemId,published:status.publishedItemRevisionStatus,submitted:status.submittedItemRevisionStatus},null,2));
  process.exit(0);
}
const version=JSON.parse(fs.readFileSync('extension/manifest.json')).version;
const bytes=fs.readFileSync(`release/Nexus-Extension-${version}.zip`);
const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
if(sha256!==JSON.parse(fs.readFileSync('audit/package.json')).sha256)throw Error('Verified Chrome ZIP changed');
if(JSON.parse(fs.readFileSync('audit/verification-summary.json')).some(x=>!x.passed))throw Error('Build verification failed');
const root=`https://api.github.com/repos/${env.GITHUB_REPOSITORY}`;
async function gh(path,method='GET',body) {
  const response=await fetch(root+path,{method,headers:{Authorization:`Bearer ${env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(60000)});
  if(response.status===404&&method==='GET')return null;
  if(!response.ok)throw Error(`Chrome release receipt failed: HTTP ${response.status}`);
  return response.json();
}
const tag=`chrome-v${version}`,title=`Chrome ${version}`;
let release=await gh('/releases/tags/'+tag);
if(!release) {
  const matches=(await gh('/releases?per_page=100')).filter(r=>r.draft&&r.name===title);
  if(matches.length>1)throw Error('Multiple Chrome release receipts require inspection');
  release=matches[0];
}
let state=release?JSON.parse(release.body):{version,sha256,commit:env.GITHUB_SHA,phase:'prepared'};
if(state.version!==version||state.sha256!==sha256)throw Error('Chrome version already has different release bytes; increase manifest version');
const decision=decide(await client.status(),version);
if(decision!=='upload') {
  console.log(`Chrome ${version}: ${decision}; no duplicate submission.`);
  if(env.GITHUB_STEP_SUMMARY)fs.appendFileSync(env.GITHUB_STEP_SUMMARY,`Chrome ${version}: ${decision}.\n`);
  process.exit(0);
}
if(!release)release=await gh('/releases','POST',{tag_name:tag,target_commitish:env.GITHUB_SHA,name:title,draft:true,body:JSON.stringify(state,null,2)});
async function checkpoint(next) {
  await gh('/releases/'+release.id,'PATCH',{body:JSON.stringify(next,null,2)});
  state=next;fs.mkdirSync('audit',{recursive:true});fs.writeFileSync('audit/chrome-submission.json',JSON.stringify(state,null,2)+'\n');
}
const result=await client.submit(bytes,version,state,checkpoint);
console.log(`Chrome ${version}: ${result}. Store review and approval still apply.`);
if(env.GITHUB_STEP_SUMMARY)fs.appendFileSync(env.GITHUB_STEP_SUMMARY,`Chrome ${version}: ${result}. Publishes automatically after Google approval.\n`);
