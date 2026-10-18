import fs from 'node:fs';
import assert from 'node:assert/strict';
export const source=fs.readFileSync(new URL('./extension/nexus-runtime.js',import.meta.url),'utf8');
export const old=fs.readFileSync(new URL('../3.0.43.232/extension/nexus-runtime.js',import.meta.url),'utf8');
export function fn(name,text=source){
 const a=new RegExp('^ {0,8}(?:async )?function '+name+'\\(','m').exec(text);assert(a,name);
 const b=/\n {0,4}(?:async )?function /.exec(text.slice(a.index+a[0].length));assert(b,name);
 return text.slice(a.index,a.index+a[0].length+b.index);
}
export const functions=['sameOriginUrl','missionIdFromUrl','vehicleIdFromUrl','canonicalMissionPageId','pathFromUrl',
 'transportServiceRequest','recordTransportService','clearTransportServiceState','chooseTransportResumeMission',
 'startTransportOnlyWorker','returnToTopMissionAfterTransport','recoverInitialTransportWorkerLoad','createWorker','beginMissionRescan'];
