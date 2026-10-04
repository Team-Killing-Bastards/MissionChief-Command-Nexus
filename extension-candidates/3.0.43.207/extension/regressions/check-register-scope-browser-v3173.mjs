import fs from 'node:fs';
import assert from 'node:assert/strict';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const s=fs.readFileSync(new URL('../nexus-runtime.js',import.meta.url),'utf8');
const extract=(a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try {
 const page=await browser.newPage();
 await page.setContent(extract('<div id="mc-personnel-register-scope"','                    <button id="mc-personnel-build-register"'));
 await page.addScriptTag({content:`const PERSONNEL_STATE={};const cleanText=s=>s;
 const personnelFetchResponse=async()=>({ok:true,json:async()=>[{id:10,caption:'Edinburgh',building_type:7},{id:20,caption:'Fife',building_type:7}]});
 ${extract('    let personnelRegisterScopeLoading','    function getPersonnelRegisterStationEntries')}
 document.querySelector('button').onclick=refreshPersonnelRegisterCentres;`});
 await page.getByRole('button',{name:'Load / refresh dispatch centres'}).click();
 await page.getByLabel('Register refresh — dispatch centre:').selectOption('20');
 await page.getByRole('button').click();
 assert.equal(await page.locator('select').inputValue(),'20','refresh preserves selection');
 assert.equal(await page.locator('select option').count(),4);
 assert.match(await page.locator('#mc-personnel-register-scope-note').innerText(),/Other areas keep/);
 console.log('PASS: browser dropdown loads named centres, supports selection and preserves it on refresh');
}finally{await browser.close();}
