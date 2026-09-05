import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const acorn = require('internal/deps/acorn/acorn/dist/acorn');
export const runtime = fs.readFileSync('extension/nexus-runtime.js','utf8');
const ast = acorn.parse(runtime,{ecmaVersion:'latest'});
const declarations = new Map();
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration') declarations.set(node.id.name,runtime.slice(node.start,node.end));
  for(const value of Object.values(node)) if(Array.isArray(value)) value.forEach(walk); else if(value?.type) walk(value);
}
walk(ast);
export const functionText = name => { if(!declarations.has(name)) throw Error(`Missing function ${name}`); return declarations.get(name); };
export function functions(names, dependencies = {}, prelude = '') {
  const context = vm.createContext({...dependencies});
  vm.runInContext(prelude+'\n'+names.map(functionText).join('\n'),context);
  return context;
}
export function events() {
  const listeners = new Map();
  return {
    addEventListener(name,fn) { const set=listeners.get(name)||new Set();set.add(fn);listeners.set(name,set); },
    removeEventListener(name,fn) { listeners.get(name)?.delete(fn); },
    dispatchEvent(event) { for(const fn of [...(listeners.get(event.type)||[])]) fn(event); },
    listeners
  };
}
export const settle = async () => { for(let i=0;i<8;i++) await new Promise(resolve=>setImmediate(resolve)); };
