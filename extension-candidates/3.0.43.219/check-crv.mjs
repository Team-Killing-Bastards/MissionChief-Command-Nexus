import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../browser-extension/scripts/dev-library.mjs';
const root=fileURLToPath(new URL('./extension/',import.meta.url));
const {chromium}=devLibrary('playwright');
function functions(source,names){return names.map(name=>{const a=source.indexOf('function '+name+'(');assert(a>=0,name);const rest=source.slice(a);const end=/\n {0,4}function \w+\(/.exec(rest.slice(10));assert(end,name+' end');return rest.slice(0,end.index+10);}).join('\n');}
const names=['isAnyVehicleRequirementName','normaliseMissionUpgradeAnyVehicleRequirement','isAnyVehicleAmbulanceRequirement','isNormalAmbulanceVehicleCheckbox','getVehicleTypeIdentifiers','getGenericMissingVehicleRowsFromText','readMissionUpdateRows','areCurrentMissionUpdateRowsFullySelected','getVisibleInlineProblemAlertText','getAllMatchingVehicleCheckboxes','countSelectedMatchingVehicles','changeDispatchBoxColor','isCrvRequirement','isCrvVehicleCheckbox'];
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
try {
 const source=fs.readFileSync(root+'/nexus-runtime.js','utf8');const page=await fixture(source);
 await page.evaluate(()=>{
  const otherRequirements=['getEodResponseRequirementMode','getPrvSrvRequirementTypeId','isAmbulanceTransportRequest','isAmbulanceOfficerRequirement','isSartecRequirement','isRrvRequirement','isAerialApplianceOrRescueStairsRequirement','isFireEngineOrRivRequirement','isRivRequirement','isRivOrMajorFoamTenderRequirement','getPoliceAirRequirementMode','isPoliceCarRequirement','isRoadRailUnitRequirement','isFlatbedRecoveryVehicleRequirement','isHgvRecoveryVehicleRequirement','isAirfieldOperationsSupervisorRequirement','isSearchDogUnitRequirement','isControlVanRequirement','isAirAmbulanceRequirement','isCriticalCareTransferAmbulanceRequirement','isGenericCriticalCareRequirement','isAtvCarrierRequirement','isSeagoingVesselRequirement','isDogSupportUnitRequirement','isOperationalSupportOrSarVehicleRequirement','isGeneric4x4VehicleRequirement','isMountainRescueOrSar4x4Requirement','isIccuOrAmbulanceControlRequirement'];
  for(const name of otherRequirements)window[name]=()=>false;
  window.getVehicleMatchCandidates=()=>[];window.getExtendedVehicleValues=i=>[i.closest('tr')?.textContent||''];
  document.querySelector('#missing_text').textContent='Missing Vehicles: 1 CRVs';
  document.body.insertAdjacentHTML('beforeend','<table><tr><td><input id="crv-native" type="checkbox" vehicle_type_id="57" vehicle_caption="GRANTON & DISTRICT-CRV-1"></td></tr><tr><td vehicle_type_id="57"><input id="crv-cell" type="checkbox"></td></tr><tr><td><input id="crv-disabled" type="checkbox" vehicle_type_id="57" disabled></td></tr><tr><td><input id="wrong-type" type="checkbox" vehicle_type_id="58">CRV</td></tr></table>');
 });
 for(const wording of ['CRV','CRVs','Coastguard Rescue Vehicle','Coastguard Rescue Vehicles','Required CRVs']) {
  assert.deepEqual(await page.evaluate(wording=>getAllMatchingVehicleCheckboxes(wording,'CRV',false).map(i=>i.id),wording),['crv-native','crv-cell']);checks++;
 }
 assert.equal(await page.evaluate(()=>{changeDispatchBoxColor(true);return vehicleLoadState.ready;}),false);checks++;
 assert.deepEqual(await page.evaluate(()=>{
  const rows=readMissionUpdateRows();getAllMatchingVehicleCheckboxes(rows[0].unitName,'CRV',false).slice(0,1).forEach(i=>i.checked=true);changeDispatchBoxColor(true);
  return {rows:rows.map(r=>[r.unitName,r.stillNeeded]),selected:countSelectedMatchingVehicles('CRVs','CRV'),ready:vehicleLoadState.ready};
 }),{rows:[['CRVs',1]],selected:1,ready:true});checks++;
 assert.equal(await page.evaluate(()=>{document.querySelector('#crv-native').checked=false;document.querySelector('#wrong-type').checked=true;changeDispatchBoxColor(true);return vehicleLoadState.ready;}),false);checks++;
 // The attended game's ocean-only list has no type-57 rows. A name mapping
 // must keep that shortage visible rather than treating a boat as a CRV.
 assert.deepEqual(await page.evaluate(()=>{document.querySelector('#crv-native').remove();document.querySelector('#crv-cell').remove();document.querySelector('#crv-disabled').remove();return getAllMatchingVehicleCheckboxes('CRVs','CRV',false).map(i=>i.id);}),[]);checks++;
 await page.close();
 // Render the actual packaged rules page with storage mocked and every request
 // intercepted. This tests alias searching, service filtering, preview and save.
 const rules=await browser.newPage();const errors=[];rules.on('pageerror',e=>errors.push(e.message));
 await rules.addInitScript(()=>{window.saved={};window.chrome={storage:{local:{get:async()=>window.saved,set:async data=>Object.assign(window.saved,data)}}};});
 await rules.route('**/*',route=>{const p=new URL(route.request().url()).pathname;const file=p==='/'?'rules.html':p.slice(1);if(file.includes('..')||!fs.existsSync(root+'/'+file))return route.fulfill({status:404,body:''});const type=file.endsWith('.mjs')||file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html';return route.fulfill({contentType:type,body:fs.readFileSync(root+'/'+file)});});
 await rules.goto('https://nexus.test/rules.html');await rules.getByText('Ready. Built-in rules remain active wherever no custom rule applies.',{exact:true}).waitFor();
 for(const search of ['CRV','CRVs','Coastguard Rescue Vehicle','57']) {
  await rules.getByLabel('Find a vehicle',{exact:true}).fill(search);assert(await rules.locator('#vehicle option[value="57"]').count());checks++;
 }
 await rules.getByLabel('Find a vehicle',{exact:true}).fill('CRV');
 assert.match(await rules.locator('#vehicle option[value="57"]').textContent(),/Coastguard Rescue Vehicle \(CRV\)/);checks++;
 await rules.locator('#service').selectOption('Fire');assert.equal(await rules.locator('#vehicle option[value="57"]').count(),0);checks++;
 await rules.locator('#service').selectOption('');
 await rules.getByLabel('What the mission asks for',{exact:true}).fill('CRVs');assert.match(await rules.locator('#match-preview').textContent(),/Built-in match: CRV/);checks++;
 await rules.locator('#vehicle').selectOption('57');await rules.getByRole('button',{name:'Save rule',exact:true}).click();
 await rules.getByText('Saved. Stop Auto Mode and refresh the game to apply these rules across all workers.',{exact:true}).waitFor();
 assert.match(await rules.locator('#rules').textContent(),/Coastguard Rescue Vehicle \(#57\)/);assert.deepEqual(errors,[]);checks++;
 await rules.close();console.log(checks+' CRV browser checks passed: native type selection, final coverage gate, absent/disabled/wrong types and actual rules search/save. All traffic intercepted.');
} finally {await browser.close();}
