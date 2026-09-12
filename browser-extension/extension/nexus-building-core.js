/* Crew arithmetic and specialist assignment coverage. No DOM, requests or retained personnel. */
(() => {
  if(!/^\/buildings\/\d+\/?$/.test(location.pathname)||window.__NEXUS_BUILDING_CORE__)return;
  try{let w=window;while(true){if(/^mcn-v3-(active-worker|pipeline-preload|retired-worker)-/.test(w.name||''))return;if(w===w.top)break;if(w.frameElement?.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload],#mcn-v3-background-mission-worker'))return;w=w.parent;}}catch{return;}
  const number=v=>Number.isSafeInteger(v)&&v>=0,normal=v=>String(v||'').replace(/\s+/g,' ').trim().toLowerCase();
  function calculate(fleet,types,staff,partial=false){
    partial=partial||fleet.some(v=>!Number.isInteger(v.status));
    const total={min:0,max:0,activeMin:0,activeMax:0,unknown:0,paused:0,vehicles:fleet.length,partial},groups=new Map();
    for(const v of fleet){
      const type=types[v.type],max=v.limit??type?.max;
      if(!type||!number(type.min)||!number(max)||max<type.min){total.unknown++;continue;}
      total.min+=type.min;total.max+=max;if(v.status===6){total.paused++;continue;}total.activeMin+=type.min;total.activeMax+=max;
      for(const rule of type.training){
        const name=rule.name,group=groups.get(name)||{name,min:0,max:0,ready:0,full:0,unknown:0,tow:0,vehicles:0,trained:0,free:0,qualifiedAssigned:0,trainingTarget:0,coverageDetails:[],aliases:new Set(),jobs:[]};
        for(const alias of rule.aliases)group.aliases.add(normal(alias));
        if(type.max===0){group.tow++;}else{const minimum=rule.all?type.min:rule.min;group.min+=minimum;group.max+=rule.all?max:minimum;group.vehicles++;group.jobs.push({v,type,rule,minimum,max});}groups.set(name,group);
      }
    }
    const assignedCounts=new Map();for(const p of staff?.people||[])if(p.vehicle)assignedCounts.set(p.vehicle,(assignedCounts.get(p.vehicle)||0)+1);
    for(const group of groups.values()){
      const trained=staff?.people?.filter(p=>p.training.some(t=>group.aliases.has(normal(t))))||[];
      group.trained=trained.length;group.free=trained.filter(p=>!p.bound).length;const qualifiedCounts=new Map();for(const p of trained)if(p.vehicle)qualifiedCounts.set(p.vehicle,(qualifiedCounts.get(p.vehicle)||0)+1);
      for(const {v,type,rule,minimum,max}of group.jobs){
        const target=rule.all?max:minimum;
        group.trainingTarget+=target;
        const detail={id:String(v.id),name:String(v.name||`${type.name} #${v.id}`).slice(0,256),assigned:null,max,qualified:null,target,status:'unknown'};
        group.coverageDetails.push(detail);
        if(!staff||staff.partial||partial||!number(v.assigned)){group.unknown++;continue;}
        const assigned=assignedCounts.get(String(v.id))||0,qualified=qualifiedCounts.get(String(v.id))||0;
        if(assigned!==v.assigned||v.assigned>max){group.unknown++;continue;}
        detail.assigned=assigned;detail.qualified=qualified;
        // Spare specialists at another vehicle or the station cannot fill this vehicle's places.
        group.qualifiedAssigned+=Math.min(qualified,target);
        const need=rule.all?Math.max(type.min,v.assigned):minimum;
        if(v.assigned>=type.min&&qualified>=need)group.ready++;
        if(assigned===max&&qualified>=target){group.full++;detail.status='full';}
        else detail.status=assigned<max?'underfilled':'training-shortfall';
      }
      delete group.jobs;delete group.aliases;
    }
    return {total,training:[...groups.values()].sort((a,b)=>a.name.localeCompare(b.name))};
  }
  window.__NEXUS_BUILDING_CORE__={calculate};
})();
