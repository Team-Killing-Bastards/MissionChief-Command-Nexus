import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { adaptRegressions } from './adapt-regressions.mjs';
const variant = process.argv[2] || 'original';
if (!['upstream','original','candidate','adapted'].includes(variant)) throw Error('Expected upstream, original, candidate or adapted');
const root = process.cwd();
const fixture = path.join(root,'audit',`regression-${variant}`);
fs.mkdirSync(fixture,{recursive:true});
for (const name of ['scripts','src','docs','.github','project-state.json','README.md','CHANGELOG.md']) fs.cpSync(path.join(root,'upstream',name),path.join(fixture,name),{recursive:true});
// Git on Windows may check text out as CRLF. Test the repository's LF bytes.
function lf(dir) {
  for (const item of fs.readdirSync(dir,{withFileTypes:true})) {
    const file = path.join(dir,item.name);
    if (item.isDirectory()) lf(file);
    else if (/\.(?:m?js|json|md|ya?ml|py|txt)$/.test(item.name)) fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'));
  }
}
lf(fixture);
if (variant !== 'upstream') {
  const runtime = fs.readFileSync(['candidate','adapted'].includes(variant) ? 'extension/nexus-runtime.js' : 'reference/original-extension/nexus-runtime.js','utf8');
  const start = runtime.indexOf('// ==UserScript==');
  const end = runtime.lastIndexOf('\n})();');
  if(start < 0 || end < start) throw Error('Cannot locate embedded userscript');
  fs.writeFileSync(path.join(fixture,'src/missionchief-command-nexus.user.js'),runtime.slice(start,end).trimEnd()+'\n');
}
if (variant === 'adapted') adaptRegressions(fixture);
const report = [];
for (const file of fs.readdirSync(path.join(fixture,'scripts')).filter(f=>/^check-.*\.mjs$/.test(f)).sort()) {
  if (variant === 'adapted' && file === 'check-project-state.mjs') {
    report.push({file,passed:null,reason:'Canonical userscript bytes/hash are checked in the upstream run. Extension identity is checked by scripts/verify-package.mjs.'});continue;
  }
  const result = spawnSync(process.execPath,[`scripts/${file}`],{cwd:fixture,encoding:'utf8',timeout:20000,windowsHide:true,maxBuffer:1024*1024});
  const row = {file,passed:result.status===0,output:(result.stdout+result.stderr).trim()};
  report.push(row);
  if(!row.passed) console.log(file, row.output.slice(0,1000));
}
fs.writeFileSync(`audit/regressions-${variant}.json`,JSON.stringify(report,null,2)+'\n');
console.log(`${variant}: ${report.filter(r=>r.passed).length}/${report.filter(r=>r.passed !== null).length} applicable checks passed`);
process.exitCode = report.some(r=>r.passed === false) ? 1 : 0;
