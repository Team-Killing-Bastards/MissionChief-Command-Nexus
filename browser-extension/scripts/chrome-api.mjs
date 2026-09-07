
export const publisherId = '389c3692-e117-46cd-9cdb-7a18313c2852';
export const itemId = 'pheccockibcappcdgonjjfcmlkemmaln';
const name = `publishers/${publisherId}/items/${itemId}`;
export function compareVersions(a,b) {
  const parse=v=>{if(!/^\d+(\.\d+){0,3}$/.test(v))throw Error('Invalid Chrome version');return v.split('.').map(Number);};
  const x=parse(a),y=parse(b);
  for(let i=0;i<4;i++)if((x[i]||0)!==(y[i]||0))return Math.sign((x[i]||0)-(y[i]||0));
  return 0;
}
export function decide(status,version) {
  if(status.itemId!==itemId||status.takenDown||status.warned)throw Error('Chrome item identity or policy status requires inspection');
  const published=status.publishedItemRevisionStatus;
  if(published?.state==='PUBLISHED'&&published.distributionChannels?.some(c=>compareVersions(c.crxVersion,version)>=0))return 'already-published';
  const submitted=status.submittedItemRevisionStatus;
  if(submitted) {
    if(submitted.state==='PENDING_REVIEW'&&submitted.distributionChannels?.some(c=>compareVersions(c.crxVersion,version)===0))return 'already-submitted';
    throw Error('An existing Chrome submission requires inspection; no upload or cancellation attempted');
  }
  if(!published||published.state!=='PUBLISHED')throw Error('Initial Chrome listing must be published manually first');
  if(['IN_PROGRESS','UPLOAD_IN_PROGRESS'].includes(status.lastAsyncUploadState))throw Error('Another Chrome upload is in progress');
  return 'upload';
}
export function chromeClient(token,{request=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}) {
  async function call(action,body,media=false) {
    const response=await request(`https://chromewebstore.googleapis.com/${media?'upload/':''}v2/${name}:${action}`,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':media?'application/zip':'application/json'},body:body===undefined?undefined:media?body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(90000)});
    if(!response.ok)throw Error(`Chrome ${action} failed: HTTP ${response.status}. Inspect the developer dashboard before retrying.`);
    return response.json();
  }
  return {
    status:()=>call('fetchStatus'),
    async submit(bytes,version,state,checkpoint) {
      const status=await call('fetchStatus'),decision=decide(status,version);
      if(decision!=='upload')return decision;
      if(state.phase!=='prepared')throw Error('Uncertain previous Chrome operation. Inspect the dashboard and receipt; automatic retry refused.');
      if(state.phase==='prepared') {
        await checkpoint({...state,phase:'upload-started'});
        const upload=await call('upload',bytes,true);
        if(upload.itemId!==itemId)throw Error('Chrome upload returned a different item');
        let uploadState=upload.uploadState;
        for(let i=0;['IN_PROGRESS','UPLOAD_IN_PROGRESS'].includes(uploadState)&&i<36;i++) {
          await sleep(5000); uploadState=(await call('fetchStatus')).lastAsyncUploadState;
        }
        if(uploadState!=='SUCCEEDED')throw Error('Chrome upload did not finish successfully; inspect before retrying');
        if(upload.crxVersion&&compareVersions(upload.crxVersion,version)!==0)throw Error('Chrome uploaded version mismatch');
        state={...state,phase:'uploaded'};await checkpoint(state);
      }
      await checkpoint({...state,phase:'publish-started'});
      const result=await call('publish',{publishType:'DEFAULT_PUBLISH',skipReview:false,blockOnWarnings:true});
      if(result.itemId!==itemId||!['PENDING_REVIEW','PUBLISHED'].includes(result.state))throw Error('Unexpected Chrome submission result; inspect before retrying');
      await checkpoint({...state,phase:'submitted',storeState:result.state});
      return 'submitted';
    }
  };
}
