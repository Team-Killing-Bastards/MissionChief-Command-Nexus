import test from 'node:test';
import assert from 'node:assert/strict';
import {edgeClient} from '../scripts/edge-api.mjs';
const config={key:'test-key',clientId:'test-client',productId:'a6093637-b629-412b-801c-f56498a87d22',sleep:async()=>{}};
test('upload must succeed before publishing, with durable resumable checkpoints',async()=>{
 const calls=[],saved=[];
 const client=edgeClient({...config,checkpoint:async s=>saved.push({...s}),fetchImpl:async(url,options)=>{
  calls.push({url,...options});return options.method==='POST'?new Response(null,{status:202,headers:{location:'operation-1'}}):Response.json({status:'Succeeded'});
 }});
 const state=await client.submit(Buffer.from('zip'),'notes');
 assert.equal(calls.length,4);assert.ok(calls[0].url.endsWith('/draft/package'));assert.ok(calls[2].url.endsWith('/submissions'));assert.equal(state.publishDone,true);assert.equal(saved[0].uploadAttempted,true);
});
test('failed upload never submits the draft',async()=>{
 let posts=0;
 await assert.rejects(edgeClient({...config,fetchImpl:async(url,o)=>{if(o.method==='POST'){posts++;return new Response(null,{status:202,headers:{location:'op'}});}return Response.json({status:'Failed',errorCode:'InvalidPackage'});}}).submit(Buffer.from('zip'),'notes'),/InvalidPackage/);
 assert.equal(posts,1);
});
test('uncertain POST is not automatically repeated',async()=>{
 let calls=0;const state={uploadAttempted:true};
 await assert.rejects(edgeClient({...config,fetchImpl:async()=>{calls++;}}).submit(Buffer.from('zip'),'notes',state),/Uncertain/);assert.equal(calls,0);
});
test('resume existing operations without duplicate POSTs',async()=>{
 let calls=0;const state={uploadDone:true,publishOperation:'op'};
 await edgeClient({...config,fetchImpl:async(url,o)=>{assert.notEqual(o.method,'POST');calls++;return Response.json({status:'Succeeded'});}}).submit(Buffer.from('zip'),'notes',state);assert.equal(calls,1);
});
test('operation redirect cannot receive credentials',async()=>{
 let calls=0;await assert.rejects(edgeClient({...config,fetchImpl:async()=>{calls++;return new Response(null,{status:202,headers:{location:'https://example.com/steal'}});}}).submit(Buffer.from('zip'),'notes'),/Unexpected/);assert.equal(calls,1);
});
