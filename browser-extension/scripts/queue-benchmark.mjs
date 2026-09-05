import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {randomUUID} from 'node:crypto';
import * as before from '../reference/original-extension/analytics-core.mjs';
import * as after from '../extension/analytics-core.mjs';
const now=Date.now(),device=randomUUID(),session=randomUUID();
const state=before.initialState();
state.events=Array.from({length:18000},(_,i)=>({kind:'activity',player:'123',at:now,id:randomUUID(),device,session,record:{action:'CLICK',message:'x'.repeat(600)}}));
before.prepareBatch(state,randomUUID,now);
const report={scenario:'18,000 offline activity records, 600-character messages, first 500 events pinned by an in-flight batch. Node only; not in-game throughput.',runs:[]};
for(const [label,api] of [['original',before],['candidate',after]]) {
  const timings=[];let result;
  for(let n=0;n<3;n++) {
    const fixture=structuredClone(state),start=performance.now();result=api.boundState(fixture,now);timings.push(performance.now()-start);
  }
  report.runs.push({label,medianMs:timings.sort((a,b)=>a-b)[1],retained:result.events.length,dropped:result.dropped});
}
fs.writeFileSync('audit/queue-benchmark.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
