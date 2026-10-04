import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const current=fs.readFileSync(new URL('../nexus-alliance-support.js',import.meta.url),'utf8');
const previous=fs.readFileSync(new URL('../../build-168/nexus-alliance-support.js',import.meta.url),'utf8');
async function run(source,{pages=4,cancel=false,change=false,stuck=false}={}) {
 let now=1000,page=0,clicked=0,pending=0,loading=false,docChanged=false;
 let boxes=[{id:'1'}],control;
 const renew=()=>control={isConnected:true,disabled:false,getAttribute:()=>'/page/'+page,
  closest:()=>false,click(){clicked++;loading=true;this.disabled=true;pending=now+300;}};
 renew();
 const doc={defaultView:{getComputedStyle:()=>({display:'block'})},querySelectorAll(selector){
  if(selector==='a.missing_vehicles_load')return page<pages?[control]:[];
  if(selector==='input.vehicle_checkbox')return boxes;
  return loading?[{disabled:false,closest:()=>false}]:[];
 }};
 const context=vm.createContext({Date:{now:()=>now},Promise,Error,Set,
  C:{vehicleId:b=>b.id,enabled:n=>!n.disabled},cancelled:false,heartbeat:()=>{},usable:n=>!n.disabled,
  docFor:()=>docChanged?null:doc,
  setTimeout(fn,ms){now+=ms;if(cancel&&now>1300)context.cancelled=true;if(change&&now>1300)docChanged=true;
   if(pending&&now>=pending&&!stuck){pending=0;loading=false;control.isConnected=false;page++;boxes.push({id:String(page+1)});renew();}fn();}
 });
 const a=source.indexOf('  async function waitFor('),b=source.indexOf('  async function load(',a);
 const c=source.indexOf('  async function loadVehicles('),d=source.indexOf('  async function support(',c);
 vm.runInContext(source.slice(a,b)+source.slice(c,d),context);
 try {const result=await context.loadVehicles('123');return {ms:now-1000,clicked,count:result.querySelectorAll('input.vehicle_checkbox').length};}
 catch(error){return {error:error.message,clicked,ms:now-1000};}
}
const old=await run(previous),next=await run(current);
assert.equal(next.count,5);assert.equal(next.clicked,4,'every page must load before choosing closest');
assert.ok(next.ms<old.ms*.8,JSON.stringify({old,next}));
assert.match((await run(current,{cancel:true})).error,/stopped/);
assert.match((await run(current,{change:true})).error,/changed/);
assert.match((await run(current,{stuck:true})).error,/did not finish|did not load/);
assert.equal((await run(current,{pages:0})).count,1);
assert.match(current,/picked.size!==1/);assert.match(current,/C.success\(current,chosen.id,previousAlerts\)\|\|C.attending/);
console.log('PASS: same complete pool, cancellation, navigation and loading failure checks. Simulated four-page load: '+old.ms+'ms -> '+next.ms+'ms; live network speed not measured.');
