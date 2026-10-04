import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const page=await browser.newPage({viewport:{width:800,height:850}});
 await page.route('https://www.missionchief.co.uk/**',r=>r.fulfill(r.request().url().endsWith('/api/buildings')?{contentType:'application/json',body:'[{"id":42,"building_type":6},{"id":7,"building_type":7,"caption":"Test dispatch"}]'}:{contentType:'text/html',body:'<body style="background:#294030;padding:20px"><div id="fixture"></div></body>'}));
 await page.goto('https://www.missionchief.co.uk/');
 await page.evaluate(()=>{globalThis.NexusRealismSetup={options:async()=>[{name:'Dog Support Extension',price:'100,000 Credits'}]};});
 const source=fs.readFileSync(new URL('../nexus-real-locations.js',import.meta.url),'utf8').replace('  start();\n})();','  globalThis.testCard=locationCard;globalThis.testConfig=configFromControls;globalThis.testControls=buildFormConfigFor;\n})();');
 await page.addScriptTag({content:source});
 await page.evaluate(()=>{document.querySelector('#fixture').append(testCard({name:'Maryhill Police Station',services:['police_station'],latitude:55.88,longitude:-4.28,source_type:'node',source_id:'1'},{forceOpen:true}));});
 await page.getByLabel('Desired personnel',{exact:true}).fill('80');
 await page.getByLabel('Service status',{exact:true}).selectOption('off');
 await page.getByLabel('Extension — credits only',{exact:true}).selectOption('Dog Support Extension');
 assert((await page.locator('#fixture').innerText()).includes('MARYHILL POLICE STATION'));
 const config=await page.evaluate(()=>{const root=document.querySelector('#fixture');return testConfig({type:root.querySelector('select'),dispatch:root.querySelectorAll('select')[1],start:root.querySelectorAll('select')[2],service:root.querySelectorAll('select')[3],personnel:root.querySelector('input[type=number]'),extensions:root.querySelectorAll('select')[4]});});
 assert.equal(config.personnelTarget,'80');assert.equal(config.serviceStatus,'off');assert.deepEqual(config.extensions,['Dog Support Extension']);
 const restored=await page.evaluate(seed=>{const c=testControls({services:['police_station'],latitude:1,longitude:2},document,seed);return testConfig(c);},config);
 assert.deepEqual(restored.extensions,config.extensions,'batch selections survive before choices finish loading');assert.equal(restored.personnelTarget,'80');
 assert.equal(await page.getByLabel('Extension — credits only',{exact:true}).getAttribute('multiple'),null);
 await page.getByLabel('Extension — credits only',{exact:true}).selectOption('');
 assert.equal(await page.getByLabel('Extension — credits only',{exact:true}).inputValue(),'');
 await page.screenshot({path:fileURLToPath(new URL('../../realism-build-menu-180.png',import.meta.url))});
 console.log('PASS: rendered Realism build menu exposes capitals, target, service and extension choices; batch controls retain selections.');
}finally{await browser.close();}
