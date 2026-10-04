import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 await page.route('https://www.missionchief.co.uk/**',r=>r.fulfill({contentType:'text/html',body:'<body style="background:#142337"><a id="navbar_profile_link" href="/profile/123">Test</a><div id="editor"></div><div id="staging"></div></body>'}));
 await page.goto('https://www.missionchief.co.uk/');
 await page.evaluate(()=>{globalThis.NexusStationProfilesStore={read:async()=>[],save:async()=>{}};});
 for(const f of ['nexus-station-profiles-data.js','nexus-station-profiles-core.js','nexus-station-profiles-ui.js','nexus-staging-profiles-editor.js'])await page.addScriptTag({path:fileURLToPath(new URL('../'+f,import.meta.url))});
 await page.evaluate(()=>NexusStationProfiles.mountEditor(document.querySelector('#editor')));
 await page.getByLabel('Profile building type',{exact:true}).selectOption('37');
 for(const name of ['Lifeguard Quadbike','Lifeguard 4x4','Inland Rescue Boat (Trailer)','Rescue Watercraft (Trailer)'])assert(await page.getByLabel('Use '+name,{exact:true}).count(),name);
 assert.equal(await page.getByLabel('Lifeguard Quadbike trained crew each',{exact:true}).getAttribute('max'),'2');
 assert.equal(await page.getByLabel('Lifeguard 4x4 trained crew each',{exact:true}).getAttribute('max'),'4');
 await page.screenshot({path:fileURLToPath(new URL('../../lifeguard-profiles-177.png',import.meta.url)),fullPage:true});
 console.log('PASS: rendered Lifeguard Station profile offers all four vehicles with correct crew limits.');
}finally{await browser.close();}
