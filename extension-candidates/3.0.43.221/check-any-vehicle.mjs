import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const root=fileURLToPath(new URL('./extension/',import.meta.url));
const {chromium}=devLibrary('playwright');
function functions(source,names){return names.map(name=>{const a=source.indexOf('function '+name+'(');assert(a>=0,name);const rest=source.slice(a);const end=/\n {0,4}function \w+\(/.exec(rest.slice(10));assert(end,name+' end');return rest.slice(0,end.index+10);}).join('\n');}
const names=['isAnyVehicleRequirementName','normaliseMissionUpgradeAnyVehicleRequirement','isAnyVehicleAmbulanceRequirement','isNormalAmbulanceVehicleCheckbox','getVehicleTypeIdentifiers','getGenericMissingVehicleRowsFromText','readMissionUpdateRows','areCurrentMissionUpdateRowsFullySelected','getVisibleInlineProblemAlertText','getAllMatchingVehicleCheckboxes','countSelectedMatchingVehicles','changeDispatchBoxColor'];
const browser=await chromium.launch({headless:true,executablePath:process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined});
let checks=0;
async function fixture(source){const page=await browser.newPage();await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<div id="scope"><div id="missing_text" class="alert alert-danger">Missing Vehicles: Any vehicle</div></div><table><tr><td data-vehicle-type-id="5"><input id="ambo" type="checkbox"></td></tr><tr><td><input data-vehicle-type-id="19" id="rrv" type="checkbox"></td></tr><tr><td><input data-vehicle-type-id="9" id="hems" type="checkbox"></td></tr></table><button id="dispatch-box">Dispatch</button>'}));await page.goto('https://www.missionchief.co.uk/missions/263637058');
 await page.evaluate(()=>{
  window.MF_NORMAL_AMBULANCE_TYPE_ID='5';window.mfMissionUpdateRowsCache={};window.mfDebugEnabled=false;window.mfHighDebugEnabled=false;window.vehicleLoadState={};
  const scope=()=>document.querySelector('#scope');window.getActiveMissionRequirementContexts=()=>[{root:scope()}];window.getCurrentMissionAlertScopes=()=>[scope()];
  window.getActiveMissionProblemTextBlocks=()=>[...scope().querySelectorAll('.alert')].map(n=>n.textContent);
  for(const name of ['isCurrentMissionExecutionOwner','isMissionUpdateTable','isMissionElementVisible','isElementVisible'])window[name]=()=>true;
  window.synchroniseMissionInstanceState=()=>{};window.getLocalMissionInstanceKey=()=>location.pathname;
  window.isLiveMissionRequirementsTable=t=>t.matches('[aria-label="Live mission requirements"]');window.isMissingOnMissionUpdateTable=()=>false;
  window.getStructuredMissingVehicleRows=()=>[];
  window.shouldIgnoreRequiredMinimumRequirement=()=>false;
  window.normaliseVehicleText=v=>String(v||'').trim().toLowerCase();window.resolveUnitName=v=>/any vehicles?/i.test(v)?'Ambulance':v;
  for(const name of ['getCarsToTowVehicleRequirement','getHgvTowVehicleRequirement','getSearchAdvisorTrainedVehicleRequirement','getSarPersonnelVehicleRequirement'])window[name]=()=>null;
  for(const name of ['isPoliceInspectorPersonnelRequirementName','isPoliceSergeantPersonnelRequirementName','isPoliceMedicPersonnelRequirementName','isRailwayPolicePersonnelRequirementName','isArmedResponsePersonnelRequirementName','hasSupportedMissingPersonnelUpdate','isFireOperationalSupportRequirement'])window[name]=()=>false;
  window.isFireEngineRequirement=name=>/fire engines?/i.test(name);window.isFireEngineVehicleCheckbox=i=>i.getAttribute('data-vehicle-type-id')==='0';
  window.getPublicOrderPersonnelLevel=()=>0;window.normaliseMissionUpdatePatientRequirement=(unitName,stillNeeded)=>({unitName,stillNeeded,type:''});
  window.getMissionUpdateRowAuthority=row=>row?.liveRequirementDetails?.explicitMissingVehicles?3:1;
  window.hasExplicitCurrentMissingRequirementRows=rows=>rows.some(row=>row.liveRequirementDetails?.explicitMissingVehicles);
  window.isExplicitMissingVehicleRequirementRow=row=>!!row.liveRequirementDetails?.explicitMissingVehicles;window.isExplicitMissingPersonnelRequirementRow=()=>false;
  window.getCurrentMissionPatientAlertRoots=()=>[scope()];window.getVisiblePatientBadgeCountInRoots=()=>0;window.getAttendedPatientAmbulanceSummary=()=>({count:0});window.findPatientCount=()=>0;window.getMissionUpdatePatientRequirementRule=()=>null;
  window.getVehicleCheckboxSnapshot=()=>[...document.querySelectorAll('input')];window.sortVehicleCheckboxesByBestArrival=x=>x;
  window.mfApplyStoredStaffingQuarantine=()=>{};for(const name of ['getCoastguardRescueHelicopterTypeId','nexusLifeguardAlternativeTypes','nexusWaterCarrierTypes','nexusFleetPreferenceTypes'])window[name]=()=>null;
  window.mfApplyAmbulanceMissionLimitToEffectiveRequired=(a,b,n)=>({effectiveRequired:n});window.renderVehicleLoadList=()=>{};window.updateStatusBox=()=>{};window.mfPersistUnitFinderDiagnostic=()=>{};
 });
 await page.addScriptTag({content:functions(source,names)});return page;
}
try{
 const source=fs.readFileSync(root+'/nexus-runtime.js','utf8'),previous=fs.readFileSync(new URL('../3.0.43.211/extension/nexus-runtime.js',import.meta.url),'utf8');
 const old=await fixture(previous);const was=await old.evaluate(()=>{document.querySelector('#ambo').checked=true;changeDispatchBoxColor(true);return {parsed:getGenericMissingVehicleRowsFromText('Missing Vehicles: Any vehicle'),ready:vehicleLoadState.ready};});assert.deepEqual(was,{parsed:[],ready:false});checks++;await old.close();
 const page=await fixture(source);
 const parsed=await page.evaluate(()=>['Missing Vehicles: Any vehicle','Missing Vehicle: Any vehicles','Missing Vehicles: Required Any vehicle.','Missing Vehicles: Any vehicle, 2 Fire Engines','Missing Vehicles: 4 Any vehicles','Missing Vehicles: Any vehicle carrier','Missing Vehicles: Unknown unit','Missing Vehicles: 2 Fire Engines, 3 Foam Units'].map(getGenericMissingVehicleRowsFromText));
 assert.deepEqual(parsed.map(x=>x.map(r=>[r.unitName,r.stillNeeded])),[[['Any vehicle',1]],[['Any vehicle',1]],[['Any vehicle',1]],[['Any vehicle',1],['Fire Engines',2]],[['Any vehicles',4]],[],[],[['Fire Engines',2],['Foam Units',3]]]);checks+=8;
 // The full production reader (not a mocked row list) feeds the real final-ready gate.
 const before=await page.evaluate(()=>{const rows=readMissionUpdateRows();changeDispatchBoxColor(true);return {rows:rows.map(r=>[r.unitName,r.stillNeeded,r.liveRequirementDetails?.exactVehicleTypeId]),ready:vehicleLoadState.ready};});assert.deepEqual(before,{rows:[['Any vehicle',1,'5']],ready:false});checks++;
 const matched=await page.evaluate(()=>getAllMatchingVehicleCheckboxes('Any vehicle','Ambulance',false).map(i=>i.id));assert.deepEqual(matched,['ambo']);checks++;
 const selected=await page.evaluate(()=>{getAllMatchingVehicleCheckboxes('Any vehicle','Ambulance',false).slice(0,1).forEach(i=>i.checked=true);changeDispatchBoxColor(true);return {ready:vehicleLoadState.ready,selected:getVehicleCheckboxSnapshot().filter(i=>i.checked).map(i=>i.id)};});assert.deepEqual(selected,{ready:true,selected:['ambo']});checks++;
 assert.equal(await page.evaluate(()=>{document.querySelector('#ambo').checked=false;document.querySelector('#rrv').checked=true;document.querySelector('#hems').checked=true;changeDispatchBoxColor(true);return vehicleLoadState.ready;}),false);checks++;
 await page.evaluate(()=>{document.querySelector('#scope').insertAdjacentHTML('beforeend','<table class="table" aria-label="Live mission requirements"><tbody></tbody></table>');document.querySelector('#rrv').checked=false;document.querySelector('#hems').checked=false;document.querySelector('#ambo').checked=true;mfMissionUpdateRowsCache={};});
 assert.equal(await page.evaluate(()=>{const rows=readMissionUpdateRows();changeDispatchBoxColor(true);return rows.length===1&&vehicleLoadState.ready;}),true);checks++;
 assert.equal(await page.evaluate(()=>{document.querySelector('#missing_text').textContent='Missing Vehicles: 5 Any vehicles';mfMissionUpdateRowsCache={};const rows=readMissionUpdateRows();changeDispatchBoxColor(true);return rows[0].stillNeeded===1&&vehicleLoadState.ready;}),true);checks++;
 assert.equal(await page.evaluate(()=>{document.querySelector('#missing_text').textContent='Missing Vehicles: Any vehicle';document.querySelector('#scope').insertAdjacentHTML('beforeend','<div class="alert alert-danger">Vehicle has not enough personnel</div>');changeDispatchBoxColor(true);return vehicleLoadState.ready;}),false);checks++;
 await page.evaluate(()=>document.querySelector('#scope .alert:last-child').remove());
 assert.equal(await page.evaluate(()=>{document.querySelector('#scope').insertAdjacentHTML('beforeend','<div class="alert alert-danger">Missing Vehicles: Unknown unit</div>');changeDispatchBoxColor(true);return vehicleLoadState.ready;}),false);checks++;
 await page.evaluate(()=>{document.querySelector('#scope .alert:last-child').remove();document.querySelector('#missing_text').textContent='Missing Vehicles: Any vehicle, 2 Fire Engines';document.body.insertAdjacentHTML('beforeend','<input id="pump1" type="checkbox" data-vehicle-type-id="0"><input id="pump2" type="checkbox" data-vehicle-type-id="0">');mfMissionUpdateRowsCache={};});
 assert.deepEqual(await page.evaluate(()=>{const rows=readMissionUpdateRows();changeDispatchBoxColor(true);return {rows:rows.map(r=>[r.unitName,r.stillNeeded]),ready:vehicleLoadState.ready};}),{rows:[['Any vehicle',1],['Fire Engines',2]],ready:false});checks++;
 assert.equal(await page.evaluate(()=>{document.querySelector('#pump1').checked=true;document.querySelector('#pump2').checked=true;changeDispatchBoxColor(true);return vehicleLoadState.ready;}),true);checks++;
 assert.equal(await page.evaluate(()=>{document.querySelector('#ambo').checked=false;document.querySelector('#ambo').disabled=true;return getAllMatchingVehicleCheckboxes('Any vehicle','Ambulance',false).length;}),0);checks++;
 await page.close();console.log(checks+' Any vehicle browser checks passed. Reproduced .211 failure; no live game traffic or dispatch.');
}finally{await browser.close();}
