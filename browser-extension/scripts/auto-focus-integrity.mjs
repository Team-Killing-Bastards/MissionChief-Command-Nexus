import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {frameGuard,controllerBridge,startGuard} from './prepare-alliance-57.mjs';
const acorn=createRequire(import.meta.url)('internal/deps/acorn/acorn/dist/acorn');
export function controllerProtectedDigest(source) {
  // Strip the exact reviewed UI additions before comparing against the
  // release-specific protected executable-AST baseline.
  source=source.replace(frameGuard,'').replace(controllerBridge,'').replaceAll(startGuard,'');
  const ast=acorn.parse(source.replaceAll('3.0.43.55','3.0.43.VERSION').replaceAll('3.0.43.56','3.0.43.VERSION').replaceAll('3.0.43.57','3.0.43.VERSION').replaceAll('3.0.43.58','3.0.43.VERSION').replaceAll('3.0.43.59','3.0.43.VERSION'),{ecmaVersion:'latest'});
  const changed=new Set(['injectStyles','buildUi','render','registerRecoverableMissionSkip']);
  const added=new Set(['missionSkipIssueDetails','renderControllerSkips']);
  const seen=new Set();
  function clean(node){
    if(Array.isArray(node))return node.map(clean).filter(value=>value!==null);
    if(!node||typeof node!=='object')return node;
    if(node.type==='FunctionDeclaration'){
      const name=node.id.name;
      if(added.has(name))return null;
      if(changed.has(name)&&!seen.has(name)){seen.add(name);return {reviewedFunction:name};}
    }
    return Object.fromEntries(Object.entries(node).filter(([key])=>!['start','end','raw'].includes(key)).map(([key,value])=>[key,clean(value)]));
  }
  return crypto.createHash('sha256').update(JSON.stringify(clean(ast))).digest('hex');
}
