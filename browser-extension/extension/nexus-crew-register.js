/* Building-screen register writer: available even before the optional tools runtime loads. */
(() => {
  if(!/^\/buildings\/\d+\/?$/.test(location.pathname))return;
  let host;try{host=window.top;void host.location.origin;}catch{host=window;}
  if(host.__NEXUS_CREW_REGISTER__)return;
  const key='mcPersonnelVehicleTrainingRegistry_v1';
  host.__NEXUS_CREW_REGISTER__={
    ready(){return true;},
    save(s){
      if(!s||![s.vehicleId,s.vehicleTypeId,s.buildingId].every(id=>/^\d+$/.test(String(id)))||!Array.isArray(s.profiles)||s.profiles.length>100||s.profiles.some(p=>!Array.isArray(p)||p.some(c=>typeof c!=='string'||!/^[a-zA-Z0-9_]+$/.test(c))))throw Error('Verified crew record is incomplete');
      const old=host.localStorage.getItem(key);let register;
      try{register=old?JSON.parse(old):{schemaVersion:1,vehicles:{}};}catch{throw Error('Existing training register could not be read');}
      if(!register||register.schemaVersion!==1||!register.vehicles||typeof register.vehicles!=='object'||Array.isArray(register.vehicles))throw Error('Existing training register format is not supported');
      const profiles=s.profiles.map(p=>[...new Set(p)].sort()),counts={};
      for(const profile of profiles)for(const code of profile)counts[code]=(counts[code]||0)+1;
      const now=Date.now();
      register.vehicles[String(s.vehicleId)]={vehicleId:String(s.vehicleId),vehicleName:String(s.vehicleName||'').slice(0,256),vehicleTypeId:String(s.vehicleTypeId),stationName:String(s.stationName||'').slice(0,256),stationHref:`/buildings/${s.buildingId}`,assignedPersonnelCount:profiles.length,assignmentScanComplete:true,personnelRowsSeen:Number(s.rowsSeen)||0,trainingCounts:counts,trainingCombinationCounts:{'swat+traffic_police':profiles.filter(p=>p.includes('swat')&&p.includes('traffic_police')).length},assignedTrainingProfiles:profiles,trainingProfilesComplete:true,updatedAt:now,source:'personnel-register-exact-assign-crew'};
      register.updatedAt=now;
      const raw=JSON.stringify(register);
      try{host.localStorage.setItem(key,raw);}catch{throw Error('Crew assigned, but training register could not be saved');}
      if(host.localStorage.getItem(key)!==raw)throw Error('Training register save could not be verified');
      // Native storage events reach other documents. The writer window also needs cache invalidation.
      try{host.dispatchEvent(new host.StorageEvent('storage',{key,oldValue:old,newValue:raw,storageArea:host.localStorage,url:location.href}));}catch{}
      try{host.dispatchEvent(new host.CustomEvent('mc-personnel-training-registry-updated',{detail:{vehicleCount:1,stationName:s.stationName||'',updatedAt:now}}));}catch{}
      return true;
    }
  };
})();
