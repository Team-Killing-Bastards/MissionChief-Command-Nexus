import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const acorn = require('internal/deps/acorn/acorn/dist/acorn');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const normalize = node => JSON.stringify(node, (key, value) => ['start','end','loc','raw'].includes(key) ? undefined : value);
function inventory(path) {
  const text = fs.readFileSync(path, 'utf8');
  const ast = acorn.parse(text, {ecmaVersion:'latest', sourceType:'script', locations:true});
  const functions = [], maps=[];
  function walk(node, parent) {
    if (!node || typeof node !== 'object') return;
    if (['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type)) {
      const name = node.id?.name || (parent?.type === 'VariableDeclarator' ? parent.id?.name : '') || (parent?.type === 'Property' ? parent.key?.name || parent.key?.value : '');
      if (name) functions.push({name, line:node.loc.start.line, hash:hash(normalize(node)), chars:node.end-node.start});
    }
    if(node.type==='VariableDeclarator' && node.id?.name && node.init?.type==='ObjectExpression') {
      maps.push({name:node.id.name,line:node.loc.start.line,hash:hash(normalize(node.init)),entries:node.init.properties.map(p=>({key:p.key?.name??p.key?.value??'[spread]',hash:hash(normalize(p))}))});
    }
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(n=>walk(n,node)); else if (value && typeof value === 'object' && value.type) walk(value,node);
  }
  walk(ast);
  return {path, bytes:Buffer.byteLength(text), sha256:hash(text), text, functions,maps};
}
const old = inventory('reference/legacy-runtime.txt');
const current = inventory(process.argv[2] || 'extension/nexus-runtime.js');
const remaining = [...current.functions];
const identical = [], changed = [], missing = [];
for (const item of old.functions) {
  const index = remaining.findIndex(x=>x.name===item.name && x.hash===item.hash);
  if (index >= 0) identical.push({...item,currentLine:remaining.splice(index,1)[0].line});
  else changed.push(item);
}
const modified = [];
for (const item of changed) {
  const index = remaining.findIndex(x=>x.name===item.name);
  if(index >= 0) modified.push({...item,current:remaining.splice(index,1)[0]}); else missing.push(item);
}
const report = {method:'Acorn AST, ignores whitespace, comments and literal raw spelling; named functions counted by occurrence. Presence does not prove behavior.', legacy:{path:old.path,bytes:old.bytes,sha256:old.sha256}, current:{path:current.path,bytes:current.bytes,sha256:current.sha256}, counts:{legacy:old.functions.length,current:current.functions.length,identical:identical.length,modified:modified.length,missing:missing.length,added:remaining.length}, missing,modified,added:remaining,identical};
const important=['TYPE_ID_TO_VEHICLE_TYPE','VEHICLE_INFO','crossReference','PERSONNEL_SERVICE_PROFILES'];
report.mappingTables=old.maps.filter(m=>important.includes(m.name)).map(m=>{
  const next=current.maps.find(n=>n.name===m.name);
  return {name:m.name,legacyLine:m.line,currentLine:next?.line,identical:m.hash===next?.hash,
    removed:m.entries.filter(e=>!next?.entries.some(n=>n.key===e.key)).map(e=>e.key),
    changed:[...new Map(m.entries.map(e=>[e.key,e])).values()].filter(e=>next?.entries.findLast(n=>n.key===e.key)?.hash!==e.hash).map(e=>e.key),
    added:next?.entries.filter(e=>!m.entries.some(n=>n.key===e.key)).map(e=>e.key)};
});
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/parity.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({counts:report.counts,missing,mappingTables:report.mappingTables,modified:modified.map(x=>({name:x.name,oldLine:x.line,currentLine:x.current.line}))},null,2));
const canonical = inventory('upstream/src/missionchief-command-nexus.user.js');
const legacyAst = normalize(acorn.parse(old.text,{ecmaVersion:'latest'}));
const canonicalAst = normalize(acorn.parse(canonical.text,{ecmaVersion:'latest'}));
console.log('Attached legacy versus upstream executable AST:',hash(legacyAst) === hash(canonicalAst));
