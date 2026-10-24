import fs from 'node:fs/promises';import path from 'node:path';import {root} from './build.mjs';import {dependency} from './dependency.mjs';
const {chromium}=dependency('playwright');
const source=path.resolve(root,'../extension-candidates/3.0.43.235/extension'),out=path.join(root,'public/assets');
await fs.mkdir(out,{recursive:true});
const manifest=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));
const executablePath=process.env.EDGE_EXECUTABLE_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
await fs.mkdir(path.join(root,'qa'),{recursive:true});
const context=await chromium.launchPersistentContext(path.join(root,'qa/capture-profile'),{executablePath,headless:true,viewport:{width:1280,height:1000},env:{...process.env,TEMP:path.join(root,'qa'),TMP:path.join(root,'qa'),SSLKEYLOGFILE:''}});
await context.route('**/*',async route=>{
 const u=new URL(route.request().url());
 if(u.pathname==='/'&&u.hostname==='www.missionchief.co.uk')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><title>Nexus documentation fixture</title></head><body style="background:#16222e;color:#dce9f7;font:14px system-ui"><p>DOCUMENTATION FIXTURE · SYNTHETIC DATA · NO GAME ACTIONS</p><nav class="navbar"><ul class="dropdown-menu"><li><a href="#faq">FAQ</a></li><li><a href="#contact">Contact support</a></li></ul></nav><a id="navbar_profile_link" href="/profile/12345">Example player</a><span class="credits-value">100,000</span><span class="coins-value">0</span></body></html>'});
 const file=path.resolve(source,decodeURIComponent(u.pathname.slice(1)));
 if(!file.startsWith(source+path.sep))return route.abort();
 try{const body=await fs.readFile(file);return route.fulfill({contentType:({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body});}catch{return route.abort();}
});
await context.addInitScript(({manifest})=>{
 const state={};
 window.chrome={runtime:{id:'documentation-fixture',getManifest:()=>({...manifest,version_name:manifest.version+' · isolated fixture'}),getURL:p=>location.origin+'/'+p,sendMessage:async m=>{
 if(m.type==='NEXUS_TOOLS_GET')return {ok:true,settings:{}};
 if(m.type==='NEXUS_ACCOUNT_STATUS')return {ok:true,signedIn:false,enabled:false,lastSync:0,lastError:'',redirect:'Browser-managed redirect (fixture)'};
 return {ok:true};
 }},storage:{local:{get:async key=>({[key]:state[key]}),set:async value=>Object.assign(state,value)},onChanged:{addListener(){},removeListener(){}}},tabs:{query:async()=>[{id:1,url:'https://www.missionchief.co.uk/'}]},scripting:{executeScript:async()=>[{result:{runtime:{status:'loaded',build:manifest.version},controller:true}}]}};
},{manifest});
const errors=[];
try{
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://www.missionchief.co.uk/');
 for(const file of ['nexus-settings.js','nexus-settings-defaults.js','nexus-tools-core.js','nexus-station-profiles-store.js','nexus-station-profiles-data.js','nexus-station-profiles-core.js','nexus-station-profiles-ui.js','nexus-tools.js'])await page.addScriptTag({path:path.join(source,file)});
 await page.getByRole('link',{name:'Nexus Tools',exact:true}).click();
 await page.getByRole('dialog',{name:'Nexus Tools',exact:true}).waitFor();
 await page.evaluate(()=>{const ui=document.querySelector('#nexus-native-tools').shadowRoot;const s=document.createElement('style');s.textContent='#tabs{outline:3px solid #ffd57a;outline-offset:-3px}';ui.append(s);});
 await page.getByRole('dialog',{name:'Nexus Tools',exact:true}).screenshot({path:path.join(out,'tools.png')});
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('dialog',{name:'Nexus Tools',exact:true}).screenshot({path:path.join(out,'settings.png')});
 await page.getByRole('button',{name:'Profiles',exact:true}).click();
 await page.getByRole('textbox',{name:'Profile name',exact:true}).fill('Training test');
 await page.getByLabel('Profile building type').selectOption({label:'Ambulance station'});
 await page.evaluate(()=>{const ui=document.querySelector('#nexus-native-tools').shadowRoot;const s=document.createElement('style');s.textContent='.profile-scroll{max-height:260px!important}.profile-field:has(input[aria-label="Profile name"]),.profile-field:has(select),button:has(+[role=status]){outline:2px solid #ffd57a;outline-offset:2px}';ui.append(s);});
 await page.getByRole('dialog',{name:'Nexus Tools',exact:true}).screenshot({path:path.join(out,'profiles.png')});
 await page.goto('https://fixture.invalid/popup.html');
 await page.getByRole('button',{name:'Open Nexus',exact:true}).waitFor({state:'visible'});
 await page.addStyleTag({content:'#open,a[href="rules.html"]{outline:2px solid #ffd57a;outline-offset:3px}'});
 await page.locator('body').screenshot({path:path.join(out,'popup.png')});
 await page.goto('https://fixture.invalid/account.html');
 await page.getByText('Not signed in - your local register still works',{exact:true}).waitFor();
 await page.addStyleTag({content:'#login{outline:3px solid #ffd57a;outline-offset:3px}'});
 await page.locator('main').screenshot({path:path.join(out,'account.png')});
 await fs.copyFile(path.join(source,'icons/nexus-48.png'),path.join(out,'nexus.png'));
 await fs.writeFile(path.join(out,'capture-evidence.json'),JSON.stringify({sourceVersion:manifest.version,sourceCommit:'e0160800',mode:'Actual modules; synthetic data; all network intercepted; no live game action',files:['tools.png','settings.png','profiles.png','popup.png','account.png'],pageErrors:errors},null,2));
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Captured five real-module fixture screenshots.');
}finally{await context.close();}
