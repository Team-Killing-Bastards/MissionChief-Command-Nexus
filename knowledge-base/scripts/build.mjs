import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {dependency} from './dependency.mjs';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function parseArticle(source){
 const match=source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
 if(!match)throw Error('Article needs JSON metadata between --- delimiters');
 const metadata=JSON.parse(match[1]);
 if(!metadata.title||!metadata.description||!Array.isArray(metadata.sources))throw Error('Incomplete article metadata');
 return {...metadata,markdown:match[2]};
}
export async function build(){
 const config=JSON.parse(await fs.readFile(path.join(root,'site.json'),'utf8'));
 const {marked}=dependency('marked');
 const articles=await Promise.all(config.articles.map(async slug=>{
  const a=parseArticle(await fs.readFile(path.join(root,'content',slug+'.md'),'utf8'));
  if(/<\/?[A-Za-z][^>]*>/.test(a.markdown))throw Error('Raw HTML not permitted: '+slug);
  if(/\]\(\s*(?:javascript|data|vbscript):/i.test(a.markdown))throw Error('Unsafe link: '+slug);
  return {...a,slug,url:config.base+(slug==='index'?'/':'/'+slug+'/'),html:marked.parse(a.markdown)};
 }));
 const dest=path.join(root,'dist');
 await fs.mkdir(path.join(dest,'assets'),{recursive:true});await fs.mkdir(path.join(dest,'downloads'),{recursive:true});
 for(const name of ['style.css','app.js'])await fs.copyFile(path.join(root,'assets',name),path.join(dest,'assets',name));
 await fs.cp(path.join(root,'public'),dest,{recursive:true});
 const docs=[];
 for(const [i,a]of articles.entries()){
  const nav=articles.filter(x=>x.slug!=='index').map(x=>'<a href="'+x.url+'" '+(x.slug===a.slug?'aria-current="page"':'')+'>'+escape(x.title)+'</a>').join('');
  const prev=articles[i-1],next=articles[i+1];
  const turns='<nav class="page-turn" aria-label="Tutorial navigation">'+(prev?'<a href="'+prev.url+'"><small>Previous</small>'+escape(prev.title)+'</a>':'<span></span>')+(next?'<a href="'+next.url+'"><small>Next</small>'+escape(next.title)+' →</a>':'')+'</nav>';
  const sources=a.sources.map(p=>'<li><code>'+escape(p)+'</code></li>').join('');
  const html='<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="'+(config.publicationReady?'index,follow':'noindex,nofollow')+'"><title>'+escape(a.title)+' · Nexus Guide</title><meta name="description" content="'+escape(a.description)+'"><link rel="stylesheet" href="'+config.base+'/assets/style.css"><link rel="icon" href="'+config.base+'/assets/nexus.png"><script src="'+config.base+'/assets/app.js" defer></script></head><body>'+
  '<a class="skip" href="#content">Skip to content</a><header class="top"><a class="brand" href="'+config.base+'/"><img src="'+config.base+'/assets/nexus.png" width="35" height="35" alt=""><span>COMMAND <strong>NEXUS</strong><small>KNOWLEDGE BASE</small></span></a><nav aria-label="Main"><a href="/">Nexus website</a><a href="'+config.base+'/downloads/">PDF manuals</a></nav><span class="edition">'+escape(config.edition)+'</span></header>'+
  '<div class="layout"><aside class="side"><details open id="navigation"><summary>Explore the guide</summary><form role="search"><label for="search">Search documentation</label><input type="search" id="search" placeholder="Search guides…" autocomplete="off" aria-controls="results"><p id="search-status" role="status" aria-live="polite"></p><ul id="results"></ul></form><nav aria-label="Documentation">'+nav+'</nav><p class="side-note">Source '+escape(config.sourceVersion)+'<br>Revised '+config.revision+'</p></details></aside>'+
  '<main id="content"><div class="breadcrumbs"><a href="'+config.base+'/">Knowledge base</a><span aria-hidden="true">/</span><span>'+escape(a.title)+'</span></div><div class="review"><strong>Review edition</strong> · Source checked locally against '+escape(config.sourceVersion)+'. Store version, live screenshots and deployment verification are pending.</div><article><p class="eyebrow">NEXUS USER GUIDE</p><h1>'+escape(a.title)+'</h1><p class="lede">'+escape(a.description)+'</p>'+a.html+'</article>'+turns+
  '<details class="provenance"><summary>Version and source evidence</summary><p>Revision '+config.revision+'. '+escape(config.screenshotMode)+'. '+escape(config.storeVersion)+'. Source files below are relative to '+escape(config.sourceDirectory)+' at local commit '+escape(config.sourceCommit)+'; this commit is not yet verified on GitHub.</p><ul>'+(sources||'<li>Editorial navigation and downloads.</li>')+'</ul></details><footer>MissionChief Command Nexus · Independent community project · <a href="'+config.base+'/troubleshooting/">Get support</a></footer></main></div>'+
  '<dialog id="image-dialog" aria-label="Enlarged Nexus screenshot"><button type="button" id="close-image">Close screenshot</button><img alt=""><p></p></dialog></body></html>';
  const target=a.slug==='index'?dest:path.join(dest,a.slug);await fs.mkdir(target,{recursive:true});await fs.writeFile(path.join(target,'index.html'),html);
  docs.push({slug:a.slug,title:a.title,description:a.description,url:a.url,html:a.html,markdown:a.markdown,sources:a.sources});
 }
 await fs.writeFile(path.join(dest,'search.json'),JSON.stringify(docs.map(({html,markdown,sources,...a})=>({...a,text:html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').replace(/&amp;/g,'&')}))));
 await fs.writeFile(path.join(dest,'manual-source.json'),JSON.stringify({config,articles:docs},null,2));
 await fs.writeFile(path.join(dest,'404.html'),'<!doctype html><html lang="en"><title>Guide not found</title><h1>Guide not found</h1><a href="/guide/">Return to Nexus Knowledge Base</a></html>');
 console.log('Built '+articles.length+' articles in '+dest);return {config,articles,dest};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await build();
