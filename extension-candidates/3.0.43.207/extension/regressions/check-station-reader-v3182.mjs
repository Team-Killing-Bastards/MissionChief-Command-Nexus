import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://www.missionchief.co.uk/**',r=>r.fulfill({contentType:'text/html',body:'<h1>TEST FIRE STATION</h1><section><div id="buttons"></div></section><table><thead><tr><th>Name</th><th>Education</th><th>Assigned vehicle</th></tr></thead><tbody></tbody></table>'}));
 await page.goto('https://www.missionchief.co.uk/buildings/42');
 for(const name of ['nexus-building-data.js','nexus-personnel-reader.js','nexus-assign-crew.js'])await page.addScriptTag({path:fileURLToPath(new URL('../'+name,import.meta.url))});
 const result=await page.evaluate(()=>{
  const data=window.__NEXUS_BUILDING_DATA__;
  for(const type of Object.values(data))for(const rule of type.training)if(!rule.key||!rule.name||!Array.isArray(rule.aliases))throw Error('Invalid training definition');
  const layout=window.__NEXUS_PERSONNEL_READER__.columns(document.querySelector('table'));
  window.__NEXUS_ASSIGN_CREW__.mount(document.querySelector('#buttons'),()=>{});
  return {layout,quad:data[118].training[0].key};
 });
 assert.equal(result.layout.training,1);assert.equal(result.quad,'gw_wasserrettung');
 assert(await page.getByRole('button',{name:'Assign crew',exact:true}).isVisible());
 assert.deepEqual(errors,[]);
 console.log('PASS: full building catalogue loads personnel reader and visible Assign crew button without errors; Lifeguard training uses structured definitions.');
}finally{await browser.close();}
