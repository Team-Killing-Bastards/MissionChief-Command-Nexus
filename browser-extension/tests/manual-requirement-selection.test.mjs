import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
const bridge=fs.readFileSync('runtime/manual-requirement-selection.inc.js','utf8');
test('manual bridge is the only executable runtime addition to the verified .45 source',()=>{
 const runtime=fs.readFileSync('runtime/nexus-runtime.js','utf8');assert.equal(runtime.split(bridge+'\n').length,2);
 const original=runtime.replace(bridge+'\n','').replaceAll(JSON.parse(fs.readFileSync('extension/manifest.json')).version,'3.0.43.45');
 assert.equal(crypto.createHash('sha256').update(original).digest('hex'),JSON.parse(fs.readFileSync('reference/store-45.json')).testedRuntimeSha256);
});
function environment({auto=false,hidden=false,name='',rulesReady=true,staffing=false}={}){
 let calls=0;const document={hidden,querySelectorAll:()=>[]};const window={name};window.top=window;
 const context={window,document,location:{pathname:'/missions/99'},autoModeRunning:auto,autoModeLoopActive:false,__NEXUS_RULES__:{isReady:()=>rulesReady},getVehicleCheckboxSnapshot:()=>{calls++;},getAllMatchingVehicleCheckboxes:()=>[],resolveUnitName:s=>s,getVisibleStaffingShortageText:()=>staffing?'Missing trained crew':'',getInlinePersonnelQualificationAlertText:()=>'',clickVehicleElement:()=>{calls++;return true;}};
 vm.runInNewContext(bridge,context);return {api:window.__NEXUS_MANUAL_REQUIREMENT_SELECTION__,document,calls:()=>calls};
}
test('Auto, hidden documents and unready rules cannot select or scan',()=>{
 for(const options of [{auto:true},{hidden:true},{rulesReady:false}]){const e=environment(options);assert.ok(e.api.candidates('Fire engines').blocked);assert.ok(e.api.select({}).blocked);assert.equal(e.calls(),0);}
 assert.equal(environment({name:'mcn-v3-active-worker-99'}).api,undefined);assert.equal(environment({name:'mcn-v3-pipeline-preload-99'}).api,undefined);
});
test('manual selection refuses detached, foreign, disabled, already checked and unqualified units',()=>{
 const e=environment(),valid={ownerDocument:e.document,matches:()=>true,isConnected:true,checked:false,disabled:false};
 for(const patch of [{isConnected:false},{ownerDocument:{}},{disabled:true},{checked:true}])assert.equal(e.api.select({...valid,...patch}).selected,false);
 assert.equal(e.calls(),0);
 const s=environment({staffing:true});assert.ok(s.api.select({...valid,ownerDocument:s.document}).blocked);assert.equal(s.calls(),0);
});
