import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {devLibrary} from '../../../release-72/browser-extension/scripts/dev-library.mjs';
const {chromium}=devLibrary('playwright');const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{const page=await browser.newPage({viewport:{width:1000,height:1000}});await page.route('**/*',r=>r.fulfill({body:'',contentType:'text/plain'}));
await page.setContent((await readFile(new URL('../account.html',import.meta.url),'utf8')).replace('<link rel="stylesheet" href="account.css">','').replace('<script src="account.js"></script>',''));
await page.addStyleTag({path:fileURLToPath(new URL('../account.css',import.meta.url))});
await page.evaluate(()=>{window.actions=[];let signed=false;window.chrome={runtime:{sendMessage:async m=>{actions.push(m.type);if(m.type.endsWith('LOGIN'))signed=true;if(m.type.endsWith('LOGOUT'))signed=false;return {ok:true,signedIn:signed,username:'Preview account',enabled:true,lastSync:0,redirect:'https://'+'a'.repeat(32)+'.chromiumapp.org/discord'};}}};});
await page.addScriptTag({path:fileURLToPath(new URL('../account.js',import.meta.url))});await page.getByRole('button',{name:'Sign in with Discord'}).click();await page.getByText('Signed in as Preview account',{exact:true}).waitFor();
await page.screenshot({path:fileURLToPath(new URL('../../account-preview-192.png',import.meta.url)),fullPage:true});
await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByText('Not signed in — your local register still works',{exact:true}).waitFor();
assert(await page.getByLabel('Sync this browser').isDisabled());console.log('PASS: account UI sign-in/out controls, paused-state control and visible local-only fallback. Preview saved.');}finally{await browser.close();}
