// Scoped local validation; unchanged feature UI suites remain in verify-all.mjs.
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
fs.mkdirSync('audit',{recursive:true});
const steps=[
  ['reference',['scripts/prepare-reference.mjs']],
  ['runtime',['scripts/harden-runtime.mjs']],
  ['parity',['--expose-internals','scripts/parity.mjs']],
  ['hardening-tests',['--expose-internals','--test','--test-reporter=tap',...fs.readdirSync('tests').filter(name=>name.endsWith('.test.mjs')).map(name=>'tests/'+name)]],
  ['adapted-regressions',['scripts/regressions.mjs','adapted']],
  ['package',['scripts/package.mjs']],
  ['package-verification',['--expose-internals','scripts/verify-package.mjs']],
  ['edge-smoke',['scripts/edge-smoke.mjs']],
  ['home-buy-next-59',['tests/ui/home-buy-next-59.mjs']],
  ['home-market-52',['tests/ui/home-market-52.mjs']],
  ['quick-buy-53',['tests/ui/quick-buy-53.mjs']],
  ['responsive-45',['tests/ui/responsive-45.mjs']]
];
const summary=[];
for(const [name,args] of steps) {
  const result=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true,timeout:name==='schooling-next-course-50'?180000:120000,maxBuffer:4*1024*1024});
  fs.writeFileSync(`audit/${name}.log`,result.stdout+result.stderr);
  summary.push({name,passed:result.status===0,exitCode:result.status});
  console.log(`${result.status===0?'PASS':'FAIL'} ${name}`);
  if(result.status!==0){console.error(result.stdout+result.stderr);break;}
}
fs.writeFileSync('audit/home-buy-next-verification-summary.json',JSON.stringify(summary,null,2)+'\n');
if(summary.some(r=>!r.passed)||summary.length!==steps.length)process.exitCode=1;
