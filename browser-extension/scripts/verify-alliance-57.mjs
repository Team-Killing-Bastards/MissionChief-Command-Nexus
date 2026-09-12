// Scoped release checks: all runtime regressions plus changed and adjacent UI.
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
  ['settings-43',['tests/ui/settings-43.mjs']],
  ['responsive-45',['tests/ui/responsive-45.mjs']],
  ['auto-focus-56',['--expose-internals','tests/ui/auto-focus-56.mjs']],
  ['alliance-support-57',['tests/ui/alliance-support-57.mjs']]
];
const summary=[];
if(process.argv.includes('--resume')){
 for(const row of JSON.parse(fs.readFileSync('audit/alliance-verification-summary.json'))){
  if(!row.passed||steps[summary.length]?.[0]!==row.name)break;
  summary.push(row);
 }
}
for(const [name,args]of steps.slice(summary.length)){
 const result=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true,timeout:240000,maxBuffer:4*1024*1024});
 fs.writeFileSync(`audit/${name}.log`,(result.stdout||'')+(result.stderr||''));
 summary.push({name,passed:result.status===0,exitCode:result.status});console.log(`${result.status===0?'PASS':'FAIL'} ${name}`);
 fs.writeFileSync('audit/alliance-verification-summary.json',JSON.stringify(summary,null,2)+'\n');
 if(result.status!==0){console.error(result.stdout+result.stderr);break;}
}
if(summary.length!==steps.length||summary.some(row=>!row.passed))process.exitCode=1;
