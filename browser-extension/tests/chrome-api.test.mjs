import test from 'node:test';
import assert from 'node:assert/strict';
import {chromeClient,compareVersions,decide,itemId} from '../scripts/chrome-api.mjs';
const status=(version='3.0.43.16')=>({itemId,publishedItemRevisionStatus:{state:'PUBLISHED',distributionChannels:[{crxVersion:version}]}});
test('Chrome skips existing versions and compares numeric version parts',()=>{
  assert.equal(compareVersions('3.0.43.9','3.0.43.17'),-1);
  assert.equal(decide(status('3.0.43.17'),'3.0.43.17'),'already-published');
  assert.equal(decide(status('3.0.43.18'),'3.0.43.17'),'already-published');
  assert.equal(decide(status(),'3.0.43.17'),'upload');
});
test('Chrome refuses competing submissions and policy warnings',()=>{
  assert.throws(()=>decide({...status(),warned:true},'3.0.43.17'));
  assert.throws(()=>decide({...status(),submittedItemRevisionStatus:{state:'STAGED'}},'3.0.43.17'));
  assert.equal(decide({...status(),submittedItemRevisionStatus:{state:'PENDING_REVIEW',distributionChannels:[{crxVersion:'3.0.43.17'}]}},'3.0.43.17'),'already-submitted');
});
function fake(responses){const calls=[];return {calls,request:async(url,options)=>{calls.push({url,...options});const next=responses.shift();if(next instanceof Error)throw next;return {ok:true,json:async()=>next};}};}
test('Chrome checkpoints before side effects and publishes after successful upload',async()=>{
  const f=fake([status(),{itemId,crxVersion:'3.0.43.17',uploadState:'SUCCEEDED'},{itemId,state:'PENDING_REVIEW'}]);
  const phases=[];
  assert.equal(await chromeClient('test',f).submit(Buffer.from('zip'),'3.0.43.17',{phase:'prepared'},async s=>phases.push(s.phase)),'submitted');
  assert.deepEqual(phases,['upload-started','uploaded','publish-started','submitted']);
  assert.deepEqual(JSON.parse(f.calls[2].body),{publishType:'DEFAULT_PUBLISH',skipReview:false,blockOnWarnings:true});
});
test('Chrome handles asynchronous uploads before publishing',async()=>{
  const f=fake([status(),{itemId,uploadState:'IN_PROGRESS'},{lastAsyncUploadState:'SUCCEEDED'},{itemId,state:'PENDING_REVIEW'}]);
  await chromeClient('test',{...f,sleep:async()=>{}}).submit(Buffer.from('zip'),'3.0.43.17',{phase:'prepared'},async()=>{});
  assert.equal(f.calls[2].method,'GET');
  assert.ok(f.calls[3].url.endsWith(':publish'));
});
test('Chrome never replays uncertain uploads or publishes a failed upload',async()=>{
  for(const phase of ['upload-started','uploaded','publish-started','submitted']) {
    const f=fake([status()]);
    await assert.rejects(chromeClient('test',f).submit(Buffer.from('zip'),'3.0.43.17',{phase},async()=>{}),/Uncertain/);
    assert.equal(f.calls.length,1);
  }
  const f=fake([status(),{itemId,uploadState:'FAILED'}]);
  await assert.rejects(chromeClient('test',f).submit(Buffer.from('zip'),'3.0.43.17',{phase:'prepared'},async()=>{}));
  assert.equal(f.calls.length,2);
});
test('Chrome writes no request when durable pre-upload checkpoint fails',async()=>{
  const f=fake([status()]);
  await assert.rejects(chromeClient('test',f).submit(Buffer.from('zip'),'3.0.43.17',{phase:'prepared'},async()=>{throw Error('receipt unavailable');}));
  assert.equal(f.calls.length,1);
});
