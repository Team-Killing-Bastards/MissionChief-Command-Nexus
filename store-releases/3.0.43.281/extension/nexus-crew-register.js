/* Building-screen register writer: available even before the optional tools runtime loads. */
(() => {
  if(!/^\/buildings\/\d+\/?$/.test(location.pathname))return;
  let host;try{host=window.top;void host.location.origin;}catch{host=window;}
  if(host.__NEXUS_CREW_REGISTER__)return;
  const key='mcPersonnelVehicleTrainingRegistry_v1';
  host.__NEXUS_CREW_REGISTER__={
    ready(){return true;},
    async save(s){
      await host.NexusPersonnelStore.ready();
      if(!s||![s.vehicleId,s.vehicleTypeId,s.buildingId].every(id=>/^\d+$/.test(String(id)))||!Array.isArray(s.profiles)||s.profiles.length>100||s.profiles.some(p=>!Array.isArray(p)||p.some(c=>typeof c!=='string'||!/^[a-zA-Z0-9_]+$/.test(c))))throw Error('Verified crew record is incomplete');
      const old=host.localStorage.getItem(key);
      const profiles=s.profiles.map(p=>[...new Set(p)].sort()),counts={};
      for(const profile of profiles)for(const code of profile)counts[code]=(counts[code]||0)+1;
      const now=Date.now();
      const record={vehicleId:String(s.vehicleId),vehicleName:String(s.vehicleName||'').slice(0,256),vehicleTypeId:String(s.vehicleTypeId),stationName:String(s.stationName||'').slice(0,256),stationHref:`/buildings/${s.buildingId}`,assignedPersonnelCount:profiles.length,assignmentScanComplete:true,personnelRowsSeen:Number(s.rowsSeen)||0,trainingCounts:counts,trainingCombinationCounts:{'swat+traffic_police':profiles.filter(p=>p.includes('swat')&&p.includes('traffic_police')).length},assignedTrainingProfiles:profiles,trainingProfilesComplete:true,updatedAt:now,source:'personnel-register-exact-assign-crew'};
      // The store merges these rows atomically with its current account data.
      // Do not resubmit a stale copy of every other vehicle in the register.
      const register={schemaVersion:1,updatedAt:now,vehicles:{[String(s.vehicleId)]:record}};
      try{await host.NexusPersonnelStore.write(register);}catch{throw Error('Crew assigned, but training register could not be saved');}
      const raw=host.localStorage.getItem(key);
      if(JSON.stringify(JSON.parse(raw).vehicles[String(s.vehicleId)])!==JSON.stringify(record))throw Error('Training register save could not be verified');
      // Native storage events reach other documents. The writer window also needs cache invalidation.
      try{host.dispatchEvent(new host.StorageEvent('storage',{key,oldValue:old,newValue:raw,storageArea:host.localStorage,url:location.href}));}catch{}
      try{host.dispatchEvent(new host.CustomEvent('mc-personnel-training-registry-updated',{detail:{vehicleCount:1,stationName:s.stationName||'',updatedAt:now}}));}catch{}
      return true;
    }
  };
})();
