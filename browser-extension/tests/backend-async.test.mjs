import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';

const source=fs.readFileSync('extension/google-backend/Code.gs','utf8');
function harness(){
  const properties=new Map(),byId=new Map(),triggers=[],rawRows=new Set(),structuredRows=new Set();
  let nextId=0,locked=false,sheetWrites=0,structuredWrites=0,failMarker=false,failStructured=false;
  function iterator(items,index=0){return {hasNext:()=>index<items.length,next:()=>items[index++],getContinuationToken:()=>JSON.stringify({ids:items.map(f=>f.getId()),index})};}
  class Folder{
    constructor(name){this.name=name;this.id=String(++nextId);this.folders=[];this.files=[];byId.set(this.id,this);}
    getId(){return this.id;}
    getFoldersByName(name){return iterator(this.folders.filter(f=>f.name===name));}
    createFolder(name){const f=new Folder(name);this.folders.push(f);return f;}
    getFilesByName(name){return iterator(this.files.filter(f=>f.name===name));}
    getFiles(){return iterator([...this.files]);}
    createFile(name,text){if(failMarker&&this.name==='Extension Pending Imports')throw Error('quota');const f=new File(name,text,this);this.files.push(f);return f;}
  }
  class File{
    constructor(name,text,parent){this.name=name;this.text=text;this.parent=parent;this.id=String(++nextId);byId.set(this.id,this);}
    getId(){return this.id;}
    getBlob(){return {getDataAsString:()=>this.text};}
    moveTo(folder){this.parent.files=this.parent.files.filter(f=>f!==this);folder.files.push(this);this.parent=folder;}
  }
  const root=new Folder('root');
  const props={getProperty:k=>properties.get(k)||null,setProperty(k,v){properties.set(k,v);return this;},deleteProperty:k=>properties.delete(k)};
  const c=vm.createContext({Date,console,Set,Map,JSON,PropertiesService:{getScriptProperties:()=>props},
    DriveApp:{getFolderById:()=>root,getFileById:id=>byId.get(id),continueFileIterator:token=>{const t=JSON.parse(token);return iterator(t.ids.map(id=>byId.get(id)),t.index);}},
    LockService:{getScriptLock:()=>({tryLock(){if(locked)return false;locked=true;return true;},hasLock:()=>locked,releaseLock:()=>{locked=false;}})},
    Utilities:{formatDate:d=>d.toISOString().slice(0,10),DigestAlgorithm:{SHA_256:1},computeDigest:(_,s)=>[...createHash('sha256').update(s).digest()]},
    MimeType:{PLAIN_TEXT:'text/plain'},ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({text,setMimeType(){return this;}})},
    ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:name=>({timeBased(){return this;},everyMinutes(){return this;},create(){triggers.push({getHandlerFunction:()=>name});}})}
  });
  vm.runInContext(source,c);
  c.nxWriteSheet=body=>{sheetWrites++;for(const e of body.events)rawRows.add(e.id);};
  c.nxWriteStructured=body=>{structuredWrites++;if(failStructured){failStructured=false;throw Error('partial write');}for(const e of body.events)structuredRows.add(e.id);};
  c.installNexusAsyncProcessing();
  const batch=()=>({schema:1,id:randomUUID(),createdAt:Date.now(),events:[{id:randomUUID(),session:randomUUID(),device:randomUUID(),player:'123',at:Date.now(),kind:'performance',elapsedMs:10}]});
  return {c,root,properties,rawRows,structuredRows,batch,byId,
    post:b=>JSON.parse(c.doPost({postData:{contents:JSON.stringify(b)}}).text),
    work:()=>c.nexusProcessSavedBatches(Date.now()+210000),
    get writes(){return [sheetWrites,structuredWrites];},
    failMarker:v=>{failMarker=v;},failStructured:()=>{failStructured=true;},
    folder:name=>root.folders.find(f=>f.name===name)};
}
test('ack requires durable raw data plus queue entry, without any spreadsheet writes',()=>{
  const h=harness(),b=h.batch();assert.equal(h.post(b).ok,true);assert.deepEqual(h.writes,[0,0]);
  assert.equal(h.folder('Extension Pending Imports').files.length,1);
  assert.equal(h.work(),1);assert.equal(h.structuredRows.size,1);
  assert.equal(h.folder('Extension Pending Imports').files.length,0);
  assert.equal(h.folder('Extension Imported Batches').files.length,1);
});
test('failure after raw save cannot acknowledge; retry repairs missing queue entry',()=>{
  const h=harness(),b=h.batch();h.failMarker(true);assert.equal(h.post(b).ok,false);
  h.failMarker(false);assert.equal(h.post(b).ok,true);assert.equal(h.folder('Extension Pending Imports').files.length,1);
});
test('lost acknowledgement and reordered object keys neither duplicate jobs nor reject exact data',()=>{
  const h=harness(),b=h.batch();h.post(b);
  const reordered=JSON.parse(JSON.stringify(b));reordered.events[0]=Object.fromEntries(Object.entries(reordered.events[0]).reverse());
  assert.equal(h.post(reordered).ok,true);assert.equal(h.folder('Extension Pending Imports').files.length,1);
  h.work();assert.equal(h.post(b).ok,true);assert.deepEqual(h.writes,[1,1]);
  assert.equal(h.folder('Extension Pending Imports').files.length,0);
});
test('same batch ID with changed data is refused without replacing accepted raw data',()=>{
  const h=harness(),b=h.batch();h.post(b);b.events[0].elapsedMs=50;
  assert.equal(h.post(b).error,'CONFLICT');assert.equal(h.folder('Extension Pending Imports').files.length,1);
});
test('partial spreadsheet failure retains job and retry completes without losing events',()=>{
  const h=harness(),b=h.batch();h.post(b);h.failStructured();h.work();
  assert.equal(h.folder('Extension Pending Imports').files.length,1);assert.equal(h.structuredRows.size,0);
  h.work();assert.equal(h.rawRows.size,1);assert.equal(h.structuredRows.size,1);
  assert.equal(h.folder('Extension Pending Imports').files.length,0);
});
test('bad job does not starve later jobs; cursor wraps for retry',()=>{
  const h=harness();for(let n=0;n<10;n++)h.post(h.batch());
  h.folder('Extension Pending Imports').files[0].text='invalid';h.work();h.work();
  assert.equal(h.structuredRows.size,9);assert.equal(h.folder('Extension Pending Imports').files.length,1);
  assert.ok(h.properties.has('NEXUS_IMPORT_ERROR'));
});
test('saved jobs remain processable after the seven-day client acceptance window',()=>{
  const h=harness(),b=h.batch();h.post(b);
  const file=h.folder('Extension Pending Imports').files[0],marker=JSON.parse(file.text),raw=h.byId.get(marker.fileId);
  const saved=JSON.parse(raw.text);saved.createdAt-=9*86400000;saved.events[0].at-=9*86400000;
  marker.createdAt=saved.createdAt;file.text=JSON.stringify(marker);raw.text=JSON.stringify(saved);
  h.work();assert.equal(h.structuredRows.size,1);
});
test('invalid schema, duplicate event IDs and extra record fields are rejected before saving',()=>{
  const h=harness(),b=h.batch();b.events.push(b.events[0]);assert.equal(h.post(b).error,'SCHEMA');
  b.events.pop();b.events[0].password='secret';assert.equal(h.post(b).error,'SCHEMA');
  assert.equal(h.root.folders.find(f=>f.name==='Extension Batches'),undefined);
});
test('time budget and an invalid continuation token safely leave jobs recoverable',()=>{
  const h=harness();h.post(h.batch());assert.equal(h.c.nexusProcessSavedBatches(Date.now()),0);
  h.properties.set('NEXUS_IMPORT_CURSOR','expired');h.work();assert.equal(h.structuredRows.size,1);
});
test('maintenance lease prevents overlap and rollback mode still drains accepted jobs',()=>{
  const h=harness();let calls=0;
  h.c.nexusProcessSavedBatches=()=>{calls++;};
  h.c.SpreadsheetApp={openById:()=>({})};h.c.nxSheet=()=>({});h.c.nxFindRows=()=>[];h.c.nexusBackfillDiagnostics=()=>{};
  h.properties.set('NEXUS_REPORT_LEASE',String(Date.now()+300000));h.c.nexusRefreshReports();assert.equal(calls,0);
  h.properties.delete('NEXUS_REPORT_LEASE');h.properties.set('NEXUS_ASYNC_ENABLED','0');
  h.c.nexusRefreshReports();assert.equal(calls,1);assert.equal(h.properties.has('NEXUS_REPORT_LEASE'),false);
});
