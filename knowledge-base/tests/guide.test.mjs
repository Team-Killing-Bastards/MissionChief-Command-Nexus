import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';import {root,parseArticle,build} from '../scripts/build.mjs';
test('editorial metadata rejects missing title/description/evidence',()=>{
 assert.throws(()=>parseArticle('Not a chapter'));
 assert.throws(()=>parseArticle('---\n{"title":"A"}\n---\nBody'));
});
test('every local chapter, screenshot and download link resolves',async()=>{
 const {articles,dest}=await build();
 for(const article of articles){
  for(const [,url]of article.html.matchAll(/(?:href|src)="(\/guide\/[^"#?]*)"/g)){
   let file=path.join(dest,url.slice(7));if(!path.extname(file))file=path.join(file,'index.html');
   assert.ok((await fs.stat(file)).isFile(),article.slug+' has a missing link: '+url);
  }
 }
});
test('source evidence filenames exist and match the audited extension version',async t=>{
 const config=JSON.parse(await fs.readFile(path.join(root,'site.json'),'utf8'));
 const source=path.resolve(root,'..',config.sourceDirectory);const evidence=JSON.parse(await fs.readFile(path.join(root,'source-audit.json'),'utf8'));assert.equal(evidence.sourceVersion,config.sourceVersion);for(const slug of config.articles)for(const file of parseArticle(await fs.readFile(path.join(root,'content',slug+'.md'),'utf8')).sources)assert.ok(evidence.files.some(e=>e.path===file),slug+': missing recorded evidence '+file);try{await fs.stat(source);}catch{t.skip('Recorded evidence resolves; raw .235 checkout unavailable for rehashing');return;}const manifest=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));
 assert.equal(manifest.version,config.sourceVersion);
 for(const slug of config.articles)for(const file of parseArticle(await fs.readFile(path.join(root,'content',slug+'.md'),'utf8')).sources)assert.ok((await fs.stat(path.join(source,file))).isFile(),slug+': '+file);
});
test('review edition cannot silently pass the publication gate',async()=>{
 const child=spawn(process.execPath,[path.join(root,'scripts/release-gate.mjs')],{stdio:'pipe'});let error='';child.stderr.on('data',d=>error+=d);
 const code=await new Promise(resolve=>child.on('exit',resolve));assert.equal(code,1);assert.match(error,/storeVersionVerified/);assert.match(error,/allScreenshotsVerified/);
});
test('search index contains specialist, profile and troubleshooting guidance without UI chrome',async()=>{
 const docs=JSON.parse(await fs.readFile(path.join(root,'dist/search.json'),'utf8'));
 assert.ok(docs.find(d=>d.slug==='profiles').text.includes('permanently'));
 assert.ok(docs.find(d=>d.slug==='dispatch').text.includes('Critical Care'));
 assert.ok(docs.find(d=>d.slug==='troubleshooting').text.includes('Duplicate dispatch'));
 assert.ok(docs.every(d=>!d.text.includes('<script')));
});
test('static routing has exact base matching and no API fallback',async()=>{
 const caddy=await fs.readFile(path.join(root,'ops/Caddy.guide.fragment'),'utf8');
 assert.match(caddy,/redir \/guide \/guide\/ 308/);assert.match(caddy,/handle_path \/guide\/\*/);assert.doesNotMatch(caddy,/handle_path \/guide\*/);assert.match(caddy,/try_files \{path\} \{path\}\/index.html =404/);assert.doesNotMatch(caddy,/^\s*reverse_proxy\s+\S/m);
});
test('loopback preview serves deep links and PDFs, preserves 404 boundaries',async t=>{
 const server=spawn(process.execPath,[path.join(root,'scripts/serve.mjs')],{env:{...process.env,PORT:'4381'},stdio:'pipe'});
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.stdout.once('data',resolve);server.once('exit',code=>reject(Error('Preview exited '+code)));});
  for(const url of ['/guide/','/guide/profiles','/guide/profiles/','/guide/search.json','/guide/downloads/Nexus-Quick-Start.pdf','/guide/downloads/Nexus-Complete-User-Manual.pdf']){
   const response=await fetch('http://127.0.0.1:4381'+url);assert.equal(response.status,200,url);await response.arrayBuffer();
  }
  for(const url of ['/guide/missing-guide','/v1/realism/status','/guide-other','/']){const response=await fetch('http://127.0.0.1:4381'+url);assert.equal(response.status,404,url);await response.arrayBuffer();}
  const redirect=await fetch('http://127.0.0.1:4381/guide',{redirect:'manual'});assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'/guide/');
 }catch(error){if(error.cause?.code==='EACCES'){t.skip('Execution environment blocks loopback connections; HTTP validation pending');}else throw error;}finally{server.kill();}
});
