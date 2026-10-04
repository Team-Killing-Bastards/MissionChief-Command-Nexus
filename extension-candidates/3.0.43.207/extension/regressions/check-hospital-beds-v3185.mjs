import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try {
 const page=await browser.newPage({viewport:{width:900,height:500}}),errors=[]; let reads=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://www.missionchief.co.uk/**',r=>{
  const path=new URL(r.request().url()).pathname;
  if(path.startsWith('/buildings/')) {reads++; const id=path.split('/').pop();const text=id==='4'?'Login required':`There are currently ${{1:20,2:35,3:40}[id]} patients in the hospital or en route. Your hospital can accept a maximum of 40 patients.`;
   return r.fulfill({contentType:'text/html',body:`<div id="patienten"><div class="alert-info">${text}</div></div>`});}
  if(path.endsWith('.svg'))return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><rect width="36" height="36" rx="5" fill="#28609b"/><text x="9" y="26" fill="white" font-size="26">H</text></svg>'});
  return r.fulfill({contentType:'text/html',body:`<style>body{background:#19312e;color:white;font-family:Arial}#map{position:relative;width:800px;height:300px;background:#29433a}.leaflet-marker-icon{position:absolute;width:36px;height:36px}</style><h2>Patient beds: occupied + en route / total</h2><div id="map">${[1,2,3,4].map(i=>`<img class="leaflet-marker-icon" src="/${i}.svg" style="transform:translate3d(${i*150}px,120px,0);margin-left:-18px;margin-top:-36px">`).join('')}</div><ul id="building_list">${[1,2,3,4].map(i=>`<li id="building_list_${i}" building_type_id="4" search_attribute="Hospital ${i}"><img class="building_marker_image" src="/${i}.svg"></li>`).join('')}</ul>`});
 });
 await page.goto('https://www.missionchief.co.uk/');
 await page.addScriptTag({path:fileURLToPath(new URL('../nexus-hospital-beds.js',import.meta.url))});
 assert.equal(await page.locator('.nx-hospital-beds').count(),0,'Default off');
 await page.waitForTimeout(1100);assert.equal(reads,0,'Default off performs no reads');
 await page.evaluate(()=>{localStorage.setItem('nexusHospitalBedNumbersV1','true');window.dispatchEvent(new Event('nexus:settings-saved'));});
 // Trigger the regular visibility refresh for each next hospital without waiting 5 seconds.
 for(let i=0;i<4;i++){await page.waitForTimeout(150);await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));}
 await page.waitForTimeout(200);
 assert.deepEqual(await page.locator('.nx-hospital-beds').allTextContents(),['20/40','35/40','40/40','?']);
 assert.deepEqual(await page.locator('.nx-hospital-beds').evaluateAll(es=>es.map(e=>e.dataset.state)),['available','near','full','unknown']);
 assert.equal(reads,4,'No repeated fetch within cache TTL');
 const positions=await page.evaluate(()=>Array.from(document.querySelectorAll('.nx-hospital-beds')).map((badge,i)=>{const a=badge.getBoundingClientRect(),b=document.querySelectorAll('.leaflet-marker-icon')[i].getBoundingClientRect();return {offset:Math.abs((a.left+a.right)/2-(b.left+b.right)/2),gap:a.top-b.bottom};}));
 for(const pos of positions){assert.ok(pos.offset<1,'Badge horizontally centred');assert.equal(pos.gap,2,'Badge below icon');}
 await page.waitForTimeout(1200);assert.equal(reads,4,'Faster timer respects cache');
 await page.locator('#building_list').evaluate(e=>e.style.display='none');
 await page.screenshot({path:fileURLToPath(new URL('../../hospital-beds-187.png',import.meta.url))});
 await page.evaluate(()=>document.querySelector('.leaflet-marker-icon').remove());await page.waitForTimeout(200);
 assert.equal(await page.locator('.nx-hospital-beds').count(),3,'Removed icon releases badge');
 await page.evaluate(()=>{localStorage.setItem('nexusHospitalBedNumbersV1','false');window.dispatchEvent(new Event('nexus:settings-saved'));});
 assert.equal(await page.locator('.nx-hospital-beds').count(),0,'Off immediately removes badges');
 const beforeOff=reads;await page.waitForTimeout(1200);assert.equal(reads,beforeOff,'Off stops reads');
 await page.evaluate(()=>{localStorage.setItem('nexusHospitalBedNumbersV1','true');window.dispatchEvent(new Event('nexus:settings-saved'));});
 await page.waitForTimeout(200);assert.equal(await page.locator('.nx-hospital-beds').count(),3,'Can re-enable');
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 assert.equal(await page.locator('.nx-hospital-beds').count(),0,'Pagehide cleans all badges');
 assert.deepEqual(errors,[]);console.log('PASS bed parsing, colours, unknown, caching, marker removal and pagehide cleanup');
}finally{await browser.close();}
