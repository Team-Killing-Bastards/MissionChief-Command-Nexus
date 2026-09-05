const ORIGIN='https://api.addons.microsoftedge.microsoft.com';
export function edgeClient({key,clientId,productId,fetchImpl=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),checkpoint=async()=>{}}) {
 if(!key||!clientId||!/^[-a-f0-9]{36}$/i.test(productId)) throw Error('Missing or invalid Edge publishing credentials/configuration');
 const base=`/v1/products/${productId}/submissions`;
 const headers={Authorization:`ApiKey ${key}`,'X-ClientID':clientId};
 async function request(path,options={}) {
  try { return await fetchImpl(ORIGIN+path,{...options,headers:{...headers,...options.headers},redirect:'error',signal:AbortSignal.timeout(90000)}); }
  catch { throw Error('Edge request interrupted. Check the saved operation receipt before retrying; no POST was retried.'); }
 }
 function operation(location,kind) {
  if(!location) throw Error('Edge accepted request without operation ID; inspect Partner Center before retrying');
  const prefix=kind==='upload'?`${base}/draft/package/operations/`:`${base}/operations/`;
  if(/^[a-zA-Z0-9-]+$/.test(location)) return prefix+location;
  const url=new URL(location,ORIGIN);
  if(url.origin!==ORIGIN||!url.pathname.startsWith(prefix)||!/^[-a-zA-Z0-9]+$/.test(url.pathname.slice(prefix.length))||url.search||url.hash) throw Error('Unexpected Edge operation location');
  return url.pathname;
 }
 async function poll(path) {
  for(let attempt=0;attempt<80;attempt++) {
   const response=await request(path);
   if(response.status===429||response.status>=500) {await sleep(15000);continue;}
   if(!response.ok) throw Error(`Edge status HTTP ${response.status}`);
   const result=await response.json();
   if(result.status==='Succeeded') return;
   if(result.status==='Failed') throw Error(`Edge operation failed: ${String(result.errorCode||'Unspecified').replace(/[^a-zA-Z0-9_-]/g,'')}. Inspect Partner Center for details.`);
   if(result.status!=='InProgress') throw Error('Unexpected Edge operation status');
   await sleep(15000);
  }
  throw Error('Edge operation still pending; rerun to resume the saved operation');
 }
 return {async submit(bytes,notes,state={}) {
  for(const kind of ['upload','publish']) {
   if(state[kind+'Done']) continue;
   if(!state[kind+'Operation']) {
    if(state[kind+'Attempted']) throw Error(`Uncertain ${kind} request: inspect Partner Center before explicitly repairing the receipt. Automatic retry stopped.`);
    state[kind+'Attempted']=true; await checkpoint(state);
    const response=await request(kind==='upload'?`${base}/draft/package`:base,{method:'POST',headers:{'Content-Type':kind==='upload'?'application/zip':'application/json'},body:kind==='upload'?bytes:JSON.stringify({notes})});
    if(response.status!==202) {
     const detail=(await response.text()).split(key).join('[redacted]').split(clientId).join('[redacted]').slice(0,2000);
     throw Error(`Edge ${kind} HTTP ${response.status}: ${detail}; inspect Partner Center before retrying`);
    }
    state[kind+'Operation']=operation(response.headers.get('location'),kind); await checkpoint(state);
   }
   // Revalidate persisted paths before attaching credentials.
   state[kind+'Operation']=operation(state[kind+'Operation'],kind);
   await poll(state[kind+'Operation']);
   state[kind+'Done']=true; await checkpoint(state);
  }
  return state;
 }};
}
