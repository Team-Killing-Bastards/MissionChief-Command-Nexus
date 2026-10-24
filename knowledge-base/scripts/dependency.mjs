import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
export function dependency(name){try{return require(name);}catch{return require(path.resolve(path.dirname(process.execPath),'../node_modules',name));}}
