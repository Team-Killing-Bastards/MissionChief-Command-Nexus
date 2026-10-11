/* Durable dispatch checkpoints, independent of the game's localStorage quota. */
(() => {
  'use strict';
  if (globalThis.NexusAllianceResultsStore) return;
  const legacyKey = 'nexusAllianceSupportResultsV1';
  let opening;
  const message = 'Alliance dispatch history could not be saved or read. No new dispatch will be attempted. Check browser site-storage permissions and free disk space, then refresh.';
  function normalise(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Saved alliance dispatch history is unreadable. It has been left untouched.');
    const result = {};
    for (const [id, r] of Object.entries(value)) {
      if (!/^\d+$/.test(id) || !r || !['sent','uncertain'].includes(r.state) || !/^\d+$/.test(String(r.vehicle)) || !Number.isFinite(r.at)) throw Error('Saved alliance dispatch history is unreadable. It has been left untouched.');
      if (r.state === 'uncertain' || Date.now() - r.at < 86400000) result[id] = {state:r.state,vehicle:String(r.vehicle),vehicleType:String(r.vehicleType || '3'),at:r.at};
    }
    return result;
  }
  function db() {
    if (!opening) opening = new Promise((resolve,reject) => {
      let settled = false;
      const fail = () => { if (!settled) { settled=true; opening=null; reject(Error(message)); } };
      const request = indexedDB.open('nexus-alliance-dispatch-history',1);
      request.onupgradeneeded = () => request.result.createObjectStore('records');
      request.onerror = request.onblocked = fail;
      request.onsuccess = () => {
        if (settled) { request.result.close(); return; }
        settled=true;
        const database=request.result;
        database.onversionchange = () => { database.close(); opening=null; };
        resolve(database);
      };
    });
    return opening;
  }
  async function update(change) {
    const database = await db();
    let raw;
    try { raw = localStorage.getItem(legacyKey); } catch { throw Error(message); }
    let legacy = null;
    if (raw !== null) {
      try { legacy = normalise(JSON.parse(raw)); }
      catch { throw Error('Older alliance dispatch history could not be read. It has been left untouched; no new dispatch will be attempted.'); }
    }
    const result = await new Promise((resolve,reject) => {
      let value, failure;
      const transaction=database.transaction('records','readwrite'), store=transaction.objectStore('records'), request=store.get('history');
      request.onsuccess=()=>{
        try {
          value=normalise(request.result || {});
          for (const [id,r] of Object.entries(legacy || {})) if (!value[id] || r.at > value[id].at) value[id]=r;
          if (change) change(value);
          store.put(value,'history');
        } catch (error) { failure=error; transaction.abort(); }
      };
      transaction.oncomplete=()=>resolve(value);
      transaction.onabort=()=>reject(failure || Error(message));
      transaction.onerror=()=>{ /* onabort reports transaction failure; never acknowledge a partial write. */ };
    });
    // Remove the old copy only after commit, and never remove a newer legacy write.
    if (raw !== null) try { if (localStorage.getItem(legacyKey) === raw) localStorage.removeItem(legacyKey); } catch { /* The durable copy is already committed. */ }
    return result;
  }
  globalThis.NexusAllianceResultsStore = Object.freeze({
    read:()=>update(),
    save:(id,state,vehicle,vehicleType)=>update(records=>{
      if (!/^\d+$/.test(String(id)) || !['sent','uncertain'].includes(state) || !/^\d+$/.test(String(vehicle))) throw Error('Invalid alliance dispatch checkpoint. No dispatch was attempted.');
      if (!records[id] && Object.keys(records).length>=2000) throw Error('Support history is full. Check unconfirmed dispatches before sending more.');
      records[id]={state,vehicle:String(vehicle),vehicleType:String(vehicleType || records[id]?.vehicleType || '3'),at:Date.now()};
    }),
    forget:id=>update(records=>{delete records[id];})
  });
})();
