import assert from 'node:assert/strict';
import fs from 'node:fs';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');
const source=fs.readFileSync(new URL('../nexus-runtime.js',import.meta.url),'utf8');
const css=source.match(/#\$\{ROOT_ID\} \.mcn-panel \{[^}]+\}/)[0].replaceAll('${ROOT_ID}','test-root');
const helper=source.slice(source.indexOf('const autoPanel = root.querySelector'),source.indexOf('const setCollapsed = collapsed =>',source.indexOf('const autoPanel = root.querySelector')));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try {
const page=await browser.newPage();await page.setContent(`<style>${css} #test-root[data-collapsed="true"] .mcn-panel{display:none}</style><nav style="position:relative;z-index:1"><div id="test-root" data-collapsed="false"><div class="mcn-panel" style="height:180px;background:blue">Auto controls</div></div></nav><div id="chat" style="position:fixed;inset:0;z-index:2147483647;background:red">chat</div>`);
await page.evaluate(helper=>{const root=document.getElementById('test-root');eval(helper+'; window.syncLayer=syncAutoPanelLayer; syncAutoPanelLayer();');},helper);
assert.equal(await page.evaluate(()=>document.elementFromPoint(170,80).className),'mcn-panel');
await page.evaluate(()=>{document.getElementById('test-root').dataset.collapsed='true';window.syncLayer();});assert.equal(await page.locator(':popover-open').count(),0);
await page.evaluate(()=>{document.getElementById('test-root').dataset.collapsed='false';window.syncLayer();});assert.equal(await page.locator(':popover-open').count(),1);
console.log('PASS Auto panel above maximum-z-index chat; close and reopen');
}finally{await browser.close();}
